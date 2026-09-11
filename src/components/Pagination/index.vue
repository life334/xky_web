<template>
  <div :class="{ 'hidden': hidden }" class="pagination-container">
    <!-- 「全部」下拉：Element Plus 原生 sizes 的选项文案固定为「N条/页」，无法显示中文标签，
         因此开启 allOption 时用一个同尺寸的自定义下拉替代原生 sizes（layout 中移除 sizes，其余布局项不变） -->
    <el-select
      v-if="allOption"
      :model-value="sizeSelectValue"
      class="pagination-size-select"
      @change="handleSizeSelectChange"
    >
      <el-option v-for="opt in sizeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
    </el-select>
    <el-pagination
      :background="background"
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :layout="innerLayout"
      :page-sizes="pageSizes"
      :pager-count="pagerCount"
      :total="total"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup>
import { scrollTo } from '@/utils/scroll-to'

/** 「全部」在下拉中的标识值（负数，不会与真实条数冲突） */
const ALL_VALUE = -1
/** 选择「全部」时提交给后端的每页条数：足够大，让后端一次返回全部数据 */
const ALL_SIZE = 100000

const props = defineProps({
  total: {
    required: true,
    type: Number
  },
  page: {
    type: Number,
    default: 1
  },
  limit: {
    type: Number,
    default: 20
  },
  pageSizes: {
    type: Array,
    default() {
      return [10, 20, 30, 50]
    }
  },
  // 是否在「每页条数」中追加「全部」选项（选中后一次加载全部数据）
  allOption: {
    type: Boolean,
    default: false
  },
  // 移动端页码按钮的数量端默认值5
  pagerCount: {
    type: Number,
    default: document.body.clientWidth < 992 ? 5 : 7
  },
  layout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper'
  },
  background: {
    type: Boolean,
    default: true
  },
  autoScroll: {
    type: Boolean,
    default: true
  },
  hidden: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits()
const currentPage = computed({
  get() {
    return props.page
  },
  set(val) {
    emit('update:page', val)
  }
})
const pageSize = computed({
  get() {
    return props.limit
  },
  set(val){
    emit('update:limit', val)
  }
})

/** 开启 allOption 时移除 layout 中的 sizes（由自定义下拉替代） */
const innerLayout = computed(() => {
  if (!props.allOption) return props.layout
  return props.layout
    .split(',')
    .map(item => item.trim())
    .filter(item => item && item !== 'sizes')
    .join(', ')
})

/** 自定义下拉选项：原有每页条数 + 全部 */
const sizeOptions = computed(() => [
  ...props.pageSizes.map(size => ({ label: `${size}条/页`, value: size })),
  { label: '全部', value: ALL_VALUE }
])

/** 下拉回显：当前 limit 已是「全部」量级时回显「全部」 */
const sizeSelectValue = computed(() => (props.limit >= ALL_SIZE ? ALL_VALUE : props.limit))

/** 自定义下拉切换（与原生 size-change 行为保持一致：必要时回到第 1 页并重新查询） */
function handleSizeSelectChange(val) {
  const size = val === ALL_VALUE ? ALL_SIZE : val
  if (size === props.limit) return
  pageSize.value = size
  // 「全部」必然回到第 1 页；条数变大导致当前页超出总页数时同样回到第 1 页
  if (val === ALL_VALUE || currentPage.value * size > props.total) {
    currentPage.value = 1
  }
  emit('pagination', { page: currentPage.value, limit: size })
  if (props.autoScroll) {
    scrollTo(0, 800)
  }
}

function handleSizeChange(val) {
  if (currentPage.value * val > props.total) {
    currentPage.value = 1
  }
  emit('pagination', { page: currentPage.value, limit: val })
  if (props.autoScroll) {
    scrollTo(0, 800)
  }
}

function handleCurrentChange(val) {
  emit('pagination', { page: val, limit: pageSize.value })
  if (props.autoScroll) {
    scrollTo(0, 800)
  }
}
</script>

<style scoped>
.pagination-container {
  background: #fff;
}
.pagination-container.hidden {
  display: none;
}

/* 与 el-pagination 内部原生 sizes 下拉保持同尺寸（原生宽度 128px、右侧间距 8px） */
.pagination-size-select {
  width: 128px;
  margin-right: 8px;
}
</style>
