// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
"use strict";

const fs = require('fs');
const { PassThrough } = require('stream');

const myArgs = process.argv.slice(1);

const devices = require('./data/env_set.js');
const sens_entry = 'sensor: !include sensors.yaml';
const zip_folder = "data/c_f.zip";

const t_help = "\n\nnode init_test_unit.js [options] \n\n" +
    " Options (case sensitive): \n\n" +
    " -B1: build environment (install Home Assistant on provided folder, to be configured manually). \n" +
    "       -h: HomeAssistant destination environment folder.  i.e. '-h /home/user/ha_installation_destination/' \n" +
    " -B2: build environment (install Home Assistant on provided folder, and setup it with preconfigured data [user: user, password: password]). \n" +
    "       -h: HomeAssistant destination environment folder.  i.e. '-h /home/user/ha_installation_destination/' \n" +
    "       -o: HomeAssistant configuration file, the folder which will contain the HomeAssistant configuration folder '.homeassistant'. i.e. '-o /home/user/' \n\n" +
    " -B3: build environment (install Home Assistant on provided folder, setup it with preconfigured data [user: user, password: password]) and setup the IoT environment with chosen devices). \n" +
    "       -h: HomeAssistant destination environment folder.  i.e. '-h /home/user/ha_installation_destination/' \n" +
    "       -o: HomeAssistant configuration file, the folder which will contain the HomeAssistant configuration folder '.homeassistant'. i.e. '-o /home/user/' \n\n" +
    "       -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "       -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
    "        [0]      : all devices \n" +
    "        [1,2,3,n]: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -B3 -h /home/user/ha_installation_destination/ -o /home/user/.homeassistant/ -d [0] \n" +
    " ------------ \n\n" +
    " -S0: start environment previously set\n" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/home-assistant/' \n\n" +
    " -S1: start environment previously set and send inizialization data for the IoT devices \n" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/home-assistant/' \n\n" +
    " -S2: start environment previously set without configuration (reconfigure manually)" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    " -S3: start environment previously set without IoT devices" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    " -S4: start environment previously set with new IoT devices and send inizialization data \n" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    "      -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "      -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
    "        [0]      : all devices \n" +
    "        [1,2,3,n]: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -S3 -h /home/user/home-assistant/ -o /home/user/.homeassistant/ -d [0] \n" +
    " ------------ \n\n" +
    " -U1: update environment previously set, deleting configuration folder (to be set manually)" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    " -U2: update environment previously set, deleting IoT devices" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    " -U3: update environment previously set with new IoT devices (delete old put new)" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    "      -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "      -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
    "        [0]      : all devices \n" +
    "        [1,2,3,n]: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -U2 -h /home/user/almond/ -o /home/user/.homeassistant/configuration.yaml -d [0] \n" +
    " ------------ \n\n" +
    " -M: show this help \n" +
    " ------------ \n\n";

var s_fol = "";

var myArgs_0_v = myArgs[0].split("/");
var myArgs_0 = myArgs[0].replace(myArgs_0_v[myArgs_0_v.length - 1], '');

function cl(msg, rtn) {
    console.log(msg + "\n");

    if (rtn) {
        return;
    } else {
        process.exit();
    }
}

function man_trail(str) {
    str = str.trim();
    if (!str.endsWith("/")) {
        str = str + '/';
    }
    return str
}

function f_write(dest, cont) {
    fs.writeFileSync(dest, cont, 'utf8', (err) => {
        cl('There was an error writing the file ' + dest + ' -> ' + err, true)
    });
    cl("FILE " + dest + " written correctly ", true);
    return;
}

function f_read(path) {
    try {
        var the_file = (fs.readFileSync(path, "utf8")).trim();
    } catch (err) {
        if (err.code === 'ENOENT') {
            cl(" File " + path + " not found", false);
        } else {
            throw err;
        }
    }
    return the_file;
}

function r_folder() {
    var d_list = new Array();
    var str_st = "org.thingpedia.iot.";

    fs.readdirSync(s_fol).forEach(file => {
        let f_name = file.toLowerCase();

        if (f_name.startsWith(str_st)) {
            let s_res = f_name.replace(str_st, '');
            d_list.push(s_res);
        }
    });
    return d_list;
}

function gen_sens_list(cont, st_l) {

    var arr_to_run = new Array;
    var list_to_api = new Array;

    var list_to_file = '- platform: template\n' +
        '  sensors:\n';

    if (st_l === 'd') {
        arr_to_run = cont;
    } else {
        if (s_fol !== '') {
            arr_to_run = r_folder();
        } else {
            cl(" Something went wrong: ", false);
        }
    }

    arr_to_run.forEach(function(cur_val) {
        let um = '';
        if (typeof cur_val.ha.unit_of_measurement !== undefined) {
            um = '      unit_of_measurement: "' + cur_val.ha.unit_of_measurement + '"\n';
        }

        list_to_file = list_to_file +
            '    ' + cur_val.a_id + ':\n' +
            '      friendly_name: "' + cur_val.ha.friendly_name + '"\n' +
            um +
            '      value_template: "{{ state_attr(\'' + cur_val.ha.domain + '.' + cur_val.a_id + '\', \'value\') }}" \n' +
            '      device_class: "' + cur_val.ha.device_class + '"\n\n';

        list_to_api.push({
            "entity_id": cur_val.ha.domain + "." + cur_val.a_id,
            "state": cur_val.i_val
        })

    });

    var obj_to_ret = {
        "file": list_to_file,
        "api": list_to_api
    };

    return obj_to_ret;
}

function do_cli(arr_cmd, ke) {

    //cl(" CHECK: " + JSON.stringify(arr_cmd) + " -  ke: " + ke, false);
    switch (ke) {
        case 'execSync':
            arr_cmd.forEach(s_cmd => {
                cl(" Executing: " + s_cmd, true);

                require('child_process').execSync(s_cmd, (error, stdout, stderr) => {
                    if (error) {
                        cl("ERROR in installing, node-cmd: " + error.message, false);
                    } else if (stderr !== '') {
                        cl("ERROR in installing, node-cmd: " + stderr, false);
                    } else {
                        cl("OUTPUT : " + stdout, true);
                    }
                });

                cl(`Done ! `, true);
            });
            break;
        case 'spawn':
            arr_cmd.forEach(s_cmd => {
                cl(" Executing: " + s_cmd, true);

                var spawn = require('child_process').spawn;

                var child = spawn(s_cmd, { stdio: 'inherit' });

                cl(`Done ! `, true);
            });
            break;
    }
    return;
}

function make_calls(chm, obj_tosend) {

    const http = require('http')

    var k_tk = f_read('./data/tk');
    //var k_tk = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIwMjVjOGQwMTM5MTA0NDEzOTRjMzZkYzc3NDIyYTU4MCIsImlhdCI6MTYyMTQyMDUxNSwiZXhwIjoxOTM2NzgwNTE1fQ.Vi-_NC_IQQjloWrMKkoO1ao87DNTKhB0hwA2i5bFzB8";
    var data = JSON.stringify(obj_tosend);

    var chs = [{
        pth: '/api',
        mtd: 'POST'
    }, {
        pth: '/api/states/' + obj_tosend.entity_id,
        mtd: 'POST'
    }];

    const options = {
        hostname: 'localhost',
        path: chs[chm].pth,
        port: 8123,
        method: chs[chm].mtd,
        headers: {
            "Authorization": "Bearer " + k_tk,
            "content-type": "application/json"
        }
    };

    var to_ret;
    var callback = (response) => {
        cl(" statusCode: " + response.statusCode, true);
        to_ret = response.statusCode;
        //var str = ''
        response.on('data', (chunk) => {
            //str += chunk
            process.stdout.write(chunk);
        });

        response.on('error', (error) => {
            cl(" Error: " + error, false);
        });
        /*
                response.on('end', function () {
                    console.log(str);
                });
                */
    }

    const req = http.request(options, callback);

    req.write(data);
    req.end();

    return to_ret;
}

// prepare for IoT devices inizialization
async function iot_init() {
    const res = await Promise(function() {
        var man_connex = false;
        var array_list = got_list.api;
        while (!man_connex) {
            setTimeout(() => {
                array_list.forEach((obj) => {
                    let makecalls = make_calls(2, obj);
                    if (makecalls === 200 || makecalls === 201) {
                        man_connex = true;
                        return man_connex;
                    }
                });
            }, 5000);
        }
    })

    cl(" IoT data correctly set", true);
    return res;
}

function master_exec(m_cmd) {

    var arr_stp = [
        'sudo dnf -y install python3-devel python3-wheel python3-virtualenv libjpeg-devel',
        'cd ' + myArgs[3] + ' && git clone https://github.com/home-assistant/core home-assistant && cd ' + myArgs[3] + 'home-assistant && virtualenv venv && . ./venv/bin/activate && pip3 install -r requirements.txt && deactivate',
        'unzip -d ' + myArgs[5] + ' ' + myArgs_0 + zip_folder,
        'cd ' + myArgs[3] + ' && . ./venv/bin/activate && python3 -m homeassistant &',
        'sudo rm -r ' + myArgs[5] + '.homeassistant',
        'sudo rm ' + myArgs[5] + '.homeassistant/sensors.yaml'
    ];

    switch (m_cmd) {
        case 1: // B1 - Installation of HA env.
            cl(" Running HA installation on: " + myArgs[3], true);
            // HA installation
            do_cli([arr_stp[0], arr_stp[1]], 'execSync');
            break;
        case 2: // B2 - Installation of HA env., setup of HA env. by addind the conf. folder.
            cl(" Running HA installation on: " + myArgs[3] + ", setup in " + myArgs[5], true);
            // HA installation && setup HA env
            do_cli([arr_stp[0], arr_stp[1], arr_stp[2]], 'execSync');
            break;
        case 3: // B3 - Installation of HA env., setup of HA env. by addind the conf. folder, setup IoT devices in HA.
            {
                cl(" Running HA installation on: " + myArgs[3] + ", setup in " + myArgs[5] + ", and configuration of IoT devices ", true);

                // HA installation && setup HA env
                do_cli([arr_stp[0], arr_stp[1], arr_stp[2]], 'execSync');

                // write specific sensor's file
                f_write(myArgs[5] + "sensor.yaml", got_list.file);

                // adding integration file to HA configuration
                let conf_dest = myArgs[5] + "configuration.yaml"
                let cont_file = f_read(conf_dest);

                if (!cont_file.endsWith(sens_entry)) {
                    cont_file = cont_file + '\n\n' + sens_entry;
                    f_write(conf_dest, cont_file);
                }
            }
            break;
        case 4: // S1 - Start the test env. as previously set and send new inizialization data.
            cl(" Starting HA ", true);
            // start
            iot_init();
            do_cli([arr_stp[3]], 'execSync');
            break;
        case 5: // S3 - Start HA env. without IoT devices (delete IoT devices if present).
            {
                cl(" Starting HA and delete IoT devices previously set", true);

                //check if devices already present and delete it
                let f_dest = myArgs[5] + '.homeassistant/configuration.yaml'
                let chk_sens = f_read(f_dest);

                if (chk_sens.includes(sens_entry)) {
                    let new_content = chk_sens.replace(sens_entry, '');
                    f_write(f_dest, new_content)
                }
                //starting HA
                do_cli([arr_stp[5], arr_stp[3]], 'execSync');
            }
            break;
        case 6: // S4 - Start HA env. and setting new IoT devices.
            cl(" Starting HA and change IoT devices previously set", true);

            // delete IoT devices
            do_cli([arr_stp[5]], 'execSync');

            // write new devices
            f_write(myArgs[5] + "sensor.yaml", got_list.file);

            // start
            iot_init();
            do_cli([rr_stp[3]], 'execSync');
            break;
        case 7: // U2 - Update HA env. by replacing the conf folder but keeping IoT devices previously set.
            {
                cl(" Starting a fresh HA and change configuration folder but keeping IoT devices previously set", true);

                // replace conf folder
                do_cli([arr_stp[4], arr_stp[2]], 'execSync');

                // put back IoT devices
                // adding integration file to HA configuration
                let conf_dest = myArgs[5] + "configuration.yaml"
                let cont_file = f_read(conf_dest);

                if (!cont_file.endsWith(sens_entry)) {
                    cont_file = cont_file + '\n\n' + sens_entry;
                    f_write(conf_dest, cont_file);
                }

                // start
                do_cli([rr_stp[3]], 'execSync');
            }
            break;
        case 8: // U3 - Update HA env. by replacing the conf folder and setting new IoT devices.

            cl(" Starting a fresh HA and change configuration folder but keeping IoT devices previously set", true);

            // replace conf folder
            do_cli([arr_stp[4], arr_stp[2]], 'execSync');

            // delete IoT devices
            do_cli([arr_stp[5]], 'execSync');

            // write new devices
            f_write(myArgs[5] + "sensor.yaml", got_list.file);

            // start
            do_cli([rr_stp[3]], 'execSync');
            break;
        case 9: // S2 - Start HA env. without configuration (reconfigure manually). 
            cl(" Deleting HA configuration and starting HA", true);

            // delete conf folder and start the environment
            do_cli([arr_stp[4], arr_stp[3]], 'execSync');
            break;
        case 10: // U1 - Update HA env. without configuration (reconfigure manually).
            cl(" Deleting HA configuration", true);

            // delete conf folder
            do_cli([arr_stp[4]], 'execSync');
            break;
        case 11: // S0 - Start HA env.
            cl(" Starting HA ", true);

            // Start ha
            do_cli([arr_stp[3]], 'execSync');
            break;
    }

    return;
}

if (myArgs[1] === "-T") {
    cl(" TEST PATH", true);
    make_calls(0, { "entity_id": "sun.sun", "state": "below_horizon" })
} else {
    if (myArgs[1] === "-M") {
        cl(t_help, false);
    } else if (myArgs[1] === "-U1" || myArgs[1] === "-U2" || myArgs[1] === "-U3") {
        if (myArgs[2] === "-h") {
            if (typeof myArgs[3] === 'string') {
                myArgs[3] = man_trail(myArgs[3]);

                if (myArgs[4] === "-o") {
                    if (typeof myArgs[5] === 'string') {
                        myArgs[5] = man_trail(myArgs[5]);

                        if (myArgs[1] === "-U1") {
                            master_exec(10);
                        } else if (myArgs[1] === "-U2") {
                            master_exec(7);
                        } else {
                            var got_list;

                            if (myArgs[6] === "-d") {
                                if ((typeof myArgs[7] !== 'string') || !Array.isArray(JSON.parse(myArgs[7]))) {
                                    cl(" Wrong option for -d", false);
                                }
                                var ls_dev = JSON.parse(myArgs[7]);

                                if (ls_dev.length < 1) {
                                    cl(" Wrong option length for -d ", false);
                                }

                                if (ls_dev.length === 1) {
                                    if (ls_dev[0] === 0) {
                                        cl(" Updating using all devices from list ", true);
                                        got_list = gen_sens_list(devices, 'd');
                                    } else {
                                        cl(" Updating using only 1 device from list ", true);
                                        got_list = gen_sens_list(ls_dev, 'd');
                                    }
                                } else {
                                    cl(" Updating using subset of devices from list ", true);
                                    var arr_sens_list = new Array;
                                    ls_dev.forEach(function(cur_val) {
                                        arr_sens_list.push(devices[cur_val])
                                    });
                                    got_list = gen_sens_list(arr_sens_list, 'd');
                                }

                            } else if (myArgs[6] === "-c") {
                                if (typeof myArgs[7] !== 'string') {
                                    cl(" Wrong option for -c ", false);
                                }
                                s_fol = myArgs[7];
                                cl(" Updating with devices from Thingpedia-common-devices: " + myArgs[7] + " \n\n ", true);
                                got_list = gen_sens_list(r_folder(myArgs[3]), 'c');
                            } else {
                                cl(" Missing argument. Expected '-c' or '-d'. ", false);
                            }
                            master_exec(8);
                        }
                    } else {
                        cl(" Wrong path. Please provide the destination folder for HA configuration file.", false);
                    }
                } else {
                    cl(" Missing argument. Expected '-o'. ", false);
                }
            } else {
                cl(" Wrong path. Please provide the destination folder for HA installation. ", false);
            }
        } else {
            cl(" Missing argument. Expected '-h'. ", false);
        }
    } else if (myArgs[1] === "-S0" || myArgs[1] === "-S1" || myArgs[1] === "-S2" || myArgs[1] === "-S3" || myArgs[1] === "-S4") {
        if (myArgs[2] === "-h") {
            if (typeof myArgs[3] === 'string') {
                myArgs[3] = man_trail(myArgs[3]);

                if (myArgs[1] === "-S0") {
                    master_exec(11);
                } else if (myArgs[1] === "-S1") {
                    master_exec(4);
                } else {
                    if (myArgs[4] === "-o") {
                        if (typeof myArgs[5] === 'string') {
                            myArgs[5] = man_trail(myArgs[5]);

                            if (myArgs[1] === "-S2") {
                                master_exec(9);
                            } else if (myArgs[1] === "-S3") {
                                master_exec(5);
                            } else {
                                var got_list;

                                if (myArgs[6] === "-d") {
                                    if ((typeof myArgs[7] !== 'string') || !Array.isArray(JSON.parse(myArgs[7]))) {
                                        cl(" Wrong option for -d", false);
                                    }
                                    var ls_dev = JSON.parse(myArgs[7]);

                                    if (ls_dev.length < 1) {
                                        cl(" Wrong option length for -d ", false);
                                    }

                                    if (ls_dev.length === 1) {
                                        if (ls_dev[0] === 0) {
                                            cl(" Running using all new devices from list ", true);
                                            got_list = gen_sens_list(devices, 'd');
                                        } else {
                                            cl(" Running using only 1 new device from list ", true);
                                            got_list = gen_sens_list(ls_dev, 'd');
                                        }
                                    } else {
                                        cl(" Running using new subset of devices from list ", true);
                                        var arr_sens_list = new Array;
                                        ls_dev.forEach(function(cur_val) {
                                            arr_sens_list.push(devices[cur_val])
                                        });
                                        got_list = gen_sens_list(arr_sens_list, 'd');
                                    }

                                } else if (myArgs[6] === "-c") {
                                    if (typeof myArgs[7] !== 'string') {
                                        cl(" Wrong option for -c ", false);
                                    }
                                    s_fol = myArgs[7];
                                    cl(" Running with new devices from Thingpedia-common-devices: " + myArgs[7] + " \n\n ", true);
                                    got_list = gen_sens_list(r_folder(myArgs[3]), 'c');
                                } else {
                                    cl(" Missing argument. Expected '-c' or '-d'. ", false);
                                }
                                master_exec(6);
                            }
                        } else {
                            cl(" Wrong path. Please provide the destination folder for HA configuration file.", false);
                        }
                    } else {
                        cl(" Missing argument. Expected '-o'. ", false);
                    }
                }
            } else {
                cl(" Wrong path. Please provide the destination folder for HA installation. ", false);
            }
        } else {
            cl(" Missing argument. Expected '-h'. ", false);
        }
    } else if (myArgs[1] === "-B1" || myArgs[1] === "-B2" || myArgs[1] === "-B3") {
        if (myArgs[2] === "-h") {
            if (typeof myArgs[3] === 'string') {
                myArgs[3] = man_trail(myArgs[3]);

                if (myArgs[1] === "-B1") {
                    master_exec(1);
                } else {
                    if (myArgs[4] === "-o") {
                        if (typeof myArgs[5] === 'string') {
                            myArgs[5] = man_trail(myArgs[5]);

                            if (myArgs[1] === "-B2") {
                                master_exec(2);
                            } else {
                                var got_list;

                                if (myArgs[6] === "-d") {
                                    if ((typeof myArgs[7] !== 'string') || !Array.isArray(JSON.parse(myArgs[7]))) {
                                        cl(" Wrong option for -d", false);
                                    }
                                    var ls_dev = JSON.parse(myArgs[7]);

                                    if (ls_dev.length < 1) {
                                        cl(" Wrong option length for -d ", false);
                                    }

                                    if (ls_dev.length === 1) {
                                        if (ls_dev[0] === 0) {
                                            cl(" Running using all devices from list ", true);
                                            got_list = gen_sens_list(devices, 'd');
                                        } else {
                                            cl(" Running using only 1 device from list ", true);
                                            got_list = gen_sens_list(ls_dev, 'd');
                                        }
                                    } else {
                                        cl(" Running using subset of devices from list ", true);
                                        var arr_sens_list = new Array;
                                        ls_dev.forEach(function(cur_val) {
                                            arr_sens_list.push(devices[cur_val])
                                        });
                                        got_list = gen_sens_list(arr_sens_list, 'd');
                                    }

                                } else if (myArgs[6] === "-c") {
                                    if (typeof myArgs[7] !== 'string') {
                                        cl(" Wrong option for -c ", false);
                                    }
                                    s_fol = myArgs[7];
                                    cl(" Running with devices from Thingpedia-common-devices: " + myArgs[7] + " \n\n ", true);
                                    got_list = gen_sens_list(r_folder(myArgs[3]), 'c');
                                } else {
                                    cl(" Wrong argument. Expected '-c' or '-d'. ", false);
                                }
                                master_exec(3);
                            }
                        } else {
                            cl(" Wrong path. Please provide the destination folder for HA configuration file.", false);
                        }
                    } else {
                        cl(" Wrong argument. Expected '-o'. ", false);
                    }
                }
            } else {
                cl(" Wrong path. Please provide the destination folder for HA installation. ", false);
            }
        } else {
            cl(" Wrong argument. Expected '-h'. ", false);
        }
    } else {
        cl(" Wrong argument. Expected '-M' or '-U' or '-S' or '-B1/-B2/-B3'. ----> -M for man", false);
    }
}