import { Value } from "thingpedia";
import {
    AlbumObject,
    AlbumRestrictionObject,
    CopyrightObject,
    PagingObject,
    ExternalIdObject,
    ExternalUrlObject,
    ImageObject,
    SimplifiedArtistObject,
    SimplifiedTrackObject,
} from "../api/objects";
import { ThingAlbum } from "../things";
import CacheEntity, { DisplayFormatter } from "./cache_entity";
import { cacheRegister } from "../cache/cache_helpers";

class CacheAlbum extends CacheEntity implements AlbumObject {
    // Properties
    // =======================================================================

    // AlbumObject Properties
    // -----------------------------------------------------------------------
    type: "album";
    album_type: string;
    artists: SimplifiedArtistObject[];
    available_markets: string[];
    external_urls: ExternalUrlObject;
    href: string;
    images: ImageObject[];
    release_date: string;
    release_date_precision: string;
    restrictions?: AlbumRestrictionObject;
    total_tracks: number; // int
    copyrights: CopyrightObject[];
    external_ids: ExternalIdObject;
    // Seems to always be empty..?
    genres: string[];
    label: string;
    popularity: number; // int[0, 100]
    tracks: PagingObject<SimplifiedTrackObject>;

    // Construction
    // =======================================================================

    constructor(album: AlbumObject) {
        super(album.type, album.id, album.name, album.uri);
        this.type = album.type;
        this.album_type = album.album_type;
        this.artists = album.artists;
        this.available_markets = album.available_markets;
        this.external_urls = album.external_urls;
        this.href = album.href;
        this.images = album.images;
        this.release_date = album.release_date;
        this.release_date_precision = album.release_date_precision;
        this.restrictions = album.restrictions;
        this.total_tracks = album.total_tracks; // int
        this.copyrights = album.copyrights;
        this.external_ids = album.external_ids;
        // Seems to always be empty..?
        this.genres = album.genres;
        this.label = album.label;
        this.popularity = album.popularity; // int[0, 100]
        this.tracks = album.tracks;
    }

    get artistEntities(): Value.Entity[] {
        return this.artists.map(
            (artist) => new Value.Entity(artist.uri, artist.name)
        );
    }

    get releaseDate(): Date {
        return new Date(this.release_date);
    }

    toThing(formatter: DisplayFormatter): ThingAlbum {
        return {
            id: this.entity(formatter),
            artists: this.artistEntities,
            release_date: this.releaseDate,
            popularity: this.popularity,
            genres: this.genres,
        };
    }
}

cacheRegister(CacheAlbum);
export default CacheAlbum;
