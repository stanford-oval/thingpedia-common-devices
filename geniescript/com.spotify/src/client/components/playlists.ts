import { strict as assert } from "assert";

import ElasticLunr from "elasticlunr";

import {
    PagingObject,
    PlaylistTrackObject,
    SimplifiedPlaylistObject,
} from "../../api/objects";
import { PlaylistAddOptions, PlaylistCreateOptions } from "../../api/requests";
import { PlaylistSnapshotResponse } from "../../api/responses";
import { cache, idKey } from "../../cache/cache_helpers";
import CachePlaylist from "../../cache/cache_playlist";
import { arrayFor } from "../../helpers";
import { Component } from "..";

interface Index {
    id : string;
    name : string;
    description ?: string;
}

export class Playlists extends Component {
    @cache(idKey)
    get(id : string) : Promise<CachePlaylist> {
        return this._api.playlists
            .get(id, { market: "from_token" })
            .then(this.augment.playlist.bind(this.augment));
    }

    @cache(idKey)
    getTracks(id : string) : Promise<PagingObject<PlaylistTrackObject>> {
        return this._api.playlists.getTracks(id, { market: "from_token" });
    }

    @cache(idKey)
    getPlaylistTrackURIs(id : string) : Promise<string[]> {
        return this.getTracks(id).then((page) =>
            page.items.map((t) => t.track.uri)
        );
    }
    
    create(
        user_id : string,
        name : string,
        options : PlaylistCreateOptions = {}
    ) : Promise<CachePlaylist> {
        return this._api.playlists
            .create(user_id, name, options)
            .then((playlist) => this.augment.playlist(playlist));
    }

    add(
        id : string,
        uris : string | string[],
        options : PlaylistAddOptions = {}
    ) : Promise<PlaylistSnapshotResponse> {
        return this._api.playlists.add(id, arrayFor(uris), options);
    }

    // @cache(null)
    async getMy() : Promise<CachePlaylist[]> {
        // Max limit for the request is 50, so use chunks of 50
        const limit = 50;
        // Get the first page so we know how many playlists there are
        const firstPage = await this._api.playlists.getMy({ limit });
        // Make sure we got a total that make sense
        assert(
            typeof firstPage.total === "number"
            && Number.isInteger(firstPage.total)
            && firstPage.total >= 0,
            `My playlist PagingObject.total must be a non-negative integer, ` +
            `found ${typeof firstPage.total}: ${firstPage.total}`
        );
        // Compute how many more pages there are (total pages - 1)
        const additionalPages = Math.ceil(firstPage.total / limit) - 1;
        // If there is not at least one more page then we're done, return.
        if (additionalPages < 1) 
            return this.augment.playlists(firstPage.items);
        
        // Fan out requests for the rest of the pages
        const promises : Array<Promise<PagingObject<SimplifiedPlaylistObject>>> = [];
        for (let i = 1; i <= additionalPages; i++) {
            promises.push(
                this._api.playlists.getMy({ limit, offset: i * limit })
            );
        }
        // Wait for all the requests and concatenate the results
        const pages = await Promise.all(promises);
        const playlists : SimplifiedPlaylistObject[] = [...firstPage.items];
        for (const page of pages) {
            for (const playlist of page.items) 
                playlists.push(playlist);
            
        }
        return this.augment.playlists(playlists);
    }

    async findMyId(query : string) : Promise<string | null> {
        const playlists = await this.getMy();
        const index = ElasticLunr<Index>(function() {
            this.setRef("id");
            this.addField("name");
            this.addField("description");
            this.saveDocument(false);
        });
        for (const playlist of playlists) {
            index.addDoc({
                id: playlist.id,
                name: playlist.name,
                description: playlist.description || undefined,
            });
        }
        const results = index.search(query, {
            fields: {
                name: { boost: 3 },
                description: { boost: 1 },
            },
        });

        if (results.length === 0) 
            return null;
        
        return results[0].ref;
    }
}
