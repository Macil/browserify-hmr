# browserify-hmr

This an implementation of Webpack's [Hot Module Replacement
API](http://webpack.github.io/docs/hot-module-replacement.html) as a plugin for
Browserify. This project seems to work, but it is still in development and
is likely under-documented and under-tested!

Build your project like this, passing the u/url parameter to tell the script
what URL it should try to reload itself from:

    npm i browserify-hmr
    browserify -p [ browserify-hmr -u /bundle.js ] index.js -o bundle.js

Then use code like the following somewhere in your project to poll for changes:

```javascript
if (module.hot) {
  var doCheck = function() {
    module.hot.check(function(err, outdated) {
      if (err) {
        console.error('Check error', err);
      }
      if (outdated) {
        module.hot.apply(function(err, updated) {
          console.log('Replaced modules', updated);
          setTimeout(doCheck, 2000);
        });
      } else {
        setTimeout(doCheck, 2000);
      }
    });
  };
  doCheck();
}
```

## TODO and gotchas

* sourcemaps support
* more tests
* make a Browserify-compatible react-hot-loader transform
* Only one browserify-hmr built script can be active in a javascript context at
  once right now because they would all use the same global to synchronize
  state. We should make it so the plugin takes an option to allow a named
  sub-object of the global to be used instead to allow multiple browserify-hmr
  bundles to play nice together.
