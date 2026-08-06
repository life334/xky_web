<template>
   <div class="app-container">
      <!-- Row 1: 全局搜索 -->
      <div class="search-bar-row">
         <div class="search-input-wrapper">
            <el-input v-model="queryParams.keyword" placeholder="搜索工程编号/项目名称/联系人/目录..." clearable @keyup.enter="handleQuery" @clear="handleQuery" class="global-search-input">
               <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
         </div>
         <el-button type="primary" size="small" @click="handleQuery">搜索</el-button>
         <el-button size="small" @click="resetQuery">重置</el-button>
      </div>

      <!-- Row 2: 状态胶囊 -->
      <!-- <div class="status-capsule-row">
         <span v-for="sc in statusCapsules" :key="sc.value ?? '__all__'" class="status-capsule" :class="{ active: queryParams.status === sc.value }" @click="handleStatusClick(sc.value)">{{ sc.label }}<span class="capsule-count">{{ sc.count }}</span></span>
      </div> -->

      <!-- Row 3: 高级筛选 -->
      <div class="advanced-toggle-row" @click="advancedVisible = !advancedVisible">
         <span>{{ advancedVisible ? '▲' : '▼' }} 高级筛选</span>
      </div>

      <!-- Row 4: 高级面板 -->
      <el-collapse-transition>
         <div v-show="advancedVisible" class="advanced-filter-panel">
            <div class="filter-grid">
               <div class="filter-item">
                  <div class="filter-item-label">所属项目</div>
                  <el-select v-model="queryParams.projectId" filterable clearable placeholder="全部项目" style="width:100%" @change="handleQuery">
                     <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">成果类型</div>
                  <el-select v-model="queryParams.resultType" clearable placeholder="全部类型" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in proj_material_result_type" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">提交状态</div>
                  <el-select v-model="queryParams.submitStatus" clearable placeholder="全部状态" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in proj_material_submit_status" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">提交时间</div>
                  <el-date-picker v-model="submitTimeRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onSubmitTimeChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系人</div>
                  <el-input v-model="queryParams.contactName" placeholder="联系人" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系电话</div>
                  <el-input v-model="queryParams.contactPhone" placeholder="联系电话" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程编号</div>
                  <el-input v-model="queryParams.projectCode" placeholder="工程编号" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程地点</div>
                  <el-input v-model="queryParams.projectLocation" placeholder="工程地点" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
            </div>
            <!-- 快捷日期 -->
            <div class="quick-filter-row">
               <span class="quick-label">快捷：</span>
               <span class="quick-chip" @click="setQuickDate('today')">今天</span>
               <span class="quick-chip" @click="setQuickDate('week')">本周</span>
               <span class="quick-chip" @click="setQuickDate('month')">本月</span>
               <span class="quick-chip" @click="setQuickDate('7days')">近7天</span>
               <span class="quick-chip" @click="setQuickDate('30days')">近30天</span>
               <span class="collapse-link" @click="advancedVisible = false">收起 ▲</span>
            </div>
         </div>
      </el-collapse-transition>

      <!-- Row 5: 操作按钮行 -->
      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="success" size="small" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['project:material:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5" style="margin-left:auto">
            <el-button type="warning" size="small" plain icon="Download" @click="handleExport" v-hasPermi="['project:material:export']">导出</el-button>
         </el-col>
      </el-row>

      <el-table v-loading="loading" :data="materialList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="工程编号" align="center" prop="projectCode" min-width="130" :show-overflow-tooltip="false" />
         <el-table-column label="委托任务" align="center" prop="engineeringProject" min-width="160" :show-overflow-tooltip="false" />
         <el-table-column label="工程地点" align="center" prop="projectLocation" min-width="140" :show-overflow-tooltip="false" />
         <el-table-column label="项目名称" align="center" prop="projectName" min-width="170" :show-overflow-tooltip="false" />
         <el-table-column label="提交时间" align="center" prop="submitTime" min-width="155">
            <template #default="scope">
               <span v-if="scope.row.submitTime">{{ parseTime(scope.row.submitTime, '{y}-{m}-{d}') }}</span>
            </template>
         </el-table-column>
         <el-table-column label="联系人" align="center" prop="contactName" min-width="100" :show-overflow-tooltip="false" />
         <el-table-column label="联系电话" align="center" prop="contactPhone" min-width="130" />
         <el-table-column label="成果类型" align="center" prop="resultType" min-width="100">
            <template #default="scope">
               <dict-tag v-if="scope.row.resultType" :options="proj_material_result_type" :value="scope.row.resultType" />
            </template>
         </el-table-column>
         <el-table-column label="目录" align="center" prop="archiveDir" min-width="160" :show-overflow-tooltip="false" />
         <!-- <el-table-column label="状态" align="center" prop="status" width="90">
            <template #default="scope">
               <dict-tag :options="proj_material_status" :value="scope.row.status" />
            </template>
         </el-table-column> -->
         <el-table-column label="备注" align="center" prop="remark" min-width="160" :show-overflow-tooltip="false" />
         <el-table-column label="操作" align="center" min-width="100" class-name="small-padding fixed-width" fixed="right">
            <template #default="scope">
               <!-- <el-button v-if="scope.row.status === 'pending' || scope.row.status === 'returned'" link type="warning" @click="handleBorrow(scope.row)" v-hasPermi="['project:material:borrow']" v-text="scope.row.status === 'returned' ? '再次领取' : '领取'" /> -->
               <!-- <el-button v-if="scope.row.status === 'received'" link type="success" @click="handleReturn(scope.row)" v-hasPermi="['project:material:return']">归还</el-button> -->
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:material:edit']">修改</el-button>
               <!-- <el-button link type="primary" @click="handleFlow(scope.row)">流转</el-button> -->
               <!-- <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['project:material:remove']">删除</el-button> -->
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 修改资料提交对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="700px" append-to-body>
         <!-- 项目信息（只读） -->
         <el-descriptions :column="2" border size="small" class="mb20">
            <el-descriptions-item label="工程编号">{{ form.projectCode}}</el-descriptions-item>
            <el-descriptions-item label="委托任务">{{ form.engineeringProject }}</el-descriptions-item>
            <el-descriptions-item label="工程地点">{{ form.projectLocation}}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ form.projectName}}</el-descriptions-item>
         </el-descriptions>
         <!-- 资料属性（可编辑） -->
         <el-form ref="materialRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="提交时间" prop="submitTime">
                     <el-date-picker v-model="form.submitTime" type="datetime" placeholder="选择提交时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="成果类型" prop="resultType">
                     <el-select v-model="form.resultType" placeholder="请选择成果类型" clearable filterable style="width: 100%">
                        <el-option
                           v-for="dict in proj_material_result_type"
                           :key="dict.value"
                           :label="dict.label"
                           :value="dict.value"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="联系人" prop="contactName">
                     <el-input v-model="form.contactName" placeholder="请输入联系人" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="联系电话" prop="contactPhone">
                     <el-input v-model="form.contactPhone" placeholder="请输入联系电话" maxlength="30" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="目录" prop="archiveDir">
                     <el-input v-model="form.archiveDir" placeholder="请输入归档目录" maxlength="500" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" :rows="3" />
                  </el-form-item>
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 领取/归还对话框 -->
      <el-dialog :title="borrowTitle" :model-value="borrowOpen" @update:model-value="borrowOpen = $event" width="500px" append-to-body>
         <el-form ref="borrowRef" :model="borrowForm" label-width="80px">
            <el-form-item v-if="borrowForm.flowType === '领取'" label="担保人" prop="guarantorId" :rules="[{ required: true, message: '请选择担保人', trigger: 'change' }]">
               <el-select v-model="borrowForm.guarantorId" filterable placeholder="请选择担保人" style="width: 100%">
                  <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
               </el-select>
            </el-form-item>
            <el-form-item label="备注">
               <el-input v-model="borrowForm.remark" type="textarea" placeholder="备注（选填）" maxlength="200" :rows="2" />
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitBorrow">确 定</el-button>
               <el-button @click="borrowOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 流转记录对话框 -->
      <el-dialog title="流转记录" :model-value="flowOpen" @update:model-value="flowOpen = $event" width="600px" append-to-body>
         <el-timeline v-if="flowList.length > 0">
            <el-timeline-item v-for="item in flowList" :key="item.id"
               :type="item.flowType === '领取' ? 'primary' : 'success'"
               :timestamp="item.operateTime" placement="top">
               <el-card shadow="never">
                  <p><strong>{{ item.flowType }}</strong> — 操作人：{{ item.userName }}</p>
                  <p v-if="item.guarantorName">担保人：{{ item.guarantorName }}</p>
                  <p v-if="item.remark">备注：{{ item.remark }}</p>
               </el-card>
            </el-timeline-item>
         </el-timeline>
         <el-empty v-else description="暂无流转记录" />
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="flowOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Material">
import { listMaterial, getMaterial, updateMaterial, delMaterial, borrowMaterial, returnMaterial, getFlowList, getMaterialStatusCounts } from "@/api/project/material"
import { listProject } from "@/api/project/project"
import { listUser } from "@/api/system/user"

const { proxy } = getCurrentInstance()

// 字典
const { proj_material_result_type, proj_material_status, proj_material_submit_status } = useDict("proj_material_result_type", "proj_material_status", "proj_material_submit_status")

const materialList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const ids = ref([])
const projectOptions = ref([])
const userOptions = ref([])

// 新增：智能查询面板
const submitTimeRange = ref([])
const statusCounts = ref({})
const advancedVisible = ref(false)

// 领取/归还
const borrowOpen = ref(false)
const borrowTitle = ref("")
const borrowForm = ref({ flowType: "", guarantorId: undefined, remark: "" })
const currentMaterial = ref({})

// 流转记录
const flowOpen = ref(false)
const flowList = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    projectId: undefined,
    contactName: undefined,
    contactPhone: undefined,
    projectCode: undefined,
    projectLocation: undefined,
    resultType: undefined,
    status: undefined,
    submitStatus: undefined,
    submitTimeBegin: undefined,
    submitTimeEnd: undefined
  },
  rules: {}
})

const { queryParams, form, rules } = toRefs(data)

/** 加载下拉选项 */
function loadOptions() {
  listProject({ pageNum: 1, pageSize: 999 }).then(r => { projectOptions.value = r.rows || [] })
  listUser({ pageNum: 1, pageSize: 999 }).then(r => { userOptions.value = r.rows || [] })
}

/** 查询 */
function getList() {
  loading.value = true
  const params = { ...queryParams.value }
  listMaterial(params).then(response => {
    materialList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function cancel() { open.value = false; reset() }

function reset() {
  form.value = {
    id: undefined, projectId: undefined, submitTime: undefined,
    contactName: undefined, contactPhone: undefined,
    resultType: undefined, archiveDir: undefined, remark: undefined
  }
  proxy.resetForm("materialRef")
}

function handleQuery() { queryParams.value.pageNum = 1; getList() }
function resetQuery() {
  submitTimeRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.projectId = undefined
  queryParams.value.contactName = undefined
  queryParams.value.contactPhone = undefined
  queryParams.value.projectCode = undefined
  queryParams.value.projectLocation = undefined
  queryParams.value.resultType = undefined
  queryParams.value.status = undefined
  queryParams.value.submitStatus = undefined
  queryParams.value.submitTimeBegin = undefined
  queryParams.value.submitTimeEnd = undefined
  handleQuery()
}

/** 状态胶囊 computed（字典驱动） */
const statusCapsules = computed(() => {
  const dict = proj_material_status.value || []
  const counts = statusCounts.value || {}
  const total = Object.values(counts).reduce((sum, c) => sum + (Number(c) || 0), 0)
  const items = [{ label: '全部', value: undefined, count: total }]
  dict.forEach(d => {
    items.push({ label: d.label, value: d.value, count: Number(counts[d.value]) || 0 })
  })
  return items
})

/** 加载状态统计 */
function loadStatusCounts() {
  getMaterialStatusCounts().then(response => {
    const data = response.data || []
    const counts = {}
    data.forEach(item => { counts[item.status] = Number(item.cnt) || 0 })
    statusCounts.value = counts
  }).catch(() => {})
}

/** 状态胶囊点击（支持 toggle） */
function handleStatusClick(status) {
  queryParams.value.status = queryParams.value.status === status ? undefined : status
  handleQuery()
}

/** 提交时间变更 */
function onSubmitTimeChange(val) {
  if (val && val.length === 2) {
    queryParams.value.submitTimeBegin = val[0]
    queryParams.value.submitTimeEnd = val[1] + ' 23:59:59'
  } else {
    queryParams.value.submitTimeBegin = undefined
    queryParams.value.submitTimeEnd = undefined
  }
  handleQuery()
}

/** 快捷日期 */
function setQuickDate(type) {
  const now = new Date()
  const fmt = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  let begin, end
  switch (type) {
    case 'today': begin = end = fmt(now); break
    case 'week': {
      const d = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
      const mon = new Date(now.getFullYear(), now.getMonth(), d)
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)
      begin = fmt(mon); end = fmt(sun)
      break
    }
    case 'month':
      begin = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
      end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      break
    case '7days': begin = fmt(new Date(now.getTime() - 6 * 86400000)); end = fmt(now); break
    case '30days': begin = fmt(new Date(now.getTime() - 29 * 86400000)); end = fmt(now); break
  }
  if (begin && end) {
    submitTimeRange.value = [begin, end]
    onSubmitTimeChange([begin, end])
  }
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getMaterial(id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改资料提交"
  })
}

function submitForm() {
  proxy.$refs["materialRef"].validate(valid => {
    if (valid) {
      updateMaterial(form.value).then(() => {
        proxy.$modal.msgSuccess("修改成功")
        open.value = false
        getList()
      })
    }
  })
}

/** 领取/再次领取 */
function handleBorrow(row) {
  currentMaterial.value = row
  borrowForm.value = { flowType: "领取", guarantorId: undefined, remark: "" }
  borrowTitle.value = row.status === "returned" ? "再次领取" : "领取资料"
  borrowOpen.value = true
}

/** 归还 */
function handleReturn(row) {
  currentMaterial.value = row
  borrowForm.value = { flowType: "归还", guarantorId: undefined, remark: "" }
  borrowTitle.value = "归还资料"
  borrowOpen.value = true
}

/** 提交领取/归还 */
function submitBorrow() {
  const id = currentMaterial.value.id
  const data = { remark: borrowForm.value.remark }
  if (borrowForm.value.flowType === "领取") {
    if (!borrowForm.value.guarantorId) {
      proxy.$modal.msgWarning("请选择担保人")
      return
    }
    data.guarantorId = borrowForm.value.guarantorId
    borrowMaterial(id, data).then(() => {
      proxy.$modal.msgSuccess("领取成功")
      borrowOpen.value = false
      getList()
    })
  } else {
    proxy.$modal.confirm("确认归还该资料？").then(() => {
      returnMaterial(id, data).then(() => {
        proxy.$modal.msgSuccess("归还成功")
        borrowOpen.value = false
        getList()
      })
    }).catch(() => {})
  }
}

/** 查看流转记录 */
function handleFlow(row) {
  getFlowList(row.id).then(response => {
    flowList.value = response.data || []
    flowOpen.value = true
  })
}

function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除所选资料提交记录?').then(function() {
    return delMaterial(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function handleExport() {
  proxy.download('/project/material/export', { ...queryParams.value }, `material_${new Date().getTime()}.xlsx`)
}

loadOptions()
getList()
loadStatusCounts()
</script>

<style scoped>
/* ===== 智能查询面板 ===== */
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.search-input-wrapper { flex: 1; }
.global-search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.status-capsule-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.status-capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  background: #f5f5f5;
  color: #666;
  transition: all 0.2s;
  user-select: none;
}
.status-capsule:hover { background: #e8e8e8; }
.status-capsule.active { background: #409eff; color: #fff; }
.capsule-count {
  font-size: 11px;
  background: rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
}
.status-capsule.active .capsule-count { background: rgba(255,255,255,0.25); }

.advanced-toggle-row {
  cursor: pointer;
  color: #909399;
  font-size: 13px;
  padding: 4px 0;
  margin-bottom: 8px;
  user-select: none;
}
.advanced-toggle-row:hover { color: #409eff; }

.advanced-filter-panel {
  border-radius: 10px;
  padding: 10px 20px 12px;
  margin-bottom: 16px;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px 24px;
}
.filter-item-label {
  font-size: 12px;
  margin-bottom: 4px;
}

.quick-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.quick-label { font-size: 12px; color: #888; }
.quick-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.07);
  color: #aaa;
  transition: all 0.2s;
  user-select: none;
}
.quick-chip:hover { background: rgba(64,158,255,0.25); color: #409eff; }
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  user-select: none;
}
.collapse-link:hover { color: #409eff; }
</style>
