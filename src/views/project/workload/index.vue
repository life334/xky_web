<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="queryParams.projectId" placeholder="请选择项目" clearable filterable style="width: 200px">
               <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
            </el-select>
         </el-form-item>
         <el-form-item label="执行人" prop="userId">
            <el-select v-model="queryParams.userId" placeholder="请选择执行人" clearable filterable style="width: 160px">
               <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
            </el-select>
         </el-form-item>
         <el-form-item label="项目类别" prop="categoryId">
            <el-tree-select
               v-model="queryParams.categoryId"
               :data="categoryOptions"
               :props="{ value: 'id', label: 'label', children: 'children' }"
               value-key="id"
               placeholder="请选择类别"
               check-strictly
               clearable
               style="width: 180px"
            />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['project:workload:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['project:workload:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:workload:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:workload:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="workloadList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="所属项目" align="center" prop="projectName" min-width="160" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.projectName">{{ scope.row.projectName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="执行人" align="center" prop="userName" min-width="80">
            <template #default="scope">
               <span v-if="scope.row.userName">{{ scope.row.userName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="项目类别" align="center" prop="categoryName" min-width="120">
            <template #default="scope">
               <span v-if="scope.row.categoryName">{{ scope.row.categoryName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="内部工作量" align="center" prop="internalWorkload" min-width="110" />
         <el-table-column label="外部工作量" align="center" prop="externalWorkload" min-width="110" />
         <el-table-column label="内部单价" align="center" prop="internalPrice" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.internalPrice != null">{{ formatMoney(scope.row.internalPrice) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="外部单价" align="center" prop="externalPrice" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.externalPrice != null">{{ formatMoney(scope.row.externalPrice) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="内部产值" align="center" prop="internalOutput" min-width="110">
            <template #default="scope">
               <span v-if="scope.row.internalOutput != null">{{ formatMoney(scope.row.internalOutput) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="外部产值" align="center" prop="externalOutput" min-width="110">
            <template #default="scope">
               <span v-if="scope.row.externalOutput != null">{{ formatMoney(scope.row.externalOutput) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="单价来源" align="center" prop="priceSource" min-width="90">
            <template #default="scope">
               <el-tag v-if="scope.row.priceSource === 'contract'" type="primary">合同价</el-tag>
               <el-tag v-else-if="scope.row.priceSource === 'dict'" type="info">默认价</el-tag>
               <el-tag v-else-if="scope.row.priceSource === 'manual'" type="warning">手动</el-tag>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="更新时间" align="center" prop="updateTime" width="160">
            <template #default="scope">
               <span>{{ parseTime(scope.row.updateTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="180" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:workload:edit']">修改</el-button>
               <el-button link type="primary" @click="handleDelete(scope.row)" v-hasPermi="['project:workload:remove']">删除</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改工作量对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-form ref="workloadRef" :model="form" :rules="rules" label-width="100px">
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="所属项目" prop="projectId">
                     <el-select v-model="form.projectId" placeholder="请选择项目" filterable style="width: 100%" @change="onProjectChange">
                        <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="执行人" prop="userId">
                     <el-select v-model="form.userId" placeholder="请选择执行人" filterable style="width: 100%">
                        <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="项目类别" prop="categoryId">
                     <el-tree-select
                        v-model="form.categoryId"
                        :data="categoryOptions"
                        :props="{ value: 'id', label: 'label', children: 'children' }"
                        value-key="id"
                        placeholder="请选择类别（小类）"
                        check-strictly
                        :filter-node-method="filterLeafNode"
                        style="width: 100%"
                        @change="onCategoryChange"
                     />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="内部工作量" prop="internalWorkload">
                     <el-input-number v-model="form.internalWorkload" placeholder="内部工作量" :precision="4" :min="0" controls-position="right" style="width: 100%" @change="calcOutput" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="外部工作量" prop="externalWorkload">
                     <el-input-number v-model="form.externalWorkload" placeholder="外部工作量" :precision="4" :min="0" controls-position="right" style="width: 100%" @change="calcOutput" />
                  </el-form-item>
               </el-col>
               <el-col :span="8"></el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="内部单价" prop="internalPrice">
                     <el-input-number v-model="form.internalPrice" placeholder="内部单价" :precision="2" :min="0" controls-position="right" style="width: 100%" @change="onPriceManualChange" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="外部单价" prop="externalPrice">
                     <el-input-number v-model="form.externalPrice" placeholder="外部单价" :precision="2" :min="0" controls-position="right" style="width: 100%" @change="onPriceManualChange" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="单价来源">
                     <el-tag v-if="form.priceSource === 'contract'" type="primary">合同价</el-tag>
                     <el-tag v-else-if="form.priceSource === 'dict'" type="info">默认价</el-tag>
                     <el-tag v-else-if="form.priceSource === 'manual'" type="warning">手动</el-tag>
                     <span v-else style="color: #c0c4cc">—</span>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="内部产值">
                     <el-input-number :model-value="form.internalOutput" placeholder="自动计算" :precision="2" disabled controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="外部产值">
                     <el-input-number :model-value="form.externalOutput" placeholder="自动计算" :precision="2" disabled controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" :rows="2" />
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
   </div>
</template>

<script setup name="Workload">
import { listWorkload, getWorkload, addWorkload, updateWorkload, delWorkload } from "@/api/project/workload"
import { listProject } from "@/api/project/project"
import { categoryTreeselect } from "@/api/project/category"
import { listUser } from "@/api/system/user"

const { proxy } = getCurrentInstance()

const workloadList = ref([])
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
const categoryOptions = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    projectId: undefined,
    userId: undefined,
    categoryId: undefined
  },
  rules: {
    projectId: [{ required: true, message: "请选择项目", trigger: "change" }],
    userId: [{ required: true, message: "请选择执行人", trigger: "change" }],
    categoryId: [{ required: true, message: "请选择项目类别", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 加载下拉选项 */
function loadOptions() {
  listProject({ pageNum: 1, pageSize: 999 }).then(r => { projectOptions.value = r.rows || [] })
  listUser({ pageNum: 1, pageSize: 999 }).then(r => { userOptions.value = r.rows || [] })
  categoryTreeselect().then(r => { categoryOptions.value = r.data || [] })
}

/** 查询工作量列表 */
function getList() {
  loading.value = true
  listWorkload(queryParams.value).then(response => {
    workloadList.value = response.rows
    total.value = response.total
    loading.value = false
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
    userId: undefined,
    categoryId: undefined,
    internalWorkload: undefined,
    externalWorkload: undefined,
    internalPrice: undefined,
    externalPrice: undefined,
    internalOutput: undefined,
    externalOutput: undefined,
    priceSource: "dict",
    remark: undefined
  }
  proxy.resetForm("workloadRef")
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "新增工作量"
}

/** 修改 */
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getWorkload(id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改工作量"
  })
}

/** 选择项目 → 回填合同单价 */
function onProjectChange(projectId) {
  // TODO: 异步获取合同单价，回填 internalPrice/externalPrice
}

/** 选择类别 → 回填字典默认单价 */
function onCategoryChange(categoryId) {
  if (!categoryId) return
  // 从 categoryOptions 树中找到对应节点的默认单价
  const findPrice = (nodes) => {
    for (const n of nodes) {
      if (n.id === categoryId) return { ip: n.internalPrice, ep: n.externalPrice }
      if (n.children) {
        const r = findPrice(n.children)
        if (r) return r
      }
    }
    return null
  }
  const p = findPrice(categoryOptions.value)
  if (p) {
    // 仅新增时 / 未手动改过价时才自动填入
    if (!form.value.id || form.value.priceSource === 'dict') {
      form.value.internalPrice = p.ip
      form.value.externalPrice = p.ep
      form.value.priceSource = 'dict'
      calcOutput()
    }
  }
}

/** 手动改价标记 */
function onPriceManualChange() {
  form.value.priceSource = 'manual'
  calcOutput()
}

/** 自动计算产值 */
function calcOutput() {
  const iw = form.value.internalWorkload
  const ip = form.value.internalPrice
  const ew = form.value.externalWorkload
  const ep = form.value.externalPrice
  form.value.internalOutput = (iw != null && ip != null) ? +(iw * ip).toFixed(2) : undefined
  form.value.externalOutput = (ew != null && ep != null) ? +(ew * ep).toFixed(2) : undefined
}

/** 金额格式化 */
function formatMoney(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 树节点过滤：只留小类（叶子） */
function filterLeafNode(value, data) {
  return data.children == null || data.children.length === 0
}

/** 提交 */
function submitForm() {
  proxy.$refs["workloadRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateWorkload(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addWorkload(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除所选工作量?').then(function() {
    return delWorkload(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出 */
function handleExport() {
  proxy.download('/project/workload/export', {
    ...queryParams.value
  }, `workload_${new Date().getTime()}.xlsx`)
}

loadOptions()
getList()
</script>
