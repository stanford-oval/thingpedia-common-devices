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

const zip_folder = "data/c_f.zip";
const base_dev_folder = "org.thingpedia.iot.";

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
    "       -f: add virtual devices available in the specific folder (main|staging|universe) (alternately to '-d' option). i.e. '-f /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "       -d: add virtual devices by provided list (alternately to '-f' option). i.e.  \n" +
    "        ['dev1','dev2','dev3','devn']: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -B3 -h /home/user/ha_installation_destination/ -o /home/user/.homeassistant/ -d ['air','temperature','vacuum'] /home/user/oval/almond/thingpedia-common-devices/main/ \n" +
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
    "      -f: add virtual devices available in the specific folder (main|staging|universe)  (alternately to '-d' option). i.e. '-f /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "       -d: add virtual devices by provided list (alternately to '-f' option). i.e.  \n" +
    "        ['dev1','dev2','dev3','devn']: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -S4 -h /home/user/ha_installation_destination/ -o /home/user/.homeassistant/ -d ['air','temperature','vacuum'] /home/user/oval/almond/thingpedia-common-devices/main/  \n" +
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
    "      -f: add virtual devices available in the specific folder (main|staging|universe)  (alternately to '-d' option). i.e. '-f /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
    "    or \n" +
    "      -d: add virtual devices by provided list (alternately to '-f' option). i.e.  \n" +
    "        ['dev1','dev2','dev3','devn']: specifc subset of devices \n\n" +
    " EXAMPLE  node init_test_unit.js -U3 -h /home/user/ha_installation_destination/ -o /home/user/.homeassistant/ -d ['air','temperature','vacuum'] /home/user/oval/almond/thingpedia-common-devices/main/ \n" +
    " ------------ \n\n" +
    " -M: show this help \n" +
    " ------------ \n\n";

var myArgs_0_v = myArgs[0].split("/");
var myArgs_0 = myArgs[0].replace(myArgs_0_v[myArgs_0_v.length - 1], '');

var got_list;
var sub_list;

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

function r_folder(folder_path, sublisted) {
    var d_list = new Array();

    fs.readdirSync(folder_path).forEach(folder_found => {
        let folder_name = folder_found.toLowerCase();
        if (folder_name.startsWith(base_dev_folder)) {
            let s_res = folder_name.replace(base_dev_folder, '');

            if (sublisted !== '') { // compare list requested with devices in folder
                if (sublisted.includes(s_res)) {
                    d_list.push(s_res);
                } else {
                    cl(" An item from the provided sublist doesn't match the device name in Thingpedia folder. ", true);
                }
            } else {
                d_list.push(s_res);
            }
        }
    });
    if (d_list.length !== 0) {
        return d_list;
    } else {
        cl(" The sublist of devices to use wasn't present at all in the folder provide. Please provide another folder, or an updated list. ", false);
    }
}

function gen_sens_list(dfolder, mode, sublist) {

    var arr_to_run = new Array;
    var list_to_api = new Array;

    if (mode === 'd') {
        arr_to_run = r_folder(dfolder, sublist);
    } else {
        arr_to_run = r_folder(dfolder, "");
    }

    if (arr_to_run.constructor !== Array) {
        cl(" Something went wrong: ", false);
    }

    let base_test = "/eval/test/init.js";

    arr_to_run.forEach(function(cur_val) {

        let set_file = dfolder + base_dev_folder + cur_val + base_test;
        let content = JSON.stringify(f_read(set_file));

        list_to_api.push({
            "entity_id": content.ha.domain + "." + content.ha.entity_id,
            "state": init_data_generator(content.ha.init_call.i_state),
            "attributes": content.ha.init_call.attrib
        })
    });

    return list_to_api;
}

function init_data_generator(rules) {
    let to_ret;
    switch (rules.k) {
        case 'state':
            let rnd_generator = Math.floor(Math.random() * rules.rng.length);
            to_ret = rules.rng[rnd_generator - 1];
            break;
        case 'number':
            to_ret = Math.floor(Math.random() * (rules.rng[1] - rules.rng[0] + 1)) + rules.rng[0];
            break;
    }

    return to_ret;
}

function do_cli(arr_cmd, ke) {

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

function make_calls(call, obj_tosend) {

    const http = require('http')

    var k_tk = f_read('./data/tk');
    var data = JSON.stringify(obj_tosend);

    var chs = [{
        pth: '/api/',
        mtd: 'GET'
    }, {
        pth: '/api/states/' + obj_tosend.entity_id,
        mtd: 'POST'
    }];

    const options = {
        hostname: 'localhost',
        path: chs[call].pth,
        port: 8123,
        method: chs[call].mtd,
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

    if (call === 1) {
        req.write(data);
    }

    req.end();

    return to_ret;
}

async function iot_init(data_to_send) {
    const res = await Promise(function() {
        var man_connex = false;
        while (!man_connex) {
            setTimeout(() => {
                data_to_send.forEach((obj) => {
                    let makecalls = make_calls(0, '');
                    if (makecalls === 200 || makecalls === 201) {
                        make_calls(1, data_to_send);
                        man_connex = true;
                        return man_connex;
                    } else {
                        cl(" Not connected yet, wait 5 secs more", true);
                    }
                });
            }, 5000);
        }
    })

    cl(" IoT data correctly set", true);
    return res;
}

function master_exec(m_cmd, the_list) {

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
        case 2: // B2 - Installation of HA env., setup of HA env. by adding the conf. folder.
            cl(" Running HA installation on: " + myArgs[3] + ", setup in " + myArgs[5], true);
            // HA installation && setup HA env
            do_cli([arr_stp[0], arr_stp[1], arr_stp[2]], 'execSync');
            break;
        case 3: // B3 - Installation of HA env., setup of HA env. by addind the conf. folder, setup IoT devices in HA.
            {
                cl(" Running HA installation on: " + myArgs[3] + ", setup in " + myArgs[5] + ", and configuration of IoT devices ", true);

                // HA installation && setup HA env
                do_cli([arr_stp[0], arr_stp[1], arr_stp[2]], 'execSync');

                /*/ adding integration file to HA configuration
                let conf_dest = myArgs[5] + ".homeassistant/configuration.yaml";
                let cont_file = (f_read(conf_dest)).trim;


                if (!cont_file.endsWith(sens_entry)) {
                    cont_file = cont_file + '\n\n' + sens_entry;
                    f_write(conf_dest, cont_file);
                }*/
                iot_init(the_list);
            }
            break;
        case 4: // S1 - Start the test env. as previously set and send new inizialization data.
            cl(" Starting HA ", true);
            // start
            iot_init(the_list);
            do_cli([arr_stp[3]], 'execSync');
            break;
        case 5: // S3 - Start HA env. without IoT devices (delete IoT devices if present).
            { // to be deleted
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
            //do_cli([arr_stp[5]], 'execSync');

            // write new devices
            //f_write(myArgs[5] + ".homeassistant/sensors.yaml", the_list.file);

            // start
            iot_init();
            do_cli([arr_stp[3]], 'execSync');
            break;
        case 7: // U2 - Update HA env. by replacing the conf folder but keeping IoT devices previously set.
            {
                cl(" Starting a fresh HA and change configuration folder but keeping IoT devices previously set", true);

                // replace conf folder
                do_cli([arr_stp[4], arr_stp[2]], 'execSync');

                // put back IoT devices
                // adding integration file to HA configuration
                let conf_dest = myArgs[5] + ".homeassistant/configuration.yaml"
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
            f_write(myArgs[5] + ".homeassistant/sensor.yaml", the_list.file);

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

if (myArgs[1] === "-T") { //this code is just executed
    cl(" TEST PATH - START ", true);
    // code here
    cl(" TEST PATH - FINISH ", false);
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
                            if (myArgs[6] === "-d") {
                                if ((typeof myArgs[7] !== 'string') || !Array.isArray(JSON.parse(myArgs[7]))) {
                                    cl(" Wrong option for -d", false);
                                } else if (typeof myArgs[8] !== 'string') {
                                    cl(" Wrong path. Please provide the path to Thingpedia-common-devices.", false);
                                }

                                myArgs[8] = man_trail(myArgs[8]);
                                sub_list = JSON.parse(myArgs[7]);

                                if (sub_list.length < 1) {
                                    cl(" Wrong option length for -d ", false);
                                }

                                cl(" Updating using subset of devices", true);

                                got_list = gen_sens_list(myArgs[8], 'd', sub_list);

                            } else if (myArgs[6] === "-f") {
                                if (typeof myArgs[7] !== 'string') {
                                    cl(" Wrong option for -f ", false);
                                }
                                cl(" Updating with devices from Thingpedia-common-devices: " + myArgs[7] + " \n\n ", true);
                                got_list = gen_sens_list(myArgs[7], 'f');
                            } else {
                                cl(" Missing argument. Expected '-f' or '-d'. ", false);
                            }
                            cl('this is a test', false); //--------------------------------------------------------------------------------
                            master_exec(8, got_list);
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
                                if (myArgs[6] === "-d") {
                                    if ((typeof myArgs[7] !== 'string') || !Array.isArray(JSON.parse(myArgs[7]))) {
                                        cl(" Wrong option for -d", false);
                                    }
                                    myArgs[8] = man_trail(myArgs[8]);
                                    sub_list = JSON.parse(myArgs[7]);

                                    if (sub_list.length < 1) {
                                        cl(" Wrong option length for -d ", false);
                                    }

                                    cl(" Running using new subset of devices from list ", true);

                                    got_list = gen_sens_list(myArgs[8], 'd', sub_list);

                                } else if (myArgs[6] === "-f") {
                                    if (typeof myArgs[7] !== 'string') {
                                        cl(" Wrong option for -f ", false);
                                    }
                                    cl(" Running with new devices from Thingpedia-common-devices: " + myArgs[7] + " \n\n ", true);
                                    got_list = gen_sens_list(myArgs[7], 'f');
                                } else {
                                    cl(" Missing argument. Expected '-f' or '-d'. ", false);
                                }
                                master_exec(6, got_list);
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
                                if (myArgs[6] === "-d") {
                                    if ((typeof myArgs[7] !== 'string') || !Array.isArray(JSON.parse(myArgs[7]))) {
                                        cl(" Wrong option for -d", false);
                                    }
                                    var ls_dev = JSON.parse(myArgs[7]);

                                    if (ls_dev.length < 1) {
                                        cl(" Wrong option length for -d ", false);
                                    }

                                    cl(" Running using subset of devices from list ", true);

                                    got_list = gen_sens_list(myArgs[8], 'd', sub_list);

                                } else if (myArgs[6] === "-f") {
                                    if (typeof myArgs[7] !== 'string') {
                                        cl(" Wrong option for -f ", false);
                                    }
                                    cl(" Running with devices from Thingpedia-common-devices: " + myArgs[7] + " \n\n ", true);
                                    got_list = gen_sens_list(myArgs[7], 'f');
                                } else {
                                    cl(" Wrong argument. Expected '-f' or '-d'. ", false);
                                }
                                master_exec(3, got_list);
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