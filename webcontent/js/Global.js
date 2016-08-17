var state = {
	geoLoaded: 0,
	scenariosLoaded: 0,
	fileCount: 0,
	scenarioCount: 0,
	sizes: {
		parCoor: {
			main: {
				height: 0.95,
				mHeight: 0,
				mWidth: 0
			},
			controls: {
				height: 0.05
			}
		}
	},
	map: {
		selectedLayer: null,
	},
	parCoor: {
		year: -1,
		plot: 0,
		filenames: [],
		obj: null
	},
	dataTable: {
		hasLoaded: false
	},
	evo: {
		mode: 0,
		pcaMode: 0,
		pythonMode: 0,
		obj: null,
		scatterDrawn: false
	},
	den: {
		colors: null
	},
	resize: false,
	years: [],
	yearsScaled: [],
	fileMode: 0,
};

// stores the shape file
var clusterShapefile = {},
// stores the scenario file information
clusterData = {},
clusterQueries = [],
// stores the associated cluster queries and their keys
clusterKeys = {},
currentLayerData = [],
currentFile = {};

var geoJsonArray = [],
dataArray = [],
parameters = [],
fileNames = [],
clusters;

var linecharts = {
	data:{},
	charts: []
};
var tooltip;

var clusterColors = [
   [20, 20, 80],
   [22, 22, 90],
   [250, 255, 253],
   [100, 54, 255]
];

// Addon functions
jQuery.fn.d3Click = function () {
  this.each(function (i, e) {
    var evt = new MouseEvent("click");
    e.dispatchEvent(evt);
  });
};

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};