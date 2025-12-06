"use client"

import { useCallback } from "react"
import { Target, Lightbulb, Zap, AlertTriangle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { NodeType } from "@/lib/types/canvas"

interface QuickCreateMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  position: { x: number; y: number }
  onCreateNode: (type: NodeType) => void
}

const nodeTypes: { type: NodeType; label: string; icon: typeof Target; color: string }[] = [
  { type: "goal", label: "Goal", icon: Target, color: "text-[var(--node-goal)]" },
  { type: "idea", label: "Idea", icon: Lightbulb, color: "text-[var(--node-idea)]" },
  { type: "action", label: "Action", icon: Zap, color: "text-[var(--node-action)]" },
  { type: "risk", label: "Risk", icon: AlertTriangle, color: "text-[var(--node-risk)]" },
  { type: "resource", label: "Resource", icon: Package, color: "text-[var(--node-resource)]" },
]

export function QuickCreateMenu({ open, onOpenChange, position, onCreateNode }: QuickCreateMenuProps) {
  const handleCreate = useCallback(
    (type: NodeType) => {
      onCreateNode(type)
      onOpenChange(false)
    },
    [onCreateNode, onOpenChange],
  )

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: "absolute",
            left: position.x,
            top: position.y,
            width: 1,
            height: 1,
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start" side="bottom">
        <div className="flex gap-1">
          {nodeTypes.map(({ type, label, icon: Icon, color }) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              className="flex flex-col h-auto py-2 px-3 gap-1"
              onClick={() => handleCreate(type)}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
