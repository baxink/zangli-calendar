'use strict';

const HEADER_LINES = [
  'BEGIN:VCALENDAR',
  'PRODID:-//zangli-calendar//zh-CN//CN',
  'VERSION:2.0',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:藏历',
  'X-WR-CALDESC:公历年藏历订阅。规则取自藏教日历说明与 stonelf/zangli。',
  'X-WR-TIMEZONE:Asia/Shanghai'
];

// RFC 5545 TEXT 转义：反斜杠、换行、分号、逗号。
function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

// RFC 5545 行折叠：每行（不含 CRLF）不超过 75 字节，续行以一个空格开头。
function foldLine(line) {
  if (Buffer.byteLength(line, 'utf8') <= 75) {
    return line;
  }
  const out = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    if (currentBytes + chBytes > 75) {
      out.push(current);
      current = ' ' + ch;
      currentBytes = 1 + chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  if (current) {
    out.push(current);
  }
  return out.join('\r\n');
}

function buildEvent(event) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${event.dtstamp}`,
    `DTSTART;VALUE=DATE:${event.dtstart}`,
    `DTEND;VALUE=DATE:${event.dtend}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT'
  ];
  return lines.map(foldLine).join('\r\n');
}

// events: [{ uid, dtstamp, dtstart, dtend, summary, description }]
function buildIcs(events, dtstamp) {
  const out = [];
  for (const line of HEADER_LINES) {
    out.push(foldLine(line));
  }
  for (const event of events) {
    out.push(buildEvent({ ...event, dtstamp }));
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n') + '\r\n';
}

module.exports = {
  buildIcs,
  escapeText,
  foldLine
};
