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
import { Download, Settings, Target, Lightbulb, Zap, AlertTriangle, Package, Circle } from "lucide-react"
import { exportCanvasToMarkdown, downloadMarkdown } from "@/lib/export-canvas"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
