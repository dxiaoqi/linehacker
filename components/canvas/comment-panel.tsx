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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useCanvasStore } from "@/lib/store/canvas-store"
import { executeAIAction } from "@/lib/ai-tools"
import type { CanvasComment } from "@/lib/types/canvas"
import { useReactFlow } from "@xyflow/react"

export function CommentPanel() {
  const {
    comments,
    commentPanelOpen,
    commentTargetId,
    nodes,
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
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commentPanelOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [commentPanelOpen])

  useEffect(() => {
    if (highlightedNodeId) {
      const timer = setTimeout(() => {
        setHighlightedNodeId(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightedNodeId])

  if (!commentPanelOpen) return null

  const sortedComments = [...comments].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const getTargetName = (comment: CanvasComment) => {
    if (comment.targetType === "canvas") return "Canvas"
    const node = nodes.find((n) => n.id === comment.targetId)
    if (!node) return "Unknown"
    return (node.data as { title?: string }).title || "Untitled"
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return
    addComment({
      targetType: commentTargetId ? "node" : "canvas",
      targetId: commentTargetId || "canvas",
      author: "user",
      content: newComment.trim(),
    })
    setNewComment("")
  }

  const handleReply = (commentId: string) => {
    if (!replyContent.trim()) return
    addReply(commentId, replyContent.trim(), "user")
    setReplyContent("")
    setReplyingTo(null)
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

  const handleApprove = async (comment: CanvasComment) => {
    if (!comment.suggestion) return
    const result = await executeAIAction(comment.suggestion.action)
    if (result.success) {
      updateCommentSuggestionStatus(comment.id, "approved")
    }
  }

  const handleReject = (comment: CanvasComment) => {
    if (!comment.suggestion) return
    updateCommentSuggestionStatus(comment.id, "rejected")
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

  const shouldShowAllReplies = (comment: CanvasComment) => {
    // If 3 or fewer replies, always show all
    if (comment.replies.length <= 3) return true
    // If more than 3, check if collapsed (collapsed by default for >3)
    return !collapsedReplies.has(comment.id) === false
  }

  const handleDeleteReply = (commentId: string, replyId: string) => {
    deleteReply(commentId, replyId)
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">Comments</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {sortedComments.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCommentPanelOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {sortedComments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Add a comment or get AI suggestions</p>
            </div>
          ) : (
            sortedComments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  !comment.isRead && comment.author === "ai" && "border-primary/50 bg-primary/5",
                  comment.suggestion?.status === "approved" && "border-green-500/30 bg-green-500/5",
                  comment.suggestion?.status === "rejected" && "border-red-500/30 bg-red-500/5",
                )}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        comment.author === "ai" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {comment.author === "ai" ? "AI" : "U"}
                    </div>
                    <div>
                      <span className="text-xs font-medium">{comment.author === "ai" ? "AI Assistant" : "You"}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(comment.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteComment(comment.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <button
                  onClick={() => handleNavigateToTarget(comment)}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-1 rounded mb-2 transition-colors",
                    comment.targetType === "canvas"
                      ? "bg-muted/50 text-muted-foreground cursor-default"
                      : "bg-muted hover:bg-muted/80 group cursor-pointer",
                  )}
                  disabled={comment.targetType === "canvas"}
                >
                  <Navigation
                    className={cn(
                      "h-3 w-3",
                      comment.targetType === "canvas"
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground group-hover:text-primary transition-colors",
                    )}
                  />
                  <span>{getTargetName(comment)}</span>
                </button>

                {/* Comment Content */}
                <p className="text-sm mb-2">{comment.content}</p>

                {/* Suggestion Actions */}
                {comment.suggestion && comment.suggestion.status === "pending" && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground flex-1">Suggested: {comment.suggestion.type}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-green-600 border-green-600/30 hover:bg-green-600/10 bg-transparent"
                      onClick={() => handleApprove(comment)}
                    >
                      <Check className="h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-red-600 border-red-600/30 hover:bg-red-600/10 bg-transparent"
                      onClick={() => handleReject(comment)}
                    >
                      <XIcon className="h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* Suggestion Status */}
                {comment.suggestion && comment.suggestion.status !== "pending" && (
                  <div className="mt-2 pt-2 border-t">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        comment.suggestion.status === "approved"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-red-500/20 text-red-600",
                      )}
                    >
                      {comment.suggestion.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                )}

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    {comment.replies.length > 3 && (
                      <button
                        onClick={() => toggleCollapseReplies(comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
                      >
                        {collapsedReplies.has(comment.id) ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {collapsedReplies.has(comment.id)
                          ? `Show all ${comment.replies.length} replies`
                          : `Collapse replies`}
                      </button>
                    )}
                    {(comment.replies.length <= 3 || !collapsedReplies.has(comment.id)) && (
                      <div className="space-y-2 pl-3 border-l-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="text-xs group">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{reply.author === "ai" ? "AI" : "You"}</span>
                                <span className="text-muted-foreground">
                                  {new Date(reply.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteReply(comment.id, reply.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                            <p className="text-muted-foreground">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {comment.replies.length > 3 && collapsedReplies.has(comment.id) && (
                      <div className="text-xs text-muted-foreground pl-3">{comment.replies.length} replies hidden</div>
                    )}
                  </div>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
                    />
                    <Button size="sm" className="h-8" onClick={() => handleReply(comment.id)}>
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setReplyingTo(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* New Comment Input */}
      <div className="p-4 border-t">
        {commentTargetId && (
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            Commenting on: {nodes.find((n) => n.id === commentTargetId)?.data?.title || "Selected node"}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={commentTargetId ? "Comment on this node..." : "Add a comment to canvas..."}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <Button onClick={handleAddComment} disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
