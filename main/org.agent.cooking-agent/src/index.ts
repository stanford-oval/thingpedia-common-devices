import {DialogueAgent} from "genie-toolkit";
import {BaseDevice, DialogueHandler} from "thingpedia";
import {AllRecipes, default as CookingAgentSkill} from "../../org.agent.cooking/dist/index";

// AllRecipes
//{
//    "recipes": [
//    {
//      "id": "recipe_1023",
//      "name": "fried shrimp",
//      "ingredients": [
//        "ingredient_1001",
//        "ingredient_1002",
//        "ingredient_1003"
//      ],
//      "instructions": [
//        "instruction_1001",
//        "instruction_1002",
//        "instruction_1003"
//      ]
//    },
//    ],
//    "ingredients": [
//      {
//        "id": "ingredient_1001",
//        "ingredient": "shrimp",
//        "quantity": "1",
//        "unit": "count"
//      },
//      {
//        "id": "ingredient_1002",
//        "ingredient": "salt",
//        "quantity": "1",
//        "unit": "tsp"
//      }
//    ],
//    "instructions": [
//      {
//        "id": "instruction_1001",
//        "instruction": "fry shrimp in the pan",
//        "recipe": "recipe_1023",
//        "index": 1,
//        "cook_method": "fry"
//      }
//    ]

class CookingAgentDialogueGenHandler extends DialogueAgent.Geniescript.GeniescriptAgent {
    uniqueId: string = 'org.agent.cooking-agent';
    _locale: string;
    _timezone: string;
    _introMsg: string;
    _prompt: string;
    _lastQuerySuggestion: string = null;
    _stepCounter: number = 0;

    constructor(locale: string, timezone: string) {
        super(DialogueHandler.Priority.PRIMARY, "org.agent.cooking-agent", null, "org.agent.cooking-agent");
        this._locale = locale;
        this._timezone = timezone;
        this._introMsg = "Hi, I am your recipe helper. I guide you through the cooking process.";
    }

    getState(): any {
        return {lastQuerySuggestion: this._lastQuerySuggestion};
    }

    async initialize() {
        await super.initialize();
        return null;
    }

    async *logic() : any {
        while (true) {
            const _self = this
            _self.dlg.say([this._introMsg]);
            let recipeResult = yield* this.dlg.initiateQuery(
                "\\t @org.agent.cooking.recipe();",
                // "find me a recipe",
                "What dish do you want to cook?",
                undefined,
                null
            );
            if (recipeResult.status !== DialogueAgent.Geniescript.DlgStatus.SUCCESS) {
                continue
            }
             // not sure what's the type
            CookingAgentSkill.currentRecipe = recipeResult.result.result_values[0];
            CookingAgentSkill.instructionIndex = 0;
            const instructionId = () => {
                return CookingAgentSkill.currentRecipe.instructions[CookingAgentSkill.instructionIndex];
            }
            // find the instructions for the recipe from AllRecipes
            const currentInstruction = () => {
                return AllRecipes.instructions.find(i => i.id === instructionId())[0];
            }
            _self.dlg.say([`The first step is ${currentInstruction().instruction}`]);
            yield * _self.dlg.expect(
                null,
                (result) => CookingAgentSkill.instructionIndex == CookingAgentSkill.currentRecipe.instructions.length
            )
            _self.dlg.say(
                [`You have finished cooking ${CookingAgentSkill.currentRecipe.name}`]
            )
        }
    }
}

export default class CookingAgent extends BaseDevice {
    _dialogueAgent: CookingAgentDialogueGenHandler;

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.cooking-agent';
        this.name = "Cooking Recipe Helper";
        this.description = "A cooking recipe helper";
        this._dialogueAgent =
            new CookingAgentDialogueGenHandler(this.engine.platform.locale, this.engine.platform.timezone);
        console.log("CookingAgent created");
    }

    queryInterface(iface: string|number) {
        switch (iface) {
            case 'dialogue-handler':
                return this._dialogueAgent;
            default:
                return super.queryInterface(iface);
        }
    }
}