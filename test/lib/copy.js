const path = require('path');
const fsExtra = require('fs-extra');

export default function copy(src, target) {
  return new Promise((resolve, reject) => {
    fsExtra.copy(src, target, {overwrite:true}, err => {
      if (err)
        reject((Array.isArray(err) && err[0]) ? err[0] : err);
      else
        resolve();
    });
  });
}
