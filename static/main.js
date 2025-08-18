// us-states population

us_state_populations = {
	"California": 39538223,
	"Texas": 29145505,
	"Florida": 21538187,
	"New York": 20201249,
	"Pennsylvania": 13002700,
	"Illinois": 12812508,
	"Ohio": 11799448,
	"Georgia": 10711908,
	"North Carolina": 10439388,
	"Michigan": 10077331,
	"New Jersey": 9288994,
	"Virginia": 8631393,
	"Washington": 7705281,
	"Arizona": 7151502,
	"Massachusetts": 7029917,
	"Tennessee": 6910840,
	"Indiana": 6785528,
	"Maryland": 6177224,
	"Missouri": 6154913,
	"Wisconsin": 5893718,
	"Colorado": 5773714,
	"Minnesota": 5706494,
	"South Carolina": 5118425,
	"Alabama": 5024279,
	"Louisiana": 4657757,
	"Kentucky": 4505836,
	"Oregon": 4237256,
	"Oklahoma": 3959353,
	"Connecticut": 3605944,
	"Utah": 3271616,
	"Iowa": 3190369,
	"Nevada": 3104614,
	"Arkansas": 3011524,
	"Mississippi": 2961279,
	"Kansas": 2937880,
	"New Mexico": 2117522,
	"Nebraska": 1961504,
	"Idaho": 1839106,
	"West Virginia": 1793716,
	"Hawaii": 1455271,
	"New Hampshire": 1377529,
	"Maine": 1362359,
	"Montana": 1084225,
	"Rhode Island": 1097379,
	"Delaware": 989948,
	"South Dakota": 886667,
	"North Dakota": 779094,
	"Alaska": 733391,
	"Vermont": 643077,
	"Wyoming": 576851,
	"District of Columbia": 689545,
	"Puerto Rico": 3194000
}

// colors
var bg_color = '#d1d1d1';
var hselector_color = '#fffb00';
var rect_stroke = '#424242';
var rect_fill = '#b3b3b3';
var color_a = 'white';
var color_c = '#3d3d3d';
var colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
var rules_selected = [];
var attributes_selected = [];
var reorderDuration = 1000;
var colorsScale = d3.scaleSequential(d3.interpolateYlOrRd);
var colorsScale2 = d3.scaleSequential(d3.interpolateMagma);
// vars for map filter
var cluster_timeline = [];
var scatterplot_data = [];
var selectedClusters = [];
var selectedDates = [];
var selectedDatesRules = [];
var date_label_1 = '#525252';
var date_label_2 = '#1d4e96';

var rule_timeline = [];

var selectedClusterTimelineBoxes = [];
var selectedState = null;

var currentRules = [];
var selectedStateName = []

function getOrderedKeysByAttributes(data, attributes) {
    return Object.keys(data)
        .map(id => ({
            id,
            score: attributes.reduce((sum, attr) => sum + (data[id][attr] || 0)/cluster_sizes[id], 0)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.id);
}

const reorderByValueLength = (arr, key) => {
	return arr.sort((a, b) => (b[key]?.length || 0) - (a[key]?.length || 0));
};

let mapInstance = null;
let geoJsonLayer = null;
let legendControl = null;

let mapInstance2 = null;
let geoJsonLayer2 = null;
let legendControl2 = null;

function drawMap() {
	// filter data by cluster_id
	var mapData = cluster_timeline.slice();
	if (selectedClusters.length > 0) {
		mapData = mapData.filter(d => selectedClusters.includes(d.id));
	}
	// filter data by dates
	if (selectedDates.length > 0) {
		mapData = mapData.filter(d => selectedDates.includes(d.date));
	}
	
	// process data by state
	mapData = mapData.map(d => d.locations).flat();
	const locationMap = mapData.reduce((map, record) => {
		if (!map[record.location]) map[record.location] = new Set();
		record.ids.forEach(id => map[record.location].add(id));
		return map;
	}, {});

	const result = Object.fromEntries(
		Object.entries(locationMap).map(([location, idSet]) => [location, idSet.size])
	);
	
	const values = Object.values(result);
	const min = values.length > 0 ? Math.min(...values) : 0;
	const max = values.length > 0 ? Math.max(...values) : 100;
	var scale = d3.scaleLinear().domain([min, max]).range([0, 1]);

	// process data by state per capita
	const perCapitaResult = {};
	Object.keys(result).forEach(state => {
		const population = us_state_populations[state];
		perCapitaResult[state] = population ? (result[state] / population) * 100000 : 0;
	});

	const perCapitaValues = Object.values(perCapitaResult);
	const minPerCapita = perCapitaValues.length > 0 ? Math.min(...perCapitaValues) : 0;
	const maxPerCapita = perCapitaValues.length > 0 ? Math.max(...perCapitaValues) : 100;
	const perCapitaScale = d3.scaleLinear().domain([minPerCapita, maxPerCapita]).range([0, 1]);

	var element = document.getElementById('map-view');
	var height = element.clientHeight;
	var width = element.clientWidth;
	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	
	// Check if the SVG already exists
	let svg = d3.select('#map-view svg');
	const svgExists = !svg.empty();
	
	if (!svgExists) {
		// Create the SVG if it doesn't exist
		svg = d3.select('#map-view')
			.append('svg')
			.attr('width', width)
			.attr('height', height);
							
		// Create gradient for legend (only once)
		var grad = svg.append('defs')
			.append('linearGradient')
			.attr('id', 'grad')
			.attr('x1', '0%')
			.attr('x2', '0%')
			.attr('y1', '100%')
			.attr('y2', '0%');
	
		d3.range(0, 1.01, 0.01).forEach(t => {
			grad.append("stop")
				.attr("offset", `${t * 100}%`)
				.attr("stop-color", d3.interpolateYlOrRd(t));
		});
	}

	const projection = d3.geoAlbersUsa()
			.scale(59000)
			.translate([-6300, 3740]); // - +

	const path = d3.geoPath().projection(projection);
	
	//fetch(urlToFetch)
	// 		.then(response => response.json())
	let jsonFile = document.getElementById("json-input").files[0];
	jsonFile.text().then(text => {
		const data = JSON.parse(text);
		return data;
	})
	.then(data => {
		// Si el mapa ya existe, actualizamos los datos
		if (mapInstance) {
			// Eliminamos la capa GeoJSON actual si existe
			if (geoJsonLayer) {
				geoJsonLayer.remove();
			}
			// Eliminamos la leyenda si existe
			if (legendControl) {
				mapInstance.removeControl(legendControl);
			}
			// Creamos nueva capa GeoJSON con datos actualizados
			geoJsonLayer = L.geoJSON(data, {
				style: function(feature) {
					const placeName = feature.properties.PLACE;
					let colorValue; 
					if (globalState.mapMode === MapMode.OCCURRENCES) {
						colorValue = colorsScale(scale(result[placeName] || 0));
					}
					const rawValue = result[placeName] || 0;
					const population = us_state_populations[placeName];
					const perCapitaValue = population ? (rawValue / population) * 100000 : 0;
					
					if (globalState.mapMode === MapMode.PER_CAPITA) {
						colorValue = colorsScale(perCapitaScale(perCapitaValue));
					}

					return {
						fillColor: colorValue,
						weight: 1,
						opacity: 1,
						color: 'gray',
						dashArray: '0',
						fillOpacity: 1
					};
				},
					
				onEachFeature: function(feature, layer) {
					layer.bindPopup(feature.properties.PLACE);
					layer.on({
						mouseover: function(e) {
							const layer = e.target;									
							layer.setStyle({
								weight: 1,
								color: 'gray',
								dashArray: '0',
								fillOpacity: 1
							});
															
							layer.bringToFront();
							// Panel de información (comentado como en el original)
							if (layer.feature.properties) {
								// updateInfoPanel(layer.feature.properties);
							}
						},
						mouseout: function(e) {
							geoJsonLayer.resetStyle(e.target);
						},
						click: function(e) {
							const placeName = e.target.feature.properties.PLACE;
							console.log(`Estado seleccionado: ${placeName}`);
						}
					});
				}
				}).addTo(mapInstance);
				
				/*var bounds = geoJsonLayer.getBounds();
				mapInstance.fitBounds(bounds);*/
				// Creamos y añadimos la nueva leyenda
				legendControl = L.control({position: 'bottomright'});
				legendControl.onAdd = function(map) {
					const div = L.DomUtil.create('div', 'info legend');
					div.style.backgroundColor = 'white';
					div.style.borderRadius = '8px';
					div.style.padding = '8px';
					div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';									
					const legendSvg = d3.select(div)
						.append('svg')
						.attr('width', 110)
						.attr('height', 140)
						.style('pointer-events', 'none');
									
					const gradExists = legendSvg.select("defs").size() > 0;
									
					if (!gradExists) {
						const grad = legendSvg.append('defs')
							.append('linearGradient')
							.attr('id', 'legend-grad')
							.attr('x1', '0%')
							.attr('x2', '0%')
							.attr('y1', '0%')
							.attr('y2', '100%');
									
						d3.range(0, 1.01, 0.01).forEach(t => {
							grad.append("stop")
								.attr("offset", `${t * 100}%`)
								.attr("stop-color", d3.interpolateYlOrRd(1 - t));
						});
					}
					legendSvg.append('text')
						.attr('class', 'legend-title')
						.attr('id', 'map-legend-title')
						.attr('x', 50)
						.attr('y', 15)
						.style('text-anchor', 'middle')
						.style('font-size', '12px')
						.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
						.attr('opacity', 1)
						.text(globalState.mapMode === MapMode.OCCURRENCES ? 'Occurrences' : 'Per 100,000');
									
					legendSvg.append('rect')
						.attr('class', 'legend-rect')
						.attr('x', 20)
						.attr('y', 25)
						.attr('width', 20)
						.attr('height', 110)
						.attr('stroke', 'black')
						.style('fill', 'url(#legend-grad)');
									
					const values = globalState.mapMode === MapMode.OCCURRENCES ? 
						[max, Math.round((min + max) / 2), min] : 
						[maxPerCapita, Math.round((minPerCapita + maxPerCapita) / 2), minPerCapita];
									
					legendSvg.append('text')
						.attr('x', 50)
						.attr('y', 35)
						.style('text-anchor', 'start')
						.style('font-size', '12px')
						.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
						.text(Math.round(values[0]));
									
					legendSvg.append('text')
						.attr('x', 50)
						.attr('y', 80)
						.style('text-anchor', 'start')
						.style('font-size', '12px')
						.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
						.text(Math.round(values[1]));
									
					legendSvg.append('text')
						.attr('x', 50)
						.attr('y', 125)
						.style('text-anchor', 'start')
						.style('font-size', '12px')
						.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
						.text(Math.round(values[2]));
									
					return div;
				};
				
				legendControl.addTo(mapInstance);
		} else {
			// Creamos el mapa por primera vez
			//var centerVal = [37.8, -96];
			//var zoomVal = 4;

			mapInstance = L.map('map-view', {
				zoomControl: false,
				attributionControl: false
			});//.setView(centerVal, zoomVal);
							
			// Añadimos capa base
			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  				attribution: '&copy; OpenStreetMap &copy; CartoDB',
    			subdomains: 'abcd',
    			maxZoom: 19
			}).addTo(mapInstance);
			// Creamos capa GeoJSON
			geoJsonLayer = L.geoJSON(data, {
				style: function(feature) {
					const placeName = feature.properties.PLACE;
					let colorValue; 
					if (globalState.mapMode === MapMode.OCCURRENCES) {
						colorValue = colorsScale(scale(result[placeName] || 0));
					}							
					const rawValue = result[placeName] || 0;
					const population = us_state_populations[placeName];
					const perCapitaValue = population ? (rawValue / population) * 100000 : 0;

					if (globalState.mapMode === MapMode.PER_CAPITA) {
						colorValue = colorsScale(perCapitaScale(perCapitaValue));
					}

					return {
						fillColor: colorValue,
						weight: 1,
						opacity: 1,
						color: 'gray',
						dashArray: '0',
						fillOpacity: 1
					};
				},
				onEachFeature: function(feature, layer) {
					layer.bindPopup(feature.properties.PLACE);
						layer.on({
							mouseover: function(e) {
								const layer = e.target;							
								layer.setStyle({
									weight: 1,
									color: 'gray',
									dashArray: '0',
									fillOpacity: 1
								});
															
								layer.bringToFront();
															
								// Panel de información (comentado como en el original)
								if (layer.feature.properties) {
									// updateInfoPanel(layer.feature.properties);
								}
							},
							mouseout: function(e) {
								geoJsonLayer.resetStyle(e.target);
							},
							click: function(e) {
								const placeName = feature.properties.PLACE;
								console.log(`Estado seleccionado: ${placeName}`);
							}
						});
					}
				}).addTo(mapInstance);
				
				var bounds = geoJsonLayer.getBounds();
				mapInstance.fitBounds(bounds);
				
				// Creamos y añadimos la leyenda
				legendControl = L.control({position: 'bottomright'});
				legendControl.onAdd = function(map) {
				const div = L.DomUtil.create('div', 'info legend');
				div.style.backgroundColor = 'white';
				div.style.borderRadius = '8px';
				div.style.padding = '8px';
				div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
									
				const legendSvg = d3.select(div)
					.append('svg')
					.attr('width', 110)
					.attr('height', 140)
					.style('pointer-events', 'none');
									
					const gradExists = legendSvg.select("defs").size() > 0;
									
					if (!gradExists) {
						const grad = legendSvg.append('defs')
							.append('linearGradient')
							.attr('id', 'legend-grad')
							.attr('x1', '0%')
							.attr('x2', '0%')
							.attr('y1', '0%')
							.attr('y2', '100%');
									
							d3.range(0, 1.01, 0.01).forEach(t => {
								grad.append("stop")
									.attr("offset", `${t * 100}%`)
									.attr("stop-color", d3.interpolateYlOrRd(1 - t));
							});
					}
					legendSvg.append('text')
						.attr('class', 'legend-title')
						.attr('id', 'map-legend-title')
						.attr('x', 50)
						.attr('y', 15)
						.style('text-anchor', 'middle')
						.style('font-size', '12px')
						.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
						.attr('opacity', 1)
						.text(globalState.mapMode === MapMode.OCCURRENCES ? 'Occurrences' : 'Per 100,000');
									
						legendSvg.append('rect')
							.attr('class', 'legend-rect')
							.attr('x', 20)
							.attr('y', 25)
							.attr('width', 20)
							.attr('height', 110)
							.attr('stroke', 'black')
							.style('fill', 'url(#legend-grad)');
									
						const values = globalState.mapMode === MapMode.OCCURRENCES ? 
							[max, Math.round((min + max) / 2), min] : 
							[maxPerCapita, Math.round((minPerCapita + maxPerCapita) / 2), minPerCapita];
									
						legendSvg.append('text')
							.attr('x', 50)
							.attr('y', 35)
							.style('text-anchor', 'start')
							.style('font-size', '12px')
							.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
							.text(Math.round(values[0]));
									
						legendSvg.append('text')
							.attr('x', 50)
							.attr('y', 80)
							.style('text-anchor', 'start')
							.style('font-size', '12px')
							.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
							.text(Math.round(values[1]));
									
						legendSvg.append('text')
							.attr('x', 50)
							.attr('y', 125)
							.style('text-anchor', 'start')
							.style('font-size', '12px')
							.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
							.text(Math.round(values[2]));		
							return div;
						};
						legendControl.addTo(mapInstance);
				}
		});
}

function drawMap3() {
	var mapData = rule_timeline.slice();
	
	// filter data by dates
	if (selectedDatesRules.length > 0) {
			mapData = mapData.filter(d => selectedDatesRules.includes(d.date));
	}
	
	// process data by state
	// mapData = mapData.map(d => d.locations).flat();

	const result = mapData.reduce((acc, { location, count }) => {
		acc[location] = (acc[location] || 0) + count;
		return acc;
	}, {});
	

	const values = Object.values(result);
	const min = values.length > 0 ? Math.min(...values) : 0;
	const max = values.length > 0 ? Math.max(...values) : 100;
	var scale = d3.scaleLinear().domain([min, max]).range([0, 1]);

	// process data by state per capita
	const perCapitaResult = {};
	Object.keys(result).forEach(state => {
			const population = us_state_populations[state];
			perCapitaResult[state] = population ? (result[state] / population) * 100000 : 0;
	});

	const perCapitaValues = Object.values(perCapitaResult);
	const minPerCapita = perCapitaValues.length > 0 ? Math.min(...perCapitaValues) : 0;
	const maxPerCapita = perCapitaValues.length > 0 ? Math.max(...perCapitaValues) : 100;
	const perCapitaScale = d3.scaleLinear().domain([minPerCapita, maxPerCapita]).range([0, 1]);

	var element = document.getElementById('rules-map-view');
	var height = element.clientHeight;
	var width = element.clientWidth;
	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	
	// Check if the SVG already exists
	let svg = d3.select('#rules-map-view svg');
	const svgExists = !svg.empty();
	
	if (!svgExists) {
			// Create the SVG if it doesn't exist
			svg = d3.select('#rules-map-view')
					.append('svg')
					.attr('width', width)
					.attr('height', height);
							
			// Create gradient for legend (only once)
			var grad = svg.append('defs')
					.append('linearGradient')
					.attr('id', 'grad')
					.attr('x1', '0%')
					.attr('x2', '0%')
					.attr('y1', '100%')
					.attr('y2', '0%');
	
			d3.range(0, 1.01, 0.01).forEach(t => {
					grad.append("stop")
							.attr("offset", `${t * 100}%`)
							.attr("stop-color", d3.interpolateYlOrRd(t));
			});
	}

	var scaleVal = 59000;
	
	const projection = d3.geoAlbersUsa()
			.scale(scaleVal)
			.translate([-6300, 3740]); // - +

	const path = d3.geoPath().projection(projection);

	let jsonFile = document.getElementById("json-input").files[0];
	jsonFile.text().then(text => {
		const data = JSON.parse(text);
		return data;
	})
	.then(data => {
					// Si el mapa ya existe, actualizamos los datos
					if (mapInstance2) {
							// Eliminamos la capa GeoJSON actual si existe
							if (geoJsonLayer2) {
									geoJsonLayer2.remove();
							}
							
							// Eliminamos la leyenda si existe
							if (legendControl2) {
									mapInstance2.removeControl(legendControl2);
							}
							
							// Creamos nueva capa GeoJSON con datos actualizados
							geoJsonLayer2 = L.geoJSON(data, {
									style: function(feature) {
											const placeName = feature.properties.PLACE;
											let colorValue; 
											if (globalState.mapMode === MapMode.OCCURRENCES) {
													colorValue = colorsScale(scale(result[placeName] || 0));
											}
											
											const rawValue = result[placeName] || 0;
											const population = us_state_populations[placeName];
											const perCapitaValue = population ? (rawValue / population) * 100000 : 0;

											if (globalState.mapMode === MapMode.PER_CAPITA) {
													colorValue = colorsScale(perCapitaScale(perCapitaValue));
											}

											return {
													fillColor: colorValue,
													weight: 1,
													opacity: 1,
													color: 'gray',
													dashArray: '0',
													fillOpacity: 1
											};
									},
									onEachFeature: function(feature, layer) {
											layer.bindPopup(feature.properties.PLACE);
											layer.on({
													mouseover: function(e) {
															const layer = e.target;
															
															layer.setStyle({
																	weight: 1,
																	color: 'gray',
																	dashArray: '0',
																	fillOpacity: 1
															});
															
															layer.bringToFront();
															
															// Panel de información (comentado como en el original)
															if (layer.feature.properties) {
																	// updateInfoPanel(layer.feature.properties);
															}
													},
													mouseout: function(e) {
															geoJsonLayer2.resetStyle(e.target);
													},
													click: function(e) {
															const placeName = e.target.feature.properties.PLACE;
															console.log(`Estado seleccionado: ${placeName}`);
													}
											});
									}
							}).addTo(mapInstance2);

							/*var bounds = geoJsonLayer2.getBounds();
							mapInstance2.fitBounds(bounds);*/

							// Creamos y añadimos la nueva leyenda
							legendControl2 = L.control({position: 'bottomright'});
							legendControl2.onAdd = function(map) {
									const div = L.DomUtil.create('div', 'info legend');
									div.style.backgroundColor = 'white';
									div.style.borderRadius = '8px';
									div.style.padding = '8px';
									div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
									
									const legendSvg = d3.select(div)
											.append('svg')
											.attr('width', 110)
											.attr('height', 140)
											.style('pointer-events', 'none');
									
									const gradExists = legendSvg.select("defs").size() > 0;
									if (!gradExists) {
											const grad = legendSvg.append('defs')
													.append('linearGradient')
													.attr('id', 'legend-grad2')
													.attr('x1', '0%')
													.attr('x2', '0%')
													.attr('y1', '0%')
													.attr('y2', '100%');
									
											d3.range(0, 1.01, 0.01).forEach(t => {
													grad.append("stop")
															.attr("offset", `${t * 100}%`)
															.attr("stop-color", d3.interpolateYlOrRd(1 - t));
											});
									}
									
									legendSvg.append('text')
											.attr('class', 'legend-title')
											.attr('id', 'map-legend-title')
											.attr('x', 50)
											.attr('y', 15)
											.style('text-anchor', 'middle')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.attr('opacity', 1)
											.text(globalState.mapMode === MapMode.OCCURRENCES ? 'Occurrences' : 'Per 100,000');
									
									legendSvg.append('rect')
											.attr('class', 'legend-rect')
											.attr('x', 20)
											.attr('y', 25)
											.attr('width', 20)
											.attr('height', 110)
											.attr('stroke', 'black')
											.style('fill', 'url(#legend-grad2)');
									
									const values = globalState.mapMode === MapMode.OCCURRENCES ? 
											[max, Math.round((min + max) / 2), min] : 
											[maxPerCapita, Math.round((minPerCapita + maxPerCapita) / 2), minPerCapita];
									
									legendSvg.append('text')
											.attr('x', 50)
											.attr('y', 35)
											.style('text-anchor', 'start')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.text(Math.round(values[0]));
									
									legendSvg.append('text')
											.attr('x', 50)
											.attr('y', 80)
											.style('text-anchor', 'start')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.text(Math.round(values[1]));
									
									legendSvg.append('text')
											.attr('x', 50)
											.attr('y', 125)
											.style('text-anchor', 'start')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.text(Math.round(values[2]));
									
									return div;
							};
							legendControl2.addTo(mapInstance2);
					} else {
							// Creamos el mapa por primera vez
							var centerVal = [37.8, -96];
							var zoomVal = 4;
							mapInstance2 = L.map('rules-map-view', {
									zoomControl: false,
									attributionControl: false
							}).setView(centerVal, zoomVal);
														
							// Añadimos capa base
							L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  								attribution: '&copy; OpenStreetMap &copy; CartoDB',
    							subdomains: 'abcd',
    							maxZoom: 19
							}).addTo(mapInstance2);

							// Creamos capa GeoJSON
							geoJsonLayer2 = L.geoJSON(data, {
									style: function(feature) {
											const placeName = feature.properties.PLACE;
											let colorValue; 
											if (globalState.mapMode === MapMode.OCCURRENCES) {
													colorValue = colorsScale(scale(result[placeName] || 0));
											}
											
											const rawValue = result[placeName] || 0;
											const population = us_state_populations[placeName];
											const perCapitaValue = population ? (rawValue / population) * 100000 : 0;

											if (globalState.mapMode === MapMode.PER_CAPITA) {
													colorValue = colorsScale(perCapitaScale(perCapitaValue));
											}

											return {
													fillColor: colorValue,
													weight: 1,
													opacity: 1,
													color: 'gray',
													dashArray: '0',
													fillOpacity: 1
											};
									},
									onEachFeature: function(feature, layer) {
											layer.bindPopup(feature.properties.PLACE);
											layer.on({
													mouseover: function(e) {
															const layer = e.target;
															
															layer.setStyle({
																	weight: 1,
																	color: 'gray',
																	dashArray: '0',
																	fillOpacity: 1
															});
															
															layer.bringToFront();
															
															// Panel de información (comentado como en el original)
															if (layer.feature.properties) {
																	// updateInfoPanel(layer.feature.properties);
															}
													},
													mouseout: function(e) {
															geoJsonLayer2.resetStyle(e.target);
													},
													click: function(e) {
															const placeName = e.target.feature.properties.PLACE;
															selectedplaceName.push(placeName);
															console.log(`Estado seleccionado: ${placeName}`);
													}
											});
									}
							}).addTo(mapInstance2);
							
							var bounds = geoJsonLayer2.getBounds();
							mapInstance2.fitBounds(bounds);

							// Creamos y añadimos la leyenda
							legendControl2 = L.control({position: 'bottomright'});
							legendControl2.onAdd = function(map) {
									const div = L.DomUtil.create('div', 'info legend');
									div.style.backgroundColor = 'white';
									div.style.borderRadius = '8px';
									div.style.padding = '8px';
									div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
									
									const legendSvg = d3.select(div)
											.append('svg')
											.attr('width', 110)
											.attr('height', 140)
											.style('pointer-events', 'none');
									
									const gradExists = legendSvg.select("defs").size() > 0;
									
									if (!gradExists) {
											const grad = legendSvg.append('defs')
													.append('linearGradient')
													.attr('id', 'legend-grad2')
													.attr('x1', '0%')
													.attr('x2', '0%')
													.attr('y1', '0%')
													.attr('y2', '100%');
									
											d3.range(0, 1.01, 0.01).forEach(t => {
													grad.append("stop")
															.attr("offset", `${t * 100}%`)
															.attr("stop-color", d3.interpolateYlOrRd(1 - t));
											});
									}
									
									legendSvg.append('text')
											.attr('class', 'legend-title')
											.attr('id', 'map-legend-title')
											.attr('x', 50)
											.attr('y', 15)
											.style('text-anchor', 'middle')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.attr('opacity', 1)
											.text(globalState.mapMode === MapMode.OCCURRENCES ? 'Occurrences' : 'Per 100,000');
									
									legendSvg.append('rect')
											.attr('class', 'legend-rect')
											.attr('x', 20)
											.attr('y', 25)
											.attr('width', 20)
											.attr('height', 110)
											.attr('stroke', 'black')
											.style('fill', 'url(#legend-grad2)');
									
									const values = globalState.mapMode === MapMode.OCCURRENCES ? 
											[max, Math.round((min + max) / 2), min] : 
											[maxPerCapita, Math.round((minPerCapita + maxPerCapita) / 2), minPerCapita];
									
									legendSvg.append('text')
											.attr('x', 50)
											.attr('y', 35)
											.style('text-anchor', 'start')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.text(Math.round(values[0]));
									
									legendSvg.append('text')
											.attr('x', 50)
											.attr('y', 80)
											.style('text-anchor', 'start')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.text(Math.round(values[1]));
									
									legendSvg.append('text')
											.attr('x', 50)
											.attr('y', 125)
											.style('text-anchor', 'start')
											.style('font-size', '12px')
											.style('font-family', 'Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif')
											.text(Math.round(values[2]));
									
									return div;
							};
							legendControl2.addTo(mapInstance2);
					}
			});
}

// Helper function to update legend text values
function updateLegendText(svg, width, height, min, max) {
	// Update max value
	let maxText = svg.select('.legend-max');
	const mapLegendTitle = document.getElementById('map-legend-title')

	if (globalState.mapMode === MapMode.OCCURRENCES) {
		mapLegendTitle.textContent = 'Occurrences';
	} else {
		mapLegendTitle.textContent = 'Per 100,000';
	}

	if (maxText.empty()) {
			maxText = svg.append('text')
					.attr('class', 'legend-max')
					.attr('x', width - 60 + 5)
					.attr('y', height/2 - (height - height/2)/2 + 13)
					.style('text-anchor', 'start')
					.style('font-size', '12px')
					.style('font-weight', 'bold');
	}
	
	maxText.transition()
			.duration(750)
			.tween("text", function() {
					const currentValue = parseFloat(this.textContent) || 0;
					const i = d3.interpolate(currentValue, max);
					return function(t) {
							this.textContent = Math.round(i(t));
					};
			});
	
	// Update middle value
	let midText = svg.select('.legend-mid');
	if (midText.empty()) {
			midText = svg.append('text')
					.attr('class', 'legend-mid')
					.attr('x', width - 60 + 5)
					.attr('y', height/2)
					.style('text-anchor', 'start')
					.style('font-size', '12px')
					.style('font-weight', 'bold');
	}
	
	midText.transition()
			.duration(750)
			.tween("text", function() {
					const currentValue = parseFloat(this.textContent) || 0;
					const i = d3.interpolate(currentValue, Math.round((min + max)/2));
					return function(t) {
							this.textContent = Math.round(i(t));
					};
			});
	
	// Update min value
	let minText = svg.select('.legend-min');
	if (minText.empty()) {
			minText = svg.append('text')
					.attr('class', 'legend-min')
					.attr('x', width - 60 + 5)
					.attr('y', height/2 + (height - height/2)/2)
					.style('text-anchor', 'start')
					.style('font-size', '12px')
					.style('font-weight', 'bold');
	}
	
	minText.transition()
			.duration(750)
			.tween("text", function() {
					const currentValue = parseFloat(this.textContent) || 0;
					const i = d3.interpolate(currentValue, min);
					return function(t) {
							this.textContent = Math.round(i(t));
					};
			});
}

//constants
const margin = { top: 5, right: 15, bottom: 5, left: 10 };

function drawClusterInfo(all_attributes, cluster_ids,cluster_representations,cluster_sizes,cluster_timeline,dates){
	//reset selection
	selectedClusters = [];
	selectedDates = [];
	//create initial cluster map
	rules_selected = [];
	attributes_selected = [];
	var clusterMap = {};
	for (let i = 0; i<cluster_representations.length; i++){
		var cid = cluster_representations[i].id;
		var cdata = cluster_representations[i].count;
		clusterMap[cid] = {};
		for (let j = 0; j < cdata.length; j++){
			clusterMap[cid][cdata[j][0]] = cdata[j][1]
		}
	}

	d3.select('#cluster-view').selectAll('svg').remove();
	d3.select('#cluster-header').selectAll('svg').remove();
	d3.select('#cluster-heatmap').selectAll('svg').remove();
	d3.select('#heatmap-header').selectAll('svg').remove();
	var element = document.getElementById('cluster-view');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;

	var clusterViewHeader = document.getElementById('cluster-view-header');
	var fullHeightClusterHeader = clusterViewHeader.clientHeight;
	var fullWidthClusterHeader = clusterViewHeader.clientWidth;

	if (margin.top + 30*cluster_ids.length > fullHeight){
		fullHeight = margin.top + 30*cluster_ids.length;
	}

	// Constants to add two separate G in same SVG
	var svg = d3.select('#cluster-view')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);
	
	var svgClusterHeader = d3.select('#cluster-view-header')
		.append('svg')
		.attr('width', fullWidthClusterHeader)
		.attr('height', fullHeightClusterHeader + margin.bottom);

	var height = fullHeight - margin.top - margin.bottom;
	// Constants for G1
	var width1 = fullWidth - margin.left - margin.right;
	var widthClusterHeader = fullWidth - margin.left - margin.right;
	width1 = width1;

	const g1 = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_background = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_hselector = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_clusters = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_selector = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	const gClusterHeader = svgClusterHeader.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + 80 + ')');

	var xScale = d3.scaleBand()
		.domain(all_attributes)
		.range([0, width1])
		.padding(0);

	/*Apply reorderjs to clusters*/
	var cluster_matrix = [];
	for(let i = 0; i < cluster_ids.length; i++){
		var cluster_row = cluster_timeline.filter(d => d.id == cluster_ids[i]);
		cluster_row = cluster_row.map(d => d.count);
		cluster_matrix.push(cluster_row);
	}
	var perm = reorder.optimal_leaf_order()(cluster_matrix);
	var permIds = [];
	for (let i = 0; i < cluster_ids.length; i++) {
		permIds.push(cluster_ids[perm[i]]);
	}
	cluster_ids = permIds.slice();

	var yScale = d3.scaleBand()
		.domain(cluster_ids)
		.range([height, 0])
		.padding(0);

	const axisGroup = gClusterHeader.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale).tickSize(0));
		
	axisGroup.select(".domain").remove();

	var tooltip = d3.select("#tooltip");

	axisGroup.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "10px")
		.attr("fill", 'black')
		.attr("dx", ".05em")
		.attr("dy", ".1em")
		.attr("transform", "rotate(-55)")
		.text(d => d.slice(0, -2))
		.on("mouseover", function (event, d) {
            var x = event.clientX;
            var y = event.clientY;
            x = x - 40;
            y = y - 60;

            tooltip.style("display", "block");
            tooltip.html('<p>' + d.slice(0, -2) + '</p>')
                .style("left", x + "px")
                .style("top", y + "px");
        })
        .on("mouseout", function (d) {
            tooltip.style("display", "none");
        });


	g1_background.selectAll('rect')
		.data(all_attributes)
		.enter()
		.append('rect')
		.attr('x', d => xScale(d))
		.attr('y', 0)
		.attr('width', xScale.bandwidth())
		.attr('height', height)
		.attr('fill', (d, i) => i % 2 == 0 ? 'white' : bg_color)
		.attr('opacity', 1);

	g1_hselector.selectAll('rect')
		.data(all_attributes)
		.enter()
		.append('rect')
		.attr('id', (d,i) => 'hselect_' + i)
		.attr('x', d => xScale(d))
		.attr('y', 0)
		.attr('width', xScale.bandwidth())
		.attr('height', height)
		.attr('fill', hselector_color)
		.attr('opacity', 0);

	var cluster_lines = [];
	var cluster_data = [];
	for (let i = 0; i < cluster_representations.length; i++) {
		var all_x = cluster_representations[i].count.map(d => xScale(d[0]));
		var min = Math.min(...all_x);
		var max = Math.max(...all_x);
		cluster_lines.push({ 'id': cluster_representations[i].id, 'start': min, 'end': max });
		const curr_cluster = cluster_representations[i].count.map(([attr, value]) => ({
			id: cluster_representations[i].id, attr, value,
			type: attr[attr.length - 1]
		}));
		cluster_data.push(curr_cluster);
	}
	cluster_data = cluster_data.flat();
	g1_clusters.selectAll("line")
		.data(cluster_lines)
		.enter()
		.append("line")
		.attr("x1", d => d.start + xScale.bandwidth() / 2)
		.attr("x2", d => d.end + xScale.bandwidth() / 2)
		.attr("y1", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("y2", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("stroke", rect_stroke)
		.attr("stroke-width", 2);

	var min_r = Math.min(...[xScale.bandwidth() / 2, yScale.bandwidth() / 2]);

	g1_clusters.selectAll('circle')
		.data(cluster_data)
		.enter()
		.append('circle')
		.attr('cx', d => xScale(d.attr) + (xScale.bandwidth()) / 2)
		.attr('cy', d => yScale(d.id) + (yScale.bandwidth()) / 2)
		.attr('r', d => min_r/4 + (d.value / cluster_sizes[d.id]) * (min_r - min_r/4))
		.attr('stroke', rect_stroke)
		.attr('fill', d => (d.type == 'A' ? color_a : color_c))
		.attr('opacity', 1);
	
	g1_selector.selectAll('rect')
		.data(cluster_ids)
		.enter()
		.append('rect')
		.attr('id', d => 'box_' + d)
		.attr('class', 'cluster_box')
		.attr('x', 0)
		.attr('y', d => yScale(d))
		.attr('width', width1)
		.attr('height', yScale.bandwidth())
		.attr('fill', 'red')
		.attr('fill-opacity', 0)
		.attr('stroke', rect_stroke)
		.attr('stroke-opacity', 1)
		.attr('rx', 2)
		.attr('cursor', 'pointer')
		.on('click', function (event, d) {			
			if (selectedClusters.length == 0) {
				d3.select(this)
					.attr('fill-opacity', 0.15);
				selectedClusters = [d];
				d3.selectAll('.cluster_dot')
					.attr('stroke', 'black');
				d3.select('#circle_'+d)
					.attr('stroke', 'red');
			}
			else {
				if (selectedClusters[0] == d){
					selectedClusters = [];
					d3.select(this)
						.attr('fill-opacity', 0);
					d3.selectAll('.cluster_dot')
						.attr('stroke', 'black');
					
				}
				else{
					selectedClusters = [d];
					d3.selectAll('.cluster_box')
						.attr('fill-opacity', 0);
					d3.select(this)
						.attr('fill-opacity', 0.15);
					d3.selectAll('.cluster_dot')
						.attr('stroke', 'black');
					d3.select('#circle_'+d)
						.attr('stroke', 'red');
				}

				// const index = selectedClusters.indexOf(d);
				// selectedClusters.splice(index, 1);
			}
			if (selectedClusters.length !== 0) {
        		globalState.setSelectedCluster(selectedClusters[0]);
				get_rules_locations_from_cluster(d);
      		}
			if (geoJsonLayer2) { // remove previous geojson layer
				geoJsonLayer2.remove();
			}

			drawMap();
		});
	// Cluster heatmap
	var element = document.getElementById('cluster-heatmap');
	var elementHeader = document.getElementById('cluster-heatmap-header');
	var fullHeight = element.clientHeight;
	var fullHeightHeatmapHeader = elementHeader.clientHeight;
	var fullWidth = element.clientWidth;
	var fullWidthHeatmapHeader = elementHeader.clientWidth;
	if (margin.top + 30*cluster_ids.length > fullHeight){
		fullHeight = margin.top + 30*cluster_ids.length;
	}

	// Constants to add two separate G in same SVG
	var svg = d3.select('#cluster-heatmap')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);
	
	var svgHeatmapHeader = d3.select('#cluster-heatmap-header')
		.append('svg')
		.attr('width', fullWidthHeatmapHeader)
		.attr('height', fullHeightHeatmapHeader);

	var colorBarWidth = margin.right*4;
	var width2 = fullWidth - margin.left - colorBarWidth;
	var widthHeatmapHeader = fullWidthHeatmapHeader - margin.left - colorBarWidth;
	var colorBarHeight = element.clientHeight - margin.top;

	const g2 = svg.append('g')
		.attr('transform', 'translate(' + (margin.left)  + ',' + margin.top + ')');
	const g2_clusters = svg.append('g')
		.attr('transform', 'translate(' + (margin.left) + ',' + margin.top + ')');
	const g2_hbars = svg.append('g')
		.attr('transform', 'translate(' + (margin.left) + ',' + margin.top + ')');
	
	const gHeatmapHeader = svgHeatmapHeader.append('g')
		.attr('transform', 'translate(' + (margin.left)  + ',' + fullHeightHeatmapHeader + ')');

	var xScale2 = d3.scaleBand()
		.domain(dates)
		.range([0, width2])
		.padding(0);

	var rect_width = xScale2.bandwidth();
	var rect_height = yScale.bandwidth();

	// Add X axis
	gHeatmapHeader.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale2).tickSize(0))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "11px")
		.attr("dx", ".4em")
		.attr("dy", ".4em")
		.attr("color", d=>{
			const year = d.slice(0, 4);
			if (year % 2 == 0){
				return date_label_1;
			}
			else{
				return date_label_2;
			}
		})
		.attr('cursor', 'pointer')
		.attr("transform", "rotate(-55)")
		.on('click', function (event, d) {
			var current = d3.select(this);
			if (!current.classed("date_clicked")) {
				current.classed('date_clicked', true);
				current.attr("color", 'red');

				selectedDates.push(d);
				d3.select('#datebar_' + d)
					.attr('stroke-opacity', 1);
			}
			else {
				current.classed('date_clicked', false);
				current.attr("color", d=>{
					const year = d.slice(0, 4);
					if (year % 2 == 0){
						return date_label_1;
					}
					else{
						return date_label_2;
					}
				});

				const index = selectedDates.indexOf(d);
				selectedDates.splice(index, 1); 
				d3.select('#datebar_' + d)
					.attr('stroke-opacity', 0);
				
			}
			drawMap();
		})
		.text(d=>{
			const month = d.slice(-2);
			const year = d.slice(0, 4);
			const date = new Date(2000, parseInt(month, 10) - 1);
			if (month == '01'){
				return new Intl.DateTimeFormat('en', { month: 'short' }).format(date) + ' ' + year;
			}
			else{
				return new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
			}
		});
	
	gHeatmapHeader.append('text')
		.attr('x', width2/2)
		.attr('y', -60)
		.style('text-anchor', 'middle')
		.style('font-size','12px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text('DATES');

	var all_x = cluster_timeline.map(d => d.count);
	var min = Math.min(...all_x);
	var max = Math.max(...all_x);

	var occurrenceScale = d3.scaleLinear()
		.domain([min, max])
		.range([0, 1]);

	g2_clusters.selectAll("rect")
		.data(cluster_timeline)
		.enter()
		.append("rect")
		.attr('class', 'timeline-box')
		.attr('id', d => 'clusterbar_' + d.id + '_date_' + d.date)
		.attr("x", d => xScale2(d.date))
		.attr("y", d => yScale(d.id))
		.attr("width", xScale2.bandwidth())
		.attr("height", d => yScale.bandwidth())
		.attr("fill", d => d3.interpolateMagma(occurrenceScale(d.count)));

	g2_hbars.selectAll("rect")
		.data(dates)
		.enter()
		.append("rect")
		.attr('id', d => 'datebar_' + d)
		.attr("x", d => xScale2(d))
		.attr("y", 0)
		.attr("width", xScale2.bandwidth())
		.attr("height", height)
		.attr("fill", 'transparent')
		.attr("stroke", "red")
		.attr("stroke-opacity", 0)

	var grad = svg.append('defs')
		.append('linearGradient')
		.attr('id', 'grad_magma')
		.attr('x1', '0%')
		.attr('x2', '0%')
		.attr('y1', '100%')
		.attr('y2', '0%');
		
	d3.range(0, 1.01, 0.01).forEach(t => {
		grad.append("stop")
		.attr("offset", `${t * 100}%`)
		.attr("stop-color", d3.interpolateMagma(t));
	});

	// heatmap border
	g2_clusters.append('rect')
		.attr('x', 0)
		.attr('y', 0) 
		.attr('width', width2)
		.attr('height', height)
		.attr('stroke','black')
		.style('fill', 'transparent');


	// color legend
	g2.append('rect')
		.attr('x', width2 + 10)
		.attr('y', colorBarHeight/2 - colorBarHeight/4) 
		.attr('width', colorBarWidth/3)
		.attr('height', colorBarHeight/2)
		.attr('stroke','black')
		.style('fill', 'url(#grad_magma)');

	g2.append('text')
		.attr('x', width2 + 25 + (colorBarWidth/3)/4)
		.attr('y', colorBarHeight/2 - colorBarHeight/4 - 5)
		.style('text-anchor', 'middle')
		.style('font-size','10px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text('Occurrences');

	g2.append('text')
		.attr('x', width2 + 40 + (colorBarWidth/3)/4)
		.attr('y', colorBarHeight/2 - colorBarHeight/4 + 10)
		.style('text-anchor', 'middle')
		.style('font-size','12px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text(max);

	g2.append('text')
		.attr('x', width2 + 40 + (colorBarWidth/3)/4)
		.attr('y', colorBarHeight/2 + colorBarHeight/4)
		.style('text-anchor', 'middle')
		.style('font-size','12px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text(min);
}

function drawClusterInfoNoDuplicates() {
	d3.select('#72').selectAll('svg').remove();
	// Get Scatterplot container
	var element = document.getElementById('cluster-view');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;
	var svg = d3.select('#cluster-view')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);

	// Set dimensions
	var margin = { top: 10, right: 20, bottom: 10, left: 20 };
	var width = fullWidth - margin.left - margin.right;
	var height = fullHeight - margin.top - margin.bottom;

	const g = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	const g_clusters = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	const g_background = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	var attributes = all_attributes.map(d => d.slice(0, -2));
	attributes = [...new Set(attributes)];
	
	var xScale = d3.scaleBand()
		.domain(attributes)
		.range([0, width])
		.padding(0);

	var yScale = d3.scaleBand()
		.domain(cluster_ids)
		.range([height, 0])
		.padding(0);

	var rect_width = xScale.bandwidth() / 2;
	var rect_height = yScale.bandwidth() / 2;
	// Add X axis
	g.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale).tickSize(2))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "9px")
		.attr("dx", ".4em")
		.attr("dy", ".4em")
		.attr("transform", "rotate(-60)");;

	// Add Y axis
	g.append('g')
		.call(d3.axisLeft(yScale));

	// Add background
	g_background.selectAll('rect')
		.data(attributes)
		.enter()
		.append('rect')
		.attr('x', d => xScale(d))
		.attr('y', 0)
		.attr('width', xScale.bandwidth())
		.attr('height', height)
		.attr('fill', (d, i) => i % 2 == 0 ? 'white' : 'black')
		.attr('opacity', 0.05)
		.attr('rx', 2);

	// Create real data
	var cluster_lines = [];
	var cluster_data = [];
	for (let i = 0; i < cluster_representations.length; i++) {
		var all_x = cluster_representations[i].count.map(d => xScale(d[0]));
		var min = Math.min(...all_x);
		var max = Math.max(...all_x);
		cluster_lines.push({ 'id': cluster_representations[i].id, 'start': min, 'end': max });
		const curr_cluster = cluster_representations[i].count.map(([attr, value]) => ({
			id: cluster_representations[i].id, attr: attr.slice(0, -2), value,
			type: attr[attr.length - 1]
		}));
		cluster_data.push(curr_cluster);
	}
	cluster_data = cluster_data.flat();
	g_clusters.selectAll("line")
		.data(cluster_lines)
		.enter()
		.append("line")
		.attr("x1", d => d.start + xScale.bandwidth() / 2)
		.attr("x2", d => d.end + xScale.bandwidth() / 2)
		.attr("y1", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("y2", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("stroke", 'black')
		.attr("stroke-width", 2);

	var min_r = Math.min(...[xScale.bandwidth() / 2, yScale.bandwidth() / 2]);
	g_clusters.selectAll('circle')
		.data(cluster_data)
		.enter()
		.append('circle')
		.attr('cx', d => xScale(d.attr) + (xScale.bandwidth()) / 2)
		.attr('cy', d => yScale(d.id) + (yScale.bandwidth()) / 2)
		.attr('r', d => (d.value / cluster_sizes[d.id]) * min_r)
		.attr('stroke', rect_stroke)
		.attr('fill', d => (d.type == 'A' ? color_a : color_c));
}

function drawClusterTimeline() {
	d3.select('#cluster-timeline').selectAll('svg').remove();
	var element = document.getElementById('cluster-timeline');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;
	var svg = d3.select('#cluster-timeline')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);

	var width = fullWidth - margin.left - margin.right;
	var height = fullHeight - margin.top - margin.bottom;

	const g = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g_clusters = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g_texts = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	var xScale = d3.scaleBand()
		.domain(dates)
		.range([0, width])
		.padding(0);

	var yScale = d3.scaleBand()
		.domain(cluster_ids)
		.range([height, 0])
		.padding(0);

	var rect_width = xScale.bandwidth() / 2;
	var rect_height = yScale.bandwidth() / 2;
	// Add X axis
	g.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale).tickSize(0))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "9px")
		.attr("dx", ".8em")
		.attr("dy", ".8em")
		.attr("transform", "rotate(-90)");


	var all_x = cluster_timeline.map(d => d.count);
	var min = Math.min(...all_x);
	var max = Math.max(...all_x);
	var occurrenceScale = d3.scaleLinear()
		.domain([min, max])
		.range([0, 1])

	g_clusters.selectAll("rect")
		.data(cluster_timeline)
		.enter()
		.append("rect")
		.attr("x", d => xScale(d.date))
		.attr("y", d => yScale(d.id) + (yScale.bandwidth() - occurrenceScale(d.count) * yScale.bandwidth()) / 2)
		.attr("width", xScale.bandwidth())
		.attr("height", d => occurrenceScale(d.count) * yScale.bandwidth())
		.attr("fill", d => d3.interpolateYlOrRd(occurrenceScale(d.count)));

	g_clusters.selectAll("text")
		.data(cluster_timeline)
		.enter()
		.append("text")
		.attr("x", d => xScale(d.date))
		.attr("y", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr('font-size', '10px')
		.attr('stroke', '#23b802')
		.text(d => d.count);
}

function drawRulesView(data) {
	// Remove all previous elements in svg
	d3.select('#rules-view').selectAll('svg').remove();
	// Get Scatterplot container
	var element = document.getElementById('rules-view');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;
	fullHeight = 20 * (data.rules.length) + margin.top;
	// Create an SVG element and append it to the left div
	var svg = d3.select('#rules-view')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);

	var width = fullWidth - margin.left - margin.right;
	var height = fullHeight - margin.top - margin.bottom;

	// Get cluster labels
	var attribute_labels = null;
	if ("attributes" in data){
		attribute_labels = data['attributes'];
	}
	else{
		attribute_labels = all_attributes;
	}
	var rule_labels = data.rules.map(d => d.id);
	// Create value matrix
	var rule_matrix = [];
	var A_labels = attribute_labels.filter(d => d.slice(-1) == 'A');
	var C_labels = attribute_labels.filter(d => d.slice(-1) == 'C');
	for (let i = 0; i < data.rules.length; i++) {
		var rule_row = [];
		for (let j = 0; j < A_labels.length; j++) {
			if (data.rules[i].antecedent.includes(A_labels[j])) {
				rule_row.push(1);
			}
			else {
				rule_row.push(0);
			}
		}
		for (let j = 0; j < C_labels.length; j++) {
			if (data.rules[i].consequent.includes(C_labels[j])) {
				rule_row.push(-1);
			}
			else {
				rule_row.push(0);
			}
		}
		rule_matrix.push(rule_row);
	}
	var perm = reorder.optimal_leaf_order()(rule_matrix);
	var permIds = [];
	for (let i = 0; i < rule_labels.length; i++) {
		// permIds.push(rule_labels[perm[i]]);
		permIds.push(rule_labels[i]);
	}	
	rule_labels = permIds.slice();	

	// Add new elements
	const g = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	const g_background = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g_selector = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g_rules = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	var xScale = d3.scaleBand()
		.domain(attribute_labels)
		.range([0, width])
		.padding(0);

	var yScale = d3.scaleBand()
		.domain(rule_labels)
		.range([0, height])
		.padding(0);

	var rect_width = xScale.bandwidth() / 2;
	var rect_height = yScale.bandwidth() / 2;
	// Add X axis
	g.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale).tickSize(0))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "9px")
		.attr("dx", ".8em")
		.attr("dy", ".8em")
		.attr("transform", "rotate(-90)")
		.text(d => d.slice(0, -2))
		.on('click', function (event, d) {
			var index = attribute_labels.indexOf(d);
			d3.select("#rect_"+index)
				.attr('fill', "yellow");
		});

	// Add Y axis
	g.append('g')
		.call(d3.axisLeft(yScale))
		.selectAll("text")
		.style("font-size", "7px")
		.text((d,i) => i + ". " + d);

	// Add background
	g_background.selectAll('rect')
		.data(attribute_labels)
		.enter()
		.append('rect')
		.attr('id', (d,i)=>'rect_'+i)
		.attr('x', d => xScale(d))
		.attr('y', 0)
		.attr('width', xScale.bandwidth())
		.attr('height', height)
		.attr('stroke', 'transparent')
		.attr('fill', (d, i) => i % 2 == 0 ? 'white' : 'black')
		.attr('opacity', 0.15)
		.attr('rx', 2);

	g_selector.selectAll('rect')
		.data(rule_labels)
		.enter()
		.append('rect')
		.attr('id', d => 'rule_' + d)
		.attr('x', 0)
		.attr('y', d => yScale(d))
		.attr('width', width)
		.attr('height', yScale.bandwidth())
		.attr('fill', rect_stroke)
		.attr('opacity', 0)
		.attr('stroke', rect_stroke)
		.attr('rx', 2)
		.on('mouseover', function (event, d) {
			var current = d3.select(this);
			if (!current.classed("box_clicked")) {
				d3.select(this).attr('opacity', 0.35);
			}
		})
		.on('mouseleave', function (event, d) {
			var current = d3.select(this);
			if (!current.classed("box_clicked")) {
				d3.select(this).attr('opacity', 0);
			}
		})
		.on('click', function (event, d) {
			var current = d3.select(this);
			if (!current.classed("box_clicked")) {
				current.attr('opacity', 0.5)
					.classed('box_clicked', true);
				rules_selected.push(d);
			}
			else {
				current.attr('opacity', 0)
					.classed('box_clicked', false);

				const index = rules_selected.indexOf(d);
				rules_selected.splice(index, 1); // 2nd parameter means remove one item only
			}
		});

	// Create real data
	var rule_data = [];
	var rule_lines = [];
	var rules = data.rules;
	for (let i = 0; i < rules.length; i++) {
		var all_x = [];
		for (let j = 0; j < rules[i]['antecedent'].length; j++) {
			var attr = rules[i]['antecedent'][j];
			rule_data.push({ 'id': rules[i].id, 'attr': attr, 'type': 'A' });
			all_x.push(xScale(attr));
		}
		for (let j = 0; j < rules[i]['consequent'].length; j++) {
			var attr = rules[i]['consequent'][j];
			rule_data.push({ 'id': rules[i].id, 'attr': attr, 'type': 'C' });
			all_x.push(xScale(attr));
		}
		var min = Math.min(...all_x);
		var max = Math.max(...all_x);
		rule_lines.push({ 'id': rules[i].id, 'start': min, 'end': max });
	}

	g_rules.selectAll("line")
		.data(rule_lines)
		.enter()
		.append("line")
		.attr("x1", d => d.start + xScale.bandwidth() / 2)
		.attr("x2", d => d.end + xScale.bandwidth() / 2)
		.attr("y1", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("y2", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("stroke", d => d.id == data.centroid ? 'red' : rect_stroke)
		.attr("stroke-width", 3);

	g_rules.selectAll('rect')
		.data(rule_data)
		.enter()
		.append('rect')
		.attr('x', d => xScale(d.attr) + (xScale.bandwidth() - rect_width) / 2)
		.attr('y', d => yScale(d.id) + (yScale.bandwidth() - rect_height) / 2)
		.attr('width', rect_width)
		.attr('height', rect_height)
		.attr('stroke', rect_stroke)
		.attr('fill', d => (d.type == 'A' ? color_a : color_c))
		.attr('rx', 2);
}

function drawIntersections(data) {
	d3.select('#rule-intersections').selectAll('svg').remove();
	var element = null;
	const elements = document.getElementsByClassName("tabcontent");  
  	// Loop through the elements and return the one with the 'active' class
  	for (let i = 0; i < elements.length; i++) {
	    if (elements[i].classList.contains('active')) {
      		element = elements[i]; // Return the element with the 'active' class
    	}
  	}
	// var element = document.getElementById('rule-intersections');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;

	var margins = { left: 30, right: 10, top: 10, bottom: 20 };
	var svg = d3.select('#rule-intersections')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);

	var width = fullWidth - margins.left - margins.right;
	var height = fullHeight - margins.top - margins.bottom;
	var years = ['2016', '2017', '2018', '2019'];
	var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
	var yearScale = d3.scaleBand().domain(years).range([0, height]).padding(0.2);
	var monthScale = d3.scaleBand().domain(months).range([0, width]).padding(0);

	const g_background = svg.append('g')
		.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');
	const g = svg.append('g')
		.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');
	
	g_background.selectAll('rect')
		.data(months)
		.enter()
		.append('rect')
		.attr('x', d => monthScale(d))
		.attr('y', 0)
		.attr('width', monthScale.bandwidth())
		.attr('height', height)
		.attr('fill', (d, i) => i % 2 == 0 ? '#f1ffed' : '#edf0ff')
		.attr('opacity', 1)
		.attr('rx', 2);

	years.forEach(function (year) {
		var ruleScale = d3.scalePoint().domain(rules_selected).range([0, yearScale.bandwidth()]);
		const g3 = g.append('g')
			.attr('transform', 'translate(0,' + yearScale(year) + ')')
		const g2 = g.append('g')
			.attr('transform', 'translate(0,' + yearScale(year) + ')')
			.call(d3.axisLeft(ruleScale));
		

		g2.append('text')
			.attr("x", width / 2)
			.attr("y", -5)
			.attr('font-size', '10px')
			.attr('stroke', 'black')
			.attr('text-anchor', 'start')
			.text(year);

		var data_year = data.filter(d => d.date.slice(0, -3) == year);
		var all_counts = data_year.map(d => d.count);
		var min = Math.min(...all_counts);
		var max = Math.max(...all_counts);

		var widthScale = d3.scaleLinear().domain([min, max]).range([0.15, 0.9]);

		var final_data = [];
		var lines = [];
		months.forEach(function (month) {
			var data_month = data_year.filter(d => d.date.slice(5) == month);
			data_month = reorderByValueLength(data_month, "sets");
			var increment = (monthScale.bandwidth()*0.98) / data_month.length;
			var offset = monthScale.bandwidth()*0.1
			for (let i = 0; i < data_month.length; i++) {
				var sets = data_month[i]['sets'].split(',');
				var tmp_positions = [];
				sets.forEach(function (e) {
					final_data.push({
						'key': e,
						'year': year,
						'month': month,
						'offset': offset
					});
					tmp_positions.push(ruleScale(e));
				});
				if (tmp_positions.length == 1){
					lines.push({
						'year': year,
						'month': month,
						'offset': offset,
						'start': tmp_positions[0]-5,
						'end': tmp_positions[0]+5,
						'width':increment,
						'count': data_month[i].count
					});
				}
				else{
					var min = Math.min(...tmp_positions);
					var max = Math.max(...tmp_positions);
					lines.push({
						'year': year,
						'month': month,
						'offset': offset,
						'start': min,
						'end': max,
						'width':increment,
						'count': data_month[i].count
					});	
				}
				offset += increment;
			}
		});

		g3.selectAll("line")
			.data(lines)
			.enter()
			.append("line")
			.attr("x1", d => monthScale(d.month) + d.offset)
			.attr("x2", d => monthScale(d.month) + d.offset)
			.attr("y1", d => d.start)
			.attr("y2", d => d.end)
			.attr("stroke", d => d3.interpolateYlOrRd(widthScale(d.count)))
			.attr("stroke-width", d => widthScale(d.count)*d.width);

		g2.selectAll('circle')
			.data(final_data)
			.enter()
			.append('circle')
			.attr('cx', d => monthScale(d.month) + d.offset)
			.attr('cy', d => ruleScale(d.key))
			.attr('r', d => 3)
			.attr('stroke', rect_stroke)
			.attr('fill', 'white')
			.attr('opacity', 1);

	});
	g.append('g')
		.attr('transform', 'translate(0,' + height + ')')
		.call(d3.axisBottom(monthScale));
}

function drawTimelines(timeseries, ids){
	d3.select('#rule-timelines').selectAll('svg').remove();
	var element = null;
	const elements = document.getElementsByClassName("tabcontent");  
  	// Loop through the elements and return the one with the 'active' class
  	for (let i = 0; i < elements.length; i++) {
	    if (elements[i].classList.contains('active')) {
      		element = elements[i]; // Return the element with the 'active' class
    	}
  	}
	let margins = { top: 20, right: 20, bottom: 60, left: 25 };
	let width = element.clientWidth - margins.left - margins.right;
	let height = element.clientHeight - margins.top - margins.bottom;

	// Create the SVG container
	let svg = d3.select("#rule-timelines")
  		.append("svg")
  		.attr("width", width + margins.left + margins.right)
  		.attr("height", height + margins.top + margins.bottom)
  		.append("g")
  		.attr("transform", "translate(" + margins.left + "," + margins.top + ")");

	// Define the x and y scales
	let x = d3.scalePoint().range([0, width]);
	let y = d3.scaleLinear().range([height, 0]);

	// Define the line generator function
	let line = d3.line()
  		.x(function(d) { return x(d.date); })
  		.y(function(d) { return y(d.value); });


	// Set the domains of the axes
	var flat_ts = timeseries.flat().map(d=>d.value);
	var min = Math.min(...flat_ts);
	var max = Math.max(...flat_ts);
	x.domain(dates);  // Get the min and max dates
	y.domain([min, max]);  // Get the max value
	
	// Add the x-axis
	svg.append("g")
  	.attr("class", "x-axis")
  	.attr("transform", "translate(0," + height + ")")
  	.call(d3.axisBottom(x)).selectAll("text")
		.style("text-anchor", "end")
		.style("font-size", "9px")
		.attr("dx", "-1.0em")
		.attr("dy", "-1.0em")
		.attr("transform", "rotate(-90)");

	// Add the y-axis
	svg.append("g")
  	.attr("class", "y-axis")
  	.call(d3.axisLeft(y));

	// Plot the lines for each time series
	timeseries.forEach((data, index) => {
	  	svg.append("path")
	    	.data([data])
	    	.attr("class", "line")
	    	.attr("id", ids[index])  // Assign the ID of each time series
	    	.attr("d", line)
	    	.style("stroke", d3.schemeCategory10[index]) // Assign a color from the predefined color scale
	    	.style("fill", "none")
	    	.style("stroke-width", 2);
	});
	let legend = svg.selectAll(".legend")
  		.data(ids)
  		.enter().append("g")
  		.attr("class", "legend")
  		.attr("transform", (d, i) => "translate(0," + i * 20 + ")");

	legend.append("rect")
  		.attr("x", width - 20)
  		.attr("width", 18)
  		.attr("height", 18)
  		.style("fill", (d, i) => d3.schemeCategory10[i]);

	legend.append("text")
  		.attr("x", width - 24)
  		.attr("y", 9)
  		.attr("dy", ".35em")
  		.style("text-anchor", "end")
  		.text(d => d);
}

function get_rules_locations_from_cluster(cluster_id) {
	$.ajax({
		url: '/rule_locations_from_id',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({ cluster_id }),
		success: function (response) {
			currentRules = response;
		},
		error: function (error) {
			console.error('Error:', error);
		}
	});
}

function get_rules_from_cluster(cluster_id) {
	$.ajax({
		url: '/rules_from_id',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({ cluster_id }),
		success: function (response) {
			drawRulesView(response);
		},
		error: function (error) {
			console.error('Error:', error);
		}
	});
}
function get_intersections_from_rules() {
	$.ajax({
		url: '/rules_intersections',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({ rules_selected }),
		success: function (response) {
			drawIntersections(response.intersections);
			drawTimelines(response.timelines, response.ids);
		},
		error: function (error) {
			console.error('Error:', error);
		}
	});
}

function clear_selection() {
	rules_selected = [];
	d3.selectAll(".box_clicked").attr('opacity', 0).classed('box_clicked', false);
	d3.select('#rule-intersections').selectAll('svg').remove();
	d3.select('#rule-timelines').selectAll('svg').remove();
}

function drawScatterplot(){
	var x_selector = d3.select("#scatterplot-controls-x").style('display', 'none');
	var y_selector = d3.select("#scatterplot-controls-y").style('display', 'none');
	d3.select('#scatterplot-content').selectAll('svg').remove();
	var element = document.getElementById('scatterplot-content');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;
	const margins = { top: 20, right: 20, bottom: 40, left: 60 };
	var height = fullHeight - margins.top - margins.bottom;
	var width = fullWidth - margins.left - margins.right;

	var svg = d3.select('#scatterplot-content')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);

	const g = svg.append('g')
		.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

	var data = [];
	var e1 = document.getElementById("x-axis");
	var x_axis = e1.value;
	var e2 = document.getElementById("y-axis");
	var y_axis = e2.value;

	globalState.setScatterplotData(scatterplot_data)

	for (let i = 0; i <scatterplot_data.length; i++){
		data.push({
			'id': scatterplot_data[i]['id'],
			'x': scatterplot_data[i][x_axis],
			'y': scatterplot_data[i][y_axis],
		})	
	}
	var xdomain = d3.extent(data.map(d=>d.x));
	var ydomain = d3.extent(data.map(d=>d.y));
	if ((x_axis == "rules") || (x_axis == "mean-occurrences")){
		xdomain[0] = xdomain[0] - 1;
		xdomain[1] = xdomain[1] + 1;
	}
	else {
		xdomain[0] = xdomain[0] - 0.005;
		xdomain[1] = xdomain[1] + 0.005;

	}
	if ((y_axis == "rules") || (y_axis == "mean-occurrences")){
		ydomain[0] = ydomain[0] - 1;
		ydomain[1] = ydomain[1] + 1;
	}
	else{
		ydomain[0] = ydomain[0] - 0.005;
		ydomain[1] = ydomain[1] + 0.005;
	}
	

	var xScale = d3.scaleLinear()
		.domain(xdomain).nice()
		.range([0, width]);

	var yScale = d3.scaleLinear()
		.domain(ydomain).nice()
		.range([height, 0]);	

	// Add Y axis
	g.append('g')
		.call(d3.axisLeft(yScale).ticks(5));

	// Add X axis
	g.append('g')
		.attr('transform', 'translate(0,' + height + ')')
		.call(d3.axisBottom(xScale).ticks(5));

	g.selectAll('circle')
		.data(data)
		.enter()
		.append('circle')
		.attr('id', d=>'circle_'+d.id)
		.attr('class', 'cluster_dot')
		.attr('cx', function(d) { return xScale(d.x); })
		.attr('cy', function(d) { return yScale(d.y); })
		.attr('r', 5)
		.attr('opacity', 1)
		.attr('cursor', 'pointer')
		.attr('fill', '#8f96b5')
		.attr('stroke', 'black')
		.on('click', function (event, d) {
			d3.selectAll('.cluster_box')
				.attr("fill", 'transparent');
			d3.select('#box_'+d.id)
				.attr("fill", 'red')
				.attr('fill-opacity', 0.15);
			d3.selectAll('.cluster_dot')
				.attr('stroke', 'black');
			d3.select(this)
				.attr('stroke', 'red');
		});
	
	g.append("text")
		.attr("id", "scatterplot-x-label")
		.attr("class", "x-label")
		.attr("text-anchor", "middle")
		.attr("x", width/2)
		.attr("y", height + margins.bottom - 5)
		.text(d => e1.value)
		.on("click", function (event, d) {
            var x = event.clientX;
			// x = width/2;
            var y = event.clientY;
			// y = height + margins.bottom;
            x_selector.style("display", "block")
                .style("left", x + "px")
                .style("top", y + "px");
        });

	g.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "rotate(-90)")
		.attr("y", -margins.left + 15)
		.attr("x", -margins.top - height/2 + 20)
		.text(d=>e2.value)
		.on("click", function (event, d) {
            var x = event.clientX;
            var y = event.clientY;
            y_selector.style("display", "block")
                .style("left", x + "px")
                .style("top", y + "px");
        });
}
// drawClusterInfo();
// document.getElementById('update-scatterplot').addEventListener("click", drawScatterplot);
// drawScatterplot();
document.getElementById('x-axis').addEventListener("change", drawScatterplot);
document.getElementById('y-axis').addEventListener("change", drawScatterplot);
// document.getElementById('button-clear').addEventListener("click", clear_selection);
// drawClusterTimeline();
// window.onload = drawScatterplot;
function get_clusters(){
	document.getElementById('scatterplot-content').innerHTML = '';
	document.getElementById('cluster-view-header').innerHTML = '';
	document.getElementById('cluster-view').innerHTML = '';
	document.getElementById('cluster-heatmap-header').innerHTML = '';
	document.getElementById('cluster-heatmap').innerHTML = '';
	document.getElementById('cluster-view-rules-header').innerHTML = '';
	document.getElementById('cluster-view-rules').innerHTML = '';
	document.getElementById('cluster-heatmap-rules-header').innerHTML = '';
	document.getElementById('cluster-heatmap-rules').innerHTML = '';
	var attributes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
         .map(checkbox => checkbox.value);

	let startDate = document.getElementById('selStart').value;
	let endDate = document.getElementById('selEnd').value;

	const spinner1 = document.createElement('span');
    spinner1.className = 'loading loading-spinner text-primary loading-xl';
    spinner1.id = 'spinner_scatterplot'; // assign a unique ID
    document.getElementById('scatterplot-content').appendChild(spinner1);

	const spinner2 = document.createElement('span');
    spinner2.className = 'loading loading-spinner text-primary loading-xl';
    spinner2.id = 'spinner_cluster'; // assign a unique ID
    document.getElementById('cluster-view').appendChild(spinner2);

	const spinner3 = document.createElement('span');
    spinner3.className = 'loading loading-spinner text-primary loading-xl';
    spinner3.id = 'spinner_heatmap'; // assign a unique ID
    document.getElementById('cluster-heatmap').appendChild(spinner3);

	const spinner4 = document.createElement('span');
    spinner4.className = 'loading loading-spinner text-primary loading-xl';
    spinner4.id = 'spinner_map'; // assign a unique ID
    document.getElementById('map-view').appendChild(spinner4);

	$.ajax({
	url: '/get_clusters',
	type: 'POST',
	contentType: 'application/json',
	data: JSON.stringify(
		{
			'features': attributes,
			'dates': [startDate, endDate],
			'resolution': slider.value,
			'min_sup': supSlider.value,
			'min_lift': liftSlider.value
		}),
	success: function (response) {
		document.getElementById('spinner_scatterplot').remove();
		document.getElementById('spinner_cluster').remove();
		document.getElementById('spinner_heatmap').remove();
		document.getElementById('spinner_map').remove();

		globalState.clusterTimeline = response.cluster_timeline;

		scatterplot_data = response.scatterplot_data;
		all_attributes=response.all_attributes;
		cluster_ids=response.cluster_ids;
		cluster_representations=response.cluster_representations;
		cluster_sizes=response.cluster_sizes;
		cluster_timeline=response.cluster_timeline;
		new_dates=response.dates;
		drawClusterInfo(all_attributes, cluster_ids,
			cluster_representations,cluster_sizes,cluster_timeline,new_dates);
		drawMap();
		drawScatterplot();
	},
	error: function (error) {
		console.error('Error:', error);
	}
	});
}

function clearMapAndSVG() {
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        geoJsonLayer = null;
        legendControl = null;
    }
    
    d3.select('#map-view svg').remove();
    const mapContainer = document.getElementById('map-view');
    if (mapContainer) {
        mapContainer.innerHTML = '';
    }
}

document.getElementById('filter-clusters').addEventListener("click", function(event) {
	clearMapAndSVG();
    get_clusters(); 
});

function getRuleData(rule_id){
	$.ajax({
	url: '/get_rule_timeline',
	type: 'POST',
	contentType: 'application/json',
	data: JSON.stringify({'id':rule_id}),
	success: function (response) {
		rule_timeline = response;
		drawMap3();
	},
	error: function (error) {
		console.error('Error:', error);
	}
	});
}