const _ = require('lodash');
const cproc = require('child_process');

let runningProcs = [];

process.on('exit', () => {
  runningProcs.slice().forEach(proc => {
    proc.kill('SIGKILL');
  });
});

// all stdout and stderr goes to screen
export default function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = cproc.spawn(cmd, args, {stdio:'inherit'});
    runningProcs.push(proc);
    proc.on('exit', code => {
      runningProcs = _.without(runningProcs, proc);
      if (code === 0) {
        resolve();
      } else {
        const err = new Error("Process exited with code "+code);
        err.code = code;
        reject(err);
      }
    });
  });
}
