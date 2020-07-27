import json
from fuzzywuzzy import fuzz

entityTypes = ["artist", "album", "year", "genre", "sort", "music_item"]
sortTypes = {
    "popular": {"popularity": "desc"},
    "new": {"release_date": "desc"},
    "top": {"popularity": "desc"},
    "good": {"popularity": "desc"},
    "latest": {"release_date": "desc"},
    "last": {"release_date": "desc"},
    "greatest": {"popularity": "desc"},
    "best": {"popularity": "desc"},
}


def match_ratio(str1, str2):
    return fuzz.ratio(str1.lower(), str2.lower())


def construct_thingtalk(entities, sortObj):
    query_type = ""
    sort_query = ""
    filters = []
    musicItems = {
        "song": "song",
        "track": "song",
        "tune": "song",
        "sound track": "song",
        "album": "album",
    }
    if len(sortObj.keys()) > 0:
        sort_query = (
            "sort " + list(sortObj.keys())[0] + " " + list(sortObj.values())[0] + " of "
        )

    for entity in entities:
        if entity["entity"] == "genre":
            query_type = "artist"
            filters.append("""contains~(genres, "%s") """ % entity["text"].lower())
        elif entity["entity"] == "artist":
            if len(entities) > 1:
                filters.append("""contains~(artists, "%s") """ % entity["text"].lower())
            else:
                query_type = "artist"
                filters.append("""id =~ "%s" """ % entity["text"])
        elif entity["entity"] == "year":
            lower_year = entity["text"]
            upper_year = entity["text"]
            if entity["text"] == "twenties":
                lower_year = "1920"
                upper_year = "1929"
            elif entity["text"] == "thirties":
                lower_year = "1930"
                upper_year = "1939"
            elif entity["text"] == "fourties":
                lower_year = "1940"
                upper_year = "1949"
            elif entity["text"] == "fifties":
                lower_year = "1950"
                upper_year = "1959"
            elif entity["text"] == "sixties":
                lower_year = "1960"
                upper_year = "1969"
            elif entity["text"] == "seventies":
                lower_year = "1970"
                upper_year = "1979"
            elif entity["text"] == "eighties":
                lower_year = "1980"
                upper_year = "1989"
            elif entity["text"] == "nineties":
                lower_year = "1990"
                upper_year = "1999"

            filters.append(
                "release_date >= makeDate(%s, 1, 1) && release_date <= makeDate(%s, 12, 31) "
                % (lower_year, upper_year)
            )
        elif entity["entity"] == "music_item":
            if entity["text"].lower() in musicItems.keys():
                query_type = musicItems[entity["text"].lower()]
            else:
                return None
        elif entity["entity"] == "track":
            query_type = "song"
            filters.append("""id =~ "%s" """ % entity["text"].lower())
        elif entity["entity"] == "album":
            query_type = "album"
            filters.append("""id =~ "%s" """ % entity["text"].lower())
        elif entity["entity"] == "sort":
            continue
        else:
            return None
    query_type = query_type or "song"

    query = "UT: now => %s@com.spotify.%s()" % (sort_query, query_type)
    if len(filters) > 0:
        query += ", %s=> notify;\n" % (("&& ").join(filters))
    else:
        query += " => notify;\n"
    query += "UT: now => @com.spotify.play_%s(%s=$?);" % (query_type, query_type)

    return query


with open("train_PlayMusic_full.json", "rb") as json_file, open(
    "train_PlayMusic.json", "rb"
) as json_file2:
    with open("annotated.txt", "w") as text_file:
        music_data = json.load(json_file)
        music_data2 = json.load(json_file2)
        data = music_data["PlayMusic"] + music_data2["PlayMusic"]
        for i in range(len(data)):
            valid = True
            entry = data[i]["data"]
            input_sentence = ""
            for text in entry:
                input_sentence += text["text"]
            entities = [entity for entity in entry if "entity" in entity.keys()]
            for entity in entities:
                if entity["entity"] == "service":
                    valid = False
                    break
            if not valid:
                continue
            entities = [
                entity for entity in entities if (entity["entity"] in entityTypes)
            ]

            sortObj = {}
            for entity in entities:
                if entity["entity"] == "sort":
                    # there are a lot of different ways of saying the same sort, so we just match it with the closest option in sortTypes
                    ratios = [
                        match_ratio(entity["text"], type) for type in sortTypes.keys()
                    ]
                    sortObj = sortTypes[
                        list(sortTypes.keys())[ratios.index(max(ratios))]
                    ]

            if len(entities) > 0:
                query = construct_thingtalk(entities, sortObj)
                if query:
                    text_file.write("# nlu/spotify-" + str(i) + "\n")
                    text_file.write("U: " + input_sentence + "\n")
                    text_file.write(
                        "UT: $dialogue @org.thingpedia.dialogue.transaction.execute;\n"
                    )
                    text_file.write(query + "\n====\n")
