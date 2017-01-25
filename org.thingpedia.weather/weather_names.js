// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Silei Xu <silei@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details

//http://api.met.no/weatherapi/weathericon/1.1/documentation
module.exports = function (weather_id) {
    switch(weather_id) {
        case 1: return "Sun";
        case 2: return "Light cloud";
        case 3: return "Partly cloud";
        case 4: return "Cloud";
        case 5: return "Light sunshower";
        case 6: return "Light sunshower with thunder";
        case 7: return "Sleet and sun";
        case 8: return "Snow and sun";
        case 9: return "Light rain";
        case 10: return "Rain";
        case 11: return "Rain with thunder";
        case 12: return "Sleet";
        case 13: return "Snow";
        case 14: return "Snow with thunder";
        case 15: return "Fog";

        case 20: return "Sleet with thunder and sun";
        case 21: return "Snow with thunder and sun";
        case 22: return "Light rain with thunder";
        case 23: return "Sleet with thunder";
        case 24: return "Drizzle with thunder and sun";
        case 25: return "Sunshower with thunder";
        case 26: return "Light sleet with thunder and sun";
        case 27: return "Heavy sleet with thunder and sun";
        case 28: return "Light snow with thunder and sun";
        case 29: return "Heavy snow with thunder and sun";
        case 30: return "Drizzle with thunder";
        case 31: return "Light sleet with thunder";
        case 32: return "Heavy sleet with thunder";
        case 33: return "Light snow with thunder";
        case 34: return "Heavy snow with thunder";

        case 40: return "Drizzle and sun";
        case 41: return "Rain and sun";
        case 42: return "Light sleet and sun";
        case 43: return "Heavy sleet and sun";
        case 44: return "Light snow and sun";
        case 45: return "Heavy snow and sun";
        case 46: return "Drizzle";
        case 47: return "Light sleet";
        case 48: return "Heavy sleet";
        case 49: return "Light snow";
        case 50: return "Heavy snow";

        default: return "Unknown";
    }

};


