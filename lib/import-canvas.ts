/**
 * Canvas Markdown Import Parser
 * Parses exported Markdown format back into canvas data
 */

export interface ImportedNode {
  id: string
  type: string
  title: string
  description: string
  sections: Array<{
    id: string
    title: string
    items: Array<{ id: string; content: string }>
  }>
}

export interface ImportedEdge {
  source: string
  target: string
  weight: string
  label?: string
}

export interface ImportedData {
  nodes: ImportedNode[]
  edges: ImportedEdge[]
}

/**
 * Parse a markdown export file into importable canvas data
 */
export function parseMarkdownImport(markdown: string): ImportedData {
  const nodes: ImportedNode[] = []
  const edges: ImportedEdge[] = []

  // Split by node sections (marked by ### Node Title)
  const lines = markdown.split('\n')
  
  let currentNode: Partial<ImportedNode> | null = null
  let currentSection: { title: string; items: string[] } | null = null
  let inDescription = false
  let inSections = false
  let descriptionLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Parse node header (### Title, but not ####)
    if (line.startsWith('### ') && !line.startsWith('#### ')) {
      // Save previous node if exists and is complete
      if (currentNode && currentNode.title && currentNode.id && currentNode.type) {
        if (descriptionLines.length > 0) {
          currentNode.description = descriptionLines.join('\n').trim()
        }
        if (currentSection) {
          if (!currentNode.sections) currentNode.sections = []
          currentNode.sections.push({
            id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: currentSection.title,
            items: currentSection.items.map(item => ({
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              content: item
            }))
          })
        }
        console.log('[Import] Saving complete node:', currentNode.title, 'ID:', currentNode.id, 'Type:', currentNode.type)
        nodes.push(currentNode as ImportedNode)
      }

      // Start new node
      currentNode = {
        title: line.replace('### ', '').trim(),
        sections: [],
      }
      console.log('[Import] Started new node:', currentNode.title)
      currentSection = null
      inDescription = false
      inSections = false
      descriptionLines = []
      continue
    }

    if (!currentNode) continue

    // Parse node ID (handle both "- **ID**:" and "**ID**:")
    if (line.includes('**ID**:')) {
      const match = line.match(/`([^`]+)`/)
      if (match) {
        currentNode.id = match[1]
        console.log('[Import] Set node ID:', currentNode.id)
      }
      continue
    }

    // Parse node type (handle both "- **Type**:" and "**Type**:")
    if (line.includes('**Type**:')) {
      const typeValue = line.split('**Type**:')[1].trim()
      currentNode.type = typeValue
      console.log('[Import] Set node type:', currentNode.type)
      continue
    }

    // Parse description section
    if (line.includes('**Description:**')) {
      inDescription = true
      inSections = false
      descriptionLines = []
      continue
    }

    // Parse sections marker
    if (line.includes('**Sections:**')) {
      inDescription = false
      inSections = true
      if (descriptionLines.length > 0) {
        currentNode.description = descriptionLines.join('\n').trim()
        descriptionLines = []
      }
      continue
    }

    // Parse section header (#### Section Title)
    if (line.startsWith('#### ') && inSections) {
      // Save previous section
      if (currentSection) {
        if (!currentNode.sections) currentNode.sections = []
        currentNode.sections.push({
          id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: currentSection.title,
          items: currentSection.items.map(item => ({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            content: item
          }))
        })
      }
      currentSection = {
        title: line.replace('#### ', '').trim(),
        items: []
      }
      continue
    }

    // Parse section items (lines starting with -)
    if (line.trim().startsWith('-') && currentSection) {
      currentSection.items.push(line.trim().substring(1).trim())
      continue
    }

    // Parse description lines
    if (inDescription && line.trim() && !line.startsWith('**') && !line.startsWith('---')) {
      descriptionLines.push(line)
    }

    // End of node (---)
    if (line.trim() === '---') {
      if (currentNode) {
        if (descriptionLines.length > 0) {
          currentNode.description = descriptionLines.join('\n').trim()
        }
        if (currentSection) {
          if (!currentNode.sections) currentNode.sections = []
          currentNode.sections.push({
            id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: currentSection.title,
            items: currentSection.items.map(item => ({
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              content: item
            }))
          })
        }
        if (currentNode.title && currentNode.id && currentNode.type) {
          console.log('[Import] Saving node at ---:', currentNode.title, 'ID:', currentNode.id, 'Type:', currentNode.type)
          nodes.push(currentNode as ImportedNode)
        } else {
          console.warn('[Import] Incomplete node, not saving:', currentNode)
        }
      }
      currentNode = null
      currentSection = null
      inDescription = false
      inSections = false
      descriptionLines = []
    }
  }

  // Save last node if exists (in case file doesn't end with ---)
  if (currentNode && currentNode.title && currentNode.id && currentNode.type) {
    if (descriptionLines.length > 0) {
      currentNode.description = descriptionLines.join('\n').trim()
    }
    if (currentSection) {
      if (!currentNode.sections) currentNode.sections = []
      currentNode.sections.push({
        id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: currentSection.title,
        items: currentSection.items.map(item => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          content: item
        }))
      })
    }
    console.log('[Import] Saving last node:', currentNode.title, 'ID:', currentNode.id, 'Type:', currentNode.type)
    nodes.push(currentNode as ImportedNode)
  }

  console.log('[Import] Total nodes parsed:', nodes.length)

  // Parse connections table
  const connectionsStart = markdown.indexOf('## Connections')
  console.log('[Import] Looking for connections, found at:', connectionsStart)
  
  if (connectionsStart !== -1) {
    const connectionsSection = markdown.substring(connectionsStart)
    const tableLines = connectionsSection.split('\n').filter(l => l.startsWith('|') && !l.includes('Source'))
    console.log('[Import] Found', tableLines.length, 'connection lines')
    
    tableLines.forEach(line => {
      const cells = line.split('|').map(c => c.trim()).filter(c => c)
      if (cells.length >= 3) {
        const [sourceName, targetName, typeStr, label] = cells
        console.log('[Import] Parsing connection:', sourceName, '→', targetName)
        
        // Find node IDs by title
        const sourceNode = nodes.find(n => n.title === sourceName)
        const targetNode = nodes.find(n => n.title === targetName)
        
        if (sourceNode && targetNode) {
          let weight = 'weak'
          if (typeStr.toLowerCase().includes('strong')) weight = 'strong'
          else if (typeStr.toLowerCase().includes('uncertain')) weight = 'uncertain'
          else if (typeStr.toLowerCase().includes('reverse')) weight = 'reverse'
          
          console.log('[Import] Adding edge:', sourceNode.id, '→', targetNode.id, 'weight:', weight)
          edges.push({
            source: sourceNode.id,
            target: targetNode.id,
            weight,
            label: label || undefined
          })
        } else {
          console.warn('[Import] Could not find nodes for connection:', sourceName, '→', targetName)
        }
      }
    })
  }

  console.log('[Import] Parsing complete. Nodes:', nodes.length, 'Edges:', edges.length)
  return { nodes, edges }
}

/**
 * Generate a helper prompt for external AI tools
 */
export function generateImportPrompt(): string {
  return `请帮我生成一个适用于 LineHacker Canvas 的流程图，输出格式为 Markdown，参考以下模板：

# Canvas Export

## Nodes

### [节点标题1]

- **ID**: \`node-1\` (自动生成，使用 node-1, node-2 等简单ID即可)
- **Type**: goal (可选: goal, idea, action, risk, resource, base)
- **Created**: 2025-12-10T13:32:54.435Z
- **Last Modified**: 2025-12-10T13:32:54.435Z

**Description:**

[节点的详细描述，可以多行]

**Sections:**

#### [章节标题1]

- 章节内容项 1
- 章节内容项 2

#### [章节标题2]

- 章节内容项 3

---

### [节点标题2]

- **ID**: \`node-2\`
- **Type**: action
- **Created**: 2025-12-10T13:32:54.435Z
- **Last Modified**: 2025-12-10T13:32:54.435Z

**Description:**

[描述内容]

**Sections:**

#### [章节标题]

- 内容项

---

## Connections

| Source | Target | Type | Label |
|--------|--------|------|-------|
| [节点标题1] | [节点标题2] | Strong Dependency | 驱动 |
| [节点标题2] | [节点标题3] | Weak Relation | 支持 |

**连接类型说明：**
- Strong Dependency: 强依赖（实线）
- Weak Relation: 弱关系（虚线）
- Uncertain Link: 不确定连接（点线）
- Bidirectional: 双向关系

**节点类型说明：**
- goal: 目标节点（蓝色）- 用于项目目标和终点
- idea: 想法节点（黄色）- 用于概念和创意
- action: 行动节点（绿色）- 用于具体任务和步骤
- risk: 风险节点（红色）- 用于障碍和威胁
- resource: 资源节点（紫色）- 用于资产和需求
- base: 基础节点（灰色）- 用于其他内容

## 我的需求

[在这里描述你想要生成的流程内容]

---

请严格按照上述格式生成 Markdown 内容。确保：
1. 每个节点都有唯一的 ID
2. 节点类型准确（goal/idea/action/risk/resource/base）
3. 连接表格中的 Source 和 Target 使用节点标题（不是ID）
4. 章节和内容项使用 Markdown 列表格式
`
}

