const path = require('path');
import run from './lib/run';
import delay from './lib/delay';
import tmpDir from './lib/tmp-dir';
import rmrf from './lib/rmrf';
import copy from './lib/copy';

describe('plugin (integration)', function() {
  this.slow(5000);
  this.timeout(5000);

  let dir = null;

  beforeEach(async () => {
    dir = await tmpDir();
  });
  afterEach(async () => {
    if (dir) {
      await rmrf(dir);
    }
    dir = null;
  });

  it('basic case works', async () => {
    const index = path.join(dir, 'basic-index.js');
    const dep = path.join(dir, 'basic-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    await copy('./test/data/basic-index.js', index);
    await copy('./test/data/basic-dep1.js', dep);
    await run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    await Promise.all([
      run('node', [bundle]),
      (async () => {
        await delay(200);
        await copy('./test/data/basic-dep2.js', dep);
        await run('./node_modules/.bin/browserify', [
          // test --full-paths too
          '--node','--full-paths','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })()
    ]);
  });

  it('self accepting works', async () => {
    const index = path.join(dir, 'self-index.js');
    const dep = path.join(dir, 'self-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    await copy('./test/data/self-index.js', index);
    await copy('./test/data/self-dep1.js', dep);
    await run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    await Promise.all([
      run('node', [bundle]),
      (async () => {
        await delay(200);
        await copy('./test/data/self-dep2.js', dep);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })()
    ]);
  });

  it('multiple bundles work', async () => {
    // run the self-accepter initial bundle, then the basic case initial
    // bundle, then update the basic case bundle and make sure that works.

    const selfIndex = path.join(dir, 'self-index.js');
    const selfDep = path.join(dir, 'self-dep.js');
    const selfBundle = path.join(dir, 'bundle.js');

    const basicIndex = path.join(dir, 'basic-index.js');
    const basicDep = path.join(dir, 'basic-dep.js');
    const basicBundle = path.join(dir, 'basic-bundle.js');

    await Promise.all([
      (async () => {
        await copy('./test/data/self-index.js', selfIndex);
        await copy('./test/data/self-dep1.js', selfDep);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs','-k','self',']',selfIndex,'-o',selfBundle
        ]);
      })(),
      (async () => {
        await copy('./test/data/basic-index.js', basicIndex);
        await copy('./test/data/basic-dep1.js', basicDep);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs','-k','basic',']',basicIndex,'-o',basicBundle
        ]);
      })()
    ]);

    await Promise.all([
      run('node', [
        '-e',
        `require(${JSON.stringify(selfBundle)}); require(${JSON.stringify(basicBundle)});`
      ]),
      (async () => {
        await delay(200);
        await copy('./test/data/basic-dep2.js', basicDep);
        await run('./node_modules/.bin/browserify', [
          // test --full-paths too
          '--node','--full-paths','-p','[','./index','-m','fs','-k','basic',']',basicIndex,'-o',basicBundle
        ]);
      })()
    ]);
  });

  it('deep accepting works', async () => {
    const index = path.join(dir, 'deep-index.js');
    const depA = path.join(dir, 'deep-dep-a.js');
    const depB = path.join(dir, 'deep-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    await copy('./test/data/deep-index.js', index);
    await copy('./test/data/deep-dep-a.js', depA);
    await copy('./test/data/deep-dep-b1.js', depB);
    await run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    await Promise.all([
      run('node', [bundle]),
      (async () => {
        await delay(200);
        await copy('./test/data/deep-dep-b2.js', depB);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })()
    ]);
  });

  it('new dependency works', async () => {
    const index = path.join(dir, 'new-index.js');
    const depA = path.join(dir, 'new-dep-a.js');
    const depB = path.join(dir, 'new-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    await copy('./test/data/new-index.js', index);
    await copy('./test/data/new-dep-a1.js', depA);
    await copy('./test/data/new-dep-b.js', depB);
    await run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    await Promise.all([
      run('node', [bundle]),
      (async () => {
        await delay(200);
        await copy('./test/data/new-dep-a2.js', depA);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })()
    ]);
  });

  it('remove dependency works', async () => {
    const index = path.join(dir, 'remove-index.js');
    const depA = path.join(dir, 'remove-dep-a.js');
    const depB = path.join(dir, 'remove-dep-b.js');
    const bundle = path.join(dir, 'bundle.js');

    await copy('./test/data/remove-index.js', index);
    await copy('./test/data/remove-dep-a1.js', depA);
    await copy('./test/data/remove-dep-b.js', depB);
    await run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
    ]);
    await Promise.all([
      run('node', [bundle]),
      (async () => {
        await delay(200);
        await copy('./test/data/remove-dep-a2.js', depA);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','fs',']',index,'-o',bundle
        ]);
      })()
    ]);
  });

  it('setUpdateMode works', async () => {
    const index = path.join(dir, 'setUpdateMode-index.js');
    const dep = path.join(dir, 'basic-dep.js');
    const bundle = path.join(dir, 'bundle.js');

    await copy('./test/data/setUpdateMode-index.js', index);
    await copy('./test/data/basic-dep1.js', dep);
    await run('./node_modules/.bin/browserify', [
      '--node','-p','[','./index','-m','none','--supportModes','[','fs',']',']',index,'-o',bundle
    ]);
    await Promise.all([
      run('node', [bundle]),
      (async () => {
        await delay(200);
        await copy('./test/data/basic-dep2.js', dep);
        await run('./node_modules/.bin/browserify', [
          '--node','-p','[','./index','-m','none','--supportModes','[','fs',']',']',index,'-o',bundle
        ]);
      })()
    ]);
  });
});
