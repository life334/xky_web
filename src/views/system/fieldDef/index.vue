<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="目标表名" prop="tableName">
        <el-select v-model="queryParams.tableName" placeholder="请选择目标表" clearable style="width: 200px">
          <el-option label="项目表" value="proj_project" />
          <el-option label="合同表" value="proj_contract" />
          <el-option label="任务表" value="proj_task" />
          <el-option label="工作量表" value="proj_workload" />
          <el-option label="付款表" value="proj_payment" />
          <el-option label="资料表" value="proj_material" />
        </el-select>
      </el-form-item>
      <el-form-item label="字段标识" prop="fieldKey">
        <el-input v-model="queryParams.fieldKey" placeholder="请输入字段标识" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="字段名称" prop="fieldLabel">
        <el-input v-model="queryParams.fieldLabel" placeholder="请输入字段名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:fieldDef:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:fieldDef:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="fieldDefList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" type="index" width="60" align="center" />
      <el-table-column label="目标表名" align="center" prop="tableName" width="140">
        <template #default="scope">
          <el-tag>{{ tableNameMap[scope.row.tableName] || scope.row.tableName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="字段标识" align="center" prop="fieldKey" width="160">
        <template #default="scope">
          <code>{{ scope.row.fieldKey }}</code>
        </template>
      </el-table-column>
      <el-table-column label="字段名称" align="center" prop="fieldLabel" width="160" show-overflow-tooltip />
      <el-table-column label="字段类型" align="center" prop="fieldType" width="110">
        <template #default="scope">
          <el-tag :type="typeTagMap[scope.row.fieldType]">{{ typeMap[scope.row.fieldType] || scope.row.fieldType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="必填" align="center" prop="isRequired" width="70">
        <template #default="scope">
          <span v-if="scope.row.isRequired === '1'" style="color: #f56c6c">是</span>
          <span v-else>否</span>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" prop="sortOrder" width="70" />
      <el-table-column label="状态" align="center" prop="status" width="80">
        <template #default="scope">
          <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="160" show-overflow-tooltip />
      <el-table-column label="创建时间" align="center" prop="createTime" width="170" />
      <el-table-column label="操作" align="center" width="160" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['system:fieldDef:edit']">修改</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['system:fieldDef:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/修改弹窗 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="fieldDefRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="目标表名" prop="tableName">
          <el-select v-model="form.tableName" placeholder="请选择目标表" style="width: 100%">
            <el-option label="项目表 proj_project" value="proj_project" />
            <el-option label="合同表 proj_contract" value="proj_contract" />
            <el-option label="任务表 proj_task" value="proj_task" />
            <el-option label="工作量表 proj_workload" value="proj_workload" />
            <el-option label="付款表 proj_payment" value="proj_payment" />
            <el-option label="资料表 proj_material" value="proj_material" />
          </el-select>
        </el-form-item>
        <el-form-item label="字段标识" prop="fieldKey">
          <el-input v-model="form.fieldKey" placeholder="extra_data 中的 JSON key" maxlength="50" />
        </el-form-item>
        <el-form-item label="字段名称" prop="fieldLabel">
          <el-input v-model="form.fieldLabel" placeholder="页面显示的字段名" maxlength="100" />
        </el-form-item>
        <el-form-item label="字段类型" prop="fieldType">
          <el-select v-model="form.fieldType" placeholder="请选择" style="width: 100%">
            <el-option label="文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="日期时间" value="datetime" />
            <el-option label="下拉选择" value="select" />
            <el-option label="多行文本" value="textarea" />
          </el-select>
        </el-form-item>
        <el-form-item label="选项列表" prop="fieldOptions" v-if="form.fieldType === 'select'">
          <el-input v-model="form.fieldOptions" placeholder="JSON数组格式，如 [&quot;选项A&quot;,&quot;选项B&quot;]" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="是否必填" prop="isRequired">
          <el-radio-group v-model="form.isRequired">
            <el-radio value="0">否</el-radio>
            <el-radio value="1">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序号" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" controls-position="right" style="width: 120px" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">启用</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" maxlength="500" />
        </el-form-item>
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

<script setup name="ProjFieldDef">
import { listFieldDef, getFieldDef, addFieldDef, updateFieldDef, delFieldDef } from "@/api/system/fieldDef"

const { proxy } = getCurrentInstance()

const fieldDefList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const title = ref("")

// 表名映射
const tableNameMap = {
  proj_project: '项目表',
  proj_contract: '合同表',
  proj_task: '任务表',
  proj_workload: '工作量表',
  proj_payment: '付款表',
  proj_material: '资料表'
}

// 类型映射
const typeMap = {
  text: '文本',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  select: '下拉选择',
  textarea: '多行文本'
}

const typeTagMap = {
  text: '',
  number: 'warning',
  date: 'success',
  datetime: 'success',
  select: 'primary',
  textarea: 'info'
}

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    tableName: null,
    fieldKey: null,
    fieldLabel: null,
    status: null
  },
  rules: {
    tableName: [{ required: true, message: "目标表名不能为空", trigger: "change" }],
    fieldKey: [{ required: true, message: "字段标识不能为空", trigger: "blur" }],
    fieldLabel: [{ required: true, message: "字段名称不能为空", trigger: "blur" }],
    fieldType: [{ required: true, message: "字段类型不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listFieldDef(queryParams.value).then(response => {
    fieldDefList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    tableName: null,
    fieldKey: null,
    fieldLabel: null,
    fieldType: 'text',
    fieldOptions: null,
    isRequired: '0',
    sortOrder: 0,
    status: '0',
    remark: null
  }
  proxy.resetForm("fieldDefRef")
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "新增动态字段"
}

function handleUpdate(row) {
  reset()
  const id = row.id || ids.value
  getFieldDef(id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改动态字段"
  })
}

function submitForm() {
  proxy.$refs["fieldDefRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateFieldDef(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addFieldDef(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

function handleDelete(row) {
  const paramIds = row.id || ids.value
  proxy.$modal.confirm('是否确认删除所选动态字段定义？').then(function() {
    return delFieldDef(paramIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function handleStatusChange(row) {
  const text = row.status === "0" ? "启用" : "停用"
  proxy.$modal.confirm('确认要"' + text + '"该字段定义吗？').then(function() {
    return updateFieldDef(row)
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
  }).catch(() => {
    row.status = row.status === "0" ? "1" : "0"
  })
}

getList()
</script>
