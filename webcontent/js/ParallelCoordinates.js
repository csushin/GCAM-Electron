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

	state.parCoor.filenames = filenames.slice();
	state.parCoor.country = country;

	var filename = filenames[0];

	$('#par-title').show();

	var title = filename.split('.geojson')[0];

	if(country){
	 	title = country.name + ': ' + title;
	 	console.log(country, country.index);
	}

	var margin = {
			top: 30,
			right: 10,
			bottom: 10,
			left: 10
		},
		padding = {
			top: 10,
			right: 10,
			bottom: 10,
			left: 10
		},
		width = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right,
		height = $("#par-container").height() * state.sizes.parCoor.main.height * 0.6 - margin.top - margin.bottom - padding.top - padding.bottom;

	/*if(!state.resize && update){
		width = state.sizes.parCoor.main.mWidth;
		height = state.sizes.parCoor.main.mHeight;
	}
	else{
		state.sizes.parCoor.main.mWidth = width;
		state.sizes.parCoor.main.mHeight = height;
	}*/

	// console.log("width, height: ", $("#par-container").width(), ', ', $("#par-container").height());


	var x = d3.scale.ordinal().rangePoints([0, width], 1),
		y = {},
		dragging = {};

	var line = d3.svg.line(),
		axis = d3.svg.axis().orient("left"),
		background,
		foreground;

	/*if(!update){
		width = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right,
		height = $("#par-container").height() * state.sizes.parCoor.main.height * 0.6 - margin.top - margin.bottom - padding.top - padding.bottom;
	}*/
	d3.select("#par-svg-container").select("svg").remove();

	var svg = d3.select("#par-svg-container").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");	

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

	/*var dedup = [0],
	dedupData = [],
	tableIndex = 0;*/

	// console.log("pcData: ", pcData.length);
	var pcData = clusterData[filename].data,
	scenarioData = clusterData[filename],
	idMode = 0,
	dataMode = 1;

	var tableData = new Array();

	if(filenames.length == 1 && typeof(country) == "undefined"){
		// console.log('filenames.length == 1: ', filenames);

		scenarioData["properties"].forEach(function(obj, i){
			if(scenarioData["hasData"][i]){
				tableData.push([
					scenarioData["ids"][i],
					obj.REGION_NAME
				]);
			}
		});
	}
	else if(filenames.length > 2 || typeof(country) != "undefined" || (filenames.length == 2 && state.parCoor.plot == "1")){
		// console.log('filenames.length > 2: ', filenames);

		idMode = 1,
		pcData = filenames;

		for(var pIndex = 0; pIndex < filenames.length; pIndex++){
			var name = filenames[pIndex];

			tableData.push([
				name.split('.geojson')[0],
				clusterData[name].scenario.name
			]);

			if(pIndex)
				title += " vs " + name.split('.geojson')[0];
		}
	}
	else{
		pcData = filenames;

		title += " vs " + filenames[1].split('.geojson')[0];

		scenarioData["properties"].forEach(function(obj, i){
			if(scenarioData["hasData"][i]){
				tableData.push([
					scenarioData["ids"][i],
					obj.REGION_NAME
				]);
			}
		});
	}

	// console.log("tableData: ", tableData);

	function computeY(dimension, key, query, data){
		var extent = 0;
		if(filenames.length == 1){
			var queryData = data[query];
			if(state.parCoor.plot == "0"){
				extent = d3.extent(queryData, function(p, i) {
					var value = state.parCoor.year == -1 ? d3.sum(p[key]) + "" : p[key][state.parCoor.year];

					// console.log('index: ' + i);
					if(!dedupData[i])
						dedupData[i] = {GCAM_ID: tableData[i][0]};

					dedupData[i][dimension] = value;
					tableData[i].push(value);
					return +value;
				});
			}
			else{
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				queryData.forEach(function(p, i){
					var yLinear = [];
					state.yearsScaled.forEach(function(n, i){ yLinear.push(+p[key][i]); });

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					if(!dedupData[i]){
						dedupData[i] = {GCAM_ID: tableData[i][0]};
					}

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if(typeof(max) == "undefined"){
						max = value;
						min = value;
					}
					else{
						if(max < value)
							max = value;

						if(min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function(p, i){
					var scale = d3.scale.linear().domain([-range, range]).range([-1,1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});

			}
		}
		else if(filenames.length > 2 || typeof(country) != "undefined"){		
			if(state.parCoor.plot == "0"){
				extent = d3.extent(data, function(file, i) {
					var value = 0,
					// scenarioData = clusterData[p];
					// queryData is the specified file's query array, which has an element for each country and a key for each query type
					queryData = clusterData[file].data[query];

					if(!dedupData[i])
						dedupData[i] = {name: tableData[i][0]};

					/*for(var countryIndex = 0; countryIndex < scenarioData["hasData"].length; countryIndex++){
						if(scenarioData["hasData"][i]){
							value += state.parCoor.year == -1 ? d3.sum(scenarioData.data[query][i][key]) : +scenarioData.data[query][i][key][state.parCoor.year];
						}
					}*/
					
					if(typeof(country) != "undefined"){
						value = state.parCoor.year == -1 ? d3.sum(queryData[country.index][key]) : +queryData[country.index][key][state.parCoor.year];
					}
					else{
						for(var countryIndex = 0; countryIndex < queryData.length; countryIndex++){
							value += state.parCoor.year == -1 ? d3.sum(queryData[countryIndex][key]) : +queryData[countryIndex][key][state.parCoor.year];
						}
					}
					

					dedupData[i][dimension] = value;
					tableData[i].push(value);
					return +value;
				});
			}
			else{
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				data.forEach(function(p, i){

					var queryData = clusterData[p].data[query];

					if(!dedupData[i])
						dedupData[i] = {name: tableData[i][0]};

					var yLinear = [];
					state.yearsScaled.forEach(function(n, i){
						var value = 0;

						for(var countryIndex = 0; countryIndex < queryData.length; countryIndex++){
							value += +queryData[countryIndex][key][i];
						}

						yLinear.push(value);
					});

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if(typeof(max) == "undefined"){
						max = value;
						min = value;
					}
					else{
						if(max < value)
							max = value;

						if(min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function(p, i){
					var scale = d3.scale.linear().domain([-range, range]).range([-1,1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});
			}
		}
		else{
			extent = [-1,1];

			var filename2 = filenames[1];
			var d1 = clusterData[filename].data[query],
				d2 = clusterData[filename2].data[query];

			if(state.parCoor.plot == "0"){
				for(var countryIndex = 0; countryIndex < d1.length; countryIndex++){
					var value = 0;

					if(!dedupData[countryIndex])
						dedupData[countryIndex] = {GCAM_ID: tableData[countryIndex][0]};

					if(state.parCoor.year == -1){
						var d1Sum = d3.sum(d1[countryIndex][key]),
						d2Sum = d3.sum(d2[countryIndex][key]);

						var max = d3.max([d1Sum, d2Sum]);
						var scale = d3.scale.linear().domain([-max, max]).range([-1,1]);
						value = scale((+d1Sum) - (+d2Sum));
					}
					else{

						var max = d3.max([(+d1[countryIndex][key][state.parCoor.year]), (+d2[countryIndex][key][state.parCoor.year])]);
						var scale = d3.scale.linear().domain([-max, max]).range([-1,1]);
						value = scale((+d1[countryIndex][key][state.parCoor.year]) - (+d2[countryIndex][key][state.parCoor.year]));
					}

					dedupData[countryIndex][dimension] = value;
					tableData[countryIndex].push(value);
				}
			}
			else{
				extent = [-1,1];

				//Do linearRegression
				var min,
					max;

				data.forEach(function(p, i){

					var queryData = clusterData[p].data[query];

					if(!dedupData[i])
						dedupData[i] = {name: tableData[i][0]};

					var yLinear = [];
					state.yearsScaled.forEach(function(n, i){
						var value = 0;

						for(var countryIndex = 0; countryIndex < queryData.length; countryIndex++){
							value += +queryData[countryIndex][key][i];
						}

						yLinear.push(value);
					});

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if(typeof(max) == "undefined"){
						max = value;
						min = value;
					}
					else{
						if(max < value)
							max = value;

						if(min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function(p, i){
					var scale = d3.scale.linear().domain([-range, range]).range([-1,1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});

			}
		}

		// console.log("extent(", dimension, "): ", extent);
		y[dimension] = d3.scale.linear()
			.domain(extent)
			.range([height, 0]);
	}

	var dimensions = [],
		dedupData = [];

	for(var query in clusterKeys){
		if(clusterKeys[query].length == 1 && clusterKeys[query][0] == "data"){
			dimensions.push(query);
			computeY(query, "data", query, pcData);
		}
		else{
			for(var keyIndex = 0; keyIndex < clusterKeys[query].length; keyIndex++){
				var key = clusterKeys[query][keyIndex];
				dimensions.push(key);
				computeY(key, key, query, pcData);
			}
		}		
	}

	x.domain(dimensions);

	pcData = dedupData;
		
	// console.log('pcData: ', pcData);

	$('#par-title label').html(title);

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
			if(idMode)
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

	dataTable(dimensions, tableData, false, idMode);
	redrawTable();

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
			// console.log(p, ': ', d[p])
			// console.log([position(p), y[p](d[p][state.parCoor.year])]);
			if(state.parCoor.plot == "0" && !dataMode)
				return [position(p), state.parCoor.year == "-1" ? y[p](d3.sum(d[p])) : y[p](d[p][state.parCoor.year])];
			else
				return [position(p), y[p](d[p])];
			/*var value;
			if(state.parCoor.plot == "0" && !dataMode)
				value = [position(p), state.parCoor.year == "-1" ? y[p](d3.sum(d[p])) : y[p](d[p][state.parCoor.year])];
			else
				value = [position(p), y[p](d[p])];

			console.log(p, ': ',value);
			return value;*/
		}));
	}

	function pathMouseOver(path, index){
		d3.selectAll('.foreground path').style('display', function(d, i){
			if(index == i){
				dataTable(dimensions, [tableData[i]], true, idMode);
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
			dataTable(dimensions, tableData, false, idMode);
			redrawTable();
		}
		else{
			dataTable(dimensions, self.filterData, true, idMode);
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
				if(state.parCoor.plot == "0" && !dataMode){
					var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
					return extents[i][0] <= value && value <= extents[i][1];
				}
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
					if(state.parCoor.plot == "0" && !dataMode){
						var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
						return extents[i][0] <= value && value <= extents[i][1];
					}
						
					else
						return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				}))
			data.push(tableData[i]);
		});

		if(data.length > 0){
			self.filterData = data;
			dataTable(dimensions, data, true, idMode);
			redrawTable();
		}
		else{
			// console.log(tableData);
			d3.selectAll('.foreground path').style('display', function(d,i){return null;});
			dataTable(dimensions, tableData, false, idMode);
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
					if(state.parCoor.plot == "0" && !dataMode){
						var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
						return extents[i][0] <= value && value <= extents[i][1];
					}
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