<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px" class="compact-search">
         <el-form-item label="工程编号" prop="projectCode">
            <el-input v-model="queryParams.projectCode" placeholder="请输入工程编号" clearable style="width: 150px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="项目名称" prop="projectName">
            <el-input v-model="queryParams.projectName" placeholder="请输入项目名称" clearable style="width: 160px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="项目状态" clearable style="width: 120px">
               <el-option v-for="dict in (proj_project_status || [])" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
         </el-form-item>
         <el-form-item label="创建时间">
            <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width: 210px" />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="6" class="mb8 compact-ops">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['project:project:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="info" plain icon="Upload"  @click="handleImport" v-hasPermi="['project:project:import']">导入</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="info" plain icon="DocumentCopy" @click="handlePaste" v-hasPermi="['project:project:add']">粘贴</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['project:project:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:project:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:project:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table ref="tableRef" v-loading="loading" :data="projectList" stripe border @selection-change="handleSelectionChange">
         <el-table-column min-width="70" align="center" label="序号">
            <template #header>
               <el-checkbox :model-value="isAllChecked" :indeterminate="isIndeterminate" @change="handleCheckAll" /> 序号
            </template>
            <template #default="scope">
               <el-checkbox :model-value="checkedMap[scope.row.id]" style="margin-right:6px" @change="toggleRow(scope.row)" />
               <span>{{ (queryParams.pageNum - 1) * queryParams.pageSize + scope.$index + 1 }}</span>
            </template>
         </el-table-column>
         <el-table-column label="工程编号" align="center" prop="projectCode" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="委托单位" align="center" prop="clientUnit"  min-width="180" />
         <el-table-column label="联系人" align="center" prop="contactName" min-width="90" />
         <el-table-column label="联系电话" align="center" prop="contactPhone"  :show-overflow-tooltip="true" min-width="120" />
          <el-table-column label="工程项目" align="center" prop="engineeringProject" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="工程地点" align="center" prop="projectLocation" min-width="180" />
         <el-table-column label="状态" align="center" prop="status" min-width="90">
            <template #default="scope">
               <dict-tag :options="proj_project_status" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="项目名称" align="center" prop="projectName" :show-overflow-tooltip="true" min-width="150" />
         
         <el-table-column label="合同" align="center" prop="contractName" min-width="100" />
         <el-table-column label="负责人" align="center" prop="leaderNames" min-width="110" />
         <el-table-column label="安排日期" align="center" prop="assignDate" width="110">
            <template #default="scope">
               <span v-if="scope.row.assignDate">{{ parseTime(scope.row.assignDate, '{y}-{m}-{d}') }}</span>
            </template>
         </el-table-column>
         <el-table-column label="工期要求" align="center" prop="durationRequire" width="100">
            <template #default="scope">
               <span v-if="scope.row.durationRequire != null">{{ scope.row.durationRequire }}天</span>
            </template>
         </el-table-column>
         <el-table-column label="总时长" align="center" prop="totalDuration" width="90">
            <template #default="scope">
               <span v-if="scope.row.totalDuration != null">{{ scope.row.totalDuration }}天</span>
            </template>
         </el-table-column>
         
         <el-table-column label="操作" align="center" min-width="120" class-name="small-padding fixed-width" fixed="right">
            <template #default="scope">
               <el-button link type="primary" size="small" @click="handleView(scope.row)">详情</el-button>
               <el-button link type="primary" size="small" @click="handleUpdate(scope.row)" v-hasPermi="['project:project:edit']">修改</el-button>
               <el-button link size="small" type="primary" v-if="scope.row.status !== 'closed'" v-hasPermi="['project:project:complete']" @click="handleComplete(scope.row)">办结</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改项目对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-form ref="projectRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="工程编号" prop="projectCode">
                     <el-input v-model="form.projectCode" placeholder="请输入工程编号" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="项目名称" prop="projectName">
                     <el-input v-model="form.projectName" placeholder="请输入项目名称" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="项目类别" prop="projectCategoryId">
                     <el-tree-select
                        v-model="form.projectCategoryId"
                        :data="categoryOptions"
                        :props="{ value: 'id', label: 'label', children: 'children' }"
                        value-key="id"
                        placeholder="请选择项目类别（小类）"
                        check-strictly
                        :filter-node-method="filterCategoryNode"
                        style="width: 100%"
                     />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="工程项目" prop="engineeringProject">
                     <el-input v-model="form.engineeringProject" placeholder="请输入工程项目名称" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="委托单位" prop="clientUnit">
                     <el-input v-model="form.clientUnit" placeholder="请输入委托单位" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="工程地点" prop="projectLocation">
                     <el-input v-model="form.projectLocation" placeholder="请输入工程地点" maxlength="300" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="联系人" prop="contactName">
                     <el-input v-model="form.contactName" placeholder="请输入联系人" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="联系电话" prop="contactPhone">
                     <el-input v-model="form.contactPhone" placeholder="请输入联系电话" maxlength="30" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="负责人" prop="leaderIds">
                     <el-select v-model="form.leaderIds" multiple filterable placeholder="请选择项目负责人" style="width: 100%">
                        <el-option
                           v-for="user in userOptions"
                           :key="user.userId"
                           :label="user.nickName"
                           :value="user.userId"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="合同" prop="contractId">
                     <el-select
                        v-model="form.contractId"
                        filterable
                        remote
                        reserve-keyword
                        placeholder="输入合同名称/编号搜索"
                        :remote-method="searchContracts"
                        :loading="contractLoading"
                        clearable
                        style="width: 100%"
                        @visible-change="onContractVisibleChange"
                     >
                        <el-option
                           v-for="item in contractOptions"
                           :key="item.id"
                           :label="item.contractNo + ' — ' + item.contractName"
                           :value="item.id"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="状态" v-if="form.id">
                     <dict-tag :options="proj_project_status" :value="form.status" />
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

      <!-- 项目详情对话框 -->
      <el-dialog :title="'项目详情 — ' + detail.projectCode" :model-value="detailOpen" @update:model-value="detailOpen = $event" width="750px" append-to-body>
         <el-descriptions :column="2" border>
            <el-descriptions-item label="工程编号" :span="1">{{ detail.projectCode }}</el-descriptions-item>
            <el-descriptions-item label="项目名称" :span="1">{{ detail.projectName }}</el-descriptions-item>
            <el-descriptions-item label="项目类别">{{ detail.categoryName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工程项目">{{ detail.engineeringProject || '-' }}</el-descriptions-item>
            <el-descriptions-item label="委托单位">{{ detail.clientUnit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工程地点">{{ detail.projectLocation || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contactName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.contactPhone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合同">{{ detail.contractName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
               <dict-tag :options="proj_project_status" :value="detail.status" />
            </el-descriptions-item>
            <el-descriptions-item label="负责人" :span="2">{{ detail.leaderNames || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建者">{{ detail.createBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="修改者">{{ detail.updateBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
         </el-descriptions>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="detailOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 作业清单对话框 -->
      <el-dialog :title="'作业清单 — ' + currentProjectName" :model-value="taskListOpen" @update:model-value="taskListOpen = $event" width="900px" append-to-body>
         <el-table v-loading="taskLoading" :data="taskListData" stripe border max-height="500">
            <el-table-column label="任务名称" align="center" prop="taskName" :show-overflow-tooltip="true" min-width="160" />
            <el-table-column label="执行人" align="center" prop="userName" min-width="100" />
            <el-table-column label="安排日期" align="center" prop="assignDate" width="120">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.assignDate, '{y}-{m}-{d}') }}</span>
               </template>
            </el-table-column>
            <el-table-column label="要求完成" align="center" prop="requiredFinishDate" width="120">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.requiredFinishDate, '{y}-{m}-{d}') }}</span>
               </template>
            </el-table-column>
            <el-table-column label="实际完成" align="center" prop="actualFinishDate" width="120">
               <template #default="scope">
                  <span v-if="scope.row.actualFinishDate">{{ parseTime(scope.row.actualFinishDate, '{y}-{m}-{d}') }}</span>
                  <span v-else style="color: #c0c4cc">—</span>
               </template>
            </el-table-column>
            <el-table-column label="工期要求" align="center" prop="durationRequire" min-width="120" />
            <el-table-column label="总时长(天)" align="center" prop="totalDuration" width="100" />
            <el-table-column label="状态" align="center" prop="status" width="100">
               <template #default="scope">
                  <dict-tag :options="proj_task_status" :value="scope.row.status" />
               </template>
            </el-table-column>
            <el-table-column label="创建时间" align="center" prop="createTime" width="170">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.createTime) }}</span>
               </template>
            </el-table-column>
         </el-table>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="taskListOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 状态变更对话框 -->
      <el-dialog title="变更项目状态" :model-value="statusOpen" @update:model-value="statusOpen = $event" width="420px" append-to-body>
         <el-form label-width="80px">
            <el-form-item label="项目名称">
               <span>{{ currentRow.projectName }}</span>
            </el-form-item>
            <el-form-item label="当前状态">
               <dict-tag :options="proj_project_status" :value="currentRow.status" />
            </el-form-item>
            <el-form-item label="变更为">
               <el-select v-model="targetStatus" placeholder="请选择目标状态" style="width: 100%">
                  <el-option v-for="s in allowedStatuses" :key="s.value" :label="s.label" :value="s.value" />
               </el-select>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitStatusChange">确 定</el-button>
               <el-button @click="statusOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 区域粘贴对话框 -->
      <el-dialog title="区域粘贴录入" :model-value="pasteOpen" @update:model-value="pasteOpen = $event" width="950px" append-to-body>
         <el-alert type="info" :closable="false" style="margin-bottom: 12px">
            从 Excel 中选中一块区域（Ctrl+C），然后在此处粘贴（Ctrl+V）。点击「解析数据」后可调整列映射。
         </el-alert>
         <el-input
            v-model="pasteText"
            type="textarea"
            :rows="6"
            placeholder="工程编号(Tab)项目名称(Tab)工程项目(Tab)项目类别(Tab)委托单位(Tab)联系人(Tab)联系电话(Tab)工程地点(Tab)负责人(Tab)备注&#10;从 Excel 复制后粘贴到此处..."
         />
         <div style="margin-top: 10px; text-align: right;">
            <el-button type="primary" @click="parsePasteData">解析数据</el-button>
            <el-button @click="pasteText = ''; pasteRows = []; pasteHeaders = []">清空</el-button>
         </div>
         <el-table v-if="pasteRows.length > 0" :data="pasteRows" border stripe max-height="300" style="margin-top: 12px">
            <el-table-column v-for="(header, index) in pasteHeaders" :key="index" :min-width="120" align="center">
               <template #header>
                  <el-select v-model="header.field" size="small" style="width: 130px" placeholder="选择字段">
                     <el-option v-for="opt in fieldOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
               </template>
               <template #default="scope">
                  {{ scope.row[index] }}
               </template>
            </el-table-column>
         </el-table>
         <template #footer>
            <div class="dialog-footer">
               <span v-if="pasteRows.length > 0" style="float: left; color: #909399; line-height: 32px;">共解析到 {{ pasteRows.length }} 行数据</span>
               <el-button type="primary" :disabled="pasteRows.length === 0" @click="submitPasteData">确认导入</el-button>
               <el-button @click="pasteOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- Excel导入对话框 -->
      <excel-import-dialog ref="importRef" title="项目导入" action="/project/project/importData" template-action="/project/project/importTemplate" template-file-name="project_template" update-support-label="是否更新已存在的项目数据" @success="getList" />
   </div>
</template>

<script setup name="Project">
import { listProject, getProject, addProject, updateProject, delProject, completeProject, changeProjectStatus, batchAddProject } from "@/api/project/project"
import { categoryTreeselect } from "@/api/project/category"
import { listUser } from "@/api/system/user"
import { listTask } from "@/api/project/task"
import { listContract } from "@/api/project/contract"
import ExcelImportDialog from "@/components/ExcelImportDialog"

const { proxy } = getCurrentInstance()
const { proj_project_status, proj_task_status } = useDict("proj_project_status", "proj_task_status")

const projectList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const tableRef = ref(null)
const categoryOptions = ref([])
const userOptions = ref([])
const contractOptions = ref([])
const contractLoading = ref(false)
const detail = ref({})
const ids = ref([])
const dateRange = ref([])
const taskListOpen = ref(false)
const taskLoading = ref(false)
const taskListData = ref([])
const currentProjectName = ref("")

// 状态变更
const statusOpen = ref(false)
const currentRow = ref({})
const targetStatus = ref("")
const STATUS_FLOW = {
   "ongoing": ["closed"],
   "closed": ["archived"],
   "archived": [],
}
const allowedStatuses = computed(() => {
   const flow = STATUS_FLOW[currentRow.value.status] || []
   return flow.map(s => {
      const dict = (proj_project_status.value || []).find(d => d.value === s)
      return { label: dict ? dict.label : s, value: s }
   })
})

// 区域粘贴
const pasteOpen = ref(false)
const pasteText = ref("")
const pasteRows = ref([])
const pasteHeaders = ref([])
const fieldOptions = [
   { label: "工程编号", value: "projectCode" },
   { label: "项目名称", value: "projectName" },
   { label: "工程项目", value: "engineeringProject" },
   { label: "项目类别", value: "categoryName" },
   { label: "委托单位", value: "clientUnit" },
   { label: "联系人", value: "contactName" },
   { label: "联系电话", value: "contactPhone" },
   { label: "工程地点", value: "projectLocation" },
   { label: "负责人", value: "leaderNames" },
   { label: "备注", value: "remark" },
]

// 基于 ids 计算当前页选中状态
const checkedMap = computed(() => {
  const map = {}
  ids.value.forEach(id => { map[id] = true })
  return map
})
const isAllChecked = computed(() => {
  return projectList.value.length > 0 && projectList.value.every(row => ids.value.includes(row.id))
})
const isIndeterminate = computed(() => {
  const len = projectList.value.filter(row => ids.value.includes(row.id)).length
  return len > 0 && len < projectList.value.length
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    projectCode: undefined,
    projectName: undefined,
    status: undefined
  },
  rules: {
    projectCode: [{ required: true, message: "工程编号不能为空", trigger: "blur" }],
    projectName: [{ required: true, message: "项目名称不能为空", trigger: "blur" }],
    projectCategoryId: [{ required: true, message: "请选择项目类别", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 模糊搜索合同 */
function searchContracts(query) {
  contractLoading.value = true
  const params = { pageNum: 1, pageSize: 50 }
  if (query) {
    params.contractNo = query
    params.contractName = query
  }
  listContract(params).then(response => {
    contractOptions.value = response.rows || []
    contractLoading.value = false
  }).catch(() => { contractLoading.value = false })
}

/** 下拉框展开时加载合同列表 */
function onContractVisibleChange(visible) {
  if (visible && contractOptions.value.length === 0) {
    searchContracts("")
  }
}

/** 查询项目列表 */
function getList() {
  loading.value = true
  proxy.addDateRange(queryParams.value, dateRange.value)
  listProject(queryParams.value).then(response => {
    projectList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 加载类别树 */
function loadCategoryTree() {
  categoryTreeselect().then(response => {
    categoryOptions.value = response.data
  })
}

/** 加载用户列表 */
function loadUserList() {
  listUser({ pageNum: 1, pageSize: 1000 }).then(response => {
    userOptions.value = response.rows || []
  })
}

/** 类别树节点过滤（只展示小类可选，大类不可选） */
function filterCategoryNode(value, data) {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    id: undefined,
    projectCode: undefined,
    projectName: undefined,
    engineeringProject: undefined,
    projectCategoryId: undefined,
    clientUnit: undefined,
    contactName: undefined,
    contactPhone: undefined,
    projectLocation: undefined,
    contractId: undefined,
    status: "ongoing",
    leaderIds: [],
    remark: undefined
  }
  proxy.resetForm("projectRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 全选切换 */
function handleCheckAll(checked) {
  projectList.value.forEach(row => {
    tableRef.value?.toggleRowSelection(row, checked)
  })
}

/** 单行选中切换 */
function toggleRow(row) {
  tableRef.value?.toggleRowSelection(row)
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  loadCategoryTree()
  loadUserList()
  open.value = true
  title.value = "新增项目"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  loadCategoryTree()
  loadUserList()
  const id = row.id || ids.value[0]
  getProject(id).then(response => {
    form.value = response.data
    if (!form.value.leaderIds) {
      form.value.leaderIds = []
    }
    // 预加载合同选项，确保已选合同能回显名称
    if (form.value.contractId) {
      searchContracts("")
    }
    open.value = true
    title.value = "修改项目"
  })
}

/** 查看详情（跳转项目工作台） */
function handleView(row) {
  proxy.$router.push('/project/project-detail/index/' + row.id)
}

/** 查看作业清单 */
function handleTaskList(row) {
  currentProjectName.value = row.projectName
  taskListOpen.value = true
  taskLoading.value = true
  listTask({ projectId: row.id, pageNum: 1, pageSize: 1000 }).then(response => {
    taskListData.value = response.rows || []
    taskLoading.value = false
  })
}

/** 办结按钮操作 */
function handleComplete(row) {
  proxy.$modal.confirm('确认将项目"' + row.projectName + '"设为已办结吗？办结后不可撤销，该项目将出现在费用结算页面。').then(function() {
    return completeProject(row.id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("办结成功")
  }).catch(() => {})
}

/** 状态变更 */
function handleStatusChange(row) {
   currentRow.value = row
   targetStatus.value = ""
   statusOpen.value = true
}

/** 提交状态变更 */
function submitStatusChange() {
   if (!targetStatus.value) {
      proxy.$modal.msgError("请选择目标状态")
      return
   }
   changeProjectStatus(currentRow.value.id, targetStatus.value).then(() => {
      proxy.$modal.msgSuccess("状态变更成功")
      statusOpen.value = false
      getList()
   })
}

/** 导入按钮 */
function handleImport() {
   proxy.$refs["importRef"].open()
}

/** 区域粘贴按钮 */
function handlePaste() {
   pasteText.value = ""
   pasteRows.value = []
   pasteHeaders.value = []
   pasteOpen.value = true
}

/** 解析粘贴数据 */
function parsePasteData() {
   if (!pasteText.value || !pasteText.value.trim()) {
      proxy.$modal.msgError("请先粘贴数据")
      return
   }
   const lines = pasteText.value.trim().split(/\n/).filter(l => l.trim())
   if (lines.length === 0) {
      proxy.$modal.msgError("没有有效数据")
      return
   }
   const rows = lines.map(line => line.split(/\t/))
   const headerKeywords = ["工程编号", "项目名称", "工程项目", "项目类别", "委托单位", "联系人", "联系电话", "工程地点", "负责人", "备注"]
   const firstRowIsHeader = rows[0].some(cell => headerKeywords.some(kw => cell.includes(kw)))
   const dataRows = firstRowIsHeader ? rows.slice(1) : rows
   pasteRows.value = dataRows
   const numCols = dataRows[0]?.length || 0
   pasteHeaders.value = []
   for (let i = 0; i < numCols; i++) {
      pasteHeaders.value.push({ field: fieldOptions[i]?.value || "", label: "第" + (i + 1) + "列" })
   }
}

/** 提交粘贴数据 */
function submitPasteData() {
   const projects = pasteRows.value.map(row => {
      const project = {}
      pasteHeaders.value.forEach((header, index) => {
         if (header.field && row[index] !== undefined) {
            project[header.field] = row[index].trim()
         }
      })
      return project
   }).filter(p => p.projectCode)
   if (projects.length === 0) {
      proxy.$modal.msgError("没有有效数据（工程编号不能为空）")
      return
   }
   batchAddProject(projects).then(response => {
      proxy.$modal.msgSuccess(response.msg)
      pasteOpen.value = false
      pasteText.value = ""
      pasteRows.value = []
      pasteHeaders.value = []
      getList()
   })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["projectRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateProject(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addProject(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  const name = row.id ? row.projectName : "所选项目"
  proxy.$modal.confirm('是否确认删除"' + name + '"?').then(function() {
    return delProject(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('/project/project/export', {
    ...queryParams.value
  }, `project_${new Date().getTime()}.xlsx`)
}

getList()
</script>

<style scoped>
/* 搜索区紧凑化 */
.compact-search :deep(.el-form-item) {
  margin-bottom: 6px;
}
.compact-search :deep(.el-form-item__label) {
  font-size: 13px;
}
.compact-search :deep(.el-input__inner),
.compact-search :deep(.el-select .el-input__inner) {
  font-size: 13px;
}
/* 操作栏紧凑化 */
.compact-ops {
  margin-bottom: 6px !important;
}
</style>
