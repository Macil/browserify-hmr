'use strict';

var _ = require('lodash');
var express = require('express');
var http = require('http');
var https = require('https');
var socketio = require('socket.io');
var has = require('./lib/has');

function log() {
  console.log.apply(console, [new Date().toTimeString(), '[HMR]'].concat(_.toArray(arguments)));
}

var hostname, port, tlsoptions;
var io;
var currentModuleData = {};

var runServer = _.once(function() {
  var app = express();
  var server = tlsoptions ? https.Server(tlsoptions, app) : http.Server(app);
  io = socketio(server);
  io.on('connection', function(socket) {
    socket.on('sync', function(syncMsg) {
      log('User connected, syncing');
      var newModuleData = _.chain(currentModuleData)
        .pairs()
        .filter(function(pair) {
          return !has(syncMsg, pair[0]) || syncMsg[pair[0]].hash !== pair[1].hash;
        })
        .zipObject()
        .value();
      var removedModules = _.chain(syncMsg)
        .keys()
        .filter(function(name) {
          return !has(currentModuleData, name);
        })
        .value();
      socket.emit('sync confirm', null);
      if (Object.keys(newModuleData).length || removedModules.length)
        socket.emit('new modules', {newModuleData: newModuleData, removedModules: removedModules});
    });
  });
  server.listen(port, hostname, function() {
    log('Listening on '+hostname+':'+port);
  });
});

function setNewModuleData(newModuleData, removedModules) {
  runServer();
  _.assign(currentModuleData, newModuleData);
  removedModules.forEach(function(name) {
    delete currentModuleData[name];
  });
  if (Object.keys(newModuleData).length || removedModules.length) {
    log('Emitting updates');
    io.emit('new modules', {newModuleData: newModuleData, removedModules: removedModules});
  }
}

process.on('message', function(msg) {
  if (msg.type === 'config') {
    hostname = msg.hostname;
    port = msg.port;
    tlsoptions = msg.tlsoptions;
  } else if (msg.type === 'setNewModuleData') {
    process.send({type: 'confirmNewModuleData'});
    setNewModuleData(msg.newModuleData, msg.removedModules);
  } else {
    log('Unknow message type', msg.type);
  }
});
process.on('disconnect', function() {
  process.exit(0);
});
