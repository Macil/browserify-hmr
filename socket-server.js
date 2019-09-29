'use strict';

var net = require('net');
var _ = require('lodash');
var express = require('express');
var http = require('http');
var https = require('https');
var socketio = require('socket.io');
var has = require('./lib/has');
var readline = require('readline');
var url = require('url');

function log() {
  console.log.apply(console, [new Date().toTimeString(), '[HMR]'].concat(_.toArray(arguments)));
}

var parent = new net.Socket({fd: 3});
var parentReadline = readline.createInterface({
  input: parent,
  output: process.stdout,
  terminal: false
});

var disableHostCheck, hostname, port, tlsoptions;
var currentModuleData = {};

function isValidHeader(header) {
  if (disableHostCheck) {
    return true;
  }

  const value = url.parse(
    // if hostHeader doesn't have scheme, add // for parsing.
    /^(.+:)?\/\//.test(header) ? header : `//${header}`,
    false,
    true,
  ).hostname;

  // allow localhost and 127.0.0.1 for convenience
  if (value === 'localhost' || value === '127.0.0.1') {
    return true;
  }

  if (value === hostname) {
    return true;
  }

  return false;
}

var runServer = _.once(function() {
  var app = express();
  var server = tlsoptions ? https.Server(tlsoptions, app) : http.Server(app);
  var io = socketio(server);
  io.use((socket, next) => {
    const headers = socket.handshake.headers;
    if (isValidHeader(headers.host) && isValidHeader(headers.origin)) {
      next();
      return;
    }
    next(new Error('Invalid Origin/Host header'));
  });
  io.on('connection', function(socket) {
    socket.on('sync', function(syncMsg) {
      log('User connected, syncing');
      var newModuleData = _.chain(currentModuleData)
        .toPairs()
        .filter(function(pair) {
          return !has(syncMsg, pair[0]) || syncMsg[pair[0]].hash !== pair[1].hash;
        })
        .fromPairs()
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
  return io;
});

function sendToParent(data) {
  parent.write(JSON.stringify(data)+'\n');
}

var uncommittedNewModuleData = {};

parentReadline.on('line', function(line) {
  var msg = JSON.parse(line);
  if (msg.type === 'config') {
    hostname = msg.hostname;
    port = msg.port;
    tlsoptions = msg.tlsoptions;
    disableHostCheck = msg.disableHostCheck;
  } else if (msg.type === 'newModule') {
    uncommittedNewModuleData[msg.name] = msg.data;
  } else if (msg.type === 'removedModules') {
    sendToParent({type: 'confirmNewModuleData'});
    _.assign(currentModuleData, uncommittedNewModuleData);
    var io = runServer();

    msg.removedModules.forEach(function(name) {
      delete currentModuleData[name];
    });
    if (Object.keys(uncommittedNewModuleData).length || msg.removedModules.length) {
      log('Emitting updates');
      io.emit('new modules', {
        newModuleData: uncommittedNewModuleData,
        removedModules: msg.removedModules
      });
    }

    uncommittedNewModuleData = {};
  } else {
    log('Unknow message type', msg.type);
  }
});
parent.on('finish', function() {
  process.exit(0);
});
