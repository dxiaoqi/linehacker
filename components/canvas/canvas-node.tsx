"use client"

import type React from "react"

import { memo, useCallback, useState, useRef, useEffect } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Target, Lightbulb, Zap, AlertTriangle, Package, Square, MessageSquare } from "lucide-react"
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
}

const nodeColors: Record<NodeType, string> = {
  base: "border-l-[var(--node-base)] bg-[var(--node-base)]/5",
  goal: "border-l-[var(--node-goal)] bg-[var(--node-goal)]/5",
  idea: "border-l-[var(--node-idea)] bg-[var(--node-idea)]/5",
  action: "border-l-[var(--node-action)] bg-[var(--node-action)]/5",
  risk: "border-l-[var(--node-risk)] bg-[var(--node-risk)]/5",
  resource: "border-l-[var(--node-resource)] bg-[var(--node-resource)]/5",
}

const nodeIconColors: Record<NodeType, string> = {
  base: "text-[var(--node-base)]",
  goal: "text-[var(--node-goal)]",
  idea: "text-[var(--node-idea)]",
  action: "text-[var(--node-action)]",
  risk: "text-[var(--node-risk)]",
  resource: "text-[var(--node-resource)]",
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
          "min-w-[240px] max-w-[320px] rounded-lg border border-l-4 bg-card shadow-md transition-all",
          nodeColors[data.type],
          selected && "ring-2 ring-primary shadow-lg",
          isHighlighted && "animate-pulse ring-4 ring-primary/50 shadow-xl shadow-primary/20",
        )}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-primary !border-2 !border-card" />

        <div className="p-3">
          {/* Header with icon, title, and comment button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn("p-1.5 rounded-md bg-background shrink-0", nodeIconColors[data.type])}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="font-medium text-sm truncate text-card-foreground">{data.title || "Untitled"}</h3>
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
