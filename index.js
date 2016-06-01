var express = require('express');
var app = express();
var http = require('http').Server(app);

// var io = require('socket.io')(http, { path: '/GCAM/socket.io'});
var io = require('socket.io')(http);

var clusterfck = require('clusterfck');
var figue = require('./lib/figue');
var ML = require('ml');
var d3 = require('d3');
var PythonShell = require('python-shell');
var fs = require('fs');
var proxy = require('http-proxy-middleware');

// app.get('/gcam', function(req, res){
// 	res.sendFile(__dirname + '/webcontent/index.html');
// });

app.use('/gcam', express.static(__dirname + '/webcontent'));

app.use('/test',
	proxy({
	    target: 'http://localhost:3000',
	    // ws: true,
	    pathRewrite: {
	        '^/test' : '/'
	    }
	})
);

app.use('/EducationSystem',
	proxy({
	    target: 'http://localhost:10081',
	    // ws: true,
	    pathRewrite: {
	        '^/EducationSystem' : '/'
	    }
	})
);

// app.get('/', function(req, res){
// 	res.sendFile(__dirname + '/index.html');
// });

var dataStore = new Array(2),
vectorStore = new Array(2);

io.on('connection', function(socket){
	socket.on('chat message', function(msg){
		socket.emit('chat message', msg);
	});

	socket.on('cluster request', function(data){
		// var clusters = clusterfck.hcluster(data);


		var data = [ 
			{'company': 'Microsoft' , 'size': 91259, 'revenue': 60420},
			{'company': 'IBM' , 'size': 400000, 'revenue': 98787},
			{'company': 'Skype' , 'size': 700, 'revenue': 716},
			{'company': 'SAP' , 'size': 48000, 'revenue': 11567},
			{'company': 'Yahoo!' , 'size': 14000 , 'revenue': 6426 },
			{'company': 'eBay' , 'size': 15000, 'revenue': 8700},
		];
		// Create the labels and the vectors describing the data
		var labels = new Array ;
		var vectors = new Array ;
		for (var i = 0 ; i < data.length ; i++) {
			labels[i] = data[i]['company'] ;
			vectors[i] = [ data[i]['size'] , data[i]['revenue']];
		}

		var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
		var dendogram = clusters.buildDendogram(5, true, true, true, false);
		console.log("dendogram created!");
				
		socket.emit('cluster response', {clusters: clusters, dendogram: dendogram});
	});

	socket.on('clusterData request', function(data){
		// var clusters = clusterfck.hcluster(data);

		var labels = d3.keys(data.scenarios).sort();
		var vectors = processData(data.queries, data.keys, data.scenarios);
		socket.emit('progress update', 0.25);

		console.log('agglomerate BEGIN', (new Date()).toUTCString());
		var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
		socket.emit('progress update', 0.25);
		console.log('agglomerate END', (new Date()).toUTCString());

		console.log('buildDendogram BEGIN', (new Date()).toUTCString());
		var dendogram = clusters.buildDendogram(5, true, true, false, true);
		console.log('buildDendogram END', (new Date()).toUTCString());
		socket.emit('progress update', 0.25);

		console.log('buildD3Cluster BEGIN', (new Date()).toUTCString());
		var d3Cluster = buildD3Cluster(clusters);
		console.log("dendogram created!");
		console.log('buildD3Cluster END', (new Date()).toUTCString());
				
		socket.emit('cluster response', {clusters: clusters, dendogram: dendogram, d3Cluster: d3Cluster});

		// processYearVectors(data.queries, data.keys, data.scenarios);
		
	});

	socket.on('yearly cluster request', function(data){
		console.log('mode: ', data.mode, ', pcaMode: ', data.pcaMode, ', pythonMode: ', data.pythonMode);
		console.log('yearly cluster request', (new Date()).toUTCString())

		var labels = d3.keys(data.scenarios).sort();
		var transformedVectors = [],
		yearlyVector = [],
		yearVectors = [];

		if(data.pcaMode < 3){
			var yearlyVector = processDataYearly(data.queries, data.keys, data.scenarios);
			for(var i = 0; i < yearlyVector.length; i++){
				scenarioIDs = [],
				scenarioDists = [];

				var cluster = figue.agglomerate(labels, yearlyVector[i], figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);

				switch (data.pcaMode){
					case 0:
						getScenarioIDs(cluster);
						scenarioIDs = scenarioIDs.filter(function(n, i){ return n != -1});
						break;
					case 1:
						getScenarioDetails(cluster);
						scenarioIDs = scenarioIDs.filter(function(n, i){ return n != -1});
						break;
					case 2:
						getScenarioDetailsV2(cluster);
						scenarioIDs = scenarioIDs.filter(function(n, i){ return n != -1}).concat(scenarioDists);
						break;
				}
				// printScenarioIDs(scenarioIDs);
				// console.log(scenarioIDs);
				yearVectors.push(scenarioIDs);

				scenarioIDs = [];
				getScenarioIDs(cluster);
				scenarioIDs = scenarioIDs.filter(function(n, i){ return n != -1});
				// console.log(data.scenarios[d3.keys(data.scenarios)[0]].years[i], ': ', scenarioIDs);
			}
			socket.emit('progress update', 0.03);
		}
		else{
			yearVectors = getYearVectors(data.queries, data.keys, data.scenarios);
		}

		socket.emit('progress update', 0.2);

		if(!data.mode){
			transformedVectors = PCA(yearVectors, 2);
			socket.emit('yearly cluster response', transformedVectors);
			console.log('yearly cluster response', (new Date()).toUTCString());
		}
		else{
			pythonPCA(data.pythonMode, yearVectors, data.pcaMode > 2, socket);
		}
		return;
	});

	socket.on('iris data request', function(){
		var options = {
		  args: [JSON.stringify([[1,2,3,4],[1,2,3,4],[1,2,3,4]])]
		};
		PythonShell.run('python/test.py', options, function (err, results) {
		  if (err) throw err;
		  // results is an array consisting of messages collected during execution 
		  socket.emit('iris data response', JSON.parse(results[1]));
		});
	})

	socket.on('store data request', function(data){
		dataStore[data.index] = data;
		var labels = Object.keys(data.scenarios);
		vectorStore[data.index] = processData(data.queries, data.keys, data.scenarios);		
		console.log('store data: ', data.index);
	})

	socket.on('process data request', function(index){
		var data = dataStore[index]
		var labels = Object.keys(data.scenarios);
		var vectors = processData(data.queries, data.keys, data.scenarios);
		var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
		// console.log(clusters);

		scenarioIDs = [],
		scenarioDists = [];
		getScenarioIDs(clusters);		
		scenarioIDs = scenarioIDs.filter(function(n, i){ return n != -1});
		printScenarioIDs(scenarioIDs);

		scenarioIDs = [],
		scenarioDists = [];
		getScenarioDetails(clusters);
		scenarioIDs = scenarioIDs.filter(function(n, i){ return n != -1});
		printScenarioIDs(scenarioIDs);
		// console.log(d3Cluster);
	})

	// data.queries, data.keys, data.scenarios
	socket.on('compare data request', function(){

		var keys = dataStore[0].keys;
		var totalLength = 0,
		loopCount = 0;

		for(var scenarioIndex in dataStore[0].scenarios){
			var scenarioData = [dataStore[0].scenarios[scenarioIndex].data, dataStore[1].scenarios[scenarioIndex].data],
			arrayLength = dataStore[0].scenarios[scenarioIndex].years.length;

			for(var dataIndex = 0; dataIndex < scenarioData[0]["primary_energy"].length; dataIndex++){

				var queryData = [scenarioData[0]["primary_energy"][dataIndex], scenarioData[1]["primary_energy"][dataIndex]];

				for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

					var key = keys["primary_energy"][keyIndex];

					for(var i = 0; i < queryData[0][key].length; i++){
						if(queryData[0][key][i] !== queryData[1][key][i]){
							console.log('Error (', key, ', ', i, '): ', queryData[0][key][i], ', ', queryData[1][key][i]);
							return;
						}
					}

				}
			}
			if(loopCount == 0){
				totalLength = arrayLength * keys["primary_energy"].length * scenarioData[0]["primary_energy"].length;
			}
			loopCount++;
		}
		console.log('all data matches!', keys, ', ', loopCount, ', ', totalLength);
	});

	socket.on('compare vector request', function(){

		for(var i = 0; i < vectorStore[0].length; i++){
			for(var j = 0; j < vectorStore[0][i].length; j++){
				if(vectorStore[0][i][j] !== vectorStore[1][i][j]){
					console.log('Error (', i, ', ', j, '): ', vectorStore[0][i][j], ', ', vectorStore[1][i][j]);
					console.log('Error: ', vectorStore[0][i].slice(0,j+1), '\n', vectorStore[1][i].slice(0,j+1))
					return;
				}
			}
		}

		console.log('all data matches!', vectorStore[0].length * vectorStore[0][0].length);
	});

	function printScenarioIDs(ids){
		var str = "";
		for(var i = 0; i < ids.length; i++){
			str += ids[i].toFixed(2);
			if(i < ids.length-1){
				str += ', ';
			}
		}
		console.log(str);
	}

	function processYearVectors(queries, keys, scenarios){
		process.nextTick(function(){
			// var yearlyVector = processDataYearly(data.queries, data.keys, data.scenarios);
			// var clusterArray = [];
			// for(var i = 0; i < yearlyVector.length; i++){
			// 	clusterArray.push(figue.agglomerate(labels, yearlyVector[i], figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE));
			// }
			var yearVectors = getYearVectors(queries, keys, scenarios);
			var transformedVectors = PCA(yearVectors, 2);

			socket.emit('yearly cluster response', transformedVectors);
		})
	}

	socket.on('process request', function(data){
		process.nextTick(function(){
			var vectors = processData(data.queries, data.keys, data.scenarios);
			socket.emit('process response', vectors);
		});
	});
});

function processData(queries, keys, scenarios){
	var labels = d3.keys(scenarios).sort();
	var featureVectors = new Array(labels.length),
	featureVectorCount = 0;

	console.log('processData BEGIN: ', (new Date()).toUTCString());
	for(var si = 0; si < labels.length; si++){
		var scenarioIndex = labels[si];
		var scenarioData = scenarios[scenarioIndex].data,
		arrayLength = scenarios[scenarioIndex].years.length,
		vector = [];

		for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

			var queryData = scenarioData["primary_energy"][dataIndex];

			for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

				var key = keys["primary_energy"][keyIndex];

				if(!queryData[key] || queryData[key][0] == "No data"){
					// vector = vector.concat(Array.apply(null, new Array(arrayLength)).map(Number.prototype.valueOf,0));
					vector = vector.concat(new Array(arrayLength).fill(0));
				}
				else{
					vector = vector.concat(queryData[key].slice(0,-1));
				}

			}
		}

		featureVectors[featureVectorCount] = vector;
		featureVectorCount++;
	}
	console.log('processData END: ', (new Date()).toUTCString())
	return featureVectors;
}

/*function processDataYearly(queries, keys, scenarios){
	var labels = Object.keys(scenarios);
	var featureVectors = [];
	var yearFeatureVectors = [];

	for(var i = 0; i < scenarios[scenarioIndex].years.length; i++){
		yearFeatureVectors[i] = [];
	}

	var scenarioCount = 0;
	for(var scenarioIndex in scenarios){
		var scenarioData = scenarios[scenarioIndex].data,
		arrayLength = scenarios[scenarioIndex].years.length,
		vector = [];

		for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

			var queryData = scenarioData["primary_energy"][dataIndex];

			for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

				var key = keys["primary_energy"][keyIndex];

				for(var yearIndex = 0; yearIndex < arrayLength; yearIndex++){
					var scenarioVector = yearFeatureVectors[yearIndex];
					if(!scenarioVector[scenarioCount])
						scenarioVector[scenarioCount] = [];

					var vector = scenarioVector[scenarioCount];

					if(!queryData[key] || queryData[key][0] == "No data"){
						vector = vector.concat(0);
					}
					else{
						vector = vector.concat(queryData[key][yearIndex]);
					}
				}
				

			}
		}

		featureVectors.push(vector);
		scenarioCount++;
	}
	return featureVectors;
}*/

// works super slow!!!
/*function processDataYearly(queries, keys, scenarios){
	// var labels = Object.keys(scenarios);
	var yearFeatureVectors = [],
	yearLength = scenarios[d3.keys(scenarios)[0]].years.length;

	for(var yearIndex = 0; yearIndex < yearLength; yearIndex++){
		
		var featureVectors = [];

		for(var scenarioIndex in scenarios){
			var scenarioData = scenarios[scenarioIndex].data,
			arrayLength = scenarios[scenarioIndex].years.length,
			vector = [];

			for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

				var queryData = scenarioData["primary_energy"][dataIndex];

				for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

					var key = keys["primary_energy"][keyIndex];

					if(!queryData[key] || queryData[key][0] == "No data"){
						vector = vector.concat(0);
					}
					else{
						vector = vector.concat(queryData[key][yearIndex]);
					}

				}
			}

			featureVectors.push(vector);
		}
		yearFeatureVectors.push(featureVectors);
		socket.emit('progress update', 0.07);
	}
	return yearFeatureVectors;
}*/

function processDataYearly(queries, keys, scenarios){
	// var labels = Object.keys(scenarios);
	var yearLength = scenarios[d3.keys(scenarios)[0]].years.length;
	var yearFeatureVectors = new Array(yearLength);
	var labels = d3.keys(scenarios).sort();
	// console.log(labels);

	for(var yearIndex = 0; yearIndex < yearLength; yearIndex++){
		
		var featureVectors = new Array(labels.length),
		featureVectorCount = 0;

		for(var si = 0; si < labels.length; si++){
			var scenarioIndex = labels[si];
			var scenarioData = scenarios[scenarioIndex].data;
			var vector = new Array(scenarioData["primary_energy"].length * keys["primary_energy"].length),
			vectorCount = 0;

			for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

				var queryData = scenarioData["primary_energy"][dataIndex];

				for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

					var key = keys["primary_energy"][keyIndex];

					if(!queryData[key] || queryData[key][0] == "No data"){
						// vector = vector.concat(0);
						vector[vectorCount] = 0;
					}
					else{
						// vector = vector.concat(queryData[key][yearIndex]);
						vector[vectorCount] = queryData[key][yearIndex];
					}

					vectorCount++;
				}
			}

			featureVectors[featureVectorCount] = vector;
			featureVectorCount++;
		}
		yearFeatureVectors[yearIndex] = featureVectors;		
		// console.log('progress update');
	}
	return yearFeatureVectors;
}

/*function getYearVectors(queries, keys, scenarios){
	// var labels = Object.keys(scenarios);
	var yearFeatureVectors = [],
	yearLength = scenarios[d3.keys(scenarios)[0]].years.length;

	for(var yearIndex = 0; yearIndex < yearLength; yearIndex++){
		var featureVectors = [];

		for(var scenarioIndex in scenarios){
			var scenarioData = scenarios[scenarioIndex].data,
			arrayLength = scenarios[scenarioIndex].years.length,
			vector = [];

			for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

				var queryData = scenarioData["primary_energy"][dataIndex];

				for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

					var key = keys["primary_energy"][keyIndex];

					if(!queryData[key] || queryData[key][0] == "No data"){
						featureVectors = featureVectors.concat(0);
					}
					else{
						featureVectors = featureVectors.concat(+queryData[key][yearIndex]);
					}

				}
			}
		}
		yearFeatureVectors.push(featureVectors)
	}
	console.log('yearFeatureVectors.length: ', yearFeatureVectors.length);
	return yearFeatureVectors;
}*/

function getYearVectors(queries, keys, scenarios){
	// var labels = Object.keys(scenarios);
	var labels = d3.keys(scenarios).sort();
	var firstScenario = scenarios[labels[0]];
	var yearLength = scenarios[d3.keys(scenarios)[0]].years.length;
	var yearFeatureVectors = new Array(yearLength);

	for(var yearIndex = 0; yearIndex < yearLength; yearIndex++){
		var featureVectors = new Array(labels.length * firstScenario["primary_energy"].length * keys["primary_energy"].length),
		featureVectorCount = 0;

		for(var si = 0; si < labels.length; si++){
			var scenarioIndex = labels[si];
			var scenarioData = scenarios[scenarioIndex].data,
			arrayLength = scenarios[scenarioIndex].years.length;

			for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

				var queryData = scenarioData["primary_energy"][dataIndex];

				for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

					var key = keys["primary_energy"][keyIndex];

					if(!queryData[key] || queryData[key][0] == "No data"){
						featureVectors[featureVectorCount] = 0;
					}
					else{
						featureVectors[featureVectorCount] = +queryData[key][yearIndex];
					}

					featureVectorCount++;
				}
			}
		}
		yearFeatureVectors[yearIndex] = featureVectors;
	}
	console.log('yearFeatureVectors.length: ', yearFeatureVectors.length);
	return yearFeatureVectors;
}

function buildD3Cluster(cluster){
	var d3Cluster = {name: "Scenarios", children: []};
	d3Cluster.children = generateDendogram(cluster).children;
	return d3Cluster;
}


function generateDendogram(tree){
	var cluster = {};

	if (tree.isLeaf()) {
		var labelstr = String(tree.label);
		cluster.name = labelstr;
		cluster.centroid = tree.centroid;

	} else {
		cluster.name = "dist: " + (tree.dist).toFixed(2);
		cluster.children = [];
		cluster.children.push(generateDendogram(tree.left));
		cluster.children.push(generateDendogram(tree.right));
	}
	return cluster;
}

var scenarioIDs = [];
function getScenarioIDs(tree){
	var id = -1;

	if (tree.isLeaf()) {
		id = +String(tree.label).split('scenario')[1].split('.geojson')[0];
	} else {
		scenarioIDs.push(getScenarioIDs(tree.left));
		scenarioIDs.push(getScenarioIDs(tree.right));
	}

	return id;
}

function getScenarioDetails(tree){
	var id = -1;

	if (tree.isLeaf()) {
		id = +String(tree.label).split('scenario')[1].split('.geojson')[0];

	} else {
		scenarioIDs.push(getScenarioDetails(tree.left));
		scenarioIDs.push(tree.dist);
		scenarioIDs.push(getScenarioDetails(tree.right));
	}
	return id;
}

var scenarioDists = [];
function getScenarioDetailsV2(tree){
	var id = -1;

	if (tree.isLeaf()) {
		id = +String(tree.label).split('scenario')[1].split('.geojson')[0];

	} else {
		scenarioIDs.push(getScenarioDetailsV2(tree.left));
		scenarioDists.push(tree.dist);
		scenarioIDs.push(getScenarioDetailsV2(tree.right));
	}
	return id;
}

function PCA(vectors, dims){
	var U = new ML.Stat.PCA(vectors)
	var V = U.project(vectors, dims);
	return V;
}

function pythonPCA(mode, data, useFile, socket){
	// console.log(JSON.stringify(data));
	var options = {
	  args: [mode]
	};

	if(useFile){
		writeData('large.txt', JSON.stringify(data));
		options.args.push('data/large.txt');
		options.args.push(useFile);
	}
	else{
		options.args.push(JSON.stringify(data));
	}

	PythonShell.run('python/pca.py', options, function (err, results) {
	  if (err) throw err;
	  // results is an array consisting of messages collected during execution
	  // console.log(results);
	  var output = JSON.parse(results[0]);
	  // console.log('output parsed: ', output);
	  socket.emit('yearly cluster response', output);

	  console.log('yearly cluster response', (new Date()).toUTCString())
	});
}

function writeData(filname, data){	
	fs.writeFile("data/" + filname, data, function(err) {
	    if(err) {
	        return console.log(err);
	    }

	    console.log("The file was saved!");
	}); 
}

http.listen(8880, function(){
	console.log('listening on *:8880');
});
/*http.listen(10080, function(){
	console.log('listening on *:10080');
});*/
