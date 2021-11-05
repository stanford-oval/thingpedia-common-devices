import ElasticLunr from "elasticlunr";

interface Index {
    id: string;
    name: string;
}

interface Calc<T> {
    item: T;
    rank: number;
    score: number;
    result: number;
}

interface Filterable {
    id: string;
    name: string;
    popularity: number;
}

export default class SearchFilter {
    constructor(
        public popularityScalar: number = 0.5,
        public scoreScalar: number = 0.3,
        public rankScalar: number = 0.2,
        public minPopularity: number = 10,
    ) {}

    public filter<T extends Filterable>(items: T[], query: string): T[] {
        if (items.length === 0) {
            return [];
        }
        
        const el = ElasticLunr<Index>(function () {
            this.setRef("id");
            this.addField("name");
        });
        
        const calcMap: Record<string, Calc<T>> = {};
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.popularity >= this.minPopularity) {
                el.addDoc({id: item.id, name: item.name});
                calcMap[item.id] = {
                    item,
                    rank: i + 1,
                    score: 0,
                    result: 0,
                };
            }
        }
        
        // TODO We should not let this happen...
        if (Object.keys(calcMap).length == 0) {
            return [];
        }
        
        const matches = el.search(query, {fields: {name: {boost: 1}}});
        
        for (const match of matches) {
            calcMap[match.ref].score = match.score;
        }
        
        const calcs = Object.values(calcMap);
        
        for (const calc of calcs) {
            calc.result = (
                (this.popularityScalar * 0.01 * calc.item.popularity) +
                (this.scoreScalar * calc.score) -
                (this.rankScalar * calc.rank)
            );
        }
        
        calcs.sort((a, b) => {
            if (a.result === b.result) {
                return 0;
              } else if (a.result > b.result) {
                return -1;
              } else {
                return 1;
              }
        });
        
        const id = calcs[0].item.id;
        
        return [calcMap[id].item];
    }
}
