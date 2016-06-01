
process.on('message', (m) => {
  // console.log('CHILD got message:', m);
  // process.send(m);
  if(m.reqType){
    process.send(m.reqType );
    switch(m.reqType){
      case 'clusterData request':
        processClusterDataReq(m.data);
        break;
      case 'yearly cluster request':
        processYearlyClusterReq(m.data);
        break;
    }
  }
});

process.send('connected');

const figue = require('./lib/figue');
const ML = require('ml');
const d3 = require('d3');

function processClusterDataReq(data){
  process.send('processClusterDataReq');
  var labels = d3.keys(data.scenarios).sort();
  var vectors = processData(data.queries, data.keys, data.scenarios);
  process.send({reqType: 'progress update', data: 0.25});

  console.log('agglomerate BEGIN', (new Date()).toUTCString());
  var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
  process.send({reqType: 'progress update', data: 0.25});
  console.log('agglomerate END', (new Date()).toUTCString());

  console.log('buildDendogram BEGIN', (new Date()).toUTCString());
  var dendogram = clusters.buildDendogram(5, true, true, false, true);
  console.log('buildDendogram END', (new Date()).toUTCString());
  process.send({reqType: 'progress update', data: 0.25});

  console.log('buildD3Cluster BEGIN', (new Date()).toUTCString());
  var d3Cluster = buildD3Cluster(clusters);
  console.log("dendogram created!");
  console.log('buildD3Cluster END', (new Date()).toUTCString());
      
  process.send({reqType: 'cluster response', data: {clusters: clusters, dendogram: dendogram, d3Cluster: d3Cluster}});
}

function processYearlyClusterReq(data){
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
    process.send({reqType: 'progress update', data: 0.03});
  }
  else{
    yearVectors = getYearVectors(data.queries, data.keys, data.scenarios);
  }

  process.send({reqType: 'progress update', data: 0.2});

  if(!data.mode){
    transformedVectors = PCA(yearVectors, 2);
    process.send({reqType: 'yearly cluster response', data: transformedVectors});
    console.log('yearly cluster response', (new Date()).toUTCString());
  }
  else{
    pythonPCA(data.pythonMode, yearVectors, data.pcaMode > 2, process);
  }
  return;
}

process.on('process data request', function(index){
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
process.on('compare data request', function(data){

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

process.on('compare vector request', function(data){

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
    //  clusterArray.push(figue.agglomerate(labels, yearlyVector[i], figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE));
    // }
    var yearVectors = getYearVectors(queries, keys, scenarios);
    var transformedVectors = PCA(yearVectors, 2);

    process.send('yearly cluster response', transformedVectors);
  })
}

process.on('process request', function(data){
  process.nextTick(function(){
    var vectors = processData(data.queries, data.keys, data.scenarios);
    process.send('process response', vectors);
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

function pythonPCA(mode, data, useFile, process){
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
    process.sender.send('yearly cluster response', output);

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