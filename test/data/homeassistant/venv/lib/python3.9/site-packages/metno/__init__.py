"""Library to handle connection with met.no api."""
import asyncio
import datetime
import logging

from typing import Any, List

import aiohttp
import async_timeout
import pytz

# https://api.met.no/weatherapi/weathericon/_/documentation/#___top
CONDITIONS = {
    "clearsky": "sunny",
    "clearsky_night": "clear-night",
    "cloudy": "cloudy",
    "fair": "partlycloudy",
    "fog": "fog",
    "heavyrain": "rainy",
    "heavyrainandthunder": "lightning-rainy",
    "heavyrainshowers": "rainy",
    "heavyrainshowersandthunder": "lightning-rainy",
    "heavysleet": "snowy-rainy",
    "heavysleetandthunder": "lightning-rainy",
    "heavysleetshowers": "snowy-rainy",
    "heavysleetshowersandthunder": "lightning-rainy",
    "heavysnow": "snowy",
    "heavysnowandthunder": "lightning-rainy",
    "heavysnowshowers": "snowy",
    "heavysnowshowersandthunder": "lightning-rainy",
    "lightrain": "rainy",
    "lightrainandthunder": "lightning-rainy",
    "lightrainshowers": "rainy",
    "lightrainshowersandthunder": "lightning-rainy",
    "lightsleet": "snowy-rainy",
    "lightsleetandthunder": "lightning-rainy",
    "lightsleetshowers": "snowy-rainy",
    "lightsnow": "snowy",
    "lightsnowandthunder": "lightning-rainy",
    "lightsnowshowers": "snowy",
    "lightssleetshowersandthunder": "lightning-rainy",
    "lightssnowshowersandthunder": "lightning-rainy",
    "partlycloudy": "partlycloudy",
    "rain": "rainy",
    "rainandthunder": "lightning-rainy",
    "rainshowers": "rainy",
    "rainshowersandthunder": "lightning-rainy",
    "sleet": "snowy-rainy",
    "sleetandthunder": "lightning-rainy",
    "sleetshowers": "snowy-rainy",
    "sleetshowersandthunder": "lightning-rainy",
    "snow": "snowy",
    "snowandthunder": "snowy",
    "snowshowers": "snowy",
    "snowshowersandthunder": "lightning-rainy",
}

# Most conditions may have the suffix "_day" or "_night". Updating CONDITIONS to
# include them.
_VARIATIONS = {}
for key, value in CONDITIONS.items():
    if not key.endswith(("_day", "_night")):
        _VARIATIONS[key + "_day"] = value
        _VARIATIONS[key + "_night"] = value
CONDITIONS.update(_VARIATIONS)
del _VARIATIONS

DEFAULT_API_URL = "https://api.met.no/weatherapi/locationforecast/2.0/complete"
DEFAULT_AIRQUALITYFORECAST_API_URL = "https://api.met.no/weatherapi/airqualityforecast/0.1/"
TIMEOUT = 30

_LOGGER = logging.getLogger(__name__)


class MetWeatherData:
    """Representation of met weather data."""

    def __init__(self, urlparams, websession=None, api_url=DEFAULT_API_URL):
        """Initialize the Weather object."""
        urlparams = {"lat": str(round(float(urlparams['lat']), 4)),
                     "lon": str(round(float(urlparams['lon']), 4)),
                     "altitude": str(int(float(urlparams.get('altitude', urlparams.get('msl', 0))))),
                     }
        self._urlparams = urlparams
        self._api_url = api_url
        if websession is None:

            async def _create_session():
                return aiohttp.ClientSession()

            loop = asyncio.get_event_loop()
            self._websession = loop.run_until_complete(_create_session())
        else:
            self._websession = websession
        self.data = None

    async def fetching_data(self, *_):
        """Get the latest data from met.no."""
        try:
            async with async_timeout.timeout(TIMEOUT):
                resp = await self._websession.get(self._api_url, params=self._urlparams)
            if resp.status >= 400:
                _LOGGER.error("%s returned %s", self._api_url, resp.status)
                return False
            self.data = await resp.json()
        except (asyncio.TimeoutError, aiohttp.ClientError) as err:
            _LOGGER.error("Access to %s returned error '%s'", self._api_url, type(err).__name__)
            return False
        except ValueError:
            _LOGGER.exception("Unable to parse json response from %s", self._api_url)
            return False
        return True

    def get_current_weather(self):
        """Get the current weather data from met.no."""
        try:
            timeseries = self.data["properties"]["timeseries"]
            now = parse_datetime(timeseries[0]["time"])
        except (TypeError, KeyError, IndexError):
            now = datetime.datetime.now(pytz.utc)
        return self.get_weather(now, hourly=True)

    def get_forecast(self, time_zone, hourly=False):
        """Get the forecast weather data from met.no."""
        if self.data is None:
            return []

        if hourly:
            now = datetime.datetime.now(time_zone).replace(
                minute=0, second=0, microsecond=0
            )
            times = [now + datetime.timedelta(hours=k) for k in range(1, 25)]
        else:
            now = datetime.datetime.now(time_zone).replace(
                hour=12, minute=0, second=0, microsecond=0
            )
            times = [now + datetime.timedelta(days=k) for k in range(1, 6)]
        timeseries = [self.get_weather(_time, hourly=hourly) for _time in times]
        return [t for t in timeseries if t]

    def get_weather(self, time, hourly=False):
        """Get the current weather data from met.no."""
        # pylint: disable=too-many-locals
        # pylint: disable=too-many-statements
        if self.data is None:
            return {}

        day = time.astimezone().date()
        daily_temperatures = []
        daily_precipitation = []
        daily_precipitation_probability = []
        daily_windspeed = []
        daily_windgust = []
        entries = []

        for time_entry in self.data["properties"]["timeseries"]:
            timestamp = parse_datetime(time_entry["time"]).astimezone()
            if timestamp.date() != day:
                # Only get time window for current day
                continue

            # Collect all daily values to calculate min/max/sum
            temperature = get_data("air_temperature", [time_entry])
            if temperature is not None:
                daily_temperatures.append(temperature)
            wind_speed = get_data("wind_speed", [time_entry])
            if wind_speed is not None:
                daily_windspeed.append(wind_speed)
            wind_speed_gust = get_data("wind_speed_of_gust", [time_entry])
            if wind_speed_gust is not None:
                daily_windgust.append(wind_speed_gust)
            precipitation = get_data("precipitation_amount", [time_entry])
            if precipitation is not None:
                daily_precipitation.append(precipitation)
            precipitation_probability = get_data("probability_of_precipitation", [time_entry])
            if precipitation_probability is not None:
                daily_precipitation_probability.append(precipitation_probability)

            if time.astimezone() <= timestamp:
                entries.append(time_entry)

        if not entries:
            return {}
        res = dict()
        res["datetime"] = time.astimezone(tz=pytz.utc).isoformat()
        res["condition"] = CONDITIONS.get(get_data("symbol_code", entries))
        res["pressure"] = get_data("air_pressure_at_sea_level", entries)
        res["humidity"] = get_data("relative_humidity", entries)
        res["wind_bearing"] = get_data("wind_from_direction", entries)
        if hourly:
            res["temperature"] = get_data("air_temperature", entries)
            res["precipitation"] = get_data("precipitation_amount", entries)
            res["precipitation_probability"] = get_data("probability_of_precipitation", entries)
            res["wind_speed"] = get_data("wind_speed", entries)
            res["wind_gust"] = get_data("wind_speed_of_gust", entries)
            res["cloudiness"] = get_data("cloud_area_fraction", entries)
        else:
            res["temperature"] = (
                None if daily_temperatures == [] else max(daily_temperatures)
            )
            res["templow"] = (
                None if daily_temperatures == [] else min(daily_temperatures)
            )
            res["precipitation"] = (
                None if daily_precipitation == [] else round(sum(daily_precipitation), 1)
            )
            res["precipitation_probability"] = (
                None if daily_precipitation_probability == [] else max(daily_precipitation_probability)
            )
            res["wind_speed"] = (
                None if daily_windspeed == [] else max(daily_windspeed)
            )
            res["wind_gust"] = (
                None if daily_windgust == [] else max(daily_windgust)
            )
        return res


def get_data(param: str, data: List[dict]) -> Any:
    """Retrieve weather parameter."""
    try:
        for selected_time_entry in data:

            data = selected_time_entry["data"]
            instant_details = data["instant"]["details"]

            # Grab the highest resolution entity
            next_hrs = (
                    data.get("next_1_hours") or
                    data.get("next_6_hours") or
                    data.get("next_12_hours") or
                    {}
            )
            next_hrs_details = next_hrs.get("details") or {}
            next_hrs_summary = next_hrs.get("summary") or {}

            new_state = None

            if param == "symbol_code":
                if param not in next_hrs_summary:
                    continue
                new_state = next_hrs_summary[param]

            elif param in (
                    "precipitation_amount",
                    "precipitation_amount_max",
                    "precipitation_amount_min",
                    "probability_of_precipitation",
                    "probability_of_thunder",
            ):
                if param not in next_hrs_details:
                    continue
                new_state = next_hrs_details[param]

            elif param not in instant_details:
                continue
            elif param in (
                    "air_temperature",
                    "air_pressure_at_sea_level",
                    "relative_humidity",
                    "dew_point_temperature",
            ):
                new_state = instant_details[param]
            elif param in ("wind_speed", "wind_speed_of_gust"):
                new_state = round(instant_details[param] * 3.6, 1)
            elif param == "wind_from_direction":
                new_state = instant_details[param]
            elif param in (
                    "fog_area_fraction",
                    "cloud_area_fraction",
                    "cloud_area_fraction_low",
                    "cloud_area_fraction_medium",
                    "cloud_area_fraction_high",
            ):
                new_state = instant_details[param]
            return new_state
    except (ValueError, IndexError, KeyError):
        return None


class AirQualityData:
    """Get the latest data."""

    # pylint: disable=too-many-instance-attributes, too-few-public-methods

    def __init__(self, coordinates, forecast, websession, api_url=DEFAULT_AIRQUALITYFORECAST_API_URL):
        """Initialize the Air quality object."""
        self._urlparams = coordinates
        self._urlparams["areaclass"] = "grunnkrets"
        self._forecast = forecast
        self._websession = websession
        self._api_url = api_url
        self.data = dict()
        self.units = dict()
        self._last_update = None
        self._data = dict()

    async def update(self):
        """Update data."""
        if self._last_update is None or datetime.datetime.now() - self._last_update > datetime.timedelta(3600):
            try:
                async with async_timeout.timeout(10):
                    resp = await self._websession.get(
                        self._api_url, params=self._urlparams
                    )
                if resp.status >= 400:
                    _LOGGER.error("%s returned %s", self._api_url, resp.status)
                    return False
                self._data = await resp.json()
            except (asyncio.TimeoutError, aiohttp.ClientError) as err:
                _LOGGER.error("%s returned %s", self._api_url, err)
                return False
        try:
            forecast_time = datetime.datetime.now(pytz.utc) + datetime.timedelta(
                hours=self._forecast
            )

            data = None
            min_dist = 24 * 3600
            for _data in self._data["data"]["time"]:
                valid_from = parse_datetime(_data["from"])
                valid_to = parse_datetime(_data["to"])

                if forecast_time >= valid_to:
                    # Has already passed. Never select this.
                    continue

                average_dist = abs((valid_to - forecast_time).total_seconds()) + abs(
                    (valid_from - forecast_time).total_seconds()
                )
                if average_dist < min_dist:
                    min_dist = average_dist
                    data = _data
            if not data:
                return False
            self.data["aqi"] = data.get("variables", {}).get("AQI", {}).get("value")
            self.data["pm10_concentration"] = (
                data.get("variables", {}).get("pm10_concentration", {}).get("value")
            )
            self.data["o3_concentration"] = (
                data.get("variables", {}).get("o3_concentration", {}).get("value")
            )
            self.data["no2_concentration"] = (
                data.get("variables", {}).get("no2_concentration", {}).get("value")
            )
            self.data["pm25_concentration"] = (
                data.get("variables", {}).get("pm25_concentration", {}).get("value")
            )
            self.data["location"] = "{}, {}".format(
                self._data.get("meta", {}).get("location", {}).get("name"),
                self._data.get("meta", {}).get("superlocation", {}).get("name"),
            )
            state = data.get("variables", {}).get("AQI", {}).get("value")
            if state < 2:
                level = "low"
            elif state < 3:
                level = "medium"
            else:
                level = "high"
            self.data["level"] = level

            self.units["aqi"] = data.get("variables", {}).get("AQI", {}).get("units")
            self.units["pm10_concentration"] = (
                data.get("variables", {}).get("pm10_concentration", {}).get("units")
            )
            self.units["o3_concentration"] = (
                data.get("variables", {}).get("o3_concentration", {}).get("units")
            )
            self.units["no2_concentration"] = (
                data.get("variables", {}).get("no2_concentration", {}).get("units")
            )
            self.units["pm25_concentration"] = (
                data.get("variables", {}).get("pm25_concentration", {}).get("units")
            )
            self.units["aqi"] = data.get("variables", {}).get("AQI", {}).get("value")

        except IndexError as err:
            _LOGGER.error("%s returned %s", resp.url, err)
            return False
        return True


def parse_datetime(dt_str):
    """Parse datetime."""
    date_format = "%Y-%m-%dT%H:%M:%S %z"
    dt_str = dt_str.replace("Z", " +0000")
    return datetime.datetime.strptime(dt_str, date_format)
