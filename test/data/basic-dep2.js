var assert = require('assert');

assert.strictEqual(module.hot.data.foo, 'bar');

module.exports = 2;
