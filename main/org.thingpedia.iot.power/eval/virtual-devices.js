[{
    "a_id": "power",
    "ha": {
        "domain": "sensor",
        "entity_id": "power_level",
        "init_call": {
            "i_state": {
                "rng": "0,6000",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Power Meter",
                "unit_of_measurement": "W",
                "device_class": "power"
            }
        }
    }
}];