//prepare the line chart: 1) inserting the valid output types into the select box. 2) validating the input
function prepareLineChart(parentKeys, childKeys){
	//empty the container
	$("#lct-main-container").empty();
	//dynamically load the parent keys from the data user selected
	$.each(parentKeys, function(index, value){
		$("#lct-parentkey-select").append($("<option ></option>").attr("value", index).text(value));
	});
	$("#lct-parentkey-select option[value=0]").attr("selected", "selected");//set the first element in the parentKeys as the default value

	//set childKeys of the first parent key as the default value
	$.each(childKeys[parentKeys[0]], function(index, value){
		$("#lct-childkey-select").append($("<option></option>").attr("value", index).text(value));
	});

	//dynamically load the child keys from the parent key user selected
	$("#lct-parentkey-select").change(function(){
		$("#lct-childkey-select").empty();
		var parentkey = $("#lct-parentkey-select option:selected").text();
		var validChildKeys = childKeys[parentkey];
		$.each(validChildKeys, function(index, value){
			$("#lct-childkey-select").append($("<option></option>").attr("value", index).text(value));
		})
	});

	// set the first element of the child keys as the default option
	$("#lct-childkey-select option[value=0]").attr("selected", "selected");

	// listening the click event and add the line chart
	$("#lct-add-btn").click(function(){
		var parentkey = $("#lct-parentkey-select option:selected").text();
		var childKey = $("#lct-childkey-select option:selected").text();
		// set the width and height of the div for each line chart
		var width = $("#lct-main-container").width()*0.22;
		var height = "200";
		// get the time series data
		var timeseries = linecharts.data[parentkey][childKey];
		// the metric data is currently unavailable, so we leave them as undefined
		var metric = undefined;
		// dynamically name the id so that we can get the handler of that div and remove it
		var containerId = "lct-container-"+linecharts.charts.length;
		// inser the div
		$("#lct-main-container").append($("<div></div>").attr("width", width).attr("height", height).attr("id", containerId).css("float", "left"));
		// initialize the parameters in the line chart and return the object as the handler so that we can play with it in future
		var lct = new LineChart(parentkey, childKey, containerId, width, height, timeseries, linecharts.years, linecharts.regionNames, metric);
		// begin to draw the line chart
		lct.drawLineChart();
		// push it to our global variables
		linecharts.charts.push(lct);
	});
    
}

var LineChart = function(parentKey, childKey, containerId, width, height, data, years, regionNames, metric){
	this.parentKey = parentKey;
	this.childKey = childKey;
	this.containerId = containerId;
	this.width = width;
	this.height = height;
	this.data = data;
	// note that the int number from the server will be string, so we need to convert it first.
	this.years = years.map(function(d) { return parseInt(d);});
	this.regionNames = regionNames;
	this.metric = metric;
}

LineChart.prototype.drawLineChart = function (){
	// initialize the parameters required in svg
	$("#"+this.containerId).empty();
	$("#"+this.containerId).width(this.width);
	$("#"+this.containerId).height(this.height);
	var margin = {top: 20, right: 20, bottom: 40, left: 40},
		chartWidth = this.width - margin.left - margin.right,
		chartHeight = this.height - margin.top - margin.bottom;

	// get the minval and maxval on y axis.
	var minVal = d3.min(this.data, function(d){ return d[2]<d[5]?d[2]:d[5];}),
		maxVal = d3.max(this.data, function(d){ return d[7]>d[3]?d[7]:d[3];});

	// to have a better visualization effect, we properly scale down or up the max/min data
	minVal = (minVal<0?1.2:0.8)*minVal;
	maxVal = (maxVal<0?0.8:1.2)*maxVal;
	var x = d3.scale.linear().range([0, chartWidth]).domain([d3.min(this.years), d3.max(this.years)]);
	var y = d3.scale.linear().range([chartHeight, 0]).domain([minVal, maxVal]);

	// note that we do not need comma in year so we need to convert the tick format
	var xAxis = d3.svg.axis().scale(x).orient('bottom').innerTickSize(-chartHeight).outerTickSize(0).tickPadding(10).tickFormat(d3.format("d")),
		yAxis = d3.svg.axis().scale(y).orient('left').innerTickSize(-chartWidth).outerTickSize(0).tickPadding(10);

	var svg = d3.select("#"+this.containerId).append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// insert a clip for animation
	var rectClip = svg.append("clipPath")
		.attr("id", "rect-clip")
		.append("rect")
			.attr("width", 0)
			.attr("height", chartHeight);

	// render each element: axis, path, animation and title
	this.addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight);
	this.drawPaths(svg, x, y, margin);
	this.startTransition(svg, chartWidth, chartHeight, rectClip, x, y, margin);
	this.addTitle(svg, chartWidth, chartHeight, margin);

}

LineChart.prototype.addAxesAndLegend = function(svg, xAxis, yAxis, margin, chartWidth, chartHeight){
	var legendWidth = 100,
		legendHeight = 50;

	var axes = svg.append("g").attr("class", "lct-axis")
		.attr("transform", "translate(0," + chartHeight + ")")
		.call(xAxis);

	// note that this.metric is undefined currently and will be added in future.
	axes.append("g")
		.attr("class", "lct-axis")
		.attr("transform", "translate(0,-" + chartHeight + ")")
		.call(yAxis)
		.append("text")
			.attr("transform", 'rotate(-90)')
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text(this.metric);
}

LineChart.prototype.drawPaths = function(svg, x, y, margin){
	var that = this;
	var range = d3.svg.area()
		.interpolate('basis')
		.x(function(d, i) { return x(that.years[i]);})//year
		.y0(function(d) { return y(d[3]);})//upper limit
		.y1(function(d) { return y(d[2]);});//lower limit
	var meanline = d3.svg.line()
		.interpolate('linear')
		.x(function(d, i) { return x(that.years[i]);})//year
		.y(function(d) { return y(d[0]);});//mean value

	svg.datum(this.data);

	// draw the area chart in which the upper bound is mean+2std and lower bound is mean-2std
	svg.append("path")
		.attr("class", "lct-range")
		.attr("d", range)
		.attr("clip-path", 'url(#rect-clip)');

	// draw the line using mean value
	svg.append("path")
		.attr("class", "lct-meanline")
		.attr("d", meanline)
		.attr("clip-path", "url(#rect-clip)");
}

LineChart.prototype.startTransition = function(svg, chartWidth, chartHeight, rectClip, x, y, margin){
	// save the context object for adding circles to the line chart during setTimeout() function.
	var that = this;

	// set the time of line chart animation
	rectClip.transition()
		.duration(100*that.years.length)
		.attr("width", chartWidth);

	// enable the animation of the circles. It would be added pair by pair from left to right.
	this.data.forEach(function(circle, i){
		setTimeout(function() {
			var upMarker = {
				x: that.years[i],
				y: circle[5],
				regionCode: circle[4]
			}
			that.addMarkers(circle[0], upMarker, svg, chartHeight, x, y, margin);
			var downMarker = {
				x: that.years[i],
				y: circle[7],
				regionCode: circle[6]
			}
			that.addMarkers(circle[0], downMarker, svg, chartHeight, x, y, margin);
		}, 110*i);//note the delay follows the time delay in transition animation
	});
}


LineChart.prototype.addMarkers = function(meanVal, circle, svg, chartHeight, x, y, margin){
	// save the context object for showing data when hovering on the circle
	var that = this;

	// initialize the circle parameters
	var r = 3,
		xPos = x(circle.x)-r,
		yPos = y(circle.y)-r,
		yPosStart = y(meanVal);//the animation starts from the meanline
	var marker = svg.append("g")
		.attr("transform", "translate(" + (xPos) + "," + yPosStart + ")")
		.attr("opacity", 0);
	// set the time of the circle
	marker.transition()
		.duration(500)
		.attr("transform", "translate(" + (xPos) + "," + yPos + ")")
		.attr("opacity", 1);
	// insert the circle in each g element
	marker.append("circle")
		.attr("r", r)
		.attr("cx", r)
		.attr("cy", r)
		.style("fill", color)
		.on("mouseover", mouseover)
		.on("mousemove", function(d){
			// note that tooltip here is a global variable in global.js file
			return tooltip.style("top",(event.pageY-10)+"px").style("left", (event.pageX+10)+"px");
		})
		.on("mouseout", function(d){
			return tooltip.style("visibility", "hidden");
		});
	function color(){
		var text = circle.regionCode;
		if(text.indexOf("Neg")>-1) return "red";
		else return "darkgoldenrod";		
	}

	function mouseover(){
		// get the region code in the data
		var codes = circle.regionCode.substring(circle.regionCode.indexOf("-")+1).split(",");
		// generate the tip text information
		var text = codes.length>1?(codes.length + " regions ("+ that.regionNames[codes[0]] +", etc.)"):that.regionNames[codes[0]];
		tooltip.html("<strong>Region: </strong>" + text 
			+ "<br><strong>Value: </strong>" + parseFloat(circle.y).toFixed(2));
		// turn on the visibility of the tooltip
		return tooltip.style("visibility", "visible");
	}
}

LineChart.prototype.addTitle = function(svg, chartWidth, chartHeight, margin){
	svg.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" +(chartWidth/2)+ ","+ (margin.top*1.5+chartHeight) + ")")
		.attr("font-size", "15px")
		.text(this.childKey);

	svg.append("text")
		.attr("text-anchor", "left")
		.attr("transform", "translate(0" + ","+ (margin.top) + ")")
		.attr("font-size", "12px")
		.text(this.parentKey);
}