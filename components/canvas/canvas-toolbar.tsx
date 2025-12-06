"use client"
import { useState, useRef, useCallback } from "react"
import {
  Send,
  History,
  Plus,
  Target,
  Lightbulb,
  Zap,
  AlertTriangle,
  Package,
  Circle,
  Eye,
  Pencil,
  Frame,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { executeAIActions } from "@/lib/ai-tools"
import { AIResponseRenderer } from "@/components/canvas/ai-response-renderer"
import type { AIContent, AIInteractiveResponse } from "@/lib/types/ai-response"
import { cn } from "@/lib/utils"

const NODE_TYPES = [
  { type: "base", label: "Base", icon: Circle, color: "text-slate-500", description: "Empty node" },
  { type: "goal", label: "Goal", icon: Target, color: "text-blue-500", description: "Objectives" },
  { type: "idea", label: "Idea", icon: Lightbulb, color: "text-yellow-500", description: "Concepts" },
  { type: "action", label: "Action", icon: Zap, color: "text-green-500", description: "Tasks" },
  { type: "risk", label: "Risk", icon: AlertTriangle, color: "text-red-500", description: "Issues" },
  { type: "resource", label: "Resource", icon: Package, color: "text-purple-500", description: "Assets" },
] as const

interface HistoryItem extends AIInteractiveResponse {
  userInput: string
}

export function CanvasToolbar() {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState<AIInteractiveResponse | null>(null)
  const [showResponse, setShowResponse] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [lastPrompt, setLastPrompt] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const {
    methodology,
    updateMethodology,
    addNode,
    nodes,
    edges,
    selectedNodeId,
    isEditMode,
    toggleEditMode,
    aiSettings,
    updateAISettings,
    setCommentPanelOpen,
    addComment,
    isCreatingGroup,
  } = useCanvasStore()

  // Convert MethodologyRule[] to markdown string for API
  const methodologyString = methodology
    .filter((r) => r.enabled)
    .map((r) => `## ${r.title}\n${r.content}`)
    .join("\n\n")

  // Convert markdown string to MethodologyRule[] for editing
  const [methodologyText, setMethodologyText] = useState(
    methodology.map((r) => `## ${r.title}\n${r.content}`).join("\n\n"),
  )

  const handleMethodologyChange = (text: string) => {
    setMethodologyText(text)
    // Parse text back to MethodologyRule[]
    const rules = text
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
    updateMethodology(rules.length > 0 ? rules : [{ id: "default", title: "Default", content: text, enabled: true }])
  }

  const handleCreateNode = (type: string) => {
    const viewportCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const offset = { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 }
    addNode(type as "base" | "goal" | "idea" | "action" | "risk" | "resource", {
      x: viewportCenter.x + offset.x - 150,
      y: viewportCenter.y + offset.y - 100,
    })
  }

  const handleCreateGroup = () => {
    // Start drag-to-create mode
    useCanvasStore.getState().setCreatingGroup(true)
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    setInput("")
    setLastPrompt(userInput)
    setIsLoading(true)
    setShowResponse(false)
    setCurrentResponse(null)

    try {
      const canvasContext = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.type || n.data?.nodeType || "base",
          title: n.data?.title || "Untitled",
          description: n.data?.description || "",
          sections: n.data?.sections || [],
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          weight: (e.data as { weight?: string })?.weight || "weak",
          label: (e.data as { label?: string })?.label,
        })),
        selectedNodeId: selectedNodeId || undefined,
      }

      const res = await fetch("/api/canvas-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userInput,
          methodology: methodologyString,
          aiSettings,
          canvasContext,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setCurrentResponse({
          id: `response-${Date.now()}`,
          contents: [{ type: "text", text: data.message || "An error occurred" }],
          requiresConfirmation: false,
          status: "completed",
        })
        setShowResponse(true)
        return
      }

      const contents: AIContent[] = []

      if (data.type === "form" && (data.form || data.steps)) {
        contents.push({
          type: "form",
          title: data.title || data.form?.title,
          description: data.description || data.form?.description,
          steps: data.steps || data.form?.steps,
          submitLabel: "Submit",
          cancelLabel: "Cancel",
        })
      } else if (data.type === "actions" && data.requiresConfirmation && data.actions && data.actions.length > 0) {
        contents.push({
          type: "actions",
          message: `${data.actions.length} action(s) pending your approval`,
          actions: [
            { id: "approve", label: "Approve", variant: "approve" },
            { id: "reject", label: "Reject", variant: "reject" },
          ],
        })
      } else {
        // Handle text/markdown responses
        if (data.message) {
          if (
            data.type === "markdown" ||
            data.message.includes("**") ||
            data.message.includes("##") ||
            data.message.includes("- ")
          ) {
            contents.push({ type: "markdown", markdown: data.message })
          } else {
            contents.push({ type: "text", text: data.message })
          }
        }

        // Add follow-up questions as choices
        if (data.followUpQuestions && data.followUpQuestions.length > 0) {
          contents.push({
            type: "choice",
            question: "Would you like to:",
            options: data.followUpQuestions.map((q: string, i: number) => ({
              label: q,
              value: `followup-${i}`,
            })),
            allowCustom: true,
          })
        }
      }

      const isFormResponse = data.type === "form"
      const isActionResponse = data.type === "actions" && data.requiresConfirmation

      const response: AIInteractiveResponse = {
        id: `response-${Date.now()}`,
        contents,
        actions: data.actions || [],
        requiresConfirmation: isActionResponse,
        status: isActionResponse ? "pending" : isFormResponse ? "pending" : "completed",
        timestamp: new Date(),
      }

      setCurrentResponse(response)
      setShowResponse(true)

      // Only add to history if it's a simple text response (not requiring interaction)
      if (!isActionResponse && !isFormResponse) {
        setHistory((prev) => [{ ...response, userInput }, ...prev])
      }
    } catch (error) {
      console.error("[v0] AI request failed:", error)
      setCurrentResponse({
        id: `error-${Date.now()}`,
        contents: [{ type: "text", text: "Failed to connect to AI service. Please check your settings." }],
        requiresConfirmation: false,
        status: "completed",
      })
      setShowResponse(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = useCallback(
    async (actionId: string) => {
      if (!currentResponse) return

      if (actionId === "approve" && currentResponse.actions) {
        const results = await executeAIActions(currentResponse.actions)
        const successCount = results.filter((r) => r.success).length

        const updatedResponse: AIInteractiveResponse = {
          ...currentResponse,
          status: "approved",
          contents: [
            ...currentResponse.contents.filter((c) => c.type !== "actions"),
            {
              type: "text",
              text: `Executed ${successCount}/${results.length} actions successfully.`,
            },
          ],
        }

        setCurrentResponse(updatedResponse)
        setHistory((prev) => [{ ...updatedResponse, userInput: "" }, ...prev])

        // Close popup after action is completed
        setTimeout(() => {
          setShowResponse(false)
          setCurrentResponse(null)
        }, 2000)
      } else if (actionId === "reject") {
        const updatedResponse: AIInteractiveResponse = {
          ...currentResponse,
          status: "rejected",
          contents: [
            ...currentResponse.contents.filter((c) => c.type !== "actions"),
            { type: "text", text: "Actions cancelled." },
          ],
        }

        setCurrentResponse(updatedResponse)
        setHistory((prev) => [{ ...updatedResponse, userInput: "" }, ...prev])

        // Close popup after rejection
        setTimeout(() => {
          setShowResponse(false)
          setCurrentResponse(null)
        }, 1500)
      }
    },
    [currentResponse],
  )

  const handleFormSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      let nextPrompt = lastPrompt
      let nextFormData: Record<string, unknown> | undefined = data

      // Handle follow-up question selection
      if (data.choice && typeof data.choice === "string") {
        if (data.choice.startsWith("followup-")) {
          const idx = Number.parseInt(data.choice.split("-")[1])
          const followUp = currentResponse?.contents.find((c) => c.type === "choice")
          if (followUp && followUp.type === "choice" && followUp.options[idx]) {
            nextPrompt = followUp.options[idx].label
          }
        } else {
          nextPrompt = data.choice
        }
        // Treat choice as a new prompt
        nextFormData = undefined
        setLastPrompt(nextPrompt)
      }

      // Handle form data submission
      console.log("[v0] Form submitted:", data)

      // Add form submission to history
      if (currentResponse) {
        const updatedResponse: AIInteractiveResponse = {
          ...currentResponse,
          status: "completed",
        }
        setHistory((prev) => [{ ...updatedResponse, userInput: nextFormData ? JSON.stringify(nextFormData) : nextPrompt }, ...prev])
      }

      // Close popup and start loading
      setShowResponse(false)
      setCurrentResponse(null)
      setIsLoading(true)

      try {
        const canvasContext = {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.data?.type || n.data?.nodeType || "base",
            title: n.data?.title || "Untitled",
            description: n.data?.description || "",
            sections: n.data?.sections || [],
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            weight: (e.data as { weight?: string })?.weight || "weak",
            label: (e.data as { label?: string })?.label,
          })),
          selectedNodeId: selectedNodeId || undefined,
        }

        const res = await fetch("/api/canvas-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: nextPrompt,
            formData: nextFormData,
            methodology: methodologyString,
            aiSettings,
            canvasContext,
          }),
        })

        const responseData = await res.json()

        if (responseData.error) {
          setCurrentResponse({
            id: `response-${Date.now()}`,
            contents: [{ type: "text", text: responseData.message || "An error occurred" }],
            requiresConfirmation: false,
            status: "completed",
          })
          setShowResponse(true)
          return
        }

        const contents: AIContent[] = []

        if (responseData.type === "form" && (responseData.form || responseData.steps)) {
          contents.push({
            type: "form",
            title: responseData.title || responseData.form?.title,
            description: responseData.description || responseData.form?.description,
            steps: responseData.steps || responseData.form?.steps,
            submitLabel: "Submit",
            cancelLabel: "Cancel",
          })
        } else if (
          responseData.type === "actions" &&
          responseData.actions &&
          responseData.actions.length > 0
        ) {
          contents.push({
            type: "actions",
            message: `${responseData.actions.length} action(s) pending your approval`,
            actions: [
              { id: "approve", label: "Approve", variant: "approve" },
              { id: "reject", label: "Reject", variant: "reject" },
            ],
          })
        } else {
          // Handle text/markdown responses
          if (responseData.message) {
            if (
              responseData.type === "markdown" ||
              responseData.message.includes("**") ||
              responseData.message.includes("##") ||
              responseData.message.includes("- ")
            ) {
              contents.push({ type: "markdown", markdown: responseData.message })
            } else {
              contents.push({ type: "text", text: responseData.message })
            }
          }

          // Add follow-up questions as choices
          if (responseData.followUpQuestions && responseData.followUpQuestions.length > 0) {
            contents.push({
              type: "choice",
              question: "Would you like to:",
              options: responseData.followUpQuestions.map((q: string, i: number) => ({
                label: q,
                value: `followup-${i}`,
              })),
              allowCustom: true,
            })
          }
        }

        const isFormResponse = responseData.type === "form"
        const isActionResponse = responseData.type === "actions"

        const response: AIInteractiveResponse = {
          id: `response-${Date.now()}`,
          contents,
          actions: responseData.actions || [],
          requiresConfirmation: isActionResponse,
          status: isActionResponse ? "pending" : isFormResponse ? "pending" : "completed",
          timestamp: new Date(),
        }

        setCurrentResponse(response)
        setShowResponse(true)

        if (!isActionResponse && !isFormResponse) {
          setHistory((prev) => [{ ...response, userInput: "Form Data Processed" }, ...prev])
        }
      } catch (error) {
        console.error("[v0] AI request failed:", error)
        setCurrentResponse({
          id: `error-${Date.now()}`,
          contents: [{ type: "text", text: "Failed to connect to AI service. Please check your settings." }],
          requiresConfirmation: false,
          status: "completed",
        })
        setShowResponse(true)
      } finally {
        setIsLoading(false)
      }
    },
    [currentResponse, lastPrompt, nodes, edges, selectedNodeId, methodology, aiSettings],
  )

  const handleCancel = useCallback(() => {
    if (currentResponse) {
      const updatedResponse: AIInteractiveResponse = {
        ...currentResponse,
        status: "rejected",
      }
      setHistory((prev) => [{ ...updatedResponse, userInput: "" }, ...prev])
    }
    setShowResponse(false)
    setCurrentResponse(null)
  }, [currentResponse])

  const handleClosePopup = useCallback(() => {
    if (currentResponse) {
      setHistory((prev) => [{ ...currentResponse, userInput: "", status: "completed" as const }, ...prev])
    }
    setShowResponse(false)
    setCurrentResponse(null)
  }, [currentResponse])

  const handleGetSuggestions = async () => {
    setIsLoading(true)
    setShowResponse(false)
    setCurrentResponse(null)

    try {
      const canvasContext = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.type || n.data?.nodeType || "base",
          title: n.data?.title || "Untitled",
          description: n.data?.description || "",
          sections: n.data?.sections || [],
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          weight: (e.data as { weight?: string })?.weight || "weak",
          label: (e.data as { label?: string })?.label,
        })),
        selectedNodeId: selectedNodeId || undefined,
      }

      const res = await fetch("/api/canvas-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "Please analyze the current canvas and provide suggestions for improvement. Look for missing connections, suggest new nodes, and identify potential issues.",
          methodology: methodologyString,
          aiSettings,
          canvasContext,
        }),
      })

      const data = await res.json()

      if (data.message) {
        addComment({
          nodeId: null,
          author: "ai",
          content: data.message,
          actions: data.actions,
        })
        setCommentPanelOpen(true)
      }
    } catch (error) {
      console.error("[v0] Suggestions request failed:", error)
      setCurrentResponse({
        id: `error-${Date.now()}`,
        contents: [{ type: "text", text: "Failed to get suggestions. Please try again." }],
        requiresConfirmation: false,
        status: "completed",
      })
      setShowResponse(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-full px-3 py-2 shadow-lg">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {NODE_TYPES.map((nodeType) => (
                <DropdownMenuItem
                  key={nodeType.type}
                  onClick={() => handleCreateNode(nodeType.type)}
                  className="flex items-center gap-2"
                >
                  <nodeType.icon className={cn("h-4 w-4", nodeType.color)} />
                  <span>{nodeType.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{nodeType.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCreatingGroup ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  isCreatingGroup && "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/50",
                )}
                onClick={handleCreateGroup}
              >
                <Frame className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isCreatingGroup ? "Click and drag on canvas to create section" : "Create Section"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditMode ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={toggleEditMode}
              >
                {isEditMode ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isEditMode ? "Edit Mode" : "View Mode"}</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full relative overflow-hidden"
                onClick={handleGetSuggestions}
                disabled={isLoading}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
                <div className="absolute inset-[2px] bg-background rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20" />
                {isLoading && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_4px_var(--primary)]" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Get some suggestions</TooltipContent>
          </Tooltip>

          <div className="relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask AI..."
              className="w-[200px] sm:w-[300px] h-8 text-sm rounded-full pr-8"
              disabled={isLoading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 rounded-full"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>

            {(showResponse && currentResponse) || isLoading ? (
              <div
                ref={popoverRef}
                className={cn(
                  "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[320px] sm:w-[400px]",
                  "bg-background border rounded-lg shadow-lg p-4 max-h-[60vh] overflow-y-auto",
                  (currentResponse?.status === "pending" || isLoading) && "ring-2 ring-primary",
                )}
              >
                {currentResponse?.status === "pending" && !isLoading && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Waiting for your response</span>
                  </div>
                )}

                <AIResponseRenderer
                  contents={currentResponse?.contents || []}
                  isLoading={isLoading}
                  onAction={handleAction}
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancel}
                />

                {/* Close button - always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={handleClosePopup}
                  disabled={isLoading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="w-px h-6 bg-border" />

          <Sheet open={showHistory} onOpenChange={setShowHistory}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px]">
              <SheetHeader>
                <SheetTitle>Conversation History</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No history yet</p>
                  ) : (
                    history.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        {item.userInput && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">You:</span> {item.userInput}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              item.status === "approved"
                                ? "default"
                                : item.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                          {item.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <div className="text-sm">
                          {item.contents.map((content, i) => {
                            if (content.type === "text") return <p key={i}>{content.text}</p>
                            if (content.type === "markdown") return <p key={i}>{content.markdown}</p>
                            return null
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </TooltipProvider>
  )
}
