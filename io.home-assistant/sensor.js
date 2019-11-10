// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Units = require('thingtalk').Units

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensor extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain,] = entityId.split('.');
		this.domain = domain;
        this.device_class = this.state.attributes.device_class;
        if (['binary_sensor', 'cover'].includes(this.domain)) {
            let supportedDeviceClasses = {
                battery: {
                    on: 'low',
                    off: 'normal'
                },
                cold: {
                    on: 'cold',
                    off: 'normal'
                },
                connectivity: {
                    on: 'connected',
                    off: 'disconnected'
                },
                door: {
                    on: 'open',
                    off: 'closed'
                },
                garage_door: {
                    on: 'open',
                    off: 'closed'
                },
                gas: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                light: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                lock: {
                    on: 'unlocked',
                    off: 'locked'
                },
                moisture: {
                    on: 'wet',
                    off: 'dry'
                },
                motion: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                moving: {
                    on: 'moving',
                    off: 'not_moving'
                },
                occupancy: {
                    on: 'occupied',
                    off: 'unoccupied'
                },
                opening: {
                    on: 'open',
                    off: 'closed'
                },
                plug: {
                    on: 'plugged',
                    off: 'unplugged'
                },
                power: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                presence: {
                    on: 'home',
                    off: 'away'
                },
                problem: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                safety: {
                    on: 'unsafe',
                    off: 'safe'
                },
                smoke: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                sound: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                vibration: {
                    on: 'detecting',
                    off: 'not_detecting'
                }
            };
            if (['cold'].includes(this.device_class)) {
                supportedDeviceClasses.heat = {
                    on: 'cold',
                    off: 'normal',
                }
            } else if (['hot'].includes(this.device_class)) {
                supportedDeviceClasses.heat = {
                    on: 'hot',
                    off: 'normal',
                }
            }
            this.deviceStateMapping = supportedDeviceClasses[this.device_class] || {on: 'on', off: 'off'};
        }
    }
    async get_state() {
        if (this.domain === 'sensor') {
            let value = parseFloat(this.state.state);
            if (this.device_class === 'temperature') {
                if (unit != '°C' && unit != 'C') {
                    if (unit === '°F' || unit === 'F')
                        value = Units.transformToBaseUnit(value, 'F');
                    else if (unit === 'K')
                        value = Units.transformToBaseUnit(value, 'K');
                    else
                        throw new Error(`Unrecognized unit ${unit}`)
                }
            } else if (this.device_class === 'pressure') {
                if (unit != 'Pa') {
                    if (unit === 'hPa' || unit === 'hpa')
                        value *= 100;
                    else if (unit === 'mbar')
                        value = Units.transformToBaseUnit(value * 0.001, 'bar');
                    else if (['bar', 'psi', 'mmHg', 'inHg', 'atm'].includes(unit))
                        value = Units.transformToBaseUnit(value * 0.001, unit);
                    else
                        throw new Error(`Unrecognized unit ${unit}`)
                }
            }
            return [{state: undefined, value: value}];
        } else if (this.domain === 'binary_sensor') {
            var state = this.deviceStateMapping[this.state.state];
            return [{state: state, value: undefined}];
        }
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'sensor') {
            let unit = this.state.attributes.unit_of_measurement;
            let value = parseFloat(this.state.state);
            if (this.device_class === 'temperature') {
                if (unit != '°C' && unit != 'C') {
                    if (unit === '°F' || unit === 'F')
                        value = Units.transformToBaseUnit(value, 'F');
                    else if (unit === 'K')
                        value = Units.transformToBaseUnit(value, 'K');
                    else
                        throw new Error(`Unrecognized unit ${unit}`)
                }
            } else if (this.device_class === 'pressure') {
                if (unit != 'Pa') {
                    if (unit === 'hPa' || unit === 'hpa')
                        value *= 100;
                    else if (unit === 'mbar')
                        value = Units.transformToBaseUnit(value * 0.001, 'bar');
                    else if (['bar', 'psi', 'mmHg', 'inHg', 'atm'].includes(unit))
                        value = Units.transformToBaseUnit(value * 0.001, unit);
                    else
                        throw new Error(`Unrecognized unit ${unit}`)
                }
            }
            return this._subscribeState(() => {
                return {state: undefined, value: value};
            });
        } else if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            return this._subscribeState(() => {
                return {state: state, value: undefined};
            });
        }
    }
};