var assert = require('assert');

assert.strictEqual(module.hot.data.bar, 'bar');
assert.strictEqual(module.hot.data.foo, 'foo');

module.exports = 2;
