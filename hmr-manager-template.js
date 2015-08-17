(function(global, _main, moduleDefs, cachedModules, _entries) {
  'use strict';
  var moduleMeta = null/*!^^moduleMeta*/;
  var originalEntries = null/*!^^originalEntries*/;
  var updateUrl = null/*!^^updateUrl*/;
  var updateMode = null/*!^^updateMode*/;
  var updateCacheBust = null/*!^^updateCacheBust*/;

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
  function filter(array, fn) {
    var output = [];
    for (var i=0,len=array.length; i<len; i++) {
      if (fn(array[i], i, array))
        output.push(array[i]);
    }
    return output;
  }
  function forOwn(object, fn) {
    for (var key in object) {
      if (has(object, key))
        fn(object[key], key, object);
    }
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
    StrSet.prototype.every = function(cb) {
      return !this.some(function(x) {
        return !cb(x);
      });
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
        parents: new StrSet(moduleMeta[name].parents),
        module: null,
        disposeData: null,
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

    // loaders take a callback(err, data). They may give null for data if they
    // know there hasn't been an update.
    var fileReloaders = {
      fs: function(cb) {
        var fs;
        try {
          fs = require('f'+'s');
        } catch(e) {
          cb(e);
          return;
        }
        fs.readFile(global._hmr.updateUrl || __filename, 'utf8', cb);
      },
      xhr: function(cb) {
        var xhr;
        try {
          xhr = new XMLHttpRequest();
        } catch(e) {
          cb(e);
          return;
        }
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              cb(null, xhr.responseText);
            } else {
              cb(new Error("Request had response "+xhr.status));
            }
          }
        };
        var url = global._hmr.updateUrl + (updateCacheBust?'?_v='+(+new Date()):'');
        xhr.open('GET', url, true);
        xhr.send();
      }
    };

    var lastScriptData = null;

    // cb(err, expectUpdate)
    var reloadAndRunScript = function(cb) {
      if (!has(fileReloaders, global._hmr.updateMode)) {
        cb(new Error("updateMode "+global._hmr.updateMode+" not implemented"));
        return;
      }
      var reloader = fileReloaders[global._hmr.updateMode];
      reloader(function(err, data) {
        if (err || !data || lastScriptData === data) {
          cb(err, false);
          return;
        }
        lastScriptData = data;
        global._hmr.newLoad = null;
        try {
          //jshint evil:true
          if (typeof __filename !== 'undefined' && typeof __dirname !== 'undefined') {
            new Function('require', '__filename', '__dirname', data)(require, __filename, __dirname);
          } else {
            new Function('require', data)(require);
          }
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
        cb(null, true);
      });
    };

    var getOutdatedModules = function() {
      var outdated = [];
      var name;
      // add changed and deleted modules
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
      // add brand new modules
      for (name in global._hmr.newLoad.moduleMeta) {
        if (has(global._hmr.newLoad.moduleMeta, name)) {
          if (!has(runtimeModuleInfo, name)) {
            outdated.push(name);
          }
        }
      }
      // add modules that are non-accepting/declining parents of outdated modules.
      // important: if outdated has new elements added during the loop,
      // then we iterate over them too.
      for (var i=0; i<outdated.length; i++) {
        name = outdated[i];
        //jshint -W083
        runtimeModuleInfo[name].parents.forEach(function(parentName) {
          if (
            runtimeModuleInfo[name].selfAcceptCbs.length === 0 &&
            !runtimeModuleInfo[name].accepters.has(parentName) &&
            !runtimeModuleInfo[name].decliners.has(parentName) &&
            outdated.indexOf(parentName) === -1
          ) {
            outdated.push(parentName);
          }
        });
      }
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
                  deps: depNames,
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
          data: runtimeModuleInfo[name].disposeData,
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
            reloadAndRunScript(function(err, expectUpdate) {
              if (err || !expectUpdate) {
                global._hmr.setStatus('idle');
                cb(err, null);
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
              cb(new Error("module.hot.apply can only be called while status is ready"));
              return;
            }

            var outdatedModules = getOutdatedModules();
            var isValueNotInOutdatedModules = function(value) {
              return outdatedModules.indexOf(value) === -1;
            };
            var i, len;
            var acceptedUpdates = filter(outdatedModules, function(name) {
              if (has(runtimeModuleInfo, name)) {
                if (
                  runtimeModuleInfo[name].decliners.some(isValueNotInOutdatedModules) ||
                  (
                    runtimeModuleInfo[name].accepters.size() === 0 &&
                    runtimeModuleInfo[name].selfAcceptCbs.length === 0 &&
                    runtimeModuleInfo[name].parents.some(isValueNotInOutdatedModules)
                  )
                ) {
                  return false;
                }
              }
              return true;
            });
            if (!ignoreUnaccepted && outdatedModules.length !== acceptedUpdates.length) {
              global._hmr.setStatus('idle');
              cb(new Error("Some updates were declined"));
              return;
            }
            var an;
            for (i=0, len=acceptedUpdates.length; i<len; i++) {
              an = acceptedUpdates[i];
              for (var j=0; j<runtimeModuleInfo[an].disposeHandlers.length; j++) {
                try {
                  var data = {};
                  runtimeModuleInfo[an].disposeHandlers[j].call(null, data);
                  runtimeModuleInfo[an].disposeData = data;
                } catch(e) {
                  global._hmr.setStatus('idle');
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
                  parents: new StrSet(global._hmr.newLoad.moduleMeta[name].parents),
                  module: null,
                  disposeData: null,
                  accepters: new StrSet(),
                  accepting: new StrSet(),
                  decliners: new StrSet(),
                  declining: new StrSet(),
                  selfAcceptCbs: [],
                  disposeHandlers: []
                };
              } else {
                runtimeModuleInfo[an].hash = global._hmr.newLoad.moduleMeta[an].hash;
                runtimeModuleInfo[an].parents = new StrSet(global._hmr.newLoad.moduleMeta[an].parents);
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

            global._hmr.setStatus('idle');
            cb(errCanWait, acceptedUpdates);
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
      require(originalEntries[i]);
    }
  } else { // We're in a reload!
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
