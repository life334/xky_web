<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="任务名称" prop="taskName">
            <el-input v-model="queryParams.taskName" placeholder="请输入任务名称" clearable style="width: 180px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="queryParams.projectId" placeholder="请选择项目" clearable filterable style="width: 200px">
               <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
            </el-select>
         </el-form-item>
         <el-form-item label="执行人" prop="userId">
            <el-select v-model="queryParams.userId" placeholder="请选择执行人" clearable filterable style="width: 180px">
               <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
            </el-select>
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="任务状态" clearable style="width: 140px">
               <el-option v-for="dict in proj_task_status" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['project:task:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:task:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:task:export']">导出</el-button>
         </el-col>
         <!-- <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar> -->
         <el-col :span="6" style="display: flex; align-items: center; justify-content: flex-end; ">
            <el-radio-group v-model="viewMode" size="small" @change="handleViewModeChange">
               <el-radio-button value="flat">平铺视图</el-radio-button>
               <el-radio-button value="byProject">按项目查看</el-radio-button>
               <el-radio-button value="byUser">按人查看</el-radio-button>
            </el-radio-group>
         </el-col>
      </el-row>

      <el-table 
         v-loading="loading" 
         :data="displayTaskList" 
         stripe 
         border
         row-key="id"
         :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
         :default-expand-all="viewMode !== 'flat'"
         @selection-change="handleSelectionChange"
      >
         <el-table-column type="selection" width="50" align="center" v-if="viewMode === 'flat'" />
         <el-table-column label="任务名称" align="center" prop="taskName" :show-overflow-tooltip="true" min-width="160" />
         <el-table-column v-if="viewMode !== 'byProject'" label="所属项目" align="center" prop="projectName" min-width="180">
            <template #default="scope">
               <span v-if="scope.row.projectName">{{ scope.row.projectName }}</span>
               <span v-else style="color: #c0c4cc">-</span>
            </template>
         </el-table-column>
         <el-table-column v-if="viewMode !== 'byUser'" label="执行人" align="center" prop="userName" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.userName">{{ scope.row.userName }}</span>
               <span v-else style="color: #c0c4cc">-</span>
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
               <span v-else style="color: #c0c4cc">-</span>
            </template>
         </el-table-column>
         <el-table-column label="工期要求" align="center" prop="durationRequire" min-width="100" />
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
         <el-table-column label="操作" align="center" width="220" class-name="small-padding fixed-width">
            <template #default="scope">
               <template v-if="!isGroupRow(scope.row)">
                  <el-button link type="primary" icon="View" @click="handleView(scope.row)">详情</el-button>
                  <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['project:task:edit']">修改</el-button>
                  <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['project:task:remove']">删除</el-button>
               </template>
               <span v-else style="color: #c0c4cc">-</span>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改任务对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="650px" append-to-body>
         <el-form ref="taskRef" :model="form" :rules="rules" label-width="100px">
            <el-row>
               <el-col :span="12">
                  <el-form-item label="所属项目" prop="projectId">
                     <el-select v-model="form.projectId" filterable placeholder="请选择项目" style="width: 100%">
                        <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="执行人" prop="userIds">
                     <el-select v-model="form.userIds" multiple filterable placeholder="请选择执行人（可多选）" style="width: 100%">
                        <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row>
               <el-col :span="24">
                  <el-form-item label="任务名称" prop="taskName">
                     <el-input v-model="form.taskName" placeholder="请输入任务名称" maxlength="200" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row>
               <el-col :span="12">
                  <el-form-item label="安排日期" prop="assignDate">
                     <el-date-picker v-model="form.assignDate" type="date" placeholder="请选择安排日期" value-format="YYYY-MM-DD" style="width: 100%" @change="calcDuration" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="要求完成" prop="requiredFinishDate">
                     <el-date-picker v-model="form.requiredFinishDate" type="date" placeholder="计划截止日期" value-format="YYYY-MM-DD" style="width: 100%" @change="calcDuration" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row>
               <el-col :span="12">
                  <el-form-item label="实际完成" prop="actualFinishDate">
                     <el-date-picker v-model="form.actualFinishDate" type="date" placeholder="实际完成日期" value-format="YYYY-MM-DD" style="width: 100%" @change="calcDuration" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="工期要求">
                     <el-input v-model="form.durationRequire" placeholder="自动计算" disabled>
                        <template #suffix><span style="color:#909399">天</span></template>
                     </el-input>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row>
               <el-col :span="12">
                  <el-form-item label="总时长(天)">
                     <el-input-number v-model="form.totalDuration" :min="0" controls-position="right" style="width: 100%" disabled />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="状态" prop="status">
                     <el-select v-model="form.status" placeholder="任务状态" style="width: 100%">
                        <el-option v-for="dict in proj_task_status" :key="dict.value" :label="dict.label" :value="dict.value" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row>
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

      <!-- 任务详情对话框 -->
      <el-dialog :title="'任务详情 - ' + detail.taskName" :model-value="detailOpen" @update:model-value="detailOpen = $event" width="650px" append-to-body>
         <el-descriptions :column="2" border>
            <el-descriptions-item label="任务名称" :span="2">{{ detail.taskName }}</el-descriptions-item>
            <el-descriptions-item label="所属项目">{{ detail.projectName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="执行人">{{ detail.userName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="安排日期">{{ parseTime(detail.assignDate, '{y}-{m}-{d}') }}</el-descriptions-item>
            <el-descriptions-item label="要求完成">{{ parseTime(detail.requiredFinishDate, '{y}-{m}-{d}') }}</el-descriptions-item>
            <el-descriptions-item label="实际完成">{{ detail.actualFinishDate ? parseTime(detail.actualFinishDate, '{y}-{m}-{d}') : '-' }}</el-descriptions-item>
            <el-descriptions-item label="工期要求">{{ detail.durationRequire || '-' }}</el-descriptions-item>
            <el-descriptions-item label="总时长(天)">{{ detail.totalDuration != null ? detail.totalDuration : '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
               <dict-tag :options="proj_task_status" :value="detail.status" />
            </el-descriptions-item>
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
   </div>
</template>

<script setup name="Task">
import { listTask, getTask, addTask, updateTask, delTask } from "@/api/project/task"
import { listProject } from "@/api/project/project"
import { listUserOptions } from "@/api/system/user"

const { proxy } = getCurrentInstance()
const { proj_task_status } = useDict("proj_task_status")

const taskList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const projectOptions = ref([])
const userOptions = ref([])
const detail = ref({})
const ids = ref([])
const viewMode = ref("flat")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskName: undefined,
    projectId: undefined,
    userId: undefined,
    status: undefined
  },
  rules: {
    taskName: [],
    projectId: [{ required: true, message: "请选择项目", trigger: "change" }],
    userIds: [{ required: true, message: "请选择执行人", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 树形展示数据 */
const displayTaskList = computed(() => {
  if (viewMode.value === "flat") return taskList.value
  const list = taskList.value
  const groups = {}
  const groupKey = viewMode.value === "byProject" ? "projectName" : "userName"
  const groupLabel = viewMode.value === "byProject"
    ? (p) => p || "未关联项目"
    : (u) => u || "未分配人员"

  list.forEach((item, idx) => {
    const key = item[groupKey] || "__empty__"
    if (!groups[key]) {
      groups[key] = {
        id: "grp_" + key + "_" + idx,
        label: groupLabel(item[groupKey]),
        count: 0,
        children: []
      }
    }
    groups[key].count++
    groups[key].children.push({ ...item })
  })
  return Object.values(groups).map(g => ({
    id: g.id,
    taskName: g.label + "（" + g.count + " 个任务）",
    children: g.children,
    hasChildren: true
  }))
})

/** 判断是否为分组行（虚拟父节点） */
function isGroupRow(row) {
  return row.id && typeof row.id === 'string' && row.id.startsWith('grp_')
}

/** 切换视图模式 */
function handleViewModeChange() {
  // 切换模式时重置选中
  ids.value = []
}

/** 查询任务列表 */
function getList() {
  loading.value = true
  listTask(queryParams.value).then(response => {
    taskList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 加载项目列表 */
function loadProjectList() {
  listProject({ pageNum: 1, pageSize: 1000 }).then(response => {
    projectOptions.value = response.rows || []
  })
}

/** 加载用户列表 */
function loadUserList() {
  listUserOptions({ pageNum: 1, pageSize: 1000 }).then(response => {
    userOptions.value = response.rows || []
  })
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
    projectId: undefined,
    userIds: [],
    taskName: undefined,
    assignDate: undefined,
    requiredFinishDate: undefined,
    actualFinishDate: undefined,
    durationRequire: undefined,
    totalDuration: undefined,
    status: "pending",
    remark: undefined
  }
  proxy.resetForm("taskRef")
}

/** 根据日期自动计算工期和总时长 */
function calcDuration() {
  // 工期要求 = 要求完成日期 - 安排日期
  if (form.value.assignDate && form.value.requiredFinishDate) {
    const days = dayDiff(form.value.assignDate, form.value.requiredFinishDate)
    form.value.durationRequire = days + ' 天'
  } else {
    form.value.durationRequire = undefined
  }
  // 总时长 = 实际完成日期 - 安排日期
  if (form.value.assignDate && form.value.actualFinishDate) {
    form.value.totalDuration = dayDiff(form.value.assignDate, form.value.actualFinishDate)
  } else {
    form.value.totalDuration = undefined
  }
}

/** 计算两个日期之间的天数差 */
function dayDiff(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24))
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  loadProjectList()
  loadUserList()
  open.value = true
  title.value = "新增任务"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  loadProjectList()
  loadUserList()
  const id = row.id || ids.value[0]
  getTask(id).then(response => {
    form.value = response.data
    // 编辑时 userId 转 userIds 数组
    form.value.userIds = form.value.userId ? [form.value.userId] : []
    // 编辑时 durationRequire 去掉 " 天" 后缀回显
    if (form.value.durationRequire) {
      // 保持原值即可，后端返回的就是字符串
    }
    open.value = true
    title.value = "修改任务"
  })
}

/** 查看详情 */
function handleView(row) {
  getTask(row.id).then(response => {
    detail.value = response.data
    detailOpen.value = true
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["taskRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateTask(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addTask(form.value).then(response => {
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
  const name = row.id ? row.taskName : "所选任务"
  proxy.$modal.confirm('是否确认删除"' + name + '"?').then(function() {
    return delTask(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('/project/task/export', {
    ...queryParams.value
  }, `task_${new Date().getTime()}.xlsx`)
}

getList()
</script>
