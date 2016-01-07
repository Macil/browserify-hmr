var browserify = require('browserify');
var fs = require('fs');
var del = require('del');
var hmr = require('../../');

var entries = ['index.js', 'mirror.js'];
var b = browserify(entries);

b.plugin('watchify')
 .plugin(hmr, {multiBundle: true})
 .plugin('factor-bundle', {outputs: ['./build/index.js', './build/mirror.js'], threshold: function(){return false}})

b.on('update', bundle);
b.on('log', console.log.bind(console))
bundle();

function bundle() {
  del.sync("build/*.js")
  b.bundle().pipe(fs.createWriteStream('./build/common.js')); //common.js should be empty
}
