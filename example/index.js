import '@babel/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Label from './Label.jsx';

require('./interval')();

const onReady = new Promise(resolve => {
  if (document.readyState === 'complete') {
    resolve();
  } else {
    document.addEventListener('DOMContentLoaded', resolve, false);
    window.addEventListener('load', resolve, false);
  }
});

onReady.then(main).catch(e => {
  console.error(e);
});

function main() {
  ReactDOM.render(
    <Label />,
    document.getElementById('main')
  );
}
