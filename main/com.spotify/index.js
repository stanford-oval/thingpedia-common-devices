// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Gabby Wright, Hemanth Kini
//           2018-2020 The Board of Trustees of the Leland Stanford Junior University
//           2020 Ryan Cheng
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
const Tp = require("thingpedia");
const querystring = require("querystring");

const PLAY_URL = "https://api.spotify.com/v1/me/player/play";
const SEARCH_URL = "https://api.spotify.com/v1/search?";
const AVAILABLE_DEVICES_URL = "https://api.spotify.com/v1/me/player/devices";
const ARTIST_ALBUM_URL = "https://api.spotify.com/v1/artists/{id}/albums?";
const AUDIO_FEATURES_URL = 'https://api.spotify.com/v1/audio-features/?';
const ALBUM_URL = 'https://api.spotify.com/v1/albums?';
const TRACK_URL = 'https://api.spotify.com/v1/tracks?';

module.exports = class SpotifyDevice extends Tp.BaseDevice {

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.spotify-" + this.state.profile.id;
    }

    http_get(url) {
        return Tp.Helpers.Http.get(url, {
            accept: "application/json",
            useOAuth2: this,
        }).catch((e) => {
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    http_put(url, data, options) {
        return Tp.Helpers.Http.request(url, "PUT", data, options).catch(
            (e) => {
                throw new Error(JSON.parse(e.detail).error.message);
            });
    }

    get_get_available_devices() {
        return this.http_get(AVAILABLE_DEVICES_URL).then((response) => {
            return JSON.parse(response).devices;
        });
    }

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
        console.log("setting active device");
        return devices[0].id;
    }

    search(query, types, limit) {
        let searchURL = SEARCH_URL + querystring.stringify({
            q: query.toString(),
            type: types,
            market: "from_token",
            limit
        });
        console.log("searching for  " + searchURL);
        return Tp.Helpers.Http.get(searchURL, {
            accept: "application/json",
            useOAuth2: this,
        }).then((response) => {
            const parsed = JSON.parse(response);
            return parsed;
        }).catch((e) => {
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    albums_get_by_artist_id(artistID, groups) {
        let url = ARTIST_ALBUM_URL.replace("{id}", artistID) + querystring.stringify({
            include_groups: groups,
            market: "from_token",
            limit: 50
        });
        return Tp.Helpers.Http.get(url, {
            accept: 'application/json',
            useOAuth2: this
        }).then((response) => {
            return JSON.parse(response).items;
        }).catch((e) => {
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    audio_features_get_by_id(ids) {
        const url = AUDIO_FEATURES_URL + querystring.stringify({
            ids: ids.join()
        });
        return Tp.Helpers.Http.get(url, {
            accept: 'application/json',
            useOAuth2: this
        }).then((response) => {
            return JSON.parse(response).audio_features;
        }).catch((e) => {
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    tracks_get_by_id(ids) {
        const url = TRACK_URL + querystring.stringify({
            ids: ids.join()
        });
        return Tp.Helpers.Http.get(url, {
            accept: 'application/json',
            useOAuth2: this
        }).then((response) => {
            return JSON.parse(response);
        }).catch((e) => {
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    albums_get_by_id(ids) {
        const url = ALBUM_URL + querystring.stringify({
            ids: ids.join()
        });
        return Tp.Helpers.Http.get(url, {
            accept: 'application/json',
            useOAuth2: this
        }).then((response) => {
            return JSON.parse(response);
        }).catch((e) => {
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    async parse_tracks(tracks) {
        //const ids = tracks.map((track) => new Tp.Value.Entity(track.id, track.name));
        const ids = tracks.map((track) => track.id);
        const audioFeatures = await this.audio_features_get_by_id(ids);
        var songs = [];
        for (var i = 0; i < tracks.length; i++) {
            const release_date = new Date(tracks[i].album.release_date);
            const artists = tracks[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
            //You can't get the audio features for some songs, so we're setting 0.5 as a default value
            var energy = 0.5;
            var danceability = 0.5;
            if (audioFeatures[i]) {
                energy = audioFeatures[i].energy;
                danceability = audioFeatures[i].danceability;
            }
            const songObj = {
                id: new Tp.Value.Entity(tracks[i].uri, tracks[i].name),
                artists,
                release_date,
                popularity: tracks[i].popularity,
                energy,
                danceability
            };
            songs.push(songObj);
        }
        return songs;
    }

    async songs_by_search(query, artistURI) {
        const searchResults = await this.search(query, "track", 50);
        if (!Object.prototype.hasOwnProperty.call(searchResults, "tracks") || searchResults.tracks.total === 0) throw new Error(`Query ${query} failed`);
        return this.parse_tracks(searchResults.tracks.items);
    }

    async songs_by_artist(artists, sortDirection) {
        const searchResults = await this.search(artists[0], "artist", 1);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'artists') || searchResults.artists.total === 0) throw new Error(`Artist ${artists[0]} not found`);
        const artistID = searchResults.artists.items[0].id;
        var albums = await this.albums_get_by_artist_id(artistID, "album,single");
        albums = albums.sort((album1, album2) => {
            var releaseDate1 = new Date(album1.release_date).getTime();
            var releaseDate2 = new Date(album2.release_date).getTime();
            if (sortDirection === "asc") return releaseDate1 - releaseDate2;
            else return releaseDate2 - releaseDate1;
        });
        albums = albums.filter((album) => {
            const albumArtists = album.artists;
            const intersection = albumArtists.filter((artist) => artists.includes(artist.name.toLowerCase()) || artistID === artist.id);
            if (intersection.length === artists.length) return true;
            return false;
        });
        var totalSongs = 0;
        var albumIds = [];
        for (const album of albums) {
            //Only getting up to 50 songs because spotify can only handle 50 songs per api call
            totalSongs += album.total_tracks;
            if (totalSongs > 50) break;
            albumIds.push(album.id);
        }
        if (albumIds.length === 0) throw new Error("No songs found");
        const albumItems = (await this.albums_get_by_id(albumIds)).albums;
        const songIds = albumItems.map((album) => album.tracks.items.map((track) => track.id));
        const trackItems = await this.tracks_get_by_id(songIds);
        return this.parse_tracks(trackItems.tracks);
    }

    async albums_by_search(query, artistURI) {
        const searchResults = await this.search(query, "album", 20);
        if (!Object.prototype.hasOwnProperty.call(searchResults, "albums") || searchResults.albums.total === 0) throw new Error(`Query ${query} failed`);
        const ids = searchResults.albums.items.map((album) => album.id);
        const albumItems = (await this.albums_get_by_id(ids)).albums;
        var albums = [];
        for (var i = 0; i < albumItems.length; i++) {
            const release_date = new Date(albumItems[i].release_date);
            const artists = albumItems[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
            const albumObj = {
                id: new Tp.Value.Entity(albumItems[i].uri, albumItems[i].name),
                artists,
                release_date,
                popularity: albumItems[i].popularity,
            };
            albums.push(albumObj);
        }
        return albums;
    }

    async albums_by_artist(artists, sortDirection) {
        const searchResults = await this.search(artists[0], "artist", 1);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'artists') || searchResults.artists.total === 0) throw new Error(`Artist ${artists[0]} not found`);
        const artistID = searchResults.artists.items[0].id;
        var artistAlbums = await this.albums_get_by_artist_id(artistID, "album");
        artistAlbums = artistAlbums.sort((album1, album2) => {
            var releaseDate1 = new Date(album1.release_date).getTime();
            var releaseDate2 = new Date(album2.release_date).getTime();
            if (sortDirection === "asc") return releaseDate1 - releaseDate2;
            else return releaseDate2 - releaseDate1;
        });
        artistAlbums = artistAlbums.filter((album) => {
            const albumArtists = album.artists;
            const intersection = albumArtists.filter((artist) => artists.includes(artist.name.toLowerCase()) || artistID === artist.id);
            if (intersection.length === artists.length) return true;
            return false;
        });
        var ids = artistAlbums.map((album) => album.id);
        if (ids.length === 0) throw new Error("No songs found");
        //20 is the maximum amount of albums that you can query at once
        if (ids.length > 20) ids.length = 20;
        var albumItems = (await this.albums_get_by_id(ids)).albums;
        var albums = [];
        for (var i = 0; i < albumItems.length; i++) {
            const release_date = new Date(albumItems[i].release_date);
            const artists = albumItems[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
            const albumObj = {
                id: new Tp.Value.Entity(albumItems[i].uri, albumItems[i].name),
                artists,
                release_date,
                popularity: albumItems[i].popularity,
            };
            albums.push(albumObj);
        }
        return albums;
    }

    async get_song(params, hints, env) {
        var idFilter = '';
        var yearFilter = '';
        var artistFilter = '';
        var artists = [];
        var yearLowerBound = 0;
        var yearUpperBound = new Date().getFullYear();
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) idFilter = `track:"${value.display}" `;
                    else idFilter = `track:"${value}" `;
                }
                if (pname === "artists" && (op === "contains" || op === "contains~")) {
                    if (value instanceof Tp.Value.Entity) artists.push(value.display.toLowerCase());
                    else artists.push(value.toLowerCase());
                    artistFilter = `artist: ${artists[0]} `;
                } else if (pname === "release_date" && (op === "==")) {
                    yearFilter = `year:${value.getFullYear()} `;
                } else if (pname === "release_date" && (op === ">=")) {
                    yearFilter = `year:${value.getFullYear()}-${yearUpperBound} `;
                    yearLowerBound = value.getFullYear();
                } else if (pname === "release_date" && (op === "<=")) {
                    yearFilter = `year:${yearLowerBound}-${value.getFullYear()} `;
                    yearUpperBound = value.getFullYear();
                }
            }
        }
        //you can't search for multiple artists because when searching by artist spotify only returns songs where the input artist is the main artist
        //so if you search for a song where an artist is featured or there are multiple artists then there will problems.
        if (idFilter) {
            if (artists.length > 1) {
                let query = (idFilter + yearFilter).trim();
                return this.songs_by_search(query);
            } else {
                let query = (idFilter + yearFilter + artistFilter).trim();
                return this.songs_by_search(query);
            }
        } else if (hints && hints.sort && hints.sort[0] === "release_date" && artists.length > 0) {
            return this.songs_by_artist(artists, hints.sort[1]);
        } else if (artists.length > 1) {
            return this.songs_by_artist(artists);
        } else {
            const query = (yearFilter + artistFilter).trim() || `year:${new Date().getFullYear()} `;
            return this.songs_by_search(query);
        }
    }

    async get_artist(params, hints, env) {
        var idFilter = '';
        var genreFilter = '';
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) idFilter = `artist:${value.display} `;
                    else idFilter = `artist:${value} `;
                } else if (pname === "genres" && (op === "contains" || op === "contains~")) {
                    genreFilter = `genre:"${value}" `;
                }
            }
        }
        //default query will be to just get the most popular artists right now
        const query = (idFilter + genreFilter).trim() || `year:${new Date().getFullYear()}`;
        const searchResults = await this.search(query, "artist", 20);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'artists') || searchResults.artists.total === 0) throw new Error(`Query ${query} failed`);
        var artists = [];
        for (const artist of searchResults.artists.items) {
            const id = new Tp.Value.Entity(artist.uri, artist.name);
            const artistObj = {
                id,
                genres: artist.genres,
                popularity: artist.popularity
            };
            artists.push(artistObj);
        }
        return artists;
    }

    async get_album(params, hints, env) {
        //get_album works essentially the same as get_song.
        var idFilter = '';
        var yearFilter = '';
        var artistFilter = '';
        var artists = [];
        var yearLowerBound = 0;
        var yearUpperBound = new Date().getFullYear();
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) idFilter = `album:"${value.display}" `;
                    else idFilter = `album:"${value}" `;
                }
                if (pname === "artists" && (op === "contains" || op === "contains~")) {
                    if (value instanceof Tp.Value.Entity) artists.push(value.display.toLowerCase());
                    else artists.push(value.toLowerCase());
                    artistFilter = `artist: ${artists[0]} `;
                } else if (pname === "release_date" && (op === "==")) {
                    yearFilter = `year:${value.getFullYear()} `;
                } else if (pname === "release_date" && (op === ">=")) {
                    yearFilter = `year:${value.getFullYear()}-${yearUpperBound} `;
                    yearLowerBound = value.getFullYear();
                } else if (pname === "release_date" && (op === "<=")) {
                    yearFilter = `year:${yearLowerBound}-${value.getFullYear()} `;
                    yearUpperBound = value.getFullYear();
                }
            }
        }
        if (idFilter) {
            if (artists.length > 1) {
                let query = (idFilter + yearFilter).trim();
                return this.albums_by_search(query);
            } else {
                let query = (idFilter + yearFilter + artistFilter).trim();
                return this.albums_by_search(query);
            }
        } else if (hints && hints.sort && hints.sort[0] === "release_date" && artists.length > 0) {
            return this.albums_by_artist(artists, hints.sort[1]);
        } else if (artists.length > 0) {
            return this.albums_by_artist(artists);
        } else {
            const query = yearFilter || `year:${new Date().getFullYear()} `;
            return this.albums_by_search(query);
        }
    }

    do_play_songs({ toPlay }) {
        const uris = toPlay.map((song) => song.value);
        console.log('uris are ' + JSON.stringify(uris));
        return this.player_play_helper(JSON.stringify({ uris }));
    }

    do_play_artist({ toPlay }) {
        const uri = toPlay.value;
        let data = {
            context_uri: uri,
        };
        console.log("data is " + JSON.stringify(data));
        return this.player_play_helper(JSON.stringify(data));
    }

    do_play_album({ toPlay }) {
        const uri = toPlay.value;
        let data = {
            context_uri: uri,
        };
        console.log("data is " + JSON.stringify(data));
        return this.player_play_helper(JSON.stringify(data));
    }

    async player_play_helper(data = '', options = {
        useOAuth2: this,
        dataContentType: 'application/json',
        accept: 'application/json'
    }) {
        let devices = await this.get_get_available_devices();
        let canPlay = await this.set_active_device(devices);
        console.log("CAN PLAY: " + canPlay);
        if (typeof canPlay === 'boolean' && canPlay) return this.http_put(PLAY_URL, data, options);
        else return this.http_put(PLAY_URL + `?device_id=${canPlay}`, data, options);
    }
};