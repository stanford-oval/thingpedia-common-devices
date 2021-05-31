[{
    "a_id": "illuminance",
    "ha": {
        "domain": "sensor",
        "entity_id": "illuminance_level",
        "init_call": {
            "i_state": {
                "rng": "0,1000",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Illuminance Sensor",
                "unit_of_measurement": "lx",
                "device_class": "luminance"
            }
        }
    }
}]