# LineHacker

An infinite canvas application for AI-assisted workflow planning and visualization built with React Flow, Next.js, and shadcn/ui.

## Features

- **Infinite 2D Canvas**: Unlimited workspace with zoom (10%-500%) and pan support
- **Node-Based System**: 5 types of nodes (Goal, Idea, Action, Risk, Resource)
- **AI Integration**: AI-powered analysis and suggestions for your workflow
- **Connection System**: Visual relationships between nodes with different connection types
- **Structured Editing**: Detailed node editing with sections, items, and metadata
- **Methodology Rules**: Configure custom AI assistance rules in Markdown format

## Node Types

### Goal Node (Purple)
Represents objectives and targets with deadline, budget, and priority tracking.

### Idea Node (Yellow)
Captures concepts and possibilities with category and feasibility assessment.

### Action Node (Blue)
Defines tasks and activities with status, assignee, and effort estimation.

### Risk Node (Red)
Identifies potential problems with probability, impact, and mitigation strategies.

### Resource Node (Green)
Tracks assets and materials with quantity and availability status.

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

1. **Bottom Toolbar**: Type questions or commands in the AI input
2. **Node Analysis**: Click the AI button on any node to get specific analysis
3. **Suggestions**: AI can suggest modifications, new connections, or node creation
4. **Approve/Reject**: Review and approve or reject AI suggestions
5. **Methodology**: Configure global AI rules via the Settings button

## Project Structure

\`\`\`
├── app/                    # Next.js app directory
├── components/
│   └── canvas/            # Canvas-related components
│       ├── canvas-flow.tsx        # Main React Flow canvas
│       ├── canvas-node.tsx        # Custom node component
│       ├── canvas-edge.tsx        # Custom edge/connection component
│       ├── canvas-toolbar.tsx     # Bottom toolbar with AI input
│       ├── node-edit-panel.tsx    # Right sidebar for node editing
│       ├── ai-sidebar.tsx         # AI analysis sidebar
│       └── ...
├── lib/
│   ├── store/             # Zustand state management
│   │   └── canvas-store.ts
│   ├── types/             # TypeScript type definitions
│   │   └── canvas.ts
│   └── utils.ts           # Utility functions
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
