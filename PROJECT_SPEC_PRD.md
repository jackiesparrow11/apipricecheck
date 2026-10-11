# APIPriceCheck: 产品需求文档 (PRD) 与技术架构设计规范

> **项目代号**：APIPriceCheck (`apipricecompare.com` / `apipricecheck.com`)  
> **核心定位**：全球首个兼具“官方标价 vs 合法聚合商分销价”的 AI API 实时价格计算与对比平台。  
> **技术底座**：Astro 5.x (SSG 纯静态直出) + TailwindCSS + Cloudflare Pages 边缘托管。  
> **文档版本**：v1.0.0 (2026-10-10)

---

## 目录
1. [产品需求文档 (PRD)](#一-产品需求文档-prd)
   - 1.1 背景与商业定位
   - 1.2 目标用户与核心场景
   - 1.3 功能规格与页面定义
   - 1.4 SEO 策略与关键词矩阵
   - 1.5 留存与商业化闭环
2. [技术架构规范 (Architecture)](#二-技术架构规范-architecture)
   - 2.1 架构设计原则 (SEO-First)
   - 2.2 技术栈选型
   - 2.3 核心数据模型 (TypeScript / Zod)
   - 2.4 Schema.org 结构化数据标准
   - 2.5 数据管道 (Data Pipeline) 设计
3. [部署架构与 Cloudflare Pages 规范](#三-部署架构与-cloudflare-pages-规范)
   - 3.1 边缘部署拓扑
   - 3.2 免费额度容量安全线
   - 3.3 缓存策略与 DNS 配置
4. [执行 SOP 与 14 天冷启动排期](#四-执行-sop-与-14-天冷启动排期)

---

# 一、 产品需求文档 (PRD)

## 1.1 背景与商业定位
当前市场上的模型价格对比网站分为两派：
* **跑分重度型**（如 BenchLM）：学术评测多，对仅想算 Token 账单的开发者过重。
* **纯列表标价型**（如 PricePerToken、AIPricing）：只录入官方原厂标价，且多数竞品首页做成纯导航跳转页（用户停留时间短、跳出率高），且未触及“找便宜合法渠道（如 OpenRouter / 算力云分销）”的核心诉求。

**APIPriceCheck 差异化价值**：
1. **官方 vs 聚合商分销并排比价**：对比 OpenAI/Anthropic/DeepSeek 原厂直连价格与 OpenRouter 等合法聚合商的实时单价，透明化差价与节省比例。
2. **工具组件前置**：将高转化、暴涨需求的 **Token 成本计算器直接前置在首页首屏**，解决竞品跳出率高的通病，最大化 SEO 驻留时长。

---

## 1.2 目标用户与核心场景

| 用户角色 | 核心诉求 | 平台承接方案 |
| :--- | :--- | :--- |
| **独立开发者 / 个人创客** | 预算敏感，想找最便宜但够用的模型，怕调 API 账单暴走。 | 首页 Token 计算器 + `/cheapest-llm-api/` 极低价专区。 |
| **AI 架构师 / 技术选型** | 需向公司汇报成本，涉及 Prompt 缓存、输入输出配比、并发预估。 | 多模型对比曲线、Prompt Cache 折扣计算、自建 vs API 盈亏平衡测算。 |
| **海外重度 API 采购者** | 官方调用贵，想找合法稳定的第三方分销或聚合商（如 OpenRouter）。 | 官方 vs 聚合商差价大盘，支持一键直达最低价服务商。 |

---

## 1.3 功能规格与页面定义

### 1. 首页 (`/`) —— P0 级核心转化页
* **H1 标题**：`AI API Pricing Calculator & Comparison — Calculate Your API Costs`
* **保鲜标识**：`Updated: [当前日期]` 带绿色状态呼吸灯。
* **首屏组件 A (Token Cost Calculator)**：
  * 模型下拉框（内置主流模型：GPT-4o、Claude 3.5 Sonnet、DeepSeek V3 等）。
  * 动态输入：预估输入 Token、输出 Token、缓存命中率滑块（0% ~ 100%）。
  * 实时输出：单次成本、日成本、月预估支出，对比展示“官方直连” vs “聚合商最低”差额。
* **首屏组件 B (比价大盘表格)**：
  * 支持模糊搜索、Provider 胶囊过滤、价格区间（Low/Mid/High）过滤。
  * 表格首列（模型名）**Sticky 吸左**。
  * 字段：`Model` | `Context` | `Official Input` | `Official Output` | `Cached Rate` | `Cheapest Aggregator` | `Diff %` | `Action`。
  * 采用**相对价格对数色阶（Logarithmic Color Scale）**着色。
* **底部组件 C (PAA 直接问答)**：精选 6 个常见问题，提供详细图文与计算公式解答。

### 2. 独立成本计算器页 (`/calculator/`) —— P1
* 支持 2~4 个模型多维度并排对比账单。
* 内置自建 GPU 实例（H100/A10G 租用）vs 商业 API 盈亏平衡测算器。

### 3. 厂商独立落地页 (`/pricing/[provider]/`) —— P1
* 路由：`/pricing/openai/`, `/pricing/anthropic/`, `/pricing/deepseek/` 等。
* 顶部 **Featured Snippet Quick Answer Box**，直答“How much does [Brand] API cost?”。
* 包含该厂商全系模型价格表、高峰/平峰时段计费规则及专属 FAQ。

### 4. 最便宜模型专区 (`/cheapest-llm-api/`) —— P1
* 针对 `cheapest llm api` (月搜 1k~10k) 关键词定制。
* 汇集所有低于 $0.20/1M tokens 的高性价比生产级模型及免费额度模型列表。

### 5. 开放数据接口 (`/api/pricing.json`) —— P2
* 开放最新标准化 JSON 数据源，附带使用条款，承接科研与开发者反向链接。

---

## 1.4 SEO 策略与关键词矩阵

| 梯队 | 核心关键词 | KP 搜索量 | KD 难度 | 战略打法 |
| :--- | :--- | :--- | :--- | :--- |
| **🥇 A 档 (核心发力点)** | `openai api pricing calculator` | 1,000~10,000 | 25.3 (易) | +900% 暴涨词，首页与计算器页重点吃满 |
| **🥇 A 档 (核心发力点)** | `cheapest llm api` | 1,000~10,000 | 26.2 (易) | 独立承接专区，解决 Reddit 填空真空 |
| **🥇 A 档 (核心发力点)** | `token cost calculator` | 100~1,000 | 26.4 (易) | +900% 暴涨词，与计算器页同吃 |
| **🥈 B 档 (品类与对比)** | `ai api pricing comparison` | 100~1,000 | 12.5 (极易) | 竞争度弱，无人针对性定制，首页副词 |
| **🥈 B 档 (疑问句式)** | `how much does [brand] api cost` | 100~1,000 | 30~38 (容易) | 批量按品牌落地页铺设，替代 Reddit 帖子 |
| **🥉 C 档 (品牌大词)** | `deepseek pricing` / `chatgpt api pricing` | 10,000+ | 32~48 (中等) | 积累一定权重后，通过独立品牌页竞争 |

---

## 1.5 留存与商业化闭环

1. **智能延迟 Newsletter 抽屉 (12s Delay)**：
   * 页面停留 12 秒后平滑浮出，提供每周大模型价格变动周报。
   * 用户关闭后，`localStorage` 记录并在 7 天内静默不打扰。
   * 配置 Honeypot 隐藏字段防御机器人垃圾撞库。
2. **商业化触点**：
   * **聚合商佣金 (Affiliate / Referral)**：针对 OpenRouter 等平台，外链携带分销参数（带 `rel="noopener sponsored"`）。
   * **展示广告**：达到稳定日均流量后申请 Google AdSense 规范展示位。
   * **赞助展示位**：为 AI 推理服务商提供顶部或表格 Featured 赞助标签。

---

# 二、 技术架构规范 (Architecture)

## 2.1 架构设计原则 (SEO-First)
1. **100% 服务端纯静态直出 (SSG)**：爬虫获取到的首次响应即包含完整页面文案、表格数据和全套 JSON-LD，彻底杜绝 CSR 渲染延迟惩罚。
2. **孤岛水合 (Islands Architecture)**：仅搜索过滤、计算器滑块加载微量客户端 JS，其余正文为零 JS 纯 HTML。
3. **极速性能基线**：Lighthouse SEO 得分 100，Performance ≥ 95，TTFB < 500ms。

---

## 2.2 技术栈选型
* **编译框架**：**Astro 5.x**（纯静态构建模式，`output: 'static'`）
* **交互孤岛**：**Preact**（体积仅 3KB，比 React 节省 90% JS 体积）
* **UI 与样式**：**TailwindCSS v3.4+**
* **字体托管**：自托管 Inter woff2（配置 `<link rel="preload">`）
* **数据校验**：**Zod**
* **部署平台**：**Cloudflare Pages**

---

## 2.3 核心数据模型 (TypeScript / Zod)

```typescript
export interface ModelRecord {
  id: string;                      // 唯一ID: "deepseek-v3"
  name: string;                    // 展示名: "DeepSeek V3"
  family: string;                  // 家族: "DeepSeek"
  provider: string;                // 厂商标识: "deepseek"
  contextWindow: number;           // 上下文: 128000
  
  // 1. 官方定价 (每百万 Token)
  officialPricing: {
    inputPerM: number;
    cachedInputPerM: number;
    outputPerM: number;
  };

  // 2. 计划/时段阶梯计费 (可选)
  scheduledPricing?: {
    peakHoursUtc: string[];
    peakTier: { inputPerM: number; outputPerM: number; cachedInputPerM: number };
    offPeakTier: { inputPerM: number; outputPerM: number; cachedInputPerM: number };
  };

  // 3. 聚合商分销报价 (核心差异化)
  aggregatorOffers: Array<{
    aggregator: "openrouter" | "together" | "deepinfra" | "fireworks";
    inputPerM: number;
    outputPerM: number;
    status: "active" | "down";
    outboundUrl: string;
  }>;

  status: "active" | "deprecated";
  releasedAt: string;
  lastVerifiedAt: string;
}
```

---

## 2.4 Schema.org 结构化数据全套标准

全站强制挂载标准化 JSON-LD：
1. **`WebSite` + `SearchAction`**：启用 SERP 站内搜索条。
2. **`Organization`**：挂载领域权威背书与 GitHub 组织。
3. **`FAQPage`**：每一页严格对应 6~8 个 Google PAA 问答。
4. **`Product` + `Offer` (@graph)**：每个模型独立申明输入/输出的百万 Token 标价。
5. **`Dataset`**：针对开放数据端点 `/api/pricing.json` 进行学术与开发者数据声明。

---

# 三、 部署架构与 Cloudflare Pages 规范

## 3.1 边缘部署拓扑

```
[GitHub Repo]
      │ (每日 Actions 定时同步数据 / 代码推送)
      ▼
[Cloudflare Pages Build Engine] (运行 astro build)
      │ (编译生成 dist/ 纯静态资源)
      ▼
[Cloudflare Global Anycast Edge Network] (280+ 城市边缘节点)
      │
      ├────► [Googlebot 爬虫] (直接读取秒开纯 HTML + JSON-LD)
      └────► [真实终端用户] (零等待 CDN 秒开 + 局部水合计算器)
```

## 3.2 免费额度容量安全线评估

| 资源项 | 官方免费上限 | 本站实际月消耗预估 | 安全水位 |
| :--- | :--- | :--- | :--- |
| **出口带宽** | **无限 (Unlimited)** | 无论 10 万还是 100 万 PV 均为 $0 | 🟢 绝对安全 |
| **静态请求数** | **无限 (Unlimited)** | 边缘节点全缓存直出 | 🟢 绝对安全 |
| **每月构建次数** | **500 次 / 月** | 每日定时 30 次 + 人工发版约 50 次 = 80 次 | 🟢 仅占 16% |
| **单站文件总数** | **20,000 个** | 全站预估 300 ~ 600 个 HTML 文件 | 🟢 仅占 3% |
| **边缘函数调用** | 100,000 次 / 天 | 全站 SSG 静态化，不占用 Functions 额度 | 🟢 100% 免费 |

---

# 四、 执行 SOP 与 14 天冷启动排期

```
Day 1-2: 基建搭建 ──► Day 3-5: 页面与组件开发 ──► Day 6-7: SEO 验收与部署 ──► Day 8-14: GSC 与外链拓展
```

* **Day 1~2：基础框架与数据层初始化**
  * 创建 Astro 5 + TailwindCSS 项目。
  * 编写 `src/data/models.json` 基础种子数据字典。
  * 编写数据校验脚本与 OpenRouter API 同步逻辑。
* **Day 3~5：核心组件与页面落地**
  * 开发 Token 成本交互计算器组件 (Preact)。
  * 开发官方 vs 聚合商比价数据表格（支持吸顶吸左、对数色阶着色）。
  * 搭建 `/` 首页与 `/pricing/[provider]` 动态模板页。
* **Day 6~7：SEO 验收与生产上线**
  * 使用 Google 富媒体测试工具（Rich Results Test）验证 JSON-LD 0 报错。
  * 绑定自定义域名，在 Cloudflare 开启 **Crawler Hints** 与 **HTTP/3**。
  * 提交 Google Search Console 验证并推送 `sitemap.xml`。
* **Day 8~14：外链冷启动与持续引流**
  * GitHub 组织开源数据仓库互链。
  * 提交至 Toolify、There's An AI For That 等主流 AI 导航站。
  * 提取竞品反链，在科技博客与 Reddit 针对性留痕。
  * 启动新模型 24 小时截流机制。
