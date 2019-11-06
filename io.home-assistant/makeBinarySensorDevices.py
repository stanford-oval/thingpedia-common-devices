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
    "natural_off": ["not detecting gas"],
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
    "natural_off": ["not detecting light"],
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
    "natural_off": ["not detecting motion"],
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
    "natural_off": ["not detecting power"],
  },
  "presence": {
    "on": "home",
    "off": "away",
  },
  "problem": {
    "on": "detecting_problem",
    "off": "not_detecting_problem",
    "natural_on": ["detecting a problem", "detecting any problem"],
    "natural_off": ["not detecting a problem"],
  },
  "safety": {
    "on": "unsafe",
    "off": "safe",
  },
  "smoke": {
    "on": "detecting_smoke",
    "off": "not_detecting_smoke",
    "natural_on": ["detecting smoke", "detecting any smoke"],
    "natural_off": ["not detecting smoke"],
  },
  "sound": {
    "on": "detecting_sound",
    "off": "not_detecting_sound",
    "natural_on": ["detecting sound", "detecting any sound", "hearing anything", "hearing something"],
    "natural_off": ["not detecting sound"],
  },
  "vibration": {
    "on": "detecting_vibration",
    "off": "not_detecting_vibration",
    "natural_on": ["detecting vibration", "detecting any vibration", "vibrating", "shaking", "moving"],
    "natural_off": ["not detecting vibration", "stationary"],
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
    "namespace": "io.home-assistant.binary-sensor.{}".format(device),
  }

  if not os.path.isdir(os.path.join(os.getcwd(), "../{namespace}".format(**args))):
    os.mkdir("../{namespace}".format(**args))

  manifest_string = """abstract class @{namespace}
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
  
  with open("../{namespace}/manifest.tt".format(**args), "w") as file:
    file.write(manifest_string)

  if "natural_on" in states:
    args["natural_on"] = states["natural_on"]
  if "natural_off" in states:
    args["natural_off"] = states["natural_off"]

  dataset_string = """dataset @{namespace} {{""".format(**args)

  for p_name in [False, True]:
    args["p_name"] = """${p_name} """ if p_name else ""
    args["p_name_fill"] = """(name=p_name)""" if p_name else ""
    args["p_name_init"] = """(p_name : String) """ if p_name else ""
    args["p_name_init_many"] = """p_name : String, """ if p_name else ""
  
    dataset_string += """

  program {p_name_init}:= now => @{namespace}{p_name_fill}.state() => notify
  #_[utterances=["what is the state of my {p_name}{device} sensor?",
                "what is my {p_name}{device} sensor showing?",
                "what does my {p_name}{device} sensor say?",""".format(**args)

    for natural_on_token in args["natural_on"]:
      args["natural_on_token"] = natural_on_token
      dataset_string += """
                "is my {p_name}{device} sensor {natural_on_token}?",
                "check if my {p_name}{device} sensor is {natural_on_token}",""".format(**args)

    for natural_off_token in args["natural_off"]:
      args["natural_off_token"] = natural_off_token
      dataset_string += """
                "is my {p_name}{device} sensor {natural_off_token}?",
                "check if my {p_name}{device} sensor is {natural_off_token}",""".format(**args)

    for natural_on_token in args["natural_on"]:
      for natural_off_token in args["natural_off"]:
        args["natural_on_token"] = natural_on_token
        args["natural_off_token"] = natural_off_token
        dataset_string += """
                "check if my {p_name}{device} sensor is {natural_on_token} or {natural_off_token}",""".format(**args)

    dataset_string = dataset_string[:-1] + """]];"""

    dataset_string += """

  query {p_name_init}:= @{namespace}{p_name_fill}.state()
  #_[utterances=["the state of my {p_name}{device} sensor",""".format(**args)

    for natural_on_token in args["natural_on"]:
      for natural_off_token in args["natural_off"]:
        args["natural_on_token"] = natural_on_token
        args["natural_off_token"] = natural_off_token
        dataset_string += """
                "if my {p_name}{device} sensor is {natural_on_token} or {natural_off_token}",
                "whether my {p_name}{device} sensor is {natural_on_token} or {natural_off_token}",""".format(**args)

    dataset_string = dataset_string[:-1] + """]];"""

    dataset_string += """

  stream {p_name_init}:= monitor @{namespace}{p_name_fill}.state()
  #_[utterances=[["when the state of my {p_name}{device} sensor changes",
                 "when my {p_name}{device} sensor changes state",
                 "when my {p_name}{device} sensor changes"]];

  stream ({p_name_init_many}p_state : Enum({on}, {off})) := edge( @{namespace}{p_name_fill}.state()) on (state == p_state)
  #_[utterances=["when my {p_name}{device} sensor becomes ${{p_state}}",
                "when my {p_name}{device} sensor is ${{p_state}}",
                "when my {p_name}{device} sensor turns ${{p_state}}",
                "when my {p_name}{device} sensor changes to ${{p_state}}",
                "if my {p_name}{device} sensor becomes ${{p_state}}",
                "if my {p_name}{device} sensor is ${{p_state}}",
                "if my {p_name}{device} sensor turns ${{p_state}}",
                "if my {p_name}{device} sensor changes to ${{p_state}}"]];""".format(**args)

    dataset_string += """

  stream {p_name_init}:= edge( @{namespace}{p_name_fill}.state()) on (state == enum({on}))""".format(**args)

    for i, natural_on_token in enumerate(args["natural_on"]):
      args["natural_on_token"] = natural_on_token
      if i == 0:
        dataset_string += """
  #_[utterances=["when my {p_name}{device} sensor becomes {natural_on_token}",
                "when my {p_name}{device} sensor turns {natural_on_token}",
                "when my {p_name}{device} sensor changes to {natural_on_token}",
                "if my {p_name}{device} sensor becomes {natural_on_token}",
                "if my {p_name}{device} sensor turns {natural_on_token}",
                "if my {p_name}{device} sensor changes to {natural_on_token}",""".format(**args)
      else:
        dataset_string += """
                "when my {p_name}{device} sensor becomes {natural_on_token}",
                "when my {p_name}{device} sensor turns {natural_on_token}",
                "when my {p_name}{device} sensor changes to {natural_on_token}",
                "if my {p_name}{device} sensor becomes {natural_on_token}",
                "if my {p_name}{device} sensor turns {natural_on_token}",
                "if my {p_name}{device} sensor changes to {natural_on_token}",""".format(**args)

    for natural_off_token in args["natural_off"]:
      if not natural_off_token.startswith("not"):
        args["natural_off_token"] = natural_off_token
        dataset_string += """
                "when my {p_name}{device} sensor becomes not {natural_off_token}",
                "when my {p_name}{device} sensor turns not {natural_off_token}",
                "when my {p_name}{device} sensor changes to not {natural_off_token}",
                "if my {p_name}{device} sensor becomes not {natural_off_token}",
                "if my {p_name}{device} sensor turns not {natural_off_token}",
                "if my {p_name}{device} sensor changes to not {natural_off_token}",""".format(**args)

    dataset_string = dataset_string[:-1] + """]];""".format(**args)

    dataset_string += """

  stream {p_name_init}:= edge( @{namespace}{p_name_fill}.state()) on (state == enum({off}))""".format(**args)

    for i, natural_off_token in enumerate(args["natural_off"]):
      args["natural_off_token"] = natural_off_token
      if i == 0:
        dataset_string += """
  #_[utterances=["when my {p_name}{device} sensor becomes {natural_off_token}",
                "when my {p_name}{device} sensor turns {natural_off_token}",
                "when my {p_name}{device} sensor changes to {natural_off_token}",
                "if my {p_name}{device} sensor becomes {natural_off_token}",
                "if my {p_name}{device} sensor turns {natural_off_token}",
                "if my {p_name}{device} sensor changes to {natural_off_token}",""".format(**args)
      else:
        dataset_string += """
                "when my {p_name}{device} sensor becomes {natural_off_token}",
                "when my {p_name}{device} sensor turns {natural_off_token}",
                "when my {p_name}{device} sensor changes to {natural_off_token}",
                "if my {p_name}{device} sensor becomes {natural_off_token}",
                "if my {p_name}{device} sensor turns {natural_off_token}",
                "if my {p_name}{device} sensor changes to {natural_off_token}",""".format(**args)

    for natural_on_token in args["natural_on"]:
      if not "not " + natural_on_token in args["natural_off"]:
        args["natural_on_token"] = natural_on_token
        dataset_string += """
                "when my {p_name}{device} sensor becomes not {natural_on_token}",
                "when my {p_name}{device} sensor turns not {natural_on_token}",
                "when my {p_name}{device} sensor changes to not {natural_on_token}",
                "if my {p_name}{device} sensor becomes not {natural_on_token}",
                "if my {p_name}{device} sensor turns not {natural_on_token}",
                "if my {p_name}{device} sensor changes to not {natural_on_token}",""".format(**args)

    dataset_string = dataset_string[:-1] + """]];"""

  dataset_string += """
}"""

  with open("../{namespace}/dataset.tt".format(**args), "w") as file:
    file.write(dataset_string)
