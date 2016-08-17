/*********************Addeed by Xing Liang, Aug 2016***************************/ 
process.on('message', (m) => {
  // console.log('CHILD got message:', m);
  // process.send(m);
  if(m.reqType){
    process.send(m.reqType );
    switch(m.reqType){
      case 'statData request':
        processClusterDataReq(m.data);
        break;
    }
  }
});

//all output message should first send to the main process which can print the message ou
process.send('invoked the process of computating of stat data...');

function processClusterDataReq(data){
  
  var ret = {};
  var regions = [], years = [], dataMetrics = {};
  var statRet = {};
  
  //get the amount of regions and years. Here I assume each scenario has the same available regions and years
  var firstKey = Object.keys(data.datatable)[0];
  years = data.datatable[firstKey]['years'];
  regionNames = data.datatable[firstKey]['properties'].map(function(d) {return d["REGION_NAME"];});
  // for(var key in ){
  //   var scenarioName = data.scenarios[key];
    
  //   break;
  // }

  // Compute the mean, start from the parent output. Result uses int index while original data uses string index
  // Put the mean of all countries in that time slice to the end of the array
  for(var i=0; i<data.queries.length; i++){
    var parentKey = data.queries[i];//such as "CO2 emissions by aggregate sector"
    for(var j=0; j<data.keys[parentKey].length; j++){
      var childKey = data.keys[parentKey][j];//string index, such as 'data' or "transportation"
      if(ret[parentKey]==undefined) ret[parentKey] = {};
      ret[parentKey][childKey] = [];//add 2 property for mean and std of all regions
      //first do the mean over the countries in each time slice
      for(var yearInd in years){
        //for each scenario
        for(var scenarioId in data.scenarios){
          var sumAllRegions = 0.0;
          var Regioncount = 0;
          var scenarioName = data.scenarios[scenarioId];
          data.datatable[scenarioName]['data'][parentKey].forEach(function(d, regionInd){
            // get the sum of all countries in all scenarios. Some of the childkey output is null and we take them as zer

            // Initialize the data arrays
            if(ret[parentKey][childKey] == undefined) ret[parentKey][childKey] = [];
            if(ret[parentKey][childKey][yearInd] == undefined) ret[parentKey][childKey][yearInd] = [];
            if(ret[parentKey][childKey][yearInd][regionInd] == null) ret[parentKey][childKey][yearInd][regionInd] = 0;

            //check if there is no value in the original data which means it is zero in number instead of other string type numbers
            if(d[childKey]!=undefined && d[childKey][yearInd]!=0){
              sumAllRegions+=parseFloat(d[childKey][yearInd]);
              Regioncount++;
              // get the sum of each country in all scenarios
              ret[parentKey][childKey][yearInd][regionInd] += parseFloat(d[childKey][yearInd]);
            }
            else{
              //if there is no value for some countries, we set them as MIN_VALUE and do not count them into the computation
              if(d[childKey]!=undefined) ret[parentKey][childKey][yearInd][regionInd] = Number.MIN_VALUE;
            }
            
            // process.send(ret[i][j][yearInd][regionInd])
            // if all scenarios are added, compute each country's average over all scenarios
            if(scenarioId == data.scenarios.length-1) ret[parentKey][childKey][yearInd][regionInd] /= data.scenarios.length;
          });
        }
        ret[parentKey][childKey][yearInd].push(Regioncount==0?Number.MIN_VALUE:sumAllRegions/Regioncount);//put the mean of all countries in that time slice to the end of the array
      }
    }
  }

  // Compute std using the mean and each sample value
  // Put the std at the end of array (right after the mean value), also insert the lower and upper range mean+-2*std
  for(var i=0; i<data.queries.length; i++){
    var parentKey = data.queries[i];//such as "CO2 emissions by aggregate sector"
    for(var j=0; j<data.keys[parentKey].length; j++){
      var childKey = data.keys[parentKey][j];//string index, such as 'data' or "transportation"
      for(var yearInd in years){//for each year from 1990 to ...
        var squareSum = 0, countRegions = 0, lastIndex = ret[parentKey][childKey][yearInd].length-1;
        var mean = ret[parentKey][childKey][yearInd][lastIndex];
        ret[parentKey][childKey][yearInd].forEach(function(d, regionInd){
          //Because we are going to manually concat some values after the original array, so here the lastIndex means the last index for countries. After that they are manually inserted stat values.
          if(regionInd<lastIndex && d!=Number.MIN_VALUE){
            squareSum += Math.pow(d-mean, 2.0);
            countRegions++;
          }
        });
        var std = countRegions==0?0:Math.sqrt(squareSum/(countRegions-1), 2);
        ret[parentKey][childKey][yearInd].push(std);
        ret[parentKey][childKey][yearInd].push(mean-2*std);
        ret[parentKey][childKey][yearInd].push(mean+2*std);

      }
    }
  }

  // Extract the two country with minimum and maximum value.
  for(var i=0; i<data.queries.length; i++){
    var parentKey = data.queries[i];//such as "CO2 emissions by aggregate sector"
    for(var j=0; j<data.keys[parentKey].length; j++){
      var childKey = data.keys[parentKey][j];//string index, such as 'data' or "transportation"
      for(var yearInd in years){//for each year from 1990 to ...
        var lastIndex = ret[parentKey][childKey][yearInd].length-1;
        var upper = ret[parentKey][childKey][yearInd][lastIndex];
        var lower = ret[parentKey][childKey][yearInd][lastIndex-1];
        var min = Number.MAX_VALUE, max = Number.MIN_VALUE;
        var minRegionId, maxRegionId;
        ret[parentKey][childKey][yearInd].forEach(function(d, regionInd){
          if(regionInd<lastIndex-4 && d!=Number.MIN_VALUE){
            if(d<min){
              min = d;
              minRegionId = regionInd;
            }
            if(d>max){
              max = d;
              maxRegionId = regionInd;
            }
          }
        });
        // we not only record the country with the lowest value, but also record them if beyond the range mean-2*std by sign.
        ret[parentKey][childKey][yearInd][lastIndex+2] = min;
        ret[parentKey][childKey][yearInd][lastIndex+1] = (min<lower?-1:1)*minRegionId;
        ret[parentKey][childKey][yearInd][lastIndex+4] = max;
        ret[parentKey][childKey][yearInd][lastIndex+3] = (max>upper?-1:1)*maxRegionId;
        // the order of the array will be 0-mean, 1-std, 2-lower, 3-upper, 4-country index with the lowest value, 5-the lowest value, 6-country index with the highest value and 7-the highest value.
        // for slice function, negative numbers means number of elements slicing from the end
        var obj = ret[parentKey][childKey][yearInd].slice(-8);
        if(obj[0] == null) process.send(obj);//jsut for debugging
        ret[parentKey][childKey][yearInd] = obj;
      }
    }
  }

  //send the message to the main process
  process.send({reqType: 'statData response', data: {data: ret, years: years, regionNames: regionNames, unit: dataMetrics}});
}