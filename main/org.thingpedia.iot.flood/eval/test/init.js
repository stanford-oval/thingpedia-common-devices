[{
    "a_id": "flood",
    "ha": {
        "domain": "sensor",
        "entity_id": "flood_level",
        "init_call": {
            "i_state": {
                "rng": "0,100",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Water flooding level",
                "unit_of_measurement": "%",
                "device_class": "flood",
            }
        }
    }
}, {
    "a_id": "flood",
    "ha": {
        "domain": "binary_sensor",
        "entity_id": "flood_state",
        "init_call": {
            "i_val": {
                "rng": "flooding,not_flooding",
                "k": "state"
            },
            "attrib": {
                "friendly_name": "Water flooding state",
                "device_class": "flood",
            }
        }
    }
}]