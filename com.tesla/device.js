// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Monica Lam <lam@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const ObjectSet = Tp.ObjectSet;

const TESLA_CLIENT_ID = 'e4a9949fcfa04068f59abb5a658f2bac0a3428e4652315490b659d5ab3f35a9e';
const TESLA_CLIENT_SECRET = 'c75f14bbadc8bee3a7594412c31416f8300256d7668ea7e6e7f06727bfb9d220';
const TESLA_BASE_URI = 'https://owner-api.teslamotors.com';
//const TESLA_BASE_URI = 'https://private-anon-6e9b9d475-timdorr.apiary-mock.com';

// emulate the android mobile app
var version = '2.1.79';
var model = 'SM-G900V';
var codename = 'REL';
var release = '4.4.4';
var locale = 'en_US';
var user_agent = 'Model S ' + version + ' (' + model + '; Android ' + codename + ' ' + release + '; ' + locale + ')';

class TeslaCarDevice extends Tp.BaseDevice {
    constructor(engine, state, master) {
        super(engine, state);

        this.master = master;
        this.uniqueId = 'com.tesla-' + state.username + '-' + state.device_id;
        this.isTransient = true;

        this.baseUrl = TESLA_BASE_URI + '/api/1/vehicles/' + state.device_id;
        this.name = 'Tesla Car ' + (this.state.display_name || this.state.vin);
        this.description = 'This is your Tesla Car';
    }

    get vin() {
        return this.state.vin;
    }

    get kind() {
        return 'com.tesla.car';
    }

    checkAvailable() {
        return this.state.state === 'online' ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    }

    _wake_up_command () {
        console.log(this.baseUrl + '/command/wake_up');
        return Tp.Helpers.Http.post(this.baseUrl + '/command/wake_up', null, {
            'user-agent': user_agent,
            auth: 'Bearer ' + this.master.accessToken,
            dataContentType: 'application/json',
            accept: 'application/json'
        }).then((response) => {
            const parsed = JSON.parse(response);
            console.log(parsed);
            return parsed;
        }).catch((error) => {
            if (error.code === 408) throw new Error('The vehicle is offline');
            else
                throw error;
        });
    }

    _get_command (command) {
        console.log(this.baseUrl + '/command/wake_up');
        return Tp.Helpers.Http.post(this.baseUrl + '/command/wake_up', null, {
            'user-agent': user_agent,
            auth: 'Bearer ' + this.master.accessToken,
            dataContentType: 'application/json',
            accept: 'application/json'
        }).then((response) => {
            const parsed = JSON.parse(response);
            console.log(parsed);
            return Tp.Helpers.Http.get(this.baseUrl + command, {
                'user-agent': user_agent,
                auth: 'Bearer ' + this.master.accessToken,
                accept: 'application/json'
            }).then((response) => {
                const parsed = JSON.parse(response);
                console.log(parsed);
                return parsed;
            }).catch((error) => {
                if (error.code === 408) throw new Error('The vehicle is offline');
                else
                    throw error;
            });
        }).catch((error) => {
            console.log('Wake up failed');
            return Tp.Helpers.Http.get(this.baseUrl + command, {
                'user-agent': user_agent,
                auth: 'Bearer ' + this.master.accessToken,
                accept: 'application/json'
            }).then((response) => {
                const parsed = JSON.parse(response);
                console.log(parsed);
                return parsed;
            }).catch((error) => {
                if (error.code === 408) throw new Error('The vehicle is offline');
                else
                    throw error;
            });

        });
    }

    _do_command (command, param) {
        console.log(this.baseUrl + command);
        return Tp.Helpers.Http.post(this.baseUrl + command, param, {
            'user-agent': user_agent,
            auth: 'Bearer ' + this.master.accessToken,
            dataContentType: 'application/json',
            accept: 'application/json'
        }).then((response) => {
            const parsed = JSON.parse(response);
            console.log(parsed);
            return parsed;
        }).catch((error) => {
            if (error.code === 408) throw new Error('The vehicle is offline');
            else
                throw error;
        });
    }


    get_get_vehicle_state() {
        return this._get_command ('/data_request/vehicle_state').then((parsed) => {
            return [ parsed.response ];
            //       sun_roof_percent_open: parsed.response.sun_roof_percent_open}];
        });
    }

    /*    get_get_vehicle_state() {
        return this._get_command ('/data_request/vehicle_state').then((parsed) => {

               return [{ odometer: parsed.response.odometer,
                          locked: parsed.response.locked}];
                //       sun_roof_percent_open: parsed.response.sun_roof_percent_open}];
            });
    }
    */

    get_get_mobile_enabled() {
        return this._get_command ( '/mobile_enabled' ).then((parsed) => {
            return [{ mobile_enabled: parsed.response}];
        });
    }
    get_get_charge_state() {
        return this._get_command ('/data_request/charge_state').then((parsed) => {
            return [{
                charging_state: parsed.response.charging_state,
                battery_level: parsed.response.battery_level,
                charge_port_door_open: parsed.response.charge_port_door_open,
                charge_port_latch: parsed.response.charge_port_latch}];
        });
    }
    get_get_climate_state() {
        return this._get_command ('/data_request/climate_state').then((parsed) => {
            return [{
                inside_temperature: parsed.response.inside_temp,
                temperature_setting: parsed.response.driver_temp_setting,
                conditioner_on: parsed.response.is_auto_conditioning_on}];

        });
    }
    get_get_drive_state() {
        return this._get_command ('/data_request/drive_state').then((parsed) => {
            return [{location: new Tp.Value.Location(parsed.response.latitude,
                    parsed.response.longitude)}];
        });
    }

    do_wake_up () {
        return this._wake_up_command ();
    }
    do_flash() {
        return this._do_command ('/command/flash_lights', null);
    }

    do_honk_horn() {
        return this._do_command ('/command/honk_horn', null);
    }
    do_set_air_conditioning({ power }) {
        if (power === 'on')
            return this._do_command ('/command/auto_conditioning_start', null);
        else if (power === 'off')
            return this._do_command ('/command/auto_conditioning_stop', null);
        else
            console.log('Error in parameter to air-conditioning' + power);
    }
    do_set_temperature ({ value }) {
        if (value >= 17 && value <= 32) {
            return this._do_command('/command/set_temps', JSON.stringify({
                    "driver_temp": value.toString(),
                    "passenger_temp": value.toString()
                }
            ));
        } else {
            throw new Error('The temperature is not within the right range' + value);
        }
    }
}

TeslaCarDevice.metadata = {
    types: []
};

module.exports = class TeslaDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.tesla-' + state.username;

        this.name = "Tesla Account of " + state.username;
        this.description = "This is your Tesla account, and groups all your cars. "
            + "Each car will appear in the \"Configured Devices\" section of "
            + "your dashboard.";

        this._deviceCollection = new ObjectSet.Simple();
        this._deviceCollection.setMaxListeners(Infinity);
    }

    start() {
        return Tp.Helpers.Http.post(TESLA_BASE_URI + '/oauth/token',
            'grant_type=password&client_id=' + TESLA_CLIENT_ID
            + '&client_secret=' + TESLA_CLIENT_SECRET
            + '&email=' + encodeURIComponent(this.state.username)
            + '&password=' + encodeURIComponent(this.state.password))
            .then((response) => {
                this.accessToken = JSON.parse(response).access_token;
                return Tp.Helpers.Http.get(TESLA_BASE_URI + '/api/1/vehicles',
                    { auth: 'Bearer ' + this.accessToken, 'user-agent': user_agent });
            })
            .then((response) => {
                var parsed = JSON.parse(response);

                for (var vehicle of parsed.response) {
                    this._deviceCollection.addOne(new TeslaCarDevice(this.engine, {
                        username: this.state.username,
                        display_name: vehicle.display_name,
                        device_id: vehicle.id_s,
                        vin: vehicle.vin,
                        state: vehicle.state,
                    }, this));
                }
            });
    }

    stop() {
        this._deviceCollection.removeAll();
    }

    // it's cloud backed so always available
    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    }

    queryInterface(iface) {
        switch (iface) {
            case 'subdevices':
                return this._deviceCollection;
            default:
                return null;
        }
    }
};

module.exports.subdevices = { "com.tesla.car": TeslaCarDevice };
