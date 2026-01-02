import { NextResponse } from "next/server"
import type { CanvasNodeData } from "@/lib/types/canvas"

/**
 * Mock API for testing error handling and retry functionality
 * 
 * Query parameters:
 * - scenario: "success" | "network_error" | "server_error" | "timeout" | "random"
 * - delay: number (milliseconds to delay response)
 * 
 * Example:
 * POST /api/canvas-ai/analyze-mock?scenario=network_error
 * POST /api/canvas-ai/analyze-mock?scenario=random&delay=2000
 */

let failureCount = 0 // Track failures for "random" scenario

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const scenario = searchParams.get("scenario") || "success"
  const delay = parseInt(searchParams.get("delay") || "0", 10)

  // Parse request body
  const { nodeData, message } = (await req.json()) as {
    nodeData: CanvasNodeData
    message: string
  }

  // Simulate delay if specified
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  // Handle different scenarios
  switch (scenario) {
    case "network_error":
      // Simulate network error (500)
      return NextResponse.json(
        {
          error: "Network error: Failed to connect to AI service",
          code: "NETWORK_ERROR",
        },
        { status: 500 }
      )

    case "server_error":
      // Simulate internal server error
      return NextResponse.json(
        {
          error: "Internal server error: AI service is temporarily unavailable",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      )

    case "timeout":
      // Simulate timeout (504)
      return NextResponse.json(
        {
          error: "Request timeout: AI service did not respond in time",
          code: "TIMEOUT",
        },
        { status: 504 }
      )

    case "rate_limit":
      // Simulate rate limit error (429)
      return NextResponse.json(
        {
          error: "Rate limit exceeded: Too many requests. Please try again later.",
          code: "RATE_LIMIT",
        },
        { status: 429 }
      )

    case "invalid_request":
      // Simulate validation error (400)
      return NextResponse.json(
        {
          error: "Invalid request: Missing required fields",
          code: "INVALID_REQUEST",
        },
        { status: 400 }
      )

    case "random":
      // Randomly succeed or fail (fails first 2 times, then succeeds)
      failureCount++
      if (failureCount <= 2) {
        return NextResponse.json(
          {
            error: `Random error occurred (attempt ${failureCount}/3). Please retry.`,
            code: "RANDOM_ERROR",
          },
          { status: 500 }
        )
      }
      // Reset and continue to success
      failureCount = 0
      // Fall through to success case
      break

    case "success":
    default:
      // Success case - return mock AI response
      break
  }

  // Success response
  return NextResponse.json({
    text: `Mock AI Analysis for "${nodeData.title}": This is a simulated response. The node appears to be a ${nodeData.type} type. Your message was: "${message}". This mock endpoint is working correctly! Try different scenarios using query parameters: ?scenario=network_error, ?scenario=random, etc.`,
    action: {
      type: "modify",
      field: "description",
      oldValue: nodeData.description || "",
      newValue: "Updated by mock AI: " + (nodeData.description || "No description"),
    },
  })
}

