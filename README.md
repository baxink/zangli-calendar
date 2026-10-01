# zangli-calendar

可公开订阅的藏历日历。用 Apple 日历、Google 日历、Outlook 等客户端订阅一个稳定的 ICS 地址，按公历年查看全年藏历日期、殊胜日、功德倍增、八吉/九凶、交食与理发宜忌。

## 订阅地址

```text
https://baxink.github.io/zangli-calendar/zangli.ics        # 稳定订阅地址
https://baxink.github.io/zangli-calendar/zangli-2026.ics   # 当年存档
https://baxink.github.io/zangli-calendar/status.json
```

`zangli.ics` 当前包含 **2026-01-01 至 2030-12-31**，共 **1826 条**全天事件；`zangli-YYYY.ics` 是逐年文件，2026–2030 年均已生成。稳定订阅覆盖多个年份，后续重生成不会只剩最后一年。

## 本地生成

```bash
npm test
node scripts/generate.js --from-year 2026 --to-year 2030
node scripts/verify.js                # 独立检查 public/ 实际文件
# 单年生成会将稳定文件也限制为该年，仅在确实需要单年订阅时使用：
node scripts/generate.js --year 2026
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

- 公历／藏历转换与交食时刻来自 [stonelf/zangli](https://github.com/stonelf/zangli)（MIT 许可，见 `vendor/zangli/LICENSE.md`）。上游文件保持原样；包装层修正半影月食名称和节日月序。
- 藏历正月整月为神变月；初一标“神变节开始”，十五标“神变节”当天。初一至十五为神变十五日，十五之后仍属于神变月。
- 四大节日按 [FPMT 的藏历月日规则](https://fpmt.org/teachers/zopa/advice/practice-on-the-four-great-holy-days/)：正月十五、四月十五、六月初四、九月廿二。使用本项目标准化月份，非闰月、非闰日命中，保持节日规则与本表月份标题一致。不同传承的公历节日口径可能不同，本项目不等同于 FPMT 的逐年官方历本。
- 莲师应化、功德倍增日月、菩萨头发品、八吉/九凶等规则按藏教日历说明页录入，生成时不抓取外部网站，断网也能完整生成。
- 这些旧规则表尚缺原始说明页 URL/版本；其数值未因引用 FPMT 的节日日期规则而替换。来源与限制详见 [docs/rules-sources.md](docs/rules-sources.md)。

## 生成器说明

- 每天一条全天事件（`TRANSP:TRANSPARENT`），标题只放藏历日期和命中短词，事迹、倍数、理发、食相说明写在备注。
- 月中、月末、月初缺日均在缺口前一天备注里预告，不另造事件；若所缺日是节日，同时注明节日名称。2028 年正月十五缺日，3 月 10 日十四备注预告神变节，不能把这一提示解释成所有传承正式公布的节日日期。
- 年份必须在 `zangli.js` 整年可转换区间内（1952–2050；1951 年 1 月 1–7 日在起算日 1951-01-08 之前）。
- `status.json` 的 `start_year`、`end_year`、`coverage_start`、`coverage_end` 表示合并订阅范围；`event_count` 是总事件数，`archives` 列出逐年文件与条数。为兼容旧字段，`year` / `archive_url` 指向区间首年。
- 不传参数时，从 2026 年生成到 `max(2030, 当前年 + 1)`，上限 2050，提前保留下一年。
- GitHub Actions 每月 1 日 UTC 00:17（北京时间 08:17）重生成、提交实际产物并部署；源码变化也触发。定时服务仍遵守 GitHub 的停用/延迟限制，应关注 `status.json` 覆盖年份及 Actions 失败通知。仅本地修改尚不会更新线上订阅，需提交并推送后部署。
