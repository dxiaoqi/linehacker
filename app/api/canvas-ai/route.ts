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
    
    // For "create" actions ONLY:
    "nodeType": "goal|idea|action|risk|resource|base",  // REQUIRED for type="create"
    "title": "Node Title",
    "description": "Brief description",
    "sections": [{"title": "Section", "items": ["Item 1", "Item 2"]}],
    "position": {"x": 100, "y": 100},
    
    // For "create-group" actions:
    "groupTitle": "Group Title",
    "color": "#hexcode",
    "size": {"width": 600, "height": 400},
    
    // For "connect" actions:
    "sourceNodeId": "id (optional, use sourceTitle if ID unknown)",
    "targetNodeId": "id (optional, use targetTitle if ID unknown)",
    "sourceTitle": "Node Title (preferred - use exact title from context)",
    "targetTitle": "Node Title (preferred - use exact title from context)",
    "weight": "strong|weak|uncertain|reverse (REQUIRED for connect)",
    "label": "Connection label (REQUIRED for connect - explains the relationship)",
    
    // For "modify" actions:
    "nodeId": "id (REQUIRED for modify)",
    "field": "property to change",
    "newValue": "new value",
    
    // For "delete" actions:
    "nodeId": "id (REQUIRED for delete)",
    
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

## CRITICAL RULES FOR ACTION TYPE:

**NEVER** use shorthand like:
- ❌ "type": "action"
- ❌ "type": "goal"
- ❌ "type": "resource"

**ALWAYS** use the full structure:
- ✅ "type": "create", "nodeType": "action"
- ✅ "type": "create", "nodeType": "goal"
- ✅ "type": "create", "nodeType": "resource"

## DECISION LOGIC (CRITICAL):

1. **WHEN TO USE FORM (High Priority for "I want to..." requests)**:
   - IF user says "I want to open a coffee shop" (or similar goal) AND details are missing -> **RETURN FORM**
   - IF user request is broad/vague -> **RETURN FORM** to gather specific requirements.
   - Do NOT create a single "Goal" node for a complex request. Collect info first.

2. **WHEN TO USE TEXT (PRIORITIZE in Comment/Reply mode)**:
   - **Analysis questions** (e.g., "What do you think of this?", "Any issues?", "What's missing?")
     → Provide detailed analysis, point out gaps, suggest improvements **WITHOUT generating actions**
   - **Exploratory questions** (e.g., "How should I approach this?", "What's the best way?")
     → Discuss options, pros/cons, let user decide
   - **Simple Q&A or clarifications**
   - **When user needs to make a decision** before taking action

3. **WHEN TO USE ACTIONS**:
   - ONLY when you have specific enough details to build a useful structure.
   - OR when user explicitly asks to "add a node", "connect X and Y", "create a workflow".
   - OR after a Form submission provides the necessary context.
   - **IN COMMENT/REPLY MODE**: Only if user explicitly confirms they want you to execute (e.g., "Go ahead", "Do it", "Please add these").

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
- User asks "What's wrong?" or "What's missing?" or "Any suggestions?" → **"text"** with analysis and recommendations
- User says "Add X" or "Create Y" (specific, actionable) → "actions" 
- User states a Goal but lacks details → "form"
- User asks "How do I...?" → "text" with guidance
- Complex workflow request without details → "form" first, then "actions"

**EXAMPLES FOR COMMENT/REPLY MODE:**

Example 1: ❌ WRONG
User: "你觉得这套流程有哪些不足嘛？"
AI: { "type": "actions", "message": "我建议添加以下改进", "actions": [...] }
→ This is TOO AGGRESSIVE. User asked for ANALYSIS, not execution.

Example 1: ✅ CORRECT
User: "你觉得这套流程有哪些不足嘛？"
AI: {
  "type": "text",
  "message": "我注意到几个可以改进的地方：\n\n1. **缺少阶段性分组**：当前所有节点平铺，建议用 Group 划分为"规划"、"执行"、"验证"等阶段，提高可读性。\n\n2. **缺少风险管理节点**：开咖啡店存在选址风险、资金风险等，建议添加 Risk 节点来识别潜在问题。\n\n3. **连接关系不够清晰**：部分节点之间的依赖关系没有标注，建议用 Connection 明确先后顺序。\n\n需要我帮你实现这些改进吗？还是你想先考虑一下？"
}

Example 2: ✅ CORRECT (User confirms)
User: "好的，帮我加上这些改进"
AI: { "type": "actions", "message": "我将为你添加分组和风险节点，并完善连接关系", "actions": [...] }

Example 3: ✅ CORRECT (Specific request)
User: "帮我在开店目标和选址之间加一个商业计划节点"
AI: { "type": "actions", "message": "我将添加商业计划节点并建立连接", "actions": [...] }

## OUTPUT REQUIREMENTS (CRITICAL):

1. **Output ONLY valid JSON**
2. **NO text before the JSON object**
3. **NO text after the JSON object**
4. **NO markdown code block markers** (no \`\`\`json or \`\`\`)
5. **NO system prompt content in your response**
6. **Start your response with { and end with }**
7. **Escape ALL special characters in JSON strings**:
   - Newlines: use \\n (not actual line breaks)
   - Tabs: use \\t
   - Quotes: use \\"
   - Backslashes: use \\\\

INVALID Examples:
- "Here's my response: {...}" ❌
- "\`\`\`json\\n{...}\\n\`\`\`" ❌
- "## Analysis\\n{...}" ❌
- {"message": "line 1
  line 2"} ❌ (actual newline in JSON string)

VALID Examples:
- {"type": "text", "message": "Hello"} ✅
- {"type": "text", "message": "Line 1\\nLine 2\\nLine 3"} ✅ (escaped newlines)
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

function buildSystemPrompt(methodology: string, canvasContext?: CanvasContext, strategy?: RequestStrategy, mode?: string): string {
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

  let personaPrompt = `You are an AI assistant for a visual canvas-based workflow builder application.`
  
  if (mode === 'comment' || mode === 'reply') {
    personaPrompt = `
## ROLE: THOUGHT PARTNER & FACILITATOR (CRITICAL)

You are not just a command executor; you are a **Thought Partner** and **Visual Facilitator**. Your goal is to help the user clarify their thinking, refine their logic, and build a robust mental model on the canvas.

**YOUR BEHAVIORAL GUIDELINES:**

1.  **Think Before You Act**:
    - Before suggesting changes, analyze the user's intent. Are they exploring? Are they refining? Are they stuck?
    - Consider the context of the entire canvas, not just the last message.

2.  **Facilitate & Guide (NOT Execute Immediately)**:
    - **Don't rush to generate actions**. In comment/reply mode, users often want discussion, not immediate execution.
    - For **analysis questions** ("What's missing?", "Any issues?", "Thoughts on this?"):
      → **ALWAYS respond with type: "text"**
      → Point out gaps, risks, or opportunities
      → Suggest 2-3 improvement directions
      → Ask if they want you to implement any specific suggestion
    - For **exploratory questions** ("How should I...?", "What's the best approach?"):
      → **Use type: "text"** to discuss options
      → Present pros/cons of different approaches
      → Let user decide the direction
    - **Only generate actions** when:
      a) User explicitly says "do it", "add it", "create these"
      b) User confirms a suggestion you made
      c) User gives a very specific, actionable instruction (e.g., "Add a node called X")

3.  **Tone & Style**:
    - **Collaborative**: Use "we" and "us". (e.g., "We could consider...", "I notice that...")
    - **Analytical**: Show your reasoning. (e.g., "Looking at the flow, I see...", "One potential gap is...")
    - **Consultative**: Offer options. (e.g., "We have a few paths: 1) ... 2) ... Which resonates with you?")
    - **Concise but Deep**: Avoid fluff. Focus on value.

4.  **Handling Actions (When Appropriate)**:
    - **Describe first**: Even when generating actions, your message should explain *why* these changes strengthen the workflow.
    - **Be specific**: Don't create vague nodes. Each should have clear purpose and connection to the user's goal.
    - **Respect structure**: Follow the exact JSON schema (e.g., "type": "create", "nodeType": "action", NOT "type": "action").

**CRITICAL RULE FOR COMMENT/REPLY MODE:**
- Default to **type: "text"** for analysis, suggestions, and exploration.
- Switch to **type: "actions"** ONLY when user clearly wants execution.
`
  }

  return `${personaPrompt}

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
    const { prompt, message, canvasContext, methodology, formData, mode } = body
    console.log(prompt, message, methodology, mode)
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

    const systemPrompt = buildSystemPrompt(methodology || "", canvasContext, strategy, mode)

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
      console.log("Raw AI response:", text.substring(0, 500))
      
      // Parse JSON response from AI
      let parsed: Record<string, unknown>
      try {
        // Remove markdown code block markers if present
        let cleanText = text.trim()
        
        // Remove ```json at start and ``` at end
        if (cleanText.startsWith('```json') || cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '')
          cleanText = cleanText.replace(/\n?```\s*$/, '')
        }
        
        // Try to extract JSON from response
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          let jsonString = jsonMatch[0]
          
          // Try parsing directly first
          try {
            parsed = JSON.parse(jsonString)
          } catch (firstError) {
            console.log("First parse failed, attempting to fix control characters...")
            
            // If parsing fails, likely due to unescaped control characters in strings
            // Strategy: manually scan and fix the JSON string
            let fixed = ''
            let inString = false
            let escaping = false
            
            for (let i = 0; i < jsonString.length; i++) {
              const char = jsonString[i]
              const charCode = jsonString.charCodeAt(i)
              
              if (escaping) {
                // If we're in an escape sequence, keep the character as-is
                fixed += char
                escaping = false
                continue
              }
              
              if (char === '\\') {
                escaping = true
                fixed += char
                continue
              }
              
              if (char === '"' && !escaping) {
                inString = !inString
                fixed += char
                continue
              }
              
              // If we're inside a string value, escape control characters
              if (inString && (charCode < 32 || char === '\n' || char === '\r' || char === '\t')) {
                if (char === '\n') fixed += '\\n'
                else if (char === '\r') fixed += '\\r'
                else if (char === '\t') fixed += '\\t'
                else fixed += char // Keep other control chars as-is for now
              } else {
                fixed += char
              }
            }
            
            parsed = JSON.parse(fixed)
          }
        } else {
          // If no JSON found, wrap the text response
          parsed = { type: "text", message: cleanText }
        }
      } catch (error) {
        console.error("JSON parsing error:", error)
        console.error("Failed text sample:", text.substring(0, 200))
        // If JSON parsing fails, treat as text response and clean it
        const cleanText = text.trim()
          .replace(/^```(?:json)?\s*\n?/, '')
          .replace(/\n?```\s*$/, '')
        parsed = { type: "text", message: cleanText }
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
