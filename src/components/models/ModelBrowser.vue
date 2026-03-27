<template>
  <div class="p-6 h-full flex flex-col bg-white dark:bg-[#0F0F0F] text-neutral-900 dark:text-neutral-100 overflow-hidden">
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-semibold tracking-tight">Models</h1>
      <button @click="store.fetchModels()" class="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition font-medium">
        Refresh
      </button>
    </div>

    <!-- Pull section -->
    <div class="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1A1A] shadow-sm">
      <h2 class="text-xl font-medium mb-4">Pull a Library Model</h2>
      <div class="flex gap-4">
        <input v-model="newModelName" @keyup.enter="handlePull" type="text" placeholder="e.g. llama3, mistral, phi3" class="flex-1 px-4 py-3 text-base border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-[#0F0F0F] focus:outline-none focus:border-[#FF6B35] transition" />
        <button @click="handlePull" :disabled="!newModelName" class="px-8 py-3 bg-[#FF6B35] text-white font-medium rounded-xl hover:bg-[#E55A2B] disabled:opacity-50 transition shadow-sm">
          Pull
        </button>
      </div>

      <!-- Pulling Progress -->
      <div v-if="Object.keys(store.pulling).length > 0" class="mt-6 space-y-4">
        <div v-for="(progress, modelName) in store.pulling" :key="modelName" class="p-4 bg-white dark:bg-[#0F0F0F] border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <div class="flex justify-between text-sm mb-2">
            <span class="font-medium text-base">{{ modelName }}</span>
            <span class="text-neutral-500 font-mono">{{ progress.status }} <span v-if="progress.total">({{ Math.round(progress.percent) }}%)</span></span>
          </div>
          <div class="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div class="h-full bg-[#FF6B35] transition-all duration-300 ease-out" :style="{ width: progress.percent + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Installed Models -->
    <div class="flex-1 overflow-y-auto pr-2 pb-8">
      <h2 class="text-xl font-medium mb-4">Installed Local Models</h2>
      <div v-if="store.isLoading" class="text-center py-12 text-neutral-500">
        <div class="animate-pulse flex space-x-4 justify-center">
          <div class="h-4 w-4 bg-neutral-300 dark:bg-neutral-700 rounded-full"></div>
          <div class="h-4 w-4 bg-neutral-300 dark:bg-neutral-700 rounded-full"></div>
          <div class="h-4 w-4 bg-neutral-300 dark:bg-neutral-700 rounded-full"></div>
        </div>
      </div>
      <div v-else-if="store.error" class="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">{{ store.error }}</div>
      <div v-else-if="store.models.length === 0" class="text-center py-16 text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <div class="text-4xl mb-3">🦙</div>
        <p class="text-lg">No models installed yet.</p>
        <p class="text-sm">Pull a model from the library above to get started.</p>
      </div>
      <div v-else class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="model in store.models" :key="model.name" class="p-5 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:shadow-md transition-shadow bg-white dark:bg-[#1A1A1A] flex flex-col group">
          <div class="flex justify-between items-start mb-4">
            <h3 class="font-bold text-lg truncate pr-4 text-[#FF6B35]" :title="model.name">{{ model.name }}</h3>
            <button @click="store.deleteModel(model.name)" class="text-neutral-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100" title="Delete Model">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div class="text-sm font-medium text-neutral-600 dark:text-neutral-300 flex flex-wrap gap-2 mb-6">
            <span class="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700">{{ formatBytes(model.size) }}</span>
            <span v-if="model.details.parameter_size" class="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700">{{ model.details.parameter_size }}</span>
            <span v-if="model.details.quantization_level" class="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700">{{ model.details.quantization_level }}</span>
          </div>
          <div class="mt-auto text-xs text-neutral-400 font-medium">
            Updated {{ new Date(model.modified_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useModelStore } from '../../stores/models';

const store = useModelStore();
const newModelName = ref('');

onMounted(() => {
  store.fetchModels();
  store.initListeners();
});

const handlePull = () => {
  if (newModelName.value.trim()) {
    store.pullModel(newModelName.value.trim());
    newModelName.value = '';
  }
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>
