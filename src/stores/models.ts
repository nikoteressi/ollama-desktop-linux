import { defineStore } from 'pinia';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Model, PullProgressPayload } from '../types/models';

export const useModelStore = defineStore('models', {
  state: () => ({
    models: [] as Model[],
    pulling: {} as Record<string, PullProgressPayload>,
    isLoading: false,
    error: null as string | null,
    listenersInitialized: false,
  }),
  actions: {
    async fetchModels() {
      this.isLoading = true;
      this.error = null;
      try {
        this.models = await invoke<Model[]>('list_models');
      } catch (e: any) {
        this.error = e.toString();
      } finally {
        this.isLoading = false;
      }
    },
    async deleteModel(name: string) {
      if (!confirm(`Are you sure you want to delete ${name}?`)) return;
      try {
        await invoke('delete_model', { name });
        await this.fetchModels();
      } catch (e: any) {
        this.error = e.toString();
      }
    },
    async pullModel(name: string) {
      if (this.pulling[name]) return; // Already pulling
      this.pulling[name] = { model: name, status: 'starting...', percent: 0 };
      try {
        await invoke('pull_model', { name });
      } catch (e: any) {
        this.error = e.toString();
        delete this.pulling[name];
      }
    },
    async initListeners() {
      if (this.listenersInitialized) return;
      this.listenersInitialized = true;
      
      await listen<PullProgressPayload>('model:pull-progress', (event) => {
        const payload = event.payload;
        this.pulling[payload.model] = payload;
      });
      await listen<{model: string}>('model:pull-done', (event) => {
        const payload = event.payload;
        delete this.pulling[payload.model];
        this.fetchModels(); // Refresh list automatically
      });
    }
  }
});
