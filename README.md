# zangli-calendar

可公开订阅的藏历日历。用 Apple 日历、Google 日历、Outlook 等客户端订阅一个稳定的 ICS 地址，按公历年查看全年藏历日期、殊胜日、功德倍增、八吉/九凶、交食与理发宜忌。

## 订阅地址

```text
https://baxink.github.io/zangli-calendar/zangli.ics        # 稳定订阅地址
https://baxink.github.io/zangli-calendar/zangli-2026.ics   # 当年存档
https://baxink.github.io/zangli-calendar/status.json
```

`zangli.ics` 每年整年重生成后覆盖；`zangli-YYYY.ics` 为当年存档。

## 本地生成

```bash
npm test                              # 跑对照日测试
node scripts/generate.js --year 2026  # 生成 public/ 下三份文件
```

生成脚本必须在 `Asia/Shanghai` 时区下运行（脚本内已设 `process.env.TZ = 'Asia/Shanghai'`），否则食相的归属日期和食甚时间会错。

## 目录

```text
vendor/zangli/   上游公历/藏历转换脚本（MIT）
data/            莲师表、功德月/日表、头发品、八吉、九凶六张规则表
scripts/         compose-day（一天）、build-ics（写 ICS）、generate（按年生成）
public/          生成产物：zangli.ics、zangli-YYYY.ics、status.json
tests/           Node 内置测试运行器，写死对照日
.github/         GitHub Actions：生成、提交 public/ 并部署 Pages
```

## 规则来源与归属

- 公历／藏历转换与交食数据来自 [stonelf/zangli](https://github.com/stonelf/zangli)（MIT 许可，见 `vendor/zangli/LICENSE.md`）。
- 莲师应化、功德倍增日月、菩萨头发品、八吉/九凶等规则按藏教日历说明页录入，生成时不抓取外部网站，断网也能完整生成。

## 生成器说明

- 每天一条全天事件（`TRANSP:TRANSPARENT`），标题只放藏历日期和命中短词，事迹、倍数、理发、食相说明写在备注。
- 缺日没有对应公历日，不另造事件，只在缺口前一天的备注里预告。
- 年份必须在 `zangli.js` 整年可转换区间内（1952–2050；1951 年 1 月 1–7 日在起算日 1951-01-08 之前）。
- 首次上线生成 2026 全年；生成器用 `--year` 支持以后各年。
