import type { Node, Edge } from "@xyflow/react"

export type NodeType = "base" | "goal" | "idea" | "action" | "risk" | "resource" | "group"

export interface NodeField {
  value: string | number | boolean
  unit?: string
  editable: boolean
  options?: string[]
}

export interface SectionItem {
  id: string
  content: string
}

export interface Section {
  id: string
  title: string
  items: SectionItem[]
}

export interface TimelineEntry {
  id: string
  author: "user" | "ai"
  timestamp: string
  type: "comment" | "modification" | "connection_suggestion"
  content: {
    text: string
    action?: {
      type: "modify" | "connect" | "create" | "delete" | "reorganize"
      field?: string
      oldValue?: unknown
      newValue?: unknown
      status: "pending" | "confirmed" | "rejected"
      rejectionReason?: string
    }
  }
}

export interface CanvasNodeData {
  type: NodeType
  title: string
  description: string
  fields: Record<string, NodeField>
  sections: Section[]
  timeline: TimelineEntry[]
  meta: {
    createdAt: string
    lastModified: string
    isLocked: boolean
    mergedInto: string | null
  }
}

export interface CanvasGroupData {
  type: "group"
  title: string
  color: string
  meta: {
    createdAt: string
    lastModified: string
  }
}

export interface CanvasEdgeData {
  weight: ConnectionWeight
  label?: string
}

export type CanvasNode = Node<CanvasNodeData | CanvasGroupData>
export type CanvasEdge = Edge<CanvasEdgeData>

export interface AISuggestion {
  id: string
  type: "modify" | "connect" | "create" | "delete" | "reorganize"
  description: string
  details: {
    nodeId?: string
    field?: string
    oldValue?: unknown
    newValue?: unknown
    sourceNodeId?: string
    targetNodeId?: string
    weight?: ConnectionWeight
    suggestedNode?: Partial<CanvasNodeData | CanvasGroupData>
  }
  status: "pending" | "confirmed" | "rejected"
}

export interface MethodologyRule {
  id: string
  title: string
  content: string
  enabled: boolean
}

export interface NodeTypeDefinition {
  id: string
  name: string
  type: NodeType
  icon: string
  color: string
  description: string
  defaultFields: {
    name: string
    type: "text" | "number" | "boolean" | "select"
    defaultValue: string | number | boolean
    unit?: string
    options?: string[]
  }[]
}

export interface CanvasState {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  methodology: MethodologyRule[]
  nodeTypeDefinitions: NodeTypeDefinition[]
  aiSidebarOpen: boolean
  currentNodeForAI: string | null
}

export type ConnectionWeight = "strong" | "weak" | "uncertain" | "reverse"

export const NODE_TYPE_CONFIG: Record<NodeType, { label: string; color: string; icon: string; description: string }> = {
  base: {
    label: "Base",
    color: "#64748b",
    icon: "Square",
    description: "A basic node with no predefined structure",
  },
  goal: {
    label: "Goal",
    color: "#3b82f6",
    icon: "Target",
    description: "Define objectives and outcomes",
  },
  idea: {
    label: "Idea",
    color: "#eab308",
    icon: "Lightbulb",
    description: "Capture thoughts and concepts",
  },
  action: {
    label: "Action",
    color: "#22c55e",
    icon: "Zap",
    description: "Define tasks and activities",
  },
  risk: {
    label: "Risk",
    color: "#ef4444",
    icon: "AlertTriangle",
    description: "Identify potential issues",
  },
  resource: {
    label: "Resource",
    color: "#8b5cf6",
    icon: "Package",
    description: "Track assets and materials",
  },
  group: {
    label: "Group",
    color: "#6366f1",
    icon: "Frame",
    description: "Container for organizing nodes",
  },
}

export interface CanvasComment {
  id: string
  targetType: "node" | "section" | "canvas"
  targetId: string // nodeId or sectionId, or "canvas" for general
  targetSectionId?: string // if targeting a specific section within a node
  author: "user" | "ai"
  content: string
  timestamp: string
  isRead: boolean
  suggestion?: {
    type: "modify" | "create" | "delete" | "connect"
    action: AIAction
    status: "pending" | "approved" | "rejected"
  }
  replies: {
    id: string
    author: "user" | "ai"
    content: string
    timestamp: string
  }[]
}

export interface AIAction {
  type: "create" | "modify" | "delete" | "connect" | "reorganize"
  nodeType?: NodeType
  nodeId?: string
  sectionId?: string
  title?: string
  description?: string
  field?: string
  oldValue?: unknown
  newValue?: unknown
  sourceNodeId?: string
  targetNodeId?: string
  weight?: ConnectionWeight
  position?: { x: number; y: number }
}
