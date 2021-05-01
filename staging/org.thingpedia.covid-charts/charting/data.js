
const URL = "https://api.covidactnow.org/v2/"
const API_KEY = "2d1ce11e569b4ce88093a12fff633afb"
let cache = {}


//Pulls data from CovidActNow or local cache
async function pullData(type, loc) {
    if (cache[loc] == null) {
        let url = `${URL}${type}/${loc}.timeseries.json?apiKey=${API_KEY}`
        console.log(url)
        let result = await $.getJSON(url)
        console.log(result)
        if (cache[loc] == null){
            cache[loc] = {}
            cache[loc] = result
        } else {
            cache[loc] = result
        }
        return result

    } else return cache[loc]

}
