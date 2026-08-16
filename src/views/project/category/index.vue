<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="类别名称" prop="name">
            <el-input
               v-model="queryParams.name"
               placeholder="请输入类别名称"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="类别状态" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_normal_disable"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="primary"
               plain
               icon="Plus"
               @click="handleAdd"
               v-hasPermi="['project:category:add']"
            >新增大类</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="info"
               plain
               icon="Sort"
               @click="toggleExpandAll"
            >展开/折叠</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table
         v-if="refreshTable"
         v-loading="loading"
         :data="categoryList"
         row-key="id"
         :default-expand-all="isExpandAll"
         :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
         <el-table-column prop="name" label="类别名称" width="260"></el-table-column>
         <el-table-column prop="level" label="层级" width="100" align="center">
            <template #default="scope">
               <el-tag v-if="scope.row.level === 1" type="primary">大类</el-tag>
               <el-tag v-else type="success">小类</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="计费方式" width="180" align="center">
            <template #default="scope">
               <template v-if="scope.row.level === 2">
                  <el-popover
                     placement="left"
                     :width="460"
                     trigger="hover"
                     :disabled="!(billingMap[scope.row.id] && billingMap[scope.row.id].length)"
                  >
                     <template #reference>
                        <span class="billing-badges">
                           <el-tag size="small">内 {{ countBilling(scope.row.id, 'internal') }}</el-tag>
                           <el-tag size="small" type="warning" class="ml4">外 {{ countBilling(scope.row.id, 'external') }}</el-tag>
                        </span>
                     </template>
                     <el-table :data="billingMap[scope.row.id] || []" size="small">
                        <el-table-column label="类型" width="60" align="center">
                           <template #default="s">
                              <el-tag v-if="s.row.billingType === 'internal'" size="small">内部</el-tag>
                              <el-tag v-else size="small" type="warning">外部</el-tag>
                           </template>
                        </el-table-column>
                        <el-table-column prop="billingCategory" label="计费类别" show-overflow-tooltip />
                        <el-table-column prop="unitPrice" label="单价(元)" width="90" align="right" />
                        <el-table-column prop="priceUnit" label="计价单位" width="100" show-overflow-tooltip />
                        <el-table-column label="起步量" width="110" align="center">
                           <template #default="s">
                              <span>{{ s.row.minQuantity }} {{ s.row.priceUnit }}</span>
                           </template>
                        </el-table-column>
                     </el-table>
                  </el-popover>
               </template>
            </template>
         </el-table-column>
         <el-table-column prop="sortOrder" label="排序" width="100" align="center"></el-table-column>
         <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="scope">
               <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime" width="200">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['project:category:edit']">修改</el-button>
               <el-button v-if="scope.row.level === 1" link type="primary" icon="Plus" @click="handleAdd(scope.row)" v-hasPermi="['project:category:add']">新增小类</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['project:category:remove']">删除</el-button>
            </template>
         </el-table-column>
      </el-table>

      <!-- 添加或修改项目类别对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-form ref="categoryRef" :model="form" :rules="rules" label-width="100px">
            <el-row>
               <el-col :span="24" v-if="form.parentId !== undefined && form.parentId !== null">
                  <el-form-item label="上级类别" prop="parentId">
                     <el-tree-select
                        v-model="form.parentId"
                        :data="categoryOptions"
                        :props="{ value: 'id', label: 'label', children: 'children' }"
                        value-key="id"
                        placeholder="选择上级类别"
                        check-strictly
                        disabled
                     />
                  </el-form-item>
               </el-col>
               <el-col :span="24" v-else>
                  <el-form-item label="上级类别">
                     <el-tag type="info">无（顶级大类）</el-tag>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="类别名称" prop="name">
                     <el-input v-model="form.name" placeholder="请输入类别名称" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="显示排序" prop="sortOrder">
                     <el-input-number v-model="form.sortOrder" controls-position="right" :min="0" />
                  </el-form-item>
               </el-col>
            </el-row>

            <!-- 计费方式（仅小类） -->
            <template v-if="isSubCategory">
               <el-card v-for="t in billingTypes" :key="t.key" shadow="never" class="billing-card">
                  <template #header>
                     <div class="billing-card-header">
                        <span class="billing-card-title">{{ t.label }}</span>
                        <div class="billing-tip">
                           起步量即最低计价数量：如计价单位为公里、起步量为 1，则不足 1 公里按 1 公里计费。
                        </div>
                        <div class="billing-card-actions">
                           <el-button type="primary" size="small" icon="Plus" plain @click="addBillingRow(t.key)">添加</el-button>
                        </div>
                     </div>
                  </template>
                  <el-table v-if="billingRows[t.key].length" :data="billingRows[t.key]" size="small">
                     <el-table-column label="计费类别" min-width="150">
                        <template #default="s">
                           <el-autocomplete
                              v-model="s.row.billingCategory"
                              :fetch-suggestions="queryBillingCategories"
                              placeholder="选择或输入新类别"
                              clearable
                              style="width: 100%"
                           />
                        </template>
                     </el-table-column>
                     <el-table-column label="单价(元)" width="150" align="center">
                        <template #default="s">
                           <el-input-number v-model="s.row.unitPrice" controls-position="right" :precision="2" :min="0" style="width: 125px" />
                        </template>
                     </el-table-column>
                     <el-table-column label="计价单位" width="140">
                        <template #default="s">
                           <el-input v-model="s.row.priceUnit" placeholder="如：平方公里" maxlength="50" />
                        </template>
                     </el-table-column>
                     <el-table-column label="起步量" width="150" align="center">
                        <template #default="s">
                           <el-input-number v-model="s.row.minQuantity" controls-position="right" :precision="4" :min="0" style="width: 125px" />
                        </template>
                     </el-table-column>
                     <el-table-column label="操作" width="60" align="center">
                        <template #default="s">
                           <el-button link type="danger" icon="Delete" @click="removeBillingRow(t.key, s.$index)" />
                        </template>
                     </el-table-column>
                  </el-table>
                  <el-empty v-else description="暂无计费方式，点击右上角「添加」" :image-size="40" />
                  <div v-if="billingRows[t.key].length" class="billing-example">
                     示例：{{ exampleText(t.key) }}
                  </div>
               </el-card>
               
            </template>

            <!-- 状态、备注（小类时位于计费方式之后） -->
            <el-row>
               <el-col :span="12">
                  <el-form-item label="状态">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="dict in sys_normal_disable"
                           :key="dict.value"
                           :value="dict.value"
                        >{{ dict.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
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
   </div>
</template>

<script setup name="Category">
import { listCategory, categoryTreeselect, getCategory, addCategory, updateCategory, delCategory, listBilling, getBilling, listBillingCategories } from "@/api/project/category"

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = useDict("sys_normal_disable")

const categoryList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const categoryOptions = ref([])
const isExpandAll = ref(true)
const refreshTable = ref(true)

// ===== 计费方式相关状态 =====
// 全量计费方式（列表页徽标展示用）
const allBilling = ref([])
// 计费类别下拉选项（distinct）
const billingCategoryOptions = ref([])
// 编辑中的计费方式行：internal / external 两组
const billingRows = reactive({ internal: [], external: [] })
const billingTypes = [
  { key: "internal", label: "内部计费方式" },
  { key: "external", label: "外部计费方式" }
]

const data = reactive({
  form: {},
  queryParams: {
    name: undefined,
    status: undefined
  },
  rules: {
    name: [{ required: true, message: "类别名称不能为空", trigger: "blur" }],
    sortOrder: [{ required: true, message: "显示排序不能为空", trigger: "blur" }]
  },
})

const { queryParams, form, rules } = toRefs(data)

/** 类别 → 计费方式映射 */
const billingMap = computed(() => {
  const map = {}
  allBilling.value.forEach(b => {
    if (!map[b.categoryId]) map[b.categoryId] = []
    map[b.categoryId].push(b)
  })
  return map
})

/** 当前编辑是否为小类 */
const isSubCategory = computed(() => {
  return form.value.parentId != null && form.value.parentId > 0
})

/** 查询项目类别列表 */
function getList() {
  loading.value = true
  listCategory(queryParams.value).then(response => {
    categoryList.value = proxy.handleTree(response.data, "id")
    loading.value = false
  })
}

/** 加载全量计费方式（徽标展示用） */
function loadBilling() {
  listBilling().then(response => {
    allBilling.value = response.data || []
  })
}

/** 加载计费类别选项 */
function loadBillingCategories() {
  listBillingCategories().then(response => {
    billingCategoryOptions.value = response.data || []
  })
}

/** 计费类别输入建议：按关键字过滤已有类别，支持直接手输 */
function queryBillingCategories(queryString, cb) {
  const kw = (queryString || "").toLowerCase()
  const results = billingCategoryOptions.value
    .filter(o => !kw || o.toLowerCase().includes(kw))
    .map(o => ({ value: o }))
  cb(results)
}

/** 统计某类别某类型的计费方式数量 */
function countBilling(categoryId, type) {
  const list = billingMap.value[categoryId]
  return list ? list.filter(b => b.billingType === type).length : 0
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
    parentId: undefined,
    name: undefined,
    level: undefined,
    internalPrice: undefined,
    externalPrice: undefined,
    sortOrder: 0,
    status: "0",
    remark: undefined,
    billingList: undefined
  }
  billingRows.internal = []
  billingRows.external = []
  proxy.resetForm("categoryRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd(row) {
  reset()
  if (row != undefined && row.id != undefined) {
    // 新增小类，预填父类别
    form.value.parentId = row.id
    categoryTreeselect().then(response => {
      categoryOptions.value = response.data
    })
  }
  open.value = true
  title.value = form.value.parentId ? "添加小类" : "添加大类"
}

/** 展开/折叠操作 */
function toggleExpandAll() {
  refreshTable.value = false
  isExpandAll.value = !isExpandAll.value
  nextTick(() => {
    refreshTable.value = true
  })
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  getCategory(row.id).then(response => {
    form.value = response.data
    if (form.value.parentId != null && form.value.parentId > 0) {
      // 小类：加载父类别树 + 计费方式
      categoryTreeselect().then(res => {
        categoryOptions.value = res.data
      })
      getBilling(row.id).then(res => {
        billingRows.internal = (res.data || []).filter(b => b.billingType === "internal").map(toEditRow)
        billingRows.external = (res.data || []).filter(b => b.billingType === "external").map(toEditRow)
      })
    }
    open.value = true
    title.value = "修改项目类别"
  })
}

/** 数据库行 → 编辑行（去掉持久化字段） */
function toEditRow(b) {
  return {
    billingCategory: b.billingCategory,
    unitPrice: b.unitPrice,
    priceUnit: b.priceUnit,
    minQuantity: b.minQuantity != null ? b.minQuantity : 1
  }
}

/** 添加一行计费方式 */
function addBillingRow(key) {
  billingRows[key].push({ billingCategory: undefined, unitPrice: undefined, priceUnit: undefined, minQuantity: 1 })
}

/** 删除一行计费方式 */
function removeBillingRow(key, index) {
  billingRows[key].splice(index, 1)
}

/** 实时计算示例文案 */
function exampleText(key) {
  const parts = billingRows[key]
    .filter(b => b.unitPrice != null && b.priceUnit)
    .map(b => {
      const qty = Math.max(10, b.minQuantity || 0)
      return `${b.billingCategory || "?"} ${qty}${b.priceUnit} × ${b.unitPrice} = ${(qty * b.unitPrice).toFixed(2)}元`
    })
  const text = parts.join("；")
  const hasMin = billingRows[key].some(b => b.minQuantity != null && b.minQuantity > 1)
  return text + (hasMin ? "（不足起步量按起步量计）" : "")
}

/** 校验计费方式行数据 */
function validateBillings() {
  for (const t of billingTypes) {
    const rows = billingRows[t.key]
    for (let i = 0; i < rows.length; i++) {
      const b = rows[i]
      const prefix = `${t.label}第 ${i + 1} 行：`
      if (!b.billingCategory) {
        proxy.$modal.msgError(prefix + "请填写计费类别")
        return false
      }
      if (b.unitPrice == null) {
        proxy.$modal.msgError(prefix + "请填写单价")
        return false
      }
      if (!b.priceUnit) {
        proxy.$modal.msgError(prefix + "请填写计价单位")
        return false
      }
      if (b.minQuantity == null) b.minQuantity = 1
    }
  }
  return true
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["categoryRef"].validate(valid => {
    if (valid) {
      if (isSubCategory.value && !validateBillings()) return
      // 小类：组装计费方式随表单一并提交；大类：不携带
      if (isSubCategory.value) {
        form.value.billingList = [
          ...billingRows.internal.map(b => ({ ...b, billingType: "internal" })),
          ...billingRows.external.map(b => ({ ...b, billingType: "external" }))
        ]
      } else {
        form.value.billingList = undefined
      }
      if (form.value.id != undefined) {
        updateCategory(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
          loadBilling()
          loadBillingCategories()
        })
      } else {
        addCategory(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
          loadBilling()
          loadBillingCategories()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  proxy.$modal.confirm('是否确认删除类别"' + row.name + '"？').then(function() {
    return delCategory(row.id)
  }).then(() => {
    getList()
    loadBilling()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
loadBilling()
loadBillingCategories()
</script>

<style scoped>
.billing-badges {
  cursor: default;
}
.ml4 {
  margin-left: 4px;
}
.billing-card {
  margin-bottom: 12px;
}
.billing-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.billing-card-title {
  font-weight: bold;
}
.billing-card-actions {
  display: flex;
  gap: 8px;
}
.billing-example {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}
.billing-tip {
  color: #909399;
  font-size: 12px;
}
</style>
