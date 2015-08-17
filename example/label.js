var $ = require('jquery');

$(window).ready(function() {
  $("#main").text('this text can update');
});

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(function() {
    // cleanup code here
  });
}
