import { defineStore } from 'pinia'

/**
 * 全局搜索记忆（仅当前会话，刷新即失）
 * 任一页面点击「查询」时同步工程编号；其他带工程编号筛选的页面打开时自动回填输入框（不自动查询）。
 */
const useSearchMemoryStore = defineStore(
  'searchMemory',
  {
    state: () => ({
      projectCode: ''
    }),
    actions: {
      setProjectCode(val) {
        this.projectCode = (val || '').trim()
      },
      clear() {
        this.projectCode = ''
      }
    }
  }
)

export default useSearchMemoryStore
