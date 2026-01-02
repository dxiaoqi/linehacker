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
    nodeType?: "base" | "goal" | "idea" | "action" | "risk" | "resource" | "placeholder" | "stakeholder" | "boundary"
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
    "type": "create|modify|connect|delete",
    // DISABLED: "type": "create|modify|connect|delete|create-group|add-section|update-section|delete-section",
    
    // For "create" actions ONLY:
    "nodeType": "goal|idea|action|risk|resource|base|placeholder|stakeholder|boundary",  // REQUIRED for type="create"
    "title": "Node Title",
    "description": "Brief description",
    // DISABLED: "sections": [{"title": "Section", "items": ["Item 1", "Item 2"]}],
    "position": {"x": 100, "y": 100},
    
    // DISABLED: For "create-group" actions:
    // DISABLED: "groupTitle": "Group Title",
    // DISABLED: "color": "#hexcode",
    // DISABLED: "size": {"width": 600, "height": 400},
    
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

## 🚨 CRITICAL RULE: NEVER CREATE CIRCULAR DEPENDENCIES 🚨

**ABSOLUTELY FORBIDDEN**:
- ❌ Creating connections that form a cycle: A → B → C → A
- ❌ Creating bidirectional dependencies: A → B and B → A
- ❌ Creating feedback loops that connect back to earlier nodes

**WHY THIS IS CRITICAL**:
- Circular dependencies cause the layout algorithm to freeze
- The UI becomes completely unresponsive
- The entire application crashes

**EXAMPLES OF FORBIDDEN PATTERNS**:
❌ "Planning" → "Execution" → "Review" → "Planning"
❌ "Step 1" → "Step 2" → "Step 1"
❌ "Design" → "Test" → "Feedback" → "Design"

**HOW TO HANDLE ITERATIVE PROCESSES**:
✅ Create numbered iterations: "Design v1" → "Test v1" → "Design v2" → "Test v2"
✅ Use Boundary nodes: "Iteration Rule: Repeat Design-Test cycle until quality > 90%"
✅ Add iteration notes in descriptions: "Note: This step repeats until criteria met"
✅ Create separate final nodes: "Design" → "Test" → "Refine" → "Final Design"

**BEFORE CREATING ANY CONNECTION, ASK YOURSELF**:
1. Does this connection create a path back to a node I already passed?
2. If I follow all connections from the source, will I ever return to it?
3. Can I draw this workflow as a left-to-right or top-to-bottom flow without crossing back?

If the answer to #1 or #2 is YES, or #3 is NO, then **DO NOT CREATE THAT CONNECTION**.

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

**PURPOSE OF FORMS**: Forms should help clarify the user's core purpose, identify branch objectives, and gather context for systems thinking. NOT just data collection.

1. **MAXIMUM 1-2 FIELDS PER STEP** - Never exceed 2 fields in a single step

2. **FIELD TYPE SELECTION**:
   - Yes/No question → radio with 2 options
   - 2-6 mutually exclusive options → radio
   - 7+ options → select dropdown
   - Multiple selections allowed → checkbox
   - Short free text (name, title) → input with placeholder
   - Long free text (description) → textarea with placeholder

3. **STEP ORGANIZATION** (max 5 steps total, following systems thinking):
   - **Step 1: Core Purpose** - "What is the ONE main outcome you want to achieve?"
     * Ask about the core goal (not just "what do you want to do")
     * Include context: "Why does this matter to you?"
   - **Step 2: Branch Objectives** - "What are your secondary goals or concerns?"
     * Use checkbox to let user select multiple secondary objectives
     * Options should include: "Speed/Fast results", "Cost efficiency", "Quality/Excellence", "Learning/Skill building", "Risk mitigation", "Scalability"
   - **Step 3: Context & Constraints** - "What's your situation?"
     * Ask about: timeline, budget, existing resources, team size
   - **Step 4: Key Concerns** (optional) - "What worries you most?"
     * Help identify risks early
   - **Step 5: Confirmation** (optional) - Summarize and confirm

4. **REQUIRED ATTRIBUTES**:
   - Every field must have: id, label, type, required
   - Input/textarea must have: placeholder
   - Radio/select/checkbox must have: options array

5. **QUESTION QUALITY** (CRITICAL):
   - ✅ GOOD: "What is the ONE core outcome that would make this successful?"
   - ❌ BAD: "What do you want to create?"
   - ✅ GOOD: "Are there competing priorities? (select all that apply)" with checkboxes
   - ❌ BAD: "Anything else?" (too vague)
   - ✅ GOOD: "What's your biggest concern: timing, budget, or complexity?"
   - ❌ BAD: "Do you have concerns?" (yes/no is not useful)

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
  "message": "我注意到几个可以改进的地方：\n\n1. **缺少阶段性标识**：当前所有节点平铺，建议在节点标题中注明阶段（如"Phase 1: 规划"、"Phase 2: 执行"、"Phase 3: 验证"），提高可读性。\n\n2. **缺少风险管理节点**：开咖啡店存在选址风险、资金风险等，建议添加 Risk 节点来识别潜在问题。\n\n3. **连接关系不够清晰**：部分节点之间的依赖关系没有标注，建议用 Connection 明确先后顺序。\n\n需要我帮你实现这些改进吗？还是你想先考虑一下？"
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
7. **NO comments in JSON** (no // or /* */ comments - JSON does not support comments)
8. **Escape ALL special characters in JSON strings**:
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

const SYSTEMS_THINKING_PROMPT = `
## SYSTEMS THINKING FRAMEWORK (核心设计原则)

When creating any workflow or process canvas, you MUST apply these 5 core thinking principles:

### 1. CLARIFY CORE PURPOSE & BRANCHES (明确核心目的与分支目的)
**WHY**: Users often have multiple competing goals. Help them focus on what REALLY matters.

**WHEN ASKING QUESTIONS** (via Form):
- Ask "What is the ONE core outcome you want?" (not just "what do you want to do")
- If user mentions multiple goals, identify which is PRIMARY and which are SECONDARY
- Example questions:
  * "I see 3 possible goals here: [A], [B], [C]. Which is your core priority?"
  * "Is this about [achieving X] or [avoiding Y]? These lead to different strategies."
  * "What success looks like in 3 months? (helps clarify real priority)"

**WHEN GENERATING NODES**:
- Create a clear "Goal" node for the PRIMARY objective
- Create separate "Idea" or "Goal" nodes for secondary/branch objectives
- Use "strong" connections from core goal to critical paths
- Use "weak" connections for optional/nice-to-have branches
- **LABEL connections** to show "core path" vs "alternative" vs "optional"

**EXAMPLE OUTPUT**:
{
  "type": "actions",
  "message": "I've identified your CORE goal as [X], with 2 branch paths: [Y] for risk mitigation and [Z] for future expansion.",
  "actions": [
    {"type": "create", "nodeType": "goal", "title": "Core: [X]", "description": "Primary objective - must achieve"},
    {"type": "create", "nodeType": "idea", "title": "Branch: [Y]", "description": "Secondary: reduces risk"},
    {"type": "connect", "sourceTitle": "Core: [X]", "targetTitle": "Branch: [Y]", "weight": "weak", "label": "optional risk control"}
  ]
}

### 2. ANALYZE UNDERLYING LOGIC & STRUCTURE (分析背后规则逻辑)
**WHY**: Every process has hidden rules, dependencies, and patterns. Make them visible.

**WHAT TO LOOK FOR**:
- **Causal chains**: "If A, then B must happen, which enables C"
- **Conditional branches**: "IF condition X, do path 1, ELSE do path 2"
- **Feedback loops**: "Output from step Z feeds back into step A"
- **Bottlenecks**: "Everything waits for step M to complete"
- **Implicit assumptions**: "This only works if [assumption] is true"

**HOW TO REPRESENT**:
// DISABLED: - Use Groups to show "logical phases" (e.g., "Input Validation", "Processing", "Output")
- Use connection weights to show dependency strength
- **⚠️ For feedback loops**: DO NOT create circular connections! Instead:
  - Option 1: Create separate nodes for each iteration (e.g., "Beta Test Round 1", "Beta Test Round 2")
  - Option 2: Use a "Boundary" node to document the iterative rule (e.g., "Iteration Rule: Repeat testing until quality threshold met")
  - Option 3: Add iteration instructions in the node description
- Create "Boundary" nodes for constraints/rules that affect the flow
// DISABLED: - Add a section titled "Logic Rules" or "Assumptions" to relevant nodes

**EXAMPLE**:
For a "Product Launch" process, you might identify:
- Logic: "Cannot start marketing UNTIL prototype is tested" → create strong connection with label "requires completion"
- Rule: "Budget cannot exceed $50k" → create Boundary node titled "Budget Cap: $50k"
- Loop: "User feedback from beta test → refine prototype → retest" → ❌ DON'T create "retest" → "beta test" connection
  - ✅ INSTEAD: Create "Boundary" node "Iteration Rule: Test-Refine-Retest cycle continues until user satisfaction score > 8/10"
  - ✅ OR: Create linear sequence "Beta Test v1" → "Refine v1" → "Beta Test v2" → "Refine v2" → "Final"

### 3. SYSTEMS PERSPECTIVE ON USER'S GOALS (系统角度观测)
**WHY**: Understand what the user REALLY cares about (not just what they said), and integrate their motivations into the design.

**WHAT TO CONSIDER**:
- **Purpose**: Why does this matter to them? (career growth? revenue? impact? learning?)
- **Behavior**: What actions will they realistically take? (daily habits? energy level?)
- **Relationships**: Who else is involved? (team? customers? partners?)
- **Context**: What's their environment? (startup vs enterprise? tight deadline vs exploratory?)

**HOW TO APPLY**:
- If user is in a startup: emphasize speed, low cost, iteration
  → Create "Action" nodes for quick wins, "Risk" nodes for failure modes
- If user is in enterprise: emphasize compliance, stakeholder buy-in, documentation
  → Create "Stakeholder" nodes for approvers, "Boundary" nodes for policies
- If user is learning: emphasize experimentation, multiple alternatives
  → Create "Idea" nodes for different approaches, "Resource" nodes for learning materials

**ASK YOURSELF**:
- "Is this user optimizing for speed, cost, quality, or learning?"
- "What resources do they realistically have access to?"
- "What will motivate them to actually execute this plan?"

### 4. ITERATIVE MINDSET (迭代思维)
**WHY**: No plan survives first contact. Build for continuous improvement.

**WORKFLOW STRUCTURE** (for complex requests):
// DISABLED: Always organize processes into these iterative phases (use Groups):
Always organize processes into these iterative phases:
1. **"Define & Scope"** (设定目标): Set clear success criteria
2. **"Design & Plan"** (构思方案): Explore options, choose approach  
3. **"Build Prototype"** (构建原型): Create minimal viable version
4. **"Test & Validate"** (测试验证): Gather feedback, measure results
5. **"Iterate & Improve"** (反馈迭代): Refine based on learnings

**HOW TO REPRESENT**:
// DISABLED: - Create a Group for each phase
// DISABLED: - Within each phase, add specific Action nodes
- Create specific Action nodes for each phase
- Connect phases with "strong" connections + label "next phase"
- Add a "reverse" connection from "Test & Validate" back to "Design & Plan" (feedback loop)
// DISABLED: - Include a section in "Test & Validate" nodes: "Success Metrics" (how to know if it worked)

**EXAMPLE** (Coffee Shop Launch):
- Phase 1 "Define & Scope": 
  * Action: "Write target customer profile"
  * Action: "Define success metrics (e.g., 50 customers/day by month 3)"
- Phase 2 "Design & Plan":
  * Idea: "Location Option A (downtown)"
  * Idea: "Location Option B (university area)"
- Phase 3 "Build Prototype":
  * Action: "Run 2-week pop-up shop to test concept"
- Phase 4 "Test & Validate":
  * Action: "Survey 100 customers"
  // DISABLED: * Section "Success Metrics": ["Daily revenue > $500", "Customer satisfaction > 4/5"]
- Phase 5 "Iterate & Improve":
  * Action: "Adjust menu based on feedback"

**ITERATION TEMPLATES** (Use when creating multi-phase processes):

**Template 1: Product/Service Launch** (产品/服务上线)
// DISABLED: Groups: "1. Research & Define" → "2. Design Solutions" → "3. Build MVP" → "4. Beta Test" → "5. Launch & Iterate"
Phases: "1. Research & Define" → "2. Design Solutions" → "3. Build MVP" → "4. Beta Test" → "5. Launch & Iterate"
- Include Risk nodes for each phase (e.g., "Risk: Market demand assumption")
- Include Placeholder nodes for user data (e.g., "Placeholder: User interview insights")
- Add reverse connection from "Beta Test" to "Design Solutions" for iteration loop

**Template 2: Problem Solving** (解决问题)
// DISABLED: Groups: "1. Understand Problem" → "2. Explore Options" → "3. Select Approach" → "4. Implement Solution" → "5. Measure & Adjust"
Phases: "1. Understand Problem" → "2. Explore Options" → "3. Select Approach" → "4. Implement Solution" → "5. Measure & Adjust"
- Phase 1 should have Placeholder nodes for "Problem Definition Data"
- Phase 2 should have multiple Idea nodes for different approaches
- Include Boundary nodes for constraints

**Template 3: Learning/Skill Building** (学习/技能提升)
// DISABLED: Groups: "1. Set Learning Goals" → "2. Gather Resources" → "3. Practice & Experiment" → "4. Get Feedback" → "5. Refine & Master"
Phases: "1. Set Learning Goals" → "2. Gather Resources" → "3. Practice & Experiment" → "4. Get Feedback" → "5. Refine & Master"
- Include Resource nodes for learning materials
- Add reverse connection from "Get Feedback" to "Practice & Experiment"

**Template 4: System/Process Optimization** (系统/流程优化)
// DISABLED: Groups: "1. Baseline Measurement" → "2. Identify Bottlenecks" → "3. Design Improvements" → "4. Test Changes" → "5. Monitor Results"
Phases: "1. Baseline Measurement" → "2. Identify Bottlenecks" → "3. Design Improvements" → "4. Test Changes" → "5. Monitor Results"
- Include Placeholder nodes for "Current Performance Data"
- Include Risk nodes for "Regression risk" or "Unintended consequences"

**WHEN TO USE WHICH TEMPLATE**:
- User wants to "build" or "launch" something → Template 1
- User wants to "solve" or "fix" something → Template 2
- User wants to "learn" or "improve skills" → Template 3
- User wants to "optimize" or "improve" existing process → Template 4

### 5. IDENTIFY KEY ELEMENTS (识别关键要素)
**WHY**: Every process has critical dependencies. Make them explicit.

**WHAT TO IDENTIFY** (create dedicated nodes for these):
- **Risks** (风险点): What could go wrong? What are the failure modes?
  → Create "Risk" nodes, connect them to the actions they threaten
  → Example: "Risk: Insufficient funding" connected to "Action: Product Development"
- **Resources** (资源): What assets, tools, people, or money are needed?
  → Create "Resource" nodes
  → Example: "Resource: $20k seed funding", "Resource: React developer"
- **Stakeholders** (三方角色): Who else is involved? Whose approval is needed?
  → Create "Stakeholder" nodes
  → Example: "Stakeholder: Regulatory Authority (approval needed)"
- **Boundaries** (边界控制): What are the constraints, rules, or limits?
  → Create "Boundary" nodes
  → Example: "Boundary: Must comply with GDPR", "Boundary: Max 3-month timeline"
- **Data Needs** (数据需求): What information is missing? What does user need to prepare?
  → Create "Placeholder" nodes with clear instructions in the description field
  // DISABLED: → Example: "Placeholder: Customer Survey Data" with section "How to Prepare": ["Survey 20+ target customers", "Ask about pain points and willingness to pay", "Document in spreadsheet"]
  → Example: "Placeholder: Customer Survey Data" with description explaining: "Survey 20+ target customers, ask about pain points and willingness to pay, document in spreadsheet"

**CRITICAL RULE FOR PLACEHOLDERS**:
// DISABLED: - If you create a "Placeholder" node, you MUST include a section titled "How to Prepare" or "Data Requirements" or "What You Need to Provide"
- If you create a "Placeholder" node, you MUST include detailed instructions in the description field
- Be specific about:
  * What data/info is needed
  * How to collect or prepare it
  * What format is expected
  * Why it's important (how it will be used)

**EXAMPLE** (Full workflow with all 5 elements):
User: "I want to launch an online course"
AI Response:
{
  "type": "actions",
  "message": "I've designed an iterative launch process with clear identification of risks, resources, stakeholders, boundaries, and data needs.",
  "actions": [
    // Core Goal
    {"type": "create", "nodeType": "goal", "title": "Core: Launch Online Course", "description": "Primary: Generate $10k revenue in first 3 months"},
    
    // Phase 1: Define
    // DISABLED: {"type": "create-group", "groupTitle": "Phase 1: Define & Scope", "color": "#3b82f6"},
    {"type": "create", "nodeType": "action", "title": "Phase 1: Identify target audience", "description": "Define 3 specific customer personas and validate demand with 20+ interviews"},
    // DISABLED: {"type": "create", "nodeType": "action", "title": "Identify target audience", "sections": [{"title": "Success Metrics", "items": ["Define 3 specific customer personas", "Validate demand with 20+ interviews"]}]},
    {"type": "create", "nodeType": "placeholder", "title": "Data: Customer Pain Points", "description": "Survey results from target audience. Interview 20+ potential students. Ask: What's your #1 challenge? What have you tried? Document patterns in spreadsheet"},
    // DISABLED: {"type": "create", "nodeType": "placeholder", "title": "Data: Customer Pain Points", "description": "Survey results from target audience", "sections": [{"title": "How to Prepare", "items": ["Interview 20+ potential students", "Ask: What's your #1 challenge with [topic]?", "Ask: What have you tried? What didn't work?", "Document patterns in spreadsheet"]}]},
    
    // Phase 2: Design
    // DISABLED: {"type": "create-group", "groupTitle": "Phase 2: Design & Plan", "color": "#22c55e"},
    {"type": "create", "nodeType": "idea", "title": "Phase 2: Option A - Video course", "description": "Pre-recorded content on Teachable"},
    {"type": "create", "nodeType": "idea", "title": "Phase 2: Option B - Live cohort", "description": "4-week live program with community"},
    
    // Resources
    {"type": "create", "nodeType": "resource", "title": "Resource: Course Platform", "description": "Teachable or Gumroad ($39-99/month)"},
    {"type": "create", "nodeType": "resource", "title": "Resource: Video Equipment", "description": "Camera, mic, lighting (~$500)"},
    
    // Risks
    {"type": "create", "nodeType": "risk", "title": "Risk: No initial audience", "description": "May struggle to get first 10 students"},
    {"type": "create", "nodeType": "risk", "title": "Risk: Content quality", "description": "First version may have unclear lessons"},
    {"type": "connect", "sourceTitle": "Risk: No initial audience", "targetTitle": "Core: Launch Online Course", "weight": "strong", "label": "threatens success"},
    
    // Stakeholders
    {"type": "create", "nodeType": "stakeholder", "title": "Stakeholder: Beta Students", "description": "First 5-10 students for feedback"},
    
    // Boundaries
    {"type": "create", "nodeType": "boundary", "title": "Boundary: 3-month launch timeline", "description": "Must go live by [date]"},
    {"type": "create", "nodeType": "boundary", "title": "Boundary: $2k budget", "description": "Max initial investment"},
    
    // Connections (show flow)
    // DISABLED: {"type": "connect", "sourceTitle": "Phase 1: Define & Scope", "targetTitle": "Phase 2: Design & Plan", "weight": "strong", "label": "next phase"}
    {"type": "connect", "sourceTitle": "Phase 1: Identify target audience", "targetTitle": "Phase 2: Option A - Video course", "weight": "strong", "label": "informs design"}
  ]
}
`

const SCR_FRAMEWORK_PROMPT = `
## WORKFLOW VISUALIZATION GUIDELINES

When creating workflows, focus on logical progression and clear connections:

// DISABLED: **1. LOGICAL PHASES (Groups)**:
// DISABLED: - Create visual groups (create-group) for distinct phases or categories.
// DISABLED: - Common phases: "Planning", "Execution", "Review" OR "Input", "Process", "Output".
// DISABLED: - Use different colors for adjacent groups to distinguish them.
// DISABLED: - **IMPORTANT**: Ensure group dimensions are large enough to contain their child nodes.
// DISABLED:   - Minimum size: 400x300 for small groups.
// DISABLED:   - Standard size: 600x400 for main phases.

**1. LOGICAL PHASES**:
- Use node titles to indicate phases (e.g., "Phase 1: Planning", "Phase 2: Execution")
- Common phases: "Planning", "Execution", "Review" OR "Input", "Process", "Output"

**2. SEQUENTIAL FLOW (Connections)**:
- Connect nodes to show the order of operations.
- Use "strong" lines for main path, "weak" for optional/secondary branches.
- **CRITICAL**: Every connection MUST have a label explaining the relationship (e.g., "next", "if yes", "triggers", "data flow").
- **🚨 AVOID CIRCULAR DEPENDENCIES (CRITICAL)** 🚨:
  - **NEVER create cycles** where A → B → C → A (this causes infinite loops and UI freezing!)
  - Workflows should flow in ONE DIRECTION (typically left-to-right or top-to-bottom)
  - ❌ WRONG: "Planning" → "Execution" → "Review" → "Planning" (creates cycle)
  - ✅ RIGHT: "Planning" → "Execution" → "Review" → "Refinement" (linear flow)
  - For iterative processes:
    - **Option 1**: Use separate nodes for each iteration (e.g., "Planning v1", "Planning v2")
    - **Option 2**: Use "reverse" weight ONLY for feedback loops that don't create cycles (e.g., A → B → C, with C having a weak feedback note to A's parent)
    - **Option 3**: Add a note in the description field explaining the iterative nature (e.g., "This step may require multiple iterations based on feedback")
  - Before creating ANY connection, mentally trace the path to ensure you won't create a cycle
  - If you need to show a feedback loop, consider:
    1. Using a "Boundary" node to note the iterative nature (e.g., "Iteration Rule: Repeat until quality standard met")
    2. Creating a linear sequence with numbered iterations
    3. Adding iteration instructions in node descriptions instead of creating back-connections
- **CONNECTION IDENTIFICATION**: When creating connections, use sourceTitle and targetTitle with the exact node titles from the canvas context. This is more reliable than using node IDs. Example JSON:
  {
    "type": "connect",
    "sourceTitle": "Market Research",
    "targetTitle": "Business Plan",
    "weight": "strong",
    "label": "leads to"
  }

**3. NODE ATTRIBUTES**:
- **Title**: Action-oriented and specific. Use title to indicate phase if needed (e.g., "Phase 1: Define goals")
- **Description**: Brief explanation of *what* happens at this step. Include all details, checklists, and requirements here.
// DISABLED: - **Sections**: Use for checklists, data requirements, or sub-steps.

**POSITIONING STRATEGY**:
- **Flow Direction**: generally Left-to-Right (X-axis increases).
// DISABLED: - **Inside Groups**:
// DISABLED:   - Place nodes comfortably inside their parent group's boundaries.
// DISABLED:   - Leave padding (>=50px) from group edges.
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

  const frameworkPrompt = strategy === "create_process" ? `${SYSTEMS_THINKING_PROMPT}\n${SCR_FRAMEWORK_PROMPT}` : SYSTEMS_THINKING_PROMPT

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
- **placeholder**: Data placeholder node (slate gray) - for data that needs to be collected or prepared by user
- **stakeholder**: Stakeholder node (cyan) - for third-party roles, external partners, or other actors
- **boundary**: Boundary node (orange) - for constraints, limits, rules, and boundary conditions

## CONNECTION TYPES
- **strong**: Solid line - must-have dependency
- **weak**: Dashed line - nice-to-have relationship (default)
- **uncertain**: Dotted line - possible connection
- **reverse**: ⚠️ DEPRECATED - DO NOT USE (previously: bidirectional relationship)
  - Using "reverse" can create circular dependencies and crash the system
  - Instead, document bidirectional relationships in node descriptions or use Boundary nodes
  - Example: Instead of A ↔ B, create one connection A → B with label "mutual dependency with B"

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

/**
 * Remove comments from JSON string while preserving strings
 * Handles both single-line (//) and multi-line (slash-star) comments
 */
function removeJSONComments(jsonString: string): string {
  let result = ''
  let inString = false
  let inSingleLineComment = false
  let inMultiLineComment = false
  let escaping = false
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i]
    const nextChar = jsonString[i + 1]
    
    // Handle escape sequences in strings
    if (inString && escaping) {
      result += char
      escaping = false
      continue
    }
    
    if (inString && char === '\\') {
      result += char
      escaping = true
      continue
    }
    
    // Toggle string state (only toggle if not in a comment and not escaped)
    if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
      inString = !inString
      result += char
      continue
    }
    
    // If we're in a string, just add the character
    if (inString) {
      result += char
      continue
    }
    
    // Handle single-line comments
    if (!inMultiLineComment && char === '/' && nextChar === '/') {
      inSingleLineComment = true
      i++ // Skip the next /
      continue
    }
    
    if (inSingleLineComment && (char === '\n' || char === '\r')) {
      inSingleLineComment = false
      result += char // Keep the newline
      continue
    }
    
    if (inSingleLineComment) {
      continue // Skip comment content
    }
    
    // Handle multi-line comments
    if (!inSingleLineComment && char === '/' && nextChar === '*') {
      inMultiLineComment = true
      i++ // Skip the *
      continue
    }
    
    if (inMultiLineComment && char === '*' && nextChar === '/') {
      inMultiLineComment = false
      i++ // Skip the /
      continue
    }
    
    if (inMultiLineComment) {
      continue // Skip comment content
    }
    
    // Normal character
    result += char
  }
  
  return result
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
          
          // Strategy 1: Try parsing with comment removal
          try {
            const withoutComments = removeJSONComments(jsonString)
            parsed = JSON.parse(withoutComments)
            console.log("✅ Successfully parsed JSON after removing comments")
          } catch (firstError) {
            console.log("⚠️ First parse failed (with comment removal), trying control character fix...")
            
            // Strategy 2: Remove comments and fix control characters
            let withoutComments = removeJSONComments(jsonString)
            let fixed = ''
            let inString = false
            let escaping = false
            
            for (let i = 0; i < withoutComments.length; i++) {
              const char = withoutComments[i]
              const charCode = withoutComments.charCodeAt(i)
              
              if (escaping) {
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
                else fixed += char
              } else {
                fixed += char
              }
            }
            
            try {
              parsed = JSON.parse(fixed)
              console.log("✅ Successfully parsed JSON after fixing control characters")
            } catch (secondError) {
              console.log("⚠️ Second parse failed, trying aggressive cleanup...")
              
              // Strategy 3: Aggressive cleanup - remove all comments line by line
              const lines = jsonString.split('\n')
              const cleanedLines = lines.map(line => {
                // Remove trailing // comments but preserve // inside strings
                let inStr = false
                let result = ''
                for (let i = 0; i < line.length; i++) {
                  const char = line[i]
                  const next = line[i + 1]
                  
                  if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                    inStr = !inStr
                    result += char
                  } else if (!inStr && char === '/' && next === '/') {
                    // Found comment outside string, stop here
                    break
                  } else {
                    result += char
                  }
                }
                return result
              })
              
              const aggressiveCleaned = cleanedLines.join('\n')
              parsed = JSON.parse(aggressiveCleaned)
              console.log("✅ Successfully parsed JSON after aggressive cleanup")
            }
          }
        } else {
          // If no JSON found, wrap the text response
          console.log("⚠️ No JSON pattern found in response, treating as text")
          parsed = { type: "text", message: cleanText }
        }
      } catch (error) {
        console.error("❌ JSON parsing error:", error)
        console.error("Failed text sample:", text.substring(0, 500))
        console.error("Full text length:", text.length)
        
        // Last resort: treat as text response
        const cleanText = text.trim()
          .replace(/^```(?:json)?\s*\n?/, '')
          .replace(/\n?```\s*$/, '')
        
        // Try to extract just the message if it looks like there was an attempt at JSON
        let message = cleanText
        const messageMatch = cleanText.match(/"message"\s*:\s*"([^"]+)"/)
        if (messageMatch) {
          message = messageMatch[1]
        }
        
        parsed = { type: "text", message: message || "AI response could not be parsed. Please try again." }
        console.log("ℹ️ Falling back to text response")
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
