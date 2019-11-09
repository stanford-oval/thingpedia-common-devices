import os
supported_device_classes = {
  "awning": {
    "plural": "awnings",
  },
  "blind": {
    "plural": "blinds",
  },
  "curtain": {
    "plural": "curtains",
  },
  "damper": {
    "plural": "dampers",
  },
  "shade": {
    "plural": "shades",
  },
  "shutter": {
    "plural": "shutters",
  },
  # "window": {
  #   "plural": "windows",
  # },
}

for device, props in supported_device_classes.items():

  args = {
    "device": device,
    "devices": props["plural"],
    "device_name": ''.join([t.capitalize() for t in device.split('-')]),
    "adj_open": ["open", "opened"],
    "adj_closed": ["closed"],
    "singular_open": ["opens"],
    "singular_closed": ["closes"],
    "plural_open": ["open"],
    "plural_closed": ["close"],
    "open": "open",
    "closed": "closed",
    "namespace": "io.home-assistant.{}".format(device),
  }

  if not os.path.isdir(os.path.join(os.getcwd(), "../{namespace}".format(**args))):
    os.mkdir("../{namespace}".format(**args))

  manifest_string = """abstract class @{namespace}
#_[thingpedia_name="{device_name} (Cover)"]
#_[description="Interface for Home Assistant's {device_name} (Cover)."]
#[license="CC-0"]
#[license_gplcompatible=true]
#[subcategory="home"]
{{
  monitorable query state(out state : Enum({open},{closed}))
  #_[canonical="{device} state"]
  #_[confirmation="the state of your {device}"]
  #_[formatted=["Your {device} is ${{state}}"]];

  action open_cover()
  #_[canonical="open {device}"]
  #_[confirmation="open your {device}"]
  #[confirm=true];

  action close_cover()
  #_[canonical="close {device}"]
  #_[confirmation="close your {device}"]
  #[confirm=true];
}}""".format(**args)
  
  with open("../{namespace}/manifest.tt".format(**args), "w") as file:
    file.write(manifest_string)

  dataset_string = """dataset @{namespace} language "en" {{""".format(**args)

  for p_name in [False, True]:
    args["p_name"] = """${p_name} """ if p_name else ""
    args["p_name_fill"] = """(name=p_name)""" if p_name else ""
    args["p_name_init"] = """(p_name : String) """ if p_name else ""
    args["p_name_init_many"] = """p_name : String, """ if p_name else ""
  
    dataset_string += """

  program {p_name_init}:= now => @{namespace}{p_name_fill}.state() => notify
  #_[utterances=[""".format(**args)

    for adj_open_token in args["adj_open"]:
      args["adj_open_token"] = adj_open_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"is {possessive} {p_name}{device} {adj_open_token}?",
                 "are {possessive} {p_name}{devices} {adj_open_token}?",
                 "check if {possessive} {p_name}{device} is {adj_open_token}",
                 "check if {possessive} {p_name}{devices} are {adj_open_token}",
                 """.format(**args)

    for adj_closed_token in args["adj_closed"]:
      args["adj_closed_token"] = adj_closed_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"is {possessive} {p_name}{device} {adj_closed_token}?",
                 "are {possessive} {p_name}{devices} {adj_closed_token}?",
                 "check if {possessive} {p_name}{device} is {adj_closed_token}",
                 "check if {possessive} {p_name}{devices} are {adj_closed_token}",
                 """.format(**args)

    for adj_open_token in args["adj_open"]:
      for adj_closed_token in args["adj_closed"]:
        args["adj_open_token"] = adj_open_token
        args["adj_closed_token"] = adj_closed_token
        for possessive in ["my", "the"]:
          args["possessive"] = possessive
          dataset_string += """"check if {possessive} {p_name}{device} is {adj_open_token} or {adj_closed_token}",
                 "check if {possessive} {p_name}{devices} are {adj_open_token} or {adj_closed_token}",
                 """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  query {p_name_init}:= @{namespace}{p_name_fill}.state()
  #_[utterances=[""".format(**args)

    for adj_open_token in args["adj_open"]:
      for adj_closed_token in args["adj_closed"]:
        args["adj_open_token"] = adj_open_token
        args["adj_closed_token"] = adj_closed_token
        for possessive in ["my", "the"]:
          args["possessive"] = possessive
          dataset_string += """"if {possessive} {p_name}{device} is {adj_open_token} or {adj_closed_token}",
                 "if {possessive} {p_name}{devices} are {adj_open_token} or {adj_closed_token}",
                 "whether {possessive} {p_name}{device} is {adj_open_token} or {adj_closed_token}",
                 "whether {possessive} {p_name}{devices} are {adj_open_token} or {adj_closed_token}",
                 """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  stream {p_name_init}:= monitor @{namespace}{p_name_fill}.state()
  #_[utterances=[""".format(**args)

    for possessive in ["my", "the"]:
      args["possessive"] = possessive
      dataset_string += """"when the state of {possessive} {p_name}{device} changes",
                 "when the state of {possessive} {p_name}{devices} change",
                 """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  stream ({p_name_init_many}p_state : Enum({open}, {closed})) := edge( @{namespace}{p_name_fill}.state()) on (state == p_state)
  #_[utterances=[""".format(**args)
    for possessive in ["my", "the"]:
      args["possessive"] = possessive
      dataset_string += """"when {possessive} {p_name}{device} becomes ${{p_state}}",
                "when {possessive} {p_name}{devices} become ${{p_state}}",
                "when {possessive} {p_name}{device} is ${{p_state}}",
                "when {possessive} {p_name}{devices} are ${{p_state}}",
                "if {possessive} {p_name}{device} becomes ${{p_state}}",
                "if {possessive} {p_name}{devices} become ${{p_state}}",
                "if {possessive} {p_name}{device} is ${{p_state}}",
                "if {possessive} {p_name}{devices} are ${{p_state}}",
                """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];"""

    dataset_string += """

  stream {p_name_init}:= edge( @{namespace}{p_name_fill}.state()) on (state == enum({open}))
  #_[utterances=[""".format(**args)

    for i, adj_open_token in enumerate(args["adj_open"]):
      args["adj_open_token"] = adj_open_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"when {possessive} {p_name}{device} becomes {adj_open_token}",
                "when {possessive} {p_name}{devices} become {adj_open_token}",
                "when {possessive} {p_name}{device} is {adj_open_token}",
                "when {possessive} {p_name}{devices} are {adj_open_token}",
                "if {possessive} {p_name}{device} becomes {adj_open_token}",
                "if {possessive} {p_name}{devices} become {adj_open_token}",
                "if {possessive} {p_name}{device} is {adj_open_token}",
                "if {possessive} {p_name}{devices} are {adj_open_token}",
                """.format(**args)

    for singular_open_token in args["singular_open"]:
      args["singular_open_token"] = singular_open_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"when {possessive} {p_name}{device} {singular_open_token}",
                "if {possessive} {p_name}{device} {singular_open_token}",
                """.format(**args)

    for plural_open_token in args["plural_open"]:
      args["plural_open_token"] = plural_open_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"when {possessive} {p_name}{devices} {plural_open_token}",
                "if {possessive} {p_name}{devices} {plural_open_token}",
                """.format(**args)

    # for adj_closed_token in args["adj_closed"]:
    #   if not adj_closed_token.startswith("not"):
    #     args["adj_closed_token"] = adj_closed_token
    #     for possessive in ["my", "the"]:
    #       args["possessive"] = possessive
    #       dataset_string += """"when {possessive} {p_name}{device} becomes not {adj_closed_token}",
    #             "when {possessive} {p_name}{devices} become not {adj_closed_token}",
    #             "if {possessive} {p_name}{device} becomes not {adj_closed_token}",
    #             "if {possessive} {p_name}{devices} become not {adj_closed_token}",
    #             """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];""".format(**args)

    dataset_string += """

  stream {p_name_init}:= edge( @{namespace}{p_name_fill}.state()) on (state == enum({closed}))
  #_[utterances=[""".format(**args)

    for i, adj_closed_token in enumerate(args["adj_closed"]):
      args["adj_closed_token"] = adj_closed_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"when {possessive} {p_name}{device} becomes {adj_closed_token}",
                "when {possessive} {p_name}{devices} become {adj_closed_token}",
                "when {possessive} {p_name}{device} is {adj_closed_token}",
                "when {possessive} {p_name}{devices} are {adj_closed_token}",
                "if {possessive} {p_name}{device} becomes {adj_closed_token}",
                "if {possessive} {p_name}{devices} become {adj_closed_token}",
                "if {possessive} {p_name}{device} is {adj_closed_token}",
                "if {possessive} {p_name}{devices} are {adj_closed_token}",
                """.format(**args)

    for singular_closed_token in args["singular_closed"]:
      args["singular_closed_token"] = singular_closed_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"when {possessive} {p_name}{device} {singular_closed_token}",
                "if {possessive} {p_name}{device} {singular_closed_token}",
                """.format(**args)

    for plural_closed_token in args["plural_closed"]:
      args["plural_closed_token"] = plural_closed_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"when {possessive} {p_name}{devices} {plural_closed_token}",
                "if {possessive} {p_name}{devices} {plural_closed_token}",
                """.format(**args)

    # for adj_open_token in args["adj_open"]:
    #   if not adj_open_token.startswith("not"):
    #     args["adj_open_token"] = adj_open_token
    #     for possessive in ["my", "the"]:
    #       args["possessive"] = possessive
    #       dataset_string += """"when {possessive} {p_name}{device} becomes not {adj_open_token}",
    #             "when {possessive} {p_name}{devices} become not {adj_open_token}",
    #             "when {possessive} {p_name}{device} changes to not {adj_open_token}",
    #             "when {possessive} {p_name}{devices} change to not {adj_open_token}",
    #             "if {possessive} {p_name}{device} becomes not {adj_open_token}",
    #             "if {possessive} {p_name}{devices} become not {adj_open_token}",
    #             "if {possessive} {p_name}{device} changes to not {adj_open_token}",
    #             "if {possessive} {p_name}{devices} change to not {adj_open_token}",
    #             """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];""".format(**args)

    dataset_string += """

  action {p_name_init}:= @{namespace}{p_name_fill}.open_cover()
  #_[utterances=[""".format(**args)

    for plural_open_token in args["plural_open"]:
      args["plural_open_token"] = plural_open_token
      for possessive in ["my", "the"]:
        args["possessive"] = possessive
        dataset_string += """"{plural_open_token} {possessive} {p_name}{device}",
                "{plural_open_token} {possessive} {p_name}{devices}",
                """.format(**args)
    dataset_string += """"{plural_open_token} {p_name}{device}",
                "{plural_open_token} {p_name}{devices}",
                """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];""".format(**args)

    dataset_string += """

  action {p_name_init}:= @{namespace}{p_name_fill}.close_cover()
  #_[utterances=[""".format(**args)

    for plural_closed_token in args["plural_closed"]:
      args["plural_closed_token"] = plural_closed_token
      dataset_string += """"{plural_closed_token} my {p_name}{device}",
                "{plural_closed_token} my {p_name}{devices}",
                "{plural_closed_token} the {p_name}{device}",
                "{plural_closed_token} the {p_name}{devices}",
                "{plural_closed_token} {p_name}{device}",
                "{plural_closed_token} {p_name}{devices}",
                """.format(**args)

    dataset_string = dataset_string.strip()[:-1] + """]];""".format(**args)

  dataset_string += """
}"""

  with open("../{namespace}/dataset.tt".format(**args), "w") as file:
    file.write(dataset_string)
