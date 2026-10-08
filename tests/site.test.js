'use strict';
// Zero-dependency smoke tests for the static site. Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const markup = html.replace(/<!--[\s\S]*?-->/g, '');
const attrs = (re) => [...markup.matchAll(re)].map((m) => m[1]);

test('main.js parses', () => {
  assert.doesNotThrow(() => new vm.Script(js, { filename: 'main.js' }));
});

test('local href/src targets exist on disk', () => {
  const refs = attrs(/\s(?:href|src)="([^"]+)"/g).filter(
    (u) => !/^(https?:|mailto:|#|data:)/.test(u)
  );
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(root, ref.split(/[?#]/)[0])), `missing file: ${ref}`);
  }
});

test('ids are unique and in-page anchors resolve', () => {
  const ids = attrs(/\sid="([^"]+)"/g);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id found');
  for (const a of attrs(/\shref="#([^"]+)"/g)) {
    assert.ok(ids.includes(a), `anchor #${a} has no matching id`);
  }
});

test('every element main.js looks up by id exists in index.html', () => {
  const ids = attrs(/\sid="([^"]+)"/g);
  for (const m of js.matchAll(/getElementById\('([^']+)'\)/g)) {
    assert.ok(ids.includes(m[1]), `main.js expects #${m[1]}`);
  }
});

test('every project thumbnail kind has a drawing routine', () => {
  const kinds = attrs(/data-kind="([^"]+)"/g);
  assert.ok(kinds.length > 0);
  for (const k of kinds) {
    assert.match(js, new RegExp(`\\b${k}\\(c, r, p\\)`), `no pattern for thumbnail "${k}"`);
  }
});

test('external links open safely and use https', () => {
  for (const tag of markup.match(/<a\s[^>]*>/g) || []) {
    const href = (tag.match(/href="([^"]+)"/) || [])[1] || '';
    if (/^https?:/.test(href)) assert.ok(href.startsWith('https://'), `not https: ${href}`);
    if (/target="_blank"/.test(tag)) assert.match(tag, /rel="noopener/, `missing rel=noopener: ${href}`);
  }
});

test('LeetCode figures are consistent (easy + medium + hard = total)', () => {
  const total = +markup.match(/data-count="(\d+)"/)[1];
  const label = markup.match(/aria-label="Elevation profile of (\d+) solved[^"]*?(\d+) easy, (\d+) medium and (\d+) hard/);
  assert.ok(label, 'terrain aria-label not found');
  const [, labelTotal, e, m, h] = label.map(Number);
  assert.equal(e + m + h, total);
  assert.equal(labelTotal, total);
  const tags = ['easy', 'medium', 'hard'].map((k) => +markup.match(new RegExp(`t-${k}[^>]*><b>[^<]*</b> · (\\d+)`))[1]);
  assert.deepEqual(tags, [e, m, h]);
  assert.ok(js.includes(`cum = [0, ${e}, ${e + m}, ${total}]`), 'main.js terrain bands out of sync with HTML counts');
});
