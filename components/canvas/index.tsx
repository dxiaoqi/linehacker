"use client"

import { useState, useEffect } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { CanvasFlow } from "./canvas-flow"
import { CanvasToolbar } from "./canvas-toolbar"
import { AISidebar } from "./ai-sidebar"
import { NodeEditPanel } from "./node-edit-panel"
import { CommentPanel } from "./comment-panel"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { Button } from "@/components/ui/button"
import { Download, Settings, Target, Lightbulb, Zap, AlertTriangle, Package, Circle, Upload, Copy, Check } from "lucide-react"
import { exportCanvasToMarkdown, downloadMarkdown } from "@/lib/export-canvas"
import { parseMarkdownImport, generateImportPrompt } from "@/lib/import-canvas"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const NODE_TYPES = [
  { type: "base", label: "Base", icon: Circle, color: "text-slate-500", description: "Empty node" },
  { type: "goal", label: "Goal", icon: Target, color: "text-blue-500", description: "Objectives" },
  { type: "idea", label: "Idea", icon: Lightbulb, color: "text-yellow-500", description: "Concepts" },
  { type: "action", label: "Action", icon: Zap, color: "text-green-500", description: "Tasks" },
  { type: "risk", label: "Risk", icon: AlertTriangle, color: "text-red-500", description: "Issues" },
  { type: "resource", label: "Resource", icon: Package, color: "text-purple-500", description: "Assets" },
] as const

export function Canvas() {
  const { aiSidebarOpen, nodes, edges, methodology, updateMethodology, aiSettings, updateAISettings } = useCanvasStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importMarkdown, setImportMarkdown] = useState("")
  const [copied, setCopied] = useState(false)

  // Local state for temporary settings values (only saved when user clicks Save)
  const [tempMethodologyText, setTempMethodologyText] = useState(
    methodology.map((r) => `## ${r.title}\n${r.content}`).join("\n\n"),
  )
  const [tempAiSettings, setTempAiSettings] = useState(aiSettings)

  // Sync local state when settings panel opens or store values change externally
  useEffect(() => {
    if (settingsOpen) {
      setTempMethodologyText(methodology.map((r) => `## ${r.title}\n${r.content}`).join("\n\n"))
      setTempAiSettings(aiSettings)
    }
  }, [settingsOpen, methodology, aiSettings])

  const handleMethodologyTextChange = (text: string) => {
    setTempMethodologyText(text)
  }

  const handleAiSettingsChange = (field: keyof typeof aiSettings, value: string) => {
    setTempAiSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveSettings = () => {
    // Parse methodology text back to MethodologyRule[]
    const rules = tempMethodologyText
      .split(/\n## /)
      .filter((s) => s.trim())
      .map((section, idx) => {
        const lines = section.split("\n")
        const title = lines[0].replace(/^##\s*/, "").trim()
        const content = lines.slice(1).join("\n").trim()
        return {
          id: `rule-${idx}`,
          title: title || `Rule ${idx + 1}`,
          content: content || "",
          enabled: true,
        }
      })
    updateMethodology(
      rules.length > 0 ? rules : [{ id: "default", title: "Default", content: tempMethodologyText, enabled: true }],
    )
    updateAISettings(tempAiSettings)
    setSettingsOpen(false)
  }

  const handleCancelSettings = () => {
    // Reset to original values
    setTempMethodologyText(methodology.map((r) => `## ${r.title}\n${r.content}`).join("\n\n"))
    setTempAiSettings(aiSettings)
    setSettingsOpen(false)
  }

  const handleExport = () => {
    const markdown = exportCanvasToMarkdown(nodes, edges)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadMarkdown(markdown, `canvas-export-${timestamp}.md`)
  }

  const handleCopyPrompt = () => {
    const prompt = generateImportPrompt()
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImport = () => {
    try {
      const { nodes: importedNodes, edges: importedEdges } = parseMarkdownImport(importMarkdown)
      const store = useCanvasStore.getState()
      
      // Map to store node IDs for edge creation
      const nodeIdMap = new Map<string, string>() // old ID -> new ID
      
      // Import nodes
      importedNodes.forEach((node, index) => {
        const position = {
          x: 100 + (index % 3) * 350,
          y: 100 + Math.floor(index / 3) * 250
        }
        
        const newNodeId = store.addNode(node.type as any || "base", position)
        nodeIdMap.set(node.id, newNodeId)
        
        // Update node data
        const updateData: any = {}
        if (node.title) updateData.title = node.title
        if (node.description) updateData.description = node.description
        if (node.sections && node.sections.length > 0) {
          updateData.sections = node.sections
        }
        store.updateNodeData(newNodeId, updateData)
      })
      
      // Import edges
      importedEdges.forEach((edge) => {
        const newSource = nodeIdMap.get(edge.source)
        const newTarget = nodeIdMap.get(edge.target)
        
        if (newSource && newTarget) {
          // Create edge with full data directly
          const edgeId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          const newEdge: any = {
            id: edgeId,
            source: newSource,
            target: newTarget,
            sourceHandle: null,
            targetHandle: null,
            type: 'default',
            data: { 
              weight: edge.weight || "weak",
              label: edge.label
            },
          }
          
          // Add edge directly to avoid timing issues
          const currentEdges = useCanvasStore.getState().edges
          useCanvasStore.setState({
            edges: [...currentEdges, newEdge]
          })
        }
      })
      
      setImportMarkdown("")
      setImportDialogOpen(false)
      
      // Show success message
      alert(`成功导入 ${importedNodes.length} 个节点和 ${importedEdges.length} 个连接！`)
    } catch (error) {
      console.error("Import failed:", error)
      alert(`导入失败: ${error instanceof Error ? error.message : "请检查 Markdown 格式是否正确"}`)
    }
  }

  return (
    <ReactFlowProvider>
      <div className="relative w-full h-screen flex flex-col bg-canvas-bg">
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <TooltipProvider>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <SheetContent side="right" className="w-[400px] sm:w-[500px] flex flex-col p-0 gap-0">
                <div className="px-6 pt-6 pb-4 border-b shrink-0">
                  <SheetHeader className="p-0">
                    <SheetTitle>Canvas Settings</SheetTitle>
                  </SheetHeader>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                  <Tabs defaultValue="methodology" className="mt-6 flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="methodology">Rules</TabsTrigger>
                      <TabsTrigger value="ai">AI Settings</TabsTrigger>
                      <TabsTrigger value="nodes">Node Types</TabsTrigger>
                    </TabsList>
                    <TabsContent value="methodology" className="space-y-4 flex-1 flex flex-col min-h-0 mt-0">
                      <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <Label>Methodology Rules (Markdown)</Label>
                        <Textarea
                          value={tempMethodologyText}
                          onChange={(e) => handleMethodologyTextChange(e.target.value)}
                          placeholder="Enter your methodology rules in Markdown format..."
                          className="flex-1 min-h-[300px] font-mono text-sm resize-none"
                          style={{ height: "auto", minHeight: "300px" }}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="ai" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <Label>Base URL</Label>
                        <Input
                          value={tempAiSettings.baseUrl}
                          onChange={(e) => handleAiSettingsChange("baseUrl", e.target.value)}
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={tempAiSettings.apiKey}
                          onChange={(e) => handleAiSettingsChange("apiKey", e.target.value)}
                          placeholder="sk-..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Input
                          value={tempAiSettings.model}
                          onChange={(e) => handleAiSettingsChange("model", e.target.value)}
                          placeholder="gpt-4"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                        <p className="font-medium mb-2">Supported providers:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>OpenAI (api.openai.com)</li>
                          <li>Azure OpenAI</li>
                          <li>Anthropic</li>
                          <li>Ollama (localhost:11434)</li>
                          <li>Any OpenAI-compatible API</li>
                        </ul>
                      </div>
                    </TabsContent>
                    <TabsContent value="nodes" className="space-y-4 mt-0">
                      <div className="space-y-3">
                        {NODE_TYPES.map((nodeType) => (
                          <div key={nodeType.type} className="flex items-center gap-3 p-3 rounded-lg border">
                            <nodeType.icon className={cn("h-5 w-5", nodeType.color)} />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{nodeType.label}</p>
                              <p className="text-xs text-muted-foreground">{nodeType.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="px-6 py-4 border-t shrink-0">
                  <SheetFooter className="gap-2 p-0">
                    <Button variant="outline" onClick={handleCancelSettings}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSettings}>Save</Button>
                  </SheetFooter>
                </div>
              </SheetContent>
            </Sheet>
            
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Import Data</p>
                </TooltipContent>
              </Tooltip>
              
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>导入流程数据</DialogTitle>
                  <DialogDescription>
                    粘贴 Markdown 数据来导入节点和连接，或复制辅助 Prompt 到其他 AI 工具生成数据
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 flex flex-col gap-4 overflow-auto py-4">
                  {/* Helper Prompt Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>辅助 Prompt（复制到 ChatGPT 等 AI 工具使用）</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPrompt}
                        className="h-8"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            复制 Prompt
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={generateImportPrompt()}
                      readOnly
                      className="font-mono text-xs h-[200px] resize-none bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      💡 复制此 Prompt 到 ChatGPT/Claude，描述你的需求，AI 会生成符合格式的 Markdown 流程图
                    </p>
                  </div>
                  
                  {/* Import Markdown Input */}
                  <div className="space-y-2 flex-1 flex flex-col min-h-0">
                    <Label>粘贴生成的 Markdown 数据（或直接粘贴导出的 Markdown）</Label>
                    <Textarea
                      value={importMarkdown}
                      onChange={(e) => setImportMarkdown(e.target.value)}
                      placeholder="# Canvas Export&#10;&#10;## Nodes&#10;&#10;### 节点标题&#10;- **ID**: `node-1`&#10;- **Type**: goal&#10;..."
                      className="font-mono text-sm flex-1 min-h-[200px] resize-none"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleImport} disabled={!importMarkdown.trim()}>
                    导入
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  className="bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Export as Markdown</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex-1 relative">
          <CanvasFlow />
        </div>
        <CanvasToolbar />
        {aiSidebarOpen && <AISidebar />}
        <NodeEditPanel />
        <CommentPanel />
      </div>
    </ReactFlowProvider>
  )
}
