module.hot.dispose(function(data) {
  data.bar = 'bar';
});
module.hot.dispose(function(data) {
  data.foo = 'foo';
});

module.exports = 1;
