import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/components/attendance/MagneticTimeWheel.tsx', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture(values = Array.from({ length: 60 }, (_, index) => index), value = 20) {
  const changes = [];
  const effects = [];
  const refs = [];
  let cursor = 0;
  let resize;
  const element = { clientHeight: 200, scrollTop: 0, scrollTo({ top }) { this.scrollTop = top; } };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() {} },
    require: name => {
      if (name === 'react') return {
        useRef: initial => {
          const index = cursor++;
          return refs[index] ??= { current: index === 0 ? element : initial };
        },
        useLayoutEffect: callback => effects.push(callback),
        useEffect: callback => effects.push(callback),
      };
      if (name.endsWith('.css')) return { default: {} };
      return require(name);
    },
  });
  function render(nextValue = value, nextValues = values) {
    cursor = 0;
    effects.length = 0;
    const tree = exports.MagneticTimeWheel({ title: 'دقیقه', count: 60, values: nextValues, value: nextValue, onChange: next => changes.push(next) });
    effects.forEach(effect => effect());
    return tree.props.children[1].props.children[1].props;
  }
  return { changes, element, render, resize: () => resize() };
}

const fixtureWheel = fixture();
let spin = fixtureWheel.render();
assert.equal(fixtureWheel.element.scrollTop, 800);
fixtureWheel.element.scrollTop = 929;
spin.onScroll({ currentTarget: fixtureWheel.element });
assert.equal(fixtureWheel.changes.at(-1), 23);
spin = fixtureWheel.render(23);
assert.equal(fixtureWheel.element.scrollTop, 929, 'parent updates must not interrupt native scrolling');
spin.onKeyDown({ key: 'ArrowDown', preventDefault() {} });
assert.equal(fixtureWheel.element.scrollTop, 960);
assert.equal(fixtureWheel.changes.at(-1), 24);
spin = fixtureWheel.render(47, [45, 46, 47, 48, 49]);
assert.equal(fixtureWheel.element.scrollTop, 80);
fixtureWheel.element.scrollTop = 1000;
spin.onScroll({ currentTarget: fixtureWheel.element });
assert.equal(fixtureWheel.changes.at(-1), 49);
fixtureWheel.element.clientHeight = 0;
fixtureWheel.element.scrollTop = 0;
spin.onScroll({ currentTarget: fixtureWheel.element });
assert.equal(fixtureWheel.changes.at(-1), 49, 'closing a dialog must not change selection');
fixtureWheel.render(46, [45, 46, 47, 48, 49]);
fixtureWheel.element.clientHeight = 200;
fixtureWheel.resize();
assert.equal(fixtureWheel.element.scrollTop, 40, 'opening the dialog aligns the current value');
assert(!source.includes('onPointerMove'));
assert(!source.includes('wheelJumps'));
const css = fs.readFileSync('src/components/attendance/TimePicker.module.css', 'utf8');
assert(css.includes('scroll-snap-type:y mandatory'));
assert(css.includes('touch-action:pan-y pinch-zoom'));
console.log('PASS: native scroll selection, uninterrupted parent updates, keyboard, allowed bounds, hidden-dialog safety and reopen alignment.');
