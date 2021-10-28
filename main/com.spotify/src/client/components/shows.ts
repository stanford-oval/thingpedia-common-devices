import { Logger } from "@stanford-oval/logging";

import { MarketPageOptions } from "../../api/requests";
import CacheEpisode from "../../cache/cache_episode";
import { assertBounds, isUnfinished } from "../../helpers";
import { Component } from "..";
import Logging from "../../logging";

const LOG = Logging.get(__filename);

export class Shows extends Component {
    private static readonly log: Logger.TLogger = LOG.childFor(Shows);

    getEpisodes(
        showId: string,
        options: MarketPageOptions = {}
    ): Promise<CacheEpisode[]> {
        return this._api.shows
            .getEpisodes(showId, options)
            .then((page) => this.augment.episodes(page.items));
    }

    async getUnfinishedEpisodes(
        showId: string,
        limit: number,
        pageSize: number = 50
    ): Promise<CacheEpisode[]> {
        assertBounds("limit", limit, 1, 10);
        const log = Shows.log.childFor(this.getUnfinishedEpisodes, {
            showId,
            limit,
            pageSize,
        });
        // TODO This can be MUCH better...
        const page = await this._api.shows.getEpisodes(showId, {
            limit: pageSize,
        });
        const unfinished = page.items.filter(isUnfinished);

        if (unfinished.length === limit) {
            log.debug(`Found EXACT limit of unfinished shows`, {
                returning: limit,
                total: page.total,
            });
            return this.augment.episodes(unfinished);
        }

        if (unfinished.length > limit) {
            log.debug(`Found MORE than limit of unfinished shows`, {
                returning: limit,
                total: page.total,
            });
            return this.augment.episodes(unfinished.slice(0, limit));
        }

        // We didn't find enough to hit the limit...

        // Maybe there weren't any more...?
        if (page.total <= pageSize) {
            // No more! Listened to them all!
            log.debug(`Didn't hit limit, but no more to check`, {
                returning: unfinished.length,
                total: page.total,
            });
        } else {
            // There might be more :/
            log.warn(`Didn't hit limit, could scan more`, {
                returning: unfinished.length,
                total: page.total,
            });
        }

        return this.augment.episodes(unfinished);
    }
}
