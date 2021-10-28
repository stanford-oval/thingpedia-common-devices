import { Value } from "thingpedia";
import {
    ArtistObject,
    AudioFeaturesObject,
    ExternalIdObject,
    ExternalUrlObject,
    LinkedTrackObject,
    SimplifiedAlbumObject,
    SimplifiedArtistObject,
    TrackObject,
    TrackRestrictionObject,
} from "../api/objects";
import { ThingTrack } from "../things";
import CacheEntity, { DisplayFormatter } from "./cache_entity";
import { cacheRegister } from "./cache_helpers";

export const DEFAULT_AUDIO_FEATURE = 50;

class CacheTrack extends CacheEntity implements TrackObject {
    // Static Methods
    // =======================================================================

    static from(
        track: TrackObject,
        artists: ArtistObject[],
        audioFeatures: undefined | null | AudioFeaturesObject
    ): CacheTrack {
        const genres: Set<string> = new Set();
        for (let artist of artists) {
            for (let genre of artist.genres) {
                genres.add(genre);
            }
        }
        return new CacheTrack({
            genres: Array.from(genres),
            audioFeatures,
            ...track,
        });
    }

    // Properties
    // =======================================================================

    // TrackObject Properties
    // -----------------------------------------------------------------------

    type: "track";
    album: SimplifiedAlbumObject;
    artists: SimplifiedArtistObject[];
    available_markets: string[];
    disc_number: number; // int
    duration_ms: number; // int
    explicit?: boolean; // may be unknown
    external_ids: ExternalIdObject;
    external_urls: ExternalUrlObject;
    href: string;
    is_local: boolean;
    is_playable?: boolean; // relinking (when given market)
    linked_from?: LinkedTrackObject; // relinking (when given market)
    popularity: number; // int[0, 100]
    preview_url: string;
    restrictions?: TrackRestrictionObject;
    track_number: number; // int, inside disc_number

    // Additional Cached Properties
    // -----------------------------------------------------------------------

    /**
     * Genie consumes track genres, but genres are a property of artists, so
     * we cache that union.
     */
    genres: string[];

    /**
     * Genie consumes track audio features, which is an additional API hit, so
     * we cache them along with the props.
     */
    audioFeatures: undefined | null | AudioFeaturesObject;

    // Construction
    // =======================================================================

    constructor(props: {
        type: "track";
        id: string;
        name: string;
        uri: string;
        album: SimplifiedAlbumObject;
        artists: SimplifiedArtistObject[];
        available_markets: string[];
        disc_number: number; // int
        duration_ms: number; // int
        explicit?: boolean; // may be unknown
        external_ids: ExternalIdObject;
        external_urls: ExternalUrlObject;
        href: string;
        is_local: boolean;
        is_playable?: boolean; // relinking (when given market)
        linked_from?: LinkedTrackObject; // relinking (when given market)
        popularity: number; // int[0, 100]
        preview_url: string;
        restrictions?: TrackRestrictionObject;
        track_number: number; // int, inside disc_number
        genres: string[];
        audioFeatures: undefined | null | AudioFeaturesObject;
    }) {
        super(props.type, props.id, props.name, props.uri);
        this.type = props.type;
        this.album = props.album;
        this.artists = props.artists;
        this.available_markets = props.available_markets;
        this.disc_number = props.disc_number;
        this.duration_ms = props.duration_ms;
        this.explicit = props.explicit;
        this.external_ids = props.external_ids;
        this.external_urls = props.external_urls;
        this.href = props.href;
        this.is_local = props.is_local;
        this.is_playable = props.is_playable;
        this.linked_from = props.linked_from;
        this.popularity = props.popularity;
        this.preview_url = props.preview_url;
        this.restrictions = props.restrictions;
        this.track_number = props.track_number;
        this.genres = props.genres;
        this.audioFeatures = props.audioFeatures;
    }

    get energy(): number {
        if (!this.audioFeatures) {
            return DEFAULT_AUDIO_FEATURE;
        }
        return this.audioFeatures.energy * 100;
    }

    get danceability(): number {
        if (!this.audioFeatures) {
            return DEFAULT_AUDIO_FEATURE;
        }
        return this.audioFeatures.danceability * 100;
    }

    get artistEntities(): Value.Entity[] {
        return this.artists.map(
            (artist) => new Value.Entity(artist.uri, artist.name)
        );
    }

    get albumEntity(): Value.Entity {
        return new Value.Entity(this.album.uri, this.album.name);
    }

    get releaseDate(): Date {
        return new Date(this.album.release_date);
    }

    toThing(formatter: DisplayFormatter): ThingTrack {
        return {
            id: this.entity(formatter),
            artists: this.artistEntities,
            album: this.albumEntity,
            genres: this.genres,
            release_date: this.releaseDate,
            popularity: this.popularity,
            energy: this.energy,
            danceability: this.danceability,
        };
    }
}

cacheRegister(CacheTrack);
export default CacheTrack;
