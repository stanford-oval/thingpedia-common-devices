import { Value } from "thingpedia";
import { DisplayFormatter } from "./cache/cache_entity";

export default class SpotifyEntity extends Value.Entity {
    constructor(
        id: string,
        display: undefined | null | string,
        formatter: DisplayFormatter,
        forceSoftmatch: boolean = false
    ) {
        super(id, typeof display === "string" ? formatter(display) : display);
        if (forceSoftmatch) {
            this.softmatch = (against: string): boolean => {
                console.log(`\n\nSOFT MATCH ${this.value}\n\n`);
                return true;
            };
        }
    }
}
