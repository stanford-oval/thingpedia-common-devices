[{
    "a_id": "energy",
    "ha": {
        "domain": "sensor",
        "entity_id": "energy_level",
        "init_call": {
            "i_state": {
                "rng": "0,600",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Energy Meter",
                "unit_of_measurement": "Kwh",
                "device_class": "energy"
            }
        }
    }
}];