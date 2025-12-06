"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  AIContent,
  AITextContent,
  AIMarkdownContent,
  AIFormContent,
  AIActionsContent,
  AIChoiceContent,
  AIMultiChoiceContent,
  AIInputContent,
  AISelectContent,
  AIFormField,
} from "@/lib/types/ai-response"

interface AIResponseRendererProps {
  contents: AIContent[]
  isLoading?: boolean
  onAction?: (actionId: string, data?: Record<string, unknown>) => void
  onSubmit?: (data: Record<string, unknown>) => void
  onCancel?: () => void
}

function TextRenderer({ content }: { content: AITextContent }) {
  return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content.text}</p>
}

function MarkdownRenderer({ content }: { content: AIMarkdownContent }) {
  const parseMarkdown = (md: string) => {
    return md.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-foreground">
            {line.slice(4)}
          </h4>
        )
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="font-semibold text-base mt-4 mb-2 text-foreground">
            {line.slice(3)}
          </h3>
        )
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-foreground">
            {line.slice(2)}
          </h2>
        )
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={i} className="text-sm ml-4 list-disc text-foreground/90">
            {parseInline(line.slice(2))}
          </li>
        )
      }
      const numberedMatch = line.match(/^(\d+)\.\s(.+)/)
      if (numberedMatch) {
        return (
          <li key={i} className="text-sm ml-4 list-decimal text-foreground/90">
            {parseInline(numberedMatch[2])}
          </li>
        )
      }
      if (line.trim() === "") return <div key={i} className="h-2" />
      return (
        <p key={i} className="text-sm text-foreground/90 leading-relaxed">
          {parseInline(line)}
        </p>
      )
    })
  }

  const parseInline = (text: string) => {
    const parts: React.ReactNode[] = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
      const codeMatch = remaining.match(/`([^`]+)`/)

      const matches = [
        { match: boldMatch, type: "bold" },
        { match: italicMatch, type: "italic" },
        { match: codeMatch, type: "code" },
      ].filter((m) => m.match !== null)

      if (matches.length === 0) {
        parts.push(<span key={key++}>{remaining}</span>)
        break
      }

      const earliest = matches.reduce((a, b) =>
        (a.match?.index ?? Number.POSITIVE_INFINITY) < (b.match?.index ?? Number.POSITIVE_INFINITY) ? a : b,
      )

      const match = earliest.match!
      const before = remaining.slice(0, match.index)
      if (before) parts.push(<span key={key++}>{before}</span>)

      if (earliest.type === "bold") {
        parts.push(
          <strong key={key++} className="font-semibold text-foreground">
            {match[1]}
          </strong>,
        )
      } else if (earliest.type === "italic") {
        parts.push(
          <em key={key++} className="italic">
            {match[1]}
          </em>,
        )
      } else if (earliest.type === "code") {
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-primary">
            {match[1]}
          </code>,
        )
      }

      remaining = remaining.slice((match.index ?? 0) + match[0].length)
    }

    return parts
  }

  return <div className="space-y-1">{parseMarkdown(content.markdown)}</div>
}

function FormFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: AIFormField
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (field.type) {
    case "input":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      )

    case "textarea":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
      )

    case "radio":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <RadioGroup value={(value as string) || ""} onValueChange={(v) => onChange(v)} className="space-y-2">
            {field.options?.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                  value === opt.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                )}
                onClick={() => onChange(opt.value)}
              >
                <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
                <Label htmlFor={`${field.id}-${opt.value}`} className="text-sm font-normal cursor-pointer flex-1">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )

    case "select":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Select value={(value as string) || ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={field.placeholder || "Select an option..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case "checkbox":
      const selectedValues = (value as string[]) || []
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                  selectedValues.includes(opt.value)
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                )}
                onClick={() => {
                  if (selectedValues.includes(opt.value)) {
                    onChange(selectedValues.filter((v) => v !== opt.value))
                  } else {
                    onChange([...selectedValues, opt.value])
                  }
                }}
              >
                <Checkbox
                  id={`${field.id}-${opt.value}`}
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, opt.value])
                    } else {
                      onChange(selectedValues.filter((v) => v !== opt.value))
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${opt.value}`} className="text-sm font-normal cursor-pointer flex-1">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}

function FormRenderer({
  content,
  onSubmit,
  onCancel,
}: {
  content: AIFormContent
  onSubmit?: (data: Record<string, unknown>) => void
  onCancel?: () => void
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  const step = content.steps[currentStep]
  const isLastStep = currentStep === content.steps.length - 1
  const isFirstStep = currentStep === 0
  const isMultiStep = content.steps.length > 1

  // Check if current step is valid
  const isStepValid = useMemo(() => {
    if (!step) return false
    return step.fields.every((field) => {
      if (!field.required) return true
      const value = formData[field.id]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== ""
    })
  }, [step, formData])

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleNext = () => {
    if (isLastStep) {
      onSubmit?.(formData)
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {content.title && (
        <div className="pb-2 border-b">
          <h4 className="font-semibold text-sm text-foreground">{content.title}</h4>
          {content.description && <p className="text-xs text-muted-foreground mt-1">{content.description}</p>}
        </div>
      )}

      {/* Step indicator */}
      {isMultiStep && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-1">
            {content.steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary/60" : "bg-muted",
                  )}
                />
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Step {currentStep + 1} of {content.steps.length}
          </span>
        </div>
      )}

      {/* Current step content */}
      <div className="space-y-4">
        {step?.title && (
          <div>
            <h5 className="font-medium text-sm text-foreground">{step.title}</h5>
            {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
          </div>
        )}
        <div className="space-y-4">
          {step?.fields.map((field) => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={formData[field.id]}
              onChange={(v) => handleFieldChange(field.id, v)}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div>
          {isMultiStep && !isFirstStep && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 text-xs">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleNext} disabled={!isStepValid} className="h-8 text-xs">
            {isLastStep ? "Submit" : "Next"}
            {!isLastStep && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ActionsRenderer({
  content,
  onAction,
}: {
  content: AIActionsContent
  onAction?: (actionId: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-foreground leading-relaxed">
        <MarkdownRenderer content={{ type: "markdown", markdown: content.message }} />
      </div>
      <div className="flex flex-wrap gap-2 pt-3 border-t">
        {content.actions.map((action) => (
          <Button
            key={action.id}
            variant={
              action.variant === "approve"
                ? "default"
                : action.variant === "reject"
                  ? "outline"
                  : action.variant === "destructive"
                    ? "destructive"
                    : "secondary"
            }
            size="sm"
            onClick={() => onAction?.(action.id)}
            className={cn(
              "h-8 text-xs font-medium",
              action.variant === "approve" && "bg-green-600 hover:bg-green-700 text-white",
              action.variant === "reject" && "border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
            )}
          >
            {action.variant === "approve" && <Check className="h-3.5 w-3.5 mr-1.5" />}
            {action.variant === "reject" && <X className="h-3.5 w-3.5 mr-1.5" />}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function ChoiceRenderer({
  content,
  onSubmit,
  onCancel,
}: {
  content: AIChoiceContent
  onSubmit?: (data: Record<string, unknown>) => void
  onCancel?: () => void
}) {
  const [selected, setSelected] = useState<string>("")
  const [customValue, setCustomValue] = useState("")

  const handleSubmit = () => {
    const value = selected === "__custom__" ? customValue : selected
    onSubmit?.({ choice: value })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{content.question}</p>
      <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
        {content.options.map((opt) => (
          <div
            key={opt.value}
            className={cn(
              "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
              selected === opt.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
            )}
            onClick={() => setSelected(opt.value)}
          >
            <RadioGroupItem value={opt.value} id={`choice-${opt.value}`} className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor={`choice-${opt.value}`} className="text-sm font-medium cursor-pointer">
                {opt.label}
              </Label>
              {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
            </div>
          </div>
        ))}
        {content.allowCustom && (
          <div
            className={cn(
              "flex items-start space-x-3 p-3 rounded-lg border transition-all",
              selected === "__custom__" ? "border-primary bg-primary/5 shadow-sm" : "border-border",
            )}
          >
            <RadioGroupItem value="__custom__" id="choice-custom" className="mt-0.5" />
            <div className="flex-1 space-y-2">
              <Label htmlFor="choice-custom" className="text-sm font-medium cursor-pointer">
                Other
              </Label>
              {selected === "__custom__" && (
                <Input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter custom value..."
                  className="h-8 text-sm"
                />
              )}
            </div>
          </div>
        )}
      </RadioGroup>
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!selected || (selected === "__custom__" && !customValue)}
          className="h-8 text-xs"
        >
          Submit
        </Button>
      </div>
    </div>
  )
}

function MultiChoiceRenderer({
  content,
  onSubmit,
  onCancel,
}: {
  content: AIMultiChoiceContent
  onSubmit?: (data: Record<string, unknown>) => void
  onCancel?: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  const toggleOption = (value: string) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  const isValid =
    selected.length >= (content.minSelect || 0) && selected.length <= (content.maxSelect || Number.POSITIVE_INFINITY)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">{content.question}</p>
        {(content.minSelect || content.maxSelect) && (
          <p className="text-xs text-muted-foreground mt-1">
            {content.minSelect && content.maxSelect
              ? `Select ${content.minSelect}-${content.maxSelect} options`
              : content.minSelect
                ? `Select at least ${content.minSelect}`
                : `Select up to ${content.maxSelect}`}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {content.options.map((opt) => (
          <div
            key={opt.value}
            className={cn(
              "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
              selected.includes(opt.value)
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-muted/50",
            )}
            onClick={() => toggleOption(opt.value)}
          >
            <Checkbox checked={selected.includes(opt.value)} className="mt-0.5" />
            <div className="flex-1">
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={() => onSubmit?.({ choices: selected })} disabled={!isValid} className="h-8 text-xs">
          Submit ({selected.length})
        </Button>
      </div>
    </div>
  )
}

function InputRenderer({
  content,
  onSubmit,
  onCancel,
}: {
  content: AIInputContent
  onSubmit?: (data: Record<string, unknown>) => void
  onCancel?: () => void
}) {
  const [value, setValue] = useState("")

  const isValid =
    (!content.validation?.required || value.length > 0) &&
    (!content.validation?.minLength || value.length >= content.validation.minLength) &&
    (!content.validation?.maxLength || value.length <= content.validation.maxLength)

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{content.question}</p>
      <div className="space-y-2">
        <Input
          type={content.inputType || "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={content.placeholder}
          className="h-9 text-sm"
        />
        {content.validation?.maxLength && (
          <p className="text-xs text-muted-foreground text-right">
            {value.length}/{content.validation.maxLength}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={() => onSubmit?.({ input: value })} disabled={!isValid} className="h-8 text-xs">
          Submit
        </Button>
      </div>
    </div>
  )
}

function SelectRenderer({
  content,
  onSubmit,
  onCancel,
}: {
  content: AISelectContent
  onSubmit?: (data: Record<string, unknown>) => void
  onCancel?: () => void
}) {
  const [value, setValue] = useState("")

  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof content.options> = {}
    content.options.forEach((opt) => {
      const group = opt.group || ""
      if (!groups[group]) groups[group] = []
      groups[group].push(opt)
    })
    return groups
  }, [content.options])

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{content.question}</p>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={content.placeholder || "Select an option..."} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedOptions).map(([group, options]) => (
            <div key={group || "default"}>
              {group && <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>}
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-end gap-2 pt-3 border-t">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={() => onSubmit?.({ selection: value })} disabled={!value} className="h-8 text-xs">
          Submit
        </Button>
      </div>
    </div>
  )
}

// Loading component with breathing animation
function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex items-center gap-1.5">
        <div
          className="h-1.5 w-1.5 bg-primary rounded-full"
          style={{
            animation: "breath-dot 1.4s ease-in-out infinite",
            animationDelay: "0ms",
          }}
        />
        <div
          className="h-1.5 w-1.5 bg-primary rounded-full"
          style={{
            animation: "breath-dot 1.4s ease-in-out infinite",
            animationDelay: "200ms",
          }}
        />
        <div
          className="h-1.5 w-1.5 bg-primary rounded-full"
          style={{
            animation: "breath-dot 1.4s ease-in-out infinite",
            animationDelay: "400ms",
          }}
        />
      </div>
      <span
        className="text-xs text-muted-foreground"
        style={{
          animation: "breath-text 2s ease-in-out infinite",
        }}
      >
        Thinking...
      </span>
    </div>
  )
}

// Main renderer component
export function AIResponseRenderer({ contents, isLoading, onAction, onSubmit, onCancel }: AIResponseRendererProps) {
  if (isLoading) {
    return <LoadingIndicator />
  }

  if (contents.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {contents.map((content, index) => {
        switch (content.type) {
          case "text":
            return <TextRenderer key={index} content={content} />
          case "markdown":
            return <MarkdownRenderer key={index} content={content} />
          case "form":
            return <FormRenderer key={index} content={content} onSubmit={onSubmit} onCancel={onCancel} />
          case "actions":
            return <ActionsRenderer key={index} content={content} onAction={onAction} />
          case "choice":
            return <ChoiceRenderer key={index} content={content} onSubmit={onSubmit} onCancel={onCancel} />
          case "multi-choice":
            return <MultiChoiceRenderer key={index} content={content} onSubmit={onSubmit} onCancel={onCancel} />
          case "input":
            return <InputRenderer key={index} content={content} onSubmit={onSubmit} onCancel={onCancel} />
          case "select":
            return <SelectRenderer key={index} content={content} onSubmit={onSubmit} onCancel={onCancel} />
          default:
            return null
        }
      })}
    </div>
  )
}
