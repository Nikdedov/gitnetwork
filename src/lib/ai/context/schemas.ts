import { generateUlid } from '../../ulid'

export type ContextType = 'memory' | 'decision' | 'project' | 'conversation' | 'handoff'

export interface BaseContext {
  schemaVersion: number
  type: ContextType
  id: string
  createdAt: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

export interface MemoryContext extends BaseContext {
  type: 'memory'
  category: string
  content: string
  tags?: string[]
  isPersistent: boolean
}

export interface DecisionContext extends BaseContext {
  type: 'decision'
  title: string
  description: string
  reasons: string[]
  relatedIds?: string[]
}

export interface ProjectContext extends BaseContext {
  type: 'project'
  name: string
  goals: string[]
  constraints: string[]
  currentState: string
  importantFiles: string[]
  openQuestions: string[]
}

export interface ConversationContext extends BaseContext {
  type: 'conversation'
  messages: ConversationMessage[]
  provider?: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export interface HandoffContext extends BaseContext {
  type: 'handoff'
  completedWork: string[]
  decisions: string[]
  currentState: string
  openQuestions: string[]
  nextSteps: string[]
  sourceProvider?: string
  targetProvider?: string
}

export type AiContext = MemoryContext | DecisionContext | ProjectContext | ConversationContext | HandoffContext

export function createMemoryContext(category: string, content: string, isPersistent: boolean = true): MemoryContext {
  return {
    schemaVersion: 1,
    type: 'memory',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    category,
    content,
    isPersistent,
  }
}

export function createDecisionContext(title: string, description: string, reasons: string[], relatedIds?: string[]): DecisionContext {
  return {
    schemaVersion: 1,
    type: 'decision',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    title,
    description,
    reasons,
    relatedIds,
  }
}

export function createProjectContext(
  name: string,
  goals: string[],
  constraints: string[],
  currentState: string,
  importantFiles: string[],
  openQuestions: string[],
): ProjectContext {
  return {
    schemaVersion: 1,
    type: 'project',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    name,
    goals,
    constraints,
    currentState,
    importantFiles,
    openQuestions,
  }
}

export function createConversationContext(messages: ConversationMessage[], provider?: string): ConversationContext {
  return {
    schemaVersion: 1,
    type: 'conversation',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    messages,
    provider,
  }
}

export function createHandoffContext(
  completedWork: string[],
  decisions: string[],
  currentState: string,
  openQuestions: string[],
  nextSteps: string[],
  sourceProvider?: string,
  targetProvider?: string,
): HandoffContext {
  return {
    schemaVersion: 1,
    type: 'handoff',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    completedWork,
    decisions,
    currentState,
    openQuestions,
    nextSteps,
    sourceProvider,
    targetProvider,
  }
}

export function isValidContext(data: unknown): data is AiContext {
  if (!data || typeof data !== 'object') return false
  const context = data as Record<string, unknown>

  if (typeof context.schemaVersion !== 'number') return false
  if (typeof context.type !== 'string') return false
  if (!['memory', 'decision', 'project', 'conversation', 'handoff'].includes(context.type)) {
    return false
  }
  if (typeof context.id !== 'string') return false
  if (typeof context.createdAt !== 'string') return false

  const validContext = context as unknown as AiContext
  if (validContext.type === 'memory') {
    return (
      typeof validContext.category === 'string' &&
      typeof validContext.content === 'string' &&
      typeof validContext.isPersistent === 'boolean'
    )
  }
  if (validContext.type === 'decision') {
    return (
      typeof validContext.title === 'string' &&
      typeof validContext.description === 'string' &&
      Array.isArray(validContext.reasons) &&
      validContext.reasons.every((r) => typeof r === 'string')
    )
  }
  if (validContext.type === 'project') {
    return (
      typeof validContext.name === 'string' &&
      Array.isArray(validContext.goals) &&
      validContext.goals.every((g) => typeof g === 'string') &&
      Array.isArray(validContext.constraints) &&
      validContext.constraints.every((c) => typeof c === 'string') &&
      typeof validContext.currentState === 'string' &&
      Array.isArray(validContext.importantFiles) &&
      validContext.importantFiles.every((f) => typeof f === 'string') &&
      Array.isArray(validContext.openQuestions) &&
      validContext.openQuestions.every((q) => typeof q === 'string')
    )
  }
  if (validContext.type === 'conversation') {
    return (
      Array.isArray(validContext.messages) &&
      validContext.messages.every((m) => {
        return (
          typeof m.id === 'string' &&
          ['user', 'assistant', 'system'].includes(m.role) &&
          typeof m.content === 'string' &&
          typeof m.createdAt === 'string'
        )
      })
    )
  }
  if (validContext.type === 'handoff') {
    return (
      Array.isArray(validContext.completedWork) &&
      validContext.completedWork.every((w) => typeof w === 'string') &&
      Array.isArray(validContext.decisions) &&
      validContext.decisions.every((d) => typeof d === 'string') &&
      typeof validContext.currentState === 'string' &&
      Array.isArray(validContext.openQuestions) &&
      validContext.openQuestions.every((q) => typeof q === 'string') &&
      Array.isArray(validContext.nextSteps) &&
      validContext.nextSteps.every((s) => typeof s === 'string')
    )
  }

  return false
}

export function parseContext(json: string): AiContext | null {
  try {
    const parsed = JSON.parse(json)
    if (isValidContext(parsed)) {
      return parsed as AiContext
    }
    return null
  } catch {
    return null
  }
}
