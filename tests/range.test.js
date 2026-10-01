'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generateRange, parseGenerationArgs, writeOutput } = require('../scripts/generate');
const now = new Date('2026-10-01T00:00:00Z');
const result = generateRange(2026, 2030, { now });

test('2026–2030 合并为 1826 条连续全天事件，UID 不变且跨年 DTEND 正确', () => {
  assert.deepEqual(result.calendars.map(c => c.events.length), [365, 365, 366, 365, 365]);
  assert.equal(result.events.length, 1826);
  const uids = new Set();
  let date = new Date('2026-01-01T00:00:00Z');
  const ymd = d => d.toISOString().slice(0, 10).replaceAll('-', '');
  for (const event of result.events) {
    assert.equal(event.dtstart, ymd(date));
    date = new Date(+date + 86400000);
    assert.equal(event.dtend, ymd(date));
    assert.equal(event.uid, 'zangli-' + event.dtstart + '@zangli-calendar');
    assert.ok(!uids.has(event.uid));
    uids.add(event.uid);
  }
  assert.equal(ymd(date), '20310101');
  assert.equal(result.status.start_year, 2026);
  assert.equal(result.status.end_year, 2030);
  assert.equal(result.status.event_count, 1826);
});

test('实际写出的稳定订阅保留五年，每份年度文件与合并订阅的该年事件一致', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zangli-range-test-'));
  try {
    writeOutput(result, directory);
    const stable = fs.readFileSync(path.join(directory, 'zangli.ics'), 'utf8');
    assert.equal(stable, result.ics);
    assert.equal((stable.match(/BEGIN:VEVENT/g) || []).length, 1826);
    for (const calendar of result.calendars) {
      assert.equal(fs.readFileSync(path.join(directory, 'zangli-' + calendar.year + '.ics'), 'utf8'), calendar.ics);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'status.json'))), result.status);
    assert.ok(!fs.readdirSync(directory).some(name => name.endsWith('.tmp')));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('默认包含至 2030，2030 年时预先覆盖 2031，拒绝错误年份区间', () => {
  assert.deepEqual(parseGenerationArgs([], now), { fromYear: 2026, toYear: 2030 });
  assert.deepEqual(parseGenerationArgs([], new Date('2030-01-01T00:00:00Z')), { fromYear: 2026, toYear: 2031 });
  assert.deepEqual(parseGenerationArgs(['--year', '2028']), { fromYear: 2028, toYear: 2028 });
  assert.deepEqual(parseGenerationArgs(['--from-year', '2026', '--to-year', '2030']), { fromYear: 2026, toYear: 2030 });
  for (const args of [
    ['--year'], ['--year', '2026x'], ['--to-year', '2051'], ['--from-year', '2030', '--to-year', '2026'],
    ['--year', '2026', '--to-year', '2030'], ['--unknown', '2026'], ['--year', '2026', '--year', '2027']
  ]) assert.throws(() => parseGenerationArgs(args));
  assert.throws(() => generateRange(2030, 2026));
  assert.throws(() => generateRange(1951, 2030));
});
