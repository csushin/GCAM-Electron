process.on('message', (m) => {
  // console.log('CHILD got message:', m);
  // process.send(m);
  if(m.reqType){
    process.send(m.reqType );
    switch(m.reqType){
      case 'statData request':
        processClusterDataReq(m.data);
        break;
    }
  }
});

//all output message should first send to the main process which can print the message out
process.send('invoked the process of computating of stat data...');

function processClusterDataReq(data){
  process.send('data queries length:' + data.queries.length);
  var statData = {
    test: 1
  };


  //send the message to the main process
  process.send({reqType: 'statData response', data: statData});
}