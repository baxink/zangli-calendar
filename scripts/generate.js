#!/usr/bin/env node
'use strict';

process.env.TZ = 'Asia/Shanghai';

const fs = require('fs');
const path = require('path');
const { composeDay } = require('./compose-day');
const { buildIcs } = require('./build-ics');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 部署后的 Pages 地址。CI 里会自动从 GITHUB_REPOSITORY 取 owner；
// 本地生成时可用环境变量 PAGES_OWNER 指定，或直接改下面的默认值。
const LOCAL_PAGES_OWNER = process.env.PAGES_OWNER || 'baxink';

function pagesOwner() {
  if (process.env.GITHUB_REPOSITORY) {
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    if (owner) {
      return owner;
    }
  }
  return LOCAL_PAGES_OWNER;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function daysInYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

// 构造北京时间当天 00:00 对应的 Date（与 TZ=Asia/Shanghai 配合使用）。
function makeDate(year, month0, day) {
  return new Date(Date.UTC(year, month0, day) - 8 * 60 * 60 * 1000);
}

function nextYmd(year, month0, day) {
  const next = new Date(Date.UTC(year, month0, day + 1));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function parseYear(argv) {
  let year = new Date().getFullYear();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--year') {
      const raw = argv[i + 1];
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isInteger(parsed) || String(parsed) !== String(raw)) {
        throw new Error(`--year 必须是整数，收到: ${raw}`);
      }
      year = parsed;
    }
  }
  if (year < 1952 || year > 2050) {
    throw new Error(
      `--year 必须在 1952–2050 之间（zangli.js 整年可转换区间；` +
        `1951 年 1 月 1–7 日在起算日 1951-01-08 之前）`
    );
  }
  return year;
}

function generateYear(year, options = {}) {
  const now = options.now || new Date();
  const dtstamp = utcStamp(now);
  const expected = daysInYear(year);
  const events = [];

  for (let month0 = 0; month0 < 12; month0++) {
    const dim = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    for (let day = 1; day <= dim; day++) {
      const date = makeDate(year, month0, day);
      const nextDate = makeDate(year, month0, day + 1);
      const { title, description } = composeDay(date, nextDate);
      const ymd = `${year}${pad(month0 + 1)}${pad(day)}`;
      events.push({
        uid: `zangli-${ymd}@zangli-calendar`,
        dtstart: ymd,
        dtend: nextYmd(year, month0, day),
        summary: title,
        description
      });
    }
  }

  if (events.length !== expected) {
    throw new Error(`VEVENT 条数 ${events.length} 不等于 ${year} 年天数 ${expected}`);
  }

  const ics = buildIcs(events, dtstamp);
  if (!ics.includes('BEGIN:VCALENDAR') || !ics.includes('END:VCALENDAR')) {
    throw new Error('生成文本缺少 BEGIN:VCALENDAR / END:VCALENDAR');
  }

  const owner = pagesOwner();
  const base = `https://${owner}.github.io/zangli-calendar`;
  const status = {
    year,
    event_count: events.length,
    generated_at: now.toISOString(),
    calendar_url: `${base}/zangli.ics`,
    archive_url: `${base}/zangli-${year}.ics`
  };

  return { year, dtstamp, events, ics, status };
}

function writeOutput(result) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const year = result.year;
  const ics = result.ics;

  fs.writeFileSync(path.join(PUBLIC_DIR, `zangli-${year}.ics`), ics);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'zangli.ics'), ics);
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'status.json'),
    JSON.stringify(result.status, null, 2) + '\n'
  );
}

function main() {
  const year = parseYear(process.argv.slice(2));
  const result = generateYear(year);
  writeOutput(result);
  process.stdout.write(
    `已生成 ${result.year} 年日历：${result.events.length} 条事件\n` +
      `  public/zangli.ics\n` +
      `  public/zangli-${result.year}.ics\n` +
      `  public/status.json\n`
  );
}

module.exports = {
  generateYear,
  makeDate,
  parseYear,
  daysInYear
};

if (require.main === module) {
  main();
}
