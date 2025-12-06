// AI Response content types for interactive forms

export type AIContentType =
  | "text" // Plain text
  | "markdown" // Markdown formatted text
  | "form" // Multi-step form
  | "actions" // Action buttons (approve/reject)
  | "choice" // Single choice (radio)
  | "multi-choice" // Multiple choice (checkbox)
  | "input" // Text input
  | "select" // Dropdown select

export interface AITextContent {
  type: "text"
  text: string
}

export interface AIMarkdownContent {
  type: "markdown"
  markdown: string
}

export interface AIFormField {
  id: string
  label: string
  type: "input" | "radio" | "select" | "checkbox" | "textarea"
  placeholder?: string
  options?: { label: string; value: string }[]
  required?: boolean
  defaultValue?: string | string[]
}

export interface AIFormStep {
  id: string
  title: string
  description?: string
  fields: AIFormField[]
}

export interface AIFormContent {
  type: "form"
  title: string
  description?: string
  steps: AIFormStep[]
  submitLabel?: string
  cancelLabel?: string
}

export interface AIActionsContent {
  type: "actions"
  message: string
  actions: {
    id: string
    label: string
    variant: "approve" | "reject" | "default" | "destructive"
    icon?: string
  }[]
}

export interface AIChoiceContent {
  type: "choice"
  question: string
  options: { label: string; value: string; description?: string }[]
  allowCustom?: boolean
}

export interface AIMultiChoiceContent {
  type: "multi-choice"
  question: string
  options: { label: string; value: string; description?: string }[]
  minSelect?: number
  maxSelect?: number
}

export interface AIInputContent {
  type: "input"
  question: string
  placeholder?: string
  inputType?: "text" | "number" | "email" | "url"
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

export interface AISelectContent {
  type: "select"
  question: string
  options: { label: string; value: string; group?: string }[]
  placeholder?: string
  searchable?: boolean
}

export type AIContent =
  | AITextContent
  | AIMarkdownContent
  | AIFormContent
  | AIActionsContent
  | AIChoiceContent
  | AIMultiChoiceContent
  | AIInputContent
  | AISelectContent

export interface AIInteractiveResponse {
  id: string
  contents: AIContent[]
  actions?: import("./canvas").AIAction[]
  requiresConfirmation: boolean
  status: "pending" | "completed" | "approved" | "rejected"
  timestamp?: Date
}
