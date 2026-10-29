<template>
   <!--
      合同详情公共弹窗（2026-10-29 抽出）
      使用场景：
        1) 合同管理列表 → 行「详情」按钮（原来写死在 contract/index.vue 里的弹窗）
        2) 项目详情「基本信息 → 合同」→ 点击合同链接就地查看
      入参：v-model 控制显隐 + contractId；打开时按 id 拉 getContract，tab 数据仍懒加载。
      ⚠️ 弹窗 append-to-body，节点挂在 body 上，scoped 样式不会命中 ⇒ 布局样式写在非 scoped 段。
   -->
   <el-dialog
      :title="dialogTitle"
      :model-value="modelValue"
      width="80%"
      append-to-body
      destroy-on-close
      class="contract-detail-dialog"
      @update:model-value="val => emit('update:modelValue', val)"
   >
      <el-tabs v-model="activeTab" @tab-change="ensureTabData">
         <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border v-loading="loading">
               <el-descriptions-item label="合同编号" :span="1">{{ detail.contractNo }}</el-descriptions-item>
               <el-descriptions-item label="合同名称" :span="1">{{ detail.contractName }}</el-descriptions-item>
               <el-descriptions-item label="合同类型"><dict-tag :options="proj_contract_type" :value="detail.contractType" /></el-descriptions-item>
               <el-descriptions-item label="合同状态">
                  <dict-tag v-if="detail.status" :options="proj_contract_status" :value="detail.status" />
                  <span v-else>进行中</span>
               </el-descriptions-item>
               <el-descriptions-item label="合同金额">{{ formatAmount(detail.contractAmount, amountUnit) }}</el-descriptions-item>
               <el-descriptions-item label="委托单位">{{ detail.clientUnit }}</el-descriptions-item>
               <el-descriptions-item label="项目类型">{{ detail.extraData ? projectTypeText(detail.extraData.projectType) : '' }}</el-descriptions-item>
               <el-descriptions-item label="测绘地址">{{ detail.extraData ? detail.extraData.surveyAddress : '' }}</el-descriptions-item>
               <el-descriptions-item label="合同期限">{{ detail.contractPeriod }}</el-descriptions-item>
               <el-descriptions-item label="联系人">{{ detail.contactName }}</el-descriptions-item>
               <el-descriptions-item label="联系电话">{{ detail.contactPhone }}</el-descriptions-item>
               <el-descriptions-item label="签署日期">{{ parseDate(detail.signDate) }}</el-descriptions-item>
               <el-descriptions-item label="登记时间">{{ parseDate(detail.entrustDate) }}</el-descriptions-item>
               <el-descriptions-item label="归档日期">{{ parseDate(detail.archiveDate) }}</el-descriptions-item>
               <el-descriptions-item label="存储目录" :span="2">{{ detail.archivePath }}</el-descriptions-item>
               <el-descriptions-item label="支付条件" :span="2">{{ detail.paymentTerms }}</el-descriptions-item>
               <el-descriptions-item label="备注" :span="2">{{ detail.remark }}</el-descriptions-item>
               <el-descriptions-item label="创建者">{{ detail.createBy }}</el-descriptions-item>
               <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
               <el-descriptions-item label="修改者">{{ detail.updateBy }}</el-descriptions-item>
               <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
            </el-descriptions>
         </el-tab-pane>

         <el-tab-pane label="合同单价" name="price">
            <div v-if="priceLoading || priceList.length > 0">
               <el-table v-loading="priceLoading" :data="priceList" border size="small" max-height="400">
                  <el-table-column label="大类" align="center" prop="parentName" min-width="120" :show-overflow-tooltip="true" />
                  <el-table-column label="项目类别" align="center" prop="categoryName" min-width="140" :show-overflow-tooltip="true" />
                  <el-table-column label="计费类别" align="center" prop="billingCategory" min-width="120" :show-overflow-tooltip="true" />
                  <el-table-column label="字典单价" align="right" prop="dictUnitPrice" min-width="100">
                     <template #default="scope">
                        <span v-if="scope.row.dictUnitPrice">¥{{ Number(scope.row.dictUnitPrice).toFixed(2) }}</span>
                     </template>
                  </el-table-column>
                  <el-table-column label="计价单位" align="center" prop="priceUnit" min-width="100" />
                  <el-table-column label="字典起步量" align="right" prop="minQuantity" min-width="100">
                     <template #default="scope">
                        <span v-if="scope.row.minQuantity != null">{{ scope.row.minQuantity }}</span>
                        <span v-else style="color:#c0c4cc">—</span>
                     </template>
                  </el-table-column>
                  <el-table-column label="合同起步量" align="right" min-width="100">
                     <template #default="scope">
                        <span v-if="scope.row.contractMinQuantity != null">{{ scope.row.contractMinQuantity }}</span>
                        <span v-else style="color:#c0c4cc">—</span>
                     </template>
                  </el-table-column>
                  <el-table-column label="合同单价" align="center" min-width="120">
                     <template #default="scope">
                        <span style="font-weight: 600; color: #409eff;">¥{{ Number(scope.row.price).toFixed(2) }}</span>
                     </template>
                  </el-table-column>
               </el-table>
            </div>
            <el-empty v-else description="暂无合同单价数据" />
         </el-tab-pane>

         <el-tab-pane label="附件资料" name="attachment">
            <div v-if="attachmentLoading || attachmentList.length > 0">
               <el-table v-loading="attachmentLoading" :data="attachmentList" border size="small" max-height="400">
                  <el-table-column label="文件" align="left" min-width="200">
                     <template #default="scope">
                        <div style="display:flex;align-items:center;gap:8px">
                           <el-icon :size="20" :color="fileIconColor(scope.row.fileType)"><Document /></el-icon>
                           <span>{{ scope.row.fileName }}</span>
                        </div>
                     </template>
                  </el-table-column>
                  <el-table-column label="分类" align="center" prop="fileCategory" min-width="100">
                     <template #default="scope">
                        {{ categoryLabel(scope.row.fileCategory) }}
                     </template>
                  </el-table-column>
                  <el-table-column label="标记" align="center" min-width="80">
                     <template #default="scope">
                        <el-tag v-if="scope.row.isFinal === '1'" size="small" type="success">盖章版</el-tag>
                     </template>
                  </el-table-column>
                  <el-table-column label="版本" align="center" min-width="60" prop="version">
                     <template #default="scope">v{{ scope.row.version }}</template>
                  </el-table-column>
                  <el-table-column label="大小" align="right" min-width="80">
                     <template #default="scope">{{ formatFileSize(scope.row.fileSize) }}</template>
                  </el-table-column>
                  <el-table-column label="操作" align="center" min-width="120">
                     <template #default="scope">
                        <el-button link type="primary" size="small" @click="previewAttachment(scope.row)">预览</el-button>
                        <el-button link type="primary" size="small" @click="downloadAttachment(scope.row)">下载</el-button>
                     </template>
                  </el-table-column>
               </el-table>
            </div>
            <el-empty v-else description="暂无附件" />
         </el-tab-pane>
      </el-tabs>
      <template #footer>
         <div class="dialog-footer">
            <el-button @click="emit('update:modelValue', false)">关 闭</el-button>
         </div>
      </template>
   </el-dialog>
</template>

<script setup name="ContractDetailDialog">
import { ref, computed, watch, getCurrentInstance } from "vue"
import { getContract } from "@/api/project/contract"
import { listContractPrice } from "@/api/project/contractPrice"
import { listAttachments } from "@/api/project/contractAttachment"
import { Document } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { parseTime } from '@/utils/land'
import { useDict } from '@/utils/dict'
import { attachmentCategoryText } from '@/utils/projStatus'

const props = defineProps({
   modelValue: { type: Boolean, default: false },
   contractId: { type: [Number, String], default: null },
   // 金额单位：与调用方页面保持一致（合同管理页有「万元 / 元」切换）
   amountUnit: { type: String, default: 'wan' }
})
const emit = defineEmits(['update:modelValue', 'loaded'])
const { proxy } = getCurrentInstance()

const { proj_contract_type, proj_contract_status, proj_attachment_category } =
   useDict('proj_contract_type', 'proj_contract_status', 'proj_attachment_category')

const loading = ref(false)
const detail = ref({})

const activeTab = ref('info')
const priceList = ref([])
const priceLoading = ref(false)
const priceLoaded = ref(false)
const attachmentList = ref([])
const attachmentLoading = ref(false)
const attachmentLoaded = ref(false)

const dialogTitle = computed(() => '合同详情 — ' + (detail.value.contractNo || ''))

/* 打开 / 切换合同 → 重新拉基本信息；tab 数据复位，等用户点开再请求 */
watch(
   [() => props.modelValue, () => props.contractId],
   ([visible, id]) => {
      if (visible && id) loadDetail(id)
   },
   { immediate: true }
)

function loadDetail(id) {
   loading.value = true
   activeTab.value = 'info'
   priceLoaded.value = false
   attachmentLoaded.value = false
   priceList.value = []
   attachmentList.value = []
   getContract(id).then(res => {
      const d = res.data || {}
      d.extraData = parseExtraData(d.extraData)
      detail.value = d
      // 回传给调用方（合同管理页编辑合同后要用当前详情的 id 刷新关联数据）
      emit('loaded', d)
   }).catch(() => {
      detail.value = {}
   }).finally(() => {
      loading.value = false
   })
}

/** 详情弹窗：按需加载当前 Tab 的数据 */
function ensureTabData(tab) {
   const id = props.contractId
   if (!id) return
   if (tab === 'price') {
      if (priceLoaded.value) return
      priceLoaded.value = true
      loadPrice(id)
   } else if (tab === 'attachment') {
      if (attachmentLoaded.value) return
      attachmentLoaded.value = true
      loadAttachments(id)
   }
}

function loadPrice(contractId) {
   priceLoading.value = true
   listContractPrice(contractId).then(res => {
      const all = res.data || []
      const catMap = {}
      all.forEach(item => { catMap[item.categoryId] = item })
      // 只保留有合同单价的计费方式明细行（billingId 不为空），并附上大类名
      priceList.value = all
         .filter(item => item.price != null && item.billingId)
         .map(item => ({
            ...item,
            parentName: catMap[item.parentId]?.categoryName || ''
         }))
   }).catch(() => {
      priceList.value = []
   }).finally(() => {
      priceLoading.value = false
   })
}

function loadAttachments(contractId) {
   attachmentLoading.value = true
   listAttachments(contractId).then(res => {
      attachmentList.value = res.data || []
   }).catch(() => {
      attachmentList.value = []
   }).finally(() => {
      attachmentLoading.value = false
   })
}

/* ===== 展示格式化 ===== */

function parseExtraData(v) {
   if (!v) return {}
   if (typeof v === 'object') return v
   try {
      const o = JSON.parse(v)
      return o && typeof o === 'object' ? o : {}
   } catch (e) {
      return {}
   }
}

/** 项目类型（extra_data.projectType）历史值归一为数组：数组原样、字符串按逗号类分隔符切分 */
function toProjectTypeArray(v) {
   if (Array.isArray(v)) return v.filter(Boolean)
   if (typeof v === 'string' && v.trim()) return v.split(/[,，、;；]/).map(s => s.trim()).filter(Boolean)
   return []
}

function projectTypeText(v) {
   return toProjectTypeArray(v).join('、')
}

function formatAmount(val, unit = 'wan') {
   if (val == null) return ''
   const num = Number(val)
   if (unit === 'wan') {
      return (num / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' 万'
   }
   return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseDate(val) {
   return val || ''
}

function categoryLabel(cat) {
   const dict = proj_attachment_category.value || []
   const found = dict.find(c => c.value === cat)
   if (found) return found.label
   return attachmentCategoryText(cat)
}

function formatFileSize(bytes) {
   if (!bytes) return '0 B'
   const units = ['B', 'KB', 'MB', 'GB']
   let i = 0
   let size = Number(bytes)
   while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
   return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

function fileIconColor(ext) {
   const map = { pdf: '#f56c6c', doc: '#409eff', docx: '#409eff', xls: '#67c23a', xlsx: '#67c23a', jpg: '#e6a23c', jpeg: '#e6a23c', png: '#e6a23c', gif: '#e6a23c' }
   return map[ext?.toLowerCase()] || '#909399'
}

/* ===== 附件预览 / 下载（Axios blob + JSON 错误检测） ===== */

async function previewAttachment(att) {
   try {
      const res = await request({
         url: '/project/contract/attachment/' + att.id + '/preview',
         method: 'get',
         responseType: 'blob'
      })
      const data = res.data
      if (data instanceof Blob && data.type === 'application/json') {
         const text = await data.text()
         try { const err = JSON.parse(text); proxy.$modal.msgError(err.msg || '预览失败') }
         catch (_) { proxy.$modal.msgError('预览失败') }
         return
      }
      const url = URL.createObjectURL(data)
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write('<!DOCTYPE html><html><head><title>' + (att.fileName || '文件预览') + '</title></head><body style="margin:0;overflow:hidden"><iframe src="' + url + '" style="width:100vw;height:100vh;border:none;position:fixed;top:0;left:0"></iframe></body></html>')
      w.document.close()
   } catch (e) {
      console.error('预览失败', e)
   }
}

async function downloadAttachment(att) {
   try {
      const res = await request({
         url: '/project/contract/attachment/' + att.id + '/preview',
         method: 'get',
         responseType: 'blob'
      })
      const data = res.data
      if (data instanceof Blob && data.type === 'application/json') {
         const text = await data.text()
         try { const err = JSON.parse(text); proxy.$modal.msgError(err.msg || '下载失败') }
         catch (_) { proxy.$modal.msgError('下载失败') }
         return
      }
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = att.fileName || 'file'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
   } catch (e) {
      console.error('下载失败', e)
   }
}
</script>

<style>
/* 弹窗挂在 body 上，scoped 不命中 ⇒ 布局样式必须非 scoped（class 唯一，不会污染其它弹窗）。
   目的：标题栏/按钮栏固定，内容区超高时自身滚动，避免整页出现滚动条把标题栏滚走。 */
.el-dialog.contract-detail-dialog:not(.is-fullscreen) {
   display: flex;
   flex-direction: column;
   max-height: calc(100vh - 4vh - 24px);
   margin-top: 4vh !important;
   margin-bottom: 16px !important;
}
.contract-detail-dialog .el-dialog__header,
.contract-detail-dialog .el-dialog__footer {
   flex: 0 0 auto;
}
.contract-detail-dialog .el-dialog__body {
   flex: 1 1 auto;
   min-height: 0;
   overflow-y: auto;
}
</style>
