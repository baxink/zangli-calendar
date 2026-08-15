'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateYear } = require('../scripts/generate');

test('2026 全年 365 条，每天有理发，UID 固定', () => {
  const result = generateYear(2026, { now: new Date('2026-08-15T00:00:00Z') });
  assert.equal(result.events.length, 365);
  assert.equal(result.status.event_count, 365);

  for (const event of result.events) {
    assert.ok(event.description.includes('理发：'));
    assert.match(event.uid, /^zangli-\d{8}@zangli-calendar$/);
    assert.equal(event.dtend.length, 8);
    assert.ok(Number(event.dtend) > Number(event.dtstart));
  }
});

test('生成文本含 VCALENDAR 边界', () => {
  const result = generateYear(2026, { now: new Date('2026-08-15T00:00:00Z') });
  assert.ok(result.ics.includes('BEGIN:VCALENDAR'));
  assert.ok(result.ics.includes('END:VCALENDAR'));
});

test('闰年天数与条数一致', () => {
  const result = generateYear(2028, { now: new Date('2026-08-15T00:00:00Z') });
  assert.equal(result.events.length, 366);
});

test('1951 无法整年生成（起算日之前）', () => {
  assert.throws(() => generateYear(1951, { now: new Date('2026-01-01T00:00:00Z') }));
});

test('2050 仍可整年生成', () => {
  const result = generateYear(2050, { now: new Date('2026-01-01T00:00:00Z') });
  assert.equal(result.events.length, 365);
});

test('2051 超出整年可转换区间', () => {
  assert.throws(() => generateYear(2051, { now: new Date('2026-01-01T00:00:00Z') }));
});
