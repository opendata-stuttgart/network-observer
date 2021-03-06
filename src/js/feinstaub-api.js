import _ from 'lodash'
import 'whatwg-fetch'

let api = {
	pm_sensors: {
		"SDS011": true,
		"SDS021": true,
		"PMS1003": true,
		"PMS3003": true,
		"PMS5003": true,
		"PMS6003": true,
		"PMS7003": true,
		"HPM": true,
		"SPS30": true,
	},
	thp_sensors: {
		"DHT11": true,
		"DHT22": true,
		"BMP180": true,
		"BMP280": true,
		"BME280": true,
		"HTU21D": true,
		"DS18B20": true,
		"SHT11": true,
		"SHT12": true,
		"SHT15": true,
		"SHT30": true,
		"SHT31": true,
		"SHT35": true,
		"SHT85": true,
	},
	noise_sensors: {
		"Laerm": true,
	},

	checkValues(obj, sel) {
		let result = false;
		if (obj !== undefined && typeof (obj) === 'number' && !isNaN(obj)) {
			if ((sel === "Humidity") && (obj >= 0) && (obj <= 100)) {
				result = true;
			} else if ((sel === "Temperature") && (obj <= 70 && obj >= -50)) {
				result = true;
			} else if ((sel === "Pressure") && (obj >= 850) && (obj < 1200)) {
				result = true;
			} else if ((sel === "PM10") && (obj < 1900)) {
				result = true;
			} else if ((sel === "PM25") && (obj < 900)) {
				result = true;
			}else if ((sel === "PM1") && (obj < 900)) {
				result = true;
			} else if (sel === "Official_AQI_US") {
				result = true;
			} else if (sel === "Noise") {
				result = true;
			}
		}
		return result;
	},

	officialAQIus(data) {

		function aqius(val, type) {
			let index;

			if (val >= 0) {
				if (type === 'PM10') {
					if (parseInt(val) <= 54) {
						index = calculate_aqi_us(50, 0, 54, 0, parseInt(val))
					} else if (parseInt(val) <= 154) {
						index = calculate_aqi_us(100, 51, 154, 55, parseInt(val))
					} else if (parseInt(val) <= 254) {
						index = calculate_aqi_us(150, 101, 254, 155, parseInt(val))
					} else if (parseInt(val) <= 354) {
						index = calculate_aqi_us(200, 151, 354, 255, parseInt(val))
					} else if (parseInt(val) <= 424) {
						index = calculate_aqi_us(300, 201, 424, 355, parseInt(val))
					} else if (parseInt(val) <= 504) {
						index = calculate_aqi_us(400, 301, 504, 425, parseInt(val))
					} else if (parseInt(val) <= 604) {
						index = calculate_aqi_us(500, 401, 604, 505, parseInt(val))
					} else {
						index = 500
					}
				}
				if (type === 'PM25') {
					if (val.toFixed(1) <= 12) {
						index = calculate_aqi_us(50, 0, 12, 0, val.toFixed(1))
					} else if (val.toFixed(1) <= 35.4) {
						index = calculate_aqi_us(100, 51, 35.4, 12.1, val.toFixed(1))
					} else if (val.toFixed(1) <= 55.4) {
						index = calculate_aqi_us(150, 101, 55.4, 35.5, val.toFixed(1))
					} else if (val.toFixed(1) <= 150.4) {
						index = calculate_aqi_us(200, 151, 150.4, 55.5, val.toFixed(1))
					} else if (val.toFixed(1) <= 250.4) {
						index = calculate_aqi_us(300, 201, 250.4, 150.5, val.toFixed(1))
					} else if (val.toFixed(1) <= 350.4) {
						index = calculate_aqi_us(400, 301, 350.4, 250.5, val.toFixed(1))
					} else if (val.toFixed(1) <= 500.4) {
						index = calculate_aqi_us(500, 401, 500.4, 350.5, val.toFixed(1))
					} else {
						index = 500
					}
				}
			}
			return index;
		}

		function calculate_aqi_us(Ih, Il, Ch, Cl, C) {
			return parseInt((((Ih - Il) / (Ch - Cl)) * (C - Cl)) + Il);
		}

		const P1 = aqius(data.PM10, 'PM10');
		const P2 = aqius(data.PM25, 'PM25');
		return (P1 >= P2) ? {"AQI": P1, "origin": "PM10"} : {"AQI": P2, "origin": "PM2.5"};
	},

	getData: async function (URL) {
		function getRightValue(array, type) {
			let value;
			array.forEach(function (item) {
				if (item.value_type === type) {
					value = item.value;
				}
			});
			return value;
		}
		return fetch(URL)
			.then((resp) => resp.json())
			.then((json) => {
				console.log('successful retrieved data');
				let timestamp_data = '';
				let timestamp_from = '';
				let cells = _.chain(json)					
					.filter((sensor) => {
						if (typeof api.pm_sensors[sensor.sensor.sensor_type.name] != "undefined"
							&& sensor.sensor.sensor_type.name == "PMS7003"
							&& api.checkValues(parseInt(getRightValue(sensor.sensordatavalues, "P0")), "PM1")
							&& api.checkValues(parseInt(getRightValue(sensor.sensordatavalues, "P1")), "PM10")
							&& api.checkValues(parseInt(getRightValue(sensor.sensordatavalues, "P2")), "PM25")) {
							return sensor
						}else if (typeof api.thp_sensors[sensor.sensor.sensor_type.name] != "undefined"
							&& sensor.sensor.sensor_type.name == "BME280"
							&& api.checkValues(parseInt(getRightValue(sensor.sensordatavalues, "humidity")), "Humidity")
							&& api.checkValues(parseInt(getRightValue(sensor.sensordatavalues, "temperature")), "Temperature")
							&& api.checkValues(parseInt(getRightValue(sensor.sensordatavalues, "pressure"))/100, "Pressure")
						) {
							return sensor
						};	
					})
						.map((values) => {
							if (values.timestamp > timestamp_data) {
								timestamp_data = values.timestamp;
								timestamp_from = "data";
							};
							if (values.sensordatavalues.some(obj => obj.value_type == "P0") && values.sensordatavalues.some(obj => obj.value_type == "P1") && values.sensordatavalues.some(obj => obj.value_type == "P2")) {
								return {
									data: {
										PM1: parseInt(getRightValue(values.sensordatavalues, "P0")),
										PM10: parseInt(getRightValue(values.sensordatavalues, "P1")),
										PM25: parseInt(getRightValue(values.sensordatavalues, "P2"))
									},
									id: values.sensor.id,
									sensor:values.sensor.sensor_type.name,
									latitude: Number(values.location.latitude),
									longitude: Number(values.location.longitude),
									"indoor": values.location.indoor,
								}
							}else if (values.sensordatavalues.some(obj => obj.value_type == "humidity") && values.sensordatavalues.some(obj => obj.value_type == "temperature") && values.sensordatavalues.some(obj => obj.value_type == "pressure")) {
								return {
								data: {
									Humidity: parseInt(getRightValue(values.sensordatavalues, "humidity")),
									Temperature: parseInt(getRightValue(values.sensordatavalues, "temperature")),
									Pressure: parseInt(getRightValue(values.sensordatavalues, "pressure")/100)
								},
								id: values.sensor.id,
								sensor:values.sensor.sensor_type.name,
								latitude: Number(values.location.latitude),
								longitude: Number(values.location.longitude),
								indoor: values.location.indoor,
								}
							};
						})
					.value();
				return Promise.resolve({ cells: cells, timestamp: timestamp_data, timestamp_from: timestamp_from });
			}).catch(function (error) {
				throw new Error(`Problems fetching data ${error}`)
			});
	}
};

export default api
