// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensor extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
        // console.log(state.attributes.device_class);
        // console.log(state.attributes);
        // console.log("======\n\n\n\n\n");
        const [domain,] = entityId.split('.');
		super(engine, state, master, entityId);
        // if ((this.state.attributes.device_class === "battery") ||
        //     (this.state.attributes.device_class === "power")) {
        //     console.log(this.master._subdevices);
        // }
        this.domain = domain;
        if (this.domain === "binary_sensor") {
            let supportedDeviceClasses = {
                battery: {
                    on: "low",
                    off: "normal",
                },
                cold: {
                    on: "cold",
                    off: "normal",
                },
                connectivity: {
                    on: "connected",
                    off: "disconnected",
                },
                door: {
                    on: "open",
                    off: "closed",
                },
                garage_door: {
                    on: "open",
                    off: "closed",
                },
                gas: {
                    on: "detecting_gas",
                    off: "not_detecting_gas",
                },
                heat: {
                    on: "hot",
                    off: "normal",
                },
                light: {
                    on: "detecting_light",
                    off: "not_detecting_light",
                },
                lock: {
                    on: "unlocked",
                    off: "locked",
                },
                moisture: {
                    on: "wet",
                    off: "dry",
                },
                motion: {
                    on: "detecting_motion",
                    off: "not_detecting_motion",
                },
                moving: {
                    on: "moving",
                    off: "not_moving",
                },
                occupancy: {
                    on: "occupied",
                    off: "not_occupied",
                },
                opening: {
                    on: "open",
                    off: "closed",
                },
                plug: {
                    on: "plugged",
                    off: "unplugged",
                },
                power: {
                    on: "detecting_power",
                    off: "not_detecting_power",
                },
                presence: {
                    on: "home",
                    off: "away",
                },
                problem: {
                    on: "detecting_problem",
                    off: "not_detecting_problem",
                },
                safety: {
                    on: "unsafe",
                    off: "safe",
                },
                smoke: {
                    on: "detecting_smoke",
                    off: "not_detecting_smoke",
                },
                sound: {
                    on: "detecting_sound",
                    off: "not_detecting_sound",
                },
                vibration: {
                    on: "detecting_vibration",
                    off: "not_detecting_vibration",
                },
                window: {
                    on: "open",
                    off: "closed",
                },
            };
            this.deviceStateMapping = supportedDeviceClasses[
                this.state.attributes.device_class] || {on: "on", off: "off"};
        } else if (this.domain == "sensor") {
            this.deviceStateMapping = this.state.attributes.unit_of_measurement;
        }

        

        // this.deviceClass = this.state.attributes.device_class;

    }
    async get_state() {
        // if ((this.state.attributes.device_class === "battery") ||
        //     (this.state.attributes.device_class === "power")) {
        //     return [{ state: this.state.state}];
        // }
        // console.log(this.state.attributes.device_class);
        // console.log(this.master._subdevices);
        if (this.domain === "sensor") {
            var str_ret = this.state.state + this.deviceStateMapping;
            console.log(this.state.state);
            console.log(this.deviceStateMapping);
            console.log(str_ret);
            return [{ state:  str_ret}];
        } else if (this.domain === "binary_sensor") {
            return [{ state: this.deviceStateMapping[this.state.state] }];
        }
    	return [{ state: this.state.state }];
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        return this._subscribeState(() => {
            return { state: this.state.state };
        });
    }
};