"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { X, Plus, Trash2, LayoutList, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { NODE_TYPE_CONFIG } from "@/lib/types/canvas"
import type { Section, SectionItem, NodeType } from "@/lib/types/canvas"
import { cn } from "@/lib/utils"

const GROUP_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#64748b" },
]

export function NodeEditPanel() {
  const {
    nodes,
    selectedNodeId,
    editPanelOpen,
    setEditPanelOpen,
    updateNodeData,
    updateGroupData,
    addSection,
    updateSectionTitle,
    deleteSection,
    addSectionItem,
    updateSectionItem,
    deleteSectionItem,
    isEditMode,
  } = useCanvasStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const handleClose = useCallback(() => {
    setEditPanelOpen(false)
  }, [setEditPanelOpen])

  if (!selectedNode) {
    return null
  }

  if (selectedNode.type === "group-node") {
    return (
      <GroupEditPanel
        node={selectedNode}
        isOpen={editPanelOpen}
        onClose={handleClose}
        updateGroupData={updateGroupData}
        isEditMode={isEditMode}
      />
    )
  }

  return (
    <NodeEditPanelContent
      selectedNode={selectedNode}
      selectedNodeId={selectedNodeId!}
      editPanelOpen={editPanelOpen}
      setEditPanelOpen={setEditPanelOpen}
      updateNodeData={updateNodeData}
      addSection={addSection}
      updateSectionTitle={updateSectionTitle}
      deleteSection={deleteSection}
      addSectionItem={addSectionItem}
      updateSectionItem={updateSectionItem}
      deleteSectionItem={deleteSectionItem}
      isEditMode={isEditMode}
      handleClose={handleClose}
    />
  )
}

interface GroupEditPanelProps {
  node: any
  isOpen: boolean
  onClose: () => void
  updateGroupData: (groupId: string, data: any) => void
  isEditMode: boolean
}

function GroupEditPanel({ node, isOpen, onClose, updateGroupData, isEditMode }: GroupEditPanelProps) {
  const [title, setTitle] = useState(node.data.title)
  const groupColor = node.data.color || "#6366f1"
  const childCount = node.data.childNodeIds?.length || 0

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    updateGroupData(node.id, { title: e.target.value })
  }

  const handleColorChange = (color: string) => {
    updateGroupData(node.id, { color })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 bg-background border-l shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium"
            style={{
              backgroundColor: `${groupColor}15`,
              color: groupColor,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: groupColor }} />
            Section
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-5 space-y-5">
            {/* Group Title */}
            <div>
              {isEditMode ? (
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  className="text-xl font-semibold border-0 border-b rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                  placeholder="Section name..."
                />
              ) : (
                <h1 className="text-xl font-semibold text-foreground py-2">{node.data.title || "Untitled Section"}</h1>
              )}
            </div>

            {/* Child Count Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Contains</span>
              <span className="font-medium text-foreground">{childCount}</span>
              <span>{childCount === 1 ? "node" : "nodes"}</span>
            </div>

            {/* Color Picker */}
            {isEditMode && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  <span>Section Color</span>
                </div>

                <div className="grid grid-cols-8 gap-2">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all hover:scale-110",
                        groupColor === color.value && "ring-2 ring-offset-2 ring-primary",
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => handleColorChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isEditMode && (
              <div className="text-sm text-muted-foreground/50 text-center py-6 italic">
                Enable edit mode to modify section properties.
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

interface NodeEditPanelContentProps {
  selectedNode: any
  selectedNodeId: string
  editPanelOpen: boolean
  setEditPanelOpen: (open: boolean) => void
  updateNodeData: (nodeId: string, data: any) => void
  addSection: (nodeId: string, title: string) => void
  updateSectionTitle: (nodeId: string, sectionId: string, title: string) => void
  deleteSection: (nodeId: string, sectionId: string) => void
  addSectionItem: (nodeId: string, sectionId: string, content: string) => void
  updateSectionItem: (nodeId: string, sectionId: string, itemId: string, content: string) => void
  deleteSectionItem: (nodeId: string, sectionId: string, itemId: string) => void
  isEditMode: boolean
  handleClose: () => void
}

function NodeEditPanelContent({
  selectedNode,
  selectedNodeId,
  editPanelOpen,
  setEditPanelOpen,
  updateNodeData,
  addSection,
  updateSectionTitle,
  deleteSection,
  addSectionItem,
  updateSectionItem,
  deleteSectionItem,
  isEditMode,
  handleClose,
}: NodeEditPanelContentProps) {
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(selectedNodeId, { title: e.target.value })
    },
    [selectedNodeId, updateNodeData],
  )

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(selectedNodeId, { description: e.target.value })
    },
    [selectedNodeId, updateNodeData],
  )

  const handleAddSection = useCallback(() => {
    addSection(selectedNodeId, "New Section")
  }, [selectedNodeId, addSection])

  const nodeData = selectedNode.data
  const nodeConfig = NODE_TYPE_CONFIG[nodeData.type as NodeType] || {
    label: nodeData.type || "Unknown",
    color: "#6b7280",
    icon: "Box",
    description: "Node",
  }

  const sections = nodeData.sections || []

  return (
    <Sheet open={editPanelOpen} onOpenChange={setEditPanelOpen}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 bg-background border-l shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium"
            style={{
              backgroundColor: `${nodeConfig.color}15`,
              color: nodeConfig.color,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeConfig.color }} />
            {nodeConfig.label}
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-5 space-y-5">
            {/* Node Title */}
            <div>
              {isEditMode ? (
                <Input
                  value={selectedNode.data.title}
                  onChange={handleTitleChange}
                  className="text-xl font-semibold border-0 border-b rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                  placeholder="Enter title..."
                />
              ) : (
                <h1 className="text-xl font-semibold text-foreground py-2">{selectedNode.data.title || "Untitled"}</h1>
              )}
            </div>

            {/* Description */}
            <div>
              {isEditMode ? (
                <Textarea
                  value={selectedNode.data.description}
                  onChange={handleDescriptionChange}
                  placeholder="Add a description..."
                  rows={3}
                  className="resize-none text-sm"
                />
              ) : selectedNode.data.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedNode.data.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">No description</p>
              )}
            </div>

            {/* Key Info Header */}
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pt-2">
              <LayoutList className="h-4 w-4" />
              <span>Key Info</span>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {sections.map((section: Section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  nodeId={selectedNodeId}
                  isEditing={isEditMode}
                  updateSectionTitle={updateSectionTitle}
                  deleteSection={deleteSection}
                  addSectionItem={addSectionItem}
                  updateSectionItem={updateSectionItem}
                  deleteSectionItem={deleteSectionItem}
                />
              ))}

              {isEditMode && (
                <button
                  onClick={handleAddSection}
                  className="w-full py-3 border-2 border-dashed border-muted-foreground/20 rounded-xl text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Add Section</span>
                </button>
              )}

              {!isEditMode && sections.length === 0 && (
                <div className="text-sm text-muted-foreground/50 text-center py-6 italic">
                  No sections yet. Enable edit mode to add sections.
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// Section Card Component
interface SectionCardProps {
  section: Section
  nodeId: string
  isEditing: boolean
  updateSectionTitle: (nodeId: string, sectionId: string, title: string) => void
  deleteSection: (nodeId: string, sectionId: string) => void
  addSectionItem: (nodeId: string, sectionId: string, content: string) => void
  updateSectionItem: (nodeId: string, sectionId: string, itemId: string, content: string) => void
  deleteSectionItem: (nodeId: string, sectionId: string, itemId: string) => void
}

function SectionCard({
  section,
  nodeId,
  isEditing,
  updateSectionTitle,
  deleteSection,
  addSectionItem,
  updateSectionItem,
  deleteSectionItem,
}: SectionCardProps) {
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(section.title)
  const [newItemValue, setNewItemValue] = useState("")

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      updateSectionTitle(nodeId, section.id, titleValue.trim())
    } else {
      setTitleValue(section.title)
    }
    setTitleEditing(false)
  }

  const handleAddItem = () => {
    if (newItemValue.trim()) {
      addSectionItem(nodeId, section.id, newItemValue.trim())
      setNewItemValue("")
    }
  }

  return (
    <div className="rounded-xl bg-gradient-to-b from-muted/50 to-muted/30 border overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3">
        {titleEditing ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave()
              if (e.key === "Escape") {
                setTitleValue(section.title)
                setTitleEditing(false)
              }
            }}
            className="h-7 flex-1 mr-2 text-sm font-medium bg-background"
            autoFocus
          />
        ) : (
          <span
            className={`font-medium text-foreground ${isEditing ? "cursor-pointer hover:text-primary" : ""} transition-colors`}
            onClick={() => isEditing && setTitleEditing(true)}
          >
            {section.title}
          </span>
        )}

        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteSection(nodeId, section.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Section Items */}
      <div className="px-4 pb-3 space-y-1">
        {section.items.map((item) => (
          <SectionItemRow
            key={item.id}
            item={item}
            nodeId={nodeId}
            sectionId={section.id}
            isEditing={isEditing}
            updateSectionItem={updateSectionItem}
            deleteSectionItem={deleteSectionItem}
          />
        ))}

        {isEditing && (
          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddItem()
              }}
              placeholder="Add item..."
              className="h-8 text-sm bg-background/50 border-dashed flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={handleAddItem}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!isEditing && section.items.length === 0 && (
          <p className="text-xs text-muted-foreground/50 italic py-1">No items</p>
        )}
      </div>
    </div>
  )
}

// Section Item Row Component
interface SectionItemRowProps {
  item: SectionItem
  nodeId: string
  sectionId: string
  isEditing: boolean
  updateSectionItem: (nodeId: string, sectionId: string, itemId: string, content: string) => void
  deleteSectionItem: (nodeId: string, sectionId: string, itemId: string) => void
}

function SectionItemRow({
  item,
  nodeId,
  sectionId,
  isEditing,
  updateSectionItem,
  deleteSectionItem,
}: SectionItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.content)

  const handleSave = () => {
    if (value.trim()) {
      updateSectionItem(nodeId, sectionId, item.id, value.trim())
    } else {
      setValue(item.content)
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 group py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
      {editing ? (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setValue(item.content)
              setEditing(false)
            }
          }}
          className="h-7 flex-1 text-sm bg-background"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 text-sm text-muted-foreground ${isEditing ? "cursor-pointer hover:text-foreground" : ""} transition-colors`}
          onClick={() => isEditing && setEditing(true)}
        >
          {item.content}
        </span>
      )}

      {isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => deleteSectionItem(nodeId, sectionId, item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
