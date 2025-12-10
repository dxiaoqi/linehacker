"use client"

import type React from "react"

import { useCallback, useState, useRef, useEffect, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type OnConnect,
  type NodeMouseHandler,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { CanvasNode } from "./canvas-node"
import { CanvasEdge } from "./canvas-edge"
import { GroupNode } from "./group-node"
import { QuickCreateMenu } from "./quick-create-menu"
import { NodeContextMenu } from "./node-context-menu"
import type { NodeType, CanvasNode as CanvasNodeType } from "@/lib/types/canvas"

const nodeTypes = {
  "canvas-node": CanvasNode,
  "group-node": GroupNode,
}

const edgeTypes = {
  default: CanvasEdge,
}

const defaultEdgeOptions = {
  type: "default",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
  },
}

export function CanvasFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow()

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addGroup,
    setSelectedNode,
    setSelectedEdge,
    deleteNode,
    deleteEdge,
    selectedNodeId,
    selectedEdgeId,
    updateNodeParenting,
    openEditPanel,
    isCreatingGroup,
    groupDragStart,
    setCreatingGroup,
    setGroupDragStart,
  } = useCanvasStore()

  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [quickCreatePosition, setQuickCreatePosition] = useState({ x: 0, y: 0 })
  const [flowPosition, setFlowPosition] = useState({ x: 0, y: 0 })

  const parentingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)

      // Debounce parenting update
      if (parentingTimeoutRef.current) {
        clearTimeout(parentingTimeoutRef.current)
      }
      parentingTimeoutRef.current = setTimeout(() => {
        updateNodeParenting()
      }, 100)
    },
    [onNodesChange, updateNodeParenting],
  )

  useEffect(() => {
    return () => {
      if (parentingTimeoutRef.current) {
        clearTimeout(parentingTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      // Cancel group creation on ESC
      if (e.key === "Escape" && isCreatingGroup) {
        setGroupDragStart(null)
        setCreatingGroup(false)
        setCurrentMousePosition(null)
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          deleteNode(selectedNodeId)
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, isCreatingGroup, setGroupDragStart, setCreatingGroup])

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      onConnect(connection)
    },
    [onConnect],
  )

  const handleNodeClick: NodeMouseHandler<CanvasNodeType> = useCallback(
    (_, node) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode],
  )

  const handleNodeDoubleClick: NodeMouseHandler<CanvasNodeType> = useCallback(
    (event, node) => {
      event.stopPropagation()
      openEditPanel(node.id)
    },
    [openEditPanel],
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string }) => {
      setSelectedEdge(edge.id)
    },
    [setSelectedEdge],
  )

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      // Don't clear selection if we're creating a group (drag mode)
      // Only cancel if we haven't started dragging yet
      if (isCreatingGroup && !groupDragStart) {
        // Don't cancel on click - let user drag to create
        return
      }
      if (isCreatingGroup) return
    setSelectedNode(null)
    setSelectedEdge(null)
    },
    [setSelectedNode, setSelectedEdge, isCreatingGroup, groupDragStart],
  )

  // Handle mouse down on pane for group creation
  useEffect(() => {
    if (!isCreatingGroup) return

    const handleMouseDown = (event: MouseEvent) => {
      // Only start drag on left mouse button
      if (event.button !== 0) return
      
      // Check if clicking on pane (not on a node or edge)
      const target = event.target as HTMLElement
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
        return
      }
      
      // Check if clicking on controls or other UI elements
      if (target.closest('.react-flow__controls') || 
          target.closest('.react-flow__minimap') ||
          target.closest('button') ||
          target.closest('[role="button"]')) {
        return
      }
      
      const reactFlowElement = reactFlowWrapper.current?.querySelector('.react-flow__pane')
      if (!reactFlowElement) return
      
      // Prevent default to avoid panning
      event.preventDefault()
      event.stopPropagation()
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setGroupDragStart(position)
    }

    // Use capture phase to catch events before ReactFlow handles them
    document.addEventListener("mousedown", handleMouseDown, true)
    return () => document.removeEventListener("mousedown", handleMouseDown, true)
  }, [isCreatingGroup, screenToFlowPosition, setGroupDragStart])

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setFlowPosition(position)
      setQuickCreatePosition({ x: event.clientX, y: event.clientY })
      setQuickCreateOpen(true)
    },
    [screenToFlowPosition],
  )

  const handleCreateNode = useCallback(
    (type: NodeType) => {
      addNode(type, flowPosition)
    },
    [addNode, flowPosition],
  )

  const handleContextCreateNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const flowPos = screenToFlowPosition(position)
      addNode(type, flowPos)
    },
    [addNode, screenToFlowPosition],
  )

  const handleCreateConnectedNode = useCallback(
    (sourceId: string, type: NodeType) => {
      const sourceNode = nodes.find((n) => n.id === sourceId)
      if (sourceNode) {
        const newPosition = {
          x: sourceNode.position.x + 300,
          y: sourceNode.position.y,
        }
        const newNodeId = addNode(type, newPosition)
        onConnect({
          source: sourceId,
          target: newNodeId,
          sourceHandle: null,
          targetHandle: null,
        })
      }
    },
    [nodes, addNode, onConnect],
  )
  // Calculate drag preview rectangle
  const dragPreview = useMemo(() => {
    if (!isCreatingGroup || !groupDragStart) return null
    
    // We'll calculate this in the mouse move handler, but for now return the start position
    return {
      x: groupDragStart.x,
      y: groupDragStart.y,
      width: 0,
      height: 0,
    }
  }, [isCreatingGroup, groupDragStart])

  // Track current mouse position for drag preview
  const [currentMousePosition, setCurrentMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  useEffect(() => {
    if (!isCreatingGroup || !groupDragStart) {
      setCurrentMousePosition(null)
      setIsDragging(false)
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isCreatingGroup || !groupDragStart) return
      
      setIsDragging(true)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setCurrentMousePosition(position)
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (!isCreatingGroup || !groupDragStart) return
      
      setIsDragging(false)
      const endPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      
      // Calculate size and position
      const width = Math.abs(endPosition.x - groupDragStart.x)
      const height = Math.abs(endPosition.y - groupDragStart.y)
      
      // Only create if size is meaningful (at least 50x50)
      if (width >= 50 && height >= 50) {
        const position = {
          x: Math.min(groupDragStart.x, endPosition.x),
          y: Math.min(groupDragStart.y, endPosition.y),
        }
        addGroup(position, { width, height })
      }
      
      // Reset drag state
      setGroupDragStart(null)
      setCreatingGroup(false)
      setCurrentMousePosition(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isCreatingGroup, groupDragStart, screenToFlowPosition, addGroup, setGroupDragStart, setCreatingGroup])

  const dragPreviewRect = useMemo(() => {
    if (!isCreatingGroup || !groupDragStart || !currentMousePosition) return null
    
    const width = Math.abs(currentMousePosition.x - groupDragStart.x)
    const height = Math.abs(currentMousePosition.y - groupDragStart.y)
    
    return {
      x: Math.min(groupDragStart.x, currentMousePosition.x),
      y: Math.min(groupDragStart.y, currentMousePosition.y),
      width,
      height,
    }
  }, [isCreatingGroup, groupDragStart, currentMousePosition])

  return (
    <NodeContextMenu onCreateNode={handleContextCreateNode} onCreateConnectedNode={handleCreateConnectedNode}>
      <div ref={reactFlowWrapper} className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onDoubleClick={handlePaneDoubleClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          minZoom={0.1}
          maxZoom={5}
          snapToGrid
          snapGrid={[15, 15]}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-canvas-bg" />
          <Controls className="!border-border !bg-card !shadow-md" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(node) => {
              if (node.type === "group-node") {
                return (node.data as { color: string }).color || "#6366f1"
              }
              const colors: Record<NodeType, string> = {
                goal: "var(--node-goal)",
                idea: "var(--node-idea)",
                action: "var(--node-action)",
                risk: "var(--node-risk)",
                resource: "var(--node-resource)",
                base: "var(--node-base)",
                group: "#6366f1",
              }
              return colors[(node.data as { type: NodeType }).type] || "var(--muted)"
            }}
            maskColor="var(--canvas-selection)"
          />
          
          {/* Drag preview rectangle */}
          {dragPreviewRect && (() => {
            const screenStart = flowToScreenPosition({ x: dragPreviewRect.x, y: dragPreviewRect.y })
            const screenEnd = flowToScreenPosition({ 
              x: dragPreviewRect.x + dragPreviewRect.width, 
              y: dragPreviewRect.y + dragPreviewRect.height 
            })
            const screenWidth = Math.abs(screenEnd.x - screenStart.x)
            const screenHeight = Math.abs(screenEnd.y - screenStart.y)
            const screenX = Math.min(screenStart.x, screenEnd.x)
            const screenY = Math.min(screenStart.y, screenEnd.y)
            
            return (
              <div
                className="absolute pointer-events-none border-2 border-dashed border-primary/70 bg-primary/10 z-50"
                style={{
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  width: `${screenWidth}px`,
                  height: `${screenHeight}px`,
                }}
              />
            )
          })()}
          
        </ReactFlow>

        <QuickCreateMenu
          open={quickCreateOpen}
          onOpenChange={setQuickCreateOpen}
          position={quickCreatePosition}
          onCreateNode={handleCreateNode}
        />

        <svg style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, pointerEvents: "none" }}>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
            <marker
              id="arrow-reverse"
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
      </div>
    </NodeContextMenu>
  )
}
