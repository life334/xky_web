<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="工程编号" prop="projectCode">
            <el-input v-model="queryParams.projectCode" placeholder="请输入工程编号" clearable style="width: 180px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="项目名称" prop="projectName">
            <el-input v-model="queryParams.projectName" placeholder="请输入项目名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="项目状态" clearable style="width: 140px">
               <el-option label="进行中" value="进行中" />
               <el-option label="已完成" value="已完成" />
               <el-option label="已暂停" value="已暂停" />
               <el-option label="已取消" value="已取消" />
            </el-select>
         </el-form-item>
         <el-form-item label="创建时间">
            <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width: 240px" />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['project:project:add']">新增</el-button>
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
         <el-table-column width="70" align="center" label="序号">
            <template #header>
               <el-checkbox :model-value="isAllChecked" :indeterminate="isIndeterminate" @change="handleCheckAll" /> 序号
            </template>
            <template #default="scope">
               <el-checkbox :model-value="checkedMap[scope.row.id]" style="margin-right:6px" @change="toggleRow(scope.row)" />
               <span>{{ (queryParams.pageNum - 1) * queryParams.pageSize + scope.$index + 1 }}</span>
            </template>
         </el-table-column>
         <el-table-column label="工程编号" align="center" prop="projectCode" :show-overflow-tooltip="true" min-width="130" />
         <el-table-column label="项目名称" align="center" prop="projectName" :show-overflow-tooltip="true" min-width="150" />
         <el-table-column label="工程项目" align="center" prop="engineeringProject" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="委托单位" align="center" prop="clientUnit" :show-overflow-tooltip="true" min-width="130" />
         <el-table-column label="合同" align="center" prop="contractName" min-width="120">
            <template #default="scope">
               <span v-if="scope.row.contractName">{{ scope.row.contractName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="负责人" align="center" prop="leaderNames" min-width="110">
            <template #default="scope">
               <span v-if="scope.row.leaderNames">{{ scope.row.leaderNames }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="联系人" align="center" prop="contactName" min-width="90">
            <template #default="scope">
               <span v-if="scope.row.contactName">{{ scope.row.contactName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="安排日期" align="center" prop="assignDate" width="110">
            <template #default="scope">
               <span v-if="scope.row.assignDate">{{ parseTime(scope.row.assignDate, '{y}-{m}-{d}') }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="工期要求" align="center" prop="durationRequire" width="100">
            <template #default="scope">
               <span v-if="scope.row.durationRequire != null">{{ scope.row.durationRequire }}天</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="总时长" align="center" prop="totalDuration" width="90">
            <template #default="scope">
               <span v-if="scope.row.totalDuration != null">{{ scope.row.totalDuration }}天</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="状态" align="center" prop="status" min-width="90">
            <template #default="scope">
               <el-tag v-if="scope.row.status === '进行中'" type="primary">{{ scope.row.status }}</el-tag>
               <el-tag v-else-if="scope.row.status === '已完成'" type="success">{{ scope.row.status }}</el-tag>
               <el-tag v-else-if="scope.row.status === '已暂停'" type="warning">{{ scope.row.status }}</el-tag>
               <el-tag v-else-if="scope.row.status === '已取消'" type="danger">{{ scope.row.status }}</el-tag>
               <el-tag v-else type="info">{{ scope.row.status || '—' }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" min-width="150" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleView(scope.row)">详情</el-button>
               <el-button link type="success" @click="handleTaskList(scope.row)">作业清单</el-button>
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:project:edit']">修改</el-button>
               <el-button link type="primary" @click="handleDelete(scope.row)" v-hasPermi="['project:project:remove']">删除</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改项目对话框 -->
      <el-dialog :title="title" v-model="open" width="80%" append-to-body>
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
                     <el-input-number v-model="form.contractId" placeholder="合同ID（选填）" controls-position="right" :min="1" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="状态" prop="status">
                     <el-select v-model="form.status" placeholder="项目状态" style="width: 100%">
                        <el-option label="进行中" value="进行中" />
                        <el-option label="已完成" value="已完成" />
                        <el-option label="已暂停" value="已暂停" />
                        <el-option label="已取消" value="已取消" />
                     </el-select>
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
      <el-dialog :title="'项目详情 — ' + detail.projectCode" v-model="detailOpen" width="750px" append-to-body>
         <el-descriptions :column="2" border>
            <el-descriptions-item label="工程编号" :span="1">{{ detail.projectCode }}</el-descriptions-item>
            <el-descriptions-item label="项目名称" :span="1">{{ detail.projectName }}</el-descriptions-item>
            <el-descriptions-item label="项目类别">{{ detail.categoryName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="工程项目">{{ detail.engineeringProject || '—' }}</el-descriptions-item>
            <el-descriptions-item label="委托单位">{{ detail.clientUnit || '—' }}</el-descriptions-item>
            <el-descriptions-item label="工程地点">{{ detail.projectLocation || '—' }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contactName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.contactPhone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合同">{{ detail.contractName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
               <el-tag v-if="detail.status === '进行中'" type="primary">{{ detail.status }}</el-tag>
               <el-tag v-else-if="detail.status === '已完成'" type="success">{{ detail.status }}</el-tag>
               <el-tag v-else-if="detail.status === '已暂停'" type="warning">{{ detail.status }}</el-tag>
               <el-tag v-else-if="detail.status === '已取消'" type="danger">{{ detail.status }}</el-tag>
               <el-tag v-else type="info">{{ detail.status || '—' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="负责人" :span="2">{{ detail.leaderNames || '—' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建者">{{ detail.createBy || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="修改者">{{ detail.updateBy || '—' }}</el-descriptions-item>
            <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
         </el-descriptions>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="detailOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 作业清单对话框 -->
      <el-dialog :title="'作业清单 — ' + currentProjectName" v-model="taskListOpen" width="900px" append-to-body>
         <el-table v-loading="taskLoading" :data="taskListData" stripe border max-height="500">
            <el-table-column label="任务名称" align="center" prop="taskName" :show-overflow-tooltip="true" min-width="160" />
            <el-table-column label="执行人" align="center" prop="userName" min-width="100">
               <template #default="scope">
                  <span v-if="scope.row.userName">{{ scope.row.userName }}</span>
                  <span v-else style="color: #c0c4cc">—</span>
               </template>
            </el-table-column>
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
                  <el-tag v-if="scope.row.status === '待开始'" type="info">{{ scope.row.status }}</el-tag>
                  <el-tag v-else-if="scope.row.status === '进行中'" type="primary">{{ scope.row.status }}</el-tag>
                  <el-tag v-else-if="scope.row.status === '已完成'" type="success">{{ scope.row.status }}</el-tag>
                  <el-tag v-else-if="scope.row.status === '已暂停'" type="warning">{{ scope.row.status }}</el-tag>
                  <el-tag v-else type="info">{{ scope.row.status || '—' }}</el-tag>
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
   </div>
</template>

<script setup name="Project">
import { listProject, getProject, addProject, updateProject, delProject } from "@/api/project/project"
import { categoryTreeselect } from "@/api/project/category"
import { listUser } from "@/api/system/user"
import { listTask } from "@/api/project/task"

const { proxy } = getCurrentInstance()

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
const detail = ref({})
const ids = ref([])
const dateRange = ref([])
const taskListOpen = ref(false)
const taskLoading = ref(false)
const taskListData = ref([])

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
const currentProjectName = ref("")

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
    status: "进行中",
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
    // 确保 leaderIds 是数组
    if (!form.value.leaderIds) {
      form.value.leaderIds = []
    }
    open.value = true
    title.value = "修改项目"
  })
}

/** 查看详情 */
function handleView(row) {
  getProject(row.id).then(response => {
    detail.value = response.data
    detailOpen.value = true
  })
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
