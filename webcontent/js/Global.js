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
	resize: false,
	years: [],
	yearsScaled: [],
	fileMode: 0,
};

var clusterShapefile = {},
clusterData = {},
clusterQueries = [],
clusterKeys = {},
currentLayerData = [],
currentFile = {};

var geoJsonArray = [],
dataArray = [],
parameters = [],
fileNames = [],
clusters;

var clusterColors = [
   [20, 20, 80],
   [22, 22, 90],
   [250, 255, 253],
   [100, 54, 255]
];