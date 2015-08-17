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
    (function(global, _main, moduleDefs, cachedModules, _entries) {
      var moduleMeta = {
        "/Users/chris/Coding/browserify-hmr/example/a.js": {
          index: 2,
          hash: 10,
          parents: ["/Users/chris/Coding/browserify-hmr/example/index.js"]
        },
        "/Users/chris/Coding/browserify-hmr/example/index.js": {
          index: 3,
          hash: 20,
          parents: []
        }
      };
      var originalEntries = [
        "/Users/chris/Coding/browserify-hmr/example/index.js"
      ];
      var updateUrl = __filename;
      var updateMode = 'fs';

      var name, i, len;

      function has(object, propName) {
        return Object.prototype.hasOwnProperty.call(object, propName);
      }
      function forEach(array, fn) {
        for (var i=0,len=array.length; i<len; i++) {
          fn(array[i], i, array);
        }
      }
      function some(array, fn) {
        for (var i=0,len=array.length; i<len; i++) {
          if (fn(array[i], i, array))
            return true;
        }
        return false;
      }
      function map(array, fn) {
        var output = new Array(array.length);
        for (var i=0,len=array.length; i<len; i++) {
          output[i] = fn(array[i], i, array);
        }
        return output;
      }
      function mapValues(object, fn) {
        var output = {};
        for (var key in object) {
          if (has(object, key)) {
            output[key] = fn(object[key], key, object);
          }
        }
        return output;
      }

      var moduleIndexesToNames = {};
      for (name in moduleMeta) {
        if (has(moduleMeta, name)) {
          moduleIndexesToNames[moduleMeta[name].index] = name;
        }
      }

      var console = global.console ? global.console : {
        error: function(){}, log: function() {}
      };

      if (!global._hmr) {
        var StrSet = function StrSet(other) {
          this._map = {};
          this._size = 0;
          if (other) {
            for (var i=0,len=other.length; i<len; i++) {
              this.add(other[i]);
            }
          }
        };
        StrSet.prototype.add = function(value) {
          if (!this.has(value)) {
            this._map[value] = true;
            this._size++;
          }
        };
        StrSet.prototype.has = function(value) {
          return has(this._map, value);
        };
        StrSet.prototype.del = function(value) {
          if (this.has(value)) {
            delete this._map[value];
            this._size--;
          }
        };
        StrSet.prototype.size = function() {
          return this._size;
        };
        StrSet.prototype.forEach = function(cb) {
          for (var value in this._map) {
            if (has(this._map, value)) {
              cb(value);
            }
          }
        };
        StrSet.prototype.some = function(cb) {
          for (var value in this._map) {
            if (has(this._map, value)) {
              if (cb(value)) {
                return true;
              }
            }
          }
          return false;
        };
        StrSet.prototype.hasIntersection = function(otherStrSet) {
          var value;
          if (this._size < otherStrSet._size) {
            return this.some(function(value) {
              return otherStrSet.has(value);
            });
          } else {
            var self = this;
            return otherStrSet.some(function(value) {
              return self.has(value);
            });
          }
        };

        var runtimeModuleInfo = {};
        var createInfoEntry = function(name) {
          runtimeModuleInfo[name] = {
            index: moduleMeta[name].index,
            hash: moduleMeta[name].hash,
            parents: moduleMeta[name].parents,
            module: null,
            accepters: new StrSet(),
            accepting: new StrSet(),
            decliners: new StrSet(),
            declining: new StrSet(),
            selfAcceptCbs: [], // may contain null. nonzero length means module is self-accepting
            disposeHandlers: []
          };
        };
        for (name in moduleMeta) {
          if (has(moduleMeta, name)) {
            createInfoEntry(name);
          }
        }

        var fileReloaders = {
          fs: function(cb) {
            var fs = require('fs');
            fs.readFile(global._hmr.updateUrl, 'utf8', cb);
          }
        };

        var reloadAndRunScript = function(cb) {
          if (!has(fileReloaders, global._hmr.updateMode)) {
            cb(new Error("updateMode "+global._hmr.updateMode+" not implemented"));
            return;
          }
          var reloader = fileReloaders[global._hmr.updateMode];
          reloader(function(err, data) {
            if (err) {
              cb(err);
              return;
            }
            global._hmr.newLoad = null;
            try {
              //jshint evil:true
              new Function('require', '__filename', '__dirname', data)(require, __filename, __dirname);
              // running the file sets _hmr.newLoad
            } catch (err2) {
              global._hmr.newLoad = null;
              cb(err2);
              return;
            }
            if (!global._hmr.newLoad) {
              cb(new Error("Reloaded script did not set hot module reload data"));
              return;
            }
            cb(null);
          });
        };

        var getOutdatedModules = function() {
          var outdated = [];
          var name;
          for (name in runtimeModuleInfo) {
            if (has(runtimeModuleInfo, name)) {
              if (
                !has(global._hmr.newLoad.moduleMeta, name) ||
                runtimeModuleInfo[name].hash !== global._hmr.newLoad.moduleMeta[name].hash
              ) {
                outdated.push(name);
              }
            }
          }
          for (name in global._hmr.newLoad.moduleMeta) {
            if (has(global._hmr.newLoad.moduleMeta, name)) {
              if (!has(runtimeModuleInfo, name)) {
                outdated.push(name);
              }
            }
          }
          // TODO follow unaccepting parents
          return outdated;
        };

        global._hmr = {
          updateUrl: updateUrl,
          updateMode: updateMode,
          runtimeModuleInfo: runtimeModuleInfo,

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
          // moduleMeta, and moduleIndexesToNames properties
          newLoad: null,

          initModule: function(name, module) {
            runtimeModuleInfo[name].module = module;
            module.hot = {
              accept: function(deps, cb) {
                if (!cb && (!deps || typeof deps === 'function')) { // self
                  cb = deps;
                  deps = null;
                  runtimeModuleInfo[name].selfAcceptCbs.push(cb);
                } else {
                  if (typeof deps === 'string') {
                    deps = [deps];
                  }
                  var depNames = new StrSet();
                  for (var i=0, depsLen=deps.length; i<depsLen; i++) {
                    var depIndex = moduleDefs[runtimeModuleInfo[name].index][1][deps[i]];
                    if (depIndex === undefined || !has(moduleIndexesToNames, depIndex)) {
                      throw new Error("File does not use dependency: "+deps[i]);
                    }
                    depNames.add(moduleIndexesToNames[depIndex]);
                  }
                  deps = null;
                  depNames.forEach(function(depName) {
                    runtimeModuleInfo[depName].accepters.add(name);
                    runtimeModuleInfo[name].accepting.add(depName);
                  });
                  if (cb) {
                    global._hmr.updateHandlers.push({
                      accepter: name,
                      deps: new StrSet(deps),
                      cb: cb
                    });
                  }
                }
              },
              decline: function(deps) {
                if (!deps) { // self
                  runtimeModuleInfo[name].decliners.add(name);
                  runtimeModuleInfo[name].declining.add(name);
                } else {
                  if (typeof deps === 'string') {
                    deps = [deps];
                  }
                  for (var i=0, depsLen=deps.length; i<depsLen; i++) {
                    var depIndex = moduleDefs[runtimeModuleInfo[name].index][1][deps[i]];
                    if (depIndex === undefined || !has(moduleIndexesToNames, depIndex)) {
                      throw new Error("File does not use dependency: "+deps[i]);
                    }
                    var depName = moduleIndexesToNames[depIndex];
                    runtimeModuleInfo[depName].decliners.add(name);
                    runtimeModuleInfo[name].declining.add(depName);
                  }
                }
              },
              dispose: function(cb) {
                return this.addDisposeHandler(cb);
              },
              addDisposeHandler: function(cb) {
                runtimeModuleInfo[name].disposeHandlers.push(cb);
              },
              removeDisposeHandler: function(cb) {
                var ix = runtimeModuleInfo[name].disposeHandlers.indexOf(cb);
                if (ix !== -1) {
                  runtimeModuleInfo[name].disposeHandlers.splice(ix, 1);
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
                  cb(new Error("module.hot.check can only be called while status is idle"));
                  return;
                }

                global._hmr.setStatus('check');
                reloadAndRunScript(function(err) {
                  if (err) {
                    global._hmr.setStatus('idle');
                    cb(err);
                    return;
                  }
                  var outdatedModules = getOutdatedModules();
                  if (outdatedModules.length === 0) {
                    global._hmr.setStatus('idle');
                    cb(null, null);
                  } else {
                    global._hmr.setStatus('ready');
                    if (autoApply) {
                      module.hot.apply(autoApply, cb);
                    } else {
                      cb(null, outdatedModules);
                    }
                  }
                });
              },
              apply: function(options, cb) {
                if (typeof options === 'function') {
                  cb = options;
                  options = null;
                }
                if (!cb) {
                  throw new Error("module.hot.apply callback parameter required");
                }
                var ignoreUnaccepted = !!(options && options.ignoreUnaccepted);
                if (this.status() !== 'ready') {
                  return cb(new Error("module.hot.apply can only be called while status is ready"));
                }

                var outdatedModules = getOutdatedModules();
                var isValueNotInOutdatedModules = function(value) {
                  return outdatedModules.indexOf(value) === -1;
                };
                var acceptedUpdates = [];
                var i, len;
                for (i=0, len=outdatedModules.length; i<len; i++) {
                  if (has(runtimeModuleInfo, outdatedModules[i])) {
                    if (runtimeModuleInfo[outdatedModules[i]].decliners.some(isValueNotInOutdatedModules)) {
                      continue;
                    }
                  }
                  acceptedUpdates.push(outdatedModules[i]);
                }
                if (!ignoreUnaccepted && outdatedModules.length !== acceptedUpdates.length) {
                  cb(new Error("Some updates were declined"));
                  return;
                }
                var an;
                for (i=0, len=acceptedUpdates.length; i<len; i++) {
                  an = acceptedUpdates[i];
                  for (var j=0; j<runtimeModuleInfo[an].disposeHandlers.length; j++) {
                    try {
                      runtimeModuleInfo[an].disposeHandlers[j].call(null);
                      // TODO save return value to module.hot.data
                    } catch(e) {
                      cb(e || new Error("Unknown dispose callback error"));
                      return;
                    }
                  }
                }
                var selfAccepters = [];
                for (i=0, len=acceptedUpdates.length; i<len; i++) {
                  an = acceptedUpdates[i];
                  //jshint -W083
                  if (!has(runtimeModuleInfo, an)) {
                    runtimeModuleInfo[an] = {
                      index: an,
                      hash: global._hmr.newLoad.moduleMeta[name].hash,
                      parents: global._hmr.newLoad.moduleMeta[name].parents,
                      module: null,
                      accepters: new StrSet(),
                      accepting: new StrSet(),
                      decliners: new StrSet(),
                      declining: new StrSet(),
                      selfAcceptCbs: [],
                      disposeHandlers: []
                    };
                  } else {
                    runtimeModuleInfo[an].hash = global._hmr.newLoad.moduleMeta[an].hash;
                    runtimeModuleInfo[an].parents = global._hmr.newLoad.moduleMeta[an].parents;
                    runtimeModuleInfo[an].module.exports = {};
                    runtimeModuleInfo[an].accepting.forEach(function(accepted) {
                      runtimeModuleInfo[accepted].accepters.del(an);
                    });
                    runtimeModuleInfo[an].accepting = new StrSet();
                    runtimeModuleInfo[an].declining.forEach(function(accepted) {
                      runtimeModuleInfo[accepted].decliners.del(an);
                    });
                    runtimeModuleInfo[an].declining = new StrSet();
                    forEach(runtimeModuleInfo[an].selfAcceptCbs, function(cb) {
                      selfAccepters.push({name: an, cb: cb});
                    });
                    runtimeModuleInfo[an].selfAcceptCbs = [];
                    runtimeModuleInfo[an].disposeHandlers = [];
                  }

                  moduleDefs[runtimeModuleInfo[an].index] = [
                    // module function
                    global._hmr.newLoad.moduleDefs[global._hmr.newLoad.moduleMeta[an].index][0],
                    // module deps
                    mapValues(global._hmr.newLoad.moduleDefs[global._hmr.newLoad.moduleMeta[an].index][1], function(depIndex, depRef) {
                      var depName = global._hmr.newLoad.moduleIndexesToNames[depIndex];
                      if (has(global._hmr.runtimeModuleInfo, depName)) {
                        return global._hmr.runtimeModuleInfo[depName].index;
                      } else {
                        return depName;
                      }
                    })
                  ];
                  cachedModules[runtimeModuleInfo[an].index] = null;
                }

                // Update the accept handlers list and call the right ones
                var errCanWait = null;
                var updatedNames = new StrSet(acceptedUpdates);
                var oldUpdateHandlers = global._hmr.updateHandlers;
                var relevantUpdateHandlers = [];
                var newUpdateHandlers = [];
                for (i=0, len=oldUpdateHandlers.length; i<len; i++) {
                  if (!updatedNames.has(oldUpdateHandlers[i].accepter)) {
                    newUpdateHandlers.push(oldUpdateHandlers[i]);
                  }
                  if (updatedNames.hasIntersection(oldUpdateHandlers[i].deps)) {
                    relevantUpdateHandlers.push(oldUpdateHandlers[i]);
                  }
                }
                global._hmr.updateHandlers = newUpdateHandlers;
                for (i=0, len=relevantUpdateHandlers.length; i<len; i++) {
                  try {
                    relevantUpdateHandlers[i].cb.call(null, acceptedUpdates);
                  } catch(e) {
                    if (errCanWait) console.error(errCanWait);
                    errCanWait = e;
                  }
                }

                // Call the self-accepting modules
                forEach(selfAccepters, function(obj) {
                  try {
                    require(runtimeModuleInfo[obj.name].index);
                  } catch(e) {
                    if (obj.cb) {
                      obj.cb.call(null, e);
                    } else {
                      if (errCanWait) console.error(errCanWait);
                      errCanWait = e;
                    }
                  }
                });

                cb(errCanWait, outdatedModules);
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
          require(runtimeModuleInfo[originalEntries[i]].index);
        }
      } else { // We're in a reload!
        console.log('in a reload');
        moduleMeta["/Users/chris/Coding/browserify-hmr/example/a.js"].hash++;
        global._hmr.newLoad = {
          moduleDefs: moduleDefs,
          moduleMeta: moduleMeta,
          moduleIndexesToNames: moduleIndexesToNames
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
      module.hot.dispose(function() {
        console.log('disposing a');
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
        module.hot.check(function(err, outdatedModules) {
          console.log('check callback', err, outdatedModules);
          module.hot.apply(function(err, outdatedModules) {
            console.log('apply callback', err, outdatedModules);
          });
        });
      }, 1000);
    }

    // original end
    }).call(this, arguments);
  }, {
    "./a": 2
  }]
}, {}, [1]);
