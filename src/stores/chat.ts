import { defineStore } from 'pinia'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import type { 
  Conversation, 
  Message, 
  StreamingState, 
  TokenPayload, 
  ThinkingPayload, 
  DonePayload 
} from '../types/chat'

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [] as Conversation[],
    activeConversationId: null as string | null,
    messages: {} as Record<string, Message[]>,
    streaming: {
      isStreaming: false,
      currentConversationId: null,
      buffer: '',
      thinkingBuffer: '',
      isThinking: false,
      tokensPerSec: null,
    } as StreamingState,
    _listenersInitialized: false
  }),

  getters: {
    activeConversation: (state) =>
      state.conversations.find(c => c.id === state.activeConversationId),
    activeMessages: (state) =>
      state.messages[state.activeConversationId ?? ''] ?? [],
  },

  actions: {
    initStreamListeners() {
      if (this._listenersInitialized) return
      this._listenersInitialized = true

      listen<TokenPayload>('chat:token', (event) => {
        const { conversation_id, content } = event.payload
        if (this.streaming.isThinking) {
          this.streaming.thinkingBuffer += content
        } else {
          this.streaming.buffer += content
        }
      })

      listen<ThinkingPayload>('chat:thinking-start', (event) => {
        this.streaming.isThinking = true
      })

      listen<ThinkingPayload>('chat:thinking-end', (event) => {
        this.streaming.isThinking = false
      })

      listen<DonePayload>('chat:done', (event) => {
        const { conversation_id, tokens_per_sec } = event.payload
        this.finalizeStreamedMessage(conversation_id)
        this.streaming.isStreaming = false
        this.streaming.tokensPerSec = tokens_per_sec
      })
      
      listen<{ conversation_id: string, error: string }>('chat:error', (event) => {
        console.error('Chat stream error:', event.payload.error)
        this.streaming.isStreaming = false
      })
    },

    finalizeStreamedMessage(conversationId: string) {
      if (!this.messages[conversationId]) {
        this.messages[conversationId] = []
      }
      
      let fullContent = ''
      if (this.streaming.thinkingBuffer) {
        fullContent += `<think>\n${this.streaming.thinkingBuffer}\n</think>\n\n`
      }
      fullContent += this.streaming.buffer

      this.messages[conversationId].push({
        role: 'assistant',
        content: fullContent,
      })

      // Reset buffers
      this.streaming.buffer = ''
      this.streaming.thinkingBuffer = ''
      this.streaming.isThinking = false
    },

    async loadConversation(id: string) {
      this.activeConversationId = id
      if (!this.messages[id]) {
        try {
          // Attempt to load from Rust
          const msgs = await invoke<Message[]>('get_messages', { conversationId: id })
          this.messages[id] = msgs || []
        } catch (err) {
          console.warn('Could not load messages, using empty array', err)
          this.messages[id] = []
        }
      }
    },

    async createConversation(model: string = 'llama3:latest') {
      const id = crypto.randomUUID()
      const conv: Conversation = {
        id,
        title: 'New Chat',
        model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      this.conversations.push(conv)
      this.messages[id] = []
      this.activeConversationId = id
      
      // Optionally notify Rust mapping
      try {
        await invoke('create_conversation', { id, model })
      } catch (err) {
        // Mock if not implemented
        console.log('Rust command create_conversation not available yet')
      }
      return id
    },

    async sendMessage(content: string, images?: Uint8Array[]) {
      if (!this.activeConversationId) {
        await this.createConversation()
      }
      
      const conversationId = this.activeConversationId!
      this.streaming = {
        isStreaming: true,
        currentConversationId: conversationId,
        buffer: '',
        thinkingBuffer: '',
        isThinking: false,
        tokensPerSec: null,
      }

      this.messages[conversationId].push({
        role: 'user', 
        content, 
        images: images ?? []
      })

      try {
        await invoke('send_message', {
          conversationId,
          content,
          images: images ?? null,
          model: this.activeConversation!.model,
          options: {}, // Default options
        })
      } catch (err) {
        console.error('Failed to send message:', err)
        this.streaming.isStreaming = false
        this.messages[conversationId].push({
          role: 'system',
          content: `Error: ${err}`
        })
      }
    },

    async stopGeneration() {
      try {
        await invoke('stop_generation')
      } catch (err) {
        console.warn('Failed to stop generation:', err)
      } finally {
        this.streaming.isStreaming = false
      }
    },
  },
})
