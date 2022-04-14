"use strict";


const Tp = require("thingpedia");
const TT = require("thingtalk");

class GeniescriptDlg {
    constructor(user_target, skill_name) {
        this._user_target = user_target;
        this._skill_name = skill_name;
        this._last_result = null;
        this._last_branch = null;
        this._last_analyzed = null;
        this._last_messages = [];
        this._last_expecting = null;
        this._last_target = null;
    }

    async *expect(func_map) {
        if (this._last_analyzed !== null) {
            this._last_result = {
                messages: this._last_messages,
                expecting: this._last_expecting,
                context: this._last_analyzed,
                agent_target: this._last_target
            };
            this._last_messages = [];
            this._last_expecting = null;
            this._last_target = null;
            this._last_analyzed = null;
        }
        while (true) {
            let input = yield this._last_result;
            if (input.type === "utterance") {
                this._last_result = {
                    confident: Tp.DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND,
                    utterance: input.content,
                    user_target: ''
                };
                for (let func_key of func_map.keys()) {
                    let regExp = new RegExp(func_key, 'i');
                    let match = regExp.exec(input.content);
                    if (match) {
                        this._last_branch = func_key;
                        this._last_result = {
                            confident: Tp.DialogueHandler.Confidence.EXACT_IN_DOMAIN_COMMAND,
                            utterance: input.content,
                            user_target: this._user_target
                        };
                        break;
                    }
                }
            } else if (input.type === "analyzed") {
                this._last_analyzed = input.content;
                let current_func = func_map.get(this._last_branch);
                if (current_func.constructor.name === "GeneratorFunction" || current_func.constructor.name ==="AsyncGeneratorFunction")
                    yield * current_func();
                else if (current_func.constructor.name ==="AsyncFunction")
                    await current_func();
                else
                    current_func();
                
                break;
            }
        }
    }

    // TODO: say something in the middle of the process
    say(messages, target=null, expecting = null) {
        if (target === null) target = this._skill_name + ".reply";
        this._last_messages = this._last_messages.concat(messages);
        this._last_target = target;
        this._last_expecting = expecting;
    }
}

class AbstractGeniescriptHandler {
    constructor() {
        console.log("AbstractGeniescriptHandler constructor");
        this._logic = null;
        if (this.constructor === AbstractGeniescriptHandler) 
            throw new Error("Abstract classes can't be instantiated.");
    }

    // TODO: Implementation serialization
    // getState() {
    //     return {_GenieScriptDlgLogic: logic.serialize}
    // }

    async initialize() {
        this._logic = this.logic();
        await this._logic.next();
    }

    async analyzeCommand(utterance) {

        console.log("AbstractGeniescriptHandler analyzeCommand");
        let result = await this._logic.next({ type: "utterance", content: utterance });
        console.log(result.value);
        return result.value;
    }

    async getReply(analyzed) {
        let result0 =  this._logic.next({ type: "analyzed", content: analyzed });
        let result = await result0;
        return result.value;
    }

    async *logic() {
    }

}

module.exports = {
    GeniescriptDlg: GeniescriptDlg,
    AbstractGeniescriptHandler: AbstractGeniescriptHandler
};

