## 0.3.7 (2018-11-12)

* Implement `module.id` for [react-hot-loader](https://github.com/gaearon/react-hot-loader) support.
* Implement 'apply' HMR status for [react-hot-loader](https://github.com/gaearon/react-hot-loader) support.

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
