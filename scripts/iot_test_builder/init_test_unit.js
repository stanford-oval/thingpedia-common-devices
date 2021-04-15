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

const devices = require('./env_set.js');

const myArgs = process.argv.slice(2);

const sens_entry = 'sensor: !include sensor.yaml';

const t_help = "\n\nnode init_test_unit.js [options] \n\n" +
               " Options (case sensitive): \n\n" +
               " -B: build environment and start it (install Home Assistant on provided folder and setup the IoT environment with chosen devices). \n" +
               "      -h: HomeAssistant destination environment folder.  i.e. '-h /home/user/' \n" +
               "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/.homeassistant/' \n\n" +
               "      -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
               "    or \n" +
               "      -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
               "        [0]      : all devices \n" +
               "        [1,2,3,n]: specifc subset of devices \n\n" +
               " EXAMPLE  node init_test_unit.js -B -h /home/user/almond/ -o /home/user/.homeassistant/configuration.yaml -d [0] \n" +
               " ------------ \n\n" +
               " -S: start environment set previously. \n" +
               "      -h: HomeAssistant environment folder, to start it. No trailing slash. i.e. '-h /home/user/' \n\n" +
               " EXAMPLE  node init_test_unit.js -S -h /home/user/almond/ \n" +
               " ------------ \n\n" +
               " -U: apply new setup to environment previously set \n" +
               "      -h: HomeAssistant environment folder, to start it. No trailing slash. i.e. '-h /home/user/' \n" +
               "      -o: HomeAssistant configuration file, the folder which contain HomeAssistant 'configuration.yaml'. i.e. '-o /home/user/.homeassistant/' \n\n" +
               "      -c: add virtual devices available in the folder (main|staging|universe) as listed in 'env_set.js' (alternately to '-d' ooption). i.e. '-c /home/user/oval/almond/thingpedia-common-devices/main/' \n" +
               "    or \n" +
               "      -d: add virtual devices listed in 'env_set.js' (alternately to '-c' ooption). i.e.  \n" +
               "        [0]      : all devices \n" +
               "        [1,2,3,n]: specifc subset of devices \n\n" +
               " EXAMPLE  node init_test_unit.js -U -h /home/user/almond/ -o /home/user/.homeassistant/configuration.yaml -d [0] \n" +
               " ------------ \n\n" +
               " -M: show this help \n" +
               " ------------ \n\n" ;  

var s_fol = '';

function cl( msg, rtn ) {
    console.log( msg );

    if ( rtn ) {
        return;
    } else {
        process.exit();
    }
}

function f_write ( dest, cont ) {
    fs.writeFileSync( dest, cont, 'utf8', (err) => {
        console.log('There was an error writing the file ' + dest + ' -> ' + err);
    });
    cl( "FILE " + dest + " written correctly ", true );
    return;
}

function r_folder () {
    var d_list = new Array();
    var str_st = "org.thingpedia.iot.";

    fs.readdirSync(s_fol).forEach(file => {
        let f_name = file.toLowerCase();
        
        if ( f_name.startsWith(str_st) ) {
            let s_res = f_name.replace( str_st, '' );
            d_list.push(s_res);
        }
    });
    return d_list;
}

function gen_sens_list( cont, st_l ){

    var arr_to_run = new Array;

    var st_bl = '- platform: template\n' +
                '  sensors:\n';
   
    if ( st_l === 'd' ) {
        arr_to_run = cont;
    } else {
        if ( s_fol !== '') {
            arr_to_run = r_folder();
        } else {
            cl( " Something went wrong: ", false );
        }
    }

    arr_to_run.forEach( function(cur_val) {
        let um = '';
        if ( typeof cur_val.ha.unit_of_measurement !== undefined) {
            um = '      unit_of_measurement: "' + cur_val.ha.unit_of_measurement + '"\n';
        }
        
        st_bl = st_bl +
                        '    ' + cur_val.a_id + ':\n' +
                        '      friendly_name: "' + cur_val.ha.friendly_name + '"\n' +
                        um +
                        '      value_template: "{{ state_attr(\''+ cur_val.ha.domain + '.' + cur_val.a_id + '\', \'value\') }}" \n' +
                        '      device_class: "' + cur_val.ha.device_class + '"\n\n';
    });
      
    return st_bl;
}

function ha_cmd ( stp, dest ){
    var arr_stp = [
                    'sudo dnf -y install python3-devel python3-wheel python3-virtualenv libjpeg-devel',
                    'cd ' + dest + ' && git clone https://github.com/home-assistant/core home-assistant && cd ' + dest + 'home-assistant && virtualenv venv && . ./venv/bin/activate && pip3 install -r requirements.txt && deactivate',  
                    'cd ' + dest + ' && . ./venv/bin/activate && python3 -m homeassistant &'
                  ];
    
    var r_cmd = arr_stp[stp];
    
    cl( " Executing: " + r_cmd, true );

    require('child_process').execSync( r_cmd,(error, stdout, stderr) =>{ 
        if (error ) {            
            cl( "ERROR in installing node-cmd: " + error.message, false );
        } else if ( stderr !== '' ){
            cl( "ERROR in installing node-cmd: " + stderr, false );
        } else {
            cl( "OUTPUT : " + stdout, true );
        }
    });

    cl( `Done ! `, true );   
    return;
}

if ( myArgs[0] === "-M" ) {
    cl( t_help, false );
} else if ( myArgs[0] === "-U" ) {

} else if ( myArgs[0] === "-S" ) {
    if ( myArgs[1] === "-h" ) {
        if ( typeof myArgs[2] === 'string' ) {
            cl( " Running HA from: " + myArgs[2], true );
            ha_cmd ( 1 , myArgs[2] );
        } else {
            cl( " Wrong path. Please provide the HA folder to start it from. ", false );
        }        
    } else {
        cl( " Wrong argument. Expected '-h'. ", false );
    } 
} else if ( myArgs[0] === "-B" ) {
    if ( myArgs[1] === "-h" ) {
        if ( typeof myArgs[2] === 'string' ) {
            if ( myArgs[3] === "-o" ) {
                    if ( typeof myArgs[4] === 'string' ) {
                        var got_list; //list of virtual device to add to configuration
                        if ( myArgs[5] === "-d" ) {
                            if ( (typeof myArgs[6] !== 'string') || !Array.isArray(JSON.parse(myArgs[6]))) {
                                cl( " Wrong option for -d", false );
                            }
                            var ls_dev = JSON.parse(myArgs[6]);

                            if ( ls_dev.length < 1 ) {
                                cl( " Wrong option length for -d ", false );
                            }

                            if ( ls_dev.length === 1 ) {
                                if ( ls_dev[0] === 0 ) {
                                    cl( " Running using all devices from list " + devices, true );
                                    got_list = gen_sens_list( devices, 'd' );
                                } else {
                                    cl( " Running using only 1 device from list ", true );
                                    got_list = gen_sens_list( devices[ls_dev[0]], 'd' );
                                }
                            } else {
                                cl( " Running using subset of devices from list ", true );
                                var arr_sens_list = new Array;
                                ls_dev.forEach( function(cur_val) {
                                    arr_sens_list.push( devices[cur_val] )
                                });
                                got_list = gen_sens_list( arr_sens_list, 'd' );
                            }

                        } else if ( myArgs[5] === "-c") {
                            if ( typeof myArgs[6] !== 'string' ) {
                                cl( " Wrong option for -c ", false );
                            }
                            s_fol = myArgs[6];
                            cl( " Running with devices from Thingpedia-common-devices: " + myArgs[6] + " \n\n ", true );
                            got_list = gen_sens_list( r_folder( myArgs[2] ), 'c' );
                        } else {
                            cl( " Wrong argument. Expected '-c' or '-d'. ", false );
                        }

                        f_write ( "/home/user/oval/test.yaml", got_list );
                        cl( " done: " + got_list, false );

                        cl( " Running HA installation on: " + myArgs[2], true );
                        ha_cmd ( 0 , myArgs[2] );

                        var conf_file = (fs.readFileSync( myArgs[4] , "utf8")).trim();
                
                        if ( !conf_file.endsWith(sens_entry) ) { 
                            conf_file = conf_file + '\n\n' + sens_entry;
                        }

                        cl( " Writing HA configuration on: " + myArgs[2], true );
                        f_write ( conf_dest, conf_file );
                        
                    } else {
                        cl( " Wrong path. Please provide the destination folder for HA configuration file.", false );
                    }        
            } else {
                cl( " Wrong argument. Expected '-h' or '-o'. ", false );
            }
        } else {
            cl( " Wrong path. Please provide the destination folder for HA installation. ", false );
        }        
    } else {
        cl( " Wrong argument. Expected '-h' or '-o'. ", false );
    } 
} else {
    cl( " Wrong argument. Expected '-M' or '-U' or '-S' or '-B'. ----> -M for man", false );
}


/*
function f_append ( fl_name, to_wr ) {
    fs.appendFile( fl_name , to_wr, (err) => {
        if (err) {
            console.log( 'Some error occurred' + err);
        } else {
            // Get the file contents after the append operation
            console.log("\nFile Contents of file after append:",
            fs.readFileSync("example_file.txt", "utf8"));
        }
    });
}
*/



