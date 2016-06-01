function parCoorDemo() {
	var self = this;

	var margin = {
			top: 30,
			right: 10,
			bottom: 10,
			left: 10
		},
		width = 960 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;

	var x = d3.scale.ordinal().rangePoints([0, width], 1),
		y = {},
		dragging = {};

	var line = d3.svg.line(),
		axis = d3.svg.axis().orient("left"),
		background,
		foreground;

	var svg = d3.select("#par-svg-container").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	d3.csv("cars.csv", function(error, cars) {

		for(var i in cars[0]){
			if(i != "name"){
				var max = d3.max([(+cars[0][i]), (+cars[1][i])]);
				var scale = d3.scale.linear().domain([-max, max]).range([-1,1]);
				// console.log("0, 1, |0-1|: ", (+cars[0][i]), ", ", (+cars[1][i]), ", ", Math.abs((+cars[0][i]) - (+cars[1][i])));
				cars[0][i] = scale((+cars[0][i]) - (+cars[1][i]));				
				// console.log("y: ",  cars[0][i])
			}
		}

		cars = [cars[0]];
		// console.log("cars: ", cars);

		// Extract the list of dimensions and create a scale for each.
		/*x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
			return d != "name" && (y[d] = d3.scale.linear()
				.domain(d3.extent(cars, function(p) {
					return +p[d];
				}))
				.range([height, 0]));
		}));*/
		x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
			return d != "name" && (y[d] = d3.scale.linear()
				.domain([-1,1])
				.range([height, 0]));
		}));

		// Add grey background lines for context.
		background = svg.append("g")
			.attr("class", "background")
			.selectAll("path")
			.data(cars)
			.enter().append("path")
			.attr("d", path);

		// Add blue foreground lines for focus.
		foreground = svg.append("g")
			.attr("class", "foreground")
			.selectAll("path")
			.data(cars)
			.enter().append("path")
			.attr("d", path);

		// Add a group element for each dimension.
		var g = svg.selectAll(".dimension")
			.data(dimensions)
			.enter().append("g")
			.attr("class", "dimension")
			.attr("transform", function(d) {
				return "translate(" + x(d) + ")";
			})
			.call(d3.behavior.drag()
				.origin(function(d) {
					return {
						x: x(d)
					};
				})
				.on("dragstart", function(d) {
					dragging[d] = x(d);
					background.attr("visibility", "hidden");
				})
				.on("drag", function(d) {
					dragging[d] = Math.min(width, Math.max(0, d3.event.x));
					foreground.attr("d", path);
					dimensions.sort(function(a, b) {
						return position(a) - position(b);
					});
					x.domain(dimensions);
					g.attr("transform", function(d) {
						return "translate(" + position(d) + ")";
					})
				})
				.on("dragend", function(d) {
					delete dragging[d];
					transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
					transition(foreground).attr("d", path);
					background
						.attr("d", path)
						.transition()
						.delay(500)
						.duration(0)
						.attr("visibility", null);
				}));

		// Add an axis and title.
		g.append("g")
			.attr("class", "axis")
			.each(function(d) {
				d3.select(this).call(axis.scale(y[d]));
			})
			.append("text")
			.style("text-anchor", "middle")
			.attr("y", -9)
			.text(function(d) {
				return d;
			});

		// Add and store a brush for each axis.
		g.append("g")
			.attr("class", "brush")
			.each(function(d) {
				d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
			})
			.selectAll("rect")
			.attr("x", -8)
			.attr("width", 16);
	});

	function position(d) {
		var v = dragging[d];
		return v == null ? x(d) : v;
	}

	function transition(g) {
		return g.transition().duration(500);
	}

	// Returns the path for a given data point.
	function path(d) {
		return line(dimensions.map(function(p) {
			return [position(p), y[p](d[p])];
		}));
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function(p) {
				return !y[p].brush.empty();
			}),
			extents = actives.map(function(p) {
				return y[p].brush.extent();
			});
		foreground.style("display", function(d) {
			return actives.every(function(p, i) {
				return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}) ? null : "none";
		});
	}
}

function linearRegression(y, x){
		var lr = {};
		var n = y.length;
		var sum_x = 0;
		var sum_y = 0;
		var sum_xy = 0;
		var sum_xx = 0;
		var sum_yy = 0;
		
		for (var i = 0; i < y.length; i++) {
			
			sum_x += x[i];
			sum_y += y[i];
			sum_xy += (x[i]*y[i]);
			sum_xx += (x[i]*x[i]);
			sum_yy += (y[i]*y[i]);
		} 
		
		lr['slope'] = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
		lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
		lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
		
		return lr;
}

function parCoor(filenames, update, country) {

	var self = this;

	state.parCoor.filenames = filenames;
	state.parCoor.country = country;

	var filename = filenames[0];

	$('#par-title').show();

	var title = filename.split('.geojson')[0];

	var countryIndex;
	if(country){
	 	countryIndex = country.index;
	 	title = country.name + ': ' + title;
	 }

	var margin = {
			top: 30,
			right: 10,
			bottom: 10,
			left: 10
		},
		padding = {
			top: 50,
			right: 10,
			bottom: 10,
			left: 10
		},
		width = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right,
		height = $("#par-container").height() * state.sizes.parCoor.main.height * 0.6 - margin.top - margin.bottom - padding.top - padding.bottom;

	if(!state.resize && update){
		width = state.sizes.parCoor.main.mWidth;
		height = state.sizes.parCoor.main.mHeight;
	}
	else{
		state.sizes.parCoor.main.mWidth = width;
		state.sizes.parCoor.main.mHeight = height;
	}

	// console.log("width, height: ", $("#par-container").width(), ', ', $("#par-container").height());


	var x = d3.scale.ordinal().rangePoints([0, width], 1),
		y = {},
		dragging = {};

	var line = d3.svg.line(),
		axis = d3.svg.axis().orient("left"),
		background,
		foreground;

	if(!update){
		// var yearSelect = $('#par-year-select');
		// yearSelect.empty();
		// $.each(clusterData[filename].years, function(key, value) {   
		//     yearSelect.append($("<option/>")
		//     	.val(key)
		//     	.text(value));
		// });

		width = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right,
		height = $("#par-container").height() * state.sizes.parCoor.main.height * 0.6 - margin.top - margin.bottom - padding.top - padding.bottom;
	}
	d3.select("#par-svg-container").select("svg").remove();

	var svg = d3.select("#par-svg-container").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var pcData = clusterData[filename].data['primary_energy'],
	mode = 0;
	if(typeof(countryIndex) != "undefined"){
		mode = 1,
		pcData = [];
		for(var pIndex = 0; pIndex < filenames.length; pIndex++){
			var name = filenames[pIndex],
			obj = {
				name: name.split('.geojson')[0],
				scenario: clusterData[name].scenario,
			};
			console.log('scenario: ', obj.scenario);
			// obj = {}
			var dataItem = clusterData[name].data['primary_energy'][countryIndex];
			for(var key in dataItem){
				if(typeof(obj[key]) == "undefined")
					obj[key] = [];
				for(var aIndex = 0; aIndex < dataItem[key].length; aIndex++){
					if(typeof(obj[key][aIndex]) == "undefined")
						obj[key][aIndex] = 0;

					obj[key][aIndex] += +dataItem[key][aIndex];
				}
			}
			pcData[pIndex] = obj;

			if(pIndex)
				title += " vs " + obj.name;
		}
	}
	else if(filenames.length == 2){
		var filename2 = filenames[1];
		pcData = [];
		var d1 = clusterData[filename].data['primary_energy'],
			d2 = clusterData[filename2].data['primary_energy'];
		for(var pIndex = 0; pIndex < d1.length; pIndex++){
			pcData[pIndex] = {};
			for(var type in d1[pIndex]){
				pcData[pIndex][type] = [];
				for(var oIndex = 0; oIndex < d1[pIndex][type].length; oIndex++){
					var max = d3.max([(+d1[pIndex][type][oIndex]), (+d2[pIndex][type][oIndex])]);
					var scale = d3.scale.linear().domain([-max, max]).range([-1,1]);
					pcData[pIndex][type][oIndex] = scale((+d1[pIndex][type][oIndex]) - (+d2[pIndex][type][oIndex]));
				}
				
			}
		}
		title += " vs " + filename2.split('.geojson')[0];
		// console.log(d1, d2, pcData);
	}
	else if(filenames.length > 2){
		mode = 1,
		pcData = [];
		for(var pIndex = 0; pIndex < filenames.length; pIndex++){
			var name = filenames[pIndex],
			obj = {
				name: name.split('.geojson')[0],
				scenario: clusterData[name].scenario,
			};
			console.log('scenario: ', obj.scenario);
			// obj = {}
			var dataObject = clusterData[name].data['primary_energy'];
			// console.log(name, ': ', dataObject);
			for(var dIndex = 0; dIndex < dataObject.length; dIndex++){
				var dataItem = dataObject[dIndex];
				for(var key in dataItem){
					if(typeof(obj[key]) == "undefined")
						obj[key] = [];
					for(var aIndex = 0; aIndex < dataItem[key].length; aIndex++){
						if(typeof(obj[key][aIndex]) == "undefined")
							obj[key][aIndex] = 0;

						obj[key][aIndex] += +dataItem[key][aIndex];
					}
				}
			}
			pcData[pIndex] = obj;

			if(pIndex)
				title += " vs " + obj.name;
		}
	}

	$('#par-title label').html(title);

	var tableData = [];

	var continents = {
		"Africa": [],
		"Europe": [],
		"Asia": [],
		"North America": [],
		"South America": [],
		"Antarctica": [],
		"Australia": []
	};

	var color = d3.scale.ordinal()
	    .domain(d3.keys(continents))
	    .range(colorbrewer.Set1[7]);

	var dedup = [0],
	dedupData = [],
	tableIndex = 0;

	// console.log("pcData: ", pcData.length);
	if(filenames.length < 3 && typeof(countryIndex) == "undefined"){
		pcData.forEach(function(p, i){
			var gcamID = clusterData[filename]['properties'][i].GCAM_ID;
			if(dedup.indexOf(gcamID) == -1){
				dedupData.push(p);
				dedup.push(gcamID);
				tableData[tableIndex] = [
					clusterData[filename]['properties'][i].GCAM_ID,
					clusterData[filename]['properties'][i].REGION_NAME
					// clusterData[filename]['properties'][i].Area
				];
				tableIndex++;
				p.GCAM_ID = clusterData[filename]['properties'][i].GCAM_ID;
				// console.log("pushing: " + gcamID);
			}
			else{
				// console.log("skipped: ", gcamID, ", ", dedup);
			}
		});
		pcData = dedupData;
	}
	// console.log("dedup: ", pcData.length);

	// console.log('pcData: ', pcData);
	// Insert Summation protocol for all year selector!
	dedupData = [];
	// Extract the list of dimensions and create a scale for each.
	x.domain(dimensions = d3.keys(pcData[0]).filter(function(d) {
		var extent = 0;
		if(filenames.length == 1){
			extent = d3.extent(pcData, function(p, i) {
				var value = "";
				if(state.parCoor.plot == "0")
					value = p[d][state.parCoor.year];
				else if(d != "GCAM_ID"){
					console.log("Get me that linear fit girl!");
					var y = [];
					state.yearsScaled.forEach(function(n,i){ y.push(+p[d][i]); });

					// console.log(d, ": ", state.yearsScaled, y);
					
					value = linearRegression(y, state.yearsScaled).slope + "";
					if(!dedupData[i])
						dedupData[i] = {GCAM_ID: p.GCAM_ID};

					dedupData[i][d] = value;
				}
				tableData[i].push(value);
				return +value;
			});
		}
		else if(filenames.length > 2 || typeof(countryIndex) != "undefined"){
			extent = d3.extent(pcData, function(p, i) {
				var res = null;
				var value = "";
				if(d != 'name' && d != 'scenario' && d != 'GCAM_ID'){
					if(!tableData[i])
						tableData[i] = [];

					// if(!p[d]){
					// 	console.log('d: ', d);
					// }

					value = p[d][state.parCoor.year];
					

					if(state.parCoor.plot == "1"){
						var y = [];
						state.yearsScaled.forEach(function(n,i){ y.push(+p[d][i]); });

						// console.log(d, ": ", state.yearsScaled, y);
						
						value = linearRegression(y, state.yearsScaled).slope + "";
						if(!dedupData[i])
							dedupData[i] = {name: p.name, scenario: p.scenario};

						dedupData[i][d] = value;
					}

					tableData[i].push(value);

					// console.log('tableData[',i,']: ', p[d][state.parCoor.year])
				}
				else if(d != 'GCAM_ID'){
					if(!tableData[i])
						tableData[i] = [];

					value = p[d]
					tableData[i].push(value);
				}
				return +value;
			});
		}
		else{
			extent = [-1,1];

			if(state.parCoor.plot == "0"){
				pcData.forEach(function(p, i){
					tableData[i].push(p[d][state.parCoor.year]);
				});
			}
			else if(d != "GCAM_ID"){
				pcData.forEach(function(p, i){
					var y = [];
					state.yearsScaled.forEach(function(n,i){ y.push(+p[d][i]); });

					var value = linearRegression(y, state.yearsScaled).slope + "";
					if(!dedupData[i])
						dedupData[i] = {GCAM_ID: p.GCAM_ID};

					dedupData[i][d] = value;
					tableData[i].push(value);
				});
			}
		}

		// console.log(d,': ', extent);

		return d != "name" && d != "GCAM_ID" && d!= "filename" && d!= "scenario" && (y[d] = d3.scale.linear()
			.domain(extent)
			.range([height, 0]));
	}));

	if(dedupData.length > 0 && state.parCoor.plot == "1")
		pcData = dedupData;
	console.log(pcData);

	// Add grey background lines for context.
	background = svg.append("g")
		.attr("class", "background")
		.selectAll("path")
		.data(pcData)
		.enter().append("path")
		.attr("d", path)
		.on('mouseover', pathMouseOver)
		.on('mouseout', pathMouseOut);

	// Add blue foreground lines for focus.
	foreground = svg.append("g")
		.attr("class", "foreground")
		.selectAll("path")
		.data(pcData)
		.enter().append("path")
		.attr("d", path)
		.attr("id", function(d){
			if(mode)
				return 'path_GCAM_ID_' + d.name;
			else
				return 'path_GCAM_ID_' + d.GCAM_ID;
		})
		.on('mouseover', pathMouseOver)
		.on('mouseout', pathMouseOut);

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function(d) {
			return "translate(" + x(d) + ")";
		})
		.call(d3.behavior.drag()
			.origin(function(d) {
				return {
					x: x(d)
				};
			})
			.on("dragstart", function(d) {
				dragging[d] = x(d);
				background.attr("visibility", "hidden");
			})
			.on("drag", function(d) {
				dragging[d] = Math.min(width, Math.max(0, d3.event.x));
				foreground.attr("d", path);
				dimensions.sort(function(a, b) {
					return position(a) - position(b);
				});
				x.domain(dimensions);
				g.attr("transform", function(d) {
					return "translate(" + position(d) + ")";
				})
			})
			.on("dragend", function(d) {
				delete dragging[d];
				transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
				transition(foreground).attr("d", path);
				background
					.attr("d", path)
					.transition()
					.delay(500)
					.duration(0)
					.attr("visibility", null);
			}));

	// Add an axis and title.
	g.append("g")
		.attr("class", "axis")
		.each(function(d) {
			d3.select(this).call(axis.scale(y[d]));
		})
		.append("text")
		.style("text-anchor", "middle")
		.attr("y", -9)
		.text(function(d) {
			return d;
		});

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function(d) {
			d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush).on("brushend", brushend));
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);

	// console.log(dimensions, tableData);
	dataTable(dimensions, tableData, false, mode);
	// redrawTable();

	function position(d) {
		var v = dragging[d];
		return v == null ? x(d) : v;
	}

	function transition(g) {
		return g.transition().duration(500);
	}

	// Returns the path for a given data point.
	function path(d) {
		return line(dimensions.map(function(p) {
			// console.log(p, ': ', d[p][state.parCoor.year])
			// console.log([position(p), y[p](d[p][state.parCoor.year])]);
			if(state.parCoor.plot == "0")
				return [position(p), y[p](d[p][state.parCoor.year])];
			else
				return [position(p), y[p](d[p])];
		}));
	}

	function pathMouseOver(path, index){
		d3.selectAll('.foreground path').style('display', function(d, i){
			if(index == i){
				dataTable(dimensions, [tableData[i]], true, mode);
				redrawTable();
				return null;
			}
			else
				return 'none';
		});
	}

	function pathMouseOut(path){
		if(!self.highlightActive()){
			d3.selectAll('.foreground path').style('display', null);
			dataTable(dimensions, tableData, false, mode);
			redrawTable();
		}
		else{
			dataTable(dimensions, self.filterData, true, mode);
			redrawTable();
		}
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function(p) {
				return !y[p].brush.empty();
			}),
			extents = actives.map(function(p) {
				return y[p].brush.extent();
			});
		foreground.style("display", function(d) {
			return actives.some(function(p, i) {
				if(state.parCoor.plot == "0")
					return extents[i][0] <= d[p][state.parCoor.year] && d[p][state.parCoor.year] <= extents[i][1];
				else
					return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}) ? null : "none";
		});
	}

	function brushend(){
		var actives = dimensions.filter(function(p) {
				return !y[p].brush.empty();
			}),
			extents = actives.map(function(p) {
				return y[p].brush.extent();
			});
		var data = [];
		foreground.each(function(d,i){
			if(actives.some(function(p, i) {
					if(state.parCoor.plot == "0")
						return extents[i][0] <= d[p][state.parCoor.year] && d[p][state.parCoor.year] <= extents[i][1];
					else
						return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				}))
			data.push(tableData[i]);
		});

		if(data.length > 0){
			self.filterData = data;
			dataTable(dimensions, data, true, mode);
			redrawTable();
		}
		else{
			// console.log(tableData);
			d3.selectAll('.foreground path').style('display', function(d,i){return null;});
			dataTable(dimensions, tableData, false, mode);
			redrawTable();
		}
		
	}

	this.highlightActive = function(){
		var actives = dimensions.filter(function(p) {
				return !y[p].brush.empty();
			});
		if(actives.length > 0){
			var extents = actives.map(function(p) {
				return y[p].brush.extent();
			});
			foreground.style("display", function(d) {
				return actives.some(function(p, i) {
					if(state.parCoor.plot == "0")
						return extents[i][0] <= d[p][state.parCoor.year] && d[p][state.parCoor.year] <= extents[i][1];
					else
						return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				}) ? null : "none";
			});
			// console.log("highlightActive: ", true);
			return true;
		}
		// console.log("highlightActive: ", false);
		return false;
	}

	hideLoading();
}