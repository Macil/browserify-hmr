import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import Label from './label.jsx';

require('./interval')();

$(document).ready(() => {
  ReactDOM.render(
    React.createElement(Label, null),
    document.getElementById('main')
  );
});
