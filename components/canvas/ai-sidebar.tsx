"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  X,
  Send,
  Loader2,
  Check,
  XCircle,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp,
  Pencil,
  Link,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  RotateCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useCanvasStore } from "@/lib/store/canvas-store"
import type { TimelineEntry } from "@/lib/types/canvas"

const actionIcons = {
  modify: Pencil,
  connect: Link,
  create: Plus,
  delete: Trash2,
  reorganize: RefreshCw,
}

function TimelineEntryComponent({
  entry,
  onConfirm,
  onReject,
  onRetry,
}: {
  entry: TimelineEntry
  onConfirm: () => void
  onReject: (reason?: string) => void
  onRetry?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectInput, setShowRejectInput] = useState(false)

  const isAI = entry.author === "ai"
  const isError = entry.type === "error"
  const hasPendingAction = entry.content.action?.status === "pending"
  const ActionIcon = entry.content.action?.type ? actionIcons[entry.content.action.type] : null

  const handleReject = () => {
    if (showRejectInput) {
      onReject(rejectReason || undefined)
      setShowRejectInput(false)
      setRejectReason("")
    } else {
      setShowRejectInput(true)
    }
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        isAI ? "bg-muted/50" : "bg-card",
        hasPendingAction && "border-primary/50",
        isError && "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0",
            isAI ? "bg-primary text-primary-foreground" : "bg-secondary",
            isError && "bg-destructive text-destructive-foreground"
          )}
        >
          {isError ? <AlertCircle className="w-4 h-4" /> : isAI ? "AI" : "You"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            {isError && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive">
                Error
              </span>
            )}
            {entry.content.action && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  entry.content.action.status === "pending" && "bg-yellow-500/20 text-yellow-600",
                  entry.content.action.status === "confirmed" && "bg-green-500/20 text-green-600",
                  entry.content.action.status === "rejected" && "bg-red-500/20 text-red-600",
                )}
              >
                {entry.content.action.status === "pending"
                  ? "Pending"
                  : entry.content.action.status === "confirmed"
                    ? "Confirmed"
                    : "Rejected"}
              </span>
            )}
          </div>

          <p className={cn("text-sm", isError && "text-destructive")}>{entry.content.text}</p>

          {/* Error Details */}
          {isError && entry.error && (
            <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-muted-foreground">{entry.error.message}</p>
              {entry.error.code && (
                <p className="text-xs text-muted-foreground mt-1">Code: {entry.error.code}</p>
              )}
            </div>
          )}

          {entry.content.action && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 h-7 gap-1 text-xs">
                  {ActionIcon && <ActionIcon className="w-3 h-3" />}
                  {entry.content.action.type.charAt(0).toUpperCase() + entry.content.action.type.slice(1)} Suggestion
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {entry.content.action.field && (
                  <div className="text-xs bg-background rounded p-2">
                    <span className="text-muted-foreground">Field:</span> {entry.content.action.field}
                    <br />
                    <span className="text-muted-foreground">{String(entry.content.action.oldValue)}</span>
                    {" → "}
                    <span className="font-medium">{String(entry.content.action.newValue)}</span>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {hasPendingAction && (
            <div className="mt-3 space-y-2">
              {showRejectInput && (
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  className="h-8 text-sm"
                  autoFocus
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 gap-1" onClick={onConfirm}>
                  <Check className="w-3 h-3" />
                  Confirm
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1 bg-transparent" onClick={handleReject}>
                  <XCircle className="w-3 h-3" />
                  {showRejectInput ? "Submit" : "Reject"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Discuss
                </Button>
              </div>
            </div>
          )}

          {entry.content.action?.status === "rejected" && entry.content.action.rejectionReason && (
            <p className="mt-2 text-xs text-muted-foreground italic">Reason: {entry.content.action.rejectionReason}</p>
          )}

          {/* Retry Button for Errors */}
          {isError && entry.error?.retryable && onRetry && (
            <div className="mt-3">
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={onRetry}>
                <RotateCw className="w-3 h-3" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AISidebar() {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { nodes, currentNodeForAI, setAISidebarOpen, addTimelineEntry, updateTimelineStatus } = useCanvasStore()

  const currentNode = nodes.find((n) => n.id === currentNodeForAI)

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !currentNodeForAI || isLoading) return

    const userMessage = input
    addTimelineEntry(currentNodeForAI, {
      author: "user",
      type: "comment",
      content: { text: userMessage },
    })

    setInput("")
    setIsLoading(true)

    const requestPayload = {
      nodeData: currentNode?.data,
      message: userMessage,
    }

    try {
      const res = await fetch("/api/canvas-ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()

      addTimelineEntry(currentNodeForAI, {
        author: "ai",
        type: data.action ? "modification" : "comment",
        content: {
          text: data.text,
          action: data.action
            ? {
                ...data.action,
                status: "pending" as const,
              }
            : undefined,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      addTimelineEntry(currentNodeForAI, {
        author: "ai",
        type: "error",
        content: {
          text: "Sorry, I encountered an error while processing your request.",
        },
        error: {
          message: errorMessage,
          retryable: true,
        },
        retryPayload: requestPayload,
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, currentNodeForAI, currentNode, isLoading, addTimelineEntry])

  const handleConfirm = useCallback(
    (entryId: string) => {
      if (currentNodeForAI) {
        updateTimelineStatus(currentNodeForAI, entryId, "confirmed")
      }
    },
    [currentNodeForAI, updateTimelineStatus],
  )

  const handleReject = useCallback(
    (entryId: string, reason?: string) => {
      if (currentNodeForAI) {
        updateTimelineStatus(currentNodeForAI, entryId, "rejected", reason)
      }
    },
    [currentNodeForAI, updateTimelineStatus],
  )

  const handleRetry = useCallback(
    async (entry: TimelineEntry) => {
      if (!currentNodeForAI || isLoading || !entry.retryPayload) return

      setIsLoading(true)

      try {
        const res = await fetch("/api/canvas-ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.retryPayload),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
        }

        const data = await res.json()

        addTimelineEntry(currentNodeForAI, {
          author: "ai",
          type: data.action ? "modification" : "comment",
          content: {
            text: data.text,
            action: data.action
              ? {
                  ...data.action,
                  status: "pending" as const,
                }
              : undefined,
          },
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        addTimelineEntry(currentNodeForAI, {
          author: "ai",
          type: "error",
          content: {
            text: "Retry failed. Please check your connection and try again.",
          },
          error: {
            message: errorMessage,
            retryable: true,
          },
          retryPayload: entry.retryPayload,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [currentNodeForAI, isLoading, addTimelineEntry],
  )

  const handleStartAnalysis = useCallback(async () => {
    if (!currentNodeForAI || isLoading) return

    setIsLoading(true)

    const requestPayload = {
      nodeData: currentNode?.data,
      message: "Please analyze this node and provide suggestions.",
    }

    try {
      const res = await fetch("/api/canvas-ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()

      addTimelineEntry(currentNodeForAI, {
        author: "ai",
        type: data.action ? "modification" : "comment",
        content: {
          text: data.text,
          action: data.action
            ? {
                ...data.action,
                status: "pending" as const,
              }
            : undefined,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      addTimelineEntry(currentNodeForAI, {
        author: "ai",
        type: "error",
        content: {
          text: "Sorry, I encountered an error analyzing this node.",
        },
        error: {
          message: errorMessage,
          retryable: true,
        },
        retryPayload: requestPayload,
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentNodeForAI, currentNode, isLoading, addTimelineEntry])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [currentNode?.data.timeline.length])

  if (!currentNode) {
    return null
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-card border-l shadow-lg flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">AI Analysis</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{currentNode.data.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(!showHistory)}>
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAISidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b shrink-0">
        <Button size="sm" onClick={handleStartAnalysis} disabled={isLoading} className="w-full gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start AI Analysis"}
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {currentNode.data.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversation yet. Start an analysis or ask a question.
            </p>
          ) : (
            currentNode.data.timeline.map((entry) => (
              <TimelineEntryComponent
                key={entry.id}
                entry={entry}
                onConfirm={() => handleConfirm(entry.id)}
                onReject={(reason) => handleReject(entry.id, reason)}
                onRetry={entry.type === "error" ? () => handleRetry(entry) : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Input */}
      <div className="p-4 shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask about this node..."
            disabled={isLoading}
          />
          <Button size="icon" onClick={handleSendMessage} disabled={!input.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
