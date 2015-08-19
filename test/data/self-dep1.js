var assert = require('assert');

assert.equal(module.hot.data, null);

module.hot.accept();
