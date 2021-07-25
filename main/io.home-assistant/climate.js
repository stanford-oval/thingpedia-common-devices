// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantClimate extends HomeAssistantDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain, ] = entityId.split('.');
        this.domain = domain;
        this.device_class = this.state.attributes.device_class;
    }

    async get_hvac_action() {
        if (this.domain === 'climate') {
            let c_action = this.state.attributes.hvac_action;
            return [{ action: c_action }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC state.');
        }
    }

    async get_hvac_modes_aval() {
        if (this.domain === 'climate') {
            let hvac_modes_aval = this.state.attributes.hvac_modes;
            return [{ modes: hvac_modes_aval }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC modes available.');
        }
    }

    async do_set_hvac_mode({ mode }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_hvac_mode', { hvac_mode: mode });
        else
            throw new Error('Sorry! Your device doesn\'t support setting HVAC mode.');
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_hvac_action() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return { action: this.state.attributes.hvac_action };
            });
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC action running.');
        }
    }

    async get_hvac_preset() {
        if (this.domain === 'climate') {
            let c_preset = this.state.attributes.preset_mode;
            return [{ preset: c_preset }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC preset.');
        }
    }

    async get_hvac_presets_aval() {
        if (this.domain === 'climate') {
            let hvac_presets_aval = this.state.attributes.preset_modes;
            return [{ presets: hvac_presets_aval }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC presets available.');
        }
    }

    async do_set_hvac_preset({ preset }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_preset_mode', { preset_mode: preset });
        else
            throw new Error('Sorry! Your device doesn\'t support setting HVAC preset.');
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_hvac_preset() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return { preset: this.state.attributes.preset_mode };
            });
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC preset used.');
        }
    }

    async get_current_temperature() {
        if (this.domain === 'climate') {
            let c_temp = this.state.attributes.current_temperature;
            return [{ value: parseFloat(c_temp) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC current temperature.');
        }
    }

    async get_target_temperature() {
        if (this.domain === 'climate') {
            let t_temp = this.state.attributes.target_temperature;
            return [{ value: parseFloat(t_temp) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC target temperature.');
        }
    }

    async do_set_target_temperature({ value }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_temperature', { temperature: value });
        else
            throw new Error('Sorry! Your device doesn\'t support setting a target temperature.');
    }

    async do_set_minmax_temperature({ low, high }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_temperature', { target_temp_high: high, target_temp_low: low });
        else
            throw new Error('Sorry! Your device doesn\'t support setting min or max temperature.');
    }

    async get_min_temperature() {
        if (this.domain === 'climate') {
            let min_temp = this.state.attributes.min_temp;
            return [{ low: parseFloat(min_temp) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying min or max temperature range set.');
        }
    }

    async get_max_temperature() {
        if (this.domain === 'climate') {
            let max_temp = this.state.attributes.max_temp;
            return [{ high: parseFloat(max_temp) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying min or max temperature range set.');
        }
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_current_temperature() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return { temperature: this.state.attributes.current_temperature };
            });
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC current temperature.');
        }
    }

    async get_current_humidity() {
        if (this.domain === 'climate') {
            let c_hum = this.state.attributes.current_humidity;
            return [{ value: parseFloat(c_hum) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC current humidity.');
        }
    }

    async get_target_humidity() {
        if (this.domain === 'climate') {
            let t_hum = this.state.attributes.target_humidity;
            return [{ value: parseFloat(t_hum) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC target humidity.');
        }
    }

    async do_set_target_humidity({ value }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_humidity', { humidity: value });
        else
            throw new Error('Sorry! Your device doesn\'t support setting a target humidity.');
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_current_humidity() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return { humidity: this.state.attributes.current_humidity };
            });
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC current humidity.');
        }
    }

    async get_min_humidity() {
        if (this.domain === 'climate') {
            let min_hum = this.state.attributes.min_humidity;
            return [{ low: parseFloat(min_hum) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying min or max humidity range set.');
        }
    }

    async get_max_humidity() {
        if (this.domain === 'climate') {
            let max_hum = this.state.attributes.max_humidity;
            return [{ high: parseFloat(max_hum) }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying min or max humidity range set.');
        }
    }

    async get_fan_mode() {
        if (this.domain === 'climate') {
            let f_mode = this.state.attributes.fan_mode;
            return [{ fan: f_mode }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying fan mode.');
        }
    }

    async get_fan_modes_aval() {
        if (this.domain === 'climate') {
            let fan_modes_aval = this.state.attributes.fan_mode;
            return [{ fan: fan_modes_aval }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC fan modes available.');
        }
    }

    async do_set_fan_mode({ mode }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_fan_mode', { fan_mode: mode });
        else
            throw new Error('Sorry! Your device doesn\'t support setting fan mode.');
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_fan_mode() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return { fan: this.state.attributes.fan_mode };
            });
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC fan mode used.');
        }
    }

    async get_swing_mode() {
        if (this.domain === 'climate') {
            let f_mode = this.state.attributes.swing_mode;
            let remove_swing_txt = f_mode.replace("swing_", "");
            return [{ swing: remove_swing_txt }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying swing mode.');
        }
    }

    async get_swing_modes_aval() {
        if (this.domain === 'climate') {
            let swing_modes_aval = this.state.attributes.swing_mode;
            let remove_swing_txt = swing_modes_aval.replace("swing_", "");
            return [{ swing: remove_swing_txt }];
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC swing modes available.');
        }
    }

    async do_set_swing_mode({ mode }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_swing_mode', { swing_mode: "swing_" + mode });
        else
            throw new Error('Sorry! Your device doesn\'t support setting swing mode.');
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_swing_mode() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return { swing: this.state.attributes.swing_mode };
            });
        } else {
            throw new Error('Sorry! Your device doesn\'t support querying HVAC preset used.');
        }
    }

    async do_set_aux_heat({ value }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_aux_heat', { aux_heat: value });
        else
            throw new Error('Sorry! Your device doesn\'t support setting auxiliary heater on/off.');
    }

    async do_set_hvac_onoff({ value }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'turn_' + value);
        else
            throw new Error('Sorry! Your device doesn\'t support setting to on/off the system.');
    }
};