<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="任务名称" prop="taskName">
        <el-input v-model="queryParams.taskName" placeholder="请输入任务名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="任务编号" prop="taskCode">
        <el-input v-model="queryParams.taskCode" placeholder="请输入任务编号" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="年份" prop="taskYear">
        <el-input-number v-model="queryParams.taskYear" placeholder="年份" :min="2000" :max="2099" controls-position="right" style="width: 120px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="季度" prop="quarter">
        <el-select v-model="queryParams.quarter" placeholder="季度" clearable style="width: 100px">
          <el-option label="一季度" :value="1" />
          <el-option label="二季度" :value="2" />
          <el-option label="三季度" :value="3" />
          <el-option label="四季度" :value="4" />
        </el-select>
      </el-form-item>
      <!-- <el-form-item label="任务类型" prop="taskType">
        <el-select v-model="queryParams.taskType" placeholder="任务类型" clearable style="width: 140px">
          <el-option label="常规" value="routine" />
          <el-option label="专项" value="special" />
        </el-select>
      </el-form-item> -->
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="任务状态" clearable style="width: 120px">
          <el-option label="草稿" value="draft" />
          <el-option label="待开始" value="pending" />
          <el-option label="进行中" value="ongoing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已归档" value="archived" />
        </el-select>
      </el-form-item>
      <el-form-item label="开始日期">
        <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width: 240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" size="small" plain icon="Plus" @click="handleAdd" v-hasPermi="['land:task:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" size="small" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['land:task:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" size="small" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['land:task:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" size="small" plain icon="Download" @click="handleExport" v-hasPermi="['land:task:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :columns="columns" :size="'small'" />
    </el-row>

    <el-table 
      v-loading="loading" 
      :data="taskList" 
      stripe 
      border 
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="任务编号" align="center" prop="taskCode" :show-overflow-tooltip="true" />
      <el-table-column label="任务名称" align="center" prop="taskName" :show-overflow-tooltip="true">
        <template #default="scope">
          <a class="link-type" style="cursor:pointer" @click="handleView(scope.row)">{{ scope.row.taskName }}</a>
        </template>
      </el-table-column>
      <el-table-column label="年份" align="center" prop="taskYear" min-width="80" />
      <el-table-column label="季度" align="center" min-width="90">
        <template #default="scope">
          <el-tag v-if="scope.row.quarter" size="small" type="info">Q{{ scope.row.quarter }}</el-tag>
        </template>
      </el-table-column>
      <!-- <el-table-column label="任务类型" align="center" min-width="110">
        <template #default="scope">
          <dict-tag :options="task_type" :value="scope.row.taskType" />
        </template>
      </el-table-column> -->
      <el-table-column label="状态" align="center" min-width="100">
        <template #default="scope">
          <dict-tag :options="task_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="图斑数" align="center" prop="parcelCount" min-width="80" />
      <el-table-column label="分派给" align="center" prop="assignedUserName" min-width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.assignedUserName" size="small" type="success">{{ scope.row.assignedUserName }}</el-tag>
          <el-tag v-else size="small" type="info">未分派</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始日期" align="center" prop="startDate" min-width="110">
        <template #default="scope">
          <span>{{ parseTime(scope.row.startDate, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="结束日期" align="center" prop="endDate" min-width="110">
        <template #default="scope">
          <span>{{ parseTime(scope.row.endDate, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" min-width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" min-width="180" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-tooltip content="查看图斑" placement="top">
            <el-button link type="primary" icon="View" @click="handleView(scope.row)"></el-button>
          </el-tooltip>
          <el-tooltip content="分派" placement="top">
            <el-button link type="primary" icon="User" @click="handleAssign(scope.row)" v-hasPermi="['land:task:assign']"></el-button>
          </el-tooltip>
          <el-tooltip content="修改" placement="top">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['land:task:edit']"></el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['land:task:remove']"></el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加或修改对话框 -->
    <el-dialog :title="title" v-model="open" width="650px" append-to-body>
      <el-form :model="form" :rules="rules" ref="taskRef" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="任务名称" prop="taskName">
              <el-input v-model="form.taskName" placeholder="请输入任务名称" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务编号" prop="taskCode">
              <el-input v-model="form.taskCode" placeholder="系统自动或手动" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="年份" prop="taskYear">
              <el-input-number v-model="form.taskYear" :min="2000" :max="2099" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="季度" prop="quarter">
              <el-select v-model="form.quarter" placeholder="请选择" style="width: 100%">
                <el-option label="一季度" :value="1" />
                <el-option label="二季度" :value="2" />
                <el-option label="三季度" :value="3" />
                <el-option label="四季度" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <!-- <el-col :span="12">
            <el-form-item label="任务类型" prop="taskType">
              <el-select v-model="form.taskType" placeholder="请选择" style="width: 100%">
                <el-option label="常规" value="routine" />
                <el-option label="专项" value="special" />
              </el-select>
            </el-form-item>
          </el-col> -->
          <el-col :span="12">
            <el-form-item label="任务状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="待开始" value="pending" />
                <el-option label="进行中" value="ongoing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已归档" value="archived" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择开始日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="选择结束日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
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

    <!-- 分派对话框 -->
    <el-dialog :title="assignTitle" v-model="assignOpen" width="500px" append-to-body>
      <el-form :model="assignForm" ref="assignRef" label-width="100px">
        <el-form-item label="任务名称">
          <span>{{ assignForm.taskName }}</span>
        </el-form-item>
        <el-form-item label="图斑数量">
          <span>{{ assignForm.parcelCount }} 个</span>
        </el-form-item>
        <el-form-item label="分派给" prop="userId">
          <el-select v-model="assignForm.userId" placeholder="请选择外业人员" style="width: 100%">
            <el-option v-for="user in fieldUserList" :key="user.userId" :label="user.nickName" :value="user.userId">
              <span style="float: left">{{ user.nickName }}</span>
              <span style="float: right; color: #8492a6; font-size: 12px">{{ user.dept?.deptName }} | 任务数:{{ user.taskCount || 0 }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="分派说明" prop="remark">
          <el-input v-model="assignForm.remark" type="textarea" placeholder="请输入分派说明（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitAssign">确 定</el-button>
          <el-button @click="cancelAssign">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Task">
import { listTask, getTask, addTask, updateTask, delTask, assignTask } from "@/api/land/task"
import { listUserOptions } from "@/api/system/user"

const router = useRouter()
const { proxy } = getCurrentInstance()
const { task_status, task_type } = useDict("task_status", "task_type")

const taskList = ref([])
const open = ref(false)
const assignOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const assignTitle = ref("")
const dateRange = ref([])
const fieldUserList = ref([])

// 列显隐
const columns = ref([
  { key: 0, label: '任务编号', visible: true },
  { key: 1, label: '任务名称', visible: true },
  { key: 2, label: '年份', visible: true },
  { key: 3, label: '季度', visible: true },
  { key: 4, label: '任务类型', visible: true },
  { key: 5, label: '状态', visible: true },
  { key: 6, label: '图斑数', visible: true },
  { key: 7, label: '分派给', visible: true },
  { key: 8, label: '开始日期', visible: true },
  { key: 9, label: '结束日期', visible: true },
  { key: 10, label: '创建时间', visible: true }
])

const data = reactive({
  form: {},
  assignForm: {
    taskId: undefined,
    taskName: undefined,
    parcelCount: 0,
    userId: undefined,
    remark: undefined
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskName: undefined,
    taskCode: undefined,
    taskYear: undefined,
    quarter: undefined,
    taskType: undefined,
    status: undefined
  },
  rules: {
    taskName: [{ required: true, message: "任务名称不能为空", trigger: "blur" }],
    taskYear: [{ required: true, message: "年份不能为空", trigger: "blur" }],
    quarter: [{ required: true, message: "季度不能为空", trigger: "change" }],
    // taskType: [{ required: true, message: "任务类型不能为空", trigger: "change" }]
  }
})

const { queryParams, form, assignForm, rules } = toRefs(data)

/** 查询列表 */
function getList() {
  loading.value = true
  listTask(proxy.addDateRange(queryParams.value, dateRange.value)).then(res => {
    loading.value = false
    taskList.value = res.rows
    total.value = res.total
  })
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.taskId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 查看 - 跳转图斑列表 */
function handleView(row) {
  router.push({ path: "/land/parcel", query: { taskId: row.taskId, taskName: row.taskName } })
}

/** 新增 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "新增调查任务"
}

/** 修改 */
function handleUpdate(row) {
  reset()
  const taskId = row.taskId || ids.value[0]
  getTask(taskId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改调查任务"
  })
}

/** 删除 */
function handleDelete(row) {
  const taskIds = row.taskId || ids.value
  proxy.$modal.confirm('确认删除所选调查任务吗？任务下的图斑数据不会被删除。').then(function () {
    return delTask(taskIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出 */
function handleExport() {
  proxy.download("land/task/export", {
    ...queryParams.value
  }, `task_${new Date().getTime()}.xlsx`)
}

/** 取消 */
function cancel() {
  open.value = false
  reset()
}

/** 重置表单 */
function reset() {
  form.value = {
    taskId: undefined,
    taskName: undefined,
    taskCode: undefined,
    taskYear: new Date().getFullYear(),
    quarter: undefined,
    taskType: undefined,
    status: "draft",
    startDate: undefined,
    endDate: undefined,
    remark: undefined
  }
  proxy.resetForm("taskRef")
}

/** 获取外业人员列表 */
function getFieldUserList() {
  listUserOptions({ roleKey: 'field' }).then(res => {
    fieldUserList.value = res.rows || []
  })
}

/** 打开分派对话框 */
function handleAssign(row) {
  resetAssign()
  getFieldUserList()
  assignForm.value.taskId = row.taskId
  assignForm.value.taskName = row.taskName
  assignForm.value.parcelCount = row.parcelCount || 0
  assignForm.value.userId = row.assignedUserId || undefined
  assignTitle.value = row.assignedUserId ? "变更分派" : "分派任务"
  assignOpen.value = true
}

/** 提交分派 */
function submitAssign() {
  if (!assignForm.value.userId) {
    proxy.$modal.msgError("请选择外业人员")
    return
  }
  assignTask({
    taskId: assignForm.value.taskId,
    userId: assignForm.value.userId,
    remark: assignForm.value.remark
  }).then(() => {
    proxy.$modal.msgSuccess("分派成功")
    assignOpen.value = false
    getList()
  })
}

/** 取消分派 */
function cancelAssign() {
  assignOpen.value = false
  resetAssign()
}

/** 重置分派表单 */
function resetAssign() {
  assignForm.value = {
    taskId: undefined,
    taskName: undefined,
    parcelCount: 0,
    userId: undefined,
    remark: undefined
  }
}

/** 提交 */
function submitForm() {
  proxy.$refs["taskRef"].validate(valid => {
    if (valid) {
      if (form.value.taskId != undefined) {
        updateTask(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addTask(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

onMounted(() => {
  getList()
})
</script>
