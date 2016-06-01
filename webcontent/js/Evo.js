function scatter(type){

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
    padding = {top: 50,  right: 40,  bottom: 10,  left: 10},
    width = $('#evo-container').width() - margin.left - margin.right - padding.left - padding.right,
    height = $('#evo-container').height() - margin.top - margin.bottom - padding.top - padding.bottom - 40;

  /* 
   * value accessor - returns the value to encode for a given data object.
   * scale - maps value to a visual display encoding, such as a pixel position.
   * map function - maps from data value to display value
   * axis - sets up axis
   */ 

  // setup x 
  var xValue = function(d) {
        if(!type)
          return d.sepal_wid;
        else
          return d[0];
      }, // data -> value
      xScale = d3.scale.linear().range([0, width]), // value -> display
      xMap = function(d) { return xScale(xValue(d));}, // data -> display
      xAxis = d3.svg.axis().scale(xScale).orient("bottom");

  // setup y
  var yValue = function(d) {
        if(!type)
          return d.sepal_len;
        else
          return d[1];
      }, // data -> value
      yScale = d3.scale.linear().range([height, 0]), // value -> display
      yMap = function(d) { return yScale(yValue(d));}, // data -> display
      yAxis = d3.svg.axis().scale(yScale).orient("left");

  var bins = d3.layout.histogram().bins(6)(state.years);

  // setup fill color
  var cValue = function(d, i) {
        // console.log('i: ', i);
        if(!type)
          return d.class;
        else{
          // console.log('i: ', state.years[i]);
          for(var index = 0; index < bins.length; index++){
            if(bins[index].indexOf(state.years[i]) > -1){
              // console.log('i: ', index);
              return index;
            }
          }
          return 0;
        }
      },
      color = d3.scale.ordinal()
          .domain(Array.apply(null, {length: 6}).map(Number.call, Number))
          .range(colorbrewer.YlGnBu[9].slice(2,-1));

  $('#evo-graph-svg').remove()

  // add the graph canvas to the body of the webpage
  var svg = d3.select("#evo-svg-container").append("svg")
      .attr("id", "evo-graph-svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // add the tooltip area to the webpage
  var tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  // load data
  var data = type;

  // don't want dots overlapping axis, so add in buffer to data domain
  xScale.domain([d3.min(data, xValue)-1, d3.max(data, xValue)+1]);
  yScale.domain([d3.min(data, yValue)-1, d3.max(data, yValue)+1]);

  /*// x-axis
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Calories");

  // y-axis
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Protein (g)");*/

  var dots = svg.append("g");

  // draw lines
  var line = d3.svg.line()
      .x(xMap)
      .y(yMap)
      .interpolate("linear");  

  dots.append("path")
      .attr("d", function(d) { return line(data)})
      .attr("transform", "translate(0,0)")
      .style("stroke-width", 1)
          .style("stroke", "black")
          .style("fill", "none");

  var filteredData = [],
  yearInfo = [];
  for(var i = 0; i < data.length; i++){
    var point = data[i],
    match = -1;

    var exists = filteredData.some(function(n, index){
      match = index;
      return point[0] == n[0] && point[1] == n[1];
    });

    if(!exists){      
      filteredData.push(point);
      yearInfo.push([state.years[i]]);
    }
    else{
      yearInfo[match].push(state.years[i]);
    }
  }

  console.log(yearInfo);

  $('.contextMenu').remove();

  var contextMenu = d3.select("body").append("div")
    .attr("class", "contextMenu")
    // .style("opacity", 0)
    // .style("width", "200px")
    .style("position", "absolute");
    

  // draw dots
  dots.selectAll(".dot")
      .data(filteredData)
    .enter().append("circle")
      .attr("class", "dot")
      // Size will need to grow based on year count for point
      .attr("r", 3.5)
      .attr("cx", xMap)
      .attr("cy", yMap)
      // Fill will need to be gradient for multiple years that overlap and have different bins
      .style("fill", function(d, i) { return color(cValue(d, i));}) 
      .on("mouseover", function(d, i) {          
        var dClass = yearInfo[i].join('-');
          console.log('i: ', i, ', class: ', dClass)
          if(!this.yearsShown){
            tooltip.transition()
              .duration(200)
              .style("opacity", .9);
            tooltip.html('<b>' + yearInfo[i].join(', ')/* + "<br/> (" + xValue(d) 
              + ", " + yValue(d) + ")"*/ + '</b>')
              .style("left", (d3.event.pageX + 5) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
          }
      })
      .on("mouseout", function(d) {
          tooltip.transition()
               .duration(500)
               .style("opacity", 0);
          $(tooltip).empty();
      })
      .on("click", function(d, i){
          // If more than one year give user option to select which year to examine
          if(yearInfo[i].length == 1){
            showLoading();
            $('#par-year-select').val(i);
            state.parCoor.year = i;         
            state.parCoor.obj = new parCoor(d3.keys(clusterData));
            $('#par-year-select').change();
            changeView('#par');
          }
          else{
            d3.event.stopPropagation();
            var content = "<ul id='contextMenu'>";
            for(var index = 0; index < yearInfo[i].length; index++){
              content += "<li value='" + index + "'>" + yearInfo[i][index] + "</li>";        
            }
            content += "</ul>";

            console.log('content: ', content);

            $(contextMenu).empty();
            contextMenu.html(content)
              .style("left", (d3.event.pageX + 5) + "px")
              .style("top", (d3.event.pageY + 10) + "px")
              .style("z-index", "1070px");
              
            $('#contextMenu').menu();

            $('#contextMenu').click(function(e) {
              showLoading();

              var yearIndex = state.years.indexOf(yearInfo[i][e.target.value]);

              $(contextMenu).empty();
              
              $('#par-year-select').val(yearIndex);
              state.parCoor.year = yearIndex;         
              state.parCoor.obj = new parCoor(d3.keys(clusterData));
              $('#par-year-select').change();
              changeView('#par');

              // e.stopPropagation();
            });
          }          
      })
      /*.on('contextmenu', function(d, i){
        d3.event.preventDefault();

        // contextMenu.transition()
        //   .duration(200)
        //   .style("opacity", .9);

        var content = "<ul id='contextMenu'>";
        for(var index = 0; index < yearInfo[i].length; index++){
          content += "<li value='" + index + "'>" + yearInfo[i][index] + "</li>";        
        }
        content += "</ul>";

        // console.log('content: ', content);

        $(contextMenu).empty();
        contextMenu.html(content)
          .style("left", (d3.event.pageX + 5) + "px")
          .style("top", (d3.event.pageY + 10) + "px")
          .style("z-index", "1070px")
          .style("width", "200px");
          
        $('#contextMenu').menu();

        $('#contextMenu').click(function(e) {          
          // console.log(e);
          // globalEvent = e;
          // console.log($(this).find("span.t").val());
          // contextMenu.transition()
          //      .duration(500)
          //      .style("opacity", 0);

          var yearIndex = state.years.indexOf(yearInfo[i][e.target.value]);

          $(contextMenu).empty();
          
          $('#par-year-select').val(yearIndex);
          state.parCoor.year = yearIndex;         
          state.parCoor.obj = new parCoor(d3.keys(clusterData));
          $('#par-year-select').change();
          changeView('#par');

          event.stopPropagation();
        });
      });*/

  this.data = filteredData;

  this.drawYears = function(draw){
    if(!draw){
      this.yearsShown = true;
      dots.selectAll(".years")
      // d3.select("#evo-svg-container").selectAll(".years")
        .data(filteredData)
      .enter().append("text")
        .attr("class", "years")
        .attr("transform", function(d, i){ return "translate(" + (xMap(d) + 0) + ", " + (yMap(d) - 28) + ")"})
        // .style("left", function(d, i){ return (xMap(d) + 5) + "px"})
        // .style("top",  function(d, i){ return (yMap(d) + 28) + "px"})
        .style("font-weight", "bold") 
        .text(function(d,i){return yearInfo[i].join(', ')});
    }
    else{
      dots.selectAll(".years").remove();
      this.yearsShown = false;
    }
  }
  console.log('#evo-year-select', $('#evo-year-select').val());
  if($('#evo-year-select').val() == 0)
    this.drawYears(0);

  /*$.contextMenu({
    selector: '.dot', 
    callback: function(key, options) {
        var m = "clicked: " + key;
        window.console && console.log(m) || alert(m); 
    },
    items: {
        "edit": {name: "Edit", icon: "edit"},
        "cut": {name: "Cut", icon: "cut"},
       copy: {name: "Copy", icon: "copy"},
        "paste": {name: "Paste", icon: "paste"},
        "delete": {name: "Delete", icon: "delete"},
        "sep1": "---------",
        "quit": {name: "Quit", icon: function(){
            return 'context-menu-icon context-menu-icon-quit';
        }}
    }
  });*/

  // draw legend
  /*var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  // draw legend colored rectangles
  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  // draw legend text
  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d;})*/
}

function evoLegend(){
  var legendWidth = 150,
  legendHeight = 20;
  var colors = colorbrewer.YlGnBu[9].slice(2,-1);
  var margin = {top: 0, right: 20, bottom: 0, left: 40},
    padding = {top: 0,  right: 40,  bottom: 0,  left: 10},
    width = legendWidth * 2 - margin.left - margin.right - padding.left - padding.right,
    height = $('#evo-controls-container').height();

  var svg = d3.select("#evo-controls-container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("float", "left")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var gradient = svg.append("defs")
    .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")
      .attr("spreadMethod", "pad");
  
  // 0->20->40->60->80->100
  var pIncrement = 100 / colors.length-1;

  for(var i = 0; i < colors.length; i++){
    gradient.append("stop")
      .attr("offset", (i * pIncrement) + "%")
      .attr("stop-color", colors[i])
      .attr("stop-opacity", 1);
  }

  var legendWidth = 150;

  var legend = svg.append("g")
    .attr("class", "legend")
    // .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#gradient)");

  legend.append("text")
    .attr("x", 0)
    .attr("y", legendHeight + 5)
    .attr("dy", 5)
    .style("text-anchor", "middle")
    .text("t")
    .append("tspan")
      .text("min");

  legend.append("text")
    .attr("x", legendWidth)
    .attr("y", legendHeight + 5)
    .attr("dy", 5)
    .style("text-anchor", "middle")
    .text("t")
    .append("tspan")
      .text("max");
}

$(document).ready(function(){
  $('body').on('click', function(){
    $('.contextMenu').empty();
  })
})

$( window ).load(function() {
  $('#evo-cluster-select').change(function(e) {
    state.evo.pcaMode = +$(this).val();

    if(state.evo.pcaMode == 3)
      state.evo.mode = 1;
    else
      state.evo.mode = 0;

    yearlyClusterRequest(null, null, null, 0);
  });

  $('#evo-year-select').change(function(e) {
    state.evo.obj.drawYears(+$(this).val());
  });

  evoLegend();
});