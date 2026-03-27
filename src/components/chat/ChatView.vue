<template>
  <div class="flex flex-col h-full bg-white dark:bg-[#0F0F0F] relative">
    <HostManager />
    <!-- Top Bar -->
    <header class="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 justify-between bg-white/80 dark:bg-[#0F0F0F]/80 backdrop-blur-md z-10" :class="[isCompact ? 'h-10' : 'h-14']">
      <div class="flex items-center space-x-3">
        <h1 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate max-w-[200px]">
          {{ activeConversation?.title || 'New Chat' }}
        </h1>
        <span class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500">
          {{ activeConversation?.model || 'llama3:latest' }}
        </span>
      </div>
      <div class="flex items-center space-x-2 relative">
        <button 
          @click="isHostDropdownOpen = !isHostDropdownOpen"
          class="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <span class="relative flex h-2 w-2">
            <span v-if="hostStore.activeHost?.last_ping_status === 'online'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2" :class="statusColor(hostStore.activeHost?.last_ping_status)"></span>
          </span>
          <span class="text-xs font-medium text-neutral-600 dark:text-neutral-300">{{ hostStore.activeHost?.name || 'Select Host' }} ▾</span>
        </button>

        <div v-if="isHostDropdownOpen" class="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg py-1 z-50">
          <div v-for="host in hostStore.hosts" :key="host.id" @click="selectHost(host.id)" class="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex items-center space-x-2">
            <span class="inline-block rounded-full h-2 w-2" :class="statusColor(host.last_ping_status)"></span>
            <span class="text-sm text-neutral-700 dark:text-neutral-200 truncate">{{ host.name }}</span>
          </div>
          <div class="border-t border-neutral-100 dark:border-neutral-800 my-1"></div>
          <div @click="openHostManager" class="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-sm font-medium text-orange-500">
            Manage Hosts...
          </div>
        </div>
      </div>
    </header>

    <!-- Chat History / Scroll Area -->
    <div 
      class="flex-1 overflow-y-auto w-full relative scroll-smooth" 
      ref="scrollContainer"
      @scroll="onScroll"
    >
      <div class="max-w-4xl mx-auto w-full" :class="[isCompact ? 'pb-24' : 'pb-32']">
        <DynamicScroller
          v-if="messages.length > 0"
          :items="itemsForScroller"
          :min-item-size="80"
          item-class="scroller-item"
          key-field="id"
          class="h-full w-full"
        >
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[
                item.message.content, 
                item.isStreaming, 
                item.thinkingContent, 
                item.isThinking
              ]"
              :data-index="index"
            >
              <MessageBubble
                :message="item.message"
                :is-streaming="item.isStreaming"
                :thinking-content="item.thinkingContent"
                :is-thinking="item.isThinking"
                :tokens-per-sec="item.tokensPerSec"
              />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>

        <!-- Empty State -->
        <div v-else class="h-full flex flex-col items-center justify-center text-center px-4 pt-32">
          <div class="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-6">
            <span class="text-3xl">🦙</span>
          </div>
          <h2 class="text-xl font-medium text-neutral-800 dark:text-neutral-100 mb-2">How can I help you today?</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Send a message to start chatting with {{ activeConversation?.model || 'the model' }}.</p>
        </div>
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <transition name="fade">
      <button 
        v-if="!isAutoScrollEnabled && messages.length > 0"
        @click="scrollToBottom"
        class="absolute bottom-28 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg rounded-full px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
      >
        ↓ Jump to present
      </button>
    </transition>

    <!-- Input Area -->
    <!-- Input Area -->
    <ChatInput 
      :is-streaming="isStreaming"
      :is-compact="isCompact"
      @send="onSend"
      @stop="onStop"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import MessageBubble from './MessageBubble.vue'
import ChatInput from './ChatInput.vue'
import HostManager from '../hosts/HostManager.vue'
import { useChatStore } from '../../stores/chat'
import { useUIStore } from '../../stores/ui'
import { useHostStore } from '../../stores/hosts'

const chatStore = useChatStore()
const uiStore = useUIStore()
const hostStore = useHostStore()

const isHostDropdownOpen = ref(false)

function statusColor(status: string | undefined) {
  if (status === 'online') return 'bg-green-500'
  if (status === 'offline') return 'bg-red-500'
  return 'bg-neutral-400'
}

async function selectHost(id: string) {
  isHostDropdownOpen.value = false
  await hostStore.setActiveHost(id)
}

function openHostManager() {
  isHostDropdownOpen.value = false
  hostStore.isHostManagerOpen = true
}

const isCompact = computed(() => uiStore.isCompactMode)

const scrollContainer = ref<HTMLElement | null>(null)
const isAutoScrollEnabled = ref(true)

const activeConversation = computed(() => chatStore.activeConversation)
const messages = computed(() => chatStore.activeMessages)
const streaming = computed(() => chatStore.streaming)
const isStreaming = computed(() => streaming.value.isStreaming)

// Map standard messages + the currently streaming message for the scroller
const itemsForScroller = computed(() => {
  const items = messages.value.map((msg, index) => ({
    id: `msg-${index}`,
    message: msg,
    isStreaming: false,
    thinkingContent: '',
    isThinking: false,
    tokensPerSec: null,
  }))

  if (isStreaming.value && streaming.value.currentConversationId === chatStore.activeConversationId) {
    items.push({
      id: `msg-streaming-active`,
      message: {
        role: 'assistant',
        content: streaming.value.buffer,
      },
      isStreaming: true,
      thinkingContent: streaming.value.thinkingBuffer,
      isThinking: streaming.value.isThinking,
      tokensPerSec: streaming.value.tokensPerSec,
    })
  }

  return items
})

async function onSend(text: string, images?: Uint8Array[]) {
  isAutoScrollEnabled.value = true
  await chatStore.sendMessage(text, images)
}

async function onStop() {
  await chatStore.stopGeneration()
}

function onScroll() {
  if (!scrollContainer.value) return
  
  const el = scrollContainer.value
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  
  // If user scrolls up more than 50px from bottom, disable auto-scroll
  if (distanceToBottom > 50) {
    isAutoScrollEnabled.value = false
  } else {
    isAutoScrollEnabled.value = true
  }
}

function scrollToBottom() {
  if (!scrollContainer.value) return
  isAutoScrollEnabled.value = true
  
  // Use nextTick to allow DOM updates before scrolling
  nextTick(() => {
    const el = scrollContainer.value!
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth'
    })
  })
}

// Auto-scroll when new content arrives
watch(
  () => itemsForScroller.value,
  () => {
    if (isAutoScrollEnabled.value) {
      scrollToBottom()
    }
  },
  { deep: true }
)

onMounted(async () => {
  chatStore.initStreamListeners()
  hostStore.initListeners()
  await hostStore.fetchHosts()
  
  // For demo/testing: create an initial conversation if none exists
  if (!chatStore.activeConversationId) {
    await chatStore.createConversation()
  }
  
  scrollToBottom()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
