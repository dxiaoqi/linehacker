import { useCanvasStore } from "@/lib/store/canvas-store"
import type { ConnectionWeight } from "@/lib/types/canvas"
import { applyLayout } from "@/lib/layout-engine"

// AI Action Types
export interface AICreateAction {
  type: "create"
  nodeType: "base" | "goal" | "idea" | "action" | "risk" | "resource" | "placeholder" | "stakeholder" | "boundary"
  title: string
  description?: string
  sections?: { title: string; items: string[] }[]
  position?: { x: number; y: number }
}

export interface AICreateGroupAction {
  type: "create-group"
  title: string
  color?: string
  position?: { x: number; y: number }
}

export interface AIModifyAction {
  type: "modify"
  nodeId: string
  field: "title" | "description" | "sections"
  newValue: string | { title: string; items: string[] }[]
}

export interface AIConnectAction {
  type: "connect"
  sourceNodeId?: string
  targetNodeId?: string
  sourceTitle?: string
  targetTitle?: string
  weight: "strong" | "weak" | "uncertain" | "reverse"
  label?: string
}

export interface AIDeleteAction {
  type: "delete"
  nodeId: string
  reason: string
}

export interface AIReorganizeAction {
  type: "reorganize"
  nodeIds: string[]
  groupTitle?: string
  reason: string
}

export interface AIAddSectionAction {
  type: "add-section"
  nodeId: string
  sectionTitle: string
  items?: string[]
}

export interface AIUpdateSectionAction {
  type: "update-section"
  nodeId: string
  sectionId: string
  title?: string
  items?: string[]
}

export interface AIDeleteSectionAction {
  type: "delete-section"
  nodeId: string
  sectionId: string
}

export type AIAction =
  | AICreateAction
  | AICreateGroupAction
  | AIModifyAction
  | AIConnectAction
  | AIDeleteAction
  | AIReorganizeAction
  | AIAddSectionAction
  | AIUpdateSectionAction
  | AIDeleteSectionAction

export interface AIActionResult {
  success: boolean
  message: string
  nodeId?: string
  edgeId?: string
}

// Get viewport center position
function getViewportCenter(): { x: number; y: number } {
  // Default position if we can't determine viewport
  return { x: 400, y: 300 }
}

// Execute a single AI action
export function executeAIAction(action: AIAction): AIActionResult {
  const store = useCanvasStore.getState()
  
  // Track if we need to apply layout after actions
  const shouldApplyLayout = action.type === "create" || action.type === "connect"

  switch (action.type) {
    case "create": {
      // Use a temporary position - layout will be applied after all actions
      const position = action.position || getViewportCenter()
      const nodeId = store.addNode(action.nodeType, position)

      // Update node with title, description, and sections
      const updates: Record<string, unknown> = {
        title: action.title,
      }

      if (action.description) {
        updates.description = action.description
      }

      if (action.sections && action.sections.length > 0) {
        updates.sections = action.sections.map((s, idx) => ({
          id: `section-${Date.now()}-${idx}`,
          title: s.title,
          items: s.items.map((item, itemIdx) => ({
            id: `item-${Date.now()}-${idx}-${itemIdx}`,
            content: item,
          })),
        }))
      }

      store.updateNodeData(nodeId, updates)

      return {
        success: true,
        message: `Created ${action.nodeType} node: "${action.title}"`,
        nodeId,
      }
    }

    case "create-group": {
      const position = action.position || getViewportCenter()
      const size = (action as any).size
      
      // Create group with size if provided
      const groupId = store.addGroup(position, size)

      // Support both "groupTitle" (from AI) and "title" (legacy)
      const groupTitle = (action as any).groupTitle || action.title || "New Section"
      store.updateGroupData(groupId, { title: groupTitle })
      
      if (action.color) {
        store.updateGroupData(groupId, { color: action.color })
      }

      return {
        success: true,
        message: `Created group: "${groupTitle}"`,
        nodeId: groupId,
      }
    }

    case "modify": {
      const node = store.nodes.find((n) => n.id === action.nodeId)
      if (!node) {
        return {
          success: false,
          message: `Node not found: ${action.nodeId}`,
        }
      }

      if (action.field === "title") {
        store.updateNodeData(action.nodeId, { title: action.newValue as string })
      } else if (action.field === "description") {
        store.updateNodeData(action.nodeId, { description: action.newValue as string })
      } else if (action.field === "sections") {
        const sections = (action.newValue as { title: string; items: string[] }[]).map((s, idx) => ({
          id: `section-${Date.now()}-${idx}`,
          title: s.title,
          items: s.items.map((item, itemIdx) => ({
            id: `item-${Date.now()}-${idx}-${itemIdx}`,
            content: item,
          })),
        }))
        store.updateNodeData(action.nodeId, { sections })
      }

      return {
        success: true,
        message: `Modified ${action.field} of node "${node.data.title}"`,
        nodeId: action.nodeId,
      }
    }

    case "connect": {
      const storeNodes = store.nodes
      let sourceNode: typeof storeNodes[0] | undefined
      let targetNode: typeof storeNodes[0] | undefined

      // Try to find source node: first by ID, then by title
      if (action.sourceNodeId) {
        sourceNode = storeNodes.find((n) => n.id === action.sourceNodeId)
      }
      if (!sourceNode && action.sourceTitle) {
        sourceNode = storeNodes.find((n) => n.data.title === action.sourceTitle)
      }
      // Fallback: try ID suffix matching if sourceNodeId looks like a partial ID
      if (!sourceNode && action.sourceNodeId) {
        sourceNode = storeNodes.find((n) => n.id.endsWith(action.sourceNodeId!))
      }

      // Try to find target node: first by ID, then by title
      if (action.targetNodeId) {
        targetNode = storeNodes.find((n) => n.id === action.targetNodeId)
      }
      if (!targetNode && action.targetTitle) {
        targetNode = storeNodes.find((n) => n.data.title === action.targetTitle)
      }
      // Fallback: try ID suffix matching if targetNodeId looks like a partial ID
      if (!targetNode && action.targetNodeId) {
        targetNode = storeNodes.find((n) => n.id.endsWith(action.targetNodeId!))
      }

      if (!sourceNode || !targetNode) {
        const sourceRef = action.sourceTitle || action.sourceNodeId || "unknown"
        const targetRef = action.targetTitle || action.targetNodeId || "unknown"
        console.warn(`Connect action failed: Nodes not found. Source: ${sourceRef}, Target: ${targetRef}`)
        return {
          success: false,
          message: `One or both nodes not found: Source "${sourceRef}", Target "${targetRef}"`,
        }
      }

      // Create connection using actual node IDs
      store.onConnect({
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: null,
        targetHandle: null,
      })

      // Find the newly created edge and update its weight and label
      const edges = useCanvasStore.getState().edges
      const newEdge = edges.find((e) => e.source === sourceNode!.id && e.target === targetNode!.id)

      if (newEdge) {
        store.updateEdgeWeight(newEdge.id, action.weight as ConnectionWeight)
        if (action.label) {
          store.updateEdgeLabel(newEdge.id, action.label)
        }
      }

      return {
        success: true,
        message: `Connected "${sourceNode.data.title}" to "${targetNode.data.title}"${action.label ? ` with label "${action.label}"` : ""}`,
        edgeId: newEdge?.id,
      }
    }

    case "delete": {
      const node = store.nodes.find((n) => n.id === action.nodeId)
      if (!node) {
        return {
          success: false,
          message: `Node not found: ${action.nodeId}`,
        }
      }

      const nodeTitle = node.data.title || node.data?.title || "Untitled"
      store.deleteNode(action.nodeId)

      return {
        success: true,
        message: `Deleted node: "${nodeTitle}"`,
        nodeId: action.nodeId,
      }
    }

    case "reorganize": {
      // Create a group and add nodes to it
      const position = getViewportCenter()
      const groupId = store.addGroup(position)

      if (action.groupTitle) {
        store.updateGroupData(groupId, { title: action.groupTitle })
      }

      return {
        success: true,
        message: `Created group "${action.groupTitle || "New Group"}" for reorganization`,
        nodeId: groupId,
      }
    }

    case "add-section": {
      const node = store.nodes.find((n) => n.id === action.nodeId)
      if (!node) {
        return {
          success: false,
          message: `Node not found: ${action.nodeId}`,
        }
      }

      store.addSection(action.nodeId, action.sectionTitle)

      // If items provided, add them to the section
      if (action.items && action.items.length > 0) {
        const updatedNode = useCanvasStore.getState().nodes.find((n) => n.id === action.nodeId)
        const nodeData = updatedNode?.data as any
        const sections = nodeData?.sections || []
        const newSection = sections[sections.length - 1]

        if (newSection) {
          action.items.forEach((item) => {
            store.addSectionItem(action.nodeId, newSection.id, item)
          })
        }
      }

      return {
        success: true,
        message: `Added section "${action.sectionTitle}" to node`,
        nodeId: action.nodeId,
      }
    }

    case "update-section": {
      const node = store.nodes.find((n) => n.id === action.nodeId)
      if (!node) {
        return {
          success: false,
          message: `Node not found: ${action.nodeId}`,
        }
      }

      if (action.title) {
        store.updateSectionTitle(action.nodeId, action.sectionId, action.title)
      }

      return {
        success: true,
        message: `Updated section in node`,
        nodeId: action.nodeId,
      }
    }

    case "delete-section": {
      const node = store.nodes.find((n) => n.id === action.nodeId)
      if (!node) {
        return {
          success: false,
          message: `Node not found: ${action.nodeId}`,
        }
      }

      store.deleteSection(action.nodeId, action.sectionId)

      return {
        success: true,
        message: `Deleted section from node`,
        nodeId: action.nodeId,
      }
    }

    default:
      return {
        success: false,
        message: `Unknown action type: ${(action as AIAction).type}`,
      }
  }
}

// Execute multiple AI actions
export function executeAIActions(actions: AIAction[]): AIActionResult[] {
  const results = actions.map((action) => executeAIAction(action))
  
  // Apply automatic layout after all actions are executed
  // Only apply if we have multiple nodes
  const store = useCanvasStore.getState()
  const canvasNodes = store.nodes.filter((n) => n.type === "canvas-node")
  const canvasEdges = store.edges
  
  // Apply layout if we have 2+ nodes
  if (canvasNodes.length >= 2) {
    const startPosition = getViewportCenter()
    // Offset start position to the left to accommodate left-to-right flow
    const layoutStartPosition = {
      x: Math.max(100, startPosition.x - 200),
      y: startPosition.y,
    }
    
    applyLayout(
      canvasNodes,
      canvasEdges,
      (nodeId, position) => {
        store.updateNodePosition(nodeId, position)
      },
      layoutStartPosition,
    )
  }
  
  return results
}

// Build canvas context for AI
export function buildCanvasContext() {
  const store = useCanvasStore.getState()

  return {
    nodes: store.nodes
      .filter((n) => n.type === "canvas-node")
      .map((n) => ({
        id: n.id,
        type: n.data.type,
        title: n.data.title,
        description: (n.data as any).description || "",
        sections: ((n.data as any).sections || []).map((s: any) => ({
          title: s.title,
          items: s.items.map((i: any) => i.content),
        })),
      })),
    edges: store.edges.map((e) => {
      const sourceNode = store.nodes.find((n) => n.id === e.source)
      const targetNode = store.nodes.find((n) => n.id === e.target)
      return {
      id: e.id,
      source: e.source,
      target: e.target,
        sourceTitle: sourceNode?.data.title || "",
        targetTitle: targetNode?.data.title || "",
      weight: e.data?.weight || "weak",
      label: e.data?.label,
      }
    }),
    groups: store.nodes
      .filter((n) => n.type === "group-node")
      .map((n) => ({
        id: n.id,
        title: (n.data as { title: string }).title,
        childNodeIds: (n.data as { childNodeIds?: string[] }).childNodeIds || [],
      })),
    selectedNodeId: store.selectedNodeId || undefined,
  }
}
