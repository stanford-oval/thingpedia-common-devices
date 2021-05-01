
// --------- GRAPHING ---------

/*
    Types: cases, contactTracers, deaths, {hospitalBeds}, {icuBeds}, negativeTests,
    newCases, newDeaths, positiveTests, vaccinationsCompleted, vaccinationsInitiated,
    vaccinesAdministered, vaccinesDistributed
    https://apidocs.covidactnow.org/data-definitions/
*/

function chart(data, type, title="Chart") {
    data = cleanData(data, type);
    let margin = {top: 25, right: 50, bottom: 50, left: 100},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // Add SVG element
    let graph = d3.select("#dashboard")
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class', 'd3Chart')
        .append("g").attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add Title
    graph.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .attr("class", "d3-title")
        .text(title);

    //Add Scales and Axis
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[type])])
        .range([height, 0]);

    let xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)))
        .range([0, width]);

    let xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%b '%y"));

    graph.append("g")
               .attr("transform", "translate(0," + height + ")")
               .call(xAxis);
    graph.append("g")
               .call(d3.axisLeft(yScale));

    // Gridlines
    let yGrid = d3.axisLeft()
        .scale(yScale)
        .tickFormat('')
        .ticks(6)
        .tickSizeInner(-width);

    graph.append('g')
        .attr('class', 'gridlines')
        .call(yGrid);

    // Chart line and area
    let area = d3.area()
        .x(d => xScale(new Date(d.date)))
        .y0(d => yScale(d[type]))
        .y1(height)
        .curve(d3.curveMonotoneX);

    let line = d3.line()
        .x(d => xScale(new Date(d.date)))
        .y(d => yScale(d[type]))
        .curve(d3.curveMonotoneX);

    graph.append("path")
        .attr("fill", "rgba(0, 140, 255, 0.3)")
        .attr("d", area(data));

    graph.append("path")
        .attr('fill', 'none')
        .attr("stroke", "rgb(0, 140, 255)")
        .attr("stroke-width", 1.5)
        .attr("d", line(data));
}

function camelToTitle(x) {
    let formatted = x.replace(/([A-Z]+)/g, " $1");
    return formatted[0].toUpperCase() + formatted.slice(1);
}

function cleanData(data, type) {
    return data.filter(d => d[type] !== undefined && d[type] !== null);
}

function interpret_location(loc) {
    let location = {};

    if (STATES_HASH[loc.toUpperCase()]) {
        location.type = 'state';
        location.name = loc.toUpperCase();
        location.canonical = STATES_HASH[loc.toUpperCase()];
        return location;
    }

    let all_loc = Object.keys(STATES).concat(Object.keys(COUNTIES));
    let match = stringSimilarity.findBestMatch(loc, all_loc);
    if (match.bestMatch.rating < 0.4) {
        return "bad input";
    } else {
        match = match.bestMatch.target;
        if (STATES[match]) {
            location.type = 'state';
            location.name = STATES[match];
        } else if (COUNTIES[match]) {
            location.type = 'county';
            location.name =COUNTIES[match];
        } else {
            return "bad input 2";
        }
        location.canonical = match;
    }
    return location;
}

async function displayAll(loc) {
    let data = await pullData(loc.type, loc.name);
    let type = 'newCases';
    chart(data.actualsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'cases';
    chart(data.actualsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'newDeaths';
    chart(data.actualsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'deaths';
    chart(data.actualsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'vaccinationsInitiated';
    chart(data.actualsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'vaccinationsCompleted';
    chart(data.actualsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'caseDensity';
    chart(data.metricsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'icuCapacityRatio';
    chart(data.metricsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'infectionRate';
    chart(data.metricsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'testPositivityRatio';
    chart(data.metricsTimeseries.slice(0,-1), type, loc.canonical + ' ' + camelToTitle(type));

    type = 'vaccinesCompletedRatio';
    // chart(data.metricsTimeseries.slice(0,-1), type, STATES_HASH[loc] + ' ' + camelToTitle(type));

    type = 'vaccinesInitiatedRatio';
    // chart(data.metricsTimeseries.slice(0,-1), type, STATES_HASH[loc] + ' ' + camelToTitle(type));

    // let allData = await $.getJSON("https://api.covidactnow.org/v2/counties.json?apiKey=2d1ce11e569b4ce88093a12fff633afb");
    // let obj = '[';
    // allData.map(x => {
    //     obj += '"' + x.county + '", ';
    // })
    // obj += "]"
    // $("body").append(obj);
    // console.log(obj);
}

// Main dashboard handling

$(function () {
    //Setup and initialization

    $('form').submit(function(e){
      e.preventDefault();
      let loc = $('#location').val();
      if (loc != "") {
          displayAll(interpret_location(loc));
          $('#location').val('');
      }
      return false;

    });

    $('#clear-dashboard').click(() => {console.log('clear'); $('#dashboard').empty();});

});
