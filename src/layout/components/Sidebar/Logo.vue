<template>
  <div class="sidebar-logo-container" :class="{ 'collapse': collapse }">
    <router-link class="sidebar-logo-link" to="/">
      <img
        v-if="!emblemFailed"
        class="sidebar-emblem"
        :src="emblem"
        alt=""
        @error="emblemFailed = true"
      />
      <span v-else class="sidebar-emblem sidebar-emblem-fallback">地空</span>
      <div class="sidebar-title-group">
        <span class="sidebar-title-main">{{ titleMain }}</span>
        <span v-if="titleSub" class="sidebar-title-sub">{{ titleSub }}</span>
      </div>
    </router-link>
  </div>
</template>

<script setup>
import useSettingsStore from '@/store/modules/settings'
import variables from '@/assets/styles/variables.module.scss'
import emblem from '@/assets/logo/emblem.png'

defineProps({
  collapse: {
    type: Boolean,
    required: true
  }
})

// 主标题 = 单位名，副标题 = 系统名
// 未配置新变量时退回原有 VITE_APP_TITLE，退化为单行显示
const titleMain = import.meta.env.VITE_APP_TITLE_MAIN || import.meta.env.VITE_APP_TITLE
const titleSub = import.meta.env.VITE_APP_TITLE_SUB || ''
// 院徽加载失败时的降级开关（退化为文字字牌，避免出现裂图）
const emblemFailed = ref(false)

const settingsStore = useSettingsStore()
const sideTheme = computed(() => settingsStore.sideTheme)

// 获取Logo背景色
const getLogoBackground = computed(() => {
  if (settingsStore.isDark) {
    return 'var(--sidebar-bg)'
  }
  if (settingsStore.navType == 3) {
    return variables.menuLightBg
  }
  return sideTheme.value === 'theme-dark' ? variables.menuBg : variables.menuLightBg
})

// 获取Logo文字颜色
const getLogoTextColor = computed(() => {
  if (settingsStore.isDark) {
    return 'var(--sidebar-logo-text)'
  }
  if (settingsStore.navType == 3) {
    return variables.menuLightText
  }
  return sideTheme.value === 'theme-dark' ? '#fff' : variables.menuLightText
})
</script>

<style lang="scss" scoped>
// 侧栏宽 200px（折叠 54px）：横向院徽 + 右侧上下两行文字，整体左对齐。
// 宽度配平（实测）：12 + 院徽 45.0 + 间距 9 + 主标题 113.4 = 179.4px，右侧余 8.6px。
// ⚠️ 主标题必须 <= 14px：8 字在 15px 下需 121.6px，会把文字块挤到省略号截断。
// ⚠️ 两个 title 的 line-height 必须显式声明。容器高 50px，若不声明会继承 50px 行高，
//    两行文字被撑到 100px，再被父级 a{overflow:hidden} 整块裁掉（等于一个字都看不见）。
.sidebar-logo-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  padding: 0 12px;
  background: v-bind(getLogoBackground);
  overflow: hidden;

  & .sidebar-logo-link {
    // ⚠️ display 必须带 !important：sidebar.scss 里的
    //    `#app .sidebar-container a { display: inline-block }` 带 ID，权重 (1,1,1)，
    //    高于组件内任何类选择器 ⇒ 不加会静默失效，院徽与文字块上下堆叠
    //    （实测 img.top=0/28 高、group.top=28、副标题被 overflow:hidden 裁到只剩 3.9px）。
    display: flex !important;
    align-items: center;
    justify-content: flex-start;
    gap: 9px;
    width: 100%;
    height: 100%;

    & .sidebar-emblem {
      flex: 0 0 auto;
      display: block;
      height: 28px;
      width: auto;
      max-width: 52px;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
    }

    // 院徽加载失败时的文字兜底字牌
    & .sidebar-emblem-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--el-color-primary);
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 1px;
    }

    & .sidebar-title-group {
      display: flex;
      flex: 0 1 auto;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 3px;
      min-width: 0;
    }

    & .sidebar-title-main,
    & .sidebar-title-sub {
      display: block;
      width: 100%;
      overflow: hidden;
      color: v-bind(getLogoTextColor);
      line-height: 1.15;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    & .sidebar-title-main {
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.2px;
    }

    & .sidebar-title-sub {
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.5px;
      opacity: 0.72;
    }
  }

  // 折叠态仅 54px 宽：文字放不下，只保留院徽并居中
  &.collapse {
    padding: 0;

    & .sidebar-logo-link {
      justify-content: center;
      gap: 0;

      & .sidebar-emblem {
        height: 24px;
      }

      & .sidebar-title-group {
        display: none;
      }
    }
  }
}
</style>
