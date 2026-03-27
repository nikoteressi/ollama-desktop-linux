<template>
  <div 
    class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white dark:from-[#0F0F0F] dark:via-[#0F0F0F] to-transparent pt-6 pb-6 px-4 md:px-8 z-20"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="max-w-4xl mx-auto relative group" :class="[isCompact ? 'shadow-md rounded-2xl' : 'shadow-lg rounded-3xl']">
      
      <!-- Drag Overlay -->
      <div 
        v-if="isDragging"
        class="absolute inset-0 z-30 bg-orange-500/10 backdrop-blur-[2px] border-2 border-dashed border-orange-500 flex items-center justify-center pointer-events-none transition-all"
        :class="[isCompact ? 'rounded-2xl' : 'rounded-3xl']"
      >
        <span class="text-orange-600 dark:text-orange-400 font-medium relative top-[-6px]">Drop images here</span>
      </div>

      <div class="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition relative overflow-hidden"
           :class="[isCompact ? 'rounded-2xl' : 'rounded-3xl']">
        
        <!-- Image Previews -->
        <div v-if="attachments.length > 0" class="flex flex-wrap gap-2 pt-3 px-4 pb-1">
          <div v-for="(file, index) in attachments" :key="index" class="relative group/img">
            <img :src="file.previewUrl" class="h-14 w-14 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm" />
            <button @click="removeAttachment(index)" class="absolute -top-1.5 -right-1.5 bg-neutral-800 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 outline-none hover:bg-neutral-900 transition shadow-md z-10 cursor-pointer">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <textarea
          v-model="inputContent"
          @keydown.enter.prevent="handleEnter"
          @paste="onPaste"
          placeholder="Type a message or paste an image..."
          class="w-full bg-transparent pl-5 pr-14 focus:outline-none resize-none overflow-hidden placeholder-neutral-400 dark:text-neutral-100 leading-relaxed max-h-48"
          :class="[isCompact ? 'text-[13px] py-3 min-h-[44px]' : 'text-[15px] py-3.5 min-h-[52px]', attachments.length > 0 ? 'pt-2' : '']"
          :disabled="isStreaming"
          rows="1"
        ></textarea>
      </div>
      
      <button
        @click="handleSubmit"
        :disabled="(!inputContent.trim() && attachments.length === 0) && !isStreaming"
        class="absolute right-2.5 bottom-2 w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-40"
        :class="[
          isStreaming 
            ? 'bg-neutral-700 hover:bg-neutral-800 text-white dark:bg-neutral-300 dark:hover:bg-neutral-200 dark:text-neutral-900' 
            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
        ]"
      >
        <!-- Stop icon if streaming -->
        <svg v-if="isStreaming" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        <!-- Send icon otherwise -->
        <svg v-else class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isStreaming: boolean
  isCompact: boolean
}>()

const emit = defineEmits<{
  send: [text: string, images?: Uint8Array[]]
  stop: []
}>()

const inputContent = ref('')
const isDragging = ref(false)
let dragCounter = 0

interface Attachment {
  file: File
  previewUrl: string
  data: Uint8Array | null
}

const attachments = ref<Attachment[]>([])

function onDragEnter(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) {
    dragCounter++
    isDragging.value = true
  }
}

function onDragLeave(e: DragEvent) {
  dragCounter--
  if (dragCounter === 0) {
    isDragging.value = false
  }
}

async function onDrop(e: DragEvent) {
  dragCounter = 0
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files) {
    await handleFiles(files)
  }
}

async function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return

  const imageFiles: File[] = []
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) imageFiles.push(file)
    }
  }

  if (imageFiles.length > 0) {
    e.preventDefault() // Stop pasted text if it's an image
    await handleFiles(imageFiles)
  }
}

async function handleFiles(files: FileList | File[]) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      const data = new Uint8Array(await file.arrayBuffer())
      attachments.value.push({
        file,
        previewUrl,
        data
      })
    }
  }
}

function removeAttachment(index: number) {
  URL.revokeObjectURL(attachments.value[index].previewUrl)
  attachments.value.splice(index, 1)
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return
  handleSubmit()
}

function handleSubmit() {
  if (props.isStreaming) {
    emit('stop')
    return
  }

  const text = inputContent.value.trim()
  const validAttachments = attachments.value.filter(a => a.data !== null).map(a => a.data as Uint8Array)
  
  if (!text && validAttachments.length === 0) return

  emit('send', text, validAttachments.length > 0 ? validAttachments : undefined)
  
  inputContent.value = ''
  attachments.value.forEach(a => URL.revokeObjectURL(a.previewUrl))
  attachments.value = []
}
</script>
