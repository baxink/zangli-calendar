#!/usr/bin/env node
'use strict';

// 独立读取实际 ICS 文件，不调用 composeDay / generateYear 重算作为期望值。
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const directory = path.join(__dirname, '..', 'public');
const status = JSON.parse(fs.readFileSync(path.join(directory, 'status.json'), 'utf8'));
const from = status.start_year;
const to = status.end_year;
assert.ok(Number.isInteger(from) && Number.isInteger(to) && from <= to);

function parseIcs(filename) {
  const raw = fs.readFileSync(path.join(directory, filename), 'utf8');
  const remainder = raw.replaceAll('\r\n', '');
  assert.ok(!/[\r\n]/.test(remainder), filename + ': 必须使用 CRLF');
  for (const line of raw.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, filename + ': 行超过 75 字节');
  }
  const unfolded = raw.replace(/\r\n[ \t]/g, '');
  assert.ok(unfolded.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(unfolded.endsWith('END:VCALENDAR\r\n'));
  assert.equal((unfolded.match(/BEGIN:VCALENDAR/g) || []).length, 1);
  assert.equal((unfolded.match(/END:VCALENDAR/g) || []).length, 1);
  const blocks = [...unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g)];
  assert.equal(blocks.length, (unfolded.match(/BEGIN:VEVENT/g) || []).length);
  assert.equal(blocks.length, (unfolded.match(/END:VEVENT/g) || []).length);
  return blocks.map(([, block]) => {
    const fields = {};
    for (const line of block.trim().split('\r\n')) {
      const colon = line.indexOf(':');
      assert.ok(colon > 0);
      const key = line.slice(0, colon);
      assert.ok(!(key in fields), '重复字段: ' + key);
      fields[key] = line.slice(colon + 1);
    }
    assert.match(fields.DTSTAMP, /^\d{8}T\d{6}Z$/);
    assert.equal(fields.TRANSP, 'TRANSPARENT');
    assert.ok(fields.SUMMARY.startsWith('藏历'));
    assert.ok(fields.DESCRIPTION.includes('理发：'));
    return { fields, block };
  });
}

const ymd = date => date.toISOString().slice(0, 10).replaceAll('-', '');
const stable = parseIcs('zangli.ics');
const byDate = new Map();
const uids = new Set();
let cursor = new Date(Date.UTC(from, 0, 1));
for (const event of stable) {
  const start = event.fields['DTSTART;VALUE=DATE'];
  assert.equal(start, ymd(cursor), '日期不连续');
  cursor = new Date(+cursor + 86400000);
  assert.equal(event.fields['DTEND;VALUE=DATE'], ymd(cursor));
  assert.equal(event.fields.UID, 'zangli-' + start + '@zangli-calendar');
  assert.ok(!uids.has(event.fields.UID), 'UID 重复');
  uids.add(event.fields.UID);
  byDate.set(start, event.fields);
}
assert.equal(ymd(cursor), String(to + 1) + '0101');
assert.equal(stable.length, status.event_count);
assert.equal(status.coverage_start, from + '-01-01');
assert.equal(status.coverage_end, to + '-12-31');
assert.equal(status.archives.length, to - from + 1);
const yearly = [];
for (let year = from; year <= to; year++) {
  const archive = parseIcs('zangli-' + year + '.ics');
  const subset = stable.filter(e => e.fields['DTSTART;VALUE=DATE'].startsWith(String(year)));
  assert.deepEqual(archive, subset, year + ': 年度文件与合并订阅不同');
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
  assert.equal(archive.length, days);
  assert.equal(status.archives[year - from].year, year);
  assert.equal(status.archives[year - from].event_count, days);
  yearly.push({ year, events: days });
}

// 已核查的日期边界，2027–2030 为当前转换表下的月日对照，非外部历本认证。
const festivals = [
  ['神变节', ['20260303', '20270220', '20290228', '20300319']],
  ['释迦牟尼佛成道日涅槃日', ['20260531', '20270618', '20280607', '20290527', '20300615']],
  ['释迦牟尼佛初转法轮日', ['20260718', '20270806', '20280725', '20290715', '20300803']],
  ['释迦牟尼佛天降日', ['20261101', '20271120', '20281109', '20291029', '20301117']]
];
for (const [name, dates] of festivals) {
  const expected = dates.filter(date => byDate.has(date));
  // 将完整短词匹配，避免把“节日预告”误计为实际节日。
  const actual = stable.filter(e => e.fields.SUMMARY.split('　').includes(name))
    .map(e => e.fields['DTSTART;VALUE=DATE']).filter(date => date >= '20260101' && date <= '20301231');
  assert.deepEqual(actual, expected, name + ': 日期有遗漏、重复或误标');
}
// 起始日与当天分开核对，正月十五后的日期仍属于神变月。
for (const date of ['20260218', '20270207', '20280226', '20290214', '20300305']) {
  if (!byDate.has(date)) continue;
  const event = byDate.get(date);
  assert.ok(event.SUMMARY.split('　').includes('神变节开始'));
  assert.ok(!event.SUMMARY.split('　').includes('神变节'));
}
for (const event of stable) {
  const regularFirstMonth = /^藏历.+?年1月/.test(event.fields.SUMMARY);
  assert.equal(event.fields.DESCRIPTION.includes('神变月（藏历正月全月'), regularFirstMonth);
}
if (byDate.has('20270930')) assert.ok(byDate.get('20270930').DESCRIPTION.includes('缺初一'));
if (byDate.has('20280310')) {
  assert.ok(byDate.get('20280310').DESCRIPTION.includes('缺日节日预告：神变节'));
  assert.ok(!byDate.get('20280311').SUMMARY.includes('神变节'));
}

// NASA 日/月食目录的类型与食甚日期，转换为北京时间；不校验分钟级预测差异。
const eclipses = [
  ['20260217', '日环食'], ['20260303', '月全食'], ['20260813', '日全食'], ['20260828', '月偏食'],
  ['20270207', '日环食'], ['20270221', '半影月食'], ['20270719', '半影月食'], ['20270802', '日全食'], ['20270817', '半影月食'],
  ['20280112', '月偏食'], ['20280126', '日环食'], ['20280707', '月偏食'], ['20280722', '日全食'],
  ['20290101', '月全食'], ['20290115', '日偏食'], ['20290612', '日偏食'], ['20290626', '月全食'], ['20290711', '日偏食'], ['20291205', '日偏食'], ['20291221', '月全食'],
  ['20300601', '日环食'], ['20300616', '月偏食'], ['20301125', '日全食'], ['20301210', '半影月食']
];
const actualEclipses = stable.filter(e => /日[全偏环]食|月[全偏]食|半影月食/.test(e.fields.SUMMARY))
  .filter(e => e.fields['DTSTART;VALUE=DATE'] >= '20260101' && e.fields['DTSTART;VALUE=DATE'] <= '20301231')
  .map(e => [e.fields['DTSTART;VALUE=DATE'], /日[全偏环]食|月[全偏]食|半影月食/.exec(e.fields.SUMMARY)[0]]);
assert.deepEqual(actualEclipses, eclipses.filter(([date]) => byDate.has(date)), '交食类型或北京时间日期不符');
process.stdout.write(JSON.stringify({ result: 'PASS', from, to, events: stable.length, yearly, eclipses_checked: actualEclipses.length }, null, 2) + '\n');
