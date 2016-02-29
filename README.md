# Browserify-HMR

This an implementation of Webpack's [Hot Module Replacement
API](https://webpack.github.io/docs/hot-module-replacement.html) as a plugin for
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

## Hot Module Replacement Usage

Hot module replacement works by re-executing updated modules. The [Hot Module
Replacement API](https://webpack.github.io/docs/hot-module-replacement.html)
must be used to define which modules can accept updates, and what to do when a
module is going to be updated.

However, using the HMR API directly in application code is not always the best
route. Code transforms and libraries like
[react-transform-hmr](https://github.com/gaearon/react-transform-hmr) and
[ud](https://github.com/AgentME/ud) can help do common tasks or entirely
automate making certain types of code be hot replaceable.

In addition to the `module.hot.*` functions from the Webpack Hot Module
Replacement API, the following is also implemented:

### module.hot.setUpdateMode(mode, options)

This allows the bundle update mode and options to be changed at runtime. `mode`
should be a string and has the same meaning as `mode` in the Plugin Options
section. `options` is an optional object which may have the properties `url`,
`ajaxCacheBust`, and `websocketIgnoreUnaccepted`, also with the same meanings
as the same options in the Plugin Options section. These options are set to
their default values if not given; they are not inherited from the options
passed to the plugin! The HMR status must be "idle" when this is called.

## Plugin Usage

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

## Plugin Options

Browserify-HMR's default options are good for building a bundle that allows the
browser to connect over a websocket to the same instance of Browserify-HMR that
built the bundle.

Browserify-HMR options can be specified from the command line following the
plugin name with braces in long or short form:

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
the bundle to open a connection to a websocket server hosted by the plugin to
listen for changes. The websocket will be served over HTTP unless any of the
websocketTlsKey, websocketTlsCert, or websocketTlsOptions options are passed.
"ajax" uses AJAX requests to download updates. "fs" uses the filesystem module
and is suitable for Node use. "none" causes the bundle to not be configured to
check for updates. `module.hot.setUpdateMode` may be called at runtime to
reconfigure the bundle. Defaults to "websocket".

`supportModes` is an optional array of strings specifying other update modes
to build support for into the bundle in addition to the given `mode`. This must
be used if the bundle is going to change the update mode by using
`module.hot.setUpdateMode` at runtime to a mode not given in the `mode` option.
You can pass arrays on the command line like this:

    watchify -p [ browserify-hmr -m none --supportModes [ ajax websocket ] ] index.js -o bundle.js

`u, url` is a string which sets the update URL that the websocket connection or
Browserify bundle is accessible at. This is required for the "ajax" mode. This
is not required for "fs" mode. In "websocket" mode, this defaults to
"http://localhost:0", and the string ":0" if present will be replaced with the
port that the websocket server is hosted on. 

`websocketRunServer` is a boolean which causes Browserify-HMR to host a
websocket server to to deliver updates if `mode` or `supportModes` contains
"websocket". Defaults to true. You could may choose to disable this if you're
building a bundle in websocket mode with the `url` option set to point to a
websocket server hosted by another instance of Browserify-HMR.

`websocketIgnoreUnaccepted` is a boolean which controls the value of the
`ignoreUnaccepted` parameter to `module.hot.apply` for the "websocket" mode.
(When the "websocket" mode is used, Browserify-HMR automatically checks for
updates and applies them, so the application never gets a chance to call
`module.hot.apply` itself.) Defaults to true.

`websocketUsePassword` is a boolean which controls whether the websocket server
will require a randomly-generated password that's encoded into the bundle in
order to connect. Defaults to true. Note that the password changes every time
Browserify-HMR is launched, so browsers open to a page containing a bundle
generated by a previous run of Browserify-HMR won't be able to receive updates,
and the page will need to be refreshed. Either this option or the
`websocketOrigins` option should be used in order to prevent other web pages
you visit from being able to cause your browser to open a connection to any
local Browserify-HMR instances you have running.

`websocketOrigins` may be an array of strings naming page origins (like
"http://localhost:8080") that are allowed to connect to the websocket server.
If this is set to null, then any origin is allowed. Defaults to null.

`p, websocketPort` is a number that sets the port to listen on if "websocket"
mode is used. If you change this, you'll most likely want to change the `url`
setting too. Defaults to 3123.

`h, websocketHostname` is the hostname to listen on if "websocket" mode is
used. This defaults to "localhost". `null` or `"*"` may be given to listen on
all interfaces, which is good for allowing access to other machines on your
LAN. (You will need to edit the `url` option too for this.)

`websocketFreePort` is a boolean which causes Browserify-HMR to automatically
listen on the next available port if the port it tries to listen on is taken.
Defaults to true.

`K, websocketTlsKey` is the path to the key file to use for HTTPS mode.

`C, websocketTlsCert` is the path to the certificate file to use for HTTPS mode.

`websocketTlsOptions` is an object of options to pass to the call to
`https.createServer`. Note that this object must be JSONifiable, so use strings
instead of any buffers inside of it. This option may not be given by the
command line.

`ajaxCacheBust` is a boolean which controls whether cache busting should be
used for AJAX requests. This only has an effect if the update mode is set to
"ajax". If true, then a random parameter is appended to the URL on every
request. This allows the cache to be bypassed when the server does not give a
low Expires or Cache-Control header value. Note that this prevents E-Tag and
Last-Modified headers from being used by the client, so keeping this disabled
if it's not needed can be better for performance. You should consider tuning
the HTTP headers your script is served with before tweaking this. Defaults to
false.

`key` is the bundle key. If multiple bundles built using Browserify-HMR are
run within the same javascript environment, then each must have a unique bundle
key. The bundle key defaults to a value created by combining the update mode
and update url, so you generally don't need to worry about this option.


## Reload Checking

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

## Development

If you're going to hack on Browserify-HMR, make sure you notice that the
example directory depends on the NPM-published version of Browserify-HMR.
You'll probably want to replace `example/node_modules/browserify-hmr` with a
symlink to `../..` so you can test the example with your local copy of
Browserify-HMR.

## Planned Work

* There are known bugs currently where changes to modules without update
  accepters can cause the updates to bubble up to the entry and cause many
  modules to be reloaded incorrectly.
* The client code is a bit of a mess. It should be refactored and have many
  smaller unit tests made.
