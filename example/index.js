var $ = require('jquery');
var React = require('react');
import Label from './label.jsx';
require('./interval')();

$(document).ready(() => {
  React.render(
    React.createElement(Label, null),
    document.getElementById('main')
  );
});
