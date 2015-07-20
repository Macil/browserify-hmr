(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;
        if (!u && a) return a(o, !0);
        if (i) return i(o, !0);
        var f = new Error("Cannot find module '" + o + "'");
        f.code = "MODULE_NOT_FOUND";
        throw f;
      }
      var l = n[o] = {
        exports: {}
      };
      t[o][0].call(l.exports, function(e) {
        var n = t[o][1][e];
        return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = typeof require == "function" && require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s;
})({
  1: [function(require, module, exports) {
    'use strict';
    (function(global, main, moduleDefs, cachedExports, entries) {
      var moduleMeta = {
        "/Users/chris/Coding/browserify-hmr/example/a.js": {
          index: 2,
          hash: 10
        },
        "/Users/chris/Coding/browserify-hmr/example/index.js": {
          index: 3,
          hash: 20
        }
      };
      var originalEntries = [
        "/Users/chris/Coding/browserify-hmr/example/index.js"
      ];
      var updateUrl = __filename;
      var updateMode = 'fs';

      var name, i, len;

      var moduleIndexesToIds = {};
      for (name in moduleMeta) {
        if (Object.prototype.hasOwnProperty.call(moduleMeta, name)) {
          moduleIndexesToIds[moduleMeta[name].index] = name;
        }
      }

      if (!global._hmr) {
        var moduleInfo = {};
        var createInfoEntry = function(name) {
          moduleInfo[name] = {
            index: moduleMeta[name].index,
            hash: moduleMeta[name].hash,
            parents: {}, // later set to object where keys are names, values are true
            module: null,
            accepters: [],
            decliners: [],
            accepting: [],
            declining: [],
            disposeHandlers: []
          };
        };
        for (name in moduleMeta) {
          if (Object.prototype.hasOwnProperty.call(moduleMeta, name)) {
            createInfoEntry(name);
          }
        }
        var setupParents = function() {
          for (var name in moduleInfo) {
            if (Object.prototype.hasOwnProperty.call(moduleInfo, name)) {
              for (i=0, len=moduleDefs[moduleInfo[name].index][1].length; i<len; i++) {
                moduleInfo[ moduleIndexesToIds[moduleDefs[moduleInfo[name].index][1][i]] ].parents[name] = true;
              }
            }
          }
        };
        setupParents();

        var clearParents = function() {
          for (var name in moduleInfo) {
            if (Object.prototype.hasOwnProperty.call(moduleInfo, name)) {
              moduleInfo[name].parents = {};
            }
          }
        };

        var getOutdatedModules = function() {
          var outdated = [];
          for (var name in moduleInfo) {
            if (Object.prototype.hasOwnProperty.call(moduleInfo, name)) {
              if (
                !global._hmr.newLoad.moduleMeta[name] ||
                moduleInfo[name].hash !== global._hmr.newLoad.moduleMeta[name].hash
              ) {
                outdated.push(name);
              }
            }
          }
          return outdated;
        };

        var isUpdateAccepted = function(name) {
          // TODO
          return true;
        };

        global._hmr = {
          updateUrl: updateUrl,
          updateMode: updateMode,
          moduleInfo: moduleInfo,

          status: "idle",
          setStatus: function(status) {
            this.status = status;
            var statusHandlers = this.statusHandlers.slice();
            for (var i=0, len=statusHandlers.length; i<len; i++) {
              statusHandlers[i].call(null, status);
            }
          },
          statusHandlers: [],
          updateHandlers: [],

          // during a reload this is set to an object with moduleDefs,
          // moduleMeta, and moduleIndexesToIds properties
          newLoad: null,

          initModule: function(id, module) {
            moduleInfo[id].module = module;
            module.hot = {
              accept: function(deps, cb) {
                if (!cb && (!deps || typeof deps === 'function')) { // self
                  cb = deps;
                  deps = null;
                  moduleInfo[id].accepters.push(id);
                  moduleInfo[id].accepting.push(id);
                  // TODO call cb on relevant errors
                } else {
                  if (typeof deps === 'string') {
                    deps = [deps];
                  }
                  var depIds = new Array(deps.length);
                  var i, depsLen=deps.length;
                  for (i=0; i<depsLen; i++) {
                    var depIndex = moduleDefs[moduleInfo[id].index][1][deps[i]];
                    if (depIndex === undefined || !Object.prototype.hasOwnProperty.call(moduleIndexesToIds, depIndex)) {
                      throw new Error("File does not use dependency: "+deps[i]);
                    }
                    depIds[i] = moduleIndexesToIds[depIndex];
                  }
                  deps = null;
                  for (i=0; i<depsLen; i++) {
                    moduleInfo[depIds[i]].accepters.push(id);
                    moduleInfo[id].accepting.push(depIds[i]);
                  }
                  if (cb) {
                    global._hmr.updateHandlers.push(function(err, updatedIds) {
                      if (err) return;
                      var hasMatch = false;
                      for (var i=0, len=depIds.length; i<len; i++) {
                        if (updatedIds.indexOf(depIds[i]) !== -1) {
                          hasMatch = true;
                          break;
                        }
                      }
                      if (hasMatch) {
                        cb(updatedIds);
                      }
                    });
                  }
                }
              },
              decline: function(deps) {
                if (!deps) { // self
                  moduleInfo[id].decliners.push(id);
                  moduleInfo[id].declining.push(id);
                } else {
                  if (typeof deps === 'string') {
                    deps = [deps];
                  }
                  for (var i=0, depsLen=deps.length; i<depsLen; i++) {
                    var depIndex = moduleDefs[moduleInfo[id].index][1][deps[i]];
                    if (depIndex === undefined || !Object.prototype.hasOwnProperty.call(moduleIndexesToIds, depIndex)) {
                      throw new Error("File does not use dependency: "+deps[i]);
                    }
                    var depId = moduleIndexesToIds[depIndex];
                    moduleInfo[depId].decliners.push(id);
                    moduleInfo[id].declining.push(depId);
                  }
                }
              },
              dispose: function(cb) {
                return this.addDisposeHandler(cb);
              },
              addDisposeHandler: function(cb) {
                moduleInfo[id].disposeHandlers.push(cb);
              },
              removeDisposeHandler: function(cb) {
                var ix = moduleInfo[id].disposeHandlers.indexOf(cb);
                if (ix !== -1) {
                  moduleInfo[id].disposeHandlers.splice(ix, 1);
                }
              },

              // Management
              check: function(autoApply, cb) {
                if (typeof autoApply === 'function') {
                  cb = autoApply;
                  autoApply = false;
                }
                if (!cb) {
                  throw new Error("module.hot.check callback parameter required");
                }
                if (this.status() !== 'idle') {
                  return cb(new Error("module.hot.check can only be called while status is idle"));
                }

                if (global._hmr.updateMode === 'fs') {
                  global._hmr.setStatus('check');
                  var fs = require('fs');
                  fs.readFile(global._hmr.updateUrl, 'utf8', function(err, data) {
                    if (err) {
                      global._hmr.setStatus('idle');
                      return cb(err);
                    }
                    global._hmr.newLoad = null;
                    try {
                      //jshint evil:true
                      new Function('require', '__filename', '__dirname', data)(require, __filename, __dirname);
                      // running the file sets _hmr.newLoad
                    } catch (err2) {
                      global._hmr.newLoad = null;
                      global._hmr.setStatus('idle');
                      return cb(err2);
                    }
                    var outdatedModules = getOutdatedModules();
                    if (outdatedModules.length === 0) {
                      global._hmr.setStatus('idle');
                      cb(null);
                    } else {
                      global._hmr.setStatus('ready');
                      if (autoApply) {
                        module.hot.apply(autoApply, cb);
                      } else {
                        cb(null, outdatedModules);
                      }
                    }
                  });
                } else {
                  return cb(new Error("updateMode "+global._hmr.updateMode+" implemented"));
                }
              },
              apply: function(options, cb) {
                if (typeof options === 'function') {
                  cb = options;
                  options = null;
                }
                if (!cb) {
                  throw new Error("module.hot.apply callback parameter required");
                }
                var ignoreUnaccepted = options && options.ignoreUnaccepted;
                if (this.status() !== 'ready') {
                  return cb(new Error("module.hot.apply can only be called while status is ready"));
                }
                var outdatedModules = getOutdatedModules();
                var modulesToUpdate = [];
                for (var i=0, len=outdatedModules.length; i<len; i++) {
                  if (isUpdateAccepted(outdatedModules[i])) {
                    modulesToUpdate.push(outdatedModules[i]);
                    // TODO add the parents that were followed to modulesToUpdate
                  } else {
                    if (!ignoreUnaccepted) {
                      global._hmr.setStatus('idle');
                      return cb(new Error("Module update not accepted: "+outdatedModules[i]));
                    }
                  }
                }
                var reloadedIndex, translatedReqs;
                var newModules = [];
                for (i=0, len=newModules.length; i<len; i++) {
                  moduleMeta[newModules[i]] = {
                    index: newModules[i],
                    hash: global._hmr.newLoad.moduleMeta[newModules[i]].hash
                  };
                  reloadedIndex = global._hmr.newLoad.moduleMeta[newModules[i]].index;
                  var reloadedReqs = global._hmr.newLoad.moduleDefs[reloadedIndex][1];
                  translatedReqs = []; // TODO
                  moduleDefs[newModules[i]] = [
                    global._hmr.newLoad.moduleDefs[reloadedIndex][0],
                    translatedReqs
                  ];
                  createInfoEntry(newModules[i]);
                }
                for (i=0, len=modulesToUpdate.length; i<len; i++) {
                  // Remove module accepters+decliners of them all first
                  // update moduleDefs
                  moduleInfo[modulesToUpdate[i]].hash =
                    moduleMeta[modulesToUpdate[i]].hash =
                    global._hmr.newLoad.moduleMeta[modulesToUpdate[i]].hash;
                  reloadedIndex = global._hmr.newLoad.moduleMeta[modulesToUpdate[i]].index;
                  translatedReqs = moduleDefs[moduleInfo[modulesToUpdate[i]].index][1]; // []; TODO
                  moduleDefs[moduleInfo[modulesToUpdate[i]].index] = [
                    global._hmr.newLoad.moduleDefs,
                    translatedReqs
                  ];
                }
                // TODO efficiently update only the parents of changed modules
                clearParents();
                setupParents();
                for (i=0, len=modulesToUpdate.length; i<len; i++) {
                  // call _hmr.updateHandlers
                }
              },
              status: function(cb) {
                if (cb) {
                  return this.addStatusHandler(cb);
                }
                return global._hmr.status;
              },
              addStatusHandler: function(cb) {
                global._hmr.statusHandlers.push(cb);
              },
              removeStatusHandler: function(cb) {
                var ix = global._hmr.statusHandlers.indexOf(cb);
                if (ix !== -1) {
                  global._hmr.statusHandlers.splice(ix, 1);
                }
              }
            };
          }
        };
        for (i=0, len=originalEntries.length; i<len; i++) {
          require(moduleInfo[originalEntries[i]].index);
        }
      } else { // We're in a reload!
        console.log('in a reload');
        moduleMeta["/Users/chris/Coding/browserify-hmr/example/a.js"].hash++;
        global._hmr.newLoad = {
          moduleDefs: moduleDefs,
          moduleMeta: moduleMeta,
          moduleIndexesToIds: moduleIndexesToIds
        };
      }
    }).call(
      this,
      typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},
      arguments[3], arguments[4], arguments[5], arguments[6]
    );
  }, {}],
  2: [function(require, module, exports) {
    _hmr.initModule("/Users/chris/Coding/browserify-hmr/example/a.js", module);
    (function(){
    // original start

    console.log('a');
    if (module.hot) {
      module.hot.accept();
      module.hot.dispose(function() {
        console.log('disposing');
      });
    }

    // original end
    }).call(this, arguments);
  }, {}],
  3: [function(require, module, exports) {
    _hmr.initModule("/Users/chris/Coding/browserify-hmr/example/index.js", module);
    (function(){
    // original start

    global.runCount = (global.runCount||0) + 1;
    console.log('index start!');
    require('./a');
    console.log('index end');

    if (module.hot && global.runCount === 1) {
      setTimeout(function() {
        module.hot.check(true, function(err, outdatedModules) {
          console.log('check callback', err, outdatedModules);
        });
      }, 1000);
    }

    // original end
    }).call(this, arguments);
  }, {
    "./a": 2
  }]
}, {}, [1]);
