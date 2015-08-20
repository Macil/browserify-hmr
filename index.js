'use strict';

var path = require('path');
var through = require('through2');
var convert = require('convert-source-map');
var sm = require('source-map');
var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var RSVP = require('rsvp');

function has(object, propName) {
  return Object.prototype.hasOwnProperty.call(object, propName);
}

function hashSource(str) {
  var hasher = crypto.createHash('sha256');
  hasher.update(str);
  return hasher.digest('base64').slice(0, 20);
}

var readManagerTemplate = _.once(function() {
  return new RSVP.Promise(function(resolve, reject) {
    fs.readFile(path.join(__dirname, 'hmr-manager-template.js'), 'utf8', function(err, data) {
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
});

var validUpdateModes = ['ajax', 'fs'];
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

module.exports = function(bundle, opts) {
  if (!opts) opts = {};
  var updateMode = opts.mode||opts.m||'ajax';
  var updateUrl = opts.url||opts.u||null;

  var updateCacheBust = (function(){
    var value = has(opts, 'cacheBust') ? opts.cacheBust : has(opts, 'b') ? opts.b : true;
    return Boolean(value && value !== 'false');
  })();
  var bundleKey = opts.key || updateMode+':'+(updateUrl||bundle.argv.outfile);

  if (updateMode === 'xhr') {
    console.warn('Use update mode "ajax" instead of "xhr".');
    updateMode = 'ajax';
  }

  if (!_.includes(validUpdateModes, updateMode)) {
    throw new Error("Invalid mode "+updateMode);
  }
  if (!updateUrl && _.includes(updateModesNeedingUrl, updateMode)) {
    throw new Error("url option must be specified for "+updateMode+" mode");
  }

  var hmrManagerFilename;

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
      var source = originalEntries.map(function(name) {
        return 'require('+JSON.stringify(name)+');\n';
      }).join('');

      // Put the hmr file name in the same directory as an entry file in order
      // to prevent this: https://github.com/babel/babelify/issues/85
      hmrManagerFilename = path.join(path.dirname(originalEntries[0]), '__hmr_manager.js');
      this.push({
        entry: true,
        expose: false,
        basedir: undefined,
        file: hmrManagerFilename,
        id: hmrManagerFilename,
        source: source,
        order: 0
      });
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
      if (row.file !== hmrManagerFilename) {
        makeModuleMetaEntry(row.file);
        _.forOwn(row.deps, function(name, ref) {
          // dependencies that aren't included in the bundle have the name false
          if (name) {
            makeModuleMetaEntry(name);
            moduleMeta[name].parents.push(row.file);
          }
        });
      }
      next(null, row);
    }));

    bundle.pipeline.get('syntax').push(through.obj(function(row, enc, next) {
      if (row.file === hmrManagerFilename) {
        next(null, row);
      } else {
        var hash = moduleMeta[row.file].hash = hashSource(row.source);
        if (has(transformCache, row.file) && transformCache[row.file].hash === hash) {
          row.source = transformCache[row.file].transformedSource;
        } else {
          var header = '_hmr['+JSON.stringify(bundleKey)+
            '].initModule('+JSON.stringify(row.file)+', module);\n(function(){\n';
          var footer = '\n}).call(this, arguments);\n';

          var inputMapCV = convert.fromSource(row.source);
          var inputMap;
          if (inputMapCV) {
            inputMap = inputMapCV.toObject();
            row.source = convert.removeComments(row.source);
          } else {
            inputMap = makeIdentitySourceMap(row.source, row.file);
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
        }
        next(null, row);
      }
    }));

    var managerRow = null;
    bundle.pipeline.get('label').push(through.obj(function(row, enc, next) {
      if (row.file !== hmrManagerFilename) {
        // row.id used when fullPaths flag is used
        moduleMeta[row.file].index = has(row, 'index') ? row.index : row.id;
        next(null, row);
      } else {
        managerRow = row;
        next(null);
      }
    }, function(done) {
      var self = this;
      readManagerTemplate().then(function(mgrTemplate) {
        managerRow.source = mgrTemplate
          .replace('null/*!^^moduleMeta*/', JSON.stringify(moduleMeta))
          .replace('null/*!^^originalEntries*/', JSON.stringify(originalEntries))
          .replace('null/*!^^updateUrl*/', JSON.stringify(updateUrl))
          .replace('null/*!^^updateMode*/', JSON.stringify(updateMode))
          .replace('null/*!^^updateCacheBust*/', JSON.stringify(updateCacheBust))
          .replace('null/*!^^bundleKey*/', JSON.stringify(bundleKey));
        self.push(managerRow);
      }).then(done, done);
    }));
  }
  setupPipelineMods();

  bundle.on('reset', setupPipelineMods);
};
