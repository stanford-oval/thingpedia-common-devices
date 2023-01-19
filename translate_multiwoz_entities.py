# import json

# res = {"result": "ok", "data": []}

# with open("parameter-datasets/attraction_db.json", "r") as fd:
#     data = json.load(fd)
# with open("parameter-datasets/hotel_db.json", "r") as fd:
#     data += json.load(fd)
# with open("parameter-datasets/restaurant_db.json", "r") as fd:
#     data += json.load(fd)

# for i in data: 
#     res["data"].append({
#         "value": i["id"]["value"],
#         "name": i["id"]["display"],
#         "canonical": i["id"]["display"],
#     })


# with open("parameter-datasets/uk.ac.cam.multiwoz.Taxi:Place.json", "w") as fd:
#     json.dump(res, fd)

import json

res = {"result": "ok", "data": []}

with open("parameter-datasets/restaurant_db.json", "r") as fd:
    data = json.load(fd)

for i in data: 
    res["data"].append({
        "value": i["food"],
        "name": i["food"],
        "canonical": i["food"],
    })


with open("parameter-datasets/uk.ac.cam.multiwoz.Restaurant:Food.json", "w") as fd:
    json.dump(res, fd)
