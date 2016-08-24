/*function addParameter(parameter){
	if(parameters.indexOf(parameter) == -1){
		parameters.push(parameter);
		return true;
	}
	return false;
}*/

// Build clusterKeys with Queries and their keys
function addKeys(array, keys){
	for(var index = 0; index < keys.length; index++){
		if(array.indexOf(keys[index]) == -1 && typeof(keys[index]) != "function"){
			array.push(keys[index]);
		}
	}
}

// When files are down being loaded process all data and request main.js to begin clustering
function loadingComplete(){
	$('#file-selection').show();

	processAllInputs();

	console.log('clusterData request', new Date())
// <<<<<<< HEAD
	//send the structured data to the main process
	socket.send('clusterData request', {queries: clusterQueries, keys: clusterKeys, scenarios: clusterData, inputs: scenarioInputs});


	/*********************Begin Modification by Xing Liang, Aug 2016***************************/ 
	console.log('statData request', new Date())
	socket.send('statData request', {queries: clusterQueries, keys: clusterKeys, scenarios: Object.keys(clusterData), datatable: clusterData});
	prepareLineChart(clusterQueries, clusterKeys);
	/***********************End Modification by Xing Liang, Aug 2016***************************/ 


// =======
	//socket.send('clusterData request', {queries: clusterQueries, keys: clusterKeys, scenarios: clusterData, inputs: scenarioInputs});

// >>>>>>> GCAM-Electron/master
	// in Process.js, processes data locally for browser use
	processDataLocal(clusterQueries, clusterKeys, clusterData);

	loadNewGeoJSON(clusterShapefile, clusterShapefile.parsedJson, true);
	delete clusterShapefile.parsedJson;						
}

// When user does file open, setup intial variables and create file reader for each new file
// after each file is ready either read as a geojson for the map or as a data file.
// loadClusterJSON parses the data files and stores them in clusterData
// map data is stored in clusterShapefile
function readFileNew(e) {
	console.log("readFileNew Begin", new Date());			
	showLoading(true);

	$('#par-controls-container').hide();

	if(clusterShapefile.layer){
		map.removeLayer(clusterShapefile.layer);
		console.log("Should remove layer!!!!")
	}

	state.fileMode = 1;

	var files = e.target.files;
	state.geoLoaded = 0,
	state.scenariosLoaded = 0;
	state.scenariosProc = 0;
	state.filesLoaded = 0;
	state.filesCount = e.target.files.length;
	fileNames = [];

	clusterShapefile = {},
	clusterData = {},
	clusterQueries = [],
	clusterKeys = {};

	for (var i = 0, f; file = files[i]; i++){
		if (!file || typeof(dataArray[file.name]) != "undefined") {
			return;
		}
		var reader = new FileReader();
		reader.fileName = file.name;

		fileNames.push(reader.fileName);

		reader.onload = function(e) {
			var contents = e.target.result;
			var parsedJson = JSON.parse(contents);

			if( !('geo_data' in parsedJson) && !('geodata' in parsedJson)){
// <<<<<<< HEAD
				// if the data is geo_data map shapfile
// =======

// >>>>>>> GCAM-Electron/master
				clusterShapefile = {scenario: parsedJson.scenario, years: parsedJson.years, parsedJson: parsedJson};

				state.filesLoaded++;
				state.geoLoaded++;

				if(state.filesLoaded == state.filesCount){
					if(state.scenariosLoaded > 1){
						loadingComplete();
					}
					else{
						hideLoading();
						alert("Atleast two scenario files must be uploaded!");
						console.log('if');
					}
				}
			}
// <<<<<<< HEAD
			// else{//otherwise, the data is scenario values.
// =======
			else{
// >>>>>>> GCAM-Electron/master
				var years = parsedJson.years == undefined ? parsedJson.scenario.years : parsedJson.years;
				clusterData[this.fileName] = {scenario: parsedJson.scenario, years: years.slice()};

				$('#fileSelected').append($("<option></option>").attr("value", this.fileName).text(this.fileName));

				loadClusterJSON(clusterData[this.fileName], parsedJson);
				state.filesLoaded++;
				state.scenariosLoaded++;

				if(state.scenariosLoaded == 2){
					state.years = years;
					var min = d3.min(state.years);
					state.yearsScaled = [];
					state.years.forEach(function(n,i){state.yearsScaled.push(n - min);});

					$('#par-controls-container').show();

					var yearSelect = $('#par-year-select');
					yearSelect.empty();
					yearSelect.append($("<option/>")
				    	.val(-1)
				    	.text('All'));
					$.each(state.years, function(key, value) {   
					    yearSelect.append($("<option/>")
					    	.val(key)
					    	.text(value));
					});
				}

				if(state.filesLoaded == state.filesCount){
					console.log("readFileNew End", new Date());							
					
					if(state.scenariosLoaded > 1){
						loadingComplete();
					}
					else{
						hideLoading();
						alert("Atleast two scenario files must be uploaded!");
						console.log('else')
					}
				}
			}
		};
		reader.readAsText(file);
	};
}

//File VF
//clusterData['scenario'].data = [Query]-> [country] -> [QueryKeys]
function loadClusterJSON (obj, json) {
	// console.log(obj.scenario);
	var features = json.features;

	obj.properties = [],
	obj.ids = [],
	obj.hasData = [],
	obj.features = [],
	obj.queries = Object.keys(features[0].queries),
	obj.data = {},
	obj.dataKeys = {};

	for(var index = 0; index < obj.queries.length; index++){
		obj.data[obj.queries[index]] = [];
		obj.dataKeys[obj.queries[index]] = [];
	}

	for(var featureIndex = 0;  featureIndex < features.length; featureIndex++){
		var feature = features[featureIndex];

		obj.properties.push(feature.properties);
		obj.ids.push(feature.id);

		for(var queryIndex in feature.queries){
			var query = feature.queries[queryIndex]

			obj.data[queryIndex].push(query);

			if(Array.isArray(query)){
				obj.dataKeys[queryIndex] = ["Array"];
			}
			else{
				addKeys(obj.dataKeys[queryIndex], Object.keys(query));
			}
		}
// <<<<<<< HEAD
		//some of the regions is null of which the query property will be null
// =======
// >>>>>>> GCAM-Electron/master
		if(feature.queries){
			obj.hasData.push(true);
		}
		else{
			obj.hasData.push(false);
		}

	}

	addKeys(clusterQueries, obj.queries);

	for(var index = 0; index < obj.queries.length; index++){
		if(!clusterKeys[obj.queries[index]])
			clusterKeys[obj.queries[index]] = [];

		addKeys(clusterKeys[obj.queries[index]], obj.dataKeys[obj.queries[index]]);
	}
	// console.log(obj);
}



// Debugging only!!!
function readFileGeo(e) {
	console.log("readFileGeo Begin", new Date());			
	showLoading(true);

	state.fileMode = 1;

	var files = e.target.files;
	state.geoLoaded = 0,
	state.scenariosLoaded = 0;
	state.scenariosProc = 0;
	state.filesLoaded = 0;
	state.filesCount = e.target.files.length;
	fileNames = [];

	clusterShapefile = {},
	clusterData = {},
	clusterQueries = [],
	clusterKeys = {};

	for (var i = 0, f; file = files[i]; i++){
		if (!file || typeof(dataArray[file.name]) != "undefined") {
			return;
		}
		var reader = new FileReader();
		reader.fileName = file.name;

		fileNames.push(reader.fileName);

		reader.onload = function(e) {
			var contents = e.target.result;
			var parsedJson = JSON.parse(contents);
			var years = parsedJson.years == undefined ? parsedJson.scenario.years : parsedJson.years;

			clusterData[this.fileName] = {scenario: parsedJson.scenario, years: years};

			$('#fileSelected').append($("<option></option>").attr("value", this.fileName).text(this.fileName));

			loadClusterJSON(clusterData[this.fileName], parsedJson);
			state.filesLoaded++;
			state.scenariosLoaded++;

			if(state.scenariosLoaded == 2){
				state.years = years;
				var min = d3.min(state.years);
				state.yearsScaled = [];
				state.years.forEach(function(n,i){state.yearsScaled.push(n - min);});

				$('#par-controls-container').show();

				var yearSelect = $('#par-year-select');
				yearSelect.empty();
				yearSelect.append($("<option/>")
			    	.val(-1)
			    	.text('All'));
				$.each(state.years, function(key, value) {   
				    yearSelect.append($("<option/>")
				    	.val(key)
				    	.text(value));
				});
			}

			if(state.filesLoaded == state.filesCount){
				console.log("readFileNew End", new Date());							
				
				hideLoading();
			}
		};
		reader.readAsText(file);
	};
}