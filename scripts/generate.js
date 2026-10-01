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
  validateYear(year);
  return year;
}

function validateYear(year) {
  if (!Number.isInteger(year) || year < 1952 || year > 2050) {
    throw new Error(
      `--year 必须在 1952–2050 之间（zangli.js 整年可转换区间；` +
        `1951 年 1 月 1–7 日在起算日 1951-01-08 之前）`
    );
  }
}

// --year 仍支持单年；默认与 CI 都生成从 2026 开始的多年份订阅。
function parseGenerationArgs(argv, now = new Date()) {
  const values = new Map();
  const allowed = new Set(['--year', '--from-year', '--to-year']);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const raw = argv[i + 1];
    if (!allowed.has(key) || values.has(key)) throw new Error('未知或重复参数: ' + key);
    const year = Number(raw);
    if (!Number.isInteger(year) || String(year) !== raw) throw new Error(key + ' 必须是整数');
    validateYear(year);
    values.set(key, year);
  }
  if (values.has('--year')) {
    if (values.size !== 1) throw new Error('--year 不能与年份区间混用');
    return { fromYear: values.get('--year'), toYear: values.get('--year') };
  }
  const fromYear = values.get('--from-year') ?? 2026;
  const toYear = values.get('--to-year') ?? Math.min(2050, Math.max(2030, now.getFullYear() + 1));
  validateYear(fromYear);
  validateYear(toYear);
  if (fromYear > toYear) throw new Error('起始年份不能晚于结束年份');
  return { fromYear, toYear };
}

function generateYear(year, options = {}) {
  validateYear(year);
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

function generateRange(fromYear, toYear, options = {}) {
  validateYear(fromYear);
  validateYear(toYear);
  if (fromYear > toYear) throw new Error('起始年份不能晚于结束年份');
  const now = options.now || new Date();
  const calendars = [];
  for (let year = fromYear; year <= toYear; year++) {
    calendars.push(generateYear(year, { now }));
  }
  const events = calendars.flatMap(calendar => calendar.events);
  const dtstamp = utcStamp(now);
  const status = {
    ...calendars[0].status,
    start_year: fromYear,
    end_year: toYear,
    coverage_start: fromYear + '-01-01',
    coverage_end: toYear + '-12-31',
    event_count: events.length,
    archives: calendars.map(calendar => ({
      year: calendar.year,
      event_count: calendar.events.length,
      url: calendar.status.archive_url
    }))
  };
  return { fromYear, toYear, dtstamp, calendars, events, ics: buildIcs(events, dtstamp), status };
}

function writeOutput(result, directory = PUBLIC_DIR) {
  fs.mkdirSync(directory, { recursive: true });
  // 所有年份先在内存生成成功，再更新产物；稳定地址一次写入完整区间。
  const files = result.calendars.map(calendar => [
    'zangli-' + calendar.year + '.ics', calendar.ics
  ]);
  files.push(['zangli.ics', result.ics], ['status.json', JSON.stringify(result.status, null, 2) + '\n']);
  for (const [name, contents] of files) {
    const destination = path.join(directory, name);
    const temporary = destination + '.' + process.pid + '.tmp';
    fs.writeFileSync(temporary, contents);
    fs.renameSync(temporary, destination);
  }
}

function main() {
  const { fromYear, toYear } = parseGenerationArgs(process.argv.slice(2));
  const result = generateRange(fromYear, toYear);
  writeOutput(result);
  process.stdout.write(
    `已生成 ${fromYear}–${toYear} 年日历：${result.events.length} 条事件\n` +
      `  public/zangli.ics\n` +
      '  public/zangli-YYYY.ics（逐年存档）\n' +
      `  public/status.json\n`
  );
}

module.exports = {
  generateYear,
  generateRange,
  parseGenerationArgs,
  writeOutput,
  makeDate,
  parseYear,
  daysInYear
};

if (require.main === module) {
  main();
}
