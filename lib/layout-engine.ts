/**
 * Automatic layout engine for flow nodes
 * Implements left-to-right hierarchical layout with node size consideration
 */

import type { CanvasNode, CanvasEdge } from "@/lib/types/canvas"

interface NodeDimensions {
  width: number
  height: number
}

interface LayoutNode {
  id: string
  level: number
  x: number
  y: number
  width: number
  height: number
  children: string[]
  parents: string[]
}

const DEFAULT_NODE_WIDTH = 280
const DEFAULT_NODE_HEIGHT = 120
const HORIZONTAL_SPACING = 150 // Space between levels
const VERTICAL_SPACING = 80 // Space between nodes in same level
const LEVEL_PADDING = 50 // Padding from edges

/**
 * Get node dimensions (considering measured size or defaults)
 */
function getNodeDimensions(node: CanvasNode): NodeDimensions {
  const measured = node.measured
  return {
    width: measured?.width || node.width || DEFAULT_NODE_WIDTH,
    height: measured?.height || node.height || DEFAULT_NODE_HEIGHT,
  }
}

/**
 * Build adjacency lists for graph traversal
 */
function buildGraph(nodes: CanvasNode[], edges: CanvasEdge[]): {
  children: Map<string, string[]>
  parents: Map<string, string[]>
  inDegree: Map<string, number>
} {
  const children = new Map<string, string[]>()
  const parents = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  // Initialize maps
  nodes.forEach((node) => {
    children.set(node.id, [])
    parents.set(node.id, [])
    inDegree.set(node.id, 0)
  })

  // Build relationships from edges
  edges.forEach((edge) => {
    const source = edge.source
    const target = edge.target

    if (children.has(source) && children.has(target)) {
      children.get(source)!.push(target)
      parents.get(target)!.push(source)
      inDegree.set(target, (inDegree.get(target) || 0) + 1)
    }
  })

  return { children, parents, inDegree }
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycle(
  nodeId: string,
  children: Map<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>,
  path: string[] = []
): string[] | null {
  visited.add(nodeId)
  recursionStack.add(nodeId)
  path.push(nodeId)

  const childIds = children.get(nodeId) || []
  for (const childId of childIds) {
    if (!visited.has(childId)) {
      const cyclePath = detectCycle(childId, children, visited, recursionStack, [...path])
      if (cyclePath) return cyclePath
    } else if (recursionStack.has(childId)) {
      // Found a cycle
      const cycleStart = path.indexOf(childId)
      return [...path.slice(cycleStart), childId]
    }
  }

  recursionStack.delete(nodeId)
  return null
}

/**
 * Check for cycles in the entire graph
 */
function checkForCycles(
  nodes: CanvasNode[],
  children: Map<string, string[]>
): string[] | null {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cyclePath = detectCycle(node.id, children, visited, recursionStack)
      if (cyclePath) {
        return cyclePath
      }
    }
  }

  return null
}

/**
 * Topological sort to determine node levels (left-to-right)
 */
function assignLevels(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): Map<string, number> {
  const { inDegree, children } = buildGraph(nodes, edges)
  
  // Check for cycles before proceeding
  const cyclePath = checkForCycles(nodes, children)
  
  if (cyclePath) {
    // Break the cycle by removing the last edge
    const cycleStart = cyclePath[0]
    const cycleEnd = cyclePath[cyclePath.length - 2]
    
    // Remove the problematic edge from children map
    const childList = children.get(cycleEnd) || []
    const filteredChildren = childList.filter(id => id !== cycleStart)
    children.set(cycleEnd, filteredChildren)
    
    // Update inDegree
    inDegree.set(cycleStart, (inDegree.get(cycleStart) || 1) - 1)
  }
  
  const levels = new Map<string, number>()
  const queue: string[] = []

  // Find root nodes (nodes with no incoming edges)
  nodes.forEach((node) => {
    if ((inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id)
      levels.set(node.id, 0)
    }
  })

  // BFS to assign levels with cycle detection
  const MAX_ITERATIONS = nodes.length * nodes.length // Safety limit
  let iterations = 0
  const processedCount = new Map<string, number>() // Track how many times each node is processed

  while (queue.length > 0) {
    iterations++
    
    // Safety check: prevent infinite loops
    if (iterations > MAX_ITERATIONS) {
      break
    }

    const currentId = queue.shift()!
    const currentLevel = levels.get(currentId) || 0
    
    // Track processing count for cycle detection
    const count = (processedCount.get(currentId) || 0) + 1
    processedCount.set(currentId, count)
    
    // If a node has been processed too many times, it's likely in a cycle
    if (count > nodes.length) {
      continue
    }

    const childIds = children.get(currentId) || []
    childIds.forEach((childId) => {
      const currentChildLevel = levels.get(childId)
      const newLevel = currentLevel + 1

      // Assign level if not set, or update if we found a longer path
      if (currentChildLevel === undefined || newLevel > currentChildLevel) {
        levels.set(childId, newLevel)
        queue.push(childId)
      }
    })
  }

  // Handle disconnected nodes (assign to max level + 1)
  const maxLevel = Math.max(...Array.from(levels.values()), -1)
  nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, maxLevel + 1)
    }
  })

  return levels
}

/**
 * Calculate Y positions for nodes in the same level
 */
function calculateYPositions(
  levelNodes: CanvasNode[],
  startY: number,
): Map<string, number> {
  const yPositions = new Map<string, number>()
  let currentY = startY

  levelNodes.forEach((node) => {
    const dims = getNodeDimensions(node)
    yPositions.set(node.id, currentY)
    currentY += dims.height + VERTICAL_SPACING
  })

  return yPositions
}

/**
 * Center-align nodes in a level vertically
 */
function centerLevel(
  levelNodes: CanvasNode[],
  yPositions: Map<string, number>,
): void {
  if (levelNodes.length === 0) return

  const firstY = yPositions.get(levelNodes[0].id) || 0
  const lastNode = levelNodes[levelNodes.length - 1]
  const lastDims = getNodeDimensions(lastNode)
  const lastY = (yPositions.get(lastNode.id) || 0) + lastDims.height
  const totalHeight = lastY - firstY
  const centerOffset = -totalHeight / 2

  levelNodes.forEach((node) => {
    const currentY = yPositions.get(node.id) || 0
    yPositions.set(node.id, currentY + centerOffset)
  })
}

/**
 * Calculate X positions based on levels
 */
function calculateXPositions(
  nodes: CanvasNode[],
  levels: Map<string, number>,
): Map<string, number> {
  const xPositions = new Map<string, number>()
  const levelGroups = new Map<number, CanvasNode[]>()

  // Group nodes by level
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(node)
  })

  // Calculate max width for each level
  const levelMaxWidths = new Map<number, number>()
  levelGroups.forEach((levelNodes, level) => {
    let maxWidth = 0
    levelNodes.forEach((node) => {
      const dims = getNodeDimensions(node)
      maxWidth = Math.max(maxWidth, dims.width)
    })
    levelMaxWidths.set(level, maxWidth)
  })

  // Assign X positions
  let currentX = LEVEL_PADDING
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)

  sortedLevels.forEach((level) => {
    const levelWidth = levelMaxWidths.get(level) || DEFAULT_NODE_WIDTH
    levelGroups.get(level)!.forEach((node) => {
      xPositions.set(node.id, currentX)
    })
    currentX += levelWidth + HORIZONTAL_SPACING
  })

  return xPositions
}

/**
 * Check if two nodes overlap
 */
function nodesOverlap(
  node1: CanvasNode,
  pos1: { x: number; y: number },
  node2: CanvasNode,
  pos2: { x: number; y: number },
): boolean {
  const dims1 = getNodeDimensions(node1)
  const dims2 = getNodeDimensions(node2)

  return !(
    pos1.x + dims1.width < pos2.x ||
    pos2.x + dims2.width < pos1.x ||
    pos1.y + dims1.height < pos2.y ||
    pos2.y + dims2.height < pos1.y
  )
}

/**
 * Resolve overlaps by adjusting Y positions
 */
function resolveOverlaps(
  nodes: CanvasNode[],
  positions: Map<string, { x: number; y: number }>,
): Map<string, { x: number; y: number }> {
  const resolved = new Map<string, { x: number; y: number }>()
  const sortedNodes = [...nodes].sort((a, b) => {
    const posA = positions.get(a.id) || { x: 0, y: 0 }
    const posB = positions.get(b.id) || { x: 0, y: 0 }
    if (posA.x !== posB.x) return posA.x - posB.x
    return posA.y - posB.y
  })

  sortedNodes.forEach((node) => {
    const currentPos = positions.get(node.id) || { x: 0, y: 0 }
    let newY = currentPos.y
    const dims = getNodeDimensions(node)

    // Check against all previously placed nodes
    resolved.forEach((otherPos, otherId) => {
      const otherNode = nodes.find((n) => n.id === otherId)
      if (!otherNode) return

      const otherDims = getNodeDimensions(otherNode)
      const otherPosActual = resolved.get(otherId) || otherPos

      // If same X level and overlapping, adjust Y
      if (
        Math.abs(currentPos.x - otherPosActual.x) < HORIZONTAL_SPACING / 2 &&
        nodesOverlap(node, { x: currentPos.x, y: newY }, otherNode, otherPosActual)
      ) {
        newY = otherPosActual.y + otherDims.height + VERTICAL_SPACING
      }
    })

    resolved.set(node.id, { x: currentPos.x, y: newY })
  })

  return resolved
}

/**
 * Main layout function: Arrange nodes in a left-to-right flow
 */
export function layoutNodes(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  startPosition: { x: number; y: number } = { x: 0, y: 0 },
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) {
    return new Map()
  }

  // Assign levels based on graph structure
  const levels = assignLevels(nodes, edges)

  // Calculate X positions based on levels
  const xPositions = calculateXPositions(nodes, levels)

  // Group nodes by level and calculate Y positions
  const levelGroups = new Map<number, CanvasNode[]>()
  nodes.forEach((node) => {
    const level = levels.get(node.id) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(node)
  })

  // Calculate Y positions for each level
  const allPositions = new Map<string, { x: number; y: number }>()
  let currentY = startPosition.y

  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)

  sortedLevels.forEach((level) => {
    const levelNodes = levelGroups.get(level) || []
    const yPositions = calculateYPositions(levelNodes, currentY)

    // Center-align the level
    centerLevel(levelNodes, yPositions)

    // Assign positions
    levelNodes.forEach((node) => {
      const x = xPositions.get(node.id) || 0
      const y = yPositions.get(node.id) || 0
      allPositions.set(node.id, { x: x + startPosition.x, y })
    })

    // Update currentY for next level
    const maxY = Math.max(
      ...levelNodes.map((node) => {
        const y = yPositions.get(node.id) || 0
        const dims = getNodeDimensions(node)
        return y + dims.height
      }),
    )
    currentY = maxY + VERTICAL_SPACING
  })

  // Resolve any remaining overlaps
  const finalPositions = resolveOverlaps(nodes, allPositions)
  
  return finalPositions
}

/**
 * Apply layout to nodes (updates node positions in store)
 */
export function applyLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void,
  startPosition?: { x: number; y: number },
): void {
  const positions = layoutNodes(nodes, edges, startPosition)

  positions.forEach((position, nodeId) => {
    updateNodePosition(nodeId, position)
  })
}

