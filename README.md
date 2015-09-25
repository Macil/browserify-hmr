# Browserify-HMR

This an implementation of Webpack's [Hot Module Replacement
API](http://webpack.github.io/docs/hot-module-replacement.html) as a plugin for
Browserify. This project seems to work in many cases, but it is still early in
development and likely has some bugs at the moment. Let me know how it works
for you!

## Quick Example

```sh
git clone https://github.com/AgentME/browserify-hmr.git
cd browserify-hmr/example
npm i && npm start
```

Open [http://localhost:8080/](http://localhost:8080/) and try updating
`label.jsx` and `interval.js`.

## Usage

Add the browserify-hmr plugin to your watchify call:

```sh
npm i browserify-hmr
watchify -p browserify-hmr index.js -o bundle.js
```

Browserify-HMR works with Node too! Use the m/mode option to tell it to use the
"fs" method to update itself. See more information below in the Options
section.

```sh
watchify --node -p [ browserify-hmr -m fs ] index.js -o bundle.js
```

Watchify is not required. Browserify can be run multiple times manually instead
if more control over the timing of the reloads is desired.

    browserify -p [ browserify-hmr -m ajax -u /bundle.js ] index.js -o bundle.js
    nano foo.js # make some edits
    nano bar.js # edit some more files
    browserify -p [ browserify-hmr -m ajax -u /bundle.js ] index.js -o bundle.js

## Options

Browserify-HMR options can be specified from the command line following the plugin name with braces in long or short form:

```sh
watchify -p [ browserify-hmr -m fs ] index.js -o bundle.js
```

Options can be specified using the Browserify API too:

```javascript
var hmr = require('browserify-hmr');

browserify().plugin(hmr, {
  mode: "fs"
})
```

`m, mode` is a string which sets the update mode. "websocket" tells
browserify-hmr to open a connection to a websocket server hosted by the plugin
to listen for changes. The websocket will be served over HTTP unless any of the
tlskey, tlscert, or tlsoptions options are passed. "ajax" uses AJAX requests to
download updates. "fs" uses the filesystem module and is suitable for Node use.
Defaults to "websocket".

`u, url` is a string which sets the update URL that the websocket connection or
Browserify bundle is accessible at. In "websocket" mode, this defaults to
"http://localhost:3123". This is required for the "ajax" mode. This is not
required for "fs" mode.

`b, cacheBust` is a boolean which controls whether cache busting should be used
for AJAX requests. This only has an effect if the update mode is set to "ajax".
If true, then a random parameter is appended to the URL on every request. This
allows the cache to be bypassed when the server does not give a low Expires or
Cache-Control header value. Note that this prevents E-Tag and Last-Modified
headers from being used by the client, so disabling this if it's not needed can
result in a performance improvement. Defaults to true.

`k, key` is the bundle key. If multiple bundles built using Browserify-HMR are
run within the same javascript environment, then each must have a unique bundle
key. The bundle key defaults to a value created by combining the update mode
and update url, so you generally don't need to worry about this option.

`K, tlskey` is the path to the key file to use for HTTPS mode.

`C, tlscert` is the path to the certificate file to use for HTTPS mode.

`tlsoptions` is an object of options to pass to the call to
`https.createServer`. Note that this object must be JSONifiable, so use strings
instead of any buffers inside of it.

If you don't use the default websocket update mode, then you'll need to
manually tell browserify-hmr when it should check for and apply updates. You
can use code like the following somewhere in your project to poll for updates:

```javascript
if (module.hot) {
  var doCheck = function() {
    module.hot.check(function(err, outdated) {
      if (err) {
        console.error('Check error', err);
      }
      if (outdated) {
        module.hot.apply(function(err, updated) {
          if (err) {
            console.error('Update error', err);
          } else {
            console.log('Replaced modules', updated);
          }
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

## See Also

* [react-hot-transform](https://github.com/AgentME/react-hot-transform)
  automatically makes React code live-updatable.
* [ud](https://github.com/AgentME/ud) and
  [ud-kefir](https://github.com/AgentME/ud-kefir) are small simple utilities
  for declaring data and code as live-updatable.

## Planned Work

* Extend the API so the user can control the update mode and parameters at
  runtime.
* There are known bugs currently where changes to modules without update
  accepters can cause the updates to bubble up to the entry and cause many
  modules to be reloaded incorrectly.
* The client code is a bit of a mess. It should be refactored and have many
  smaller unit tests made.
