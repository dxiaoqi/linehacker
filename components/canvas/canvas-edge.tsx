"use client"

import type React from "react"

import { memo, useState, useCallback } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import type { CanvasEdgeData, ConnectionWeight } from "@/lib/types/canvas"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { Trash2, Check, X } from "lucide-react"

const weightStyles: Record<
  ConnectionWeight,
  { stroke: string; strokeWidth: number; strokeDasharray?: string; strokeOpacity?: number }
> = {
  strong: { stroke: "#3b82f6", strokeWidth: 3, strokeOpacity: 0.9 },
  weak: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5,5", strokeOpacity: 0.7 },
  uncertain: { stroke: "#cbd5e1", strokeWidth: 1.5, strokeDasharray: "3,3", strokeOpacity: 0.6 },
  reverse: { stroke: "#ef4444", strokeWidth: 2.5, strokeOpacity: 0.9 },
}

const weightConfig: Record<ConnectionWeight, { label: string; color: string }> = {
  strong: { label: "Strong", color: "bg-primary text-primary-foreground" },
  weak: { label: "Weak", color: "bg-muted text-muted-foreground" },
  uncertain: { label: "Uncertain", color: "bg-muted text-muted-foreground border-dashed" },
  reverse: { label: "Reverse", color: "bg-destructive text-destructive-foreground" },
}

function CanvasEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CanvasEdgeData>) {
  const { updateEdgeWeight, updateEdgeLabel, deleteEdge } = useCanvasStore()
  const weight = data?.weight || "weak"
  const label = data?.label || ""

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState(label)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const style = weightStyles[weight]

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setPanelOpen(true)
      setEditingLabel(label)
    },
    [label],
  )

  const handleWeightSelect = useCallback(
    (w: ConnectionWeight) => {
      updateEdgeWeight(id, w)
    },
    [id, updateEdgeWeight],
  )

  const handleLabelSave = useCallback(() => {
    updateEdgeLabel(id, editingLabel)
    setPanelOpen(false)
  }, [id, editingLabel, updateEdgeLabel])

  const handleLabelCancel = useCallback(() => {
    setEditingLabel(label)
    setPanelOpen(false)
  }, [label])

  const handleDelete = useCallback(() => {
    deleteEdge(id)
    setPanelOpen(false)
  }, [id, deleteEdge])

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
          strokeOpacity: selected ? 1 : style.strokeOpacity || 0.8,
        }}
        markerEnd={weight === "reverse" ? undefined : "url(#arrow)"}
        markerStart={weight === "reverse" ? "url(#arrow-reverse)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: panelOpen ? 9999 : "auto",
          }}
          className="nodrag nopan"
          onDoubleClick={handleDoubleClick}
        >
          {!panelOpen && label && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-card border shadow-sm truncate max-w-[100px] cursor-pointer hover:scale-105 transition-transform">
              {label}
            </span>
          )}

          {!panelOpen && !label && <div className="w-12 h-12 cursor-pointer -m-6" title="Double-click to edit" />}

          {panelOpen && (
            <div
              className="bg-card border rounded-lg shadow-lg p-3 min-w-[200px] z-[9999]"
              style={{ zIndex: 9999 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Weight selection */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Connection Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(weightConfig) as ConnectionWeight[]).map((w) => (
                    <button
                      key={w}
                      onClick={() => handleWeightSelect(w)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md border transition-colors",
                        weight === w ? weightConfig[w].color : "bg-muted/50 hover:bg-muted text-foreground",
                      )}
                    >
                      {weightConfig[w].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label input */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Label (optional)</p>
                <input
                  type="text"
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  placeholder="Enter label..."
                  className="w-full px-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLabelSave()
                    if (e.key === "Escape") handleLabelCancel()
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleLabelCancel}
                    className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLabelSave}
                    className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const CanvasEdge = memo(CanvasEdgeComponent)
