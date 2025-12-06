import { generateText } from "ai"
import type { CanvasNodeData } from "@/lib/types/canvas"

export async function POST(req: Request) {
  const { nodeData, message } = (await req.json()) as {
    nodeData: CanvasNodeData
    message: string
  }

  const systemPrompt = `You are an AI assistant analyzing a node in a visual workflow canvas.

Current node details:
- Type: ${nodeData.type}
- Title: ${nodeData.title}
- Description: ${nodeData.description || "No description"}
- Fields: ${JSON.stringify(nodeData.fields, null, 2)}
- Info Items: ${nodeData.infoItems.map((i) => `${i.title}: ${i.content}`).join(", ") || "None"}

You can suggest modifications by including [MODIFY field_name: old_value -> new_value] in your response.
You can suggest new connections by including [CONNECT to_node_type: reason] in your response.
You can suggest new nodes by including [CREATE node_type: description] in your response.

Analyze the node and provide helpful insights, suggestions, or answer the user's question. Be specific and actionable.`

  const { text } = await generateText({
    model: "openai/gpt-5-mini",
    system: systemPrompt,
    prompt: message,
    maxOutputTokens: 600,
    temperature: 0.7,
  })
  console.log(222)
  // Parse action from response
  let action: { type: string; field?: string; oldValue?: string; newValue?: string } | undefined

  const modifyMatch = text.match(/\[MODIFY (\w+): (.+?) -> (.+?)\]/i)
  if (modifyMatch) {
    action = {
      type: "modify",
      field: modifyMatch[1],
      oldValue: modifyMatch[2],
      newValue: modifyMatch[3],
    }
  }

  const connectMatch = text.match(/\[CONNECT (\w+): (.+?)\]/i)
  if (connectMatch) {
    action = {
      type: "connect",
      field: connectMatch[1],
      newValue: connectMatch[2],
    }
  }

  const createMatch = text.match(/\[CREATE (\w+): (.+?)\]/i)
  if (createMatch) {
    action = {
      type: "create",
      field: createMatch[1],
      newValue: createMatch[2],
    }
  }

  // Clean response text
  const cleanText = text
    .replace(/\[MODIFY .+?\]/gi, "")
    .replace(/\[CONNECT .+?\]/gi, "")
    .replace(/\[CREATE .+?\]/gi, "")
    .trim()

  return Response.json({
    text: cleanText,
    action,
  })
}
