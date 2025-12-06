import { NextResponse } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

// Schema definitions for AI response types
interface TextResponseSchema {
  type: "text" | "markdown"
  message: string
  followUpQuestions?: string[]
}

interface ActionResponseSchema {
  type: "actions"
  message: string
  actions: {
    type:
      | "create"
      | "modify"
      | "connect"
      | "delete"
      | "reorganize"
      | "create-group"
      | "add-section"
      | "update-section"
      | "delete-section"
    nodeType?: "base" | "goal" | "idea" | "action" | "risk" | "resource"
    title?: string
    description?: string
    sections?: { title: string; items: string[] }[]
    position?: { x: number; y: number }
    nodeId?: string
    field?: string
    newValue?: string | { title: string; items: string[] }[]
    sourceNodeId?: string
    targetNodeId?: string
    weight?: "strong" | "weak" | "uncertain" | "reverse"
    label?: string
    reason?: string
    nodeIds?: string[]
    groupTitle?: string
    color?: string
    size?: { width: number; height: number }
    sectionTitle?: string
    sectionId?: string
    items?: string[]
  }[]
}

interface FormFieldSchema {
  id: string
  label: string
  type: "input" | "radio" | "select" | "checkbox" | "textarea"
  placeholder?: string
  options?: { label: string; value: string }[]
  required?: boolean
  defaultValue?: string | string[]
}

interface FormStepSchema {
  id: string
  title: string
  description?: string
  fields: FormFieldSchema[]
}

interface FormResponseSchema {
  type: "form"
  title: string
  description?: string
  steps: FormStepSchema[]
}

interface CanvasContext {
  nodes: {
    id: string
    type: string
    title: string
    description: string
    sections: { title: string; items: string[] }[]
  }[]
  edges: {
    id: string
    source: string
    target: string
    sourceTitle?: string
    targetTitle?: string
    weight: string
    label?: string
  }[]
  selectedNodeId?: string
  comments?: {
    id: string
    content: string
    author: string
    targetNodeId?: string
  }[]
}

type RequestStrategy =
  | "simple_question"
  | "create_task"
  | "create_process"
  | "analyze"
  | "modify"
  | "collect_info"
  | "general"

const OUTPUT_SCHEMA_PROMPT = `
## OUTPUT FORMAT (CRITICAL - VALID JSON ONLY)

Respond with ONE of these JSON schemas:

### 1. Text/Markdown (questions, explanations, analysis)
{
  "type": "text" | "markdown",
  "message": "Response content with **markdown** support",
  "followUpQuestions": ["Optional suggestion 1", "Optional suggestion 2"]
}

### 2. Actions (canvas modifications - user sees Approve/Reject)
{
  "type": "actions",
  "message": "Brief description of what will be done",
  "actions": [{
    "type": "create|modify|connect|delete|create-group|add-section|update-section|delete-section",
    "nodeType": "goal|idea|action|risk|resource|base",
    "title": "Node Title",
    "description": "Brief description",
    "sections": [{"title": "Section", "items": ["Item 1", "Item 2"]}],
    "position": {"x": 100, "y": 100},
    "groupTitle": "Group Title (for create-group)",
    "color": "#hexcode (for create-group)",
    "sourceNodeId": "id (optional, use sourceTitle if ID unknown)",
    "targetNodeId": "id (optional, use targetTitle if ID unknown)",
    "sourceTitle": "Node Title (preferred for connect - use exact title from context)",
    "targetTitle": "Node Title (preferred for connect - use exact title from context)",
    "nodeId": "id",
    "weight": "strong|weak|uncertain|reverse (required for connect)",
    "label": "Connection label (required for connect - explains the relationship)",
    "reason": "Why this action is being taken"
  }]
}

### 3. Form (information collection - multi-step, 1-2 fields per step)
{
  "type": "form",
  "title": "Form Purpose",
  "description": "Why we need this information",
  "steps": [{
    "id": "step1",
    "title": "Step Title",
    "description": "What to provide in this step",
    "fields": [{
      "id": "fieldId",
      "label": "Clear question (under 10 words)",
      "type": "input|radio|select|checkbox|textarea",
      "placeholder": "Helpful hint text",
      "options": [{"label": "Display Text", "value": "value"}],
      "required": true
    }]
  }]
}

## DECISION LOGIC (CRITICAL):

1. **WHEN TO USE FORM (High Priority for "I want to..." requests)**:
   - IF user says "I want to open a coffee shop" (or similar goal) AND details are missing -> **RETURN FORM**
   - IF user request is broad/vague -> **RETURN FORM** to gather specific requirements.
   - Do NOT create a single "Goal" node for a complex request. Collect info first.

2. **WHEN TO USE ACTIONS**:
   - ONLY when you have specific enough details to build a useful structure.
   - OR when user explicitly asks to "add a node" or "connect X and Y".
   - OR after a Form submission provides the necessary context.

3. **WHEN TO USE TEXT**:
   - For simple Q&A or clarifications.

## FORM DESIGN RULES (STRICT):

1. **MAXIMUM 1-2 FIELDS PER STEP** - Never exceed 2 fields in a single step
2. **FIELD TYPE SELECTION**:
   - Yes/No question → radio with 2 options
   - 2-6 mutually exclusive options → radio
   - 7+ options → select dropdown
   - Multiple selections allowed → checkbox
   - Short free text (name, title) → input with placeholder
   - Long free text (description) → textarea with placeholder

3. **STEP ORGANIZATION** (max 4 steps total):
   - Step 1: Primary question (the core what/who)
   - Step 2: Secondary details (how/when)
   - Step 3: Constraints or preferences (optional)
   - Step 4: Confirmation if complex (optional)

4. **REQUIRED ATTRIBUTES**:
   - Every field must have: id, label, type, required
   - Input/textarea must have: placeholder
   - Radio/select/checkbox must have: options array

## RESPONSE SELECTION LOGIC:
- User asks a question → "text" or "markdown"
- User requests canvas modification (AND has details) → "actions" 
- User states a Goal but lacks details -> "form" (CRITICAL: Don't just create one node)
- Need user input before action → "form" first
- Complex workflow request → "form" to gather requirements, then "actions"

CRITICAL: Output ONLY valid JSON. No text before or after the JSON object.
`

const SCR_FRAMEWORK_PROMPT = `
## WORKFLOW VISUALIZATION GUIDELINES

When creating workflows, focus on logical progression and clear grouping:

**1. LOGICAL PHASES (Groups)**:
- Create visual groups (create-group) for distinct phases or categories.
- Common phases: "Planning", "Execution", "Review" OR "Input", "Process", "Output".
- Use different colors for adjacent groups to distinguish them.
- **IMPORTANT**: Ensure group dimensions are large enough to contain their child nodes.
  - Minimum size: 400x300 for small groups.
  - Standard size: 600x400 for main phases.

**2. SEQUENTIAL FLOW (Connections)**:
- Connect nodes to show the order of operations.
- Use "strong" lines for main path, "weak" for optional/secondary branches.
- **CRITICAL**: Every connection MUST have a label explaining the relationship (e.g., "next", "if yes", "triggers", "data flow").
- **CONNECTION IDENTIFICATION**: When creating connections, use sourceTitle and targetTitle with the exact node titles from the canvas context. This is more reliable than using node IDs. Example JSON:
  {
    "type": "connect",
    "sourceTitle": "Market Research",
    "targetTitle": "Business Plan",
    "weight": "strong",
    "label": "leads to"
  }

**3. NODE ATTRIBUTES**:
- **Title**: Action-oriented and specific.
- **Description**: Brief explanation of *what* happens at this step.
- **Sections**: Use for checklists, data requirements, or sub-steps.

**POSITIONING STRATEGY**:
- **Flow Direction**: generally Left-to-Right (X-axis increases).
- **Inside Groups**:
  - Place nodes comfortably inside their parent group's boundaries.
  - Leave padding (>=50px) from group edges.
  - Space sibling nodes vertically (Y-axis) or horizontally (X-axis) to avoid overlap.

**LIMITS**: Maximum 15 nodes per request.
`

function buildSystemPrompt(methodology: string, canvasContext?: CanvasContext, strategy?: RequestStrategy): string {
  let contextSection = ""

  if (canvasContext && canvasContext.nodes && canvasContext.nodes.length > 0) {
    contextSection = `
## CURRENT CANVAS STATE

**Nodes (${canvasContext.nodes.length}):**
${canvasContext.nodes.map((n) => `- [${n.id}] ${(n.type || "base").toUpperCase()}: "${n.title || "Untitled"}" ${n.description ? `- ${n.description}` : ""}`).join("\n")}

**Connections (${canvasContext.edges?.length || 0}):**
${canvasContext.edges?.map((e) => {
  const sourceTitle = (e as any).sourceTitle || e.source
  const targetTitle = (e as any).targetTitle || e.target
  return `- "${sourceTitle}" → "${targetTitle}" (${e.weight}${e.label ? `: "${e.label}"` : ""})`
}).join("\n") || "None"}

${canvasContext.selectedNodeId ? `**Currently Selected:** ${canvasContext.selectedNodeId}` : ""}

${
  canvasContext.comments?.length
    ? `**User Comments (HIGH PRIORITY):**\n${canvasContext.comments.map((c) => `- "${c.content}" ${c.targetNodeId ? `(on node ${c.targetNodeId})` : "(canvas-wide)"}`).join("\n")}`
    : ""
}
`
  } else {
    contextSection = "\n## CURRENT CANVAS STATE\nThe canvas is empty. User is starting fresh.\n"
  }

  const frameworkPrompt = strategy === "create_process" ? SCR_FRAMEWORK_PROMPT : ""

  return `You are an AI assistant for a visual canvas-based workflow builder application.

## AVAILABLE NODE TYPES
- **base**: Generic node (gray) - for miscellaneous content
- **goal**: Objective node (blue) - for targets and goals
- **idea**: Idea node (yellow) - for concepts and alternatives
- **action**: Action node (green) - for tasks and steps
- **risk**: Risk node (red) - for obstacles and threats
- **resource**: Resource node (purple) - for assets and requirements

## CONNECTION TYPES
- **strong**: Solid line - must-have dependency
- **weak**: Dashed line - nice-to-have relationship (default)
- **uncertain**: Dotted line - possible connection
- **reverse**: Bidirectional - mutual relationship

${frameworkPrompt}
${contextSection}
${methodology ? `## USER-DEFINED METHODOLOGY\n${methodology}\n` : ""}
${OUTPUT_SCHEMA_PROMPT}
`
}

function classifyRequest(prompt: string): RequestStrategy {
  const lowerPrompt = prompt.toLowerCase()

  if (/process|workflow|流程|plan|计划|pipeline|journey/.test(lowerPrompt)) return "create_process"
  if (/create|add|new|创建|添加|make|build/.test(lowerPrompt)) return "create_task"
  if (/analyze|review|分析|检查|evaluate|assess/.test(lowerPrompt)) return "analyze"
  if (/modify|change|update|修改|更新|edit|connect|link|连接|delete|remove|删除/.test(lowerPrompt)) return "modify"
  if (/help|how|what|why|帮助|怎么|什么|explain/.test(lowerPrompt)) return "simple_question"
  return "general"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, message, canvasContext, methodology, formData } = body
    console.log(prompt, message, methodology)
    const userPrompt = prompt || message || ""

    if (!userPrompt && !formData) {
      return NextResponse.json({
        type: "text",
        message: "Please provide a message.",
        actions: [],
        requiresConfirmation: false,
      })
    }

    const strategy = classifyRequest(userPrompt)

    // Get API configuration from environment variables
    const apiKey = process.env.OPENAI_API_KEY
    const baseURL = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1"
    const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini"

    if (!apiKey) {
      return NextResponse.json({
        type: "text",
        message: "AI is not configured. Please set OPENAI_API_KEY in environment variables.",
        actions: [],
        requiresConfirmation: false,
      })
    }

    const systemPrompt = buildSystemPrompt(methodology || "", canvasContext, strategy)

    // Handle form submission follow-up
    let fullPrompt = userPrompt
    if (formData) {
      fullPrompt = `User submitted form with the following data:
${JSON.stringify(formData, null, 2)}

Original request: ${userPrompt}

Based on this information:
1. If you have enough information, create the canvas elements (Actions) or provide the answer (Text/Markdown).
2. If you need more specific information to fulfill the request, ask follow-up questions (Form or Text).
3. If the user's input changes the direction, adapt accordingly.

Proceed with the most appropriate response.`
    }

    try {
      // Initialize LangChain ChatOpenAI
      const chat = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: modelName,
        temperature: 0.7,
        configuration: {
          baseURL: baseURL,
        },
      })

      // Send messages using LangChain
      const response = await chat.invoke([new SystemMessage(systemPrompt), new HumanMessage(fullPrompt)])

      const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content)
      console.log(text)
      // Parse JSON response from AI
      let parsed: Record<string, unknown>
      try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          // If no JSON found, wrap the text response
          parsed = { type: "text", message: text }
        }
      } catch {
        // If JSON parsing fails, treat as text response
        parsed = { type: "text", message: text }
      }

      // Normalize and validate response structure
      const responseType = parsed.type || "text"
      const normalizedResponse = {
        type: responseType,
        message: (parsed.message as string) || (parsed.text as string) || "",
        actions: (parsed.actions as unknown[]) || [],
        form: responseType === "form" ? parsed : undefined, // Ensure form data is passed correctly
        steps: parsed.steps,
        title: parsed.title,
        description: parsed.description,
        followUpQuestions: parsed.followUpQuestions,
        requiresConfirmation: responseType === "actions" && Array.isArray(parsed.actions) && parsed.actions.length > 0,
      }

      return NextResponse.json(normalizedResponse)
    } catch (apiError) {
      console.error("LangChain API error:", apiError)

      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error"

      // Return user-friendly error
      return NextResponse.json({
        type: "text",
        message: `AI request failed: ${errorMessage}. Please check your API configuration.`,
        actions: [],
        requiresConfirmation: false,
      })
    }
  } catch (error) {
    console.error("Route error:", error)
    return NextResponse.json({
      type: "text",
      message: "Sorry, an error occurred processing your request. Please try again.",
      actions: [],
      requiresConfirmation: false,
    })
  }
}
