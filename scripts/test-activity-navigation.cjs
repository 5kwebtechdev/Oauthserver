// Run focused navigation regressions without bootstrapping unrelated Ionic views.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const root = 'src/app/core/components/activity-section/';
function method(file, name, globals = {}) {
  const source = ts.createSourceFile(file, fs.readFileSync(root + file, 'utf8'), ts.ScriptTarget.Latest, true);
  let found;
  function visit(node) {
    if ((ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node)) && node.name.getText(source) === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, name);
  const parameters = found.parameters.map(p => p.getText(source)).join(',');
  const code = ts.transpile(`function run(${parameters}) ${found.body.getText(source)}`);
  return new Function(...Object.keys(globals), code + '; return run;')(...Object.values(globals));
}
const card = method('activity-card/activity-card.component.ts', 'openActivityDetail');
for (const type of ['tasks', 'task', 'TASK']) {
  let call;
  card.call({habit: {id: 431, type}, selectedDate: '2026-09-21', router: {navigate: (...args) => {
    call = args; return Promise.resolve(true);
  }}}, false);
  assert.deepEqual(call[0], ['/activity-detail', 431]);
  assert.deepEqual(call[1].queryParams, {type: 'tasks', date: '2026-09-21'});
}
const compact = method('activity-page-content/activity-page-content.component.ts', 'openActivityDetail');
let call;
compact.call({getSelectedDateString: () => '2026-09-21', router: {navigate: (...args) => {
  call = args; return Promise.resolve(true);
}}}, {id: 431, status: 'completed'}, 'task', false);
assert.deepEqual(call[0], ['/activity-detail', 431]);
assert.equal(call[1].queryParams.type, 'tasks');
class KeyboardEvent {}
const click = method('activity-card/activity-card.component.ts', 'openCardContent', {KeyboardEvent});
const wrapper = {};
let opened = 0;
const context = {habit: {id: 431, type: 'tasks'}, swipeOffset: 0,
  openActivityDetail: () => opened++};
click.call(context, {target: {closest: () => wrapper}, currentTarget: wrapper});
assert.equal(opened, 1, 'Clicking card content opens details');
click.call(context, {target: {closest: () => ({tagName: 'BUTTON'})}, currentTarget: wrapper});
assert.equal(opened, 1, 'Nested CTA does not also open details');
const detail = method('activity-detail/activity-detail.component.ts', 'loadActivityFromRoute', {
  history: {state: {habit: {id: 123, type: 'habits'}}}
});
let loaded;
detail.call({route: {snapshot: {
  paramMap: {get: () => '431'}, queryParamMap: {get: () => 'TASK'}
}}, selectedDateFromState: '2026-09-21', loadDetail: (...args) => loaded = args});
assert.deepEqual(loaded, [431, 'tasks', '2026-09-21']);
console.log('PASS: expanded/compact task routing, task type normalization, URL identity over stale state');
const now = 1_000_000;
const expanded = method('activity-card/activity-card.component.ts', 'isCardExpanded', {Date: {now: () => now}});
const activity = {autoExpand: true, habit: {}, getStatus: () => 'pending', startTime: now + 300_000, endTime: now + 600_000};
assert.equal(expanded.call(activity), true, 'Opens five minutes before start');
assert.equal(expanded.call({...activity, startTime: now + 300_001}), false, 'Future cards stay compact');
assert.equal(expanded.call({...activity, getStatus: () => 'completed'}), false);
assert.equal(expanded.call({...activity, habit: {expired: true}}), false);
assert.equal(expanded.call({...activity, startTime: now - 600_000, endTime: now - 1}), false);
assert.equal(expanded.call({...activity, autoExpand: false, expanded: true}), true, 'Preserves calendar expansion');
console.log('PASS: scheduled expansion boundaries, completed/expired cards and calendar behavior');
const syncCategory = method('activity-input/activity-input.component.ts', 'syncSelectedTagsToComponent');
for (const selected of [{key: '3', value: ''}, {key: 'Skill', value: 'Skill'}]) {
  let emitted;
  const form = {selectedTags: [selected], tagOptions: [{key: 3, value: 'Skill'}],
    tagsComponent: {selectedKeysChange: {emit: keys => emitted = keys}}, cd: {detectChanges() {}}};
  syncCategory.call(form);
  assert.deepEqual(emitted, [3]);
  assert.equal(form.selectedTags[0].value, 'Skill');
}
console.log('PASS: category preselection resolves saved IDs and names to option keys');
const doneVisible = method('habit-button-logic.service.ts', 'isDoneVisible');
for (const status of ['SKIPPED', 'skipped', 'COMPLETED']) {
  assert.equal(doneVisible.call({}, {status}), false, `${status} must not show Done`);
}
console.log('PASS: terminal activity states never show the Done action');
