## 0.4.0 (2019-09-28)

### Breaking Changes
* Browserify-HMR in websocket mode now checks that websocket connections are opened from a page from the configured hostname or localhost. This is done to prevent arbitrary webpages from telling your browser to connect to an instance of Browserify-HMR you're running. This check can be disabled with the `disableHostCheck` option. [#45](https://github.com/Macil/browserify-hmr/pull/45)
* Dropped support for Node < 8.

## 0.3.7 (2018-11-12)

* Implemented `module.id` for [react-hot-loader](https://github.com/gaearon/react-hot-loader) support.
* Implemented 'apply' HMR status for [react-hot-loader](https://github.com/gaearon/react-hot-loader) support.

## 0.3.6 (2017-11-17)

* Updated socket.io version used. [#38](https://github.com/Macil/browserify-hmr/pull/38)

## 0.3.5 (2016-09-16)

* Fixed bug where messages to socket server could interleave incorrectly.

## 0.3.4 (2016-09-15)

* Fixed browserify-hmr not shutting down when the main or socket server processes were killed.

## 0.3.3 (2016-09-15)

* Fixed performance issue with large bundles.
* Fixed memory leak caused by JSONStream by removing it. (https://github.com/dominictarr/JSONStream/issues/32)

## 0.3.2 (2016-09-15)

* Fixed handling of '$' character in filenames.
* Updated some dependencies.

## 0.3.1 (2015-10-06)

* Upgraded [source-map](https://github.com/mozilla/source-map) dependency to ^0.5.

## 0.3.0 (2015-09-27)

Changelog started.
* Added `module.hot.setUpdateMode` API.
