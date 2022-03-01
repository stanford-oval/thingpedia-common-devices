[{
    "a_id": "conductivity",
    "ha": {
        "domain": "sensor",
        "entity_id": "conductivity_level",
        "init_call": {
            "i_state": {
                "rng": "100,1300",
                "k": "number"
            },
            "attrib": {
                "friendly_name": "Flora conductivity sensor",
                "unit_of_measurement": "µS/cm",
                "device_class": "conductivity",
                "unique_id": "flora_conductivity_level"
            }
        }
    }
}];