var $ = require('jquery');
var React = require('react');
var Label = require('./label.jsx');
require('./interval')();

$(document).ready(() => {
  React.render(
    React.createElement(Label, null),
    document.getElementById('main')
  );
});
