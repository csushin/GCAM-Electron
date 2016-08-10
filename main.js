const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
// Module to communicate between processes
const socket = require('electron').ipcMain

const d3 = require('d3');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // Hide the default menu
  // mainWindow.setMenu(null);

  // Maximize the browser window
  mainWindow.maximize()

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/webcontent/index.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // sendted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const child_process = require('child_process');
var child = child_process.fork(`${__dirname}/sub.js`);

socket.on('asynchronous-message', function (event, arg) {
  mainWindow.webContents.send('asynchronous-reply', 'pong')
})

child.on('message', (m) => {
  if(m.reqType){
    console.log('PARENT got message:', m.reqType);
    mainWindow.webContents.send(m.reqType, m.data);
  }
  else{
    console.log('PARENT got message:', m);
  }
});

child.on('error', function (err) {
  console.log('Error happened in child.');
});

child.on('exit', function(code, signal){
  console.log('Child exited with code ' + code);

  if(code > 0){
    console.log('New child is being spawned!')
    child = child_process.fork(`${__dirname}/sub.js`);
  }

})

socket.on('clusterData request', function(event, req){
  child.send({reqType: 'clusterData request', data: req});
  // processData(req.queries, req.keys, req.scenarios);
});

socket.on('test cluster request', function(event, req){
  child.send({reqType: 'test cluster request'});
  // processData(req.queries, req.keys, req.scenarios);
});

socket.on('yearly cluster request', function(event, req){
  child.send({reqType: 'yearly cluster request', data: req});
});

socket.on('scenario year request', function(event, req){
  // child.send({reqType: 'scenario year request', data: data});
  
  // Spawn in parent
  // Commented for fixing new format :|
  pythonPCA(req.mode, req.data);
});

socket.on('process data request', function(event, data){
  child.send({reqType:'process data request', data: data});
})

const PythonShell = require('python-shell');
const fs = require('fs');

function pythonPCA(mode, data){
  // console.log(JSON.stringify(data));
  writeData('large.txt', JSON.stringify(data));
  var options = {
    args: [mode, 'data/large.txt', true]
  };

  PythonShell.run('python/pca.py', options, function (err, results) {
    if (err) throw err;
    // results is an array consisting of messages collected during execution
    // console.log(results);
    var output = JSON.parse(results[0]);
    // console.log('output parsed: ', output);
    mainWindow.webContents.send('scenario year response', output);

    console.log('scenario year response', (new Date()).toUTCString())
  });
}

function writeData(filname, data){  
  fs.writeFile("data/" + filname, data, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("The file was saved!");
  }); 
}

function processData(queries, keys, scenarios){
  var labels = d3.keys(scenarios).sort();
  var featureVectors = new Array(labels.length),
  featureVectorCount = 0;
  console.log('labels: ' + labels.join(', '));
  console.log('keys: ', d3.keys(scenarios[labels[0]]).sort().join(', '));
  console.log('years: ', scenarios[labels[0]].years);
  // console.log('years: ', scenarios[labels[1]].years);
  // console.log('years: ', scenarios[labels[2]].years);
  console.log('processData BEGIN: ' + (new Date()).toUTCString());
  for(var si = 0; si < labels.length; si++){
    var scenarioIndex = labels[si];
    var scenarioData = scenarios[scenarioIndex].data,
    arrayLength = scenarios[scenarioIndex].years.length,
    vector = [];

    for(var dataIndex = 0; dataIndex < scenarioData["primary_energy"].length; dataIndex++){

      var queryData = scenarioData["primary_energy"][dataIndex];

      for(var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++){

        var key = keys["primary_energy"][keyIndex];

        if(!queryData[key] || queryData[key][0] == "No data"){
          // vector = vector.concat(Array.apply(null, new Array(arrayLength)).map(Number.prototype.valueOf,0));
          vector = vector.concat(new Array(arrayLength).fill(0));
        }
        else{
          vector = vector.concat(queryData[key].slice(0,-1));
        }

      }
    }

    featureVectors[featureVectorCount] = vector;
    featureVectorCount++;
  }
  writeData('featureVectors.txt', featureVectors);
  console.log('processData END: ' + (new Date()).toUTCString())
  return featureVectors;
}