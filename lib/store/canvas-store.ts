import { create } from "zustand"
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react"
import type {
  CanvasState,
  CanvasNode,
  CanvasEdge,
  CanvasNodeData,
  NodeType,
  ConnectionWeight,
  TimelineEntry,
  Section,
  SectionItem,
  MethodologyRule,
  NodeTypeDefinition,
  CanvasComment,
} from "@/lib/types/canvas"

interface GroupData {
  title: string
  color: string
  childNodeIds?: string[]
}

interface CanvasStore extends CanvasState {
  // Node operations
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: NodeType, position: { x: number; y: number }) => string
  updateNodeData: (nodeId: string, data: Partial<CanvasNodeData>) => void
  deleteNode: (nodeId: string) => void

  // Group operations
  addGroup: (position: { x: number; y: number }, size?: { width: number; height: number }) => string
  updateGroupData: (groupId: string, data: Partial<GroupData>) => void
  updateNodeParenting: () => void
  
  // Group creation drag state
  isCreatingGroup: boolean
  groupDragStart: { x: number; y: number } | null
  setCreatingGroup: (isCreating: boolean) => void
  setGroupDragStart: (position: { x: number; y: number } | null) => void

  // Edge operations
  updateEdgeWeight: (edgeId: string, weight: ConnectionWeight) => void
  updateEdgeLabel: (edgeId: string, label: string) => void
  deleteEdge: (edgeId: string) => void

  // Selection
  setSelectedNode: (nodeId: string | null) => void
  setSelectedEdge: (edgeId: string | null) => void

  // Timeline operations
  addTimelineEntry: (nodeId: string, entry: Omit<TimelineEntry, "id" | "timestamp">) => void
  updateTimelineStatus: (nodeId: string, entryId: string, status: "confirmed" | "rejected", reason?: string) => void

  addSection: (nodeId: string, title: string) => void
  updateSectionTitle: (nodeId: string, sectionId: string, title: string) => void
  deleteSection: (nodeId: string, sectionId: string) => void
  reorderSections: (nodeId: string, sectionIds: string[]) => void
  addSectionItem: (nodeId: string, sectionId: string, content: string) => void
  updateSectionItem: (nodeId: string, sectionId: string, itemId: string, content: string) => void
  deleteSectionItem: (nodeId: string, sectionId: string, itemId: string) => void
  reorderSectionItems: (nodeId: string, sectionId: string, itemIds: string[]) => void

  // Methodology
  updateMethodology: (rules: MethodologyRule[]) => void

  // AI Sidebar
  setAISidebarOpen: (open: boolean) => void
  setCurrentNodeForAI: (nodeId: string | null) => void
  openAIAnalysis: (nodeId: string) => void

  // Node Type Definitions
  addNodeTypeDefinition: (definition: Omit<NodeTypeDefinition, "id">) => void
  updateNodeTypeDefinition: (id: string, definition: Partial<NodeTypeDefinition>) => void
  deleteNodeTypeDefinition: (id: string) => void

  // Edit Mode
  isEditMode: boolean
  setEditMode: (mode: boolean) => void
  toggleEditMode: () => void

  editPanelOpen: boolean
  setEditPanelOpen: (open: boolean) => void
  openEditPanel: (nodeId: string) => void

  // AI settings
  aiSettings: {
    baseUrl: string
    apiKey: string
    model: string
  }
  updateAISettings: (settings: Partial<CanvasStore["aiSettings"]>) => void

  // Comment operations
  comments: CanvasComment[]
  commentPanelOpen: boolean
  commentTargetId: string | null
  addComment: (comment: Omit<CanvasComment, "id" | "timestamp" | "isRead" | "replies">) => string
  deleteComment: (commentId: string) => void
  addReply: (commentId: string, content: string, author: "user" | "ai") => void
  deleteReply: (commentId: string, replyId: string) => void
  updateCommentSuggestionStatus: (commentId: string, status: "approved" | "rejected") => void
  markCommentAsRead: (commentId: string) => void
  setCommentPanelOpen: (open: boolean) => void
  openCommentPanel: (targetId?: string) => void
  getCommentsForTarget: (targetId: string) => CanvasComment[]
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

const defaultNodeData = (type: NodeType): CanvasNodeData => ({
  type,
  title: getDefaultTitle(type),
  description: "",
  fields: getDefaultFields(type),
  sections: [],
  timeline: [],
  meta: {
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    isLocked: false,
    mergedInto: null,
  },
})

function getDefaultTitle(type: NodeType): string {
  const titles: Record<NodeType, string> = {
    goal: "New Goal",
    idea: "New Idea",
    action: "New Action",
    risk: "New Risk",
    resource: "New Resource",
    base: "New Node",
    group: "New Group",
  }
  return titles[type]
}

function getDefaultFields(
  type: NodeType,
): Record<string, { value: string | number | boolean; unit?: string; editable: boolean; options?: string[] }> {
  return {}
}

function isNodeInsideGroup(
  nodePos: { x: number; y: number },
  nodeWidth: number,
  nodeHeight: number,
  groupPos: { x: number; y: number },
  groupWidth: number,
  groupHeight: number,
): boolean {
  // Check if node center is inside group
  const nodeCenterX = nodePos.x + nodeWidth / 2
  const nodeCenterY = nodePos.y + nodeHeight / 2

  return (
    nodeCenterX >= groupPos.x &&
    nodeCenterX <= groupPos.x + groupWidth &&
    nodeCenterY >= groupPos.y &&
    nodeCenterY <= groupPos.y + groupHeight
  )
}

const DEFAULT_NODE_TYPE_DEFINITIONS: NodeTypeDefinition[] = [
  {
    id: "base",
    name: "Base",
    type: "base",
    icon: "Square",
    color: "#64748b",
    description: "Empty node for custom structure",
    defaultFields: [],
  },
  {
    id: "goal",
    name: "Goal",
    type: "goal",
    icon: "Target",
    color: "#3b82f6",
    description: "Define objectives and targets",
    defaultFields: [],
  },
  {
    id: "idea",
    name: "Idea",
    type: "idea",
    icon: "Lightbulb",
    color: "#eab308",
    description: "Capture thoughts and concepts",
    defaultFields: [],
  },
  {
    id: "action",
    name: "Action",
    type: "action",
    icon: "Zap",
    color: "#22c55e",
    description: "Define tasks and activities",
    defaultFields: [],
  },
  {
    id: "risk",
    name: "Risk",
    type: "risk",
    icon: "AlertTriangle",
    color: "#ef4444",
    description: "Identify potential issues",
    defaultFields: [],
  },
  {
    id: "resource",
    name: "Resource",
    type: "resource",
    icon: "Package",
    color: "#a855f7",
    description: "Track assets and materials",
    defaultFields: [],
  },
  {
    id: "group",
    name: "Group",
    type: "group",
    icon: "Layers",
    color: "#6366f1",
    description: "Group nodes together",
    defaultFields: [],
  },
]

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  methodology: [
    {
      id: "default-1",
      title: "Node Structure",
      content: "Each node should have a clear title, description, and relevant sections with items.",
      enabled: true,
    },
  ],
  nodeTypeDefinitions: DEFAULT_NODE_TYPE_DEFINITIONS,
  aiSidebarOpen: false,
  currentNodeForAI: null,
  editPanelOpen: false,
  isEditMode: true,
  comments: [],
  commentPanelOpen: false,
  commentTargetId: null,

  aiSettings: {
    baseUrl: "",
    apiKey: "",
    model: "gpt-3.5-turbo",
  },

  onNodesChange: (changes) => {
    const state = get()
    const prevNodes = state.nodes
    const newNodes = applyNodeChanges(changes, prevNodes)

    // Check if any group node was moved
    const movedGroups = changes.filter(
      (c) =>
        c.type === "position" &&
        c.position &&
        c.dragging && // Only move children if the group is being dragged
        prevNodes.find((n) => n.id === c.id)?.type === "group-node",
    )

    if (movedGroups.length > 0) {
      // For each moved group, calculate delta and move child nodes
      movedGroups.forEach((change) => {
        if (change.type !== "position" || !change.position) return

        const groupId = change.id
        const prevGroup = prevNodes.find((n) => n.id === groupId)
        const newGroup = newNodes.find((n) => n.id === groupId)

        if (!prevGroup || !newGroup) return

        const deltaX = change.position.x - prevGroup.position.x
        const deltaY = change.position.y - prevGroup.position.y

        // Get child node IDs from group data
        const childNodeIds = (prevGroup.data as GroupData).childNodeIds || []

        // Move child nodes
        childNodeIds.forEach((childId) => {
          const childIndex = newNodes.findIndex((n) => n.id === childId)
          if (childIndex !== -1) {
            newNodes[childIndex] = {
              ...newNodes[childIndex],
              position: {
                x: newNodes[childIndex].position.x + deltaX,
                y: newNodes[childIndex].position.y + deltaY,
              },
            }
          }
        })
      })
    }

    set({ nodes: newNodes })

    // Update parenting after node changes (debounced effect handled in component)
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },

  onConnect: (connection) => {
    const newEdge: CanvasEdge = {
      ...connection,
      id: generateId(),
      data: { weight: "weak" },
    } as CanvasEdge
    set({
      edges: addEdge(newEdge, get().edges) as CanvasEdge[],
    })
  },

  addNode: (type, position) => {
    const id = generateId()
    const newNode: CanvasNode = {
      id,
      type: "canvas-node",
      position,
      data: defaultNodeData(type),
      zIndex: 10,
    }
    set({ nodes: [...get().nodes, newNode] })
    return id
  },

  addGroup: (position, size?: { width: number; height: number }) => {
    const id = generateId()
    const newNode = {
      id,
      type: "group-node",
      position,
      style: { width: size?.width || 400, height: size?.height || 300 },
      zIndex: 0,
      data: {
        type: "group" as const,
        title: "New Section",
        color: "#6366f1",
        childNodeIds: [],
      },
    }
    set({ nodes: [...get().nodes, newNode] as CanvasNode[] })
    return id
  },

  // Group creation drag state
  isCreatingGroup: false,
  groupDragStart: null as { x: number; y: number } | null,
  setCreatingGroup: (isCreating: boolean) => set({ isCreatingGroup: isCreating }),
  setGroupDragStart: (position: { x: number; y: number } | null) => set({ groupDragStart: position }),

  updateNodeParenting: () => {
    const nodes = get().nodes
    const groups = nodes.filter((n) => n.type === "group-node")
    const regularNodes = nodes.filter((n) => n.type === "canvas-node")

    const updatedGroups = groups.map((group) => {
      const groupWidth =
        group.measured?.width ||
        group.width ||
        (group.style?.width as number) ||
        400
      const groupHeight =
        group.measured?.height ||
        group.height ||
        (group.style?.height as number) ||
        300

      const childNodeIds = regularNodes
        .filter((node) => {
          const nodeWidth = node.measured?.width || node.width || 280
          const nodeHeight = node.measured?.height || node.height || 150
          return isNodeInsideGroup(node.position, nodeWidth, nodeHeight, group.position, groupWidth, groupHeight)
        })
        .map((n) => n.id)

      return {
        ...group,
        data: {
          ...group.data,
          childNodeIds,
        },
      }
    })

    // Only update if there are changes
    const hasChanges = updatedGroups.some((g, i) => {
      const oldGroup = groups[i]
      const oldChildIds = (oldGroup.data as GroupData).childNodeIds || []
      const newChildIds = (g.data as GroupData).childNodeIds || []
      return JSON.stringify(oldChildIds) !== JSON.stringify(newChildIds)
    })

    if (hasChanges) {
      set({
        nodes: nodes.map((n) => {
          const updatedGroup = updatedGroups.find((g) => g.id === n.id)
          return updatedGroup || n
        }),
      })
    }
  },

  updateGroupData: (groupId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === groupId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node,
      ),
    })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
                meta: {
                  ...node.data.meta,
                  lastModified: new Date().toISOString(),
                },
              },
            }
          : node,
      ),
    })
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      editPanelOpen: get().selectedNodeId === nodeId ? false : get().editPanelOpen,
    })
  },

  updateEdgeWeight: (edgeId, weight) => {
    set({
      edges: get().edges.map((edge) => (edge.id === edgeId ? { ...edge, data: { ...edge.data, weight } } : edge)),
    })
  },

  updateEdgeLabel: (edgeId, label) => {
    set({
      edges: get().edges.map((edge) => (edge.id === edgeId ? { ...edge, data: { ...edge.data, label } } : edge)),
    })
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    })
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null })
  },

  setSelectedEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null })
  },

  addTimelineEntry: (nodeId, entry) => {
    const newEntry: TimelineEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    }
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                timeline: [newEntry, ...node.data.timeline],
              },
            }
          : node,
      ),
    })
  },

  updateTimelineStatus: (nodeId, entryId, status, reason) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                timeline: node.data.timeline.map((entry) =>
                  entry.id === entryId && entry.content.action
                    ? {
                        ...entry,
                        content: {
                          ...entry.content,
                          action: {
                            ...entry.content.action,
                            status,
                            rejectionReason: reason,
                          },
                        },
                      }
                    : entry,
                ),
              },
            }
          : node,
      ),
    })
  },

  addSection: (nodeId, title) => {
    const newSection: Section = { id: generateId(), title, items: [] }
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                sections: [...(node.data.sections || []), newSection],
                meta: { ...node.data.meta, lastModified: new Date().toISOString() },
              },
            }
          : node,
      ),
    })
  },

  updateSectionTitle: (nodeId, sectionId, title) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                sections: (node.data.sections || []).map((s) => (s.id === sectionId ? { ...s, title } : s)),
                meta: { ...node.data.meta, lastModified: new Date().toISOString() },
              },
            }
          : node,
      ),
    })
  },

  deleteSection: (nodeId, sectionId) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                sections: (node.data.sections || []).filter((s) => s.id !== sectionId),
                meta: { ...node.data.meta, lastModified: new Date().toISOString() },
              },
            }
          : node,
      ),
    })
  },

  reorderSections: (nodeId, sectionIds) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) return node
        const sections = node.data.sections || []
        const sectionMap = new Map(sections.map((s) => [s.id, s]))
        const reordered = sectionIds.map((id) => sectionMap.get(id)!).filter(Boolean)
        return {
          ...node,
          data: {
            ...node.data,
            sections: reordered,
            meta: { ...node.data.meta, lastModified: new Date().toISOString() },
          },
        }
      }),
    })
  },

  addSectionItem: (nodeId, sectionId, content) => {
    const newItem: SectionItem = { id: generateId(), content }
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                sections: (node.data.sections || []).map((s) =>
                  s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s,
                ),
                meta: { ...node.data.meta, lastModified: new Date().toISOString() },
              },
            }
          : node,
      ),
    })
  },

  updateSectionItem: (nodeId, sectionId, itemId, content) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                sections: (node.data.sections || []).map((s) =>
                  s.id === sectionId
                    ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, content } : i)) }
                    : s,
                ),
                meta: { ...node.data.meta, lastModified: new Date().toISOString() },
              },
            }
          : node,
      ),
    })
  },

  deleteSectionItem: (nodeId, sectionId, itemId) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                sections: (node.data.sections || []).map((s) =>
                  s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s,
                ),
                meta: { ...node.data.meta, lastModified: new Date().toISOString() },
              },
            }
          : node,
      ),
    })
  },

  reorderSectionItems: (nodeId, sectionId, itemIds) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            sections: (node.data.sections || []).map((s) => {
              if (s.id !== sectionId) return s
              const itemMap = new Map(s.items.map((i) => [i.id, i]))
              const reordered = itemIds.map((id) => itemMap.get(id)!).filter(Boolean)
              return { ...s, items: reordered }
            }),
            meta: { ...node.data.meta, lastModified: new Date().toISOString() },
          },
        }
      }),
    })
  },

  updateMethodology: (rules) => {
    set({ methodology: rules })
  },

  setAISidebarOpen: (open) => {
    set({ aiSidebarOpen: open })
  },

  setCurrentNodeForAI: (nodeId) => {
    set({ currentNodeForAI: nodeId })
  },

  openAIAnalysis: (nodeId) => {
    set({ currentNodeForAI: nodeId, aiSidebarOpen: true })
  },

  setEditPanelOpen: (open) => {
    set({ editPanelOpen: open })
  },

  openEditPanel: (nodeId) => {
    set({ selectedNodeId: nodeId, editPanelOpen: true })
  },

  addNodeTypeDefinition: (definition) => {
    const newDef: NodeTypeDefinition = {
      ...definition,
      id: generateId(),
    }
    set({
      nodeTypeDefinitions: [...get().nodeTypeDefinitions, newDef],
    })
  },

  updateNodeTypeDefinition: (id, definition) => {
    set({
      nodeTypeDefinitions: get().nodeTypeDefinitions.map((def) => (def.id === id ? { ...def, ...definition } : def)),
    })
  },

  deleteNodeTypeDefinition: (id) => {
    set({
      nodeTypeDefinitions: get().nodeTypeDefinitions.filter((def) => def.id !== id),
    })
  },

  setEditMode: (mode) => {
    set({ isEditMode: mode })
  },

  toggleEditMode: () => {
    set({ isEditMode: !get().isEditMode })
  },

  updateAISettings: (settings) => {
    set({
      aiSettings: { ...get().aiSettings, ...settings },
    })
  },

  addComment: (comment) => {
    const id = generateId()
    const newComment: CanvasComment = {
      ...comment,
      id,
      timestamp: new Date().toISOString(),
      isRead: false,
      replies: [],
    }
    set({ comments: [...get().comments, newComment] })
    return id
  },

  deleteComment: (commentId) => {
    set({ comments: get().comments.filter((c) => c.id !== commentId) })
  },

  addReply: (commentId, content, author) => {
    set({
      comments: get().comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: generateId(),
                  author,
                  content,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : comment,
      ),
    })
  },

  deleteReply: (commentId, replyId) => {
    set({
      comments: get().comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: comment.replies.filter((reply) => reply.id !== replyId),
            }
          : comment,
      ),
    })
  },

  updateCommentSuggestionStatus: (commentId, status) => {
    set({
      comments: get().comments.map((comment) =>
        comment.id === commentId && comment.suggestion
          ? {
              ...comment,
              suggestion: { ...comment.suggestion, status },
            }
          : comment,
      ),
    })
  },

  markCommentAsRead: (commentId) => {
    set({
      comments: get().comments.map((comment) => (comment.id === commentId ? { ...comment, isRead: true } : comment)),
    })
  },

  setCommentPanelOpen: (open) => {
    set({ commentPanelOpen: open })
  },

  openCommentPanel: (targetId) => {
    set({ commentPanelOpen: true, commentTargetId: targetId || null })
  },

  getCommentsForTarget: (targetId) => {
    return get().comments.filter((comment) => comment.targetId === targetId)
  },
}))
