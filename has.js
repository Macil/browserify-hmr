'use strict';

function has(object, propName) {
  return Object.prototype.hasOwnProperty.call(object, propName);
}
module.exports = has;
