const rimraf = require('rimraf');

export default function rmrf(dir) {
  return new Promise((resolve, reject) => {
    rimraf(dir, err => {
      if (err)
        reject(err);
      else
        resolve();
    });
  });
}
