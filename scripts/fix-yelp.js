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

const { readAllLines } = require('./lib/argutils');

// modern javascript finally looking like python!
async function main() {
    for await (const line of readAllLines([process.argv[2]])) {
        let [id, sentence, target_code] = line.split('\t')

        if (/servesCuisine:String =~ QUOTED_STRING_1/.test(target_code)) {
            sentence = sentence.replace(/QUOTED_STRING_1/, 'GENERIC_ENTITY_com.yelp:restaurant_cuisine_0');
            target_code = target_code.replace(/servesCuisine:String =~ QUOTED_STRING_1/, 'cuisines contains GENERIC_ENTITY_com.yelp:restaurant_cuisine_0');
        } else if (/servesCuisine:String =~ QUOTED_STRING_0/.test(target_code)) {
            sentence = sentence.replace(/QUOTED_STRING_0/, 'GENERIC_ENTITY_com.yelp:restaurant_cuisine_0');
            sentence = sentence.replace(/QUOTED_STRING_1/, 'QUOTED_STRING_0');
            target_code = target_code.replace(/servesCuisine:String =~ QUOTED_STRING_0/, 'cuisines contains GENERIC_ENTITY_com.yelp:restaurant_cuisine_0');
            target_code = target_code.replace(/QUOTED_STRING_1/, 'QUOTED_STRING_0');
        }

        console.log(`${id}\t${sentence}\t${target_code}`);
    }
}
main();
