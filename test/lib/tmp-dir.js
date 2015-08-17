const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function randomId() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(8, (err, buf) => {
      if (err)
        reject(err);
      else
        resolve(buf.toString('hex'));
    });
  });
}

export default function tmpDir() {
  return randomId().then(id => {
    return new Promise((resolve, reject) => {
      const dir = path.join(os.tmpdir(), `browserify-hmr-test-${id}`);
      fs.mkdir(dir, 448 /*0700*/, err => {
        if (err)
          reject(err);
        else
          resolve(dir);
      });
    });
  });
}
