/**
 * Process Analyzer - 流程分析工具
 * 
 * 用于分析画布流程，识别关键要素：
 * - 风险点 (Risks)
 * - 资源需求 (Resources)
 * - 利益相关方 (Stakeholders)
 * - 边界条件 (Boundaries)
 * - 数据缺口 (Data Gaps)
 */

import type { CanvasNode, CanvasEdge } from "@/lib/types/canvas"

export interface ProcessAnalysisResult {
  score: number // 0-100, 流程的完整性评分
  insights: {
    type: "risk" | "resource" | "stakeholder" | "boundary" | "data" | "logic" | "iteration"
    severity: "high" | "medium" | "low"
    title: string
    description: string
    suggestion: string
    affectedNodeIds?: string[]
  }[]
  statistics: {
    totalNodes: number
    nodesByType: Record<string, number>
    missingElements: string[] // 缺失的关键要素类型
    hasIterationLoop: boolean
    hasRiskAssessment: boolean
    hasResourcePlanning: boolean
    hasStakeholderMapping: boolean
    hasBoundaryDefinition: boolean
  }
}

/**
 * 分析画布流程的完整性和系统性思考
 */
export function analyzeProcess(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): ProcessAnalysisResult {
  const insights: ProcessAnalysisResult["insights"] = []
  const nodesByType: Record<string, number> = {}
  
  // 统计节点类型
  nodes.forEach((node) => {
    if (node.type === "canvas-node") {
      const nodeType = (node.data as any).type || "base"
      nodesByType[nodeType] = (nodesByType[nodeType] || 0) + 1
    }
  })

  // 1. 检查是否有核心目标
  const hasGoal = nodesByType.goal > 0
  if (!hasGoal) {
    insights.push({
      type: "logic",
      severity: "high",
      title: "缺少核心目标",
      description: "流程中没有明确的 Goal 节点，核心目的不清晰",
      suggestion: "添加一个 Goal 节点来明确这个流程的核心目的是什么",
    })
  }

  // 2. 检查是否有风险评估
  const hasRisks = nodesByType.risk > 0
  if (!hasRisks) {
    insights.push({
      type: "risk",
      severity: "medium",
      title: "缺少风险识别",
      description: "流程中没有识别潜在的风险点或失败模式",
      suggestion: "思考：这个流程中什么环节可能出错？有哪些外部威胁？添加 Risk 节点来标识",
    })
  }

  // 3. 检查是否有资源规划
  const hasResources = nodesByType.resource > 0
  if (!hasResources && nodesByType.action > 2) {
    insights.push({
      type: "resource",
      severity: "medium",
      title: "缺少资源规划",
      description: "流程有多个行动步骤，但没有明确需要哪些资源",
      suggestion: "思考：执行这些步骤需要什么？人力、资金、工具、时间？添加 Resource 节点",
    })
  }

  // 4. 检查是否有利益相关方
  const hasStakeholders = nodesByType.stakeholder > 0
  if (!hasStakeholders && nodesByType.action > 3) {
    insights.push({
      type: "stakeholder",
      severity: "low",
      title: "未识别利益相关方",
      description: "复杂流程通常涉及多个角色，但未标识第三方或协作者",
      suggestion: "思考：谁会影响这个流程？谁需要审批？谁是合作伙伴？添加 Stakeholder 节点",
    })
  }

  // 5. 检查是否有边界条件
  const hasBoundaries = nodesByType.boundary > 0
  if (!hasBoundaries) {
    insights.push({
      type: "boundary",
      severity: "low",
      title: "未定义边界条件",
      description: "没有明确的约束条件、规则或限制",
      suggestion: "思考：有哪些不能突破的限制？时间、预算、法规、技术限制？添加 Boundary 节点",
    })
  }

  // 6. 检查是否有数据占位符（对于复杂流程）
  const hasPlaceholders = nodesByType.placeholder > 0
  const totalActionableNodes = (nodesByType.action || 0) + (nodesByType.goal || 0)
  if (!hasPlaceholders && totalActionableNodes > 5) {
    insights.push({
      type: "data",
      severity: "medium",
      title: "可能缺少数据准备步骤",
      description: "复杂流程通常需要用户准备一些数据或信息，但未标识",
      suggestion: "思考：哪些环节需要用户提供数据？哪些信息还不清楚？添加 Placeholder 节点并注明如何准备",
    })
  }

  // 7. 检查是否有反馈循环（迭代思维）
  const hasIterationLoop = detectFeedbackLoop(nodes, edges)
  if (!hasIterationLoop && totalActionableNodes > 4) {
    insights.push({
      type: "iteration",
      severity: "medium",
      title: "缺少迭代反馈机制",
      description: "流程是线性的，没有测试-反馈-改进的循环",
      suggestion: "添加一个从 '测试/验证' 阶段回到 '设计/规划' 阶段的连接，形成迭代循环",
    })
  }

  // 8. 检查逻辑结构：是否有孤立节点
  const isolatedNodes = detectIsolatedNodes(nodes, edges)
  if (isolatedNodes.length > 0) {
    insights.push({
      type: "logic",
      severity: "high",
      title: `发现 ${isolatedNodes.length} 个孤立节点`,
      description: "这些节点没有与其他节点建立连接，逻辑关系不清晰",
      suggestion: "为这些节点建立连接，明确它们在流程中的位置和作用",
      affectedNodeIds: isolatedNodes,
    })
  }

  // 9. 检查连接标签
  const unlabeledConnections = edges.filter((e) => !e.data?.label || e.data.label.trim() === "")
  if (unlabeledConnections.length > 2) {
    insights.push({
      type: "logic",
      severity: "medium",
      title: `${unlabeledConnections.length} 个连接缺少标签`,
      description: "连接没有说明关系类型（如 '依赖于'、'触发'、'可选'），逻辑不够清晰",
      suggestion: "为每个连接添加标签，说明节点之间的关系是什么",
    })
  }

  // 10. 检查分组（逻辑阶段）
  const hasGroups = nodes.some((n) => n.type === "group-node")
  if (!hasGroups && nodes.length > 8) {
    insights.push({
      type: "logic",
      severity: "low",
      title: "建议添加逻辑分组",
      description: "节点较多但没有分组，可读性可能较差",
      suggestion: "使用 Group 将节点划分为逻辑阶段，如 '规划'、'执行'、'验证'",
    })
  }

  // 计算缺失元素
  const missingElements: string[] = []
  if (!hasGoal) missingElements.push("goal")
  if (!hasRisks) missingElements.push("risk")
  if (!hasResources && nodesByType.action > 2) missingElements.push("resource")
  if (!hasStakeholders && nodesByType.action > 3) missingElements.push("stakeholder")
  if (!hasBoundaries) missingElements.push("boundary")
  if (!hasPlaceholders && totalActionableNodes > 5) missingElements.push("placeholder")

  // 计算评分 (0-100)
  let score = 100
  insights.forEach((insight) => {
    if (insight.severity === "high") score -= 20
    else if (insight.severity === "medium") score -= 10
    else score -= 5
  })
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    insights,
    statistics: {
      totalNodes: nodes.filter((n) => n.type === "canvas-node").length,
      nodesByType,
      missingElements,
      hasIterationLoop,
      hasRiskAssessment: hasRisks,
      hasResourcePlanning: hasResources,
      hasStakeholderMapping: hasStakeholders,
      hasBoundaryDefinition: hasBoundaries,
    },
  }
}

/**
 * 检测是否存在反馈循环
 */
function detectFeedbackLoop(nodes: CanvasNode[], edges: CanvasEdge[]): boolean {
  // 简化检测：查找是否有 reverse 类型的连接
  const hasReverseConnection = edges.some((e) => e.data?.weight === "reverse")
  if (hasReverseConnection) return true

  // 或者检测是否有从后面节点指向前面节点的连接（基于位置）
  for (const edge of edges) {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (sourceNode && targetNode) {
      // 如果 target 的 X 坐标小于 source，可能是反馈
      if (targetNode.position.x < sourceNode.position.x - 100) {
        return true
      }
    }
  }

  return false
}

/**
 * 检测孤立节点（没有任何连接）
 */
function detectIsolatedNodes(nodes: CanvasNode[], edges: CanvasEdge[]): string[] {
  const connectedNodeIds = new Set<string>()
  edges.forEach((e) => {
    connectedNodeIds.add(e.source)
    connectedNodeIds.add(e.target)
  })

  const canvasNodes = nodes.filter((n) => n.type === "canvas-node")
  const isolatedNodes = canvasNodes.filter((n) => !connectedNodeIds.has(n.id))

  return isolatedNodes.map((n) => n.id)
}

/**
 * 生成改进建议的 AI 提示词
 */
export function generateImprovementPrompt(analysis: ProcessAnalysisResult): string {
  const { insights, statistics } = analysis

  let prompt = `请根据以下分析结果，为用户提供改进建议：\n\n`
  prompt += `**当前流程评分**: ${analysis.score}/100\n\n`
  
  if (insights.length === 0) {
    prompt += `流程结构完整，已包含核心要素。`
    return prompt
  }

  prompt += `**发现的问题**:\n`
  insights.forEach((insight, idx) => {
    prompt += `${idx + 1}. [${insight.severity.toUpperCase()}] ${insight.title}\n`
    prompt += `   - ${insight.description}\n`
    prompt += `   - 建议: ${insight.suggestion}\n\n`
  })

  prompt += `\n**统计信息**:\n`
  prompt += `- 总节点数: ${statistics.totalNodes}\n`
  prompt += `- 节点分布: ${Object.entries(statistics.nodesByType).map(([type, count]) => `${type}(${count})`).join(", ")}\n`
  prompt += `- 缺失要素: ${statistics.missingElements.length > 0 ? statistics.missingElements.join(", ") : "无"}\n`

  return prompt
}
