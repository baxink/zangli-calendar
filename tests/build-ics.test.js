'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIcs, escapeText, foldLine } = require('../scripts/build-ics');

test('escapeText 转义换行与特殊字符', () => {
  assert.equal(escapeText('a\nb;c,d\\e'), 'a\\nb\\;c\\,d\\\\e');
});

test('foldLine 按字节折叠且不拆坏多字节字符', () => {
  const folded = foldLine('DESCRIPTION:' + '藏'.repeat(100));
  const lines = folded.split('\r\n');
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  }
  assert.equal(lines[0].slice(0, 'DESCRIPTION:'.length), 'DESCRIPTION:');
  assert.ok(lines.slice(1).every((line) => line.startsWith(' ')));
});

test('buildIcs 生成日历头尾与事件字段', () => {
  const events = [
    {
      uid: 'zangli-20260816@zangli-calendar',
      dtstart: '20260816',
      dtend: '20260817',
      summary: '藏历火马年7月初四',
      description: '理发：得权势增容颜'
    }
  ];
  const ics = buildIcs(events, '20260815T000000Z');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('END:VCALENDAR'));
  assert.ok(ics.includes('UID:zangli-20260816@zangli-calendar'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260816'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20260817'));
  assert.ok(ics.includes('TRANSP:TRANSPARENT'));
  assert.ok(ics.includes('X-WR-TIMEZONE:Asia/Shanghai'));
});
