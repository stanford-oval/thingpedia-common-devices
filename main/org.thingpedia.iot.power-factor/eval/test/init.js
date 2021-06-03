[{
    "a_id": "power_factor",
    "ha": {
        "domain": "sensor",
        "entity_id": "power_factor_level",
        "init_call": {
            "i_state": {
                "rng": "0,10",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Power Factor Meter",
                "device_class": "power_factor"
            }
        }
    }
}]