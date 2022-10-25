import {DialogueAgent} from "genie-toolkit";
import {BaseDevice, DialogueHandler} from "thingpedia";
import {DLGResultStatus} from "genie-toolkit/dist/lib/dialogue-agent/geniescript";


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
}