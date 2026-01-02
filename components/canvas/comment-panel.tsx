"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Send,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  XIcon,
  Reply,
  Navigation,
  Plus,
  Edit,
  Link2,
  FileText,
  Loader2,
  ArrowUpRight,
  AtSign,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { executeAIActions, buildCanvasContext } from "@/lib/ai-tools"
import type { CanvasComment, AIAction } from "@/lib/types/canvas"
import { useReactFlow } from "@xyflow/react"

// Icon mapping for different action types
const getActionIcon = (type: AIAction["type"]) => {
  switch (type) {
    case "create":
      return Plus
    case "modify":
      return Edit
    case "connect":
      return Link2
    case "delete":
      return Trash2
    case "reorganize":
      return FileText
    default:
      return FileText
  }
}

// Helper to calculate text width for precise positioning
const getTextWidth = (text: string, font: string) => {
  if (typeof window === 'undefined') return 0
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (context) {
    context.font = font
    return context.measureText(text).width
  }
  return 0
}

const getActionDescription = (action: AIAction): string => {
  const actionType = action.type as string
  switch (actionType) {
    case "create":
      return `创建 ${action.nodeType || "node"} 节点: ${action.title || "New node"}`
    case "create-group":
      return `创建分组: ${(action as any).groupTitle || action.title || "新分组"}`
    case "modify":
      return `修改${action.nodeId ? "节点" : "项目"}: ${action.field || "property"}`
    case "connect":
      return `连接节点${(action as any).sourceTitle && (action as any).targetTitle ? `: "${(action as any).sourceTitle}" → "${(action as any).targetTitle}"` : ""}`
    case "delete":
      return `删除 ${action.nodeId || "item"}`
    case "reorganize":
      return "重新组织结构"
    case "add-section":
      return `添加章节: ${(action as any).sectionTitle || "新章节"}`
    case "update-section":
      return `更新章节: ${(action as any).sectionTitle || "章节"}`
    case "delete-section":
      return `删除章节: ${(action as any).sectionId || "章节"}`
    default:
      return "操作"
  }
}

// Mention options
const MENTION_OPTIONS = [
  { id: "AI", label: "AI Assistant", icon: Sparkles, description: "Get AI help and suggestions" },
]

export function CommentPanel() {
  const {
    comments,
    commentPanelOpen,
    commentTargetId,
    nodes,
    edges,
    setCommentPanelOpen,
    addComment,
    deleteComment,
    addReply,
    deleteReply,
    updateCommentSuggestionStatus,
    markCommentAsRead,
    setSelectedNode,
  } = useCanvasStore()

  const { setCenter, getNode } = useReactFlow()
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [collapsedReplies, setCollapsedReplies] = useState<Set<string>>(new Set())
  const [collapsedActions, setCollapsedActions] = useState<Set<string>>(new Set())
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const [isAIResponding, setIsAIResponding] = useState(false)
  const [aiRespondingToComment, setAiRespondingToComment] = useState<string | null>(null)
  const [executingActionsForComment, setExecutingActionsForComment] = useState<string | null>(null)
  
  // Mention state
  const [showMentionPanel, setShowMentionPanel] = useState(false)
  const [mentionPanelPosition, setMentionPanelPosition] = useState({ top: 0, left: 0 })
  const [activeMentionInput, setActiveMentionInput] = useState<'main' | string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const replyInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (commentPanelOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [commentPanelOpen])

  useEffect(() => {
    if (showMentionPanel) {
      setSelectedIndex(0)
    }
  }, [showMentionPanel])

  useEffect(() => {
    if (highlightedNodeId) {
      const timer = setTimeout(() => {
        setHighlightedNodeId(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightedNodeId])

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current && !replyingTo) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }, 100)
      }
    }
  }, [comments.length, replyingTo])

  if (!commentPanelOpen) return null

  const filteredComments = commentTargetId 
    ? comments.filter((c) => c.targetId === commentTargetId)
    : comments

  const sortedComments = [...filteredComments]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const getTargetName = (comment: CanvasComment) => {
    if (comment.targetType === "canvas") return "Canvas"
    const node = nodes.find((n) => n.id === comment.targetId)
    if (!node) return "Unknown"
    return (node.data as { title?: string }).title || "Untitled"
  }

  // Detect @ mention in input
  const detectMention = (text: string, cursorPosition: number) => {
    const beforeCursor = text.slice(0, cursorPosition)
    const atIndex = beforeCursor.lastIndexOf('@')
    
    if (atIndex === -1) return null
    
    const afterAt = beforeCursor.slice(atIndex + 1)
    // Only show if @ is at start or after space, and no space after @
    const isValidPosition = atIndex === 0 || /\s/.test(beforeCursor[atIndex - 1])
    const hasNoSpaceAfter = !afterAt.includes(' ')
    
    if (isValidPosition && hasNoSpaceAfter) {
      return { start: atIndex, query: afterAt.toLowerCase() }
    }
    
    return null
  }

  const handleInputChange = (value: string, inputType: 'main' | string) => {
    if (inputType === 'main') {
      setNewComment(value)
    } else {
      setReplyContent(value)
    }

    const input = inputType === 'main' ? inputRef.current : replyInputRefs.current.get(inputType)
    if (!input) return

    const cursorPosition = input.selectionStart || 0
    const mention = detectMention(value, cursorPosition)

    if (mention) {
      const rect = input.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(input)
      
      // Calculate position based on text width
      const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 12
      const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0
      
      // Measure text up to the @ symbol to align panel with it
      const textUpToAt = value.substring(0, mention.start)
      const textWidth = getTextWidth(textUpToAt, font)
      
      // Calculate coordinates relative to viewport
      // Add small offset (20px) to not cover the @ symbol immediately
      const leftPos = rect.left + paddingLeft + borderLeft + textWidth
      
      // Estimate panel height based on options count (approx 36px per item + padding)
      const estimatedPanelHeight = Math.min(MENTION_OPTIONS.length * 40 + 16, 200)
      
      // Determine vertical position: prefer above, fallback to below if not enough space
      // For now, keep logic simple: try to align bottom of panel with top of input
      
      setMentionPanelPosition({
        top: rect.top - estimatedPanelHeight - 5, // Position above input with slight gap
        left: Math.min(leftPos, rect.right - 180), // Prevent going past right edge of input
      })
      setShowMentionPanel(true)
      setActiveMentionInput(inputType)
    } else {
      setShowMentionPanel(false)
      setActiveMentionInput(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, inputType: 'main' | string) => {
    if (showMentionPanel) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % MENTION_OPTIONS.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + MENTION_OPTIONS.length) % MENTION_OPTIONS.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(MENTION_OPTIONS[selectedIndex].id)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionPanel(false)
        return
      }
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (inputType === 'main') {
        handleAddComment()
      } else {
        // For reply, inputType IS the commentId
        handleAddReply(inputType)
      }
    }
    
    if (e.key === "Escape" && inputType !== 'main') {
        setReplyingTo(null)
        setReplyContent("")
    }
  }

  const insertMention = (mentionId: string) => {
    const inputType = activeMentionInput
    if (!inputType) return

    const currentValue = inputType === 'main' ? newComment : replyContent
    const input = inputType === 'main' ? inputRef.current : replyInputRefs.current.get(inputType)
    if (!input) return

    const cursorPosition = input.selectionStart || 0
    const mention = detectMention(currentValue, cursorPosition)
    if (!mention) return

    const before = currentValue.slice(0, mention.start)
    const after = currentValue.slice(cursorPosition)
    const newValue = `${before}@${mentionId} ${after}`

    if (inputType === 'main') {
      setNewComment(newValue)
    } else {
      setReplyContent(newValue)
    }

    setShowMentionPanel(false)
    setActiveMentionInput(null)

    // Restore focus
    setTimeout(() => {
      input.focus()
      input.setSelectionRange(mention.start + mentionId.length + 2, mention.start + mentionId.length + 2)
    }, 0)
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  const renderTextWithMentions = (text: string) => {
    // First split by newlines to handle line breaks
    const lines = text.split('\n')
    
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(@\w+)/g)
      const renderedParts = parts.map((part, idx) => {
        if (part.match(/^@\w+$/)) {
          return (
            <span
              key={`${lineIdx}-${idx}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-medium"
            >
              <AtSign className="h-2.5 w-2.5" />
              {part.slice(1)}
            </span>
          )
        }
        return <span key={`${lineIdx}-${idx}`}>{part}</span>
      })
      
      // Add line break after each line except the last one
      if (lineIdx < lines.length - 1) {
        return (
          <span key={lineIdx}>
            {renderedParts}
            <br />
          </span>
        )
      }
      return <span key={lineIdx}>{renderedParts}</span>
    })
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    const userInput = newComment.trim()
    const mentions = extractMentions(userInput)
    const shouldTriggerAI = mentions.some(m => m.toLowerCase() === 'ai')
    
    // Create user comment
    const userCommentId = addComment({
      targetType: commentTargetId ? "node" : "canvas",
      targetId: commentTargetId || "canvas",
      author: "user",
      content: userInput,
    })
    
    setNewComment("")
    
    // Trigger AI if @AI mentioned - add as reply to user's comment
    if (shouldTriggerAI) {
      setAiRespondingToComment(userCommentId)
      try {
        const context = buildCanvasContext()
        const targetNode = commentTargetId ? nodes.find(n => n.id === commentTargetId) : null
        
        const response = await fetch("/api/canvas-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userInput,
            canvasContext: context,
            targetNodeId: commentTargetId,
            targetNodeData: targetNode?.data,
            mode: "comment",
          }),
        })

        if (!response.ok) throw new Error("AI response failed")

        const data = await response.json()
        
        const aiReplyContent = data.message || data.text || "I've analyzed your request."
        
        // Add AI reply directly as a reply to user's comment
        const aiReplyData = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          author: "ai" as const,
          content: aiReplyContent,
          timestamp: new Date().toISOString(),
        }
        
        useCanvasStore.setState((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === userCommentId
              ? {
                  ...comment,
                  replies: [...comment.replies, aiReplyData],
                }
              : comment
          ),
        }))
        
        // If there are actions, create a separate comment with actions
        if (data.actions && data.actions.length > 0) {
          const aiCommentData: any = {
            targetType: commentTargetId ? "node" : "canvas",
            targetId: commentTargetId || "canvas",
            author: "ai",
            content: `Based on our conversation, here are the actions I suggest:`,
            actions: {
              actions: data.actions,
              status: "pending",
            }
          }
          addComment(aiCommentData)
        }
      } catch (error) {
        console.error("AI response error:", error)
        const errorReply = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          author: "ai" as const,
          content: "Sorry, I encountered an error while processing your request.",
          timestamp: new Date().toISOString(),
        }
        useCanvasStore.setState((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === userCommentId
              ? {
                  ...comment,
                  replies: [...comment.replies, errorReply],
                }
              : comment
          ),
        }))
      } finally {
        setAiRespondingToComment(null)
      }
    }
  }

  const handleAddReply = async (commentId: string, parentReplyId?: string) => {
    if (!replyContent.trim()) return
    
    const userInput = replyContent.trim()
    const mentions = extractMentions(userInput)
    const hasMentionAI = mentions.some(m => m.toLowerCase() === 'ai')
    
    // Check if replying to AI's comment or AI's reply
    const parentComment = comments.find(c => c.id === commentId)
    const isReplyingToAI = parentComment?.author === 'ai'
    const isReplyingToAIReply = parentReplyId 
      ? parentComment?.replies.find(r => r.id === parentReplyId)?.author === 'ai'
      : false
    
    // Auto-trigger AI if replying to AI's message (even without @mention)
    const shouldTriggerAI = hasMentionAI || isReplyingToAI || isReplyingToAIReply
    
    // Add user reply with mentions
    const replyData = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      author: "user" as const,
      content: userInput,
      timestamp: new Date().toISOString(),
      mentions,
      parentReplyId,
    }
    
    // Manually update store to include mentions
    useCanvasStore.setState((state) => ({
      comments: state.comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [...comment.replies, replyData],
            }
          : comment
      ),
    }))
    
    setReplyContent("")
    setReplyingTo(null)
    
    // Trigger AI reply if needed (by @mention or replying to AI)
    if (shouldTriggerAI) {
      setAiRespondingToComment(commentId)
      try {
        const context = buildCanvasContext()
        const targetNode = commentTargetId ? nodes.find(n => n.id === commentTargetId) : null
        const parentComment = comments.find(c => c.id === commentId)
        
        const response = await fetch("/api/canvas-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userInput,
            canvasContext: context,
            targetNodeId: commentTargetId,
            targetNodeData: targetNode?.data,
            parentComment: parentComment?.content,
            mode: "reply",
          }),
        })

        if (!response.ok) throw new Error("AI response failed")

        const data = await response.json()
        
        let aiReplyContent = data.message || data.text || "I've analyzed your request."
        
        // Add AI reply directly as a reply in the conversation thread
        const aiReplyData = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          author: "ai" as const,
          content: aiReplyContent,
          timestamp: new Date().toISOString(),
          parentReplyId: replyData.id, // Link to user's reply
        }
        
        useCanvasStore.setState((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [...comment.replies, aiReplyData],
                }
              : comment
          ),
        }))
        
        // If there are actions, create a separate comment with actions
        if (data.actions && data.actions.length > 0) {
          const aiCommentData: any = {
            targetType: commentTargetId ? "node" : "canvas",
            targetId: commentTargetId || "canvas",
            author: "ai",
            content: `Based on our conversation, here are the actions I suggest:`,
            actions: {
              actions: data.actions,
              status: "pending",
            }
          }
          addComment(aiCommentData)
        }
      } catch (error) {
        console.error("AI response error:", error)
        const errorReply = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          author: "ai" as const,
          content: "Sorry, I encountered an error while processing your request.",
          timestamp: new Date().toISOString(),
        }
        useCanvasStore.setState((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [...comment.replies, errorReply],
                }
              : comment
          ),
        }))
      } finally {
        setAiRespondingToComment(null)
      }
    }
  }

  const handleNavigateToTarget = (comment: CanvasComment) => {
    if (comment.targetType === "canvas") return

    const node = nodes.find((n) => n.id === comment.targetId)
    if (node) {
      setSelectedNode(node.id)

      const flowNode = getNode(node.id)
      const nodeWidth = flowNode?.measured?.width || 280
      const nodeHeight = flowNode?.measured?.height || 150

      setCenter(node.position.x + nodeWidth / 2, node.position.y + nodeHeight / 2, { zoom: 1.2, duration: 500 })

      setHighlightedNodeId(node.id)

      window.dispatchEvent(new CustomEvent("highlight-node", { detail: { nodeId: node.id } }))
    }
    markCommentAsRead(comment.id)
  }

  const handleApproveActions = async (comment: CanvasComment) => {
    if (!comment.actions) return
    
    setExecutingActionsForComment(comment.id)
    
    try {
      // Type assertion needed due to different AIAction type definitions
      const results = await executeAIActions(comment.actions.actions as any)
      
      if (results.every(r => r.success)) {
        updateCommentActionsStatus(comment.id, "approved")
      } else {
        // Some actions failed, still mark as approved
        updateCommentActionsStatus(comment.id, "approved")
      }
    } catch (error) {
      console.error("Failed to execute actions:", error)
    } finally {
      setExecutingActionsForComment(null)
    }
  }

  const handleRejectActions = (comment: CanvasComment) => {
    if (!comment.actions) return
    updateCommentActionsStatus(comment.id, "rejected")
  }

  const toggleCollapseReplies = (commentId: string) => {
    const newCollapsed = new Set(collapsedReplies)
    if (newCollapsed.has(commentId)) {
      newCollapsed.delete(commentId)
    } else {
      newCollapsed.add(commentId)
    }
    setCollapsedReplies(newCollapsed)
  }

  const toggleCollapseActions = (commentId: string) => {
    const newCollapsed = new Set(collapsedActions)
    if (newCollapsed.has(commentId)) {
      newCollapsed.delete(commentId)
    } else {
      newCollapsed.add(commentId)
    }
    setCollapsedActions(newCollapsed)
  }

  const updateCommentActionsStatus = (commentId: string, status: "approved" | "rejected") => {
    useCanvasStore.setState((state) => ({
      comments: state.comments.map((comment) =>
        comment.id === commentId && comment.actions
          ? { ...comment, actions: { ...comment.actions, status } }
          : comment
      ),
    }))
  }

  const handleDeleteReply = (commentId: string, replyId: string) => {
    deleteReply(commentId, replyId)
  }

  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId)
    setTimeout(() => {
      const input = replyInputRefs.current.get(commentId)
      if (input) {
        input.focus()
      }
    }, 100)
  }

  // Flatten replies for display (but keep hierarchy info)
  const flattenReplies = (replies: any[]) => {
    return replies.map((reply, index) => ({
      ...reply,
      level: 0, // All at same level for now
    }))
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[440px] bg-card border-l shadow-xl z-50 flex flex-col rounded-l-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">Comments</h2>
          {commentTargetId && (
            <span className="text-xs text-muted-foreground">
              · {nodes.find((n) => n.id === commentTargetId)?.data?.title || "Node"}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCommentPanelOpen(false)} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mention Selection Panel - Compact & Interactive */}
      {showMentionPanel && (
        <div
          className="fixed bg-popover text-popover-foreground border rounded-md shadow-lg z-[60] w-[180px] overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1"
          style={{
            top: `${mentionPanelPosition.top + 20}px`,
            left: `${mentionPanelPosition.left}px`,
            transform: 'translateX(0)', // Align left edge to cursor
          }}
        >
          {MENTION_OPTIONS.map((option, index) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => insertMention(option.id)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors text-left",
                  index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary shrink-0">
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0 font-medium text-xs">
                  {option.label}
                </div>
                {index === selectedIndex && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    ↵
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Chat-style Comments List - Scrollable Area */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {sortedComments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Start a conversation</p>
              <p className="text-xs mt-2 flex items-center justify-center gap-1">
                <AtSign className="h-3 w-3" />
                Type @ to mention AI assistant
              </p>
            </div>
          ) : (
            sortedComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-1",
                    comment.author === "ai" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {comment.author === "ai" ? "AI" : "U"}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {/* Header: Author + Time + Node Reference */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium">
                      {comment.author === "ai" ? "AI Assistant" : "You"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.timestamp).toLocaleTimeString()}
                    </span>
                    
                    {/* Node Reference Tag */}
                    {comment.targetType !== "canvas" && (
                      <button
                        onClick={() => handleNavigateToTarget(comment)}
                        className={cn(
                          "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors",
                          "bg-muted hover:bg-muted/80 group cursor-pointer",
                          !comment.isRead && comment.author === "ai" && "bg-primary/10 border border-primary/30"
                        )}
                      >
                        <Navigation
                          className={cn(
                            "h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors"
                          )}
                        />
                        <span className="max-w-[100px] truncate">{getTargetName(comment)}</span>
                        <ArrowUpRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "rounded-xl p-3 relative",
                      comment.author === "ai" 
                        ? "bg-muted/50 border"
                        : "bg-primary/10 border border-primary/20",
                      comment.actions?.status === "approved" && "border-green-500/30 bg-green-500/5",
                      comment.actions?.status === "rejected" && "border-red-500/30 bg-red-500/5",
                    )}
                  >
                    {/* Approve/Reject buttons for AI messages with pending actions */}
                    {comment.author === "ai" && comment.actions && comment.actions.status === "pending" && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {executingActionsForComment === comment.id ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Executing {comment.actions.actions.length} actions...</span>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-600/10"
                              onClick={() => handleApproveActions(comment)}
                              title="Approve actions"
                              disabled={executingActionsForComment !== null}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-600/10"
                              onClick={() => handleRejectActions(comment)}
                              title="Reject actions"
                              disabled={executingActionsForComment !== null}
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Status indicator for approved/rejected */}
                    {comment.author === "ai" && comment.actions && comment.actions.status !== "pending" && (
                      <div className="absolute top-2 right-2">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            comment.actions.status === "approved"
                              ? "bg-green-500/20 text-green-600"
                              : "bg-red-500/20 text-red-600"
                          )}
                        >
                          {comment.actions.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </span>
                      </div>
                    )}

                    {/* Comment text with mentions */}
                    <div className={cn(
                      "text-sm leading-relaxed",
                      comment.actions && "pr-16"
                    )}>
                      {renderTextWithMentions(comment.content)}
                    </div>

                    {/* Collapsible Actions List */}
                    {comment.actions && comment.actions.actions.length > 0 && (
                      <Collapsible
                        open={!collapsedActions.has(comment.id)}
                        onOpenChange={() => toggleCollapseActions(comment.id)}
                        className="mt-3 pt-3 border-t"
                      >
                        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full">
                          {collapsedActions.has(comment.id) ? (
                            <ChevronRight className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          <span className="font-medium">
                            {comment.actions.actions.length} action{comment.actions.actions.length > 1 ? "s" : ""} to execute
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2">
                            {comment.actions.actions.map((action, idx) => {
                              const Icon = getActionIcon(action.type)
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-xs p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
                                >
                                  <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground">{getActionDescription(action)}</div>
                                    {action.description && (
                                      <div className="text-muted-foreground mt-0.5">{action.description}</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Replies Section - Flattened Display with Thread Lines */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {flattenReplies(comment.replies).map((reply) => (
                          <div key={reply.id} className="flex gap-2 group relative">
                            {/* Thread Line */}
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                            
                            <div
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 relative z-10",
                                reply.author === "ai" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {reply.author === "ai" ? "AI" : "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-medium">
                                  {reply.author === "ai" ? "AI" : "You"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(reply.timestamp).toLocaleTimeString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                  onClick={() => handleDeleteReply(comment.id, reply.id)}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                {renderTextWithMentions(reply.content)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI thinking indicator for this specific comment */}
                    {aiRespondingToComment === comment.id && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex gap-2 relative">
                          <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 bg-primary/20 text-primary relative z-10">
                            AI
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Thinking...
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reply Input or Reply Button */}
                    {replyingTo === comment.id ? (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex gap-2">
                          <Input
                            ref={(el) => {
                              if (el) replyInputRefs.current.set(comment.id, el)
                            }}
                            value={replyContent}
                            onChange={(e) => handleInputChange(e.target.value, comment.id)}
                            placeholder="Reply... (type @ to mention)"
                            className="h-8 text-xs"
                            onKeyDown={(e) => handleKeyDown(e, comment.id)}
                          />
                          <Button 
                            size="sm" 
                            className="h-8 shrink-0" 
                            onClick={() => handleAddReply(comment.id)}
                            disabled={!replyContent.trim()}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 shrink-0" 
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyContent("")
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartReply(comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 pt-3 border-t w-full"
                      >
                        <Reply className="h-3 w-3" />
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

        </div>
      </ScrollArea>

      {/* Fixed Input at Bottom */}
      <div className="p-4 border-t shrink-0 bg-card">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newComment}
            onChange={(e) => handleInputChange(e.target.value, 'main')}
            placeholder="Add a comment... (type @ to mention)"
            onKeyDown={(e) => handleKeyDown(e, 'main')}
            disabled={isAIResponding}
            className="flex-1"
          />
          <Button 
            onClick={handleAddComment} 
            disabled={!newComment.trim() || isAIResponding} 
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <AtSign className="h-3 w-3" />
          Type @ to mention AI assistant
        </p>
      </div>
    </div>
  )
}
