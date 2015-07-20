var through = require('through');

module.exports = function(bundle, options) {
  bundle.pipeline.get('record').push(through.obj(function(row, enc, next) {
    if (row.file && needRecords) {
      files.push(row.file);
    }
    next(null, row);
  }, function(next) {
    next();
  }));
};
