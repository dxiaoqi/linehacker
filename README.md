# AI Canvas Builder

An infinite canvas application for AI-assisted workflow planning and visualization built with React Flow, Next.js, and shadcn/ui. **Now enhanced with Systems Thinking principles!**

## ✨ New Features (v1.0.0)

- **🧠 Systems Thinking AI**: 5 core thinking principles integrated into AI responses
  - Clarifies core purpose vs. branch objectives
  - Analyzes underlying logic and structure
  - Applies systems perspective based on user context
  - Promotes iterative mindset with feedback loops
  - Identifies key elements: risks, resources, stakeholders, boundaries, data needs
- **📋 New Node Types**: 
  - **Placeholder** (Data occupancy) - for data that needs to be collected
  - **Stakeholder** (Third-party roles) - for external partners and approvers
  - **Boundary** (Constraints) - for limits and rules
- **🔍 Process Analysis Tool**: Automatic flow completeness scoring (0-100)
- **📝 Enhanced AI Forms**: Guided questions to clarify intent
- **🔄 Iteration Templates**: 4 pre-built templates (Product Launch, Problem Solving, Learning, Optimization)

[📖 Read the full Systems Thinking Guide](./SYSTEMS_THINKING_GUIDE.md)

## Features

- **Infinite 2D Canvas**: Unlimited workspace with zoom (10%-500%) and pan support
- **Node-Based System**: 9 types of nodes (Goal, Idea, Action, Risk, Resource, Placeholder, Stakeholder, Boundary, Base)
- **AI Integration**: AI-powered analysis with systems thinking and iterative workflow generation
- **Connection System**: Visual relationships between nodes with labels and different connection types
- **Structured Editing**: Detailed node editing with sections, items, and metadata
- **Process Analysis**: Automatic detection of missing elements (risks, resources, feedback loops)
- **Methodology Rules**: Configure custom AI assistance rules in Markdown format

## Node Types

### Goal Node (Blue)
Represents objectives and targets with deadline, budget, and priority tracking.

### Idea Node (Yellow)
Captures concepts and possibilities with category and feasibility assessment.

### Action Node (Green)
Defines tasks and activities with status, assignee, and effort estimation.

### Risk Node (Red)
Identifies potential problems with probability, impact, and mitigation strategies.

### Resource Node (Purple)
Tracks assets and materials with quantity and availability status.

### Placeholder Node (Slate Gray) 🆕
Marks data or information that needs to be collected/prepared by the user. Must include "How to Prepare" instructions.

### Stakeholder Node (Cyan) 🆕
Identifies third-party roles, external partners, or other actors involved in the process.

### Boundary Node (Orange) 🆕
Defines constraints, limits, rules, and boundary conditions that cannot be breached.

## Connection Types

Connections between nodes represent relationships and dependencies. All connections are created by dragging from one node to another. Double-click any connection to edit its type and add an optional label.

### Weak Connection (Default)
**Visual**: Dashed line with moderate spacing (dash: 5px, gap: 5px)
**Meaning**: Loose relationship or optional dependency
**Use Case**: "Nice-to-have" connections, soft influences, or suggestions
**Example**: An idea that might inspire an action, but isn't required

### Strong Connection
**Visual**: Solid thick line (2.5px width)
**Meaning**: Strong dependency or critical relationship
**Use Case**: Must-have connections where one node directly depends on another
**Example**: An action that must be completed before a goal can be achieved

### Uncertain Connection
**Visual**: Fine dashed line (dash: 3px, gap: 3px)
**Meaning**: Unclear or questionable relationship
**Use Case**: Relationships that need further validation or are under consideration
**Example**: A risk that might or might not affect a particular goal

### Reverse Connection
**Visual**: Bidirectional arrows with red color
**Meaning**: Mutual dependency or feedback loop
**Use Case**: Two nodes that influence each other or have circular dependencies
**Example**: A resource that enables an action, and the action that produces the resource

## Keyboard Shortcuts

- **Double-click canvas**: Create a new node at cursor position
- **Click node**: Select node (shows selection indicator)
- **Double-click node**: Open detailed edit panel
- **Delete/Backspace**: Delete selected node or connection
- **Drag from node edge**: Create connection to another node
- **Double-click connection**: Edit connection type and label

## Usage

### Creating Nodes

1. **Quick Create**: Double-click anywhere on the canvas
2. **Toolbar Button**: Click the "+" button in the toolbar and select node type
3. **Context Menu**: Right-click on canvas (if implemented)

### Editing Nodes

1. **Select**: Click on a node to select it
2. **Edit**: Double-click the node to open the edit panel on the right side
3. **Add Sections**: Click "+ Add Section" to create new information categories
4. **Add Items**: Type in "Add item..." input within each section
5. **Reorder**: Drag and drop sections or items to reorder

### Managing Connections

1. **Create**: Drag from the edge of one node to another
2. **Edit**: Double-click the connection line
3. **Change Type**: Select from Strong, Weak, Uncertain, or Reverse
4. **Add Label**: Type an optional label in the text input
5. **Delete**: Click the delete button in the connection edit panel

### AI Features

1. **Smart Questioning**: AI asks targeted questions to clarify your core purpose and constraints
2. **Systems Thinking**: AI automatically identifies risks, resources, stakeholders, and boundaries
3. **Iteration Templates**: Pre-built workflow structures for common scenarios (Product Launch, Problem Solving, Learning, Optimization)
4. **Process Analysis**: Get a completeness score (0-100) with specific improvement suggestions
5. **Bottom Toolbar**: Type questions or commands in the AI input
6. **Node Analysis**: Click the AI button on any node to get specific analysis
7. **Suggestions**: AI can suggest modifications, new connections, or node creation
8. **Approve/Reject**: Review and approve or reject AI suggestions
9. **Methodology**: Configure global AI rules via the Settings button

**Example AI Interaction**:
```
User: "I want to launch an online course"

AI: (Shows form)
  Step 1: "What is your ONE core outcome?"
    → [ ] Generate $10k revenue in 3 months
    → [ ] Build personal brand
    → [ ] Help 100 students
    → [ ] Other: ___
  
  Step 2: "Secondary priorities?" (multi-select)
    → [x] Speed/Fast results
    → [x] Low cost
    → [ ] Quality/Excellence
    → [ ] Learning/Skill building

AI generates: 5-phase iterative workflow with
  - Goal node: "Core: $10k in 3 months"
  - Placeholder: "Data: Target student pain points" + how to collect
  - Risk nodes: "No initial audience", "Content quality"
  - Resource nodes: "Course platform ($39/mo)", "Video equipment"
  - Stakeholder: "Beta students (first 10)"
  - Boundary: "$2k budget limit"
  - Feedback loop: from "Test & Validate" back to "Design & Plan"
```

See [SYSTEMS_THINKING_GUIDE.md](./SYSTEMS_THINKING_GUIDE.md) for detailed examples.

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
│   └── api/
│       └── canvas-ai/
│           ├── route.ts            # Main AI endpoint (enhanced with Systems Thinking)
│           └── analyze-process/    # Process analysis endpoint
├── components/
│   └── canvas/            # Canvas-related components
│       ├── canvas-flow.tsx        # Main React Flow canvas
│       ├── canvas-node.tsx        # Custom node component (supports 9 types)
│       ├── canvas-edge.tsx        # Custom edge/connection component
│       ├── canvas-toolbar.tsx     # Bottom toolbar with AI input
│       ├── node-edit-panel.tsx    # Right sidebar for node editing
│       ├── ai-sidebar.tsx         # AI analysis sidebar
│       └── ...
├── lib/
│   ├── process-analyzer.ts        # 🆕 Process completeness analysis tool
│   ├── store/             # Zustand state management
│   │   └── canvas-store.ts
│   ├── types/             # TypeScript type definitions
│   │   └── canvas.ts
│   └── utils.ts           # Utility functions
├── SYSTEMS_THINKING_GUIDE.md      # 🆕 Detailed guide for new features
└── README.md              # This file
\`\`\`

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Canvas**: React Flow
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **AI SDK**: Vercel AI SDK
- **Language**: TypeScript

## Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## License

MIT
