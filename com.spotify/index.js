// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-

/* © 2018 GABBY WRIGHT ALL RIGHTS RESERVED */

'use strict';

const Tp = require('thingpedia');
const querystring = require('querystring');

const USER_URL = 'https://api.spotify.com/v1/me';
const USER_PLAYER_URL = 'https://api.spotify.com/v1/me/player';


// Player URLs
const AVAILABLE_DEVICES_URL = 'https://api.spotify.com/v1/me/player/devices';
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';

const AUDIO_FEATURES_URL = 'https://api.spotify.com/v1/audio-features/';
const KEY_MAPPINGS = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];

// Stateless PUT commands
const PAUSE_URL = 'https://api.spotify.com/v1/me/player/pause';
const PLAY_URL = 'https://api.spotify.com/v1/me/player/play';

// Stateless POST commands
const NEXT_URL = 'https://api.spotify.com/v1/me/player/next';
const PREVIOUS_URL = 'https://api.spotify.com/v1/me/player/previous';

// Stateful PUT commands
const SHUFFLE_URL = 'https://api.spotify.com/v1/me/player/shuffle?';
const REPEAT_URL = 'https://api.spotify.com/v1/me/player/repeat?';
const SEEK_URL = 'https://api.spotify.com/v1/me/player/seek?';
const TRACKS_URL = 'https://api.spotify.com/v1/me/tracks?';

// Search URL
const SEARCH_URL = 'https://api.spotify.com/v1/search?';

//User Library URLs
// need to replace get userId
const USER_PLAYLISTS = 'https://api.spotify.com/v1/users/{username}/playlists?';
const PER_SET = 50;

//Albums
const ALBUM_URL = 'https://api.spotify.com/v1/albums/{id}/tracks';


module.exports = class SpotifyDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2( {
            kind: 'com.spotify',
            scope: [
                'playlist-read-collaborative',
                'playlist-modify-private',
                'playlist-read-private',
                'playlist-modify-public',
                'user-read-email',
                'user-read-private',
                'user-read-playback-state',
                'user-read-currently-playing',
                'user-modify-playback-state',
                'user-read-recently-played',
                'user-top-read',
                'user-follow-read',
                'user-follow-modify',
                'user-library-read',
                'user-library-modify'],
            set_state: true,
            authorize: 'https://accounts.spotify.com/authorize',
            get_access_token: 'https://accounts.spotify.com/api/token',
            redirect_uri: platform.getOrigin() + '/devices/oauth2/callback/com.spotify',

            callback(engine, accessToken, refreshToken) {
                return Tp.Helpers.Http.get(USER_URL, {
                    accept: 'application/json',
                    extraHeaders: {
                        'Authorization': 'Bearer ' + accessToken,
                        useOAuth2: this

                    }
                } ).then(response => {
                    const parsed = JSON.parse(response);
                    console.log(parsed);
                    return engine.devices.loadOneDevice(
                        {
                            kind: 'com.spotify',
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            userId: parsed.id,
                            userName: parsed.display_name
                        },
                        true
                    );
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.spotify-' + this.userId;
        this.name = 'Spotify Account of %s'.format(this.userName);
        this.description = 'This is your Spotify Account';
    }

    http_get(url) {
        return Tp.Helpers.Http.get(url, {
            accept: 'application/json',
            useOAuth2: this
        });
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    /* Player */

    async set_active_device(devices) {

        if (devices.length === 0) {
            console.log("no available devices");
            return false;
        }

        // device already active
        for (let i = 0; i < devices.length; i++) {
            console.log(devices[i].is_active);
            if (devices[i].is_active) {
                console.log("found an active device");
                return true;
            }
        }

        console.log('setting active device');


        return this.http_put(USER_PLAYER_URL,
            JSON.stringify( {"device_ids": [devices[0].id]} ),
            {useOAuth2: this, dataContentType: 'application/json', accept: 'application/json'}
        );
    }


    // returns an array of devices available for playback
    get_get_available_devices() {
        return this.http_get(AVAILABLE_DEVICES_URL).then(response => {
            console.log("available devices are " + response);
            return JSON.parse(response).devices;
         });
    }

    async currently_playing_helper() {
        return Tp.Helpers.Http.get(CURRENTLY_PLAYING_URL, {
            accept: 'application/json',
            useOAuth2: this
        });
    }

    get_get_currently_playing() {
        return this.currently_playing_helper().then(response => {
            let NONE_RESULT = [{name: '', is_song_playing: false,
                human_output: "No song is currently playing."}];
        if (response === '' || response.length === 0 ) {
            return NONE_RESULT;
        }
        const parsed = JSON.parse(response);
        if (parsed.is_playing === false) {
            return NONE_RESULT;
        }
        let message = "The currently playing song is '" + parsed.item.name + "'.";
        return [{name: parsed.item.name, is_song_playing: true, human_output: message}];
        });
    }

    get_get_user_playlist() {
        return this.http_get(`https://api.spotify.com/v1/users/${this.userId}/playlists`).then((response) => {
            return JSON.parse(response).items.map((item) => {
                return {playlist: item.name};
            });
        });
    }

    get_get_user_playlist_track({ playlist }) {
        return this.http_get(`https://api.spotify.com/v1/users/${this.userId}/playlists`).then((response) => {
            let playlist_id;
            JSON.parse(response).items.some((item) => {
                if (item.name.toLowerCase() === playlist) {
                    playlist_id = item.id;
                    return true;
                }
                return false;
            });
            if (playlist_id)
                return this.http_get(`https://api.spotify.com/v1/users/${this.userId}/playlists/${playlist_id}/tracks`).then((response) => {
                    return JSON.parse(response).items.map((item) => {
                        return {song: item.track.name};
                    })
                });
            throw Error(`No playlist called ${playlist}`);
        });
    }

    http_put(url, data, options) {
        return Tp.Helpers.Http.request(url, 'PUT', data, options);
    }

    http_put_default_options(url, data) {
        return this.http_put(url, data, {
            useOAuth2: this,
            dataContentType: 'application/json',
            accept: 'application/json'
        });
    }

    http_post_default_options(url, data) {
        console.log("post url is " + url);
        console.log(typeof url);
        return Tp.Helpers.Http.post(url, data, {
            useOAuth2: this,
            dataContentType: 'application/json',
            accept: 'application/json'
        });
    }

    async player_play_helper(data = '', options = {
        useOAuth2: this,
        dataContentType: 'application/json',
        accept: 'application/json'
    }) {
            let devices = await this.get_get_available_devices();
            let canPlay = this.set_active_device(devices);
            console.log("CAN PLAY: " +  canPlay);
            if (typeof canPlay === 'boolean' && canPlay) {
                return this.http_put(PLAY_URL, data, options);
            } else{
                canPlay.then((res) => {
                    console.log('res is ' + res);
                    console.log('data to play is ' + JSON.stringify(data));
                    return this.http_put(PLAY_URL, data, options);
                })
            }
    }

    do_player_pause() {
        return this.http_put_default_options(PAUSE_URL, '');
    }

    do_player_play() {
        console.log("Playing music...");
        return this.player_play_helper();
    }

    do_player_next() {
        return this.http_post_default_options(NEXT_URL, '');
    }

    do_player_previous() {
        return this.http_post_default_options(PREVIOUS_URL, '');
    }

    do_player_shuffle( { shuffle } ) {
        shuffle = shuffle === 'on' ? 'true' : 'false';
        console.log("setting shuffle: " + shuffle);
        let shuffleURL = SHUFFLE_URL + querystring.stringify( {state: shuffle} );
        console.log(shuffleURL);
        return this.http_put_default_options(shuffleURL, '');
    }

    do_player_repeat( { repeat } ) {
        console.log("repeat: " + repeat);
        return this.http_put_default_options(REPEAT_URL +  querystring.stringify( {state: repeat} ), '');
    }

    /* Search */
    search(query, types) {
      //  let searchURL = SEARCH_URL + "?q=" + query.toString().replace(' ', '+') + '&type=' + types + '&market=from_token' + '&limit=1';
        let searchURL = SEARCH_URL + querystring.stringify( {q: query.toString(), type : types, market: 'from_token', limit: 1} );
        console.log("searching for  " + searchURL);
        return Tp.Helpers.Http.get(searchURL, {
            accept: 'application/json',
            useOAuth2: this
        } ).then(response => {
            const parsed = JSON.parse(response);
            console.log("search results are" + parsed);
            return parsed;
        });
    }

    do_play_album( {toPlay} ) {
        return this.search(toPlay,'album').then(searchResults=>{
            if (!searchResults.hasOwnProperty('albums')) return;
            if(searchResults.albums.total === 0) return;
            let data = {'context_uri':searchResults.albums.items[0].uri};
            console.log('data is ' + JSON.stringify(data));
            return this.player_play_helper(JSON.stringify(data));
        });
    }

    do_play_artist( {toPlay} ) {
        return this.search(toPlay,'artist').then(searchResults=>{
            if (!searchResults.hasOwnProperty('artists')) return;
            if(searchResults.artists.total === 0) return;
            let data = {'context_uri':searchResults.artists.items[0].uri};
            console.log('data is ' + JSON.stringify(data));
            return this.player_play_helper(JSON.stringify(data));
        });
    }

    do_play_playlist( {toPlay} ) {
        return this.search(toPlay,'playlist').then(searchResults=>{
            if (!searchResults.hasOwnProperty('playlists')) return;
            if (searchResults.playlists.total === 0) return;
            let data = {'context_uri':searchResults.playlists.items[0].uri};
            console.log('data is ' + JSON.stringify(data));
            return this.player_play_helper(JSON.stringify(data));
        });
    }

    splitMultiString(string) {
        console.log('song string is ' + string);
        string = string.toString().toLowerCase();
        // string can be split by the word comma or actual ','
        string = string.replace(new RegExp(' comma ','g'),',');
        let songs = string.split(',');
        return songs;
    }

    async songNamesToURIs(songs){
        let uris = [];
        for (let i = 0; i < songs.length; i++){
            let searchResults = await this.search(songs[i].trim(),'track');
            if (!searchResults.hasOwnProperty('tracks') || searchResults.tracks.total === 0) continue;
            uris.push(searchResults.tracks.items[0].uri);
        }
        return uris;
    }

    // plays multiple songs, separated by the phrase "comma"
    async do_play_songs( {toPlay} ) {
        let songs = this.splitMultiString(toPlay);
        console.log('songs to play are ' + JSON.stringify(songs));
        let uris = await this.songNamesToURIs(songs);
        console.log('uris are ' + JSON.stringify(uris));
        return this.player_play_helper(JSON.stringify( {'uris':uris} ));
    }

    do_play_seek_seconds( {seconds} ) {
        console.log("seeking to milliseconds: " + seconds);
        let milliseconds = Math.round(seconds);
        let seek_url = SEEK_URL + querystring.stringify({position_ms: milliseconds.toString()});
        return this.http_put_default_options(seek_url, '');
    }

    do_save_current_track() {
        return this.currently_playing_helper().then(response => {
            if (response === '' || response.length === 0 ) {
            return;
            }
            const parsed = JSON.parse(response);
            if (parsed.is_playing === false) {
                return;
            }
            let id = parsed.item.id;
            let save_url = TRACKS_URL + querystring.stringify({ids: id});
            return this.http_put_default_options(save_url, '');
        });
    }

    /* Audio Features */
    audio_features_get_by_id(id) {
        return Tp.Helpers.Http.get(AUDIO_FEATURES_URL + id, {
            accept: 'application/json',
            useOAuth2: this
        });
    }

    audio_features_helper(songName, transformation) {
        console.log("Audio features helper received songname: " + songName);
        if (typeof(songName) === 'undefined' || songName === "") {
            return this.currently_playing_helper().then(response => {
                let NONE_RESULT = [{human_output: "No song is currently playing."}];
            if (response === '' || response.length === 0 ) {
                return NONE_RESULT;
            }
            const parsed = JSON.parse(response);
            if (parsed.is_playing === false) {
                return NONE_RESULT;
            }
            let id = parsed.item.id;
            return this.audio_features_get_by_id(id).then(response => transformation(JSON.parse(response)));
        });
        } else {
            return this.search(songName,'track').then(searchResults=>{
                if (!searchResults.hasOwnProperty('tracks')) return [{human_output: "No song found for that query."}];
                let id = searchResults.tracks.items[0].id;
                return this.audio_features_get_by_id(id).then(response => transformation(JSON.parse(response)));
            });
        }
    }

    get_get_tempo( {song} ) {
        let transformation = function (response) {
            console.log('response from features when looking up tempo...');
            console.log(response);
            let tempo = response.tempo.toFixed(2);

            let message = 'The tempo of this track is ' + tempo + ' beats per minute.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_danceability( {song} ) {
        let transformation = function (response) {
            let danceability = response.danceability.toFixed(2);
            let message = 'On a scale from 0 to 1, the danceability of this track is ' + danceability + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_acousticness( {song} ) {
        let transformation = function (response) {
            let acousticness = response.acousticness.toFixed(2);
            let message = 'On a scale from 0 to 1, the acousticness of this track is ' + acousticness + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_energy( {song} ) {
        let transformation = function (response) {
            let energy = response.energy.toFixed(2);
            let message = 'On a scale from 0 to 1, the energy of this track is ' + energy + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_speechiness( {song} ) {
        let transformation = function (response) {
            let speechiness = response.speechiness.toFixed(2);
            let message = 'On a scale from 0 to 1, the speechiness of this track is ' + speechiness + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_valence( {song} ) {
        let transformation = function (response) {
            let valence = response.valence.toFixed(2);
            let message = 'On a scale from 0 to 1, the valence of this track is ' + valence + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_liveness( {song} ) {
        let transformation = function (response) {
            let liveness = response.liveness.toFixed(2);
            let message = 'On a scale from 0 to 1, the liveness of this track is ' + liveness + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_instrumentalness( {song} ) {
        let transformation = function (response) {
            let instrumentalness = response.instrumentalness.toFixed(2);
            let message = 'On a scale from 0 to 1, the instrumentalness of this track is ' + instrumentalness + '.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_loudness( {song} ) {
        let transformation = function (response) {
            let loudness = response.loudness.toFixed(2);
            let message = 'On a scale from -60 to 0 dB, the loudness of this track is ' + loudness + ' dB.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_key( {song} ) {
        let transformation = function (response) {
            let key = KEY_MAPPINGS[response.key];
            let modality = response.mode === 1 ? 'Major' : 'minor';
            let message = 'The key of this track is ' + key + ' ' + modality +'.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    get_get_time_signature( {song} ) {
        let transformation = function (response) {
            let num_beats = response.time_signature;
            let message = 'This track has ' + num_beats.toString() + ' beats per measure.';
            return [{human_output: message}];
        };
        return this.audio_features_helper(song, transformation);
    }

    /* Playlists */
    // using Levenshtein distance/Edit distance
    //TODO: make algorithm better, doesn't do too well with longer names
    //TODO: possibly return '' if best match is  > certain score
    findBestPlaylistMatch(query,allPlaylists) {
        let bestMatch = {uri:'',score:''};
        bestMatch.uri = allPlaylists[0].uri;
        bestMatch.score = getEditDistance(query.toLowerCase(), allPlaylists[0].name.toLowerCase());
        for (let i = 1; i < allPlaylists.length; i++) {
            let score = getEditDistance(query.toLowerCase(),allPlaylists[i].name.toLowerCase());
            if (score < bestMatch.score) {
                bestMatch.score = score;
                bestMatch.uri = allPlaylists[i].uri;
            }
            if(bestMatch.score === 0) break;
        }
        return bestMatch.uri;
    }

    getPageOfPlaylists(offset=0) {
        let set = USER_PLAYLISTS.replace(new RegExp('{username}','g'),this.state.userId.toString());
        set = set + querystring.stringify({offset : offset, limit : PER_SET});
        console.log('user playlist search url is ' + set);
        return Tp.Helpers.Http.get(set, {
            accept: 'application/json',
            useOAuth2: this
        } ).then(response => {
            return JSON.parse(response);
        });
    }

    async getUserPlaylists() {
        let allPlaylists = [];
        let next = USER_PLAYLISTS;
        let nextSet = await this.getPageOfPlaylists();
        allPlaylists = allPlaylists.concat(nextSet.items);
        let size = nextSet.total;
        for (let i = PER_SET; i < size; i+= PER_SET) {
            nextSet = await this.getPageOfPlaylists(i);
            allPlaylists = allPlaylists.concat(nextSet.items);
        }
        return allPlaylists;
    }

    async find_my_playlist(playlist) {
        let playlists = await this.getUserPlaylists();
        //TODO: change to return error.
        if (playlists.length === 0) return '';
        console.log("size is " + playlists.length);
        return this.findBestPlaylistMatch(playlist,playlists);
    }


    async do_play_my_playlist( {toPlay} ) {
        let matchedPlaylistURI = await this.find_my_playlist(toPlay);
        console.log("matched playlist is " + matchedPlaylistURI);
        if (matchedPlaylistURI.length === 0) return;
        console.log("best match is " + matchedPlaylistURI);
        return this.player_play_helper(JSON.stringify( {'context_uri':matchedPlaylistURI} ));
    }


    add_uris_to_playlist(playlistURL,uris) {
        let addingURL = USER_PLAYLISTS + "/" + playlistURL + "/tracks";
        addingURL = addingURL.replace('{username}',this.state.userId);
        console.log("url is " + addingURL);
        console.log(typeof addingURL);
        console.log(JSON.stringify(uris));
        return this.http_post_default_options(addingURL.toString(),JSON.stringify(uris));
    }

    async get_album_tracks(uri) {
        console.log(typeof uri);
        console.log(uri);
        uri = uri.substring(uri.indexOf("album:") + 6);
        let tracks = [];
        let url = ALBUM_URL.replace("{id}",uri);
        console.log("url is" + url);
        return Tp.Helpers.Http.get(url, {
            accept: 'application/json',
            useOAuth2: this
        }).then(response => {
                response = JSON.parse(response);
            console.log("album list results are " + JSON.stringify(response));
            for (let i = 0; i < response.items.length; i++) {
                tracks.push(response.items[i].uri);
            }
            return tracks;
        });
    }

    async do_add_album_to_playlist( {toAdd,playlist} ) {
        let albumResult = await this.search(toAdd,'album');
        console.log("album is " + JSON.stringify(albumResult));
        if(!albumResult.hasOwnProperty('albums')) return;
        if(albumResult.albums.total === 0) return;
        albumResult = albumResult.albums.items[0].uri;
        console.log(albumResult);
        let playlistResult = await this.find_my_playlist(playlist);
        console.log(playlistResult);
        if (playlistResult.length === 0) return;
        playlistResult = playlistResult.substring(playlistResult.indexOf("playlist:") + 9);
        let albumTracks = await this.get_album_tracks(albumResult);
        console.log("Album tracks are " + JSON.stringify(albumTracks));
        let data = {"uris":albumTracks};
        return this.add_uris_to_playlist(playlistResult,data);
    }

    async do_add_songs_to_playlist( {toAdd,playlist} ) {    //TODO: rename this later to _ "add songs ... "
        let songs = this.splitMultiString(toAdd);
        let uris = await this.songNamesToURIs(songs);
        let playListURI = await this.find_my_playlist(playlist);
        playListURI = playListURI.substring(playListURI.indexOf("playlist:") + 9);
        return this.add_uris_to_playlist(playListURI,uris);
    }

    async do_add_this_song_to_playlist( {playlist} ) {
        let song = await this.currently_playing_helper();
        song = JSON.parse(song);
        let data = {"uris":[song.item.uri]};
        let playListURI = await this.find_my_playlist(playlist);
        playListURI = playListURI.substring(playListURI.indexOf("playlist:") + 9);
        return this.add_uris_to_playlist(playListURI,data);
    }

    async do_create_new_playlist( {title,description,isPublic} ) {
        let url = USER_PLAYLISTS;
        url = url.replace('{username}',this.state.userId);
        let data = {name:title};
        if (description) data.description = description;
        if (isPublic !== 'undefined') data.public = isPublic;
        else data.public = false;
        return this.http_post_default_options(url,JSON.stringify(data));
    }
};

/* Copyright (c) 2011 Andrei Mackenzie
Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.*/
function getEditDistance(a,b) {
    if(a.length === 0) return b.length;
    if(b.length === 0) return a.length;
    var matrix = [];
    // increment along the first column of each row
    var i;
    for(i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    // increment each column in the first row
    var j;
    for(j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    // Fill in the rest of the matrix
    for(i = 1; i <= b.length; i++) {
        for(j = 1; j <= a.length; j++) {
            if(b.charAt(i-1) === a.charAt(j-1)) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                    Math.min(matrix[i][j-1] + 1, // insertion
                        matrix[i-1][j] + 1)); // deletion
            }
        }
    }
    return matrix[b.length][a.length];
}
