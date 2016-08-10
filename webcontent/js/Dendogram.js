
function getAllChildren(childList, node){
	node.children.forEach(function(child){
		if(!child.hasOwnProperty('children')){
			childList.push(child.name);
		}
		else{
			getAllChildren(childList, child);
		}
	});
	return childList;
}

function zDendogram(cluster) {

	var width = $('#den-container').width() - 100,
		height = $('#den-container').height() - 50;

	var i = 0,
		duration = 750,
		circleR = 10;

	var cluster1 = d3.layout.tree()
		.size([width - 100, height / 2]);

	// Setup zoom and pan
	var zoom = d3.behavior.zoom()
		.scaleExtent([.1, 10])
		.on('zoom', function() {
			svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
		})
		// Offset so that first pan and zoom does not jump back to the origin
		// .translate([50, height / 2]);

	$('#den-container').empty();

	$('#den-container').append('<a href="#" onclick="dendogramLegend()" style="display: block;">Legend</a>');

	var svg = d3.select("#den-container").append("svg")
		.attr("name", 'dendro')
		.attr("width", width)
		.attr("height", height)
		.call(zoom)
		.append("g")
		.attr("transform", "translate(40,40)");

	var colors = d3.scale.ordinal()
	    .domain(d3.keys(cluster.inputs))
	    .range(colorbrewer.Set3[12]);

	state.den.colors = colors;

	update(cluster);

	d3.select(self.frameElement).style("height", height + "px");




	function updatelinks(links) {
		svg.selectAll('path').remove();

		var link = svg.selectAll("path.link")
			.data(links, function(d) {
				return d.target.id;
			});

		// Enter any new links at the parent's previous position.
		link.enter()
			//			  		.insert("path", "g")
			.append('path')
			.attr("class", "link")
			.attr('d', elbow);
	}

	function update(source) {

		// Compute the new tree layout.
		var nodes = cluster1.nodes(cluster).reverse();
		var links = cluster1.links(nodes);

		// Normalize for fixed-depth.
		nodes.forEach(function(d) {
			d.y = (d.depth * 110);
			d.R = circleR
		});

		// Update the nodes…
		var node = svg.selectAll("g.node")
			.data(nodes, function(d) {
				return d.id || (d.id = ++i);
			});

		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append("g")
			.attr('id', function(d) {
				return d.id;
			})
			.attr("class", "node")
			.on("click", function(d) {
				showLoading(true);
				var filename = [];
				// console.log('d: ', d);

				if (d.hasOwnProperty('name') && !d.hasOwnProperty('children')) {
					filename = d.name;
					changeView('#par', function(){
						state.parCoor.obj = new parCoor([filename]);
					});
				}
				else if(d.hasOwnProperty('children') && d.children.every(function(child){filename.push(child.name); return !child.hasOwnProperty('children');})){
					changeView('#par', function(){
						state.parCoor.obj = new parCoor(filename);
					});
				}
				else{
					filename = [];
					getAllChildren(filename, d);
					filename.sort();
					
					changeView('#par', function(){
						state.parCoor.obj = new parCoor(filename);
					});
				}
			});

		nodeEnter.append("circle")
			.attr("r", circleR)
			//					  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
			.style("stroke", function(d) {
				return d._children ? "lightsteelblue" : d.color;
			})
			.style('fill', function(d, i) {
				// console.log(i, d);
				var color;
				if(d.maxType){
					color = colors(d.maxType);
				}
				return color;
			});

		nodeEnter.append("text")
			// .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
			.attr("x", function(d) {
				return d.children || d._children ? 0 : 13;
			})
			.attr("y", function(d) {
				return d.children || d._children ? 20 : 0;
			})
			.attr("dy", ".35em")
			.attr("text-anchor", function(d) {
				return d.children || d._children ? "middle" : "start";
			})
			.text(function(d) {
				return d.name;
			})
			.style("fill-opacity", 1e-6);

		var nodeUpdate = node.attr("transform", function(d) {
			return "translate(" + d.y + "," + d.x + ")";
		});

		nodeUpdate.select("circle")
			.attr("r", circleR)
			.style("stroke", function(d) {
				return d._children ? "lightsteelblue" : d.color;
			})
			.style('fill', function(d) {
				var color;
				if(d.maxType){
					color = colors(d.maxType);
				}
				return color;
			});

		nodeUpdate.select("text")
			.style("fill-opacity", 1.5);

		// Update the links…
		updatelinks(links);

		// Stash the old positions for transition.
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});

		//  var legend= svg.selectAll('.legend')
		// .data(parNames)
		// .enter().append('g')
		// .attr('class','legend')
		// .attr('transform',function(d,i){
		// 	return 'translate(-'+(width*1.2)+','+(height-i*31)+')';
		// });

		// legend.append("rect")
		//     .attr("x", width - 110)
		//     .attr("width", 30)
		//     .attr("height", 30)
		//     .style("fill", function(d,i){
		//   	  return relatedColor[i];
		//     });

		// legend.append("text")
		//     .attr("x", width-70)
		//     .attr("y", 9)
		//     .attr("dy", ".35em")
		//     .style("text-anchor", "start")
		//     .text(function(d) { return d; })
		//     .style('font-size','30px');
	}

	// Toggle children on click.
	function click(d) {
		if (d.children) {
			d._children = d.children;
			d.children = null;
		} else {
			d.children = d._children;
			d._children = null;
		}
		update(d);
	}

	function elbow(d) {
		//				console.log(d);
		var sourceX = d.source.x,
			sourceY = d.source.y + d.source.R,
			targetX = d.target.x,
			targetY = d.target.y - d.target.R;

		return "M" + sourceY + "," + sourceX +
			"H" + (sourceY + (targetY - sourceY) / 2) +
			"V" + targetX +
			"H" + targetY;
	}


	function transitionElbow(d) {
		return "M" + d.source.y + "," + d.source.x +
			"H" + d.source.y +
			"V" + d.source.x +
			"H" + d.source.y;
	}
}

function dendogramLegend(){
	if(state.den.colors == null)
		return;

	var color = state.den.colors;
	var legendRectSize = 18;
	var legendSpacing = 4;
	var lineHeight = legendRectSize + legendSpacing;
	var height = color.domain().length * lineHeight + legendSpacing + 20;

	if($('#dialog-legend-div').length == 0){
		$('body').append('<div id="dialog-legend" title="Legend"><div id="dialog-legend-div" style="width:' + ($('body').width() * .2) + ';height:' + height +';">');
		$( "#dialog-legend" ).dialog({
			autoOpen: false
		});
	}
	$("#dialog-legend-div").empty();

	var svg = d3.select("#dialog-legend-div").append("svg")
	    .attr("width", ($('body').width() * .2))
	    .attr("height", height);

	var legend = svg.selectAll('.legend')                    
      .data(color.domain())                                  
      .enter()                                               
      .append('g')                                           
      .attr('class', 'legend')                               
      .attr('transform', function(d, i) {                    
        var height = legendRectSize + legendSpacing;         
        // var offset =  height * color.domain().length / 2;    
        var horz =  legendRectSize;                      
        // var vert = i * height - offset;  
        var vert = i * height + legendSpacing + 20;                    
        return 'translate(' + horz + ',' + vert + ')';       
      });                                                    

    legend.append('rect')                                    
      .attr('width', legendRectSize)                         
      .attr('height', legendRectSize)                        
      .style('fill', color)                                  
      .style('stroke', color);                               
      
    legend.append('text')                                    
      .attr('x', legendRectSize + legendSpacing)             
      .attr('y', legendRectSize - legendSpacing)             
      .text(function(d) { return d; });

    $( "#dialog-legend" ).dialog("open");
}