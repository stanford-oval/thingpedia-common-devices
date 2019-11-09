import os
import pathlib
supported_device_classes = {
  "battery": {
    "natural_device_token": "battery",
    "on": "low",
    "off": "normal",
    "natural_on": ["low", "too low"],
    "possessives": ["my", "the"],
  },
  "cold": {
    "natural_device_token": "cold sensor",
    "on": "cold",
    "off": "normal",
    "natural_on": ["cold", "too cold"],
    "possessives": ["the"],
  },
  "connectivity": {
    "natural_device_token": "router",
    "on": "connected",
    "off": "disconnected",
    "possessives": ["the"],
  },
  "door": {
    "natural_device_token": "door",
    "on": "open",
    "off": "closed",
    "verb_on": ["opens"],
    "verb_off": ["closes"],
    "possessives": ["my", "the"],
  },
  "garage-door": {
    "natural_device_token": "garage door",
    "on": "open",
    "off": "closed",
    "verb_on": ["opens"],
    "verb_off": ["closes"],
    "possessives": ["my", "the"],
  },
  "gas": {
    "natural_device_token": "gas sensor",
    "on": "detecting_gas",
    "off": "not_detecting_gas",
    "natural_on": ["detecting gas", "detecting any gas"],
    "natural_off": ["not detecting gas"],
    "verb_on": ["detects gas", "detects any gas"],
    "verb_off": ["stops detecting gas"],
    "possessives": ["the"],
  },
  "heat": {
    "natural_device_token": "heat sensor",
    "on": "hot",
    "off": "normal",
    "natural_on": ["hot", "too hot", "warm", "too warm"],
    "possessives": ["the"],
  },
  "humidity": {
    "natural_device_token": "humidity sensor",
    "on": "humid",
    "off": "normal",
    "possessives": ["the"],
  },
  "illuminance": {
    "natural_device_token": "illuminance sensor",
    "on": "bright",
    "off": "dark",
    "possessives": ["the"],
  },
  "light": {
    "natural_device_token": "light sensor",
    "on": "detecting_light",
    "off": "not_detecting_light",
    "natural_on": ["detecting light", "detecting any light"],
    "natural_off": ["not detecting light"],
    "verb_on": ["detects light", "detects any light"],
    "verb_off": ["stops detecting light"],
    "possessives": ["the"],
  },
  "lock": {
    "natural_device_token": "lock",
    "on": "unlocked",
    "off": "locked",
    "natural_on": ["unlocked", "open"],
    "natural_off": ["locked", "closed"],
    "verb_on": ["opens", "unlocks"],
    "verb_off": ["closes", "locks"],
    "possessives": ["my", "the"],
  },
  "moisture": {
    "natural_device_token": "moisture sensor",
    "on": "wet",
    "off": "dry",
    "natural_on": ["wet", "damp", "moist"],
    "possessives": ["the"],
  },
  "motion": {
    "natural_device_token": "motion sensor",
    "on": "detecting_motion",
    "off": "not_detecting_motion",
    "natural_on": ["detecting motion", "detecting movement", "detecting any motion", "detecting any movement"],
    "natural_off": ["not detecting motion"],
    "verb_on": ["detects motion", "detects any motion"],
    "verb_off": ["stops detecting motion"],
    "possessives": ["the"],
  },
  "moving": {
    "natural_device_token": "movement sensor",
    "on": "moving",
    "off": "not_moving",
    "natural_on": ["moving"],
    "natural_off": ["not moving", "stationary"],
    "verb_on": ["detects movement", "detects any movement"],
    "verb_off": ["stops detecting movement", "becomes stationary"],
    "possessives": ["the"],
  },
  "occupancy": {
    "natural_device_token": "occupancy sensor",
    "on": "occupied",
    "off": "not_occupied",
    "natural_on": ["occupied"],
    "natural_off": ["empty"],
    "possessives": ["the"],
  },
  "opening": {
    "natural_device_token": "opening",
    "on": "open",
    "off": "closed",
    "verb_on": ["opens"],
    "verb_off": ["closes"],
    "possessives": ["the"],
  },
  "plug": {
    "natural_device_token": "plug",
    "on": "plugged",
    "off": "unplugged",
    "natural_on_token": ["plugged in"],
    "possessives": ["my", "the"],
  },
  "power": {
    "natural_device_token": "power sensor",
    "on": "detecting_power",
    "off": "not_detecting_power",
    "natural_on": ["detecting power", "detecting any power"],
    "natural_off": ["not detecting power"],
    "possessives": ["the"],
  },
  "presence": {
    "natural_device_token": "presence sensor",
    "on": "home",
    "off": "away",
    "possessives": ["the"],
  },
  "pressure": {
    "natural_device_token": "pressure sensor",
    "on": "pressurized",
    "off": "depressurized",
    "possessives": ["the"],
  },
  "problem": {
    "natural_device_token": "problem sensor",
    "on": "detecting_problem",
    "off": "not_detecting_problem",
    "natural_on": ["detecting a problem", "detecting any problem"],
    "natural_off": ["not detecting a problem"],
    "possessives": ["the"],
  },
  "safety": {
    "natural_device_token": "safety sensor",
    "on": "unsafe",
    "off": "safe",
    "possessives": ["the"],
  },
  "signal_strength": {
    "natural_device_token": "signal strength",
    "on": "strong",
    "off": "weak",
    "possessives": ["the"],
  },
  "smoke": {
    "natural_device_token": "smoke sensor",
    "on": "detecting_smoke",
    "off": "not_detecting_smoke",
    "natural_on": ["detecting smoke", "detecting any smoke"],
    "natural_off": ["not detecting smoke"],
    "possessives": ["the"],
  },
  "sound": {
    "natural_device_token": "sound sensor",
    "on": "detecting_sound",
    "off": "not_detecting_sound",
    "natural_on": ["detecting sound", "detecting any sound", "hearing anything", "hearing something"],
    "natural_off": ["not detecting sound"],
    "possessives": ["the"],
  },
  "temperature": {
    "natural_device_token": "temperature",
    "on": "warm",
    "off": "cold",
    "possessives": ["the"],
  },
  # "timestamp": {
  # },
  "vibration": {
    "natural_device_token": "vibration sensor",
    "on": "detecting_vibration",
    "off": "not_detecting_vibration",
    "natural_on": ["detecting vibration", "detecting any vibration", "vibrating", "shaking", "moving"],
    "natural_off": ["not detecting vibration", "stationary"],
    "possessives": ["the"],
  },
  # "window": {
  #   "natural_device_token": "window",
  #   "on": "open",
  #   "off": "closed",
  #   "possessives": ["my", "the"],
  # },
}

for device, states in supported_device_classes.items():

  args = {
    "device": device,
    "natural_device_token": states["natural_device_token"],
    "possessives": states["possessives"],
    "device_name": ''.join([t.capitalize() for t in device.split('-')]),
    "natural_on": [states["on"]],
    "natural_off": [states["off"]],
    "on": states["on"],
    "off": states["off"],
    "verb_on": states["verb_on"] if "verb_on" in states else [],
    "verb_off": states["verb_off"] if "verb_off" in states else [],
    "namespace": "io.home-assistant.{}".format(device),
  }

  for token in ["is", "becomes", "turns", "gets"]:
    args["verb_on"].append("{} {}".format(token, states["on"]))
    args["verb_off"].append("{} {}".format(token, states["off"]))

  p = pathlib.Path.cwd().joinpath("../{namespace}".format(**args))
  p.mkdir(parents=True, exist_ok=True)

  manifest_string = """abstract class @{namespace}
#_[thingpedia_name="{device_name} Sensor / Binary Sensor"]
#_[thingpedia_description="Interface for Home Assistant's {device_name} Sensor / Binary Sensor."]
#_[description="Interface for Home Assistant's {device_name} Sensor / Binary Sensor."]
#[license="CC-0"]
#[license_gplcompatible=true]
#[subcategory="home"]
{{
  monitorable query state(out state : Enum({on},{off}), out value : String)
  #_[canonical="{device} sensor state"]
  #_[confirmation="the state of your {device} sensor"]
  #_[formatted=["The {natural_device_token} is ${{state}}.", "The {natural_device_token} is ${{value}}."]];
}}""".format(**args)
  
  with open(p / "manifest.tt", "w") as file:
    file.write(manifest_string)

  if "natural_on" in states:
    args["natural_on"] = states["natural_on"]
  if "natural_off" in states:
    args["natural_off"] = states["natural_off"]

  dataset_string = """dataset @{namespace} language "en" {{""".format(**args)

  for p_name in [False, True]:
    args["p_name"] = """${p_name} """ if p_name else ""
    args["p_name_fill"] = """(name=p_name)""" if p_name else ""
    args["p_name_init"] = """(p_name : String) """ if p_name else ""
    args["p_name_init_many"] = """p_name : String, """ if p_name else ""
  
    dataset_string += """

  program {p_name_init}:= now => @{namespace}{p_name_fill}.state() => notify
  #_[utterances=[""".format(**args)

    for possessive in args["possessives"]:
      args["possessive"] = possessive
      # dataset_string += """"what is the state of {possessive} {p_name}{natural_device_token}?",
      #            """.format(**args)

      for natural_on_token in args["natural_on"]:
        args["natural_on_token"] = natural_on_token
        dataset_string += """"is {possessive} {p_name}{natural_device_token} {natural_on_token}?",
                 "check if {possessive} {p_name}{natural_device_token} is {natural_on_token}",
                 """.format(**args)

      for natural_off_token in args["natural_off"]:
        args["natural_off_token"] = natural_off_token
        dataset_string += """"is {possessive} {p_name}{natural_device_token} {natural_off_token}?",
                 "check if {possessive} {p_name}{natural_device_token} is {natural_off_token}",
                 """.format(**args)

      for natural_on_token in args["natural_on"]:
        for natural_off_token in args["natural_off"]:
          args["natural_on_token"] = natural_on_token
          args["natural_off_token"] = natural_off_token
          dataset_string += """"check if {possessive} {p_name}{natural_device_token} is {natural_on_token} or {natural_off_token}",
                 """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  query {p_name_init}:= @{namespace}{p_name_fill}.state()
  #_[utterances=[""".format(**args)

    for possessive in args["possessives"]:
      args["possessive"] = possessive
      dataset_string += """"the state of {possessive} {p_name}{natural_device_token}",
                 """.format(**args)
      for natural_on_token in args["natural_on"]:
        for natural_off_token in args["natural_off"]:
          args["natural_on_token"] = natural_on_token
          args["natural_off_token"] = natural_off_token
          dataset_string += """"if {possessive} {p_name}{natural_device_token} is {natural_on_token} or {natural_off_token}",
                 "whether {possessive} {p_name}{natural_device_token} is {natural_on_token} or {natural_off_token}",
                 """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  stream {p_name_init}:= monitor @{namespace}{p_name_fill}.state()
  #_[utterances=[""".format(**args)

    for possessive in args["possessives"]:
      args["possessive"] = possessive
      dataset_string += """"when the state of {possessive} {p_name}{natural_device_token} changes",
                 """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  stream ({p_name_init_many}p_state : Enum({on}, {off})) := edge( @{namespace}{p_name_fill}.state()) on (state == p_state)
  #_[utterances=[""".format(**args)

    for possessive in args["possessives"]:
      args["possessive"] = possessive
      dataset_string += """"when {possessive} {p_name}{natural_device_token} becomes ${{p_state}}",
                "when {possessive} {p_name}{natural_device_token} is ${{p_state}}",
                "when {possessive} {p_name}{natural_device_token} turns ${{p_state}}",
                "when {possessive} {p_name}{natural_device_token} changes to ${{p_state}}",
                "if {possessive} {p_name}{natural_device_token} becomes ${{p_state}}",
                "if {possessive} {p_name}{natural_device_token} is ${{p_state}}",
                "if {possessive} {p_name}{natural_device_token} turns ${{p_state}}",
                "if {possessive} {p_name}{natural_device_token} changes to ${{p_state}}",
                """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  stream {p_name_init}:= edge( @{namespace}{p_name_fill}.state()) on (state == enum({on}))
  #_[utterances=[""".format(**args)

    for i, verb_on_token in enumerate(args["verb_on"]):
      for possessive in args["possessives"]:
        args["possessive"] = possessive 
        args["verb_on_token"] = verb_on_token
        dataset_string += """"when {possessive} {p_name}{natural_device_token} {verb_on_token}",
                "if {possessive} {p_name}{natural_device_token} {verb_on_token}",
                """.format(**args)

    # for natural_off_token in args["natural_off"]:
    #   if not natural_off_token.startswith("not"):
    #     args["natural_off_token"] = natural_off_token
    #     dataset_string += """
    #             "when my {p_name}{device} becomes not {natural_off_token}",
    #             "when my {p_name}{device} turns not {natural_off_token}",
    #             "when my {p_name}{device} changes to not {natural_off_token}",
    #             "if my {p_name}{device} becomes not {natural_off_token}",
    #             "if my {p_name}{device} turns not {natural_off_token}",
    #             "if my {p_name}{device} changes to not {natural_off_token}",""".format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];""".format(**args)

    dataset_string += """

  stream {p_name_init}:= edge( @{namespace}{p_name_fill}.state()) on (state == enum({off}))
  #_[utterances=[""".format(**args)

    for i, verb_off_token in enumerate(args["verb_off"]):
      for possessive in args["possessives"]:
        args["possessive"] = possessive 
        args["verb_off_token"] = verb_off_token
        dataset_string += """"when {possessive} {p_name}{natural_device_token} {verb_off_token}",
                "if {possessive} {p_name}{natural_device_token} {verb_off_token}",
                """.format(**args)

    # for natural_on_token in args["natural_on"]:
    #   if not "not " + natural_on_token in args["natural_off"]:
    #     args["natural_on_token"] = natural_on_token
    #     dataset_string += """
    #             "when my {p_name}{device} becomes not {natural_on_token}",
    #             "when my {p_name}{device} turns not {natural_on_token}",
    #             "when my {p_name}{device} changes to not {natural_on_token}",
    #             "if my {p_name}{device} becomes not {natural_on_token}",
    #             "if my {p_name}{device} turns not {natural_on_token}",
    #             "if my {p_name}{device} changes to not {natural_on_token}",""".format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

  dataset_string += """
}"""

  with open(p / "dataset.tt", "w") as file:
    file.write(dataset_string)
