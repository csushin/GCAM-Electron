function dendogram(cluster) {
	var margin = {
			top: 20,
			right: 120,
			bottom: 20,
			left: 120
		},
		width = 960 - margin.right - margin.left,
		height = 500 - margin.top - margin.bottom;

	var i = 0,
		duration = 750,
		root;

	var tree = d3.layout.tree()
		.size([height, width]);

	var diagonal = d3.svg.diagonal()
		.projection(function(d) {
			return [d.y, d.x];
		});

	var svg = d3.select("body").append("svg")
		.attr("width", width + margin.right + margin.left)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	root = cluster;
	root.x0 = 0;
	root.y0 = 0;

	update(root);

	d3.select(self.frameElement).style("height", "500px");

	function update(source) {

		// Compute the new tree layout.
		var nodes = tree.nodes(root).reverse(),
			links = tree.links(nodes);

		// Normalize for fixed-depth.
		nodes.forEach(function(d) {
			d.y = d.depth * 180;
		});

		// Update the nodes…
		var node = svg.selectAll("g.node")
			.data(nodes, function(d) {
				return d.id || (d.id = ++i);
			});

		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) {
				return "translate(" + source.y0 + "," + source.x0 + ")";
			})
			.on("click", click);

		nodeEnter.append("circle")
			.attr("r", 1e-6)
			.style("fill", function(d) {
				return d._children ? "lightsteelblue" : "#fff";
			});

		nodeEnter.append("text")
			.attr("x", function(d) {
				return d.children || d._children ? -13 : 13;
			})
			.attr("dy", ".35em")
			.attr("text-anchor", function(d) {
				return d.children || d._children ? "end" : "start";
			})
			.text(function(d) {
				return d.name;
			})
			.style("fill-opacity", 1e-6);

		// Transition nodes to their new position.
		var nodeUpdate = node.transition()
			.duration(duration)
			.attr("transform", function(d) {
				return "translate(" + d.y + "," + d.x + ")";
			});

		nodeUpdate.select("circle")
			.attr("r", 10)
			.style("fill", function(d) {
				return d._children ? "lightsteelblue" : "#fff";
			});

		nodeUpdate.select("text")
			.style("fill-opacity", 1);

		// Transition exiting nodes to the parent's new position.
		var nodeExit = node.exit().transition()
			.duration(duration)
			.attr("transform", function(d) {
				return "translate(" + source.y + "," + source.x + ")";
			})
			.remove();

		nodeExit.select("circle")
			.attr("r", 1e-6);

		nodeExit.select("text")
			.style("fill-opacity", 1e-6);

		// Update the links…
		var link = svg.selectAll("path.link")
			.data(links, function(d) {
				return d.target.id;
			});

		// Enter any new links at the parent's previous position.
		link.enter().insert("path", "g")
			.attr("class", "link")
			.attr("d", function(d) {
				var o = {
					x: source.x0,
					y: source.y0
				};
				return diagonal({
					source: o,
					target: o
				});
			});

		// Transition links to their new position.
		link.transition()
			.duration(duration)
			.attr("d", diagonal);

		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
			.duration(duration)
			.attr("d", function(d) {
				var o = {
					x: source.x,
					y: source.y
				};
				return diagonal({
					source: o,
					target: o
				});
			})
			.remove();

		// Stash the old positions for transition.
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
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
}

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

	var svg = d3.select("#den-container").append("svg")
		.attr("name", 'dendro')
		.attr("width", width)
		.attr("height", height)
		.call(zoom)
		.append("g")
		.attr("transform", "translate(40,40)");

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
				showLoading();
				var filename = [];
				if (d.hasOwnProperty('name') && !d.hasOwnProperty('children')) {
					//add pcp function here
					filename = d.name;
					console.log('filename: ' + filename);
					state.parCoor.obj = new parCoor([filename]);
					changeView('#par');
					redrawTable();
					
					// basinflags = [];
					// drawPCP(filename);
					// $('#modelname').text('selected model: ' + d.name);
				}
				else if(d.hasOwnProperty('children') && d.children.every(function(child){filename.push(child.name); return !child.hasOwnProperty('children');})){
					state.parCoor.obj = new parCoor(filename);
					changeView('#par');
					redrawTable();
				}
				else{
					filename = [];
					getAllChildren(filename, d);
					filename.sort();
					state.parCoor.obj = new parCoor(filename);
					changeView('#par');
					redrawTable();
				}
			});
		/*.on("click", function(d){
					  if(d.hasOwnProperty('name')&&!d.hasOwnProperty('children')){
						  //add pcp function here
						  filename=d.name;
						basinflags=[];
						  drawPCP(filename);
						  $('#modelname').text('selected model: '+d.name);
					  }
					  else{
						  if(highlightednode){
							  d3.select(highlightednode).select('circle').transition()
								  		.attr('r',circleR)
								  		.duration(1000);
							  nodes[parseInt(highlightednode.id)-1].R=circleR;
							  
							  d3.select(this).select('circle').transition()
							  		.attr('r',2*circleR)
							  		.duration(1000);
							  highlightednode=this;
							  //update link
	//								  var link=svg.selectAll("path.link");
						  }
						  else{
							  d3.select(this).select('circle').transition()
						  		.attr('r',2*circleR)
						  		.duration(1000);
							highlightednode=this;
						  }
						  nodes[parseInt(highlightednode.id)-1].R=2*circleR;
						  links = cluster1.links(nodes);
						  updatelinks(links);
						  filteredNames=[];
						  filteredNames=treeTravesal(d);
						  var threshold=parseFloat($('#threshold').val()).toFixed(2);
						  drawTimeline('basin_water_scarcity','average',threshold,filteredNames);
						  
						  d3.select('#pcptooltip').remove();
							// Define 'div' for tooltips
							var div = d3.select("body")
								.append("div")  // declare the tooltip div 
								.attr("id","pcptooltip")
								.attr("class", "tooltip")              // apply the 'tooltip' class
								.style('height', '450px')
								.style('width', function(){
									return Math.min(650,$( window ).width()*0.3)+'px';
								})
								.style('overflow', 'scroll')
								.style('pointer-events', 'all')
								.style('background', 'white')
								.style("opacity", 0);                  // set the opacity to nil
	//					    	  console.log(txt);
				            div.transition()
							.duration(500)	
							.style("opacity", 0);
				            
				           div.transition()
							.duration(200)	
							.style("opacity", .9);	
				           
				           var txt='';
				           
				           for(var i=0;i<filteredNames.length;i++){
								  txt+=drawSubPCP(filteredNames[i]);
							  }
				           
				           div.html(txt)	 
							.style("left", (d3.event.pageX) + "px")			 
							.style("top", (d3.event.pageY - 28) + "px");
				           
				           d3.select('#pcptooltip').on('click',function(){
				        	   d3.select('#pcptooltip').remove();
				           });
				        
					  }
				  });*/
		// .on("click", click);


		nodeEnter.append("circle")
			.attr("r", circleR)
			//					  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
			.style("stroke", function(d) {
				return d._children ? "lightsteelblue" : d.color;
			})
			.style('fill', function(d) {
				return d.color;
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
				return d.color;
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

function dendogram2(cluster) {
	var width = 960,
		height = 500;

	var tree = d3.layout.tree()
		.size([width - 20, height - 20]);

	var root = cluster,
		nodes = tree(root);

	root.parent = root;
	root.px = root.x;
	root.py = root.y;

	var diagonal = d3.svg.diagonal();

	$("#den-container").empty();

	var svg = d3.select("#den-container").append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", "translate(10,10)");

	var node = svg.selectAll(".node"),
		link = svg.selectAll(".link");

	function update(cluster) {

		// Add a new node to a random parent.

		// Recompute the layout and data join.
		node = node.data(tree.nodes(root), function(d) {
			return d.id;
		});
		link = link.data(tree.links(nodes), function(d) {
			return d.source.id + "-" + d.target.id;
		});

		// Add entering nodes in the parent’s old position.
		node.enter().append("circle")
			.attr("class", "node")
			.attr("r", 4)
			.attr("cx", function(d) {
				return d.parent.px;
			})
			.attr("cy", function(d) {
				return d.parent.py;
			});

		// Add entering links in the parent’s old position.
		link.enter().insert("path", ".node")
			.attr("class", "link")
			.attr("d", function(d) {
				var o = {
					x: d.source.px,
					y: d.source.py
				};
				return diagonal({
					source: o,
					target: o
				});
			});

		// Transition nodes and links to their new positions.
		var t = svg.transition()
			.duration(duration);

		t.selectAll(".link")
			.attr("d", diagonal);

		t.selectAll(".node")
			.attr("cx", function(d) {
				return d.px = d.x;
			})
			.attr("cy", function(d) {
				return d.py = d.y;
			});
	}
}