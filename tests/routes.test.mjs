import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
test('Vue migration includes the reference layout boundaries', async () => {
  const layout = await readFile(new URL('../src/layouts/BizLayout.vue', import.meta.url), 'utf8');
  assert.match(layout, /console-header/);
  assert.match(layout, /console-sidebar|sidebar/);
  assert.match(layout, /RouterView/);
});

import { navigation, detailPages, routeAliases, resolveNavigation } from '../src/router/navigation.js';

test('no module view repeats breadcrumbs; the title and menu carry the current location', async () => {
  const layout = await readFile(new URL('../src/layouts/BizLayout.vue', import.meta.url), 'utf8');
  assert.doesNotMatch(layout, /header-context|RightOutlined/);
  const viewFiles = (await readdir(new URL('../src/views/', import.meta.url), { recursive: true })).filter(file => file.endsWith('.vue'));
  assert.ok(viewFiles.length > 0);
  for (const file of viewFiles) {
    const source = await readFile(new URL(`../src/views/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /breadcrumb/i, file);
  }
});

test('merged navigation keeps nine modules with consolidated children', () => {
  assert.deepEqual(navigation.map(group => group.key), ['overview', 'monitor', 'tasks', 'settings', 'assets', 'clusters', 'pools', 'audit', 'services']);
  const pages = navigation.flatMap(group => group.children.map(page => page.key));
  assert.equal(pages.length, 21);
  assert.equal(new Set(pages).size, pages.length);
  for (const group of navigation) {
    for (const page of group.children) {
      assert.equal(resolveNavigation(page.key)?.group.key, group.key);
      assert.equal(resolveNavigation(page.key)?.parent, page.key);
    }
  }
});
test('detail routes select the parent menu instead of defaulting to overview', () => {
  for (const [id, detail] of Object.entries(detailPages)) {
    assert.equal(resolveNavigation(id)?.parent, detail.parent);
    assert.equal(resolveNavigation(id)?.title, detail.title);
  }
  assert.equal(resolveNavigation('incident-review')?.group.key, 'monitor');
  assert.equal(resolveNavigation('delivery-order')?.group.key, 'pools');
  assert.equal(resolveNavigation('session')?.parent, 'audit-logs');
  assert.equal(resolveNavigation('node')?.parent, 'clusters');
  assert.equal(resolveNavigation('missing'), null);
});
test('legacy redirects point to registered pages without overriding details', () => {
  for (const [path, page] of Object.entries(routeAliases)) {
    assert.ok(resolveNavigation(page), `${path} must resolve`);
    assert.ok(!detailPages[path.slice(1)], `${path} conflicts with a detail route`);
  }
});
test('global and regional scope remain separate', () => {
  assert.deepEqual(navigation.filter(group => group.scope === 'global').map(group => group.key), ['overview', 'monitor', 'tasks', 'settings']);
  assert.deepEqual(navigation.filter(group => group.scope === 'regional').map(group => group.key), ['assets', 'clusters', 'pools', 'audit', 'services']);
});
