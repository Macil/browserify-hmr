const path = require('path');
const co = require('co');
import run from './lib/run';
import delay from './lib/delay';
import tmpDir from './lib/tmp-dir';
import rmrf from './lib/rmrf';
import copy from './lib/copy';

describe('plugin (integration)', function() {
  let dir = null;

  beforeEach(co.wrap(function*() {
    dir = yield tmpDir();
  }));
  afterEach(co.wrap(function*() {
    if (dir) {
      yield rmrf(dir);
    }
    dir = null;
  }));

  it('basic case works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'basic-index.js');
    const dep = path.join(dir, 'basic-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/basic-index.js', index);
    yield copy('./test/data/basic-dep1.js', dep);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/basic-dep2.js', dep);
        yield run('./node_modules/.bin/browserify', [
          // test --full-paths too
          '--node','--full-paths','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('self accepting works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'self-index.js');
    const dep = path.join(dir, 'self-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/self-index.js', index);
    yield copy('./test/data/self-dep1.js', dep);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/self-dep2.js', dep);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('multiple bundles work', co.wrap(function*() {
    this.slow();this.timeout(5000);
    // run the self-accepter initial bundle, then the basic case initial
    // bundle, then update the basic case bundle and make sure that works.

    const selfIndex = path.join(dir, 'self-index.js');
    const selfDep = path.join(dir, 'self-dep.js');
    const selfBundle = path.join(dir, 'bundle.js');

    const basicIndex = path.join(dir, 'basic-index.js');
    const basicDep = path.join(dir, 'basic-dep.js');
    const basicBundle = path.join(dir, 'basic-bundle.js');

    yield Promise.all([
      co(function*() {
        yield copy('./test/data/self-index.js', selfIndex);
        yield copy('./test/data/self-dep1.js', selfDep);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs','-k','self',']',selfIndex,'-o',selfBundle
        ]);
      }),
      co(function*() {
        yield copy('./test/data/basic-index.js', basicIndex);
        yield copy('./test/data/basic-dep1.js', basicDep);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs','-k','basic',']',basicIndex,'-o',basicBundle
        ]);
      })
    ]);

    yield Promise.all([
      run('node', [
        '-e',
        `require(${JSON.stringify(selfBundle)}); require(${JSON.stringify(basicBundle)});`
      ]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/basic-dep2.js', basicDep);
        yield run('./node_modules/.bin/browserify', [
          // test --full-paths too
          '--node','--full-paths','-p','[','./index','-m','fs','-k','basic',']',basicIndex,'-o',basicBundle
        ]);
      })
    ]);
  }));

  it('deep accepting works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'deep-index.js');
    const depA = path.join(dir, 'deep-dep-a.js');
    const depB = path.join(dir, 'deep-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/deep-index.js', index);
    yield copy('./test/data/deep-dep-a.js', depA);
    yield copy('./test/data/deep-dep-b1.js', depB);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/deep-dep-b2.js', depB);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('new dependency works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'new-index.js');
    const depA = path.join(dir, 'new-dep-a.js');
    const depB = path.join(dir, 'new-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/new-index.js', index);
    yield copy('./test/data/new-dep-a1.js', depA);
    yield copy('./test/data/new-dep-b.js', depB);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/new-dep-a2.js', depA);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('remove dependency works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'remove-index.js');
    const depA = path.join(dir, 'remove-dep-a.js');
    const depB = path.join(dir, 'remove-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/remove-index.js', index);
    yield copy('./test/data/remove-dep-a1.js', depA);
    yield copy('./test/data/remove-dep-b.js', depB);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/remove-dep-a2.js', depA);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('setUpdateMode works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'setUpdateMode-index.js');
    const dep = path.join(dir, 'basic-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/setUpdateMode-index.js', index);
    yield copy('./test/data/basic-dep1.js', dep);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','none','--supportModes','[','fs',']',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/basic-dep2.js', dep);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','none','--supportModes','[','fs',']',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('lone entry without accepts should not update', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'lone-index.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/lone-index1.js', index);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/fail.js', index);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('entry with deps without accepts should not update', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'no-update-index.js');
    const dep = path.join(dir, 'no-update-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/no-update-index.js', index);
    yield copy('./test/data/no-update-dep.js', dep);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/fail.js', dep);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));

  it('self declining works', co.wrap(function*() {
    this.slow();this.timeout(5000);
    const index = path.join(dir, 'self-decline-index.js');
    const depA = path.join(dir, 'self-decline-dep-a.js');
    const depB = path.join(dir, 'self-decline-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    yield copy('./test/data/self-decline-index.js', index);
    yield copy('./test/data/self-decline-dep-a.js', depA);
    yield copy('./test/data/self-decline-dep-b.js', depB);
    yield run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    yield Promise.all([
      run('node', [bundle]),
      co(function*() {
        yield delay(200);
        yield copy('./test/data/fail.js', depB);
        yield run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })
    ]);
  }));
});
