// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Juan Vimberg <jvimberg@stanford.edu>
//                Tucker L. Ward <tlward@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = class UberDeviceClass extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.uber',
            scope: ['profile', 'request', 'history', 'all_trips'],
            authorize: 'https://login.uber.com/oauth/v2/authorize',
            get_access_token: 'https://login.uber.com/oauth/v2/token',
            redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.uber',

            callback(engine, accessToken, refreshToken) {
                var auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get('https://api.uber.com/v1.2/me', {
                    auth: auth,
                    accept: 'application/json'
                }).then((response) => {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.uber',
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        profileId: parsed.rider_id,
                        email: parsed.email,
                        userName: parsed.first_name + ' ' + parsed.last_name}, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.uber' + this.profileId;
        this.name = "Uber Account %s".format(this.userName) ;
        this.description = "Query times and availability of Uber services.";
        this.baseUrl = 'https://api.uber.com/v1.2';
    }

    get profileId() {
        return this.state.profileId;
    }

    get email() {
        return this.state.email;
    }

    get userName() {
        return this.state.userName;
    }

    get_current() {
        return Tp.Helpers.Http.get(this.baseUrl + '/requests/current', { useOAuth2: this, dataContentType: 'application/json' }).then((response) => {
            const parsedResponse = JSON.parse(response);
            return [{
                status: parsedResponse.status,
                vehicle: parsedResponse.vehicle? `${parsedResponse.vehicle.make} ${parsedResponse.vehicle.model} ${parsedResponse.vehicle.license_plate}` : 'Not available yet',
                vehicle_picture: parsedResponse.vehicle? parsedResponse.vehicle.picture_url : null,
                driver: parsedResponse.driver? parsedResponse.driver.name : 'Not available yet',
                driver_picture: parsedResponse.driver? parsedResponse.driver.picture_url : null,
                eta: parsedResponse.pickup.eta,
                from: { x: parsedResponse.pickup.longitude, y: parsedResponse.pickup.latitude, display: parsedResponse.pickup.address },
                to: { x: parsedResponse.destination.longitude, y: parsedResponse.destination.latitude, display: parsedResponse.destination.address }
            }];
        });
    }

    do_request({ uber_type, start, end, seat_count }, env) {
        return Tp.Helpers.Http.get(this.baseUrl + '/products?latitude=' + start.y + '&longitude=' + start.x,
            { useOAuth2: this, dataContentType: 'application/json' })
            .then((response) => {
                let products = JSON.parse(response);
                let product_id = '';
                uber_type = uber_type.replace('_', '').replace('uberblack', 'black');
                for (let product of products.products) {
                    if (product.display_name.toLowerCase() === uber_type) {
                        product_id = product.product_id;
                        break;
                    }
                }
                return Tp.Helpers.Http.post(this.baseUrl +'/requests/estimate',
                    JSON.stringify({
                        start_latitude: start.y,
                        start_longitude: start.x,
                        end_latitude: end.y,
                        end_longitude: end.x,
                        product_id: product_id,
                        seat_count: seat_count
                    }),
                    {
                        useOAuth2: this,
                        dataContentType: 'application/json',
                        accept: 'application/json',
                        ignoreErrors: true
                    })
                    .then((response) => {
                        let fare = JSON.parse(response);
                        if ('errors' in fare)
                            return env.output('com.uber:request', { Error: fare.errors[0].title });
                        return Tp.Helpers.Http.post(this.baseUrl + '/requests',
                            JSON.stringify({
                                start_latitude: start.y,
                                start_longitude: start.x,
                                end_latitude: end.y,
                                end_longitude: end.x,
                                fare_id: fare.fare.fare_id,
                                seat_count: seat_count
                            }),
                            {
                                useOAuth2: this,
                                dataContentType: 'application/json',
                                accept: 'application/json',
                                ignoreErrors: true
                            })
                            .then((response) => {
                                const parsedResponse = JSON.parse(response);
                                if ('errors' in parsedResponse)
                                    return env.output('com.uber:request', { Error: parsedResponse.errors[0].title });
                                let fullInfo = {
                                    status: parsedResponse.status,
                                    vehicle: parsedResponse.vehicle? `${parsedResponse.vehicle.make} ${parsedResponse.vehicle.model} ${parsedResponse.vehicle.plate}` : 'Not available yet',
                                    vehicle_picture: parsedResponse.vehicle? parsedResponse.vehicle.picture_url : null,
                                    driver: parsedResponse.driver? parsedResponse.driver.name : 'Not available yet',
                                    driver_picture: parsedResponse.driver? parsedResponse.driver.picture_url : null,
                                    eta: parsedResponse.eta
                                };
                                let output = parsedResponse.status === 'processing' ? { Status: 'Your order is processing.' } : fullInfo;
                                env.output('com.uber:request', output);
                            });
                    });
            });

    }
};
