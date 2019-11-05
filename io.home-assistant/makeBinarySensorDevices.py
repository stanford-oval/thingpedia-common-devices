import os
supported_device_classes = {
  "battery": {
    "on": "low",
    "off": "normal",
    "natural_on": ["low", "too low"],
  },
  "cold": {
    "on": "cold",
    "off": "normal",
    "natural_on": ["cold", "too cold"],
  },
  "connectivity": {
    "on": "connected",
    "off": "disconnected",
  },
  "door": {
    "on": "open",
    "off": "closed",
  },
  "garage-door": {
    "on": "open",
    "off": "closed",
  },
  "gas": {
    "on": "detecting_gas",
    "off": "not_detecting_gas",
    "natural_on": ["detecting gas", "detecting any gas"],
    "natural_off": ["not detecting gas", "not detecting any gas"],
  },
  "heat": {
    "on": "hot",
    "off": "normal",
    "natural_on": ["hot", "too hot", "warm", "too warm"],
  },
  "light": {
    "on": "detecting_light",
    "off": "not_detecting_light",
    "natural_on": ["detecting light", "detecting any light"],
    "natural_off": ["not detecting light", "not detecting any light"],
  },
  "lock": {
    "on": "unlocked",
    "off": "locked",
    "natural_on": ["unlocked", "open"],
    "natural_off": ["locked", "closed"],
  },
  "moisture": {
    "on": "wet",
    "off": "dry",
    "natural_on": ["wet", "damp", "moist"],
  },
  "motion": {
    "on": "detecting_motion",
    "off": "not_detecting_motion",
    "natural_on": ["detecting motion", "detecting movement", "detecting any motion", "detecting any movement"],
    "natural_off": ["not detecting motion", "not detecting movement", "not detecting any motion", "not detecting any movement"],
  },
  "moving": {
    "on": "moving",
    "off": "not_moving",
    "natural_on": ["moving"],
    "natural_off": ["not moving", "stationary"],
  },
  "occupancy": {
    "on": "occupied",
    "off": "not_occupied",
    "natural_on": ["occupied"],
    "natural_off": ["not occupied", "empty"],
  },
  "opening": {
    "on": "open",
    "off": "closed",
  },
  "plug": {
    "on": "plugged",
    "off": "unplugged",
    "natural_on_token": ["plugged in"],
  },
  "power": {
    "on": "detecting_power",
    "off": "not_detecting_power",
    "natural_on": ["detecting power", "detecting any power"],
    "natural_off": ["not detecting power", "not detecting any power"],
  },
  "presence": {
    "on": "home",
    "off": "away",
  },
  "problem": {
    "on": "detecting_problem",
    "off": "not_detecting_problem",
    "natural_on": ["detecting a problem", "detecting any problem"],
    "natural_off": ["not detecting a problem", "not detecting any problem"],
  },
  "safety": {
    "on": "unsafe",
    "off": "safe",
  },
  "smoke": {
    "on": "detecting_smoke",
    "off": "not_detecting_smoke",
    "natural_on": ["detecting smoke", "detecting any smoke"],
    "natural_off": ["not detecting smoke", "not detecting any smoke"],
  },
  "sound": {
    "on": "detecting_sound",
    "off": "not_detecting_sound",
    "natural_on": ["detecting sound", "detecting any sound", "hearing anything", "hearing something"],
    "natural_off": ["not detecting sound", "not detecting any sound", "not hearing anything"],
  },
  "vibration": {
    "on": "detecting_vibration",
    "off": "not_detecting_vibration",
    "natural_on": ["detecting vibration", "detecting any vibration", "vibrating", "shaking", "moving"],
    "natural_off": ["not detecting vibration", "not detecting any vibration", "stationary"],
  },
  "window": {
    "on": "open",
    "off": "closed",
  },
}

for device, states in supported_device_classes.items():

  args = {
    "device": device,
    "device_name": ''.join([t.capitalize() for t in device.split('-')]),
    "natural_on": [states["on"]],
    "natural_off": [states["off"]],
    "on": states["on"],
    "off": states["off"],
  }

  if not os.path.isdir(os.path.join(os.getcwd(), "{device}-binary-sensor".format(**args))):
    os.mkdir("{device}-binary-sensor".format(**args))

  manifest_string = """abstract class @io.home-assistant.{device}-binary-sensor
#_[thingpedia_name="{device_name} Binary Sensor"]
#_[thingpedia_description="Interface for Home Assistant's {device_name} Binary Sensor."]
#[license="CC-0"]
#[license_gplcompatible=true]
#[subcategory="home"]
{{
  monitorable query state(out state : Enum({on},{off}))
  #_[canonical="{device} binary sensor state"]
  #_[confirmation="the state of your {device} binary sensor"]
  #_[formatted=["Your {device} sensor is ${{state}}"]];
}}""".format(**args)
  
  with open("{device}-binary-sensor/manifest.tt".format(**args), "w") as file:
    file.write(manifest_string)

  if "natural_on" in states:
    args["natural_on"] = states["natural_on"]
  if "natural_off" in states:
    args["natural_off"] = states["natural_off"]

  dataset_string = """dataset @io.home-assistant.{device}-binary-sensor {{
  program := now => @io.home-assistant.{device}-binary-sensor.state() => notify
  #_[utterances="what is the state of my {device} sensor?",
                "what is my {device} sensor showing?",
                "what does my {device} sensor say?",""".format(**args)

  for natural_on_token in args["natural_on"]:
    args["natural_on_token"] = natural_on_token
    dataset_string += """
                "is my {device} sensor {natural_on_token}?",
                "check if my {device} sensor is {natural_on_token}",""".format(**args)

  for natural_off_token in args["natural_off"]:
    args["natural_off_token"] = natural_off_token
    dataset_string += """
                "is my {device} sensor {natural_off_token}?",
                "check if my {device} sensor is {natural_off_token}",""".format(**args)

  for natural_on_token in args["natural_on"]:
    for natural_off_token in args["natural_off"]:
      args["natural_on_token"] = natural_on_token
      args["natural_off_token"] = natural_off_token
      dataset_string += """
                "check if my {device} sensor is {natural_on_token} or {natural_off_token}",""".format(**args)

  dataset_string = dataset_string[:-1] + """]];"""

  dataset_string += """

  query := @io.home-assistant.{device}-binary-sensor.state()
  #_[utterances="the state of my {device} sensor",""".format(**args)

  for natural_on_token in args["natural_on"]:
    for natural_off_token in args["natural_off"]:
      args["natural_on_token"] = natural_on_token
      args["natural_off_token"] = natural_off_token
      dataset_string += """
                "if my {device} sensor is {natural_on_token} or {natural_off_token}",
                "whether my {device} sensor is {natural_on_token} or {natural_off_token}",""".format(**args)

  dataset_string = dataset_string[:-1] + """]];"""

  dataset_string += """

  stream := monitor @{device}-binary-sensor.state()
  #_[utterances=["when the state of my {device} sensor changes",
                 "when my {device} sensor changes state",
                 "when my {device} sensor changes"]];

  stream (p_state : Enum({on}, {off})) := edge( @io.home-assistant.{device}-binary-sensor.state()) on (state == p_state)
  #_[utterances="when my {device} sensor becomes ${{p_state}}",
                "when my {device} sensor is ${{p_state}}",
                "when my {device} sensor turns ${{p_state}}",
                "when my {device} sensor changes to ${{p_state}}",
                "if my {device} sensor becomes ${{p_state}}",
                "if my {device} sensor is ${{p_state}}",
                "if my {device} sensor turns ${{p_state}}",
                "if my {device} sensor changes to ${{p_state}}"]];

  stream :=  edge( @io.home-assistant.{device}-binary-sensor.state()) on (state == enum({on}))""".format(**args)

  for i, natural_on_token in enumerate(args["natural_on"]):
    args["natural_on_token"] = natural_on_token
    if i == 0:
      dataset_string += """
  #_[utterances="when my {device} sensor becomes {natural_on_token}",
                "when my {device} sensor turns {natural_on_token}",
                "when my {device} sensor changes to {natural_on_token}",
                "if my {device} sensor becomes {natural_on_token}",
                "if my {device} sensor turns {natural_on_token}",
                "if my {device} sensor changes to {natural_on_token}",""".format(**args)
    else:
      dataset_string += """
                "when my {device} sensor becomes {natural_on_token}",
                "when my {device} sensor turns {natural_on_token}",
                "when my {device} sensor changes to {natural_on_token}",
                "if my {device} sensor becomes {natural_on_token}",
                "if my {device} sensor turns {natural_on_token}",
                "if my {device} sensor changes to {natural_on_token}",""".format(**args)

  for natural_off_token in args["natural_off"]:
    if not natural_off_token.startswith("not"):
      args["natural_off_token"] = natural_off_token
      dataset_string += """
                "when my {device} sensor becomes not {natural_off_token}",
                "when my {device} sensor turns not {natural_off_token}",
                "when my {device} sensor changes to not {natural_off_token}",
                "if my {device} sensor becomes not {natural_off_token}",
                "if my {device} sensor turns not {natural_off_token}",
                "if my {device} sensor changes to not {natural_off_token}",""".format(**args)

  dataset_string = dataset_string[:-1] + """]];""".format(**args)

  dataset_string += """

  stream :=  edge( @io.home-assistant.{device}-binary-sensor.state()) on (state == enum({off}))""".format(**args)

  for i, natural_off_token in enumerate(args["natural_off"]):
    args["natural_off_token"] = natural_off_token
    if i == 0:
      dataset_string += """
  #_[utterances="when my {device} sensor becomes {natural_off_token}",
                "when my {device} sensor turns {natural_off_token}",
                "when my {device} sensor changes to {natural_off_token}",
                "if my {device} sensor becomes {natural_off_token}",
                "if my {device} sensor turns {natural_off_token}",
                "if my {device} sensor changes to {natural_off_token}",""".format(**args)
    else:
      dataset_string += """
                "when my {device} sensor becomes {natural_off_token}",
                "when my {device} sensor turns {natural_off_token}",
                "when my {device} sensor changes to {natural_off_token}",
                "if my {device} sensor becomes {natural_off_token}",
                "if my {device} sensor turns {natural_off_token}",
                "if my {device} sensor changes to {natural_off_token}",""".format(**args)

  for natural_on_token in args["natural_on"]:
    if not natural_on_token.startswith("not"):
      args["natural_on_token"] = natural_on_token
      dataset_string += """
                "when my {device} sensor becomes not {natural_on_token}",
                "when my {device} sensor turns not {natural_on_token}",
                "when my {device} sensor changes to not {natural_on_token}",
                "if my {device} sensor becomes not {natural_on_token}",
                "if my {device} sensor turns not {natural_on_token}",
                "if my {device} sensor changes to not {natural_on_token}",""".format(**args)

  dataset_string = dataset_string[:-1] + """]];
}"""

  with open("{device}-binary-sensor/dataset.tt".format(**args), "w") as file:
    file.write(dataset_string)
