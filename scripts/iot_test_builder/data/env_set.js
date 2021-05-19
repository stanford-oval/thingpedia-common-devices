module.exports = [{
    "a_id": "air",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Air Sensor",
        "unit_of_measurement": "CO",
        "device_class": "air_quality",
        "domain": "sensor"
    },
    "i_val": "25"
}, {
    "a_id": "battery",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "UPS",
        "unit_of_measurement": "V",
        "device_class": "battery",
        "domain": "sensor"
    },
    "i_val": "220"
}, {
    "a_id": "cover",
    "ha": {
        "templating": "cover:\n  - platform: template\n    covers:",
        "friendly_name": "Smart Rollers",
        "device_class": "roller",
        "domain": "cover"
    },
    "i_val": "opened"
}, {
    "a_id": "door",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Door Sensor",
        "device_class": "door",
        "domain": "sensor"
    },
    "i_val": "closed"

}, {
    "a_id": "flood",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Flood Sensor",
        "device_class": "flood",
        "domain": "sensor"
    },
    "i_val": "flood"
}, {
    "a_id": "humidity",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Humidity Sensor",
        "unit_of_measurement": "%",
        "device_class": "humidity",
        "domain": "sensor"
    },
    "i_val": "40"
}, {
    "a_id": "illuminance",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Illuminance Sensor",
        "unit_of_measurement": "lx",
        "device_class": "illuminance",
        "domain": "sensor"
    },
    "i_val": "1000"
}, {
    "a_id": "light-bulb",
    "ha": {
        "templating": "light:\n  - platform: template\n    lights:",
        "friendly_name": "Smart Light",
        "device_class": "light",
        "domain": "light"
    },
    "i_val": "on"
}, {
    "a_id": "motion",
    "ha": {
        "templating": "binary_sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Motion Sensor",
        "device_class": "motion",
        "domain": "binary_sensor"
    },
    "i_val": "on"
}, {
    "a_id": "speaker",
    "ha": {
        "templating": "media_player:\n  - platform: template\n    media_players:",
        "friendly_name": "Smart Speaker",
        "device_class": "speaker",
        "domain": "media_player"
    },
    "i_val": "off"
}, {
    "a_id": "switch",
    "ha": {
        "templating": "switch:\n  - platform: template\n    switchs:",
        "friendly_name": "Smart Switch",
        "device_class": "switch",
        "domain": "switch"
    },
    "i_val": "off"
}, {
    "a_id": "temperature",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Temperature Sensor",
        "unit_of_measurement": "°C",
        "device_class": "temperature",
        "domain": "sensor"
    },
    "i_val": "21"
}, {
    "a_id": "uv",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Ultraviolets Sensor",
        "unit_of_measurement": "uv",
        "device_class": "uv",
        "domain": "sensor"
    },
    "i_val": "120"
}, {
    "a_id": "fan",
    "ha": {
        "templating": "fam:\n  - platform: template\n    fans:",
        "friendly_name": "Smart Fan",
        "device_class": "fan",
        "domain": "fan"
    },
    "i_val": "off"
}, {
    "a_id": "lock",
    "ha": {
        "templating": "lock:\n  - platform: template\n    locks:",
        "friendly_name": "Smart Lock",
        "device_class": "lock",
        "domain": "lock"
    },
    "i_val": "on"
}, {
    "a_id": "moisture",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Moisture Sensor",
        "unit_of_measurement": "%",
        "device_class": "moisture",
        "domain": "sensor"
    },
    "i_val": "70"
}, {
    "a_id": "occupancy",
    "ha": {
        "templating": "binary_sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Occupancy Sensor",
        "device_class": "occupancy",
        "domain": "binary_sensor"
    },
    "i_val": "on"
}, {
    "a_id": "plug",
    "ha": {
        "templating": "binary_sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Smart Plug",
        "device_class": "plug",
        "domain": "switch"
    },
    "i_val": "off"
}, {
    "a_id": "security-camera",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Security Camera",
        "device_class": "security-camera",
        "domain": "camera"
    },
    "i_val": "off"
}, {
    "a_id": "sound",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Sound Unit",
        "device_class": "sound",
        "domain": "sensor"
    },
    "i_val": "off"
}, {
    "a_id": "thermostat",
    "ha": {
        "templating": "sensor:\n  - platform: template\n    sensors:",
        "friendly_name": "Smart Thermostat",
        "device_class": "thermostat",
        "domain": "climate"
    },
    "i_val": "off"
}, {
    "a_id": "tv",
    "ha": {
        "templating": "media_player:\n  - platform: template\n    tv:",
        "friendly_name": "Television",
        "device_class": "tv",
        "domain": "tv"
    },
    "i_val": "on"
}, {
    "a_id": "vacuum",
    "ha": {
        "templating": "vacuum:\n  - platform: template\n    vacuums:",
        "friendly_name": "Vacuum Cleaner",
        "device_class": "vacuum",
        "domain": "vacuum"
    },
    "i_val": "off"
}];