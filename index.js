'use strict';

var path = require('path');
var cproc = require('child_process');
var through = require('through2');
var convert = require('convert-source-map');
var EventEmitter = require('events').EventEmitter;
var sm = require('source-map');
var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var RSVP = require('rsvp');
var readFile = RSVP.denodeify(fs.readFile);
var has = require('./lib/has');

function hashStr(str) {
  var hasher = crypto.createHash('sha256');
  hasher.update(str);
  return hasher.digest('base64').slice(0, 20);
}

var readManagerTemplate = _.once(function() {
  return readFile(path.join(__dirname, 'hmr-manager-template.js'), 'utf8');
});

var validUpdateModes = ['websocket', 'ajax', 'fs', 'none'];
var updateModesNeedingUrl = ['ajax'];

function makeIdentitySourceMap(content, resourcePath) {
  var map = new sm.SourceMapGenerator();
  map.setSourceContent(resourcePath, content);
  content.split('\n').map(function(line, index) {
    map.addMapping({
      source: resourcePath,
      original: {
        line: index+1,
        column: 0
      },
      generated: {
        line: index+1,
        column: 0
      }
    });
  });
  return map.toJSON();
}

function readOpt(opts, long, short, defval) {
  return has(opts, long) ? opts[long] : (short && has(opts, short)) ? opts[short] : defval;
}

function boolOpt(value) {
  return Boolean(value && value !== 'false');
}

module.exports = function(bundle, opts) {
  if (!opts) opts = {};
  var updateMode = readOpt(opts, 'mode', 'm', 'websocket');
  if (updateMode === 'xhr') {
    console.warn('Use update mode "ajax" instead of "xhr".');
    updateMode = 'ajax';
  }
  var updateUrl = readOpt(opts, 'url', 'u', null);
  var port = readOpt(opts, 'port', 'p', 3123);
  var hostname = readOpt(opts, 'hostname', 'h', 'localhost');
  var updateCacheBust = boolOpt(readOpt(opts, 'cacheBust', 'b', false));
  var bundleKey = readOpt(opts, 'key', 'k', updateMode+':'+updateUrl);
  var cert = readOpt(opts, 'tlscert', 'C', null);
  var key = readOpt(opts, 'tlskey', 'K', null);
  var tlsoptions = opts.tlsoptions;
  var supportModes = (opts.supportModes && opts.supportModes._) || opts.supportModes || [];
  var noServe = boolOpt(readOpt(opts, 'noServe', null, false));
  var ignoreUnaccepted = boolOpt(readOpt(opts, 'ignoreUnaccepted', null, true));
  var multiBundle = boolOpt(readOpt(opts, 'multiBundle', null, false));

  var basedir = opts.basedir !== undefined ? opts.basedir : process.cwd();
  var em = new EventEmitter();

  supportModes = _.uniq(['none', updateMode].concat(supportModes));

  supportModes.forEach(function(updateMode) {
    if (!_.includes(validUpdateModes, updateMode)) {
      throw new Error("Invalid mode "+updateMode);
    }
  });
  if (!updateUrl && _.includes(updateModesNeedingUrl, updateMode)) {
    throw new Error("url option must be specified for "+updateMode+" mode");
  }

  var incPath = './'+path.relative(basedir, require.resolve('./inc/index'));

  var sioPath = null;
  if (_.includes(supportModes, 'websocket')) {
    sioPath = './'+path.relative(basedir, require.resolve('socket.io-client'));
  }

  var useLocalSocketServer = !noServe && _.includes(supportModes, 'websocket');

  var server;
  var nextServerConfirm = RSVP.defer();
  var runServer = _.once(function() {
    server = cproc.fork(__dirname+'/socket-server.js');
    server.on('message', function(msg) {
      if (msg.type === 'confirmNewModuleData') {
        nextServerConfirm.resolve();
        nextServerConfirm = RSVP.defer();
      } else {
        console.warn('[HMR builder] Unknown message type from server:', msg.type);
      }
    });
    server.on('disconnect', function() {
      em.emit('error', new Error("Browserify-HMR lost connection to socket server"));
    });
    return new RSVP.Promise(function(resolve, reject) {
      var readJobs = [];
      if (cert) {
        readJobs.push(readFile(cert, 'utf8').then(function(data) {
          tlsoptions = tlsoptions || {};
          tlsoptions.cert = data;
        }));
      }
      if (key) {
        readJobs.push(readFile(key, 'utf8').then(function(data) {
          tlsoptions = tlsoptions || {};
          tlsoptions.key = data;
        }));
      }
      if (readJobs.length) {
        resolve(RSVP.Promise.all(readJobs));
      } else {
        resolve();
      }
    }).then(function(){
      server.send({
        type: 'config',
        hostname: hostname,
        port: port,
        tlsoptions: tlsoptions
      });
    });
  });

  var currentModuleData = {};

  function setNewModuleData(moduleData, id) {
    if (!useLocalSocketServer) {
      return RSVP.Promise.resolve();
    }
    return runServer().then(function() {
     currentModuleData[id] = currentModuleData[id] || {}
     var newModuleData = _.chain(moduleData)
        .pairs()
        .filter(function(pair) {
          return !has(currentModuleData[id], pair[0]) || currentModuleData[id][pair[0]].hash !== pair[1].hash;
        })
        .zipObject()
        .value();

      var removedModules = _.chain(currentModuleData[id])
        .keys()
        .filter(function(name) {
          return !has(moduleData, name);
        })
        .value();
      currentModuleData[id] = moduleData;
      server.send({
        type: 'setNewModuleData',
        id: id,
        newModuleData: newModuleData,
        removedModules: removedModules
      });
      return nextServerConfirm.promise;
    });
  }

  function fileKey(filename) {
    return path.relative(basedir, filename);
  }

  // keys are filenames, values are {hash, transformedSource}
  var transformCache = {};

  function setupPipelineMods() {
    var originalEntries = [];
    bundle.pipeline.get('record').push(through.obj(function(row, enc, next) {
      if (row.entry) {
        originalEntries.push(row.file);
        next(null);
      } else {
        next(null, row);
      }
    }, function(next) {
      var self = this;
      var hmrManagerFilename;
      function pushHmrManagerFile(entry) {
        var source = [sioPath, incPath].filter(Boolean).concat(entry).map(function(name) {
          return 'require('+JSON.stringify(name)+');\n';
        }).join('');

        if (multiBundle) {
          hmrManagerFilename = entry + '__hmr_manager.js';
        } else {
          // Put the hmr file name in basedir to prevent this:
          // https://github.com/babel/babelify/issues/85
          hmrManagerFilename = path.join(basedir, '__hmr_manager.js');
        }
        self.push({
          entry: true,
          expose: false,
          basedir: undefined,
          file: hmrManagerFilename,
          id: hmrManagerFilename,
          source: source,
          order: 0,
          hmrManager: true,
          originalEntries: [].concat(entry),
        });
      }
      if (multiBundle) {
        originalEntries.map(pushHmrManagerFile)
      } else {
        pushHmrManagerFile(originalEntries)
      }

      next();
    }));

    var moduleMeta = {};

    function makeModuleMetaEntry(name) {
      if (!has(moduleMeta, name)) {
        moduleMeta[name] = {
          index: null,
          hash: null,
          parents: []
        };
      }
    }

    bundle.pipeline.get('deps').push(through.obj(function(row, enc, next) {
      if (!row.hmrManager) {
        makeModuleMetaEntry(fileKey(row.file));
        _.forOwn(row.deps, function(name, ref) {
          // dependencies that aren't included in the bundle have the name false
          if (name) {
            makeModuleMetaEntry(fileKey(name));
            moduleMeta[fileKey(name)].parents.push(fileKey(row.file));
          }
        });
      }
      next(null, row);
    }));


    if (bundle.pipeline.get('dedupe').length > 1) {
      console.warn("[HMR] Warning: other plugins have added dedupe transforms. This may interfere.");
    }
    // Disable dedupe transforms because it screws with our change tracking.
    bundle.pipeline.splice('dedupe', 1, through.obj());

    if (multiBundle) {
        bundle.removeAllListeners('factor.pipeline');
        bundle.on('factor.pipeline', sourceTransformHook)
    } else {
        sourceTransformHook('bundle', bundle.pipeline)
    }

    function sourceTransformHook(id, pipeline) {
      var moduleData = {};
      var managerRow = null;
      var rowBuffer = [];
      var meta = {};

      pipeline.get('pack').unshift(through.obj(function(row, enc, next) {
        if (row.hmrManager) {
          managerRow = row;
          next(null);
        } else {
          // row.id used when fullPaths flag is used
          moduleMeta[fileKey(row.file)].index = has(row, 'index') ? row.index : row.id;

          var hash = hashStr(row.source);
          meta[fileKey(row.file)] = moduleMeta[fileKey(row.file)];
          var originalSource = row.source;
          var isNew, thunk;
          if (row.transformed) {
            thunk = _.constant(row);
          } else if (has(transformCache, row.file) && transformCache[row.file].hash === hash) {
            row.transformed = true;
            row.source = transformCache[row.file].transformedSource;
            moduleMeta[fileKey(row.file)].hash = hash;
            thunk = _.constant(row);
          } else {
            row.transformed = true;
            moduleMeta[fileKey(row.file)].hash = hash;
            thunk = function() {
              var header = '_hmr['+JSON.stringify(bundleKey)+
                '].initModule('+JSON.stringify(fileKey(row.file))+', module);\n(function(){\n';
              var footer = '\n}).apply(this, arguments);\n';

              var inputMapCV = convert.fromSource(row.source);
              var inputMap;
              if (inputMapCV) {
                inputMap = inputMapCV.toObject();
                row.source = convert.removeComments(row.source);
              } else {
                inputMap = makeIdentitySourceMap(row.source, path.relative(basedir, row.file));
              }

              var node = new sm.SourceNode(null, null, null, [
                new sm.SourceNode(null, null, null, header),
                sm.SourceNode.fromStringWithSourceMap(row.source, new sm.SourceMapConsumer(inputMap)),
                new sm.SourceNode(null, null, null, footer)
              ]);

              var result = node.toStringWithSourceMap();
              row.source = result.code + convert.fromObject(result.map.toJSON()).toComment();

              transformCache[row.file] = {
                hash: hash,
                transformedSource: row.source
              };
              return row;
            };
          }
          if (useLocalSocketServer) {
            moduleData[fileKey(row.file)] = {
              index: moduleMeta[fileKey(row.file)].index,
              hash: moduleMeta[fileKey(row.file)].hash,
              source: originalSource,
              parents: moduleMeta[fileKey(row.file)].parents,
              deps: row.indexDeps || row.deps
            };

            // Buffer everything so we can get the websocket stuff done sooner
            // without being slowed down by the final bundling.
            rowBuffer.push(thunk);
            next(null);
          } else {
            next(null, thunk());
          }
        }
      }, function(done) {
        var self = this;

        setNewModuleData(moduleData, id).then(function() {
          return readManagerTemplate();
        }).then(function(mgrTemplate) {
          rowBuffer.forEach(function(thunk) {
            self.push(thunk());
          });

          managerRow.source = mgrTemplate
            .replace('null/*!^^moduleMeta*/', JSON.stringify(meta))
            .replace('null/*!^^originalEntries*/', JSON.stringify(managerRow.originalEntries))
            .replace('null/*!^^updateUrl*/', JSON.stringify(updateUrl))
            .replace('null/*!^^updateMode*/', JSON.stringify(updateMode))
            .replace('null/*!^^supportModes*/', JSON.stringify(supportModes))
            .replace('null/*!^^ignoreUnaccepted*/', JSON.stringify(ignoreUnaccepted))
            .replace('null/*!^^updateCacheBust*/', JSON.stringify(updateCacheBust))
            .replace('null/*!^^bundleKey*/', JSON.stringify(bundleKey))
            .replace('null/*!^^sioPath*/', JSON.stringify(sioPath))
            .replace('null/*!^^incPath*/', JSON.stringify(incPath))
            .replace('null/*!^^id*/', JSON.stringify(id));
          self.push(managerRow);
        }).then(done, done);
      }));
    }
  }
  setupPipelineMods();

  bundle.on('reset', setupPipelineMods);
  return em;
};
