import { NextResponse } from "next/server"
import { analyzeProcess, generateImprovementPrompt } from "@/lib/process-analyzer"

/**
 * API Route: 分析整个画布流程
 * 
 * POST /api/canvas-ai/analyze-process
 * Body: { nodes, edges }
 * 
 * 返回流程分析结果和改进建议
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nodes, edges } = body

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { error: "Missing or invalid nodes array" },
        { status: 400 }
      )
    }

    if (!edges || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: "Missing or invalid edges array" },
        { status: 400 }
      )
    }

    // 执行流程分析
    const analysis = analyzeProcess(nodes, edges)

    // 生成改进提示词（可用于后续 AI 生成改进建议）
    const improvementPrompt = generateImprovementPrompt(analysis)

    return NextResponse.json({
      success: true,
      analysis,
      improvementPrompt,
    })
  } catch (error) {
    console.error("Process analysis error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze process",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
