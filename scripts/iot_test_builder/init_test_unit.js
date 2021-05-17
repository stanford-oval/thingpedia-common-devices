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
const sens_entry = 'sensor: !include sensor.yaml';

const t_help = "\n\nnode init_test_unit.js [options] \n\n" +
    " Options (case sensitive): \n\n" +
    " -B: build environment and start it (install Home Assistant on provided folder and setup the IoT environment with chosen devices). \n" +
    "      -h: HomeAssistant destination environment folder.  i.e. '-h /home/user/ha_installation_destination/' \n" +
    "      -o: HomeAssistant configuration file, the folder which will contain the HomeAssistant configuration folder '.homeassistant'. i.e. '-o /home/user/' \n\n" +
    "      -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "      -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
    "        [0]      : all devices \n" +
    "        [1,2,3,n]: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -B -h /home/user/ha_installation_destination/ -o /home/user/.homeassistant/ -d [0] \n" +
    " ------------ \n\n" +
    " -S: start environment set previously. \n" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/home-assistant/' \n\n" +
    " EXAMPLE  node init_test_unit.js -S -h /home/user/home-assistant/ \n" +
    " ------------ \n\n" +
    " -U: apply new setup to environment previously set \n" +
    "      -h: HomeAssistant environment folder, to start it.  i.e. '-h /home/user/' \n" +
    "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/' \n\n" +
    "      -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "      -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
    "        [0]      : all devices \n" +
    "        [1,2,3,n]: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -U -h /home/user/almond/ -o /home/user/.homeassistant/configuration.yaml -d [0] \n" +
    " ------------ \n\n" +
    " -M: show this help \n" +
    " ------------ \n\n";

var s_fol = '';

function cl(msg, rtn) {
    console.log(msg);

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
        console.log('There was an error writing the file ' + dest + ' -> ' + err);
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

    var st_bl = '- platform: template\n' +
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

        st_bl = st_bl +
            '    ' + cur_val.a_id + ':\n' +
            '      friendly_name: "' + cur_val.ha.friendly_name + '"\n' +
            um +
            '      value_template: "{{ state_attr(\'' + cur_val.ha.domain + '.' + cur_val.a_id + '\', \'value\') }}" \n' +
            '      device_class: "' + cur_val.ha.device_class + '"\n\n';
    });

    return st_bl;
}

/*
"attributes": {
        "next_rising":"2016-05-31T03:39:14+00:00",
        "next_setting":"2016-05-31T19:16:42+00:00"
    },
    "entity_id": "sun.sun",
    "last_changed": "2016-05-30T21:43:29.204838+00:00",
    "last_updated": "2016-05-30T21:47:30.533530+00:00",
    "state": "below_horizon"
*/

function do_cli(arr_cmd, ke) {

    cl(" CHECK: " + JSON.stringify(arr_cmd) + " -  ke: " + ke, true);
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

                var child = spawn(s_cmd, { detached: true, stdio: 'inherit' });

                cl(`Done ! `, true);
            });
            break;
    }

    return;
}

function make_calls(chm) {

    const https = require('https')

    var k_tk = f_read("./data/tk");

    var chs = [{
        pth = "/api",
        mtd = 'POST'
    }, {
        pth = "/api/states/" + e_id,
        mtd = 'POST'
    }];

    const options = {
        hostname: 'localhost',
        path: chs[chm].pth,
        port: 8123,
        method: chs[chm].mtd,
        headers = {
            "Authorization": "Bearer " + k_tk,
            "content-type": "application/json",
        }
    };

    const req = https.request(options, res => {
        cl(" statusCode: " + res.statusCode, true);
        res.on('data', d => {
            process.stdout.write(d)
        });
    })

    req.on('error', error => {
        cl(" Error: " + error, false);
    });

    req.write(data);
    req.end();
}

function master_exec(m_cmd, e_var) {

    var arr_stp = [
        'sudo dnf -y install python3-devel python3-wheel python3-virtualenv libjpeg-devel',
        'cd ' + myArgs[3] + ' && git clone https://github.com/home-assistant/core home-assistant && cd ' + myArgs[3] + 'home-assistant && virtualenv venv && . ./venv/bin/activate && pip3 install -r requirements.txt && deactivate',
        'unzip -d ' + myArgs[5] + ' ' + myArgs[0],
        'cd ' + dest + ' && . ./venv/bin/activate && python3 -m homeassistant &'
    ];

    switch (m_cmd) {
        case 1: // Installation of HA env.
            cl(" Running HA installation on: " + myArgs[3], false);
            // HA installation
            do_cli([arr_stp[0], arr_stp[1]], 'execSync');
            break;
        case 2: // Installation of HA env., setup of HA env. by addind the conf. folder.
            cl(" Running HA installation on: " + myArgs[3] + ", setup in " + myArgs[5], false);
            // HA installation && setup HA env
            do_cli([arr_stp[0], arr_stp[1], arr_stp[2]], 'execSync');
            break;
        case 3: // Installation of HA env., setup of HA env. by addind the conf. folder, setup IoT devices in HA.
            cl(" Running HA installation on: " + myArgs[3] + ", setup in " + myArgs[5] + ", and configuration of IoT devices ", false);
            // HA installation && setup HA env
            do_cli([arr_stp[0], arr_stp[1], arr_stp[2]], 'execSync');

            // setup IoT devices

            /*

            var origi = myArgs[3].split("/")

            //8do_cmd ( "0|1|2" , myArgs[3],  origi[(origi.length) - 1]);

            //cl( " till here ", false );

            // write specific sensor's file
            f_write ( myArgs[5] + "sensor.yaml", got_list );

            // adding integration file to HA configuration
            let conf_dest = myArgs[5] + "configuration.yaml"
            let cont_file = f_read( conf_dest );
            
            if ( !cont_file.endsWith(sens_entry) ) { 
                cont_file = cont_file + '\n\n' + sens_entry;
            }

            f_write ( conf_dest, cont_file );
            */
            break;
        case 4: // Start the test env. as previously set.

            // start

            break;
        case 5: // Start HA env. without IoT devices (delete IoT devices if present).

            // delete IoT devices if any

            // start

            break;
        case 6: // Start HA env. and setting new IoT devices.

            // change IoT devices

            // start

            break;
        case 7: // Start a fresh HA env. by replacing the conf folder but keeping IoT devices previously set.

            // preserve set IoT devices

            // replace conf folder

            // put back IoT devices

            // start

            break;
        case 8: // Start a fresh HA env. by replacing the conf folder and setting new IoT devices.

            // replace conf folder

            // setting new IoT devices

            // start

            break;
    }
    return;
}

if (myArgs[1] === "-M") {
    cl(t_help, false);
} else if (myArgs[1] === "-U") {

} else if (myArgs[1] === "-S") {
    if (myArgs[2] === "-h") {
        if (typeof myArgs[3] === 'string') {
            cl(" Running HA from: " + myArgs[3], true);
            do_cmd(3, myArgs[3]);
        } else {
            cl(" Wrong path. Please provide the HA folder to start it from. ", false);
        }
    } else {
        cl(" Wrong argument. Expected '-h'. ", false);
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
                            var got_list; //list of virtual device to add to configuration

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
    cl(" Wrong argument. Expected '-M' or '-U' or '-S' or '-B'. ----> -M for man", false);
}