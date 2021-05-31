[{
    "a_id": "smoke",
    "ha": {
        "domain": "sensor",
        "entity_id": "smoke_level",
        "init_call": {
            "i_state": {
                "rng": "0,100",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Smoke level",
                "unit_of_measurement": "%",
                "device_class": "smoke",
            }
        }
    }
}, {
    "a_id": "smoke",
    "ha": {
        "domain": "binary_sensor",
        "entity_id": "smoke_state",
        "init_call": {
            "i_val": {
                "rng": "detecting,nothing",
                "k": "state"
            },
            "attrib": {
                "friendly_name": "Smoke state",
                "device_class": "smoke",
            }
        }
    }
}]