"use client"

import type React from "react"

import { memo, useCallback, useState, useRef, useEffect } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Target, Lightbulb, Zap, AlertTriangle, Package, Square, MessageSquare, FileQuestion, Users, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { CanvasNodeData, NodeType } from "@/lib/types/canvas"
import { useCanvasStore } from "@/lib/store/canvas-store"

const nodeIcons: Record<NodeType, typeof Target> = {
  base: Square,
  goal: Target,
  idea: Lightbulb,
  action: Zap,
  risk: AlertTriangle,
  resource: Package,
  placeholder: FileQuestion,
  stakeholder: Users,
  boundary: Shield,
}

const nodeColors: Record<NodeType, string> = {
  base: "border-border hover:border-[var(--node-base)]",
  goal: "border-border hover:border-[var(--node-goal)]",
  idea: "border-border hover:border-[var(--node-idea)]",
  action: "border-border hover:border-[var(--node-action)]",
  risk: "border-border hover:border-[var(--node-risk)]",
  resource: "border-border hover:border-[var(--node-resource)]",
  placeholder: "border-border hover:border-[var(--node-placeholder)]",
  stakeholder: "border-border hover:border-[var(--node-stakeholder)]",
  boundary: "border-border hover:border-[var(--node-boundary)]",
}

const nodeIconColors: Record<NodeType, string> = {
  base: "text-[var(--node-base)]",
  goal: "text-[var(--node-goal)]",
  idea: "text-[var(--node-idea)]",
  action: "text-[var(--node-action)]",
  risk: "text-[var(--node-risk)]",
  resource: "text-[var(--node-resource)]",
  placeholder: "text-[var(--node-placeholder)]",
  stakeholder: "text-[var(--node-stakeholder)]",
  boundary: "text-[var(--node-boundary)]",
}

function CanvasNodeComponent({ id, data, selected }: NodeProps<CanvasNodeData>) {
  const { openEditPanel, openCommentPanel, comments } = useCanvasStore()
  const Icon = nodeIcons[data.type]
  const [showAllSections, setShowAllSections] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const nodeComments = comments.filter((c) => c.targetId === id)
  const unreadCount = nodeComments.filter((c) => !c.isRead && c.author === "ai").length

  useEffect(() => {
    const handleHighlight = (event: CustomEvent<{ nodeId: string }>) => {
      if (event.detail.nodeId === id) {
        setIsHighlighted(true)
        setTimeout(() => setIsHighlighted(false), 2000)
      }
    }

    window.addEventListener("highlight-node", handleHighlight as EventListener)
    return () => {
      window.removeEventListener("highlight-node", handleHighlight as EventListener)
    }
  }, [id])

  const handleComment = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      openCommentPanel(id)
    },
    [id, openCommentPanel],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      openEditPanel(id)
    },
    [id, openEditPanel],
  )

  const handleMouseEnter = useCallback(() => {
    if (data.sections.length > 2) {
      hoverTimerRef.current = setTimeout(() => {
        setShowAllSections(true)
      }, 2000)
    }
  }, [data.sections.length])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setShowAllSections(false)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const visibleSections = data.sections.slice(0, 2)
  const hiddenCount = Math.max(0, data.sections.length - 2)

  return (
    <TooltipProvider>
      <div
        className={cn(
          "min-w-[240px] max-w-[320px] rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md",
          nodeColors[data.type],
          selected && "ring-2 ring-primary shadow-lg ring-offset-2 ring-offset-canvas-bg",
          isHighlighted && "animate-pulse ring-4 ring-primary/50 shadow-xl shadow-primary/20",
        )}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />

        <div className="p-3">
          {/* Header with icon, title, and comment button */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0 transition-colors",
                  nodeIconColors[data.type].replace("text-", "bg-").replace("]", "]/15") + " " + nodeIconColors[data.type],
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm truncate text-foreground">{data.title || "Untitled"}</h3>
            </div>
            <div className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 relative" onClick={handleComment}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Comments ({nodeComments.length})</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Description */}
          {data.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{data.description}</p>}

          {data.sections.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {visibleSections.map((section) => (
                <div key={section.id} className="text-xs bg-background/50 rounded px-2 py-1.5">
                  <span className="font-medium text-muted-foreground">{section.title}</span>
                  {section.items.length > 0 && (
                    <span className="text-muted-foreground/70 ml-1">({section.items.length})</span>
                  )}
                </div>
              ))}
              {hiddenCount > 0 && (
                <Tooltip open={showAllSections}>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-default inline-block px-2">
                      +{hiddenCount} more
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px]">
                    <div className="space-y-1">
                      <p className="font-medium text-xs mb-1">All Sections:</p>
                      {data.sections.map((section) => (
                        <div key={section.id} className="text-xs">
                          <span className="font-medium">{section.title}</span>
                          {section.items.length > 0 && (
                            <span className="text-muted-foreground ml-1">({section.items.length} items)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Hint for double-click */}
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">Double-click to edit</p>
        </div>

        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      </div>
    </TooltipProvider>
  )
}

export const CanvasNode = memo(CanvasNodeComponent)
