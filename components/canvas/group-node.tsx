"use client"
import { memo, useCallback } from "react"
import { NodeResizer, type NodeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import { useCanvasStore } from "@/lib/store/canvas-store"

interface GroupNodeData {
  type: "group"
  title: string
  color: string
  childNodeIds?: string[]
}

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const nodeData = data as GroupNodeData
  const { updateNodeParenting } = useCanvasStore()

  const handleResizeEnd = useCallback(() => {
    updateNodeParenting()
  }, [updateNodeParenting])

  const childCount = nodeData.childNodeIds?.length || 0

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineStyle={{ borderColor: nodeData.color, borderWidth: 2 }}
        handleStyle={{ backgroundColor: nodeData.color, width: 10, height: 10 }}
        onResizeEnd={handleResizeEnd}
      />

      {/* Simplified header - removed all interactive elements, just a non-clickable label */}
      <div
        className="absolute -top-7 left-0 flex items-center gap-2 px-3 py-1 rounded-t-md pointer-events-none select-none"
        style={{ backgroundColor: nodeData.color }}
      >
        <span className="text-white text-sm font-medium">{nodeData.title}</span>
        {childCount > 0 && (
          <span className="text-white/70 text-xs bg-white/20 px-1.5 py-0.5 rounded">{childCount}</span>
        )}
      </div>

      <div
        className={cn(
          "w-full h-full rounded-xl border-2 border-dashed transition-all pointer-events-none",
          selected ? "shadow-lg" : "",
        )}
        style={{
          borderColor: nodeData.color,
          backgroundColor: `${nodeData.color}08`,
        }}
      />
    </>
  )
})
