import os
import json
import csv
import xml.etree.ElementTree as ET

with open('abbr-name-list.csv', 'w') as output_file:
    writer = csv.writer(output_file, delimiter=',', quotechar='|')

# NBA
    with open('./nba.json', 'r') as input_file:
        data = json.load(input_file)
        conferences = data["conferences"]
        for conf in conferences:
            divisions = conf["divisions"]
            for div in divisions:
                for team in div["teams"]:
                    writer.writerow(['NBA', team["alias"], team["market"] + ' ' + team["name"]])

# NFL                    
    with open('./nfl.json', 'r') as input_file:
        data = json.load(input_file)
        conferences = data["conferences"]
        for conf in conferences:
            divisions = conf["divisions"]
            for div in divisions:
                for team in div["teams"]:
                    writer.writerow(['NFL', team["alias"], team["market"] + ' ' + team["name"]])

# MLB
    with open('./mlb.json', 'r') as input_file:
        data = json.load(input_file)
        leagues = data["leagues"]
        for league in leagues:
            divisions = league["divisions"]
            for div in divisions:
                for team in div["teams"]:
                    writer.writerow(['MLB', team["abbr"], team["market"] + ' ' + team["name"]])


# NCAA football
    NCAAFB = ['./ncaafb-fcs.json', './ncaafb-fbs.json']
    for f in NCAAFB:
        with open(f, 'r') as input_file:
            data = json.load(input_file)
            conferences = data["conferences"]
            for conf in conferences:
                if "subdivisions" in conf:
                    for div in conf["subdivisions"]:
                        for team in div["teams"]:
                            writer.writerow(['NCAA-FB', team["id"], team["market"] + ' ' + team["name"]])
                else:
                    for team in conf["teams"]:
                        writer.writerow(['NCAA-FB', team["id"], team["market"] + ' ' + team["name"]])


# NCAA basketball
    with open('./ncaamb.json', 'r') as input_file:
        data = json.load(input_file)
        divisions = data["divisions"]
        for div in divisions:
            conferences = div["conferences"]
            for conf in conferences:
                for team in conf["teams"]:
                    writer.writerow(['NCAA-MB', team["alias"], team["market"] + ' ' + team["name"]])


# SOCCER
    tree = ET.parse('./soccer_eu.xml')
    for team in tree.iter("team"):
        alias = team.attrib.get("alias")
        name = team.attrib.get("full_name")
        writer.writerow(['SOCCER-EU', alias, name])

    tree = ET.parse('./soccer_na.xml')
    for team in tree.iter("team"):
        alias = team.attrib.get("alias")
        name = team.attrib.get("full_name")
        writer.writerow(['SOCCER-US', alias, name])
        



