import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    isCompactMode: false,
    isSidebarOpen: true,
  }),
  actions: {
    toggleCompactMode() {
      this.isCompactMode = !this.isCompactMode
    },
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
    }
  }
})
