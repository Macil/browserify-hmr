console.log('b2');

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(function() {
    console.log('disposing a');
  });
}
