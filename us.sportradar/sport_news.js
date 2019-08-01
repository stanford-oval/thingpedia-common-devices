"use strict";

function vprintf(str, args) {
  var i = 0;
  var usePos = false;
  return str.replace(
    /%(?:([1-9][0-9]*)\$)?([0-9]+)?(?:\.([0-9]+))?(.)/g,
    (str, posGroup, widthGroup, precisionGroup, genericGroup) => {
      if (precisionGroup && genericGroup !== "f")
        throw new Error("Precision can only be specified for 'f'");

      var pos = parseInt(posGroup, 10) || 0;
      if (usePos === false && i === 0) usePos = pos > 0;
      if ((usePos && pos === 0) || (!usePos && pos > 0))
        {throw new Error(
          "Numbered and unnumbered conversion specifications cannot be mixed"
        );}

      var fillChar = widthGroup && widthGroup[0] === "0" ? "0" : " ";
      var width = parseInt(widthGroup, 10) || 0;

      function fillWidth(s, c, w) {
        var fill = "";
        for (var i = 0; i < w; i++) fill += c;
        return fill.substr(s.length) + s;
      }

      function getArg() {
        return usePos ? args[pos - 1] : args[i++];
      }

      var s = "";
      switch (genericGroup) {
        case "%":
          return "%";
        case "s":
          s = String(getArg());
          break;
        case "d":
          var intV = parseInt(getArg());
          s = intV.toString();
          break;
        case "x":
          s = parseInt(getArg()).toString(16);
          break;
        case "f":
          if (precisionGroup === "" || precisionGroup === undefined)
            s = parseFloat(getArg()).toString();
          else s = parseFloat(getArg()).toFixed(parseInt(precisionGroup));
          break;
        default:
          throw new Error("Unsupported conversion character %" + genericGroup);
      }
      return fillWidth(s, fillChar, width);
    }
  );
}

String.prototype.format = function format() {
  return vprintf(this, arguments);
};

const Tp = require("thingpedia");
const NEWS_API_KEY = "97a0cd1b088c48d197b2b2301e00ad92";
const NEWS_API_URL =
  "https://newsapi.org/v2/everything?q=%s&apiKey=" + NEWS_API_KEY;

module.exports = class NewsHeadlines {
  constructor() {
    this.uniqueId = "org.newsapi";
    this.name = "News Api";
    this.description = "News Api which is used to retrieve sports headlines";
  }

  get_get_sports_headlines(league) {
    console.log(league["sport_league"]);
    const url = NEWS_API_URL.format(league["sport_league"]);
    console.log(url);
    return Tp.Helpers.Http.get(url).then((response) => {
      var parsed = JSON.parse(response);
      const articles = parsed["articles"];
      var random_number = Math.floor(Math.random() * 20);
      return [
        {
          link: articles[random_number]["url"],
          title: articles[random_number]["title"],
          description: articles[random_number]["description"]
        }
      ];
    });
  }
};
