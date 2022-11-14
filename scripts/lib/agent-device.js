"use strict";

const Tp = require('genie-toolkit/node_modules/thingpedia');
const interpolate = require('string-interp');
const Genie = require('genie-toolkit');


class AgentDevice extends Tp.BaseDevice {

    _dialogueHandler;
    constructor(engine, state) {
        super(engine, state);
    };

    queryInterface(iface) {
        switch (iface) {
        case 'dialogue-handler':
            return this._dialogueHandler;

        default:
            return super.queryInterface(iface);
        }
    }
}
module.exports = AgentDevice;


