# 系统思维设计指南

本指南说明了 AI Canvas Builder 中融入的 5 大核心思考点，以及如何使用新的节点类型和流程分析功能。

## 目录

1. [核心设计原则](#核心设计原则)
2. [新增节点类型](#新增节点类型)
3. [AI 增强功能](#ai-增强功能)
4. [流程分析工具](#流程分析工具)
5. [使用示例](#使用示例)

---

## 核心设计原则

### 1. 明确核心目的与分支目的 (Core Purpose & Branches)

**问题**: 用户常常有多个目标，但不清楚哪个是核心，哪个是次要。

**解决方案**:
- AI 会主动询问："你的 ONE 核心目标是什么?"
- 识别主要目标和次要分支目标
- 用连接标签区分 "核心路径" vs "可选路径"

**示例对话**:
```
用户: "我想开一家咖啡店"
AI: "我注意到这可能涉及几个目标:
1. 创造收入 (核心)
2. 提供社区空间 (次要)
3. 实现创业梦想 (个人)

你最看重哪一个?这将影响我们的策略设计。"
```

### 2. 分析背后规则逻辑 (Underlying Logic)

**问题**: 流程中隐藏的依赖关系、条件分支、反馈循环不够清晰。

**解决方案**:
- AI 会识别因果链 ("A 必须在 B 之前")
- 创建 Boundary 节点标注约束条件
- 用连接标签说明逻辑关系 ("依赖于"、"触发"、"可选")

**示例**:
- "无法在原型测试之前启动营销" → 创建强连接，标签 "requires completion"
- "预算不超过 $50k" → 创建 Boundary 节点

### 3. 系统角度观测 (Systems Perspective)

**问题**: 忽略用户的真实动机、资源、环境。

**解决方案**:
- AI 会根据用户背景调整建议:
  - 创业公司 → 强调速度、低成本、快速迭代
  - 企业环境 → 强调合规、利益相关方、文档
  - 学习导向 → 强调实验、多方案、学习资源

**示例**:
```
用户: "我是独立开发者，想做一个 SaaS 产品"
AI: "作为独立开发者，我建议:
- 优先 MVP，避免过度工程
- 添加 Resource 节点: '无代码工具' (节省时间)
- 添加 Risk 节点: '缺乏市场验证' (先验证需求)
- 强调快速反馈循环 (每周迭代)"
```

### 4. 迭代思维 (Iterative Mindset)

**问题**: 流程太线性，缺少测试-反馈-改进循环。

**解决方案**:
- 对于复杂流程，AI 会创建 5 个阶段:
  1. Define & Scope (设定目标)
  2. Design & Plan (构思方案)
  3. Build Prototype (构建原型)
  4. Test & Validate (测试验证)
  5. Iterate & Improve (反馈迭代)
- 添加反向连接，从 "测试" 回到 "设计"

**迭代模板**:

| 模板 | 适用场景 | 阶段 |
|------|---------|------|
| Product Launch | 产品上线 | Research → Design → MVP → Beta Test → Launch |
| Problem Solving | 解决问题 | Understand → Explore → Select → Implement → Measure |
| Learning | 学习技能 | Set Goals → Resources → Practice → Feedback → Master |
| Optimization | 流程优化 | Baseline → Identify Bottlenecks → Improve → Test → Monitor |

### 5. 识别关键要素 (Key Elements)

**问题**: 忽略风险、资源、利益相关方、边界条件、数据需求。

**解决方案**:
AI 会主动创建以下节点:

| 要素 | 节点类型 | 何时创建 | 示例 |
|------|---------|---------|------|
| **风险点** | Risk | 任何流程 | "Risk: 资金不足" |
| **资源** | Resource | 有 Action 节点时 | "Resource: React 开发者" |
| **利益相关方** | Stakeholder | 复杂流程 | "Stakeholder: 监管机构" |
| **边界条件** | Boundary | 有约束时 | "Boundary: 3个月上线" |
| **数据缺口** | Placeholder | 信息不足时 | "Placeholder: 用户调研数据" |

---

## 新增节点类型

### 1. Placeholder (数据占位符)
**图标**: 📋 FileQuestion  
**颜色**: 石板灰 (#94a3b8)  
**用途**: 标记需要用户准备的数据或信息

**何时使用**:
- AI 需要用户提供具体信息才能继续
- 流程中需要外部数据输入
- 需要明确数据准备要求

**创建规则**:
- 必须包含 "How to Prepare" 或 "Data Requirements" section
- 说明:
  - 需要什么数据
  - 如何收集/准备
  - 预期格式
  - 为什么需要 (如何使用)

**示例**:
```json
{
  "type": "create",
  "nodeType": "placeholder",
  "title": "数据: 客户痛点调研",
  "description": "需要了解目标客户的核心问题",
  "sections": [{
    "title": "如何准备",
    "items": [
      "访谈 20+ 目标客户",
      "询问: 你在 [领域] 最大的挑战是什么?",
      "询问: 你尝试过什么解决方案? 为什么不满意?",
      "在表格中整理痛点的共性"
    ]
  }]
}
```

### 2. Stakeholder (利益相关方)
**图标**: 👥 Users  
**颜色**: 青色 (#06b6d4)  
**用途**: 标识第三方角色、外部合作伙伴、审批者

**何时使用**:
- 流程涉及多个角色/团队
- 需要外部审批或合作
- B2B 流程中的客户、供应商

**示例**:
```json
{
  "type": "create",
  "nodeType": "stakeholder",
  "title": "利益相关方: Beta 测试用户",
  "description": "前 10 位用户，提供早期反馈",
  "sections": [{
    "title": "角色职责",
    "items": [
      "测试核心功能",
      "每周提供反馈",
      "参与用户访谈"
    ]
  }]
}
```

### 3. Boundary (边界条件)
**图标**: 🛡️ Shield  
**颜色**: 橙色 (#f97316)  
**用途**: 标记约束、限制、规则、不可突破的边界

**何时使用**:
- 有时间/预算/资源限制
- 需要遵守法规/政策
- 技术/物理限制

**示例**:
```json
{
  "type": "create",
  "nodeType": "boundary",
  "title": "边界: GDPR 合规要求",
  "description": "必须遵守欧盟数据保护法规",
  "sections": [{
    "title": "关键要求",
    "items": [
      "用户数据加密存储",
      "提供数据导出功能",
      "72小时内报告数据泄露"
    ]
  }]
}
```

---

## AI 增强功能

### 1. 智能询问 (Enhanced Forms)

AI 在需要更多信息时，会使用结构化表单引导你思考:

**表单结构** (最多 5 步):
1. **核心目的** - "你的 ONE 主要目标是什么?"
2. **分支目标** - "次要关注点?" (多选: 速度/成本/质量/学习/风险/规模)
3. **上下文约束** - "时间线? 预算? 现有资源?"
4. **关键顾虑** (可选) - "最担心什么?"
5. **确认** (可选) - 总结确认

**示例对话**:
```
用户: "我想学习 React"
AI: (显示表单)
  步骤 1: "你学习 React 的核心目标是?"
    [ ] 找工作需要
    [ ] 个人项目
    [ ] 提升技能
    [ ] 其他: ___
  
  步骤 2: "你更看重什么?" (多选)
    [ ] 快速上手
    [ ] 深入理解原理
    [ ] 实战项目经验
    [ ] 认证/证书
  
  步骤 3: "你的学习时间?"
    ( ) 每天 1-2 小时
    ( ) 每周 5-10 小时
    ( ) 全职学习
```

### 2. 迭代模板自动应用

当 AI 识别到特定类型的请求时，会自动应用相应模板:

**触发词 → 模板映射**:
- "launch", "build", "create product" → Product Launch 模板
- "solve", "fix", "resolve issue" → Problem Solving 模板
- "learn", "master", "study" → Learning 模板
- "optimize", "improve", "enhance" → Optimization 模板

**模板包含**:
- 5 个逻辑阶段 (Groups)
- 反馈循环 (reverse connection)
- Risk / Resource / Stakeholder 节点
- Placeholder 节点 (需要数据的地方)

---

## 流程分析工具

### 自动分析 API

**Endpoint**: `/api/canvas-ai/analyze-process`

**功能**: 分析画布流程的完整性，识别缺失要素

**检查项**:
1. ✅ 是否有核心目标 (Goal 节点)
2. ✅ 是否识别风险 (Risk 节点)
3. ✅ 是否规划资源 (Resource 节点)
4. ✅ 是否标识利益相关方 (Stakeholder 节点)
5. ✅ 是否定义边界条件 (Boundary 节点)
6. ✅ 是否有数据准备步骤 (Placeholder 节点)
7. ✅ 是否有迭代循环 (反馈连接)
8. ✅ 连接是否有标签
9. ✅ 是否有孤立节点
10. ✅ 是否需要分组

**返回结果**:
```json
{
  "score": 75,
  "insights": [
    {
      "type": "risk",
      "severity": "medium",
      "title": "缺少风险识别",
      "description": "流程中没有识别潜在的风险点",
      "suggestion": "添加 Risk 节点来标识可能的失败模式"
    }
  ],
  "statistics": {
    "totalNodes": 12,
    "nodesByType": { "goal": 1, "action": 8, "idea": 3 },
    "missingElements": ["risk", "resource", "stakeholder"],
    "hasIterationLoop": false,
    "hasRiskAssessment": false
  }
}
```

### 使用方式

**前端调用**:
```typescript
const response = await fetch('/api/canvas-ai/analyze-process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, edges })
})

const { analysis } = await response.json()

console.log(`流程评分: ${analysis.score}/100`)
analysis.insights.forEach(insight => {
  console.log(`[${insight.severity}] ${insight.title}`)
  console.log(`建议: ${insight.suggestion}`)
})
```

---

## 使用示例

### 示例 1: 创建在线课程

**用户输入**:
```
"我想创建一个在线课程"
```

**AI 响应** (应用 Systems Thinking):

1. **明确核心目的** (Form 询问):
   - "你的核心目标是?" → 用户选择 "在前 3 个月获得 $10k 收入"
   - "次要关注?" → 用户勾选 ["快速上手", "低成本"]

2. **生成流程** (包含 5 个阶段):

```
[Phase 1: Define & Scope]
  ├─ Goal: "核心: 3个月赚 $10k"
  └─ Placeholder: "数据: 目标学员痛点"
      └─ Section "如何准备": 
          - "访谈 20+ 潜在学员"
          - "询问最大挑战"

[Phase 2: Design & Plan]
  ├─ Idea: "方案 A: 录播课程"
  ├─ Idea: "方案 B: 直播训练营"
  └─ Boundary: "边界: $2k 预算"

[Phase 3: Build MVP]
  ├─ Action: "创建试讲视频"
  ├─ Resource: "资源: 课程平台 (Teachable)"
  └─ Resource: "资源: 摄像设备 ($500)"

[Phase 4: Test & Validate]
  ├─ Action: "招募 5 位 Beta 学员"
  ├─ Stakeholder: "利益相关方: Beta 学员"
  └─ Risk: "风险: 内容质量不达标"

[Phase 5: Iterate & Improve]
  └─ Action: "根据反馈优化课程"
      └─ (反向连接到 Phase 2) ← 迭代循环

连接:
- "核心: 3个月赚 $10k" → "方案 A: 录播课程" [strong, "核心路径"]
- "风险: 内容质量不达标" → "核心: 3个月赚 $10k" [strong, "威胁目标"]
- Phase 4 → Phase 2 [reverse, "feedback loop"]
```

3. **流程分析评分**: 85/100
   - ✅ 有核心目标
   - ✅ 识别了风险
   - ✅ 规划了资源
   - ✅ 有利益相关方
   - ✅ 定义了边界
   - ✅ 有数据占位符
   - ✅ 有迭代循环

### 示例 2: 优化现有流程

**用户输入**:
```
"这套客户支持流程有什么问题?"
```

**AI 响应** (Analysis Mode):

```markdown
我分析了你的流程,发现以下问题:

**1. [HIGH] 缺少核心目标**
你的流程有 8 个步骤,但没有明确最终要达成什么目标。
建议: 添加一个 Goal 节点,例如 "Goal: 24小时内解决 90% 的客户问题"

**2. [MEDIUM] 缺少风险识别**
客户支持流程容易出现延误、误解、升级失败等问题。
建议: 添加 Risk 节点:
- "Risk: 响应时间过长 (流失客户)"
- "Risk: 技术问题无法解决 (需升级)"

**3. [MEDIUM] 未标识利益相关方**
客户支持涉及多个团队 (前端、技术、产品)。
建议: 添加 Stakeholder 节点:
- "Stakeholder: 技术团队 (处理复杂问题)"
- "Stakeholder: 产品团队 (功能请求)"

**4. [LOW] 缺少迭代反馈**
流程是线性的,没有 "分析常见问题 → 改进流程" 的循环。
建议: 添加从 "月度回顾" 回到 "优化 SOP" 的连接。

**当前评分**: 60/100
**改进后预期**: 85/100

需要我帮你添加这些改进吗?
```

---

## 最佳实践

### 1. 与 AI 协作时

**✅ 好的做法**:
- 先说明背景: "我是独立开发者" / "我们是 5 人创业团队"
- 明确约束: "预算 $5k" / "3个月内上线"
- 表达顾虑: "我最担心没有用户"

**❌ 避免**:
- 模糊请求: "帮我做个东西"
- 跳过思考: "直接给我答案"
- 忽略建议: AI 询问核心目的时不回答

### 2. 流程设计原则

1. **先明确核心目的** - 主目标 vs 次要目标
2. **标注所有连接** - 每个连接都要有 label (说明关系)
3. **识别关键要素** - 风险、资源、利益相关方、边界
4. **预留数据占位符** - 不清楚的地方用 Placeholder 标注
5. **构建迭代循环** - 从 "测试" 回到 "设计"

### 3. 节点命名规范

**清晰命名** (便于 AI 理解):
- Goal: "核心: 3个月获得 100 个付费用户"
- Placeholder: "数据: 用户访谈结果"
- Risk: "风险: 市场需求不足"
- Resource: "资源: React 开发者 (1人)"
- Stakeholder: "利益相关方: 种子用户 (10人)"
- Boundary: "边界: 预算上限 $10k"

---

## 技术集成

### 在代码中使用流程分析

```typescript
import { analyzeProcess, generateImprovementPrompt } from '@/lib/process-analyzer'

// 1. 分析流程
const analysis = analyzeProcess(nodes, edges)

// 2. 显示评分
console.log(`流程完整性: ${analysis.score}/100`)

// 3. 显示建议
analysis.insights.forEach(insight => {
  console.log(`[${insight.type}] ${insight.title}`)
  console.log(`严重性: ${insight.severity}`)
  console.log(`建议: ${insight.suggestion}`)
})

// 4. 生成 AI 改进提示
const prompt = generateImprovementPrompt(analysis)
// 将 prompt 发送给 AI,让它生成具体的改进 actions
```

### 自定义分析规则

```typescript
// 扩展 process-analyzer.ts
export function analyzeProcess(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  customRules?: AnalysisRule[]
): ProcessAnalysisResult {
  // ... 现有逻辑
  
  // 应用自定义规则
  if (customRules) {
    customRules.forEach(rule => {
      const result = rule.check(nodes, edges)
      if (!result.passed) {
        insights.push({
          type: rule.type,
          severity: rule.severity,
          title: rule.title,
          description: result.message,
          suggestion: rule.suggestion
        })
      }
    })
  }
  
  return { score, insights, statistics }
}
```

---

## 常见问题

### Q1: AI 总是问很多问题,能直接生成吗?

A: 可以在请求中提供更多上下文:
```
"我是独立开发者,预算 $2k,3个月内上线一个帮助自由职业者管理项目的 SaaS 产品,
核心目标是获得 50 个付费用户,最担心市场需求不足。"
```

这样 AI 会直接生成流程,而不是询问。

### Q2: 如何让 AI 生成更详细的流程?

A: 使用关键词 "详细流程" 或 "完整计划":
```
"给我一个详细的产品发布流程,包含所有风险点和资源需求"
```

### Q3: AI 生成的节点太多,如何简化?

A: 使用 "简化版" 或 "核心步骤":
```
"给我一个简化版的流程,只包含核心 5 个步骤"
```

### Q4: 如何让 AI 应用特定模板?

A: 明确提及模板名称:
```
"用 Product Launch 模板帮我规划新功能上线"
"用 Problem Solving 模板帮我解决用户留存率低的问题"
```

---

## 更新日志

### v1.0.0 (2024-12-15)
- ✅ 添加 3 个新节点类型: Placeholder, Stakeholder, Boundary
- ✅ 集成系统思维提示词 (5 大核心原则)
- ✅ 增强 Form 询问逻辑 (明确核心目的)
- ✅ 创建流程分析工具 (`process-analyzer.ts`)
- ✅ 添加迭代思维模板 (4 种场景)
- ✅ 更新 UI 样式支持新节点类型

---

## 反馈与改进

如果你有任何建议或发现问题,请:
1. 在使用过程中记录 AI 的响应质量
2. 标注哪些建议有用,哪些不够准确
3. 提供具体案例,帮助我们改进提示词

**联系方式**: [添加你的联系方式]

---

**Happy Building! 🚀**

用系统思维构建更好的流程。
