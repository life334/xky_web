<template>
  <div class="app-container report-workbench">
    <!-- ═══════════ ① 顶部工具栏 ═══════════ -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar-row">
        <div class="toolbar-group">
          <span class="t-label">报表模板</span>
          <el-select v-model="currentTemplateId" filterable placeholder="请选择模板" style="width: 280px" @change="onTemplateChange">
            <el-option-group label="内置模板（样式 100% 还原）">
              <el-option v-for="t in builtinTemplates" :key="t.id" :label="t.templateName" :value="t.id" />
            </el-option-group>
            <el-option-group label="自定义模板（继承样式·动态列）">
              <el-option v-for="t in customTemplates" :key="t.id" :label="t.templateName" :value="t.id" />
            </el-option-group>
          </el-select>
          <el-button type="primary" link icon="Setting" v-hasPermi="['report:report:template']" @click="openDesigner">设计字段</el-button>
          <el-button type="danger" link icon="Delete" v-if="isCustomTemplate" v-hasPermi="['report:report:template']" @click="handleDeleteTemplate">删除模板</el-button>
        </div>

        <div class="toolbar-group">
          <span class="t-label">筛选方案</span>
          <el-select v-model="currentFilterId" clearable filterable placeholder="无筛选方案" style="width: 200px" @change="onFilterChange">
            <el-option v-for="f in filterSchemes" :key="f.id" :label="f.filterName" :value="f.id" />
          </el-select>
          <el-button type="primary" link icon="Operation" v-hasPermi="['report:report:filter']" @click="openFilterDialog">筛选设置</el-button>
          <el-button type="warning" link icon="FolderAdd" :disabled="!selectedFilterKeys.length" v-hasPermi="['report:report:filter']" @click="saveFilterScheme">保存筛选</el-button>
        </div>

        <div class="toolbar-right">
          <el-button icon="Clock" v-hasPermi="['report:report:log']" @click="openLogDialog">导出历史</el-button>
          <el-button type="primary" icon="Download" :loading="exporting" v-hasPermi="['report:report:export']" @click="handleExport">导出报表</el-button>
        </div>
      </div>

      <!-- ② 筛选条件区：只渲染「筛选设置」中勾选的筛选器 -->
      <div v-if="selectedFilterKeys.length" class="filter-area">
        <div class="filter-head">
          <span class="filter-title">当前筛选条件（{{ selectedFilterKeys.length }} 项）</span>
          <span class="filter-scheme" v-if="currentFilterSchemeName">方案：{{ currentFilterSchemeName }}</span>
          <el-button link type="primary" @click="openFilterDialog">⚙ 调整筛选</el-button>
          <el-button link v-if="hasAnyFilterValue" @click="clearFilterValues">清空值</el-button>
        </div>
        <div class="filter-grid">
          <div v-for="fk in selectedFilterKeys" :key="fk" class="filter-item">
            <span class="filter-label" :title="fieldPoolMeta(fk)?.label">{{ fieldPoolMeta(fk)?.label || fk }}</span>
            <!-- 文本模糊匹配 -->
            <el-input v-if="FILTER_MAP[fk].widget === 'input'" :model-value="fv(FILTER_MAP[fk].mapKey)" placeholder="模糊匹配" clearable size="small" @update:model-value="setFv(FILTER_MAP[fk].mapKey, $event)" @keyup.enter="debouncePreview" @clear="debouncePreview" @change="debouncePreview" />
            <!-- 单选下拉 -->
            <el-select v-else-if="FILTER_MAP[fk].widget === 'select'" :model-value="fv(FILTER_MAP[fk].mapKey)" clearable placeholder="全部" size="small" style="width: 100%" @update:model-value="setFv(FILTER_MAP[fk].mapKey, $event)" @change="debouncePreview">
              <el-option v-for="(label, val) in selectOptions(fk)" :key="val" :label="label" :value="val" />
            </el-select>
            <!-- 多选下拉（项目状态等） -->
            <el-select v-else-if="FILTER_MAP[fk].widget === 'multiSelect'" :model-value="fv(FILTER_MAP[fk].mapKey)" multiple collapse-tags clearable placeholder="全部" size="small" style="width: 100%" @update:model-value="setFv(FILTER_MAP[fk].mapKey, $event)" @change="debouncePreview">
              <el-option v-for="(label, val) in selectOptions(fk)" :key="val" :label="label" :value="val" />
            </el-select>
            <!-- 日期区间 -->
            <el-date-picker
              v-else-if="FILTER_MAP[fk].widget === 'daterange'"
              :model-value="dateRangeValue(fk)"
              type="daterange" range-separator="~" start-placeholder="开始日期" end-placeholder="结束日期"
              value-format="YYYY-MM-DD" size="small" style="width: 100%"
              @update:model-value="onDateRangeChange(fk, $event)"
            />
            <!-- 数值区间 -->
            <div v-else-if="FILTER_MAP[fk].widget === 'numberRange'" class="range-pair">
              <el-input-number :model-value="fv(FILTER_MAP[fk].range[0])" :controls="false" placeholder="最小值" size="small" style="width: 100%" @update:model-value="setFv(FILTER_MAP[fk].range[0], $event)" @change="debouncePreview" />
              <span class="range-sep">~</span>
              <el-input-number :model-value="fv(FILTER_MAP[fk].range[1])" :controls="false" placeholder="最大值" size="small" style="width: 100%" @update:model-value="setFv(FILTER_MAP[fk].range[1], $event)" @change="debouncePreview" />
            </div>
            <!-- 单值数值 -->
            <el-input-number v-else :model-value="fv(FILTER_MAP[fk].mapKey)" :controls="false" :placeholder="FILTER_MAP[fk].placeholder || '数值'" size="small" style="width: 100%" @update:model-value="setFv(FILTER_MAP[fk].mapKey, $event)" @change="debouncePreview" />
          </div>
        </div>
      </div>
      <div v-else class="filter-empty">
        <el-icon><Filter /></el-icon>
        <span>未启用筛选条件 — 点击「筛选设置」勾选需要的筛选项（可调整顺序、保存为方案复用）</span>
      </div>
    </el-card>

    <!-- ═══════════ ③ 导出预览 ═══════════ -->
    <el-card shadow="never" class="preview-card">
      <div class="preview-head">
        <div class="preview-info">
          <span class="preview-title">导出预览</span>
          <template v-if="currentTemplate">
            <el-tag size="small" :type="isCustomTemplate ? 'warning' : 'success'" effect="plain">
              {{ isCustomTemplate ? '自定义模板' : '内置模板' }}
            </el-tag>
            <el-tag size="small" type="info" effect="plain">{{ currentTemplate.hasSummaryRow === 'Y' ? '含合计行' : '不含合计行' }}</el-tag>
            <el-tag size="small" effect="plain">{{ (currentTemplate.fieldList || []).length }} 列</el-tag>
            <el-tag size="small" :type="previewTotal > 0 ? 'primary' : 'info'" effect="plain">命中 {{ previewTotal }} 条</el-tag>
            <span v-if="previewTotal > 50" class="preview-limit">（仅展示前 50 行）</span>
          </template>
        </div>
        <el-button v-if="currentTemplate" size="small" :loading="previewLoading" @click="doPreview">
          <el-icon><Refresh /></el-icon>&nbsp;刷新预览
        </el-button>
      </div>

      <!-- 列结构速览（所见即所得：按多级表头分组展示） -->
      <div v-if="headerTree.length" class="col-preview">
        <template v-for="(node, i) in headerTree" :key="'p' + i">
          <div v-if="node.isGroup" class="col-group">
            <span class="group-name">{{ node.label }}</span>
            <div class="group-chips">
              <div v-for="(leaf, j) in node.children" :key="'pc' + j" class="col-chip" :title="leaf.fieldKey">
                <span class="col-order">{{ leaf.colIndex + 1 }}</span>{{ leaf.label }}
              </div>
            </div>
          </div>
          <div v-else class="col-chip" :title="node.fieldKey">
            <span class="col-order">{{ node.colIndex + 1 }}</span>{{ node.label }}
          </div>
        </template>
      </div>

      <el-table v-loading="previewLoading" :data="previewRows" border size="small" max-height="460" empty-text="暂无数据 — 调整筛选条件或更换模板后导出">
        <template v-for="(node, i) in headerTree" :key="'h' + i">
          <!-- 分组节点：多级表头（外层列 = 分组名） -->
          <el-table-column v-if="node.isGroup" :label="node.label" align="center">
            <el-table-column
              v-for="(leaf, j) in node.children"
              :key="'g' + i + '_' + j"
              :label="leaf.label"
              :prop="'c' + leaf.colIndex"
              :min-width="leafWidth(leaf)"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span :class="{ 'cell-number': isNumberFieldKey(leaf.fieldKey) }">{{ formatCell(row['c' + leaf.colIndex]) }}</span>
              </template>
            </el-table-column>
          </el-table-column>
          <!-- 叶子节点：一级表头 -->
          <el-table-column
            v-else
            :label="node.label"
            :prop="'c' + node.colIndex"
            :min-width="leafWidth(node)"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span :class="{ 'cell-number': isNumberFieldKey(node.fieldKey) }">{{ formatCell(row['c' + node.colIndex]) }}</span>
            </template>
          </el-table-column>
        </template>
      </el-table>
    </el-card>

    <!-- ═══════════ ④ 筛选设置弹窗 ═══════════ -->
    <el-dialog v-model="filterDialogVisible" title="筛选设置" width="80%" append-to-body destroy-on-close>
      <div class="filter-config-body">
        <div class="config-panel left">
          <div class="panel-title">可选筛选字段（勾选即启用）</div>
          <div class="panel-scroll">
            <template v-for="group in filterableGroups" :key="group.name">
              <div class="group-name">{{ group.name }}</div>
              <el-checkbox
                v-for="f in group.fields"
                :key="f.key"
                :model-value="filterDraft.includes(f.key)"
                class="field-checkbox"
                @change="(v) => toggleDraftField(f.key, v)"
              >
                {{ f.label }}
              </el-checkbox>
            </template>
          </div>
        </div>
        <div class="config-panel right">
          <div class="panel-title">已启用（{{ filterDraft.length }}）— 上下调整显示顺序</div>
          <div class="panel-scroll">
            <div v-if="!filterDraft.length" class="panel-empty">未启用任何筛选条件</div>
            <div v-for="(fk, idx) in filterDraft" :key="fk" class="order-row">
              <span class="order-label">{{ fieldPoolMeta(fk)?.label || fk }}</span>
              <el-button-group size="small">
                <el-button :icon="'Top'" :disabled="idx === 0" @click="moveDraft(idx, -1)" />
                <el-button :icon="'Bottom'" :disabled="idx === filterDraft.length - 1" @click="moveDraft(idx, 1)" />
              </el-button-group>
              <el-button size="small" type="danger" :icon="'Close'" circle @click="removeDraft(idx)" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="filterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmFilterDialog">确定</el-button>
      </template>
    </el-dialog>

    <!-- ═══════════ ⑤ 字段设计器弹窗 ═══════════ -->
    <el-dialog 
      v-model="designerVisible" 
      :title="designerIsBuiltin ? '设计自定义模板' : '编辑自定义模板字段'" 
      width="80%" 
      class="report-designer-dialog"
      append-to-body 
      destroy-on-close
      :close-on-click-modal="false"
    >
      <!-- 头部工具条 -->
      <div class="designer-head">
        <div class="designer-name">
          <span class="t-label">模板名称</span>
          <el-input v-model="designerName" placeholder="请输入自定义模板名称" style="width: 300px" maxlength="50" show-word-limit />
        </div>
        <div class="designer-meta">
          <el-tag size="small" effect="plain">{{ designerIsBuiltin ? '基于内置模板' : '自定义模板' }}</el-tag>
          <span class="meta-source">来源：{{ designerSourceName }}</span>
          <el-button size="small" :icon="'RefreshLeft'" @click="resetDesigner">恢复默认</el-button>
          <span class="summary-switch">
            追加合计行
            <el-switch v-model="designerHasSummary" size="small" />
          </span>
        </div>
      </div>

      <!-- 主体：字段库 + 设计区 -->
      <div class="designer-body">
        <!-- 左：字段库 -->
        <div class="designer-pool">
          <div class="pool-search">
            <el-input v-model="designerSearch" placeholder="搜索字段名称…" size="small" clearable :prefix-icon="'Search'" />
          </div>
          <div class="pool-legend">
            <span class="legend-dot src-subject" title="基础字段" />基础
            <span class="legend-dot src-agg" title="汇总字段" />汇总
            <span class="legend-dot src-dynamic" title="动态字段" />动态
          </div>
          <div class="pool-scroll">
            <template v-for="group in filteredDesignerGroups" :key="group.name">
              <div class="pool-group-card">
                <div class="pool-group-head" @click="toggleGroupCollapse(group.name)">
                  <div class="pool-group-left">
                  <el-icon class="pool-group-arrow" :class="{ 'is-open': !designerCollapsed[group.name] }">
                    <Arrow-Right v-if="designerCollapsed[group.name]" />
                    <Arrow-Down v-else />
                  </el-icon>
                    <span class="pool-group-name">{{ group.name }}</span>
                  </div>
                  <div class="pool-group-right">
                    <span class="pool-group-count" :class="{ 'is-full': groupCheckedCount(group.name) === group.fields.length }">
                      {{ groupCheckedCount(group.name) }}/{{ group.fields.length }}
                    </span>
                    <el-button
                      link
                      type="primary"
                      size="small"
                      class="group-quick-btn"
                      @click.stop="groupSelectAll(group.name, group.fields)"
                    >
                      {{ groupCheckedCount(group.name) === group.fields.length ? '清空' : '全选' }}
                    </el-button>
                  </div>
                </div>
                <div v-show="!designerCollapsed[group.name]" class="pool-group-body">
                  <div
                    v-for="f in group.fields"
                    :key="f.key"
                    class="pool-field"
                    :class="{ 'is-checked': designerChecked(f.key) }"
                    @click="toggleDesignerField(f.key, !designerChecked(f.key))"
                  >
                    <el-checkbox
                      :model-value="designerChecked(f.key)"
                      size="small"
                      @click.stop
                      @change="(v) => toggleDesignerField(f.key, v)"
                    />
                    <span class="field-dot" :class="'src-' + (f.source || 'subject')" :title="sourceTip(f.source)"></span>
                    <span class="field-label">{{ f.label }}</span>
                  </div>
                </div>
              </div>
            </template>
            <div v-if="!filteredDesignerGroups.length" class="pool-empty">未找到匹配字段</div>
          </div>
        </div>

        <!-- 右：设计区 -->
        <div class="designer-stage">
          <!-- 实时表头预览（所见即所得） -->
          <div class="stage-preview">
            <div class="stage-preview-title">
              <span>表头预览（与导出效果一致）</span>
              <span class="preview-count">{{ designerSelected.length }} 列</span>
            </div>
            <div class="preview-canvas">
              <div v-if="!designerSelected.length" class="preview-empty">从左侧勾选字段，此处实时显示导出表头</div>
              <template v-else>
                <!-- 多级表头：有分组时两行（分组行+字段名行），无分组时单行 -->
                <div v-if="previewHasGroup" class="preview-header-grid" :style="{ gridTemplateColumns: previewGridCols }">
                  <!-- 第一行：分组节点 + 无分组叶子（跨两行） -->
                  <template v-for="(node, ni) in designerHeaderTree" :key="'g' + ni">
                    <div v-if="node.type === 'group'" class="preview-group-cell"
                         :style="{ gridColumn: (node.colStart + 1) + ' / span ' + node.span, gridRow: '1' }">
                      {{ node.label }}
                    </div>
                    <div v-else class="preview-cell-span2"
                         :style="{ gridColumn: (node.colStart + 1), gridRow: '1 / span 2' }">
                      <span class="cell-dot" :class="'src-' + (node.leaf.source || 'subject')" :title="sourceTip(node.leaf.source)"></span>
                      <span class="cell-label">{{ node.leaf.label || node.leaf.key }}</span>
                    </div>
                  </template>
                  <!-- 第二行：分组节点的叶子字段 -->
                  <template v-for="(node, ni) in designerHeaderTree" :key="'f' + ni">
                    <template v-if="node.type === 'group'">
                      <div v-for="(child, ci) in node.children" :key="'c' + ni + '-' + ci" class="preview-field-cell"
                           :style="{ gridColumn: (child.colStart + 1), gridRow: '2' }">
                        <span class="cell-dot" :class="'src-' + (child.leaf.source || 'subject')" :title="sourceTip(child.leaf.source)"></span>
                        <span class="cell-label">{{ child.leaf.label || child.leaf.key }}</span>
                      </div>
                    </template>
                  </template>
                </div>
                <!-- 单行表头（无分组时保持原样） -->
                <div v-else class="preview-header-row">
                  <div v-for="h in designerPreviewHeaders" :key="h.key" class="preview-cell" :style="{ minWidth: previewCellWidth(h) + 'px' }">
                    <span class="cell-dot" :class="'src-' + (h.source || 'subject')" :title="sourceTip(h.source)"></span>
                    <span class="cell-label">{{ h.label || h.key }}</span>
                  </div>
                </div>
                <div class="preview-data-row" :style="{ gridTemplateColumns: previewGridCols }">
                  <div v-for="h in designerPreviewHeaders" :key="'d' + h.key" class="preview-data-cell">示例</div>
                </div>
                <div v-if="designerHasSummary" class="preview-summary-row" :style="{ gridTemplateColumns: previewGridCols }">
                  <div v-for="(h, i) in designerPreviewHeaders" :key="'s' + h.key" class="preview-summary-cell">
                    <span v-if="i === 0">合计</span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 列管理（分组式） -->
          <div class="stage-list">
            <div class="stage-list-title">
              <span>导出列（{{ designerSelected.length }}）· 分组数（{{ designerGroupList.filter(g => g.name).length }}）</span>
              <span class="stage-list-tip">拖拽手柄调整顺序 / 跨组移动 · 分组头可折叠·重命名·解散</span>
              <el-button type="primary" size="small" plain icon="Plus" @click="createNewGroup()" style="margin-left: 8px">新建分组</el-button>
            </div>
            <div class="stage-list-body">
              <div v-if="!designerSelected.length" class="stage-empty">未选择任何字段 — 从左侧勾选字段开始设计</div>

              <div
                v-for="(group, gi) in designerGroupList"
                :key="group.name || '__ungrouped__'"
                class="col-group-block"
                :class="{ 'is-group-hover': designerSelectedGroup === group.name, 'is-ungrouped': !group.name }"
                @dragover.prevent="onGroupDragEnter(group.name)"
                @dragleave="onGroupDragLeave"
                @drop.prevent="dropToGroup(group.name)"
              >
                <!-- 分组头（非空分组） -->
                <div v-if="group.name" class="col-group-header">
                  <span class="group-fold" @click="toggleDesignerGroupCollapse(group.name)">
                    <el-icon><component :is="designerGroupCollapsed[group.name] ? 'ArrowRight' : 'ArrowDown'" /></el-icon>
                  </span>
                  <template v-if="designerRenamingGroup === group.name">
                    <el-input
                      v-model="designerRenameInput"
                      size="small"
                      class="col-group-rename-input"
                      @blur="finishRenameGroup(group.name)"
                      @keyup.enter="finishRenameGroup(group.name)"
                      maxlength="20"
                    />
                  </template>
                  <template v-else>
                    <span class="group-name" @dblclick="startRenameGroup(group.name)">{{ group.name }}</span>
                    <span class="group-count">{{ group.fields.length }} 列</span>
                  </template>
                  <div v-if="designerRenamingGroup !== group.name" class="group-actions">
                    <el-button icon="EditPen" circle size="small" text @click="startRenameGroup(group.name)" title="重命名分组" />
                    <el-button icon="Promotion" circle size="small" text type="success" @click="disbandGroup(group.name)" title="解散分组 · 字段提升为一级表头" />
                  </div>
                </div>

                <!-- 未分组区标题 -->
                <div v-if="!group.name" class="col-group-header col-group-ungrouped-title">
                  <span class="group-name">一级表头（无分组）</span>
                  <span class="group-count">{{ group.fields.length }} 列</span>
                  <span class="group-drop-hint" v-if="designerSelectedGroup === ''">· 拖到此处提升为一级表头</span>
                </div>

                <!-- 组内字段列表 -->
                <div v-show="group.name ? !designerGroupCollapsed[group.name] : true" class="col-group-items">
                  <div
                    v-for="f in group.fields"
                    :key="f.key"
                    class="col-manage-row"
                    :class="{ 'is-dragging': designerDragIdx === designerSelected.indexOf(f) }"
                    @dragover.prevent
                    @drop="designerDrop(designerSelected.indexOf(f))"
                    @dragend="designerDragIdx = -1"
                  >
                    <span class="drag-handle" title="拖拽调整顺序 / 跨组移动" draggable="true" @dragstart="designerDragStart(designerSelected.indexOf(f))"></span>
                    <el-input v-model="f.label" size="small" class="col-label-input" maxlength="30" placeholder="列名" />
                    <span class="col-width-label">列宽</span>
                    <el-input-number v-model="f.width" :min="6" :max="60" size="small" controls-position="right" style="width: 100px" />
                    <span class="col-width-unit">字符</span>
                    <div class="row-actions">
                      <el-button icon="Top" circle size="small" text :disabled="designerSelected.indexOf(f) === 0" @click="moveDesigner(designerSelected.indexOf(f), -1)" title="上移" />
                      <el-button icon="Bottom" circle size="small" text :disabled="designerSelected.indexOf(f) === designerSelected.length - 1" @click="moveDesigner(designerSelected.indexOf(f), 1)" title="下移" />
                      <el-button v-if="f.headerGroup" icon="Promotion" circle size="small" text type="success" @click="promoteToTop(designerSelected.indexOf(f))" title="提升为一级表头" />
                      <el-button v-else icon="Folder" circle size="small" text type="warning" @click="moveFieldToGroup(designerSelected.indexOf(f))" title="归入分组" />
                      <el-button icon="Close" circle size="small" type="danger" text @click="removeDesigner(designerSelected.indexOf(f))" title="移除列" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <!-- 底部统计 + 操作 -->
      <div class="designer-footer">
        <div class="footer-info">
          <span>共 <b class="footer-count">{{ designerSelected.length }}</b> 列</span>
          <el-divider direction="vertical" />
          <span>来源：{{ designerSourceName }}</span>
          <el-divider direction="vertical" />
          <span>合计行：{{ designerHasSummary ? '是' : '否' }}</span>
          <el-divider direction="vertical" />
          <span class="footer-hint">「汇总」字段由系统计算 · 保存后即可在导出中使用</span>
        </div>
        <div class="footer-btns">
          <el-button size="small" @click="designerVisible = false">取消</el-button>
          <el-button size="small" type="success" :loading="designerExporting" @click="exportDesignerDirect">
            <el-icon><Download /></el-icon>&nbsp;直接导出
          </el-button>
          <el-button size="small" type="primary" :loading="designerSaving" @click="saveDesigner">
            {{ designerIsBuiltin ? '保存为自定义模板' : '保存修改' }}
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- ═══════════ ⑥ 导出历史弹窗 ═══════════ -->
    <el-dialog v-model="logDialogVisible" title="导出历史" width="80%" append-to-body>
      <el-table v-loading="logLoading" :data="logList" border size="small" max-height="460">
        <el-table-column label="导出时间" prop="exportTime" width="150" />
        <el-table-column label="模板" prop="templateName" min-width="160" show-overflow-tooltip />
        <el-table-column label="筛选方案" prop="filterName" width="130">
          <template #default="{ row }">{{ row.filterName || '（未命名）' }}</template>
        </el-table-column>
        <el-table-column label="行数" prop="rowCount" width="70" align="right" />
        <el-table-column label="操作人" prop="exportBy" width="90" />
        <el-table-column label="文件名" prop="fileName" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" v-hasPermi="['report:report:export']" @click="handleReExport(row)">重导</el-button>
            <el-button link type="danger" size="small" v-hasPermi="['report:report:log']" @click="handleDeleteLog(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="logDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Report">
import { saveAs } from 'file-saver'
import { ElMessageBox } from 'element-plus'
import { ArrowRight, ArrowDown, Search, Download } from '@element-plus/icons-vue'
import {
  getFieldPool, listReportTemplate, getReportTemplate, saveReportTemplate, delReportTemplate,
  listReportFilter, getReportFilter, saveReportFilter, delReportFilter,
  previewReport, exportReport, exportReportByConfig, listReportLog, reExportReport, delReportLog
} from '@/api/report/report'
import { categoryTreeselect } from '@/api/project/category'

const { proxy } = getCurrentInstance()

/* ═══════════ 筛选器映射：字段池 key → 后端筛选参数 ═══════════ */
const FILTER_MAP = {
  projectCode: { widget: 'input', mapKey: 'projectCode' },
  projectName: { widget: 'input', mapKey: 'projectName' },
  engineeringProject: { widget: 'input', mapKey: 'engineeringProject' },
  clientUnit: { widget: 'input', mapKey: 'clientUnit' },
  contactName: { widget: 'input', mapKey: 'contactName' },
  contactPhone: { widget: 'input', mapKey: 'contactPhone' },
  projectLocation: { widget: 'input', mapKey: 'projectLocation' },
  leaderName: { widget: 'input', mapKey: 'leaderName' },
  projectCategoryId: { widget: 'select', mapKey: 'categoryId', source: 'category' },
  projectStatus: { widget: 'multiSelect', mapKey: 'projectStatus' },
  contractNo: { widget: 'input', mapKey: 'contractNo' },
  contractName: { widget: 'input', mapKey: 'contractName' },
  contractPeriod: { widget: 'input', mapKey: 'contractPeriod' },
  paymentTerms: { widget: 'input', mapKey: 'paymentTerms' },
  isSettled: { widget: 'select', mapKey: 'isSettled', source: 'field' },
  contractAmount: { widget: 'numberRange', range: ['contractAmountMin', 'contractAmountMax'] },
  signDate: { widget: 'daterange', range: ['signDateBegin', 'signDateEnd'] },
  entrustDate: { widget: 'daterange', range: ['entrustDateBegin', 'entrustDateEnd'] },
  auditDate: { widget: 'daterange', range: ['auditDateBegin', 'auditDateEnd'] },
  finishDate: { widget: 'daterange', range: ['finishDateBegin', 'finishDateEnd'] },
  archiveDate: { widget: 'daterange', range: ['archiveDateBegin', 'archiveDateEnd'] },
  assignDate: { widget: 'daterange', range: ['assignDateBegin', 'assignDateEnd'] },
  createTime: { widget: 'daterange', range: ['createTimeBegin', 'createTimeEnd'] },
  receivedAmount: { widget: 'numberRange', range: ['receivedAmountMin', 'receivedAmountMax'] },
  lastPayTime: { widget: 'daterange', range: ['lastPayTimeBegin', 'lastPayTimeEnd'] },
  pendingAmount: { widget: 'numberRange', range: ['pendingAmountMin', 'pendingAmountMax'] },
  totalInvoiceAmount: { widget: 'numberRange', range: ['totalInvoiceAmountMin', 'totalInvoiceAmountMax'] },
  invoiceFlag: { widget: 'select', mapKey: 'invoiceFlag', source: 'field' },
  settlementStatus: { widget: 'select', mapKey: 'settlementStatus', source: 'field' },
  debtMonths: { widget: 'number', mapKey: 'debtMonths', placeholder: '完工至今 ≥ 月数' }
}

/* ═══════════ 状态 ═══════════ */
const fieldPool = ref([])
const builtinTemplates = ref([])
const customTemplates = ref([])
const currentTemplateId = ref(null)
const currentTemplate = ref(null)
const filterSchemes = ref([])
const currentFilterId = ref(null)
const currentFilterSchemeName = ref('')
const selectedFilterKeys = ref([])     // 启用的筛选字段（有序）
const filterValues = reactive({})      // 扁平后端键 → 值（与保存的 filterConfig.values 一致）
const previewRows = ref([])
const previewTotal = ref(0)
const previewLoading = ref(false)
const headerTree = ref([])          // 多级表头树（后端 preview 返回）
const exporting = ref(false)
const categoryOptions = ref([])

/* 筛选设置弹窗 */
const filterDialogVisible = ref(false)
const filterDraft = ref([])

/* 字段设计器弹窗 */
const designerVisible = ref(false)
const designerSaving = ref(false)
const designerExporting = ref(false)
const designerName = ref('')
const designerIsBuiltin = ref(true)
const designerBaseId = ref(null)
const designerSourceName = ref('')
const designerHasSummary = ref(true)
const designerList = ref([])
const designerSearch = ref('')
const designerCollapsed = reactive({})
const designerDragIdx = ref(-1)
const designerGroupCollapsed = reactive({})
const designerRenamingGroup = ref('')
const designerRenameInput = ref('')
const designerSelectedGroup = ref('')


/* 导出历史弹窗 */
const logDialogVisible = ref(false)
const logLoading = ref(false)
const logList = ref([])

/* ═══════════ 计算属性 ═══════════ */
const isCustomTemplate = computed(() => currentTemplate.value?.templateType === 'custom')

const filterableGroups = computed(() => {
  const groups = new Map()
  fieldPool.value.forEach(f => {
    if (!f.filterable || !FILTER_MAP[f.key]) return
    if (!groups.has(f.group)) groups.set(f.group, [])
    groups.get(f.group).push(f)
  })
  return Array.from(groups.entries()).map(([name, fields]) => ({ name, fields }))
})

/* 字段库：搜索过滤后的分组 */
const filteredDesignerGroups = computed(() => {
  const kw = designerSearch.value.trim().toLowerCase()
  const groups = new Map()
  designerList.value.forEach(f => {
    if (kw && !(f.label.toLowerCase().includes(kw) || f.key.toLowerCase().includes(kw))) return
    if (!groups.has(f.group)) groups.set(f.group, [])
    groups.get(f.group).push(f)
  })
  return Array.from(groups.entries()).map(([name, fields]) => ({ name, fields }))
})

/* 字段库：分组折叠 + 已选进度 */
function toggleGroupCollapse(name) {
  designerCollapsed[name] = !designerCollapsed[name]
}
function groupSelectAll(groupName, fields) {
  const allChecked = groupCheckedCount(groupName) === fields.length
  fields.forEach(f => {
    const item = designerList.value.find(x => x.key === f.key)
    if (item) item.checked = !allChecked
  })
}
function groupCheckedCount(name) {
  return designerList.value.filter(f => f.group === name && f.checked).length
}

/* 字段来源语义（悬停提示） */
function sourceTip(src) {
  return { subject: '基础字段', agg: '系统汇总计算', dynamic: '动态扩展字段' }[src] || '字段'
}

/* 设计区：实时表头预览模型（与自定义模板导出一致：单级表头） */
const designerPreviewHeaders = computed(() => designerSelected.value.map(f => ({
  key: f.key,
  label: f.label,
  source: f.source,
  width: f.width || 14,
  headerGroup: f.headerGroup || ''
})))

/* 多级表头分组树（前端版，逻辑与后端 buildHeaderTree 一致，附带 colStart 用于 grid 定位） */
const designerHeaderTree = computed(() => {
  const headers = designerPreviewHeaders.value
  const tree = []
  let i = 0
  let colIdx = 0
  while (i < headers.length) {
    const h = headers[i]
    const g = h.headerGroup || ''
    if (!g) {
      tree.push({ type: 'leaf', leaf: h, colStart: colIdx })
      colIdx++
      i++
      continue
    }
    const children = []
    const startCol = colIdx
    while (i < headers.length && (headers[i].headerGroup || '') === g) {
      children.push({ leaf: headers[i], colStart: colIdx })
      colIdx++
      i++
    }
    tree.push({ type: 'group', label: g, children, colStart: startCol, span: children.length })
  }
  return tree
})

/* 预览是否有分组列（决定表头是单行还是两行） */
const previewHasGroup = computed(() => designerHeaderTree.value.some(n => n.type === 'group'))
function previewCellWidth(h) {
  return Math.max(64, (h.width || 14) * 9)
}
const previewGridCols = computed(() =>
  designerPreviewHeaders.value.map(h => previewCellWidth(h) + 'px').join(' ')
)

const designerSelected = computed(() => designerList.value.filter(f => f.checked))

const hasAnyFilterValue = computed(() => selectedFilterKeys.value.some(fk => {
  const meta = FILTER_MAP[fk]
  if (!meta) return false
  if (meta.widget === 'daterange' || meta.widget === 'numberRange') {
    return meta.range.some(k => filterValues[k] !== undefined && filterValues[k] !== null && filterValues[k] !== '')
  }
  const v = filterValues[meta.mapKey]
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)
}))

/* ═══════════ 初始化 ═══════════ */
async function init() {
  await Promise.all([loadFieldPool(), loadTemplates(), loadFilters(), loadCategories()])
  if (builtinTemplates.value.length) {
    currentTemplateId.value = builtinTemplates.value[0].id
    await onTemplateChange()
  }
}
init()

async function loadFieldPool() {
  const res = await getFieldPool()
  fieldPool.value = res?.data || []
}

async function loadTemplates() {
  const res = await listReportTemplate({})
  const list = res?.data || []
  builtinTemplates.value = list.filter(t => t.templateType === 'builtin')
  customTemplates.value = list.filter(t => t.templateType === 'custom')
}

async function loadFilters() {
  const res = await listReportFilter({})
  filterSchemes.value = res?.data || []
}

async function loadCategories() {
  try {
    const res = await categoryTreeselect()
    const tree = res?.data || []
    const flat = []
    const walk = (nodes, depth) => {
      ;(nodes || []).forEach(n => {
        flat.push({ value: n.id, label: (depth > 0 ? '　'.repeat(depth) : '') + n.label })
        if (n.children && n.children.length) walk(n.children, depth + 1)
      })
    }
    walk(tree, 0)
    categoryOptions.value = flat
  } catch (e) {
    categoryOptions.value = []
  }
}

function fieldPoolMeta(key) {
  return fieldPool.value.find(f => f.key === key)
}

/* ═══════════ 模板切换 / 预览 ═══════════ */
async function onTemplateChange() {
  if (!currentTemplateId.value) {
    currentTemplate.value = null
    previewRows.value = []
    previewTotal.value = 0
    headerTree.value = []
    return
  }
  previewLoading.value = true
  try {
    const res = await getReportTemplate(currentTemplateId.value)
    currentTemplate.value = res?.data || null
  } finally {
    previewLoading.value = false
  }
  doPreview()
}

let previewTimer = null
function debouncePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => doPreview(), 400)
}

async function doPreview() {
  if (!currentTemplateId.value) return
  previewLoading.value = true
  try {
    const res = await previewReport({ templateId: currentTemplateId.value, filter: buildBackendFilter() })
    const d = res?.data || {}
    currentTemplate.value = d.template
    previewTotal.value = d.total || 0
    headerTree.value = d.headerTree || []
    previewRows.value = (d.rows || []).map(arr => {
      const o = {}
      ;(arr || []).forEach((v, i) => { o['c' + i] = v })
      return o
    })
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    previewLoading.value = false
  }
}

/* ═══════════ 筛选值构建（后端扁平键） ═══════════ */
function buildBackendFilter(withName = false) {
  const f = {}
  selectedFilterKeys.value.forEach(fk => {
    const meta = FILTER_MAP[fk]
    if (!meta) return
    if (meta.widget === 'daterange') {
      const b = filterValues[meta.range[0]]
      const e = filterValues[meta.range[1]]
      if (b) f[meta.range[0]] = b
      if (e) f[meta.range[1]] = e
    } else if (meta.widget === 'numberRange') {
      const b = filterValues[meta.range[0]]
      const e = filterValues[meta.range[1]]
      if (b !== undefined && b !== null && b !== '') f[meta.range[0]] = String(b)
      if (e !== undefined && e !== null && e !== '') f[meta.range[1]] = String(e)
    } else {
      const v = filterValues[meta.mapKey]
      if (v === undefined || v === null || v === '') return
      f[meta.mapKey] = Array.isArray(v) ? v.join(',') : String(v)
    }
  })
  if (withName && currentFilterSchemeName.value) f._filterName = currentFilterSchemeName.value
  return f
}

function selectOptions(fk) {
  const meta = FILTER_MAP[fk]
  if (meta.source === 'category') return Object.fromEntries(categoryOptions.value.map(o => [o.value, o.label]))
  const pool = fieldPoolMeta(fk)
  return pool?.options || {}
}

function dateRangeValue(fk) {
  const meta = FILTER_MAP[fk]
  const b = filterValues[meta.range[0]]
  const e = filterValues[meta.range[1]]
  return b && e ? [b, e] : null
}

/* 受控绑定辅助：v-model 的目标必须是简单 member expression（a.b / a[key]），
   动态字段筛选统一用 :model-value + @update:model-value 替代 v-model 动态索引（fv/setFv） */
function fv(key) {
  return filterValues[key] ?? null
}
function setFv(key, val) {
  filterValues[key] = val ?? null
}

function onDateRangeChange(fk, val) {
  const meta = FILTER_MAP[fk]
  if (val && val.length === 2) {
    filterValues[meta.range[0]] = val[0]
    filterValues[meta.range[1]] = val[1]
  } else {
    filterValues[meta.range[0]] = null
    filterValues[meta.range[1]] = null
  }
  debouncePreview()
}

function clearFilterValues() {
  Object.keys(filterValues).forEach(k => { filterValues[k] = null })
  debouncePreview()
}

/* ═══════════ 筛选方案 ═══════════ */
async function onFilterChange(id) {
  currentFilterId.value = id
  if (!id) {
    currentFilterSchemeName.value = ''
    clearFilterValues()
    return
  }
  const res = await getReportFilter(id)
  const detail = res?.data || {}
  let cfg = {}
  try { cfg = JSON.parse(detail.filterConfig || '{}') } catch (e) { cfg = {} }
  selectedFilterKeys.value = (cfg.selected || []).filter(k => FILTER_MAP[k])
  clearFilterValues()
  Object.keys(cfg.values || {}).forEach(k => { filterValues[k] = cfg.values[k] })
  currentFilterSchemeName.value = detail.filterName
  clearTimeout(previewTimer)
  doPreview()
}

async function saveFilterScheme() {
  const isUpdate = !!currentFilterId.value
  const { value } = await ElMessageBox.prompt(
    isUpdate ? `将更新方案「${currentFilterSchemeName.value}」的筛选配置` : '新建一个筛选方案（保存当前启用的筛选器与已填写的值）',
    '保存筛选方案',
    { confirmButtonText: isUpdate ? '更新方案' : '保存方案', cancelButtonText: '取消', inputValue: currentFilterSchemeName.value || '' }
  )
  if (!value || !value.trim()) return
  const payload = {
    filterName: value.trim(),
    filterConfig: JSON.stringify({ selected: [...selectedFilterKeys.value], values: buildBackendFilter() })
  }
  if (isUpdate) payload.id = currentFilterId.value
  await saveReportFilter(payload)
  proxy.$modal.msgSuccess(isUpdate ? '筛选方案已更新' : '筛选方案已保存')
  await loadFilters()
  if (isUpdate) {
    currentFilterSchemeName.value = value.trim()
  } else {
    const match = filterSchemes.value.find(s => s.filterName === value.trim())
    currentFilterId.value = match ? match.id : null
    currentFilterSchemeName.value = value.trim()
  }
}

/* ═══════════ 筛选设置弹窗 ═══════════ */
function openFilterDialog() {
  filterDraft.value = [...selectedFilterKeys.value]
  filterDialogVisible.value = true
}

function toggleDraftField(key, checked) {
  if (checked) {
    if (!filterDraft.value.includes(key)) filterDraft.value.push(key)
  } else {
    filterDraft.value = filterDraft.value.filter(k => k !== key)
  }
}

function moveDraft(idx, dir) {
  const j = idx + dir
  if (j < 0 || j >= filterDraft.value.length) return
  const arr = filterDraft.value
  const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp
}

function removeDraft(idx) {
  filterDraft.value.splice(idx, 1)
}

function confirmFilterDialog() {
  selectedFilterKeys.value = [...filterDraft.value]
  filterDialogVisible.value = false
  doPreview()
}

/* ═══════════ 字段设计器 ═══════════ */
function openDesigner() {
  if (!currentTemplateId.value) { proxy.$modal.msgWarning('请先选择模板'); return }
  const tpl = currentTemplate.value
  if (!tpl) return
  const isBuiltin = tpl.templateType === 'builtin'
  designerIsBuiltin.value = isBuiltin
  designerBaseId.value = isBuiltin ? tpl.id : (tpl.sourceTemplateId || null)
  designerSourceName.value = isBuiltin ? tpl.templateName : (builtinTemplates.value.find(t => t.id === tpl.sourceTemplateId)?.templateName || '未知')
  designerName.value = isBuiltin ? tpl.templateName + '（自定义版）' : tpl.templateName
  designerHasSummary.value = tpl.hasSummaryRow === 'Y'
  // 已选 = 模板现有字段（按模板顺序），未选 = 其余字段池（按池顺序）
  const list = []
  const seen = new Set()
  ;(tpl.fieldList || []).forEach(f => {
    const meta = fieldPoolMeta(f.fieldKey)
    list.push({
      key: f.fieldKey,
      label: meta ? meta.label : (f.fieldLabel || f.fieldKey),
      source: meta ? meta.source : (f.fieldSource || 'subject'),
      group: meta ? meta.group : '其他',
      type: meta ? meta.type : 'string',
      width: f.width || 14,
      headerGroup: f.headerGroup || '',
      checked: true
    })
    seen.add(f.fieldKey)
  })
  fieldPool.value.forEach(meta => {
    if (seen.has(meta.key)) return
    list.push({ key: meta.key, label: meta.label, source: meta.source, group: meta.group, type: meta.type, width: 14, checked: false })
  })
  designerList.value = list
  designerSearch.value = ''
  Object.keys(designerCollapsed).forEach(k => delete designerCollapsed[k])
  designerVisible.value = true
}

function designerChecked(key) {
  return designerList.value.find(f => f.key === key)?.checked || false
}

function toggleDesignerField(key, checked) {
  const f = designerList.value.find(x => x.key === key)
  if (f) f.checked = checked
}

function moveDesigner(idx, dir) {
  const selected = designerSelected.value
  const j = idx + dir
  if (j < 0 || j >= selected.length) return
  const arr = designerList.value
  const a = selected[idx]
  const b = selected[j]
  const ia = arr.indexOf(a)
  const ib = arr.indexOf(b)
  const tmp = arr[ia]; arr[ia] = arr[ib]; arr[ib] = tmp
}

function removeDesigner(idx) {
  const f = designerSelected.value[idx]
  if (f) f.checked = false
}

/* 拖拽排序（原生 HTML5 drag & drop，无需额外依赖） */
function designerDragStart(idx) {
  designerDragIdx.value = idx
}
function designerDrop(idx) {
  const from = designerDragIdx.value
  designerDragIdx.value = -1
  if (from < 0 || from === idx) return
  const selected = designerSelected.value
  if (idx < 0 || idx >= selected.length) return
  const arr = designerList.value
  const a = selected[from]
  const b = selected[idx]
  const ia = arr.indexOf(a)
  const ib = arr.indexOf(b)
  if (ia < 0 || ib < 0) return
  const tmp = arr[ia]; arr[ia] = arr[ib]; arr[ib] = tmp
}

/* 恢复来源模板的默认列配置（一键还原） */
function resetDesigner() {
  const tpl = currentTemplate.value
  if (!tpl) return
  const srcTpl = tpl.templateType === 'builtin'
    ? tpl
    : builtinTemplates.value.find(t => t.id === tpl.sourceTemplateId)
  if (!srcTpl || !srcTpl.fieldList?.length) {
    proxy.$modal.msgWarning('来源模板没有可用字段')
    return
  }
  const ordered = []
  const seen = new Set()
  srcTpl.fieldList.forEach(f => {
    const meta = designerList.value.find(x => x.key === f.fieldKey)
    if (meta) {
      meta.checked = true
      meta.label = fieldPoolMeta(f.fieldKey)?.label || f.fieldLabel || f.fieldKey
      meta.width = f.width || 14
      ordered.push(meta)
      seen.add(f.fieldKey)
    }
  })
  designerList.value.forEach(f => {
    if (!seen.has(f.key)) f.checked = false
  })
  const rest = designerList.value.filter(f => !ordered.includes(f))
  designerList.value = [...ordered, ...rest]
  proxy.$modal.msgSuccess('已恢复为来源模板的默认列')
}

/* ============== 分组操作 ============== */

/* 分组列表：从 designerSelected 中按首次出现顺序汇总分组名 */
const designerGroupList = computed(() => {
  const map = new Map()
  designerSelected.value.forEach(f => {
    const g = f.headerGroup || ''
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(f)
  })
  return Array.from(map.entries()).map(([name, fields]) => ({ name, fields }))
})

/* 切换设计器分组折叠（注意：不与字段库 toggleGroupCollapse 重名） */
function toggleDesignerGroupCollapse(groupName) {
  designerGroupCollapsed[groupName] = !designerGroupCollapsed[groupName]
}

/* 新建分组：默认将所有未分组字段归入，也可传入指定 keys */
async function createNewGroup(selectedKeys = null) {
  const msg = (selectedKeys && selectedKeys.length)
    ? '将选中的 ' + selectedKeys.length + ' 个字段归入新分组，请输入分组名称：'
    : '新建分组，请输入分组名称（分组内的未分组字段将自动归入）：';
  try {
    const { value } = await proxy.$modal.prompt(msg, '新建分组',{ confirmButtonText: '创建', cancelButtonText: '取消' });
    if (!value || !value.trim()) return;
    const name = value.trim();
    const keysToMove = new Set( (selectedKeys && selectedKeys.length) ? selectedKeys : designerSelected.value.filter(f => !f.headerGroup).map(f => f.key) );
    designerSelected.value.forEach(f => { if (keysToMove.has(f.key)) f.headerGroup = name; });
    designerGroupCollapsed[name] = false;
    proxy.$modal.msgSuccess('分组已创建');
  } catch (e) { /* 取消 */ }
}

/* 解散分组：组内字段变为一级表头 */
function disbandGroup(groupName) {
  if (!groupName) return;
  designerSelected.value.forEach(f => {
    if ((f.headerGroup || '') === groupName) f.headerGroup = '';
  });
  delete designerGroupCollapsed[groupName];
  proxy.$modal.msgSuccess('分组已解散，字段提升为一级表头');
}

/* 进入重命名模式 */
function startRenameGroup(groupName) {
  designerRenamingGroup.value = groupName;
  designerRenameInput.value = groupName;
  setTimeout(() => {
    const el = document.querySelector('.col-group-rename-input input, .col-group-rename-input');
    if (el) { el.focus && el.focus(); if (el.select) el.select(); }
  }, 60);
}

/* 完成重命名 */
function finishRenameGroup(groupName) {
  const newName = designerRenameInput.value.trim();
  if (!newName) { designerRenamingGroup.value = ''; return; }
  if (newName === groupName) { designerRenamingGroup.value = ''; return; }
  const otherGroups = designerGroupList.value.filter(x => x.name && x.name !== groupName).map(x => x.name);
  if (otherGroups.includes(newName)) { proxy.$modal.msgError('分组名称已存在'); return; }
  designerSelected.value.forEach(f => {
    if ((f.headerGroup || '') === groupName) f.headerGroup = newName;
  });
  designerGroupCollapsed[newName] = designerGroupCollapsed[groupName];
  delete designerGroupCollapsed[groupName];
  designerRenamingGroup.value = '';
  proxy.$modal.msgSuccess('分组已重命名');
}

/* 跨分组拖拽：拖放到目标分组 */
function dropToGroup(groupName) {
  const fromIdx = designerDragIdx.value;
  designerDragIdx.value = -1;
  designerSelectedGroup.value = '';
  if (fromIdx < 0) return;
  const f = designerSelected.value[fromIdx];
  if (!f) return;
  const newGroup = groupName || '';
  if ((f.headerGroup || '') === newGroup) return;
  f.headerGroup = newGroup;
}

/* 分组拖放高亮 */
function onGroupDragEnter(name) { designerSelectedGroup.value = name; }
function onGroupDragLeave() { designerSelectedGroup.value = ''; }

/* 将单个字段提升为一级表头（快捷操作） */
function promoteToTop(idx) {
  const f = designerSelected.value[idx];
  if (f && f.headerGroup) { f.headerGroup = ''; proxy.$modal.msgSuccess('已提升为一级表头'); }
}

/* 将单个字段归入现有分组（用对话框选择序号） */
async function moveFieldToGroup(idx) {
  const f = designerSelected.value[idx];
  if (!f) return;
  const existing = designerGroupList.value.filter(x => x.name && x.name !== (f.headerGroup || '')).map(x => x.name);
  if (!existing.length) { createNewGroup([f.key]); return; }
  const lf = String.fromCharCode(10);
  const options = existing.map((n, i) => (i + 1) + '. ' + n).join(lf);
  try {
    const { value } = await proxy.$modal.prompt(
      '请选择要归入的分组（输入序号）：' + lf + options + lf + lf + '（留空或点取消则创建新分组）',
      '移动字段到分组',
      { confirmButtonText: '确定', cancelButtonText: '取消', inputPlaceholder: '输入 1-' + existing.length }
    );
    if (!value) { createNewGroup([f.key]); return; }
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 1 || n > existing.length) { proxy.$modal.msgError('序号无效'); return; }
    f.headerGroup = existing[n - 1];
    proxy.$modal.msgSuccess('已移动到分组「' + existing[n - 1] + '」');
  } catch (e) { /* 取消 */ }
}

async function saveDesigner() {
  if (!designerName.value.trim()) { proxy.$modal.msgError('请填写模板名称'); return }
  const selected = designerSelected.value
  if (!selected.length) { proxy.$modal.msgError('请至少勾选一个导出字段'); return }
  designerSaving.value = true
  try {
    const payload = {
      templateType: 'custom',
      subjectTable: 'proj_project',
      sourceTemplateId: designerBaseId.value || null,
      templateName: designerName.value.trim(),
      hasSummaryRow: designerHasSummary.value ? 'Y' : 'N',
      fieldList: selected.map((f, i) => ({
        fieldKey: f.key,
        fieldLabel: f.label,
        fieldSource: f.source,
        width: f.width || 14,
        headerGroup: f.headerGroup || null,
        sortOrder: i + 1
      }))
    }
    if (!designerIsBuiltin.value && currentTemplateId.value) payload.id = currentTemplateId.value
    const res = await saveReportTemplate(payload)
    const id = res?.data
    proxy.$modal.msgSuccess(designerIsBuiltin.value ? '自定义模板已创建' : '模板已更新')
    designerVisible.value = false
    await loadTemplates()
    currentTemplateId.value = id
    await onTemplateChange()
  } finally {
    designerSaving.value = false
  }
}

/* 直接导出（不保存模板） */
async function exportDesignerDirect() {
  const selected = designerSelected.value
  if (!selected.length) { proxy.$modal.msgError('请至少勾选一个导出字段'); return }
  designerExporting.value = true
  try {
    const tplName = designerName.value.trim() || '临时导出'
    const payload = {
      template: {
        templateType: 'custom',
        subjectTable: 'proj_project',
        sourceTemplateId: designerBaseId.value || null,
        templateName: tplName,
        hasSummaryRow: designerHasSummary.value ? 'Y' : 'N',
        fieldList: selected.map((f, i) => ({
          fieldKey: f.key,
          fieldLabel: f.label,
          fieldSource: f.source,
          width: f.width || 14,
          headerGroup: f.headerGroup || null,
          sortOrder: i + 1
        }))
      },
      filter: buildBackendFilter(true)
    }
    const blob = await exportReportByConfig(payload)
    if (blob.type && blob.type.includes('application/json')) {
      const text = await blob.text()
      let msg = '导出失败'
      try { msg = JSON.parse(text).msg || msg } catch (e) { /* ignore */ }
      proxy.$modal.msgError(msg)
      return
    }
    const time = formatStamp()
    saveAs(new Blob([blob]), `${tplName}_${time}.xlsx`)
    proxy.$modal.msgSuccess('导出成功')
    designerVisible.value = false
    loadLogs()
  } catch (e) {
    proxy.$modal.msgError('导出失败，请稍后重试')
  } finally {
    designerExporting.value = false
  }
}

async function handleDeleteTemplate() {
  if (!currentTemplateId.value) return
  await proxy.$modal.confirm(`确定删除自定义模板「${currentTemplate.value?.templateName}」吗？`)
  await delReportTemplate(currentTemplateId.value)
  proxy.$modal.msgSuccess('模板已删除')
  currentTemplateId.value = null
  currentTemplate.value = null
  previewRows.value = []
  previewTotal.value = 0
  await loadTemplates()
  if (builtinTemplates.value.length) {
    currentTemplateId.value = builtinTemplates.value[0].id
    await onTemplateChange()
  }
}

/* ═══════════ 导出 ═══════════ */
async function handleExport() {
  if (!currentTemplateId.value) { proxy.$modal.msgWarning('请先选择报表模板'); return }
  const tpl = currentTemplate.value
  const suffix = tpl?.templateType === 'custom'
    ? '.xlsx'
    : ((tpl?.templateFile || '').toLowerCase().endsWith('.xls') ? '.xls' : '.xlsx')
  const filename = `${tpl?.templateName || '报表'}_${formatStamp()}_${suffix}`
  exporting.value = true
  try {
    const blob = await exportReport({ templateId: currentTemplateId.value, filter: buildBackendFilter(true) })
    if (blob.type && blob.type.includes('application/json')) {
      const text = await blob.text()
      let msg = '导出失败'
      try { msg = JSON.parse(text).msg || msg } catch (e) { /* ignore */ }
      proxy.$modal.msgError(msg)
      return
    }
    saveAs(new Blob([blob]), filename)
    proxy.$modal.msgSuccess(`导出成功：${previewTotal.value} 条`)
    loadLogs()
  } catch (e) {
    proxy.$modal.msgError('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

/* ═══════════ 导出历史 ═══════════ */
function openLogDialog() {
  logDialogVisible.value = true
  loadLogs()
}

async function loadLogs() {
  logLoading.value = true
  try {
    const res = await listReportLog({})
    logList.value = (res?.data || []).slice(0, 100)
  } finally {
    logLoading.value = false
  }
}

async function handleReExport(row) {
  try {
    const blob = await reExportReport(row.id)
    if (blob.type && blob.type.includes('application/json')) {
      const text = await blob.text()
      let msg = '重导失败'
      try { msg = JSON.parse(text).msg || msg } catch (e) { /* ignore */ }
      proxy.$modal.msgError(msg)
      return
    }
    saveAs(new Blob([blob]), row.fileName || `export_${Date.now()}.xlsx`)
    proxy.$modal.msgSuccess('已按原模板与原筛选重新导出')
  } catch (e) {
    proxy.$modal.msgError('重导失败，请稍后重试')
  }
}

async function handleDeleteLog(row) {
  await proxy.$modal.confirm(`确定删除该导出记录（${row.fileName}）吗？`)
  await delReportLog(row.id)
  proxy.$modal.msgSuccess('记录已删除')
  loadLogs()
}

/* ═══════════ 工具函数 ═══════════ */
function formatCell(v) {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') {
    if (v > 1e11) return formatDate(new Date(v))
    return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  }
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

function formatDate(d) {
  const pad = n => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatStamp() {
  const d = new Date()
  const pad = n => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function isNumberFieldKey(fieldKey) {
  return fieldPoolMeta(fieldKey)?.type === 'number'
}

/* 表头叶子节点最小列宽：Excel 列宽(字符) → 预览 px（窄列保底） */
function leafWidth(leaf) {
  const w = leaf.width || 14
  return Math.max(90, Math.min(w * 9, 320))
}
</script>

<style scoped lang="scss">
.report-workbench {
  .toolbar-card {
    margin-bottom: 12px;
  }
  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .t-label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      white-space: nowrap;
    }
    .toolbar-right {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }
  }

  /* 筛选条件区 */
  .filter-area {
    margin-top: 14px;
    border-top: 1px dashed var(--el-border-color);
    padding-top: 10px;
    .filter-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      .filter-title { font-weight: 600; font-size: 13px; }
      .filter-scheme { font-size: 12px; color: var(--el-color-primary); }
    }
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 8px 12px;
      .filter-item {
        display: flex;
        align-items: center;
        gap: 6px;
        .filter-label {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          white-space: nowrap;
          min-width: 60px;
          text-align: right;
        }
        .range-pair {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          .range-sep { color: var(--el-text-color-placeholder); font-size: 12px; }
        }
      }
    }
  }
  .filter-empty {
    margin-top: 8px;
    border-top: 1px dashed var(--el-border-color);
    padding-top: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--el-text-color-placeholder);
    font-size: 13px;
  }

  /* 预览区 */
  .preview-card {
    .preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      .preview-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        .preview-title { font-size: 15px; font-weight: 600; }
        .preview-limit { font-size: 12px; color: var(--el-text-color-secondary); }
      }
    }
    .col-preview {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
      .col-group {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 6px;
        border: 1px dashed var(--el-color-primary);
        border-radius: 4px;
        background: var(--el-color-primary-light-9);
        .group-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--el-color-primary);
          white-space: nowrap;
        }
        .group-chips {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 4px;
        }
      }
      .col-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        font-size: 12px;
        border: 1px solid var(--el-border-color);
        border-radius: 4px;
        background: var(--el-fill-color-light);
        color: var(--el-text-color-regular);
        .col-order {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          background: var(--el-color-primary);
          color: #fff;
          font-size: 11px;
          padding: 0 4px;
        }
      }
    }
    .cell-number {
      font-variant-numeric: tabular-nums;
      color: var(--el-text-color-regular);
    }
  }
}

  /* 弹窗公共布局（筛选设置弹窗） */
  .filter-config-body {
    display: flex;
    gap: 12px;
    height: 420px;
    .config-panel {
      flex: 1;
      border: 1px solid var(--el-border-color);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      .panel-title {
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 600;
        background: var(--el-fill-color-light);
        border-bottom: 1px solid var(--el-border-color);
      }
      .panel-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
        .group-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--el-color-primary);
          margin: 8px 0 4px;
          &:first-child { margin-top: 0; }
        }
        .field-checkbox {
          display: flex;
          align-items: center;
          margin: 0 0 2px;
          width: 100%;
          :deep(.el-checkbox__label) { font-size: 12px; }
        }
        .panel-empty {
          color: var(--el-text-color-placeholder);
          font-size: 12px;
          text-align: center;
          padding: 30px 0;
        }
        .order-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
          border-bottom: 1px dashed var(--el-border-color-lighter);
          &:last-child { border-bottom: none; }
          .order-label {
            flex: 1;
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .col-label-input { flex: 1; }
        }
      }
    }
  }

  /* ═══════════ 字段设计器（所见即所得） ═══════════ */
  .designer-head {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    flex-wrap: wrap;
    .designer-name { display: flex; align-items: center; gap: 8px; }
    .designer-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: auto;
      .meta-source {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
      .summary-switch {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--el-text-color-regular);
      }
    }
  }

  .designer-body {
    display: flex;
    gap: 12px;
    flex: 1;          /* 自适应撑满 body 剩余空间（原 height:420px 写死） */
    min-height: 0;    /* flex 子项必须设 min-height:0 才能正确收缩/滚动 */

    /* 左：字段库 */
    .designer-pool {
      width: 300px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      .pool-search {
        padding-bottom: 8px;
      }
      .pool-legend {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 4px 8px;
        font-size: 11px;
        color: var(--el-text-color-secondary);
        border-bottom: 1px solid var(--el-border-color-lighter);
        margin-bottom: 8px;
        .legend-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          margin-right: 2px;
        }
      }
      .pool-scroll {
        flex: 1;
        overflow-y: auto;
        padding-right: 4px;
        .pool-group-card {
          background: #fff;
          border: 1px solid var(--el-border-color);
          border-radius: 8px;
          margin-bottom: 10px;
          overflow: hidden;
          .pool-group-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            background: var(--el-fill-color-light);
            cursor: pointer;
            user-select: none;
            .pool-group-left {
              display: flex;
              align-items: center;
              gap: 6px;
              .pool-group-arrow {
                font-size: 12px;
                color: var(--el-text-color-placeholder);
                transition: transform 0.15s;
                &.is-open { transform: rotate(90deg); }
              }
              .pool-group-name {
                font-size: 13px;
                font-weight: 600;
                color: var(--el-text-color-primary);
              }
            }
            .pool-group-right {
              display: flex;
              align-items: center;
              gap: 8px;
              .pool-group-count {
                font-size: 11px;
                color: var(--el-text-color-secondary);
                background: #fff;
                border: 1px solid var(--el-border-color-lighter);
                border-radius: 10px;
                padding: 0 8px;
                line-height: 18px;
                &.is-full { background: var(--el-color-success-light-9); color: var(--el-color-success); border-color: var(--el-color-success-light-5); }
              }
              .group-quick-btn {
                font-size: 11px;
                padding: 0;
                height: auto;
              }
            }
          }
          .pool-group-body {
            padding: 6px 8px 8px;
            .pool-field {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 6px 8px;
              border-radius: 4px;
              cursor: pointer;
              transition: background 0.1s;
              &:hover { background: var(--el-fill-color-light); }
              &.is-checked {
                background: var(--el-color-primary-light-9);
                border-left: 3px solid var(--el-color-primary);
                padding-left: 5px;
              }
              .field-label {
                flex: 1;
                font-size: 13px;
                color: var(--el-text-color-regular);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }
        }
        .pool-empty {
          text-align: center;
          color: var(--el-text-color-placeholder);
          font-size: 12px;
          padding: 30px 0;
        }
      }
    }

    /* 右：设计区 */
    .designer-stage {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;        /* 预览与列管理间距 12px -> 8px */

      /* 实时表头预览 */
      .stage-preview {
        border: 1px solid var(--el-border-color);
        border-radius: 8px;
        overflow: hidden;
        .stage-preview-title {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          background: var(--el-fill-color-light);
          border-bottom: 1px solid var(--el-border-color);
          .preview-count {
            margin-left: auto;
            font-weight: 400;
            font-size: 12px;
            color: var(--el-color-primary);
          }
        }
        .preview-canvas {
          padding: 10px 12px;
          overflow-x: auto;
          .preview-empty {
            text-align: center;
            color: var(--el-text-color-placeholder);
            font-size: 12px;
            padding: 22px 0;
            border: 1px dashed var(--el-border-color);
            border-radius: 4px;
          }
          .preview-header-grid {
            display: grid;
            min-width: max-content;
            border: 1px solid var(--el-border-color);
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            overflow: hidden;
            .preview-group-cell {
              padding: 6px 10px;
              background: #ebeef5;
              border-right: 1px solid var(--el-border-color);
              border-bottom: 1px solid var(--el-border-color);
              font-size: 12px;
              font-weight: 600;
              color: var(--el-text-color-primary);
              text-align: center;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .preview-field-cell {
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 6px 10px;
              background: #f5f7fa;
              border-right: 1px solid var(--el-border-color);
              font-size: 12px;
              font-weight: 600;
              color: var(--el-text-color-primary);
              .cell-label {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
            .preview-cell-span2 {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              padding: 6px 10px;
              background: #f5f7fa;
              border-right: 1px solid var(--el-border-color);
              font-size: 12px;
              font-weight: 600;
              color: var(--el-text-color-primary);
              .cell-label {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }
          .preview-header-row {
            display: flex;
            min-width: max-content;
            border: 1px solid var(--el-border-color);
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            overflow: hidden;
            .preview-cell {
              display: flex;
              align-items: center;
              gap: 5px;
              padding: 8px 10px;
              background: #f5f7fa;
              border-right: 1px solid var(--el-border-color);
              font-size: 12px;
              font-weight: 600;
              color: var(--el-text-color-primary);
              flex-shrink: 0;
              &:last-child { border-right: none; }
              .cell-label {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }
          .preview-data-row {
            display: grid;
            border: 1px solid var(--el-border-color);
            border-bottom: none;
            .preview-data-cell {
              padding: 6px 10px;
              font-size: 11px;
              color: var(--el-text-color-placeholder);
              border-right: 1px solid var(--el-border-color-lighter);
              border-bottom: 1px solid var(--el-border-color-lighter);
              &:last-child { border-right: none; }
            }
          }
          .preview-summary-row {
            display: grid;
            border: 1px solid var(--el-border-color);
            border-radius: 0 0 4px 4px;
            .preview-summary-cell {
              padding: 5px 10px;
              font-size: 11px;
              color: var(--el-color-success);
              font-weight: 600;
              background: var(--el-color-success-light-9);
              border-right: 1px solid var(--el-border-color-lighter);
              &:last-child { border-right: none; }
            }
          }
        }
      }

      /* 列管理（分组式） */
      .stage-list {
        flex: 1;
        min-height: 0;
        border: 1px solid var(--el-border-color);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        .stage-list-title {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          background: var(--el-fill-color-light);
          border-bottom: 1px solid var(--el-border-color);
          flex-wrap: nowrap;
          white-space: nowrap;
          .stage-list-tip {
            margin-left: auto;
            font-weight: 400;
            font-size: 11px;
            color: var(--el-text-color-placeholder);
            white-space: nowrap;
          }
        }
        .stage-list-body {
          flex: 1;
          overflow-y: auto;
          padding: 6px;
          .stage-empty {
            text-align: center;
            color: var(--el-text-color-placeholder);
            font-size: 12px;
            padding: 24px 0;
          }

          /* 分组块 */
          .col-group-block {
            margin-bottom: 8px;
            border: 1px dashed transparent;
            border-radius: 6px;
            transition: all 0.15s;
            &.is-group-hover {
              border-color: var(--el-color-primary);
              background: var(--el-color-primary-light-9);
            }
            &:last-child { margin-bottom: 0; }

            /* 分组头 */
            .col-group-header {
              display: flex;
              align-items: center;
              padding: 5px 8px;
              margin-bottom: 2px;
              border-radius: 4px;
              background: linear-gradient(90deg, var(--el-fill-color-light), transparent);
              font-size: 12px;
              .group-fold {
                display: flex; align-items: center; justify-content: center;
                width: 20px; height: 20px; cursor: pointer;
                margin-right: 4px; border-radius: 3px;
                &:hover { background: var(--el-fill-color); }
                .el-icon { font-size: 12px; color: var(--el-text-color-secondary); }
              }
              .group-name {
                font-weight: 600; color: var(--el-text-color-primary);
                font-size: 13px; cursor: text;
              }
              .group-count {
                margin-left: 8px; padding: 0 6px;
                background: var(--el-fill-color); border-radius: 10px;
                font-size: 11px; color: var(--el-text-color-secondary);
                line-height: 18px;
              }
              .group-drop-hint {
                margin-left: 12px; font-size: 11px;
                color: var(--el-color-primary); font-weight: 500;
              }
              .group-actions {
                margin-left: auto;
                display: flex; gap: 2px;
              }
              .col-group-rename-input {
                width: 180px; margin-right: 8px;
              }
            }

            /* 未分组区标题 */
            &.is-ungrouped > .col-group-ungrouped-title {
              background: linear-gradient(90deg, var(--el-color-success-light-9), transparent);
              .group-name {
                color: var(--el-color-success); font-weight: 600; font-size: 12px;
              }
            }

            /* 组内字段列表 */
            .col-group-items {
              padding: 0 0 0 4px;
            }

            /* 字段行 */
            .col-manage-row {
              display: flex; align-items: center; gap: 0;
              padding: 4px 6px 4px 18px;
              border-radius: 4px;
              border-bottom: 1px dashed var(--el-border-color-lighter);
              position: relative;
              &:before {
                content: ''; position: absolute; left: 6px; top: 8px; bottom: 0;
                width: 1px; background: var(--el-border-color-lighter);
              }
              &:last-child { border-bottom: none; &:before { display: none; } }
              &:hover { background: var(--el-fill-color-light); }
              &.is-dragging { opacity: 0.5; background: var(--el-color-primary-light-9); }
              .drag-handle {
                width: 14px; height: 20px; cursor: grab; flex-shrink: 0;
                background-image: radial-gradient(circle, var(--el-text-color-placeholder) 1.5px, transparent 1.5px);
                background-size: 6px 6px; background-position: 0 2px;
                opacity: 0.7; margin-right: 8px;
                &:hover { opacity: 1; }
                &:active { cursor: grabbing; }
              }
              .col-label-input { flex: 1; min-width: 0; margin-right: 12px; }
              .col-width-label {
                font-size: 12px; color: var(--el-text-color-regular);
                font-weight: 500; white-space: nowrap;
                background: var(--el-fill-color-light);
                border: 1px solid var(--el-border-color-lighter);
                border-radius: 4px 0 0 4px;
                height: 28px; line-height: 28px;
                padding: 0 6px; border-right: none; flex-shrink: 0;
              }
              .col-width-unit {
                font-size: 12px; color: var(--el-text-color-secondary);
                white-space: nowrap;
                background: var(--el-fill-color-light);
                border: 1px solid var(--el-border-color-lighter);
                border-radius: 0 4px 4px 0;
                height: 28px; line-height: 28px;
                padding: 0 6px; border-left: none;
                margin-left: -1px; flex-shrink: 0;
              }
              .row-actions {
                margin-left: 8px; display: flex; gap: 2px; flex-shrink: 0;
              }
            }
          }
        }
      }
    }
  /* 穿透 el-input-number，使其和左右标签无缝贴合 */
  :deep(.col-width-label + .el-input-number .el-input__wrapper) {
    border-radius: 0;
    border-left: none;
    border-right: none;
    box-shadow: none;
  }
  :deep(.col-width-label + .el-input-number .el-input__inner) {
    text-align: center;
  }
  :deep(.col-manage-row .el-input-number) {
    width: 96px !important;
  }
  }

  /* 底部统计 + 操作 */
  .designer-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    .footer-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--el-text-color-secondary);
      .footer-count {
        font-size: 14px;
        color: var(--el-color-primary);
      }
      .footer-hint {
        color: var(--el-text-color-placeholder);
      }
    }
    .footer-btns {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }
  }

  /* 字段来源色点语义（基础=蓝 / 汇总=橙 / 动态=紫） */
  .field-dot, .cell-dot, .legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .field-dot.src-subject, .cell-dot.src-subject, .legend-dot.src-subject { background: #409eff; }
  .field-dot.src-agg, .cell-dot.src-agg, .legend-dot.src-agg { background: #e6a23c; }
  .field-dot.src-dynamic, .cell-dot.src-dynamic, .legend-dot.src-dynamic { background: #a855f7; }
  .field-dot.src-dynamic, .cell-dot.src-dynamic { background: #9254de; }
</style>
<style lang="scss">
/* 字段设计器弹窗：append-to-body → 脱离 scoped 样式，所以用非 scoped 全局样式。
   注意：el-dialog 的 class 属性会 fallthrough 到 .el-dialog 元素自身上（不是外层 overlay），
   所以必须用复合选择器 .el-dialog.report-designer-dialog（同一元素两个 class），
   而不是后代选择器 .report-designer-dialog .el-dialog（那要求父子关系，匹配不到）。 */
.el-dialog.report-designer-dialog {
  height: 90vh;
  max-height: 90vh;
  margin: 5vh auto !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  .el-dialog__header {
    flex-shrink: 0;
    padding: 6px 16px 6px;    /* 缩小 header padding（原 14px 12px → 6px 6px，高度约减半） */
    margin-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
  .el-dialog__header .el-dialog__title {
    font-size: 15px;
    line-height: 0.7;
  }
  .el-dialog__headerbtn {
    top: 6px;                 /* 关闭按钮同步上移，与缩小后的 header 对齐 */
  }
  .el-dialog__body {
    flex: 1;
    padding: 8px 12px;    /* 缩小 body padding，给编辑区更多空间 */
    overflow: hidden;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  .el-dialog__footer {
    display: none;   /* 隐藏空的原生 footer（实际按钮在 body 内的 .designer-footer） */
  }
}
</style>

