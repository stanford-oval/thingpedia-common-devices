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
const assert = require('assert');
const spotifyd = require("./spotifyd");

const PLAY_URL = "https://api.spotify.com/v1/me/player/play";
const SEARCH_URL = "https://api.spotify.com/v1/search?";
const AVAILABLE_DEVICES_URL = "https://api.spotify.com/v1/me/player/devices";
const CURRENTLY_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const ARTIST_ALBUM_URL = "https://api.spotify.com/v1/artists/{id}/albums?";
const AUDIO_FEATURES_URL = 'https://api.spotify.com/v1/audio-features/?';
const ALBUM_URL = 'https://api.spotify.com/v1/albums?';
const TRACK_URL = 'https://api.spotify.com/v1/tracks?';
const ARTIST_URL = 'https://api.spotify.com/v1/artists?';
const SHOW_URL = 'https://api.spotify.com/v1/shows?';
const SHOW_EPISODES_URL = 'https://api.spotify.com/v1/shows/{id}/episodes';
const PLAYLIST_ITEMS_URL = 'https://api.spotify.com/v1/playlists/{id}/tracks';
const SHUFFLE_URL = 'https://api.spotify.com/v1/me/player/shuffle?';
const PAUSE_URL = 'https://api.spotify.com/v1/me/player/pause?';
const NEXT_URL = 'https://api.spotify.com/v1/me/player/next?';
const PREVIOUS_URL = 'https://api.spotify.com/v1/me/player/previous?';
const REPEAT_URL = 'https://api.spotify.com/v1/me/player/repeat?';
const PLAYER_INFO_URL = "https://api.spotify.com/v1/me/player";

module.exports = class SpotifyDevice extends Tp.BaseDevice {

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.spotify-" + this.state.id;
        this._state = new Map();
        this._queryResults = new Map();
        this._deviceState = new Map();
        this._tokenizer = engine.langPack.getTokenizer();

        this._launchedSpotify = false;
        if (this.platform.type === "server") {
            this.spotifyd = new spotifyd({
                cacheDir: this.platform._cacheDir,
                username: this.state.id,
                device_name: this.state.id,
                token: this.accessToken
            });
        }
    }

    async updateOAuth2Token(accessToken, refreshToken, extraData) {
        if (this.platform.type === "server" && this.accessToken !== accessToken) {
            this.spotifyd.token = accessToken;
            this.spotifyd.reload();
        }
        super.updateOAuth2Token(accessToken, refreshToken, extraData);
    }

    async start() {
        // make a harmless GET request to start so we'll refresh the access token
        await this.http_get('https://api.spotify.com/v1/me');
    }

    http_get(url) {
        return Tp.Helpers.Http.get(url, {
            accept: "application/json",
            useOAuth2: this,
        }).catch((e) => {
            if (e.code !== 503 && e.code !== 429) {
                if (!e.detail)
                    throw e;
                throw new Error(JSON.parse(e.detail).error.message);
            }
            //rate handling error
            let temp = this;
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tp.Helpers.Http.get(url, {
                        accept: "application/json",
                        useOAuth2: temp,
                    }).then((response) => {
                        resolve(response);
                    }).catch((e) => {
                        reject(e);
                    });
                }, 2000);
            }).catch((e) => {
                throwError("rate_limit_error");
            });
        });
    }

    http_put(url, data, options) {
        return Tp.Helpers.Http.request(url, "PUT", data, options).catch((e) => {
            if (!e.detail)
                throw e;
            throw new Error(JSON.parse(e.detail).error.message);
        });
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
        console.log(data);
        return Tp.Helpers.Http.post(url, data, {
            useOAuth2: this,
            dataContentType: 'application/json',
            accept: 'application/json'
        }).catch((e) => {
            if (!e.detail)
                throw e;
            throw new Error(JSON.parse(e.detail).error.message);
        });
    }

    get_get_available_devices() {
        return this.http_get(AVAILABLE_DEVICES_URL).then((response) => {
            return JSON.parse(response).devices;
        });
    }

    get_get_play_info() {
        return this.http_get(PLAYER_INFO_URL).then((response) => {
            if (response)
                return JSON.parse(response);
            else
                return undefined;

        });
    }

    search(query, types, limit) {
        const searchURL = SEARCH_URL + querystring.stringify({
            q: query.toString(),
            type: types,
            market: "from_token",
            limit
        });
        console.log("searching for  " + searchURL);
        return this.http_get(searchURL).then((response) => {
            const parsed = JSON.parse(response);
            return parsed;
        });
    }

    albums_get_by_artist_id(artistID, groups) {
        const url = ARTIST_ALBUM_URL.replace("{id}", artistID) + querystring.stringify({
            include_groups: groups,
            market: "from_token",
            limit: 50
        });
        return this.http_get(url).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.items;
        });
    }

    audio_features_get_by_id(ids) {
        const url = AUDIO_FEATURES_URL + querystring.stringify({
            ids: ids.join()
        });
        return this.http_get(url).then((response) => {
            return JSON.parse(response).audio_features;
        });
    }

    artists_get_by_id(ids) {
        const url = ARTIST_URL + querystring.stringify({
            ids: ids.join()
        });
        return this.http_get(url).then((response) => {
            return JSON.parse(response);
        });
    }

    tracks_get_by_id(ids) {
        const url = TRACK_URL + querystring.stringify({
            ids: ids.join()
        });
        return this.http_get(url).then((response) => {
            return JSON.parse(response);
        });
    }

    albums_get_by_id(ids) {
        const url = ALBUM_URL + querystring.stringify({
            ids: ids.join()
        });
        return this.http_get(url).then((response) => {
            return JSON.parse(response);
        });
    }

    shows_get_by_id(ids) {
        const url = SHOW_URL + querystring.stringify({
            ids: ids.join()
        });
        return this.http_get(url).then((response) => {
            return JSON.parse(response);
        });
    }

    async parse_tracks(tracks, appID) {
        //const ids = tracks.map((track) => new Tp.Value.Entity(track.id, track.name));
        const ids = tracks.map((track) => track.id);
        const artistIds = tracks.map((track) => track.artists[0].id);
        const artistsInfo = (await this.artists_get_by_id(artistIds)).artists;
        const genres = artistsInfo.map((artist) => artist.genres);
        const audioFeatures = await this.audio_features_get_by_id(ids);
        var songs = [];
        for (let i = 0; i < tracks.length; i++) {
            const release_date = new Date(tracks[i].album.release_date);
            const artists = tracks[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
            const album = new Tp.Value.Entity(tracks[i].album.uri, tracks[i].album.name);
            const id = new Tp.Value.Entity(tracks[i].uri, this.formatTitle(tracks[i].name));
            //You can't get the audio features for some songs, so we're setting 0.5 as a default value
            var energy = 0.5;
            var danceability = 0.5;
            if (audioFeatures[i]) {
                energy = audioFeatures[i].energy;
                danceability = audioFeatures[i].danceability;
            }
            const songObj = {
                id,
                artists,
                album,
                genres: genres[i],
                release_date,
                popularity: tracks[i].popularity,
                energy: energy * 100,
                danceability: danceability * 100,
            };
            if (appID) {
                let results = this._queryResults.get(appID);
                if (!results) {
                    this._queryResults.set(appID, {
                        [String(id)]: songObj
                    });
                } else {
                    results[String(id)] = songObj;
                }
            }

            songs.push(songObj);
        }
        return songs;
    }

    //convert all instances of numbers to digits
    formatTitle(title) {
        function hasNumbers(str) {
            var regex = /\d/g;
            return regex.test(str);
        }

        let result = "";
        const words = title.split(" ");
        for (const word of words) {
            const parsed = this._tokenizer._parseWordNumber(word);
            if (hasNumbers(word))
                result += word + " ";
            else if (isNaN(parsed))
                result += word + " ";
            else if (parsed === 0 && (word !== "zero" || word !== "zeroth" || word !== "zeroeth"))
                result += word + " ";
            else
                result += parsed + " ";
        }
        return result.trim();
    }

    //songs + albums + podcasts ...
    async music_by_search(query, limit = 5) {
        const searchResults = await this.search(query, "track,album,playlist,show", limit);
        if ((!Object.prototype.hasOwnProperty.call(searchResults, "tracks") &&
                !Object.prototype.hasOwnProperty.call(searchResults, "albums") &&
                !Object.prototype.hasOwnProperty.call(searchResults, "playlists") &&
                !Object.prototype.hasOwnProperty.call(searchResults, "shows")) ||
            (searchResults.tracks.total === 0 &&
                searchResults.albums.total === 0 &&
                searchResults.playlists.total === 0 &&
                searchResults.shows.total === 0))
            return [];

        const tracks = searchResults.tracks.items;
        const albums = searchResults.albums.items;
        const playlists = searchResults.playlists.items;
        const shows = searchResults.shows.items;

        var music = [];

        if (tracks.length >= 1) {
            const trackArtistIds = tracks.map((track) => track.artists[0].id);
            const trackAritstInfo = (await this.artists_get_by_id(trackArtistIds)).artists;
            const trackGenres = trackAritstInfo.map((artist) => artist.genres);

            for (let i = 0; i < tracks.length; i++) {
                const release_date = new Date(tracks[i].album.release_date);
                const artists = tracks[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
                const id = new Tp.Value.Entity(tracks[i].uri, this.formatTitle(tracks[i].name));
                const songObj = {
                    id,
                    artists,
                    release_date,
                    popularity: tracks[i].popularity,
                    genres: trackGenres[i],
                };

                music.push(songObj);
            }
        }
        if (albums.length >= 1) {
            const albumArtistIds = albums.map((album) => album.artists[0].id);
            const albumArtistInfo = (await this.artists_get_by_id(albumArtistIds)).artists;
            const albumGenres = albumArtistInfo.map((artist) => artist.genres);
            const albumIds = albums.map((album) => album.id);
            const albumPopularities = (await this.albums_get_by_id(albumIds)).albums.map((album) => album.popularity);
            for (let i = 0; i < albums.length; i++) {
                const release_date = new Date(albums[i].release_date);
                const artists = albums[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
                const id = new Tp.Value.Entity(albums[i].uri, this.formatTitle(albums[i].name));
                const popularity = albumPopularities[i];
                const albumObj = {
                    id,
                    artists,
                    release_date,
                    popularity,
                    genres: albumGenres[i]
                };

                music.push(albumObj);
            }
        }

        if (tracks.length === 0 && albums.length === 0) {
            for (const playlist of playlists) {
                music.push({
                    id: new Tp.Value.Entity(playlist.uri, playlist.name)
                });
            }

            for (const show of shows) {
                music.push({
                    id: new Tp.Value.Entity(show.uri, show.name)
                });
            }
        }

        return music;
    }

    async songs_by_search(query, limit = 5, appID = '') {
        const searchResults = await this.search(query, "track", limit);
        if (!Object.prototype.hasOwnProperty.call(searchResults, "tracks") || searchResults.tracks.total === 0) return [];
        return this.parse_tracks(searchResults.tracks.items, appID);
    }

    async songs_by_artist(artists, sortDirection) {
        let artistID;
        if (artists[0] instanceof Tp.Value.Entity) {
            artistID = String(artists[0]);
            artistID = artistID.split("spotify:artist:")[1];
        } else {
            const searchResults = await this.search(artists[0], "artist", 1);
            if (!Object.prototype.hasOwnProperty.call(searchResults, 'artists') || searchResults.artists.total === 0) return [];
            artistID = searchResults.artists.items[0].id;
        }

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
            if (albumIds.length >= 20) break;
        }
        if (albumIds.length === 0) return [];
        const albumItems = (await this.albums_get_by_id(albumIds)).albums;
        const songIds = albumItems.map((album) => album.tracks.items.map((track) => track.id));
        const trackItems = await this.tracks_get_by_id(songIds);
        return this.parse_tracks(trackItems.tracks);
    }

    async songs_by_album(album, query, appID) {
        let albumId;
        if (album instanceof Tp.Value.Entity) {
            albumId = String(album);
            albumId = albumId.split('spotify:album:')[1];
        }

        if (!albumId) {
            const searchResults = await this.search(query, "album", 1);
            if (!Object.prototype.hasOwnProperty.call(searchResults, "albums") || searchResults.albums.total === 0) return [];
            albumId = searchResults.albums.items[0].id;
        }
        const albumItems = (await this.albums_get_by_id([albumId])).albums;
        const songIds = albumItems.map((album) => album.tracks.items.map((track) => track.id));
        const trackItems = await this.tracks_get_by_id(songIds);
        let songs = await this.parse_tracks(trackItems.tracks);
        return songs;
    }

    async albums_by_search(query, artistURI) {
        const searchResults = await this.search(query, "album", 5);
        if (!Object.prototype.hasOwnProperty.call(searchResults, "albums") || searchResults.albums.total === 0) return [];
        const ids = searchResults.albums.items.map((album) => album.id);
        const albumItems = (await this.albums_get_by_id(ids)).albums;
        var albums = [];
        for (let i = 0; i < albumItems.length; i++) {
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
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'artists') || searchResults.artists.total === 0) return [];
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
        if (ids.length === 0) return [];
        //20 is the maximum amount of albums that you can query at once
        if (ids.length > 20) ids.length = 20;
        var albumItems = (await this.albums_get_by_id(ids)).albums;
        var albums = [];
        for (let i = 0; i < albumItems.length; i++) {
            const release_date = new Date(albumItems[i].release_date);
            const artists = albumItems[i].artists.map((artist) => new Tp.Value.Entity(artist.uri, artist.name));
            const id = new Tp.Value.Entity(albumItems[i].uri, this.formatTitle(albumItems[i].name));
            const albumObj = {
                id,
                artists,
                release_date,
                popularity: albumItems[i].popularity,
            };
            albums.push(albumObj);
        }
        return albums;
    }

    async shows_by_search(query, artistURI) {
        const searchResults = await this.search(query, "show", 5);
        if (!Object.prototype.hasOwnProperty.call(searchResults, "shows") || searchResults.albums.total === 0) return [];
        const ids = searchResults.shows.items.map((show) => show.id);
        const showItems = (await this.shows_get_by_id(ids)).shows;
        var shows = [];
        for (var i = 0; i < showItems.length; i++) {
            const release_date = new Date(showItems[i].release_date);
            const artists = showItems[i].artists.map((producer) => new Tp.Value.Entity(producer.uri, producer.name));
            const show = {
                id: new Tp.Value.Entity(showItems[i].uri, showItems[i].name),
                artists,
                release_date,
            };
            shows.push(show);
        }
        return shows;
    }

    async get_playable(params, hints, env) {
        var idFilter = '';
        var yearFilter = '';
        var artistFilter = '';
        var genreFilter = '';
        var yearLowerBound = 0;
        var yearUpperBound = new Date().getFullYear();
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) idFilter = `${value.display.toLowerCase()} `;
                    else idFilter = `${value.toLowerCase()} `;
                } else if (pname === "artists" && (op === "contains" || op === "contains~")) {
                    if (value instanceof Tp.Value.Entity)
                        artistFilter = `artist:${value.display.toLowerCase()} `;
                    else
                        artistFilter = `artist:${value.toLowerCase()} `;
                } else if (pname === "release_date" && (op === "==")) {
                    yearFilter = `year:${value.getFullYear()} `;
                } else if (pname === "release_date" && (op === ">=")) {
                    yearFilter = `year:${value.getFullYear()}-${yearUpperBound} `;
                    yearLowerBound = value.getFullYear();
                } else if (pname === "release_date" && (op === "<=")) {
                    //Thingtalk generates songs from 2010 as release_date >= makeDate(2010,1,1), release_date <= makeDate(2010,1,1) + 1year
                    //This includes one day in 2011. If we include that one day spotify will get all the songs from 2011, so we should subtract 1 day.
                    value.setDate(value.getDate() - 1);
                    yearFilter = `year:${yearLowerBound}-${value.getFullYear()} `;
                    yearUpperBound = value.getFullYear();
                } else if (pname === "genres" && (op === "contains" || op === "contains~")) {
                    genreFilter = `genre:"${value.toLowerCase()}" `;
                }
            }
        }

        if (idFilter.toLowerCase().includes("daily mix"))
            throwError('dailymix_error');

        let query = (idFilter + yearFilter + artistFilter + genreFilter).trim() || `year:${new Date().getFullYear()} `;
        if (idFilter) {
            let music = await this.music_by_search(query, 5);
            if (music.length === 0)
                return music;

            if (String(music[0].id).includes("track") || String(music[0].id).includes("album")) {
                music.sort((a, b) => {
                    return b.popularity - a.popularity;
                });
                music = Array.from(new Set(music.map((playable) => String(playable.id.display))))
                    .map((name) => {
                        return music.find((playable) => playable.id.display === name);
                    });
                const songArtists = music.filter((playable) => String(playable.id).includes("track")).map((song) => String(song.artists[0]));
                music = music.filter((playable) => (String(playable.id).includes("album") && songArtists.includes(String(playable.artists[0]))) === false);

            } else {
                let searchTerm = idFilter.trim();
                music.sort((a, b) => {
                    return entityMatchScore(searchTerm, b.id.display.toLowerCase()) - entityMatchScore(searchTerm, a.id.display.toLowerCase());
                });
            }

            return music;

        } else {
            return filterMusic(await this.songs_by_search(query, 50));
        }
    }

    async get_song(params, hints, env) {
        var idFilter = '';
        var yearFilter = '';
        var artistFilter = '';
        var genreFilter = '';
        var albumFilter = '';
        var album;
        var artists = [];
        var yearLowerBound = 0;
        var yearUpperBound = new Date().getFullYear();
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) idFilter = `track:${value.display.toLowerCase()} `;
                    else idFilter = `track:${value.toLowerCase()} `;
                }
                if (pname === "artists" && (op === "contains" || op === "contains~")) {
                    artists.push(value);
                    if (value instanceof Tp.Value.Entity)
                        artistFilter = `artist:${artists[0].display.toLowerCase()} `;
                    else
                        artistFilter = `artist:${artists[0].toLowerCase()} `;

                } else if (pname === "release_date" && (op === "==")) {
                    yearFilter = `year:${value.getFullYear()} `;
                } else if (pname === "release_date" && (op === ">=")) {
                    yearFilter = `year:${value.getFullYear()}-${yearUpperBound} `;
                    yearLowerBound = value.getFullYear();
                } else if (pname === "release_date" && (op === "<=")) {
                    //Thingtalk generates songs from 2010 as release_date >= makeDate(2010,1,1), release_date <= makeDate(2010,1,1) + 1year
                    //This includes one day in 2011. If we include that one day spotify will get all the songs from 2011, so we should subtract 1 day.
                    value.setDate(value.getDate() - 1);
                    yearFilter = `year:${yearLowerBound}-${value.getFullYear()} `;
                    yearUpperBound = value.getFullYear();
                } else if (pname === "genres" && (op === "contains" || op === "contains~")) {
                    genreFilter = `genre:"${value.toLowerCase()}" `;
                } else if (pname === "album" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) albumFilter = `album:${value.display.toLowerCase()} `;
                    else albumFilter = `album:${value.toLowerCase()} `;
                    album = value;
                }

            }
        }

        let appID;
        if (!hints || !hints.sort)
            appID = env.app.uniqueId;

        //you can't search for multiple artists because when searching by artist spotify only returns songs where the input artist is the main artist
        //so if you search for a song where an artist is featured or there are multiple artists then there will problems.
        if (idFilter) {
            if (artists.length > 1) {
                let query = (idFilter + yearFilter + genreFilter + albumFilter).trim();
                let songs = await this.songs_by_search(query, 5);
                let searchTerm = idFilter.split("track:")[1].trim();
                songs = Array.from(new Set(songs.map((song) => String(song.id.display))))
                    .map((song_name) => {
                        return songs.find((song) => song.id.display === song_name);
                    });
                songs.sort((a, b) => {
                    return entityMatchScore(searchTerm, b.id.display.toLowerCase()) - entityMatchScore(searchTerm, a.id.display.toLowerCase());
                });
                return songs;
            } else {
                let query = (idFilter + yearFilter + artistFilter + genreFilter + albumFilter).trim();
                let songs = await this.songs_by_search(query, 5);
                if (songs.length === 0 && artists.length === 1)
                    songs = await this.songs_by_artist(artists);
                let searchTerm = idFilter.split("track:")[1].trim();
                songs = Array.from(new Set(songs.map((song) => String(song.id.display))))
                    .map((song_name) => {
                        return songs.find((song) => song.id.display === song_name);
                    });
                songs.sort((a, b) => {
                    return entityMatchScore(searchTerm, b.id.display.toLowerCase()) - entityMatchScore(searchTerm, a.id.display.toLowerCase());
                });
                return songs;
            }
        } else if (hints && hints.sort && hints.sort[0] === "release_date" && artists.length > 0) {
            let songs = await this.songs_by_artist(artists, hints.sort[1]);
            return filterMusic(songs);
        } else if (artists.length > 1) {
            let songs = await this.songs_by_artist(artists);
            songs = filterMusic(songs);
            songs.sort((a, b) => {
                return (b.popularity - a.popularity);
            });
            return songs;
        } else if (album) {
            let query = (yearFilter + artistFilter + genreFilter + albumFilter).trim();
            return this.songs_by_album(album, query, appID);
        } else {
            let query = (yearFilter + artistFilter + genreFilter).trim() || `year:${new Date().getFullYear()} `;
            let songs;
            if (yearFilter || genreFilter)
                songs = await this.songs_by_search(query, 50);
            else
                songs = await this.songs_by_search(query, 50, appID);
            songs = filterMusic(songs);
            songs.sort((a, b) => {
                return (b.popularity - a.popularity);
            });
            return songs;
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
        let query = (idFilter + genreFilter).trim() || `year:${new Date().getFullYear()}`;
        const searchResults = await this.search(query, "artist", 5);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'artists') || searchResults.artists.total === 0) return [];
        var artists = [];
        for (const artist of searchResults.artists.items) {
            const id = new Tp.Value.Entity(artist.uri, this.formatTitle(artist.name));
            const artistObj = {
                id,
                genres: artist.genres,
                popularity: artist.popularity
            };
            artists.push(artistObj);
        }

        artists.sort((a, b) => {
            return b.popularity - a.popularity;
        });
        const popularity_treshold = artists[0].popularity * 0.2;
        artists = artists.filter((artist) => artist.popularity >= popularity_treshold);

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
                    if (value instanceof Tp.Value.Entity) idFilter = `album:${value.display} `;
                    else idFilter = `album:${value} `;
                }
                if (pname === "artists" && (op === "contains" || op === "contains~")) {
                    if (value instanceof Tp.Value.Entity) artists.push(value.display.toLowerCase());
                    else artists.push(value.toLowerCase());
                    artistFilter = `artist:${artists[0]} `;
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
                let albums = this.albums_by_search(query);
                let searchTerm = idFilter.split("album:")[1].trim();
                albums = Array.from(new Set(albums.map((album) => String(album.id.display))))
                    .map((album_name) => {
                        return albums.find((album) => album.id.display === album_name);
                    });
                albums.sort((a, b) => {
                    return entityMatchScore(searchTerm, b.id.display.toLowerCase()) - entityMatchScore(searchTerm, a.id.display.toLowerCase());
                });
                return albums;
            } else {
                let query = (idFilter + yearFilter + artistFilter).trim();
                let albums = await this.albums_by_search(query);
                if (albums.length === 0 && artists.length === 1)
                    albums = await this.albums_by_artist(artists);
                let searchTerm = idFilter.split("album:")[1].trim();
                albums = Array.from(new Set(albums.map((album) => String(album.id.display))))
                    .map((album_name) => {
                        return albums.find((album) => album.id.display === album_name);
                    });
                albums.sort((a, b) => {
                    return entityMatchScore(searchTerm, b.id.display.toLowerCase()) - entityMatchScore(searchTerm, a.id.display.toLowerCase());
                });
                return albums;
            }
        } else if (hints && hints.sort && hints.sort[0] === "release_date" && artists.length > 0) {
            return filterMusic(await this.albums_by_artist(artists, hints.sort[1]));
        } else if (artists.length > 0) {
            return filterMusic(await this.albums_by_artist(artists));
        } else {
            const query = yearFilter || `year:${new Date().getFullYear()} `;
            let albums = await this.albums_by_search(query);
            albums = filterMusic(albums);
            albums.sort((a, b) => {
                return (b.popularity - a.popularity);
            });
            return albums;
        }
    }

    async get_show(params, hints, env) {
        //get_show works essentially the same as get_artists.
        var idFilter = '';
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) idFilter = value.display;
                    else idFilter = value;
                }
            }
        }
        //default query will be to just get the most popular shows right now
        let query = (idFilter).trim() || `year:${new Date().getFullYear()}`;
        console.log(query);
        const searchResults = await this.search(query, "show", 5);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'shows') || searchResults.shows.total === 0) return [];
        var shows = [];
        for (const show of searchResults.shows.items) {
            const id = new Tp.Value.Entity(show.uri, this.formatTitle(show.name));
            const showObj = {
                id,
                publisher: show.publisher
            };
            shows.push(showObj);
        }
        return shows;
    }

    async get_playlist(params, hints, env) {
        var id = '';
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "id" && (op === "==" || op === "=~")) {
                    if (value instanceof Tp.Value.Entity) id = value.display;
                    else id = value;
                }
            }
        }

        if (id.toLowerCase().includes("daily mix"))
            throwError('dailymix_error');

        let query = id || `${new Date().getFullYear()}`;
        const searchResults = await this.search(query, "playlist", 5);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'playlists') || searchResults.playlists.total === 0) return [];
        var playlists = [];
        for (const playlist of searchResults.playlists.items) {
            playlists.push({
                id: new Tp.Value.Entity(playlist.uri, playlist.name)
            });
        }
        return playlists;
    }

    get_get_user_top_tracks() {
        return this.http_get(`https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term`).then((response) => {
            let parsed = JSON.parse(response);
            return parsed.items.map((track) => {
                return {
                    song: new Tp.Value.Entity(track.uri, track.name)
                };
            });
        });
    }

    async get_get_currently_playing() {
        const response = await this.http_get(CURRENTLY_PLAYING_URL);
        if (!response)
            throwError('no_song_playing');
        const parsed = JSON.parse(response);
        if (parsed.is_playing === false || !parsed.item || !parsed.item.uri)
            throwError('no_song_playing');

        const id = parsed.item.uri.substring('spotify:track:'.length);
        const trackItems = await this.tracks_get_by_id([id]);
        return this.parse_tracks(trackItems.tracks);
    }

    _testMode() {
        return process.env.TEST_MODE === '1';
    }

    async _findActiveDevice(devices) {
        if (devices.length === 0) {
            console.log("no available devices");

            // try launching the spotify app
            const appLauncher = this.platform.getCapability('app-launcher');
            if (appLauncher && !this._launchedSpotify) {
                this._launchedSpotify = true;
                console.log("spawning spotify app");
                await appLauncher.launchApp('com.spotify.Client.desktop');
                // wait 20 seconds for the app to launch
                await new Promise((resolve) => setTimeout(resolve, 20000));
                devices = await this.get_get_available_devices();
            }
            if (this.spotifyd) {
                // wait 3 seconds for spotifyd to eventually reload
                await new Promise((resolve) => setTimeout(resolve, 3000));
                devices = await this.get_get_available_devices();
            }
            if (devices.length === 0)
                return [null, null];
        }
        // spotifyd active
        if (this.spotifyd) {
            console.log('trying to run spotifyd');
            for (let i = 0; i < devices.length; i++) {
                console.log(devices[i].is_active);
                if (devices[i].id === this.spotifyd.deviceId) {
                    console.log("found spotifyd device");
                    return [devices[i].id, this.state.id];
                }
            }
        }
        // device already active
        for (let i = 0; i < devices.length; i++) {
            console.log(devices[i].is_active);
            if (devices[i].is_active) {
                console.log("found an active device");
                return [devices[i].id, devices[i].name];
            }
        }
        console.log("setting active device");
        return [devices[0].id, devices[0].name];
    }

    async player_play_helper(data = '', options = {
        useOAuth2: this,
        dataContentType: 'application/json',
        accept: 'application/json'
    }) {
        let devices = await this.get_get_available_devices();
        if (this._testMode()) {
            return {
                device: new Tp.Value.Entity('mock', 'Coolest Computer')
            };
        }
        const [deviceId, deviceName] = await this._findActiveDevice(devices);
        if (deviceId === null)
            throwError('no_active_device');

        if (this.spotifyd && this.engine.audio) {
            await this.engine.audio.requestAudio(this, async () => {
                console.log("stopping audio");
                let pauseURL = PAUSE_URL + querystring.stringify({
                    device_id: deviceId
                });
                await this.http_put_default_options(pauseURL, '');
            });
        }

        try {
            await this.http_put(PLAY_URL + `?device_id=${deviceId}`, data, options);
        } catch (error) {
            const player_info = await this.get_get_play_info();
            if (player_info) {
                //regular spotify players will throw an error when songs are already playing
                throwError('disallowed_action');
            } else {
                //web players will throw an error when songs are not playing
                throwError('player_error');
            }

        }

        return {
            device: new Tp.Value.Entity(deviceId, deviceName)
        };
    }

    async do_play({
        playable
    }, env) {
        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        let deviceState = this._deviceState.get(env.app.uniqueId);
        let device;

        if (this._testMode())
            device = new Tp.Value.Entity('mock', 'Coolest Computer');

        if (!deviceState && !device) {
            let devices = await this.get_get_available_devices();
            const [deviceId, deviceName] = await this._findActiveDevice(devices);
            if (deviceId === null)
                throwError('no_active_device');

            this._deviceState.set(env.app.uniqueId, [deviceId, deviceName]);
            device = new Tp.Value.Entity(deviceId, deviceName);
        } else if (deviceState && !device) {
            device = new Tp.Value.Entity(deviceState[0], deviceState[1]);
        }

        let progstate = this._state.get(env.app.uniqueId);
        if (!progstate) {
            env.addExitProcedureHook(async () => {
                await this._flushPlay(env);
            });
            this._state.set(env.app.uniqueId, [playable]);
        } else {
            progstate.push(playable);
        }

        return device;
    }

    async do_add_song_to_playlist({
        song,
        playlist
    }) {
        if (this._testMode())
            return;
        let playListURI = await this.findPlaylist(playlist);
        playListURI = playListURI.substring(playListURI.indexOf("playlist:") + 9);
        let data = {
            "uris": [String(song)]
        };
        await this.add_uris_to_playlist(playListURI, data);
    }

    async findPlaylist(name) {
        const searchResults = await this.search(name, "playlist", 1);
        if (!Object.prototype.hasOwnProperty.call(searchResults, 'playlists') || searchResults.playlists.total === 0) throwError('no_playlist');
        const playlist = searchResults.playlists.items[0];
        if (playlist.owner.id === this.state.id)
            return playlist.uri;
        else
            throwError('disallowed_action');
        return [];
    }

    async add_uris_to_playlist(playlistURL, uris) {
        const url = `https://api.spotify.com/v1/users/${this.state.id}/playlists/${playlistURL}/tracks`;
        try {
            await this.http_post_default_options(url.toString(), JSON.stringify(uris));
        } catch (error) {
            throwError('disallowed_action');
        }
    }

    async do_create_playlist({
        name
    }) {
        if (this._testMode())
            return;
        const url = `https://api.spotify.com/v1/users/${this.state.id}/playlists`;
        let data = {
            name,
        };
        try {
            await this.http_post_default_options(url.toString(), JSON.stringify(data));
        } catch (error) {
            throwError('disallowed_action');
        }
    }

    async playlist_get_tracks_by_id(playlistId) {
        const data = JSON.stringify(await this.http_get(PLAYLIST_ITEMS_URL.replace('{id}', playlistId)));
        return data.items.map((item) => {
            return item.episode ? item.episode.uri : item.track.uri;
        });
    }

    async shows_get_unplayed_episodes(showId) {
        const data = JSON.stringify(await this.http_get(SHOW_EPISODES_URL.replace('{id}', showId)));
        return data.items.filter((item) => {
            if (item.resume_point && item.resume_point.fully_played)
                return false;

            return true;
        }).map((item) => item.uri);
    }

    async _flushPlay(env) {
        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        const music = this._state.get(env.app.uniqueId);

        // if we have exactly one thing to play, we use context_uri for album/playlist/song
        if (music.length === 1) {
            const uri = String(music[0]);
            let data;
            if (uri.includes("episode") || uri.includes("song"))
                data = { uris: [uri] };
            else
                data = { context_uri: uri };
            return this.player_play_helper(JSON.stringify(data));
        }

        const albumUris = [];
        const playlistUris = [];
        const showUris = [];
        const albumTracks = {};

        for (const playable of music) {
            const uri = String(playable);
            if (uri.includes("album"))
                albumUris.push(uri);
            else if (uri.includes("show"))
                showUris.push(uri);
            else if (uri.includes("playlist"))
                playlistUris.push(uri);
        }
        if (albumUris.length > 0) {
            const albumIds = albumUris.map((uri) => uri.split("spotify:album:")[1]);
            const albumTracks = (await this.albums_get_by_id(albumIds)).albums;
            for (const album of albumTracks) {
                const uris = album.tracks.items.map((track) => track.uri);
                albumTracks[album.uri] = uris;
            }
        }

        let songUris = [];
        for (const playable of music) {
            const uri = String(playable);
            if (uri.includes("track") || uri.includes("episode"))
                songUris.push(uri);
            else if (uri.includes("album"))
                songUris = songUris.concat(albumTracks[uri]);
            else if (uri.includes("show"))
                songUris = songUris.concat(await this.shows_get_unplayed_episodes(uri));
            else if (uri.includes("playlist"))
                songUris = songUris.concat(await this.playlist_get_tracks_by_id(uri));
        }

        return this.player_play_helper(JSON.stringify({
            'uris': songUris
        }));
    }

    async do_player_pause() {
        if (this._testMode())
            return;

        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        let devices = await this.get_get_available_devices();
        const deviceId = (await this._findActiveDevice(devices))[0];
        if (deviceId === null)
            throwError('no_active_device');
        let pauseURL = PAUSE_URL + querystring.stringify({
            device_id: deviceId
        });
        try {
            await this.http_put_default_options(pauseURL, '');
        } catch (error) {
            throwError('disallowed_action');
        }
    }

    async do_player_play() {
        console.log("Playing music...");
        if (this._testMode())
            return;

        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        await this.player_play_helper();
    }

    async do_player_next() {
        if (this._testMode())
            return;

        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        let devices = await this.get_get_available_devices();
        const deviceId = (await this._findActiveDevice(devices))[0];
        if (deviceId === null)
            throwError('no_active_device');
        let nextURL = NEXT_URL + querystring.stringify({
            device_id: deviceId
        });
        try {
            await this.http_post_default_options(nextURL, '');
        } catch (error) {
            throwError('disallowed_action');
        }
    }

    async do_player_previous() {
        if (this._testMode())
            return;

        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        let devices = await this.get_get_available_devices();
        const deviceId = (await this._findActiveDevice(devices))[0];
        if (deviceId === null)
            throwError('no_active_device');
        let previousURL = PREVIOUS_URL + querystring.stringify({
            device_id: deviceId
        });
        try {
            await this.http_post_default_options(previousURL, '');
        } catch (error) {
            throwError('disallowed_action');
        }
    }

    async do_player_shuffle({
        shuffle
    }) {
        shuffle = shuffle === 'on' ? 'true' : 'false';
        console.log("setting shuffle: " + shuffle);
        if (this._testMode())
            return;

        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        let devices = await this.get_get_available_devices();
        const deviceId = (await this._findActiveDevice(devices))[0];
        if (deviceId === null)
            throwError('no_active_device');
        let shuffleURL = SHUFFLE_URL + querystring.stringify({
            state: shuffle,
            device_id: deviceId
        });
        console.log(shuffleURL);
        try {
            await this.http_put_default_options(shuffleURL, '');
        } catch (error) {
            throwError('disallowed_action');
        }
    }

    async do_player_repeat({
        repeat
    }) {
        console.log("repeat: " + repeat);
        if (this._testMode())
            return;

        if (this.state.product !== "premium" && this.state.product !== undefined)
            throwError("non_premium_account");

        let devices = await this.get_get_available_devices();
        const deviceId = (await this._findActiveDevice(devices))[0];
        if (deviceId === null)
            throwError('no_active_device');
        let repeatURL = REPEAT_URL + querystring.stringify({
            state: repeat,
            device_id: deviceId
        });
        try {
            await this.http_put_default_options(repeatURL, '');
        } catch (error) {
            throwError('disallowed_action');
        }
    }
};

function throwError(code) {
    const error = new Error();
    error.code = code;
    throw error;
}

function entityMatchScore(searchTerm, candidate) {
    if (searchTerm === candidate)
        return 1000;

    candidate = removeParenthesis(candidate);
    searchTerm = removeParenthesis(searchTerm);
    let searchTermTokens = searchTerm.split(' ');

    let score = 0;
    score -= 0.1 * editDistance(searchTerm, candidate);

    let candTokens = candidate.split(' ');
    candTokens = new Set(candTokens);

    for (let candToken of candTokens) {
        let found = false;
        for (let token of searchTermTokens) {
            if (token === candToken || (editDistance(token, candToken) <= 1 && token.length > 1)) {
                score += 10;
                found = true;
            } else if (candToken.startsWith(token)) {
                score += 0.5;
            }
        }

        // give a small boost to ignorable tokens that are missing
        // this offsets the char-level edit distance
        if (!found && ['the', 'hotel', 'house', 'restaurant'].includes(candToken))
            score += 0.1 * candToken.length;
    }

    return score;
}

function removeParenthesis(str) {
    return str.replace(/ \(.*?\)/g, '');
}

function extractSongName(str) {
    str = removeParenthesis(str);
    str = str.split(" - ")[0];
    return str;
}

//removes duplicate remixes/editions
function filterMusic(music) {
    const names = new Set();
    const filteredSongs = Array.from(new Set(music.map((playable) => String(playable.id.display))))
        .filter((name) => {
            if (!names.has(extractSongName(name))) {
                names.add(extractSongName(name));
                return true;
            }
            return false;
        }).map((name) => {
            return music.find((playable) => playable.id.display === name);
        });
    return filteredSongs;
}

function editDistance(one, two) {
    if (typeof one === 'string' && typeof two === 'string') {
        if (one === two)
            return 0;
        if (one.indexOf(two) >= 0)
            return one.length - two.length;
        if (two.indexOf(one) >= 0)
            return two.length - one.length;
    }

    const R = one.length + 1;
    const C = two.length + 1;
    const matrix = new Array(R * C);

    function set(i, j, v) {
        assert(i * C + j < R * C);
        matrix[i * C + j] = v;
    }

    function get(i, j) {
        assert(i * C + j < R * C);
        return matrix[i * C + j];
    }

    for (let j = 0; j < C; j++)
        set(0, j, j);
    for (let i = 1; i < R; i++)
        set(i, 0, i);
    for (let i = 1; i <= one.length; i++) {
        for (let j = 1; j <= two.length; j++) {
            if (one[i - 1] === two[j - 1])
                set(i, j, get(i - 1, j - 1));
            else
                set(i, j, 1 + Math.min(Math.min(get(i - 1, j), get(i, j - 1)), get(i - 1, j - 1)));
        }
    }

    return get(one.length, two.length);
}
