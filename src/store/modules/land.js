import { defineStore } from 'pinia'

export const useLandStore = defineStore('land', {
  state: () => ({
    currentTask: null,
    selectedParcelIds: [],
    mapConfig: {
      tdtKey: '',
      tdtUrl: 'https://t{s}.tianditu.gov.cn/img_w/wmts'
    }
  }),
  actions: {
    setCurrentTask(task) {
      this.currentTask = task
    },
    setSelectedParcels(ids) {
      this.selectedParcelIds = ids
    },
    setMapConfig(config) {
      this.mapConfig = { ...this.mapConfig, ...config }
    }
  }
})
