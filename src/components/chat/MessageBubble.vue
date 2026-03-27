<template>
  <div
    class="group flex w-full transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
    :class="[
      isUser ? 'justify-end' : 'justify-start',
      isCompact ? 'space-x-2 py-3 px-2 md:px-3 rounded-xl' : 'space-x-3 py-6 px-4 md:px-6 rounded-2xl'
    ]"
  >
    <!-- Avatar (User vs Assistant) -->
    <div
      v-if="!isUser"
      class="flex-shrink-0 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 ring-1 ring-orange-200 dark:ring-orange-800"
      :class="[isCompact ? 'w-6 h-6' : 'w-8 h-8']"
    >
      <span class="text-orange-600 dark:text-orange-400 font-semibold" :class="[isCompact ? 'text-xs' : 'text-sm']">O</span>
    </div>

    <!-- Message Content -->
    <div
      class="flex flex-col max-w-[85%] sm:max-w-[75%] space-y-2"
      :class="[isUser ? 'items-end' : 'items-start']"
    >
      <!-- User Message -->
      <div
        v-if="isUser"
        class="bg-blue-600 text-white font-sans shadow-sm leading-relaxed whitespace-pre-wrap"
        :class="[isCompact ? 'px-3 py-1.5 text-[13px] rounded-xl rounded-tr-sm' : 'px-4 py-2.5 text-[15px] rounded-2xl rounded-tr-sm']"
      >
        {{ message.content }}
      </div>

      <!-- Assistant Message -->
      <div
        v-else
        class="text-neutral-800 dark:text-neutral-100 leading-relaxed font-sans w-full prose dark:prose-invert prose-p:my-2 prose-pre:my-3 prose-pre:bg-neutral-900 prose-pre:rounded-xl"
        :class="[isCompact ? 'text-[13px] prose-sm' : 'text-[15px]']"
      >
        <!-- Thinking Block -->
        <div v-if="thinkingContent || isThinking" class="mb-4">
          <div
            class="overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 transition-all duration-300"
            :class="{ 'border-l-4 border-l-orange-500 animate-pulse': isThinking }"
          >
            <button
              @click="isThinkingExpanded = !isThinkingExpanded"
              class="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <div class="flex items-center space-x-2">
                <svg
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'rotate-90': isThinkingExpanded }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span>{{ isThinking ? 'Thinking...' : 'Thought process' }}</span>
              </div>
            </button>
            <div
              v-show="isThinkingExpanded"
              class="px-4 pb-3 pt-1 text-sm font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap overflow-x-auto"
            >
              {{ thinkingContent }}
              <span v-if="isThinking" class="inline-block w-2 bg-orange-500 animate-pulse ml-1">&nbsp;</span>
            </div>
          </div>
        </div>

        <!-- Rendered Markdown HTML -->
        <div class="rendered-markdown" v-html="renderedHtml"></div>

        <!-- Blinking cursor for streaming -->
        <span
          v-if="isStreaming && !isThinking"
          class="inline-block w-2 h-4 bg-orange-500 animate-pulse ml-1 align-middle whitespace-pre-wrap"
        ></span>
      </div>

      <!-- Badges / Footer Info -->
      <div v-if="tokensPerSec && !isStreaming" class="text-xs text-neutral-400 mt-1">
        <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
          {{ tokensPerSec.toFixed(1) }} tok/s
        </span>
      </div>
    </div>

    <!-- User Avatar -->
    <div
      v-if="isUser"
      class="flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800"
      :class="[isCompact ? 'w-6 h-6' : 'w-8 h-8']"
    >
      <span class="text-blue-600 dark:text-blue-400 font-semibold" :class="[isCompact ? 'text-xs' : 'text-sm']">U</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { renderMarkdown } from '../../lib/markdown'
import type { Message } from '../../types/chat'
import { useUIStore } from '../../stores/ui'

const props = defineProps<{
  message: Message
  isStreaming?: boolean
  thinkingContent?: string
  isThinking?: boolean
  tokensPerSec?: number | null
}>()

const uiStore = useUIStore()
const isCompact = computed(() => uiStore.isCompactMode)

const isUser = computed(() => props.message.role === 'user')
const isThinkingExpanded = ref(true)

// Throttled markdown rendering state
const renderedHtml = ref('')
const rawContentForRender = computed(() => props.message.content)

let renderToken: number | null = null

function scheduleRender() {
  if (renderToken !== null) return // Already scheduled

  renderToken = requestAnimationFrame(() => {
    renderedHtml.value = renderMarkdown(rawContentForRender.value)
    renderToken = null
  })
}

// Watch for changes and throttle the rendering
watch(rawContentForRender, () => {
  if (isUser.value) return
  scheduleRender()
}, { immediate: true })

// Collapse thinking block when generation finishes
watch(() => props.isThinking, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    isThinkingExpanded.value = false
  }
})

onBeforeUnmount(() => {
  if (renderToken !== null) {
    cancelAnimationFrame(renderToken)
  }
})

onMounted(() => {
  // Collapse by default if it's already finished loading
  if (!props.isThinking && props.thinkingContent) {
    isThinkingExpanded.value = false
  }
})
</script>

<style>
/* Specific styling overrides for nested markdown elements */
.rendered-markdown p:last-child {
  margin-bottom: 0;
}
.rendered-markdown pre {
  margin: 0.75rem 0;
  padding: 1rem;
  border-radius: 0.75rem;
  overflow-x: auto;
}
</style>
