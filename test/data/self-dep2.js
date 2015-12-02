var assert = require('assert');

assert.notEqual(module.hot.data, null);
assert.equal(Object.keys(module.hot.data).length, 0);

// success
process.exit(0);
