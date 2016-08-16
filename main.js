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
});

socket.on('test cluster request', function(event, req){
  child.send({reqType: 'test cluster request'});
});

socket.on('yearly cluster request', function(event, req){
  child.send({reqType: 'yearly cluster request', data: req});
});

socket.on('scenario year request', function(event, req){
  pythonPCA(req.mode, req.data);
});

socket.on('process data request', function(event, data){
  child.send({reqType:'process data request', data: data});
})

const PythonShell = require('python-shell');
const fs = require('fs');
const execFile = require('child_process').execFile;

function pythonPCA(mode, data){
  // console.log(JSON.stringify(data));
  writeData('large.txt', JSON.stringify(data));
  var options = {
    args: [mode, 'data/large.txt', true]
  };

  /*PythonShell.run('python/pca.py', options, function (err, results) {
    if (err) throw err;
    // results is an array consisting of messages collected during execution
    // console.log(results);
    var output = JSON.parse(results[0]);
    // console.log('output parsed: ', output);
    mainWindow.webContents.send('scenario year response', output);

    console.log('scenario year response', (new Date()).toUTCString())
  });*/

  execFile('python/dist/pca/pca.exe', options.args, function (err, results) {
    if (err){
      console.log(err);
      return;
    }
    // results is an array consisting of messages collected during execution
    // console.log(results);
    var output = JSON.parse(results);
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