"use client"

import type React from "react"

import { useCallback } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Target, Lightbulb, Zap, AlertTriangle, Package, Plus, ArrowRight } from "lucide-react"
import type { NodeType } from "@/lib/types/canvas"

interface NodeContextMenuProps {
  children: React.ReactNode
  onCreateNode: (type: NodeType, position: { x: number; y: number }) => void
  onCreateConnectedNode?: (sourceId: string, type: NodeType) => void
  sourceNodeId?: string
}

const nodeTypes: { type: NodeType; label: string; icon: typeof Target }[] = [
  { type: "goal", label: "Goal", icon: Target },
  { type: "idea", label: "Idea", icon: Lightbulb },
  { type: "action", label: "Action", icon: Zap },
  { type: "risk", label: "Risk", icon: AlertTriangle },
  { type: "resource", label: "Resource", icon: Package },
]

export function NodeContextMenu({ children, onCreateNode, onCreateConnectedNode, sourceNodeId }: NodeContextMenuProps) {
  const handleCreate = useCallback(
    (type: NodeType, e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      onCreateNode(type, { x: rect.x, y: rect.y })
    },
    [onCreateNode],
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="w-4 h-4 mr-2" />
            Create Node
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {nodeTypes.map(({ type, label, icon: Icon }) => (
              <ContextMenuItem key={type} onClick={(e) => handleCreate(type, e)}>
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {sourceNodeId && onCreateConnectedNode && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ArrowRight className="w-4 h-4 mr-2" />
                Create Connected Node
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {nodeTypes.map(({ type, label, icon: Icon }) => (
                  <ContextMenuItem key={type} onClick={() => onCreateConnectedNode(sourceNodeId, type)}>
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
