const React = require('react');
const ReactDOM = require('react-dom');
const Select = require('react-select');


//prepare the line chart: 1) inserting the valid output types into the select box. 2) validating the input
function prepareLineChart(parentKeys, childKeys){
	$.each(parentKeys, function(index, value){
		$("#lct-parentkey-select").append($("<option ></option>").attr("value", index).text(value));
	});
	$("#lct-parentkey-select option[value=0]").attr("selected", "selected");//set the first element in the parentKeys as the default value
	$.each(childKeys[parentKeys[0]], function(index, value){//set childKeys of the first select as the default value
		$("#lct-childkey-select").append($("<option></option>").attr("value", index).text(value));
	});
	$("#lct-parentkey-select").change(function(){//change the childkeys by the selected value of the parent key
		$("#lct-childkey-select").empty();
		var parentkey = $("#lct-parentkey-select option:selected").text();
		var validChildKeys = childKeys[parentkey];
		$.each(validChildKeys, function(index, value){
			$("#lct-childkey-select").append($("<option></option>").attr("value", index).text(value));
		})
	});
	$("#lct-childkey-select option[value=0]").attr("selected", "selected");

	$("#lct-add-btn").click(function(){
		// if($("#lct-main-container").height() == 0){
		// 	$("#lct-main-container").css("height", )
		// }
		var parentkey = $("#lct-parentkey-select option:selected").text();
		var childKey = $("#lct-childkey-select option:selected").text();
		var width = $("#lct-main-container").width()*0.9;
		var height = "200";
		var timeseries = linecharts.data[parentkey][childKey], metric = undefined;//linecharts.unit[parentkey][childKey];
		var containerId = "lct-container-"+linecharts.charts.length;
		$("#lct-main-container").append($("<div></div>").attr("width", width).attr("height", height).attr("id", containerId))
		var lct = new LineChart(parentkey, childKey, containerId, width, height, timeseries, linecharts.years, metric);
		lct.drawLineChart();
		linecharts.charts.push(lct);
	});
    
    tooltip = d3.select("body")
	.append("div")
	.style("position", "absolute")
	.style("z-index", "10")
	.style("visibility", "hidden");
	//add the function of removing line charts by using right click and selecting menu.
}

var LineChart = function(parentKey, childKey, containerId, width, height, data, years, metric){
	this.parentKey = parentKey;
	this.childKey = childKey;
	this.containerId = containerId;
	this.width = width;
	this.height = height;
	this.data = data;
	this.years = years.map(function(d) { return parseInt(d);});
	this.metric = metric;
}

LineChart.prototype.drawLineChart = function (){
	$("#"+this.containerId).empty();
	$("#"+this.containerId).width(this.width);
	$("#"+this.containerId).height(this.height);
	var margin = {top: 20, right: 20, bottom: 20, left: 40},
		chartWidth = this.width - margin.left - margin.right,
		chartHeight = this.height - margin.top - margin.bottom;
	var minVal = d3.min(this.data, function(d){ return d[2]<d[5]?d[2]:d[5];}),
		maxVal = d3.max(this.data, function(d){ return d[7]>d[3]?d[7]:d[3];});
	//properly scale down or scale up the data for better visualization effect
	minVal = (minVal<0?1.2:0.8)*minVal;
	maxVal = (maxVal<0?0.8:1.2)*maxVal;
	var x = d3.scale.linear().range([0, chartWidth]).domain([d3.min(this.years), d3.max(this.years)]);
	var y = d3.scale.linear().range([chartHeight, 0]).domain([minVal, maxVal]);
	var xAxis = d3.svg.axis().scale(x).orient('bottom').innerTickSize(-chartHeight).outerTickSize(0).tickPadding(10),
		yAxis = d3.svg.axis().scale(y).orient('left').innerTickSize(-chartWidth).outerTickSize(0).tickPadding(10);

	var svg = d3.select("#"+this.containerId).append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var rectClip = svg.append("clipPath")
		.attr("id", "rect-clip")
		.append("rect")
			.attr("width", 0)
			.attr("height", chartHeight);
	this.addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight);
	this.drawPaths(svg, x, y, margin);
	this.startTransition(svg, chartWidth, chartHeight, rectClip, x, y, margin);

}

LineChart.prototype.addAxesAndLegend = function(svg, xAxis, yAxis, margin, chartWidth, chartHeight){
	var legendWidth = 100,
		legendHeight = 50;
	// clipping to make sure nothing appears behind legend
	// svg.append('clipPath')
	//     .attr('id', 'axes-clip')
	//     .append('polygon')
	//       .attr('points', (-margin.left)                 + ',' + (-margin.top)                 + ' ' +
	//                       (chartWidth - legendWidth - 1) + ',' + (-margin.top)                 + ' ' +
	//                       (chartWidth - legendWidth - 1) + ',' + legendHeight                  + ' ' +
	//                       (chartWidth + margin.right)    + ',' + legendHeight                  + ' ' +
	//                       (chartWidth + margin.right)    + ',' + (chartHeight + margin.bottom) + ' ' +
	//                       (-margin.left)                 + ',' + (chartHeight + margin.bottom));

	// var axes = svg.append('g')
	    // .attr('clip-path', 'url(#axes-clip)');


	var axes = svg.append("g").attr("class", "lct-axis")
		.attr("transform", "translate(0," + chartHeight + ")")
		.call(xAxis);

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
	// This range should be rendered outside each single line chart because it can be shared by many line charts
	// var legend = svg.append("g")
	// 	.attr("class", "lct legend")
	// 	.attr("transform", "translate(" + (chartWidth - legendWidth) + ",0)");

	// legend.append("rect")
	// 	.attr('class', "lct legend-bg")
	// 	.attr("width", legendWidth)
	// 	.attr("height", legendHeight);
	// legend.append("circle")
	// 	.attr("class", "lct outlierct")
	// 	.attr("r", "5")
	// 	.attr("x", 10)
	// 	.attr("y", 10)
	// 	.style("fill", "red");
	// legend.append("text")
	// 	.attr("x", 115)
	// 	.attr("y", 25)
	// 	.text("The most marginal country (beyond normal range).");
	// legend.append("circle")
	// 	.attr("r", "5")
	// 	.attr("x", 10)
	// 	.attr("y", 25)
	// 	.style("fill", "yellow");
	// legend.append("rect")
	// 	.attr("class", "lct-range")
	// 	.attr('x', 115)
	//     .attr('y', 85)
	//     .text('Normal Range');
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

	svg.append("path")
		.attr("class", "lct-range")
		.attr("d", range)
		.attr("clip-path", 'url(#rect-clip)');
	svg.append("path")
		.attr("class", "lct-meanline")
		.attr("d", meanline)
		.attr("clip-path", "url(#rect-clip)");
}

LineChart.prototype.startTransition = function(svg, chartWidth, chartHeight, rectClip, x, y, margin){
	var that = this;
	rectClip.transition()
		.duration(200*that.years.length)
		.attr("width", chartWidth);

	this.data.forEach(function(circle, i){
		setTimeout(function() {
			var marker = {
				x: that.years[i],
				y: circle[5],
				country: circle[4]
			}
			that.addMarkers(circle[0], marker, svg, chartHeight, x, y, margin);
			marker.y = circle[7];
			marker.country = circle[6];
			that.addMarkers(circle[0], marker, svg, chartHeight, x, y, margin);
		}, 200+200*i);//note the delay follows the time delay in transition animation
	});
}


LineChart.prototype.addMarkers = function(meanVal, circle, svg, chartHeight, x, y, margin){
	var r = 3,
		xPos = x(circle.x)+r,
		yPos = y(circle.y)+r,
		yPosStart = y(meanVal);//the animation starts from the meanline
	var marker = svg.append("g")
		.attr("transform", "translate(" + (margin.left+xPos) + "," + yPosStart + ")")
		.attr("opacity", 0);
	marker.transition()
		.duration(1000)
		.attr("transform", "translate(" + (margin.left+xPos) + "," + yPos + ")")
		.attr("opacity", 1);
	marker.append("circle")
		.attr("class", "circle"+circle.country)
		.attr("r", r)
		.attr("cx", r)
		.attr("cy", r)
		.style("fill", function(d){
			var text = this.className.baseVal.replace("circle","");
			if(parseInt(text)<0) return "red";
			else return "brown";
		})
		.on("mouseover", function(d){
			var text = this.className.baseVal.replace("circle", "").replace("-", "");
			tooltip.text(text + ", " + parseFloat(d.y).toFixed(2));
			return tooltip.style("visibility", "visible");
		})
		.on("mousemove", function(d){
			return tooltip.style("top",(event.pageY-10)+"px").style("left", (event.pageX+10)+"px");
		})
		.on("mouseout", function(d){
			return tooltip.style("visibility", "hidden");
		});
}