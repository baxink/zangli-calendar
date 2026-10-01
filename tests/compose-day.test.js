'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { composeDay } = require('../scripts/compose-day');

function date(s) {
  return new Date(s + 'T00:00:00+08:00');
}

function next(s) {
  return new Date(date(s).getTime() + 86400000);
}

function compose(s) {
  return composeDay(date(s), next(s));
}

test('2026-08-16 普通日', () => {
  const r = compose('2026-08-16');
  assert.equal(r.title, '藏历火马年7月初四');
  assert.ok(r.description.includes('理发：得权势增容颜'));
  assert.ok(!r.description.includes('八吉'));
  assert.ok(!r.description.includes('莲师'));
  assert.ok(!r.description.includes('功德'));
});

test('2026-08-21 八吉同聚', () => {
  assert.ok(compose('2026-08-21').title.includes('八吉同聚'));
});

test('2026-08-22 莲师日，无功德倍增', () => {
  const r = compose('2026-08-22');
  assert.ok(r.title.includes('莲师日'));
  assert.ok(!r.title.includes('功德倍增'));
  assert.ok(r.description.includes('海生金刚'));
});

test('2026-02-26 莲师日＋功德倍增', () => {
  const r = compose('2026-02-26');
  assert.ok(r.title.includes('莲师日'));
  assert.ok(r.title.includes('功德倍增'));
  assert.ok(r.description.includes('神变月100倍×莲花生大师10万倍'));
});

test('2026-08-13 日全食（北京时间）', () => {
  const r = compose('2026-08-13');
  assert.ok(r.title.includes('日全食'));
  assert.ok(!r.title.includes('等持如来日'));
  assert.ok(!r.title.includes('功德倍增'));
  assert.ok(r.description.includes('食甚1点47分'));
  assert.ok(r.description.includes('日食月食日行持善法功德呈十亿倍增上'));
});

test('2026-03-03 月全食，保留食甚', () => {
  const r = compose('2026-03-03');
  assert.ok(r.title.includes('月全食'));
  assert.ok(r.description.includes('初亏17点49分，复圆21点17分，食甚19点34分'));
  assert.ok(r.title.includes('神变节'));
  assert.ok(r.description.includes('四大节日及日食月食日'));
});

test('2026-08-27 闰日', () => {
  const r = compose('2026-08-27');
  assert.ok(r.title.includes('闰日'));
  assert.ok(r.description.includes('守戒取第一天'));
  assert.ok(!r.title.includes('功德'));
  assert.ok(!r.title.includes('八吉'));
  assert.ok(!r.title.includes('莲师日'));
  assert.ok(!r.title.includes('等持如来日'));
});

test('2026-09-01 缺二十预告在前一天', () => {
  const r = compose('2026-09-01');
  assert.ok(r.description.includes('本日之后缺二十，守戒可提前于本日'));
  assert.ok(!r.title.includes('缺'));
});

test('2026-09-02 八吉，dayMiss 当天不写缺日预告', () => {
  const r = compose('2026-09-02');
  assert.ok(r.title.includes('八吉同聚'));
  assert.ok(!r.title.includes('地藏菩萨日'));
  assert.ok(!r.description.includes('本日之后缺'));
});

test('2026-09-10 九凶同聚', () => {
  assert.ok(compose('2026-09-10').title.includes('九凶同聚'));
});

test('2026 正月初一神变节开始，十五为当天，整月为神变月', () => {
  const r = compose('2026-02-18');
  assert.ok(r.title.split('　').includes('神变节开始'));
  assert.ok(!r.title.split('　').includes('神变节'));
  assert.ok(r.description.includes('神变月（藏历正月全月'));
  assert.ok(compose('2026-03-03').title.split('　').includes('神变节'));
  assert.ok(!compose('2026-03-03').title.includes('神变节开始'));
  assert.ok(compose('2026-03-18').description.includes('神变月（藏历正月全月'));
  assert.ok(!compose('2026-03-19').description.includes('神变月（藏历正月全月'));
  assert.ok(r.title.includes('功德倍增'));
  assert.ok(r.title.includes('等持如来日'));
  assert.ok(!r.description.includes('四大节日'));
  assert.ok(r.description.includes('神变月100倍×等持如来100倍'));
});

test('2026-07-18 初转法轮日，无功德倍增', () => {
  const r = compose('2026-07-18');
  assert.ok(r.title.includes('释迦牟尼佛初转法轮日'));
  assert.ok(!r.title.includes('功德倍增'));
  assert.ok(r.description.includes('四大节日行持善法功德呈十亿倍增上'));
});

test('2026-05-31 成道日涅槃日＋功德倍增', () => {
  const r = compose('2026-05-31');
  assert.ok(r.title.includes('释迦牟尼佛成道日涅槃日'));
  assert.ok(r.title.includes('功德倍增'));
  assert.ok(r.description.includes('四大节日行持善法功德呈十亿倍增上'));
  assert.ok(r.description.includes('遍见月1000亿倍×阿弥陀佛1000万倍'));
});

test('2026-11-01 九月廿二为天降日，二十不再误标', () => {
  const r = compose('2026-11-01');
  assert.ok(r.title.includes('释迦牟尼佛天降日'));
  assert.ok(r.description.includes('四大节日行持善法功德呈十亿倍增上'));
  assert.ok(!r.description.includes('功德倍增'));
  assert.ok(!compose('2026-10-30').title.includes('天降日'));
});

test('2027 闰二月后，成道日与初转法轮日按本表标准化月日标记', () => {
  assert.ok(compose('2027-06-18').title.includes('释迦牟尼佛成道日涅槃日'));
  assert.ok(!compose('2027-05-20').title.includes('成道日涅槃日'));
  assert.ok(compose('2027-08-06').title.includes('释迦牟尼佛初转法轮日'));
  assert.ok(!compose('2027-07-07').title.includes('初转法轮日'));
});

test('2027-09-30 跨月缺初一时，预告写在前一天', () => {
  assert.ok(compose('2027-09-30').description.includes('本日之后缺初一，守戒可提前于本日'));
  assert.ok(!compose('2027-10-01').description.includes('缺初一'));
});

test('2028 正月十五缺日，仅提前预告神变节，不另造十五事件', () => {
  const r = compose('2028-03-10');
  assert.ok(r.title.includes('1月十四'));
  assert.ok(r.description.includes('本日之后缺十五'));
  assert.ok(r.description.includes('缺日节日预告：神变节'));
  assert.ok(!r.description.includes('四大节日行持善法'));
  assert.ok(!compose('2028-03-11').title.includes('神变节'));
});

test('2027 三次半影月食不再误写成月偏食，UTC 跨日仍归北京时间', () => {
  for (const s of ['2027-02-21', '2027-07-19', '2027-08-17']) {
    assert.ok(compose(s).title.includes('半影月食'), s);
    assert.ok(!compose(s).title.includes('月偏食'), s);
  }
  assert.ok(!compose('2027-02-20').title.includes('半影月食'));
});

test('2026-12-23 缺十五预告', () => {
  const r = compose('2026-12-23');
  assert.ok(r.description.includes('本日之后缺十五，守戒可提前于本日'));
});

test('时区：2026-02-17 命中日环食', () => {
  const r = compose('2026-02-17');
  assert.ok(r.title.includes('日环食'));
  assert.ok(r.description.includes('食甚20点13分'));
});

test('月末缺日：缺三十（1995-12-21 廿九）', () => {
  const r = compose('1995-12-21');
  assert.ok(r.title.includes('藏历木猪年10月廿九'));
  assert.ok(r.description.includes('本日之后缺三十，守戒可提前于本日'));
});
