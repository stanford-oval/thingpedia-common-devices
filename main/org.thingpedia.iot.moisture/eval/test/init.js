[{
    "a_id": "moisture",
    "ha": {
        "domain": "sensor",
        "entity_id": "moisture_level",
        "init_call": {
            "i_state": {
                "rng": "0,100",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Flora moisture sensor",
                "unit_of_measurement": "%",
                "device_class": "moisture",
                "unique_id": "flora_moisture_level"
            }
        }
    }
}]