import {DialogueAgent} from "genie-toolkit";
import {BaseDevice, DialogueHandler} from "thingpedia";
import {DLGResultStatus} from "genie-toolkit/dist/lib/dialogue-agent/geniescript";

// import ./generated_recipe.json default
import generatedRecipes from "./generated_recipe.json";

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
    uniqueId: string = 'org.agent.cooking';
    _locale: string;
    _timezone: string;
    _introMsg: string;
    _prompt: string;
    _lastQuerySuggestion: string = null;

    constructor(locale: string, timezone: string) {
        super(DialogueHandler.Priority.PRIMARY, "org.agent.cooking", null, "Recipe Helper");
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

    async *logic() {
        const _self = this
        _self.dlg.say([this._introMsg]);
        let recipeResult = yield * this.dlg.initiateQuery(
            "Give me a recipe",
            "What dish do you want to cook?"
        );
        let recipe = recipeResult.result.value; // not sure what's the type
        while (true) {
            if (recipe !== null) {

            } else {
                _self.dlg.say(["OK. Just let me know if you need me."]);
                // how to check if thisis the right type?
                recipe = _self.dlg.expect(
                    new Map(),
                    (reply) => reply.result_type === "org.agent.cooking:recipe",
                    null,
                    null
                )
                break;
            }
        }
        // make sure instructions are list of strings
        let idx = 0
        _self.dlg.say([recipe["instructions"][idx]]);
        while(true) {
            // alternatively, how do I capture thingtalk actions?
            _self.dlg.expect(
                new Map({
                    "next": (message: string) =>{
                        idx += 1;
                        _self.dlg.say([recipe["instructions"][idx]]);
                    }
                }),
            )
        }
    }
}

export default class CookingAgent extends BaseDevice {
    _dialogueAgent: CookingAgentDialogueGenHandler;

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.cooking';
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
                return null;
        }
    }

    async get_recipe(params, hints, env) {
        let recipes = generatedRecipes.recipes;
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'name') {
                    if (op === '==') {
                        recipes = recipes.filter((r) => r.name === value);
                    } else if (op === '=~') {
                        recipes = recipes.filter((r) => r.name.match(value));
                    }
                } else if (pname === 'ingredients') {
                    // not sure how to do this, it's a subquery
                } else if (pname === 'instructions') {
                    // not sure how to do this, it's a subquery
                } else {
                    throw new Error('Unsupported filter on recipe');
                }
            }
        }
        return recipes
    }

    async get_ingredient(params, hints, env) {
        let ingredients = generatedRecipes.ingredients;
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'ingredient') {
                    if (op === '==') {
                        ingredients = ingredients.filter((r) => r.ingredient === value);
                    } else if (op === '=~') {
                        ingredients = ingredients.filter((r) => r.ingredient.match(value));
                    }
                } else if (pname === 'quantity') {
                    if (op === '==') {
                        ingredients = ingredients.filter((r) => r.quantity === value);
                    } else if (op === '=~') {
                        ingredients = ingredients.filter((r) => r.quantity.match(value));
                    }
                } else if (pname === 'unit') {
                    if (op === '==') {
                        ingredients = ingredients.filter((r) => r.unit === value);
                    } else if (op === '=~') {
                        ingredients = ingredients.filter((r) => r.unit.match(value));
                    }
                } else {
                    throw new Error('Unsupported filter on ingredient');
                }
            }
        }
        return ingredients
    }

    async get_instruction(params, hints, env) {
        let instructions = generatedRecipes.instructions;
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'instruction') {
                    if (op === '==') {
                        instructions = instructions.filter((r) => r.instruction === value);
                    } else if (op === '=~') {
                        instructions = instructions.filter((r) => r.instruction.match(value));
                    }
                } else if (pname === 'cook_method') {
                    if (op === '==') {
                        instructions = instructions.filter((r) => r.cook_method === value);
                    } else if (op === '=~') {
                        instructions = instructions.filter((r) => r.cook_method.match(value));
                    }
                } else {
                    throw new Error('Unsupported filter on instruction');
                }
            }
        }
        return instructions
    }

    async get_unit_conversion(params, hints, env) {
        const ingredient = params.ingredient;
        const ingredient_amount = ingredient.quantity;
        const ingredient_unit = ingredient.unit;
        const unit = params.unit;
        // liquid units: ml, L, tsp, tbsp, cup, pint, quart, gallon
        const liquid_units = ['ml', 'L', 'tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon'];
        const liquid_base_conversion = {
            'ml': 1,
            'L': 1000,
            'tsp': 5,
            'tbsp': 15,
            'cup': 240,
            'pint': 480,
            'quart': 960,
            'gallon': 3840
        }
        // temperature units: C, F, K
        const temperature_units = ['C', 'F', 'K'];
        const temperature_base_conversion = {
            'C': [273.15, 1],
            'F': [255.372, 1.8],
            'K': [0, 1]
        }
        // time units: s, min, h, d, week, month, year
        const time_units = ['s', 'min', 'h', 'd', 'week', 'month', 'year'];
        const time_base_conversion = {
            's': 1,
            'min': 60,
            'h': 3600,
            'd': 86400,
            'week': 604800,
            'month': 2592000,
            'year': 31536000
        }
        // mass units: g, kg, oz, lb, cup, pint, quart, gallon
        const mass_units = ['g', 'kg', 'oz', 'lb', 'cup', 'pint', 'quart', 'gallon'];
        const mass_base_conversion = {
            'g': 1,
            'kg': 1000,
            'oz': 28.3495,
            'lb': 453.592,
            'cup': 240,
            'pint': 480,
            'quart': 960,
            'gallon': 3840
        }

        let target_amount = "";
        if (liquid_units.includes(ingredient_unit) && liquid_units.includes(unit)) {
            // convert liquid units
            let target_amount_num =
                ingredient_amount * liquid_base_conversion[ingredient_unit] / liquid_base_conversion[unit];
            target_amount = target_amount_num.toString();
        } else if (temperature_units.includes(ingredient_unit) && temperature_units.includes(unit)) {
            // convert temperature units
            let target_amount_num =
                ingredient_amount * temperature_base_conversion[ingredient_unit][1] + temperature_base_conversion[ingredient_unit][0];
            target_amount_num =
                (target_amount_num - temperature_base_conversion[unit][0]) / temperature_base_conversion[unit][1];
            target_amount = target_amount_num.toString();
        } else if (time_units.includes(ingredient_unit) && time_units.includes(unit)) {
            // convert time units
            let target_amount_num =
                ingredient_amount * time_base_conversion[ingredient_unit] / time_base_conversion[unit];
            target_amount = target_amount_num.toString();
        } else if (mass_units.includes(ingredient_unit) && mass_units.includes(unit)) {
            // convert mass units
            let target_amount_num =
                ingredient_amount * mass_base_conversion[ingredient_unit] / mass_base_conversion[unit];
            target_amount = target_amount_num.toString();
        } else {
            return {
                converted_quantity: "0",
                unit: "unknown",
                ingredient: ingredient
            }
        }
        return {
            converted_quantity: target_amount,
            unit: unit,
            ingredient: ingredient
        }
    }
}