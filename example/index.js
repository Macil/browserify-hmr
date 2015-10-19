var $ = require('jquery');
var React = require('react');
import Label from './label.jsx';
require('./interval')();

require('dtektor/all');

$(document).ready(() => {
  React.render(
    React.createElement(Label, null),
    document.getElementById('main')
  );
});
