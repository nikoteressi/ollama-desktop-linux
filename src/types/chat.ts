export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: Uint8Array[]
}

export interface Conversation {
  id: string
  title: string
  model: string
  system_prompt?: string
  created_at: string
  updated_at: string
}

export interface StreamingState {
  isStreaming: boolean
  currentConversationId: string | null
  buffer: string
  thinkingBuffer: string
  isThinking: boolean
  tokensPerSec: number | null
}

export interface TokenPayload {
  conversation_id: string
  content: string
  done: boolean
}

export interface ThinkingPayload {
  conversation_id: string
}

export interface DonePayload {
  conversation_id: string
  total_tokens: number
  duration_ms: number
  tokens_per_sec: number
}
