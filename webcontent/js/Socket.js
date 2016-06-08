const socket = require('electron').ipcRenderer;

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
	clusters = result.clusters;

	// Render the dendogram in the page (note: pre is handled differently by IE and the rest of the browsers)
	var pre = document.getElementById('mypre') ;
	if( document.all ) {
		re.innerText = result.dendogram;
	}
	else {
		pre.innerHTML = result.dendogram;
	}

	zDendogram(result.d3Cluster);

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