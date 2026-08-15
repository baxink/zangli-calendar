'use strict';

// 生成结果依赖本地时区：zangli.js 的 getEclipse 用 toDateString()/getHours()
// 把食相映射到公历日并计算食甚时间。必须在加载 zangli.js 之前锁定北京时间。
process.env.TZ = 'Asia/Shanghai';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ZANGLI_PATH = path.join(__dirname, '..', 'vendor', 'zangli', 'zangli.js');

// ---- 纳入上游 zangli.js（浏览器脚本，经 vm 加载）----
if (!fs.existsSync(ZANGLI_PATH)) {
  throw new Error(`缺失 vendor/zangli/zangli.js：${ZANGLI_PATH}`);
}
const zangliSrc = fs.readFileSync(ZANGLI_PATH, 'utf8');
// 注：vm 仅用于隔离 zangli.js 的 `var` 全局变量、避免污染本模块命名空间，
// 它并不是安全边界（上下文仍共享默认对象原型）。zangli.js 是固定 vendored、
// 来源已审阅的 MIT 文件，不属于运行时外部输入。
const zangliSandbox = { console, Date };
vm.createContext(zangliSandbox);
vm.runInContext(zangliSrc, zangliSandbox, { filename: 'zangli.js' });

const getZangli = zangliSandbox.getZangli;
const getEclipse = zangliSandbox.getEclipse;
if (typeof getZangli !== 'function' || typeof getEclipse !== 'function') {
  throw new Error('vendor/zangli/zangli.js 加载后未得到 getZangli / getEclipse');
}

// ---- 载入规则数据并校验完整性 ----
function loadJson(name) {
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) {
    throw new Error(`缺失数据文件: ${name}`);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    throw new Error(`数据文件无法解析 ${name}: ${err.message}`);
  }
  return data;
}

const padmasambhava = loadJson('padmasambhava.json');
const meritMonths = loadJson('merit-months.json');
const meritDays = loadJson('merit-days.json');
const hair = loadJson('hair.json');
const eightAuspicious = loadJson('eight-auspicious.json');
const nineInauspicious = loadJson('nine-inauspicious.json');

function hasKeys(obj, from, to) {
  for (let i = from; i <= to; i++) {
    if (obj[String(i)] === undefined) return false;
  }
  return true;
}

function validateData() {
  if (!hasKeys(padmasambhava, 1, 12)) {
    throw new Error('padmasambhava.json 必须含 1–12 月');
  }
  if (!hasKeys(hair, 1, 30)) {
    throw new Error('hair.json 必须含 1–30 日');
  }
  if (!hasKeys(eightAuspicious, 1, 12)) {
    throw new Error('eight-auspicious.json 必须含 1–12 月');
  }
  if (!hasKeys(nineInauspicious, 1, 12)) {
    throw new Error('nine-inauspicious.json 必须含 1–12 月');
  }
  for (const m of [1, 2, 3, 4, 6, 9]) {
    if (!meritMonths[String(m)]) {
      throw new Error(`merit-months.json 缺少月份 ${m}`);
    }
  }
  for (const d of [1, 8, 10, 11, 15, 18, 21, 25, 30]) {
    if (!meritDays[String(d)]) {
      throw new Error(`merit-days.json 缺少日序 ${d}`);
    }
  }
}
validateData();

// ---- 常量 ----
const FESTIVAL_WHITELIST = [
  '神变节',
  '释迦牟尼佛诞辰',
  '释迦牟尼佛成道日涅槃日',
  '释迦牟尼佛入胎日',
  '释迦牟尼佛初转法轮日',
  '释迦牟尼佛天降日'
];

// 起源「四大节日」适用十亿倍，与上面的专名白名单不是同一集合。
const FOUR_FESTIVALS = [
  '神变节',
  '释迦牟尼佛成道日涅槃日',
  '释迦牟尼佛初转法轮日',
  '释迦牟尼佛天降日'
];

const CN_MONTH = {
  '正': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
  '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12
};

const CN_DAY = {
  '初一': 1, '初二': 2, '初三': 3, '初四': 4, '初五': 5,
  '初六': 6, '初七': 7, '初八': 8, '初九': 9, '初十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
  '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24, '廿五': 25,
  '廿六': 26, '廿七': 27, '廿八': 28, '廿九': 29, '三十': 30
};

const CN_DAY_BY_NUMBER = {
  1: '初一', 2: '初二', 3: '初三', 4: '初四', 5: '初五',
  6: '初六', 7: '初七', 8: '初八', 9: '初九', 10: '初十',
  11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
  16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十',
  21: '廿一', 22: '廿二', 23: '廿三', 24: '廿四', 25: '廿五',
  26: '廿六', 27: '廿七', 28: '廿八', 29: '廿九', 30: '三十'
};

const MULTIPLIER_CN = {
  100: '100',
  1000: '1000',
  10000: '1万',
  100000: '10万',
  1000000: '100万',
  10000000: '1000万',
  100000000: '1亿',
  900000000: '9亿',
  1000000000: '10亿',
  100000000000: '1000亿'
};

// ---- 解析辅助 ----
function parseMonth(month) {
  if (typeof month !== 'string' || !month) {
    throw new Error(`未知藏历月份: ${month}`);
  }
  const leap = month.startsWith('闰');
  const base = leap ? month.slice(1) : month;
  const num = CN_MONTH[base];
  if (!num) {
    throw new Error(`未知藏历月份: ${month}`);
  }
  return { num, leap, str: leap ? '闰' + num : String(num) };
}

function dayToNumber(day) {
  if (typeof day !== 'string' || !day) {
    throw new Error(`未知藏历日序: ${day}`);
  }
  const base = day.startsWith('闰') ? day.slice(1) : day;
  const num = CN_DAY[base];
  if (!num) {
    throw new Error(`未知藏历日序: ${day}`);
  }
  return num;
}

function dayNumberToCn(n) {
  const s = CN_DAY_BY_NUMBER[n];
  if (!s) {
    throw new Error(`未知藏历日序号: ${n}`);
  }
  return s;
}

function multiplierCn(n) {
  const s = MULTIPLIER_CN[n];
  if (!s) {
    throw new Error(`未知倍数: ${n}`);
  }
  return s;
}

// ---- 短词（标题第 4、5 项）----
function shortWord(dayNum, monthNum) {
  if (dayNum === 10) {
    return '莲师日';
  }
  const md = meritDays[String(dayNum)];
  if (!md) {
    return null;
  }
  const inMeritMonth = Boolean(meritMonths[String(monthNum)]);
  if (md.scope === 'monthly' || (md.scope === 'merit-months' && inMeritMonth)) {
    return md.short;
  }
  return null;
}

// ---- 缺日预告（标题不放，写在备注第 2 段）----
function missingDayNotice(z, nextDate) {
  if (!nextDate) {
    return null;
  }
  const next = getZangli(nextDate);
  if (!next || next === 'error' || (next && next.value === 'error')) {
    return null;
  }
  if (!next.year || !next.month || !next.day) {
    return null;
  }
  const today = dayToNumber(z.day);
  const tomorrow = dayToNumber(next.day);
  const sameMonth = z.year === next.year && z.month === next.month;

  // 月中缺日：相邻两天同属一个藏历年、月，且日序跳号。
  if (sameMonth && tomorrow >= today + 2) {
    return `本日之后缺${dayNumberToCn(today + 1)}，守戒可提前于本日`;
  }

  // 月末缺日：本月最后一天为廿九（或闰廿九），次日进下月 → 缺「三十」。
  // zangli.js 数据里负号表示缺日，月份止于廿九即表示三十被缺掉。
  if (!sameMonth && today === 29) {
    return `本日之后缺${dayNumberToCn(30)}，守戒可提前于本日`;
  }

  return null;
}

// ---- 组装标题 ----
function composeTitle(z, monthStr, monthNum, dayNum, eclipse, info) {
  const parts = [];

  if (z.dayLeap) {
    parts.push('闰日');
  }
  if (eclipse.value) {
    parts.push(eclipse.value);
  }

  if (!z.dayLeap) {
    if (FESTIVAL_WHITELIST.includes(info)) {
      parts.push(info);
    } else {
      const sw = shortWord(dayNum, monthNum);
      if (sw) {
        parts.push(sw);
      }
    }

    if (meritMonths[String(monthNum)] && meritDays[String(dayNum)]) {
      parts.push('功德倍增');
    }
    if (eightAuspicious[String(monthNum)] && eightAuspicious[String(monthNum)].includes(dayNum)) {
      parts.push('八吉同聚');
    }
    if (nineInauspicious[String(monthNum)] && nineInauspicious[String(monthNum)].includes(dayNum)) {
      parts.push('九凶同聚');
    }
  }

  const base = `藏历${z.year}年${monthStr}月${z.day}`;
  return parts.length ? base + '　' + parts.join('　') : base;
}

// ---- 组装备注 ----
function composeDescription(z, nextDate, monthNum, dayNum, eclipse, info) {
  const parts = [];

  // 1. 闰日
  if (z.dayLeap) {
    parts.push('闰日（守戒取第一天）');
  }

  // 2. 缺日预告
  const miss = missingDayNotice(z, nextDate);
  if (miss) {
    parts.push(miss);
  }

  // 3. 交食（有初亏／复圆时食甚在 extraInfo2，别漏掉）
  if (eclipse.value) {
    parts.push(
      eclipse.extraInfo2
        ? `${eclipse.value}（${eclipse.extraInfo}，${eclipse.extraInfo2}）`
        : `${eclipse.value}（${eclipse.extraInfo}）`
    );
  }

  // 4. 十亿倍（四大节日与日食月食）
  const hasEclipse = Boolean(eclipse.value);
  const isFourFestival = FOUR_FESTIVALS.includes(info);
  if (hasEclipse && isFourFestival) {
    parts.push('四大节日及日食月食日行持善法功德呈十亿倍增上');
  } else if (hasEclipse) {
    parts.push('日食月食日行持善法功德呈十亿倍增上');
  } else if (isFourFestival) {
    parts.push('四大节日行持善法功德呈十亿倍增上');
  }

  // 5. 莲师应化（仅初十且非闰日）
  if (dayNum === 10 && !z.dayLeap) {
    const deed = padmasambhava[String(monthNum)];
    if (deed) {
      parts.push('莲师应化：' + deed);
    }
  }

  // 6. 功德倍增
  const mm = meritMonths[String(monthNum)];
  const md = meritDays[String(dayNum)];
  if (!z.dayLeap && mm && md) {
    parts.push(
      `功德倍增：${mm.name}${multiplierCn(mm.multiplier)}倍×${md.name}${multiplierCn(md.multiplier)}倍`
    );
  }

  // 7. 八吉同聚
  if (!z.dayLeap && eightAuspicious[String(monthNum)] && eightAuspicious[String(monthNum)].includes(dayNum)) {
    parts.push('八吉同聚，无论从事何事都吉祥');
  }

  // 8. 九凶同聚
  if (!z.dayLeap && nineInauspicious[String(monthNum)] && nineInauspicious[String(monthNum)].includes(dayNum)) {
    parts.push('九凶同聚，无论从事何事都不吉，尤其忌讳嫁娶');
  }

  // 9. 理发（每天都有；闰日仍按该日序写）
  const hairText = hair[String(dayNum)];
  if (!hairText) {
    throw new Error(`hair.json 缺少第 ${dayNum} 日`);
  }
  parts.push('理发：' + hairText);

  return parts.join('\n');
}

// ---- 主入口：一天 -> { title, description } ----
function composeDay(date, nextDate) {
  const z = getZangli(date);
  if (!z || z === 'error' || (z && z.value === 'error') || !z.year || !z.month || !z.day) {
    throw new Error(`getZangli 无法转换该日期: ${date && date.toISOString ? date.toISOString() : date}`);
  }

  const { num: monthNum, str: monthStr } = parseMonth(z.month);
  const dayNum = dayToNumber(z.day);
  const eclipse = getEclipse(date) || { value: '', extraInfo: '', extraInfo2: '' };
  const info = (z.extraInfo || '').replace(/<br>/g, '');

  const title = composeTitle(z, monthStr, monthNum, dayNum, eclipse, info);
  const description = composeDescription(z, nextDate, monthNum, dayNum, eclipse, info);

  return { title, description };
}

module.exports = {
  composeDay,
  getZangli,
  getEclipse
};
