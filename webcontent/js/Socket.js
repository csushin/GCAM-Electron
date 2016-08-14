const socket = require('electron').ipcRenderer;

// Socket Requests (Outgoing)
function scenarioYearRequest(scenarioVectors, mode, delay){
	console.log('scenario year request', new Date(), ', mode: ', mode);
	socket.send('scenario year request', {data: scenarioVectors, mode: !mode ? 0 : mode});
	setTimeout(showLoading, !delay ? 1000 : delay);
}

function yearlyClusterRequest(mode, pcaMode, pythonMode, delay){
	console.log('yearly cluster request', new Date());
	socket.send('yearly cluster request', {
		queries: clusterQueries,
		keys: clusterKeys,
		scenarios: clusterData,
		mode: !mode ? state.evo.mode : mode,
		pcaMode: !pcaMode ? state.evo.pcaMode : pcaMode,
		pythonMode: !pythonMode ? state.evo.pythonMode : pythonMode,
	});
	setTimeout(showLoading, !delay ? 1000 : delay);
}


// Socket.on (incoming from main.js)
socket.on('console', function (event, args, optional) {
	console.log(args, optional)
})

socket.on('factorial-computed', function (event, input, output) {
  console.log(`The factorial of ${input} is ${output}`)
})

socket.on('asynchronous-reply', function (event, arg) {
  console.log(`Asynchronous message reply: ${arg}`)
})

socket.on('progress update', function(event, progress){
	console.log('progress update');
	progressLoadingBar(progress);
});

socket.on('cluster response', function(event, result){
	console.log('cluster response', new Date())
	yearlyClusterRequest();

	// Commented out to see if it's causing the hiccup
	// clusters = result.clusters;

	// Render the dendogram in the page (note: pre is handled differently by IE and the rest of the browsers)
	var pre = document.getElementById('mypre') ;
	if( document.all ) {
		re.innerText = result.dendogram;
	}
	else {
		pre.innerHTML = result.dendogram;
	}

	zDendogram(result.d3Cluster);
	globalD3Cluster = result.d3Cluster;
	state.den.data = result.d3Cluster;
	hideLoading();			
});

socket.on('yearly cluster response', function(event, result){
	console.log('yearly cluster response', new Date());
	yearVectors = result;

	$('#evo-controls-container').show();

	state.evo.obj = new Evo(yearVectors);
	hideLoading();
});

socket.on('scenario year response', function(event, result){
	console.log('scenario year response', new Date());
	// scenariYear = result;
	state.evo.scatterData = result;
	state.evo.scatterPlot = new ScatterPlot(result);
	hideLoading();
});

socket.on('process response', function(event, result){
	globalVector = result;
	console.log('process response', result);
});

/*********************Begin Modification by Xing Liang, Aug 2016***************************/ 
socket.on('statData response', function(event, req){
  console.log('stat data received!', new Date());
  console.log(req);

});
/***********************End Modification by Xing Liang, Aug 2016***************************/ 