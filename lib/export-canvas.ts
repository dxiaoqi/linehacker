import type { CanvasNode, CanvasEdge, CanvasNodeData, ConnectionWeight } from "./types/canvas"

interface GroupData {
  type: "group"
  title: string
  color: string
  childNodeIds?: string[]
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1")
}

function getConnectionLabel(weight: ConnectionWeight): string {
  switch (weight) {
    case "strong":
      return "Strong Dependency"
    case "weak":
      return "Weak Relation"
    case "uncertain":
      return "Uncertain"
    case "reverse":
      return "Bidirectional"
    default:
      return "Connection"
  }
}

function getMermaidArrow(weight: ConnectionWeight): string {
  switch (weight) {
    case "strong":
      return "-->"
    case "weak":
      return "-.->"
    case "uncertain":
      return "-.->|?|"
    case "reverse":
      return "<-->"
    default:
      return "-->"
  }
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "_")
}

export function exportCanvasToMarkdown(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  const sections: string[] = []
  const timestamp = new Date().toISOString()

  // Header
  sections.push("# Canvas Export")
  sections.push("")
  sections.push(`> Exported at: ${timestamp}`)
  sections.push("")

  // Separate groups and regular nodes
  const groups = nodes.filter((n) => n.type === "group-node")
  const regularNodes = nodes.filter((n) => n.type === "canvas-node")

  // Build Mermaid flowchart
  sections.push("## Flowchart")
  sections.push("")
  sections.push("```mermaid")
  sections.push("flowchart TD")
  sections.push("")

  // Add subgraphs for groups
  groups.forEach((group) => {
    const groupData = group.data as GroupData
    const childIds = groupData.childNodeIds || []
    const safeGroupId = sanitizeId(group.id)

    sections.push(`  subgraph ${safeGroupId}["${escapeMarkdown(groupData.title)}"]`)

    // Add child nodes inside the subgraph
    childIds.forEach((childId) => {
      const childNode = regularNodes.find((n) => n.id === childId)
      if (childNode) {
        const nodeData = childNode.data as CanvasNodeData
        const safeId = sanitizeId(childNode.id)
        const nodeType = nodeData.type || "base"
        sections.push(`    ${safeId}["${escapeMarkdown(nodeData.title || "Untitled")}"]`)
      }
    })

    sections.push("  end")
    sections.push("")
  })

  // Add standalone nodes (not in any group)
  const groupedNodeIds = new Set(groups.flatMap((g) => (g.data as GroupData).childNodeIds || []))
  const standaloneNodes = regularNodes.filter((n) => !groupedNodeIds.has(n.id))

  standaloneNodes.forEach((node) => {
    const nodeData = node.data as CanvasNodeData
    const safeId = sanitizeId(node.id)
    sections.push(`  ${safeId}["${escapeMarkdown(nodeData.title || "Untitled")}"]`)
  })

  sections.push("")

  // Add edges/connections
  edges.forEach((edge) => {
    const weight = edge.data?.weight || "weak"
    const arrow = getMermaidArrow(weight)
    const safeSource = sanitizeId(edge.source)
    const safeTarget = sanitizeId(edge.target)
    const label = edge.data?.label

    if (label) {
      sections.push(`  ${safeSource} ${arrow}|"${escapeMarkdown(label)}"| ${safeTarget}`)
    } else {
      sections.push(`  ${safeSource} ${arrow} ${safeTarget}`)
    }
  })

  sections.push("```")
  sections.push("")

  // Groups detail section
  if (groups.length > 0) {
    sections.push("## Groups / Sections")
    sections.push("")

    groups.forEach((group) => {
      const groupData = group.data as GroupData
      const childIds = groupData.childNodeIds || []

      sections.push(`### ${escapeMarkdown(groupData.title)}`)
      sections.push("")
      sections.push(`- **ID**: \`${group.id}\``)
      sections.push(`- **Color**: ${groupData.color}`)
      sections.push(`- **Child Nodes**: ${childIds.length}`)

      if (childIds.length > 0) {
        sections.push("")
        sections.push("**Contains:**")
        childIds.forEach((childId) => {
          const childNode = regularNodes.find((n) => n.id === childId)
          if (childNode) {
            const nodeData = childNode.data as CanvasNodeData
            sections.push(`- ${escapeMarkdown(nodeData.title || "Untitled")} (\`${childId}\`)`)
          }
        })
      }

      sections.push("")
    })
  }

  // Nodes detail section
  sections.push("## Nodes")
  sections.push("")

  regularNodes.forEach((node) => {
    const nodeData = node.data as CanvasNodeData
    const nodeType = nodeData.type || "base"

    sections.push(`### ${escapeMarkdown(nodeData.title || "Untitled")}`)
    sections.push("")
    sections.push(`- **ID**: \`${node.id}\``)
    sections.push(`- **Type**: ${nodeType}`)
    sections.push(`- **Created**: ${nodeData.meta?.createdAt || "Unknown"}`)
    sections.push(`- **Last Modified**: ${nodeData.meta?.lastModified || "Unknown"}`)

    if (nodeData.description) {
      sections.push("")
      sections.push("**Description:**")
      sections.push("")
      sections.push(nodeData.description)
    }

    // Sections with items
    if (nodeData.sections && nodeData.sections.length > 0) {
      sections.push("")
      sections.push("**Sections:**")
      sections.push("")

      nodeData.sections.forEach((section) => {
        sections.push(`#### ${escapeMarkdown(section.title)}`)
        sections.push("")

        if (section.items && section.items.length > 0) {
          section.items.forEach((item) => {
            sections.push(`- ${escapeMarkdown(item.content)}`)
          })
        } else {
          sections.push("- *(No items)*")
        }

        sections.push("")
      })
    }

    sections.push("---")
    sections.push("")
  })

  // Connections detail section
  if (edges.length > 0) {
    sections.push("## Connections")
    sections.push("")
    sections.push("| Source | Target | Type | Label |")
    sections.push("|--------|--------|------|-------|")

    edges.forEach((edge) => {
      const sourceNode = regularNodes.find((n) => n.id === edge.source)
      const targetNode = regularNodes.find((n) => n.id === edge.target)
      const weight = edge.data?.weight || "weak"
      const label = edge.data?.label || "-"

      const sourceTitle = sourceNode ? (sourceNode.data as CanvasNodeData).title || "Untitled" : edge.source
      const targetTitle = targetNode ? (targetNode.data as CanvasNodeData).title || "Untitled" : edge.target

      sections.push(
        `| ${escapeMarkdown(sourceTitle)} | ${escapeMarkdown(targetTitle)} | ${getConnectionLabel(weight)} | ${escapeMarkdown(label)} |`,
      )
    })

    sections.push("")
  }

  // Summary
  sections.push("## Summary")
  sections.push("")
  sections.push(`- **Total Nodes**: ${regularNodes.length}`)
  sections.push(`- **Total Groups**: ${groups.length}`)
  sections.push(`- **Total Connections**: ${edges.length}`)
  sections.push("")

  return sections.join("\n")
}

export function downloadMarkdown(content: string, filename = "canvas-export.md"): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
