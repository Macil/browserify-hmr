var path = require('path');
var through = require('through2');
var crypto = require('crypto');
var fs = require('fs');
var _ = require('lodash');
var RSVP = require('rsvp');

function has(object, propName) {
  return Object.prototype.hasOwnProperty.call(object, propName);
}

function hash(str) {
  var hasher = crypto.createHash('sha256');
  hasher.update(str);
  return hasher.digest('base64').slice(0, 20);
}

var readManagerTemplate = _.once(function() {
  return new RSVP.Promise(function(resolve, reject) {
    fs.readFile(path.resolve(__dirname, 'hmr-manager-template.js'), 'utf8', function(err, data) {
      if (err)
        reject(err);
      else
        resolve(data);
    });
  });
});

module.exports = function(bundle, opts) {
  if (!opts) opts = {};

  console.log('hmr plugin running');
  var hmrManagerFilename = path.resolve(__dirname, '__hmr_manager.js');
  var originalEntries = [];
  var moduleMeta = null;
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
    this.push({
      entry: true,
      expose: false,
      basedir: undefined,
      file: hmrManagerFilename,
      id: hmrManagerFilename,
      source: source,
      order: 0
    });
    moduleMeta = {};
    next();
  }));

  function makeModuleMetaEntry(name) {
    if (!has(moduleMeta, name)) {
      moduleMeta[name] = {
        index: null,
        hash: null,
        parents: []
      };
    }
  }

  bundle.transform(function(file, opts) {
    if (file === hmrManagerFilename) {
      return through.obj();
    }
    var hasEmittedHeader = false;
    var header = '_hmr.initModule('+JSON.stringify(file)+', module);\n(function(){\n';
    var footer = '}).call(this, arguments);\n';
    return through.obj(function(row, enc, next) {
      if (!hasEmittedHeader) {
        hasEmittedHeader = true;
        this.push(header);
      }
      next(null, row);
    }, function(done) {
      if (!hasEmittedHeader) {
        hasEmittedHeader = true;
        this.push(header);
      }
      this.push(footer);
      done();
    });
  });

  bundle.pipeline.get('deps').push(through.obj(function(row, enc, next) {
    if (row.file !== hmrManagerFilename) {
      makeModuleMetaEntry(row.file);
      _.forOwn(row.deps, function(name, ref) {
        makeModuleMetaEntry(name);
        moduleMeta[name].parents.push(row.file);
      });
    }
    next(null, row);
  }));

  var labelRows = [];
  var managerRow = null;
  bundle.pipeline.get('label').push(through.obj(function(row, enc, next) {
    if (row.file !== hmrManagerFilename) {
      moduleMeta[row.file].index = row.index;
      moduleMeta[row.file].hash = hash(row.source);
      labelRows.push(row);
    } else {
      managerRow = row;
    }
    next(null);
  }, function(done) {
    var self = this;
    readManagerTemplate().then(function(mgrTemplate) {
      managerRow.source = mgrTemplate
        .replace('null/*!^^moduleMeta*/', JSON.stringify(moduleMeta))
        .replace('null/*!^^originalEntries*/', JSON.stringify(originalEntries))
        .replace('null/*!^^updateUrl*/', JSON.stringify('bundle.js'))
        .replace('null/*!^^updateMode*/', JSON.stringify('fs'));
      self.push(managerRow);
      labelRows.forEach(function(row) {
        self.push(row);
      });
      labelRows = [];
      managerRow = null;
    }).then(done, done);
  }));
};
