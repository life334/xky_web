<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="任务" prop="taskId">
        <el-select v-model="queryParams.taskId" placeholder="请选择任务" clearable filterable style="width: 200px" @change="handleQuery">
          <el-option
            v-for="t in taskOptions"
            :key="t.taskId"
            :label="t.taskName"
            :value="t.taskId" />
        </el-select>
      </el-form-item>
      <el-form-item label="图斑名称" prop="parcelName">
        <el-input v-model="queryParams.parcelName" placeholder="请输入图斑名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <!-- <el-form-item label="乡镇" prop="xzqmc">
        <el-input v-model="queryParams.xzqmc" placeholder="请输入乡镇" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item> -->
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="调查状态" clearable style="width: 130px">
          <el-option label="待调查" value="pending" />
          <el-option label="调查中" value="investigating" />
          <el-option label="已完成" value="completed" />
          <el-option label="已审核" value="audited" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <!-- 暂时隐藏新增按钮，只允许通过导入方式新增图斑 -->
      <!-- <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['land:parcel:add']">新增</el-button>
      </el-col> -->
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['land:parcel:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['land:parcel:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="info" plain icon="Upload" @click="handleImport" v-hasPermi="['land:parcel:import']">导入</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Scissor" @click="startSplit('line')" v-hasPermi="['land:parcel:split']">切割线分割</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Crop" @click="startSplit('polygon')" v-hasPermi="['land:parcel:split']">多边形分割</el-button>
      </el-col>
      <!-- 红线分割按钮 - 红线不再参与业务逻辑，降级为参考展示 -->
      <!-- <el-col :span="1.5">
        <el-button type="warning" plain icon="Flag" @click="startSplit('redline')" v-hasPermi="['land:parcel:split']">红线分割</el-button>
      </el-col> -->
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Collection" @click="handleMerge" v-hasPermi="['land:parcel:merge']">合并图斑</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-tooltip content="切换地图视图" placement="top">
          <el-button :type="mapVisible ? 'warning' : ''" plain :icon="mapVisible ? 'Grid' : 'MapLocation'" circle @click="toggleMap" />
        </el-tooltip>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :columns="columns" :size="'small'" />
    </el-row>

    <!-- 表格视图 -->
    <el-table 
      v-show="!mapVisible" 
      v-loading="loading" 
      :data="parcelList" 
      stripe 
      border 
      @selection-change="handleSelectionChange" 
      @row-click="handleRowClick" highlight-current-row
    >
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="图斑编号" align="center" prop="parcelCode" :show-overflow-tooltip="true" width="120" />
      <el-table-column label="图斑名称" align="center" prop="parcelName" :show-overflow-tooltip="true" min-width="120">
        <template #default="scope">
          <a class="link-type" style="cursor:pointer" @click="handleViewDetail(scope.row)">{{ scope.row.parcelName }}</a>
        </template>
      </el-table-column>
      <el-table-column label="所属任务" align="center" prop="taskName" min-width="140" show-overflow-tooltip />
      <el-table-column label="乡镇" align="center" prop="xzqmc" min-width="120" />
      <el-table-column label="面积(亩)" align="center" prop="area" min-width="110">
        <template #default="scope">
          <span>{{ scope.row.area != null ? scope.row.area.toFixed(2) : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="核查状态" align="center" min-width="100">
        <template #default="scope">
          <dict-tag :options="parcel_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="调查人" align="center" prop="investigateBy" min-width="100" />
      <el-table-column label="调查时间" align="center" prop="updateTime" min-width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.updateTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" min-width="150" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-tooltip content="详情" placement="top">
            <el-button link type="primary" icon="View" @click="handleViewDetail(scope.row)"></el-button>
          </el-tooltip>
          <el-tooltip content="修改" placement="top">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['land:parcel:edit']"></el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['land:parcel:remove']"></el-button>
          </el-tooltip>
          <el-tooltip v-if="scope.row.status === 'completed'" content="审核" placement="top">
            <el-button link type="warning" icon="Checked" @click="handleAuditOpen(scope.row)" v-hasPermi="['land:parcel:audit']"></el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 地图视图 -->
    <div v-show="mapVisible" class="parcel-map-container" v-loading="mapLoading" element-loading-text="正在加载图斑几何数据...">
      <land-map
        ref="landMapRef"
        :geojson="parcelGeojson"
        :redline-geojson="redlineGeojson"
        :highlight-id="highlightParcelId"
        :draw-mode="drawMode"
        @parcel-click="handleParcelClickFromMap"
        @map-ready="handleMapReady"
        @draw-complete="handleDrawComplete"
        @draw-cancel="handleDrawCancel"
        @redline-split="handleRedlineSplitClick"
        @pick-split-target="handlePickSplitTarget"
        @merge-confirm="handleMergeConfirm"
      />
    </div>

    <pagination v-show="total > 0 && !mapVisible" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加/修改对话框 -->
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form :model="form" :rules="rules" ref="parcelRef" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="所属任务" required prop="taskId">
              <el-select v-model="form.taskId" placeholder="请选择所属任务" filterable style="width: 100%" @focus="loadTaskOptions">
                <el-option
                  v-for="t in taskOptions"
                  :key="t.taskId"
                  :label="t.taskName"
                  :value="t.taskId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="图斑编号" prop="parcelCode">
              <el-input v-model="form.parcelCode" placeholder="请输入图斑编号" maxlength="64" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="图斑名称" prop="parcelName">
              <el-input v-model="form.parcelName" placeholder="请输入图斑名称" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="乡镇名称" prop="xzqmc">
              <el-input v-model="form.xzqmc" placeholder="请输入乡镇" maxlength="64" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="面积(亩)" prop="area">
              <el-input-number v-model="form.area" :min="0" :precision="3" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="调查状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择" style="width: 100%">
                <el-option label="待调查" value="pending" />
                <el-option label="调查中" value="investigating" />
                <el-option label="已完成" value="completed" />
                <el-option label="已审核" value="audited" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="几何数据" prop="geom">
              <el-input v-model="form.geom" type="textarea" :rows="3" placeholder="WKT 几何" />
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

    <!-- 导入对话框 -->
    <el-dialog title="导入图斑数据" v-model="importOpen" width="500px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="所属任务" required>
          <el-select v-model="importTaskId" placeholder="请选择所属任务" filterable style="width: 100%" @focus="loadTaskOptions">
            <el-option
              v-for="t in taskOptions"
              :key="t.taskId"
              :label="t.taskName"
              :value="t.taskId" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据文件">
          <el-upload
            ref="uploadRef"
            :limit="1"
            accept=".json,.geojson,.shp,.zip"
            :auto-upload="false"
            :on-change="handleFileChange"
            drag>
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 GeoJSON(.json/.geojson) 和 Shapefile(.shp/.zip)，坐标系 CGCS2000 (SRID 4490)</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="importLoading" @click="submitImport">开始导入</el-button>
          <el-button @click="importOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog title="审核图斑" v-model="auditVisible" width="480px" append-to-body>
      <el-form :model="auditForm" label-width="80px">
        <el-form-item label="图斑编号">
          <span>{{ auditForm.parcelName || auditForm.parcelCode }}</span>
        </el-form-item>
        <el-form-item label="审核动作">
          <el-radio-group v-model="auditForm.action">
            <el-radio value="approve">通过</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="auditForm.remark" type="textarea" :rows="3" placeholder="请输入审核意见（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="auditLoading" @click="submitAudit">确 定</el-button>
          <el-button @click="auditVisible = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图斑详情抽屉 -->
    <el-drawer v-model="detailVisible" size="40%" direction="rtl" destroy-on-close>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="font-size: 16px; font-weight: 600;">{{ detailTitle }}</span>
          <el-button v-if="!isEditing && detailTab !== 'photos'" type="primary" plain icon="Edit" @click="enterEditMode">编辑</el-button>
          <el-button v-if="isEditing && detailTab !== 'photos'" type="default"  @click="cancelEdit">取消编辑</el-button>
        </div>
      </template>
      <template v-if="currentParcel">
        <el-tabs v-model="detailTab" class="parcel-detail-tabs">
          <!-- Tab 1: 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="图斑编号">{{ currentParcel.parcelCode }}</el-descriptions-item>
              <!-- 红线合法性 - 红线不再参与业务逻辑，降级为参考展示 -->
              <!-- <el-descriptions-item label="红线合法性">
                ... 已注释 ...
              </el-descriptions-item> -->
              <el-descriptions-item label="图斑名称">
                <template v-if="isEditing">
                  <el-input v-model="editForm.parcelName" placeholder="请输入图斑名称" />
                </template>
                <template v-else>{{ currentParcel.parcelName || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="所属任务">{{ currentParcel.taskName }}</el-descriptions-item>
              <el-descriptions-item label="镇级行政区代码">
                <template v-if="isEditing">
                  <el-input v-model="editForm.xzqdm" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.xzqdm || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="镇级行政区名称">
                <template v-if="isEditing">
                  <el-input v-model="editForm.xzqmc" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.xzqmc || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="村级行政区代码">
                <template v-if="isEditing">
                  <el-input v-model="editForm.cjxzqdm" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.cjxzqdm || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="村级行政区名称">
                <template v-if="isEditing">
                  <el-input v-model="editForm.cjxzqmc" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.cjxzqmc || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="月度批次">
                <template v-if="isEditing">
                  <el-input v-model="editForm.ydpc" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.ydpc || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="监测类型">
                <template v-if="isEditing">
                  <el-select v-model="editForm.jclx" placeholder="请选择" style="width: 100%">
                    <el-option v-for="d in monitor_type" :key="d.value" :label="d.label" :value="d.value" />
                  </el-select>
                </template>
                <template v-else>{{ jclxLabel(currentParcel.jclx) }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="图斑类型">
                <template v-if="isEditing">
                  <el-input v-model="editForm.tblx" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.tblx || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="图斑特征">
                <template v-if="isEditing">
                  <el-input v-model="editForm.tz" placeholder="请输入" />
                </template>
                <template v-else>{{ currentParcel.tz || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="监测面积(亩)">
                <template v-if="isEditing">
                  <el-input-number v-model="editForm.jcmj" :min="0" :precision="2" controls-position="right" style="width: 100%" />
                </template>
                <template v-else>{{ currentParcel.jcmj != null ? currentParcel.jcmj.toFixed(2) : '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="面积(亩)">
                <template v-if="isEditing">
                  <el-input-number v-model="editForm.area" :min="0" :precision="3" controls-position="right" style="width: 100%" />
                </template>
                <template v-else>{{ currentParcel.area != null ? currentParcel.area.toFixed(2) : '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">
                <template v-if="isEditing">
                  <el-input v-model="editForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
                </template>
                <template v-else>{{ currentParcel.remark || '-' }}</template>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- Tab 2: 核查信息 -->
          <el-tab-pane label="核查信息" name="investigation">
            <el-descriptions :column="3" border >
              <el-descriptions-item label="现状地类">
                <template v-if="isEditing">
                  <el-select v-model="editForm.landClassCode" placeholder="请选择地类" style="width: 100%">
                    <el-option v-for="d in land_type" :key="d.value" :label="d.label" :value="d.value" />
                  </el-select>
                </template>
                <template v-else>
                  {{ landClassText(currentParcel) }}
                </template>
              </el-descriptions-item>
              <el-descriptions-item label="合法性质" :span="2">
                <template v-if="isEditing">
                  <el-select v-model="editForm.legality" placeholder="请选择" style="width: 100%">
                    <el-option v-for="d in legality" :key="d.value" :label="d.label" :value="d.value" />
                  </el-select>
                </template>
                <template v-else>
                  <el-tag :type="legalityTagType(currentParcel.legality)" >{{ legalityLabel(currentParcel.legality) }}</el-tag>
                </template>
              </el-descriptions-item>
              <!-- 合法面积/违法面积 - 红线判定衍生字段，降级后注释 -->
              <!-- <el-descriptions-item label="合法面积(亩)">{{ currentParcel.hfmj != null ? currentParcel.hfmj.toFixed(2) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="违法面积(亩)">{{ currentParcel.wfmj != null ? currentParcel.wfmj.toFixed(2) : '-' }}</el-descriptions-item> -->
              <el-descriptions-item label="违法主体名称" :span="3">
                <template v-if="isEditing">
                  <el-input v-model="editForm.wfztmc" placeholder="请输入违法主体名称" />
                </template>
                <template v-else>{{ currentParcel.wfztmc || '-' }}</template>
              </el-descriptions-item>
              <el-descriptions-item label="图斑情况说明" :span="3">
                <template v-if="isEditing">
                  <el-input v-model="editForm.qksm" type="textarea" :rows="2" placeholder="请输入情况说明" />
                </template>
                <template v-else>{{ currentParcel.qksm || '-' }}</template>
              </el-descriptions-item>
            </el-descriptions>

            <!-- 红线判定结果 - 红线不再参与业务逻辑，降级为参考展示 -->
            <!-- <template v-if="redlineResults.length > 0">
              <el-divider content-position="left">红线判定结果</el-divider>
              <div v-loading="redlineLoading" class="redline-result-list">
                <el-card
                  v-for="result in redlineResults"
                  :key="result.resultId"
                  shadow="never"
                  size="small"
                  class="redline-result-card"
                >
                  <template #header>
                    <div class="redline-result-header">
                      <span class="redline-result-title">
                        {{ result.redlineName || '未知红线' }}
                      </span>
                      <el-tag :type="legalityTagType(result.legality)" size="small">
                        {{ legalityLabel(result.legality) }}
                      </el-tag>
                    </div>
                  </template>
                  <el-descriptions :column="2" size="small">
                    <el-descriptions-item label="叠加类型">
                      <el-tag :type="result.overlapType === 'full' ? 'success' : result.overlapType === 'partial' ? 'warning' : 'info'" size="small">
                        {{ overlapTypeLabel[result.overlapType] || result.overlapType }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="相交面积">
                      {{ result.intersectionArea != null ? result.intersectionArea.toFixed(2) + ' 亩' : '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="相交比例">
                      {{ result.intersectionRatio != null ? result.intersectionRatio.toFixed(2) + '%' : '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="判定人">
                      {{ result.determinedBy || '-' }}
                    </el-descriptions-item>
                    <el-descriptions-item v-if="result.remark" label="备注" :span="2">
                      {{ result.remark }}
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </div>
            </template>
            <el-divider v-if="redlineResults.length === 0" content-position="left">红线判定结果</el-divider>
            <el-empty
              v-if="redlineResults.length === 0"
              description="暂未执行红线判定"
              :image-size="60"
            /> -->

            <el-divider content-position="left">调查与审核</el-divider>
            <el-descriptions :column="2" border >
              <el-descriptions-item label="核查状态">
                <dict-tag :options="parcel_status" :value="currentParcel.status" />
              </el-descriptions-item>
              <el-descriptions-item label="调查人">{{ currentParcel.investigateBy || '-' }}</el-descriptions-item>
              <el-descriptions-item label="调查时间">{{ parseTime(currentParcel.investigateTime) || '-' }}</el-descriptions-item>
              <el-descriptions-item v-if="currentParcel.status === 'completed' || currentParcel.status === 'audited'" label="审核人">{{ currentParcel.auditBy || '-' }}</el-descriptions-item>
              <el-descriptions-item v-if="currentParcel.status === 'completed' || currentParcel.status === 'audited'" label="审核时间">{{ parseTime(currentParcel.auditTime) || '-' }}</el-descriptions-item>
              <el-descriptions-item v-if="currentParcel.auditRemark" label="审核意见" :span="2">{{ currentParcel.auditRemark }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- Tab 3: 照片 -->
          <el-tab-pane :label="`照片 (${photoList.length})`" name="photos">
            <div v-loading="photoLoading" class="photo-tab-content">
              <div v-if="photoList.length > 0" class="photo-grid">
                <div
                  v-for="photo in photoList"
                  :key="photo.photoId"
                  class="photo-item"
                >
                  <el-image
                    :src="buildPhotoUrl(photo.thumbnailPath || photo.filePath)"
                    :preview-src-list="photoPreviewList"
                    :initial-index="photoList.indexOf(photo)"
                    preview-teleported
                    fit="cover"
                    class="photo-thumb"
                  >
                    <template #error>
                      <div class="photo-error">
                        <el-icon><Picture /></el-icon>
                        <span>加载失败</span>
                      </div>
                    </template>
                    <template #placeholder>
                      <div class="photo-placeholder">
                        <el-icon class="is-loading"><Loading /></el-icon>
                      </div>
                    </template>
                  </el-image>
                  <div class="photo-meta">
                    <span v-if="photo.location" class="meta-location" :title="photo.location">
                      <el-icon><LocationInformation /></el-icon>
                      {{ photo.location }}
                    </span>
                    <span v-if="photo.shootTime" class="meta-time">{{ parseTime(photo.shootTime) }}</span>
                    <span v-if="photo.longitude != null && photo.latitude != null" class="meta-gps">
                      {{ Number(photo.longitude).toFixed(6) }}, {{ Number(photo.latitude).toFixed(6) }}
                    </span>
                    <span v-if="photo.azimuth != null" class="meta-azimuth">方位 {{ Number(photo.azimuth).toFixed(0) }}°</span>
                    <el-button
                      v-if="photo.longitude != null && photo.latitude != null"
                      type="primary"
                      link
                      size="small"
                      class="meta-view-btn"
                      @click="handleViewPhotoOnMap(photo)"
                    >
                      <el-icon><MapLocation /></el-icon>
                      查看位置
                    </el-button>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无照片" :image-size="80" />
            </div>
          </el-tab-pane>

          <!-- Tab 4: 编辑历史 -->
          <el-tab-pane label="编辑历史" name="log" v-if="false">
            <div v-loading="logLoading">
              <el-timeline v-if="editLogList.length > 0">
                <el-timeline-item
                  v-for="log in editLogList"
                  :key="log.logId"
                  :timestamp="parseTime(log.operateTime)"
                  :color="logColorMap[log.action] || '#409EFF'"
                  placement="top">
                  <el-card shadow="hover" size="small">
                    <div class="log-header">
                      <el-tag :type="logActionType(log.action)" size="small">{{ logActionLabel(log.action) }}</el-tag>
                      <span class="log-operator">{{ log.operateBy }}</span>
                    </div>
                    <el-descriptions v-if="log.oldArea != null || log.newArea != null" :column="2" size="small" class="log-detail">
                      <el-descriptions-item v-if="log.oldArea != null" label="原面积">{{ log.oldArea.toFixed(2) }}亩</el-descriptions-item>
                      <el-descriptions-item v-if="log.newArea != null" label="新面积">{{ log.newArea.toFixed(2) }}亩</el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else description="暂无编辑记录" :image-size="80" />
            </div>
          </el-tab-pane>
        </el-tabs>
        <!-- 编辑模式保存/取消按钮 -->
        <template v-if="isEditing">
          <el-divider />
          <div class="drawer-edit-footer">
            <el-button @click="cancelEdit">取消</el-button>
            <el-button type="primary" :loading="saveLoading" @click="saveEdit">保存修改</el-button>
          </div>
        </template>
        <!-- 审核操作区：仅已完成状态的图斑显示 -->
        <div v-if="currentParcel.status === 'completed'" class="drawer-audit-bar" v-hasPermi="['land:parcel:audit']">
          <el-divider />
          <div class="audit-actions">
            <el-button type="success" @click="handleAuditOpen(currentParcel)">
              <el-icon><Check /></el-icon> 审核通过
            </el-button>
            <el-button type="danger" @click="handleAuditOpen(currentParcel, 'reject')">
              <el-icon><Close /></el-icon> 审核驳回
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="Parcel">
import { listParcel, getParcel, addParcel, updateParcel, delParcel, importParcels, getParcelGeoJson, auditParcel, splitParcel, mergeParcel } from "@/api/land/parcel"
import { getEditLogByParcel } from "@/api/land/editLog"
import { listPhotosByParcel } from "@/api/land/photo"
import { getParcelRedlineResults, getRedlineGeoJson, getLastImportTask } from "@/api/land/redline"
import { getTask, listTask } from "@/api/land/task"
import LandMap from "@/components/LandMap/index.vue"
import { Picture, Loading, LocationInformation, MapLocation, Check, Close } from '@element-plus/icons-vue'
import { useDict } from '@/utils/dict'

const route = useRoute()
const { proxy } = getCurrentInstance()
const { parcel_status } = useDict("parcel_status")

const parcelList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const mapVisible = ref(false)
const mapParcel = ref(null)
const mapLoading = ref(false)
const parcelGeojson = ref({ type: 'FeatureCollection', features: [] })
const redlineGeojson = ref({ type: 'FeatureCollection', features: [] })
const highlightParcelId = ref(null)
const landMapRef = ref(null)
// 当前筛选下的任务 ID（地图只渲染一个任务的图斑）
const currentTaskId = ref(null)
// 红线任务 ID（红线有独立的导入任务，与图斑任务解耦）
const redlineTaskId = ref(null)

// 从字典获取 legality 映射
const { legality, land_type, monitor_type } = useDict('legality', 'land_type', 'monitor_type')
const legalityDictMap = computed(() => {
  const map = {}
  if (legality.value) {
    legality.value.forEach(item => {
      map[item.value] = { label: item.label, tagType: item.elTagType || 'info' }
    })
  }
  return map
})
// 字典 label: 是→Y, 否→N, 违变化→WBH
const legalityLegalValue = computed(() => {
  const entry = legality.value?.find(d => d.label === '是')
  return entry?.value || 'Y'
})
const legalityIllegalValue = computed(() => {
  const entry = legality.value?.find(d => d.label === '否')
  return entry?.value || 'N'
})
const legalityWbhValue = computed(() => {
  const entry = legality.value?.find(d => d.label === '违变化')
  return entry?.value || 'WBH'
})

// 导入相关
const importOpen = ref(false)
const importLoading = ref(false)
const uploadFile = ref(null)
const importTaskId = ref(null)
const taskOptions = ref([])

// 详情抽屉
const detailVisible = ref(false)
const detailTitle = ref("")
const detailTab = ref("info")
// 切换tab时，如果进入照片tab则自动退出编辑模式
watch(detailTab, (tab) => {
  if (tab === 'photos' && isEditing.value) {
    cancelEdit()
  }
})
const currentParcel = ref(null)

// 照片
const photoList = ref([])
const photoLoading = ref(false)

// 编辑日志
const editLogList = ref([])
const logLoading = ref(false)
const taskName = ref("")

// 红线判定结果
const redlineResults = ref([])
const redlineLoading = ref(false)

// 详情抽屉编辑模式
const isEditing = ref(false)
const editForm = ref({})
const saveLoading = ref(false)

// 审核相关
const auditVisible = ref(false)
const auditLoading = ref(false)
const auditForm = ref({ parcelId: null, parcelName: '', parcelCode: '', action: 'approve', remark: '' })

// 列显隐
const columns = ref([
  { key: 0, label: '图斑编号', visible: true },
  { key: 1, label: '图斑名称', visible: true },
  { key: 2, label: '乡镇', visible: true },
  { key: 3, label: '面积(亩)', visible: true },
  { key: 4, label: '调查状态', visible: true },
  { key: 5, label: '调查人', visible: true },
  { key: 6, label: '调查时间', visible: true }
])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskId: undefined,
    parcelName: undefined,
    xzqmc: undefined,
    status: undefined
  },
  rules: {
    taskId: [{ required: true, message: "所属任务不能为空", trigger: "blur" }],
    parcelCode: [{ required: true, message: "图斑编号不能为空", trigger: "blur" }],
    parcelName: [{ required: true, message: "图斑名称不能为空", trigger: "blur" }],
    geom: [{ required: true, message: "几何数据不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

// ── 详情抽屉辅助方法 ──

const jclxMap = { xzjs: '疑似新增建设', gdbh: '耕地流出变化', jsyd: '建设用地变化', nydb: '农业用地变化' }
function jclxLabel(code) {
  return jclxMap[code] || code || '-'
}

function legalityLabel(legality) {
  return legalityDictMap.value[legality]?.label || '待判定'
}

function legalityTagType(legality) {
  return legalityDictMap.value[legality]?.tagType || 'info'
}

/** 基于红线判定结果的综合合法性 */
const redlineOverallLegality = computed(() => {
  if (redlineResults.value.length === 0) return null
  const legalVal = legalityLegalValue.value
  const hasLegal = redlineResults.value.some(r => r.legality === legalVal)
  if (hasLegal) return legalVal
  // 检查是否有"伪变化"WBH 的记录
  const wbhVal = legalityWbhValue.value
  const hasWbh = redlineResults.value.some(r => r.legality === wbhVal)
  if (hasWbh) return wbhVal
  // 都不满足 → 违法
  return legalityIllegalValue.value
})

/** 匹配到的红线名称列表（仅匹配 legal 且有 redlineName 的） */
const matchedRedlineNames = computed(() => {
  const legalVal = legalityLegalValue.value
  return redlineResults.value
    .filter(r => r.legality === legalVal && r.redlineName)
    .map(r => r.redlineName)
})

const overlapTypeLabel = { full: '完全包含', partial: '部分相交', none: '不相交' }

function landClassText(parcel) {
  const code = parcel.landClassCode || ''
  if (!code) return '-'
  const name = parcel.landClassName
  return name ? `${name} (${code})` : code
}

// ── 详情抽屉编辑模式 ──

/** 进入编辑模式 */
function enterEditMode() {
  // 深拷贝当前图斑数据到编辑表单
  editForm.value = {
    parcelId: currentParcel.value.parcelId,
    parcelName: currentParcel.value.parcelName || '',
    xzqdm: currentParcel.value.xzqdm || '',
    xzqmc: currentParcel.value.xzqmc || '',
    cjxzqdm: currentParcel.value.cjxzqdm || '',
    cjxzqmc: currentParcel.value.cjxzqmc || '',
    ydpc: currentParcel.value.ydpc || '',
    jclx: currentParcel.value.jclx || '',
    tblx: currentParcel.value.tblx || '',
    tz: currentParcel.value.tz || '',
    jcmj: currentParcel.value.jcmj ?? null,
    area: currentParcel.value.area ?? null,
    remark: currentParcel.value.remark || '',
    legality: currentParcel.value.legality || '',
    landClassCode: currentParcel.value.landClassCode || '',
    landClassName: currentParcel.value.landClassName || '',
    wfztmc: currentParcel.value.wfztmc || '',
    qksm: currentParcel.value.qksm || '',
  }
  isEditing.value = true
}

/** 取消编辑 */
function cancelEdit() {
  isEditing.value = false
  editForm.value = {}
}

/** 保存编辑 */
function saveEdit() {
  // 根据选中的地类编码自动补上地类名称
  if (editForm.value.landClassCode) {
    const match = land_type.value?.find(d => d.value === editForm.value.landClassCode)
    editForm.value.landClassName = match ? match.label : ''
  } else {
    editForm.value.landClassName = ''
  }
  saveLoading.value = true
  updateParcel(editForm.value).then(() => {
    proxy.$modal.msgSuccess('修改成功')
    isEditing.value = false
    // 重新获取图斑详情以刷新数据
    getParcel(currentParcel.value.parcelId).then(res => {
      currentParcel.value = res.data
      detailTitle.value = `图斑详情 - ${res.data.parcelName || res.data.parcelCode}`
    })
    // 刷新列表
    getList()
    if (mapVisible.value) loadParcelGeojson()
  }).catch(() => {
    // 保存失败，保持编辑状态
  }).finally(() => {
    saveLoading.value = false
  })
}

/** 构造照片可访问 URL */
function buildPhotoUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return import.meta.env.VITE_APP_BASE_API + path
}

const photoPreviewList = computed(() => {
  return photoList.value.map(p => buildPhotoUrl(p.filePath))
})

// 编辑日志辅助方法
const logColorMap = { SPLIT: '#67C23A', MERGE: '#E6A23C', ADD: '#409EFF', DELETE: '#F56C6C', MODIFY: '#909399' }

function logActionLabel(action) {
  const map = { SPLIT: '分割', MERGE: '合并', ADD: '新增', DELETE: '删除', MODIFY: '修改' }
  return map[action] || action
}

function logActionType(action) {
  const map = { SPLIT: 'success', MERGE: 'warning', ADD: '', DELETE: 'danger', MODIFY: 'info' }
  return map[action] || ''
}

// 地图视图切换
function toggleMap() {
  mapVisible.value = !mapVisible.value
  if (mapVisible.value) {
    loadParcelGeojson()
    // v-show 容器从隐藏变可见，需要让 MapLibre 重新计算尺寸
    nextTick(() => {
      if (landMapRef.value) {
        landMapRef.value.resize()
      }
    })
  }
}

/**
 * 加载图斑的 GeoJSON 数据
 * taskId 可选：有则查指定任务，无则查全部
 */
function loadParcelGeojson() {
  const taskId = queryParams.value.taskId
  mapLoading.value = true
  getParcelGeoJson(taskId).then(res => {
    parcelGeojson.value = res.data || { type: 'FeatureCollection', features: [] }
  }).catch(() => {
    parcelGeojson.value = { type: 'FeatureCollection', features: [] }
  }).finally(() => {
    mapLoading.value = false
  })

  // 同时加载红线任务的 GeoJSON（红线的 taskId 与图斑独立，使用 redlineTaskId）
  if (redlineTaskId.value) {
    getRedlineGeoJson(redlineTaskId.value).then(res => {
      redlineGeojson.value = res.data || { type: 'FeatureCollection', features: [] }
    }).catch(() => {
      redlineGeojson.value = { type: 'FeatureCollection', features: [] }
    })
  } else {
    redlineGeojson.value = { type: 'FeatureCollection', features: [] }
  }
}

/** 地图就绪回调 */
function handleMapReady() {
  // 地图加载完成，LandMap 组件内部已自动 fitBounds
}

/** 表格行点击 → 地图飞行定位 + 高亮 */
function handleRowClick(row) {
  if (!mapVisible.value || !row.parcelId) return
  highlightParcelId.value = row.parcelId
  if (landMapRef.value) {
    landMapRef.value.flyTo(row.parcelId)
  }
}

/** 地图图斑点击 → 打开详情抽屉 */
function handleParcelClickFromMap(parcel) {
  if (!parcel || !parcel.parcelId) return
  highlightParcelId.value = parcel.parcelId
  // 地图点击只有 properties 中的基本字段，需要从后端获取完整详情
  handleViewDetail(parcel)
}

/** 查询列表 */
function getList() {
  loading.value = true
  listParcel(queryParams.value).then(res => {
    loading.value = false
    parcelList.value = res.rows
    total.value = res.total
  })
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
  // 地图可见时同步刷新 GeoJSON 数据
  if (mapVisible.value) {
    loadParcelGeojson()
  }
}

/** 重置 */
function resetQuery() {
  const savedTaskId = queryParams.value.taskId
  proxy.resetForm("queryRef")
  queryParams.value.taskId = savedTaskId
  handleQuery()
}

/** 多选 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.parcelId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
  if (selection.length === 1) {
    mapParcel.value = selection[0]
  } else {
    mapParcel.value = null
  }
}

/** 查看详情 */
function handleViewDetail(row) {
  // 如果传入的只有 parcelId（地图点击），先获取完整数据
  if (row.parcelId && !row.parcelCode) {
    getParcel(row.parcelId).then(response => {
      currentParcel.value = response.data
      detailTitle.value = `图斑详情 - ${response.data.parcelName || response.data.parcelCode}`
      detailVisible.value = true
      detailTab.value = "info"
      loadDetailExtras(response.data)
    })
  } else {
    currentParcel.value = row
    detailTitle.value = `图斑详情 - ${row.parcelName || row.parcelCode}`
    detailVisible.value = true
    detailTab.value = "info"
    loadDetailExtras(row)
  }
}

/** 加载详情附加数据（编辑日志、照片、任务名称） */
function loadDetailExtras(parcel) {
  // 加载编辑日志
  logLoading.value = true
  getEditLogByParcel(parcel.parcelId).then(res => {
    editLogList.value = res.rows || res.data || []
    logLoading.value = false
  }).catch(() => {
    logLoading.value = false
  })

  // 加载照片
  photoLoading.value = true
  photoList.value = []
  listPhotosByParcel(parcel.parcelId).then(res => {
    photoList.value = res.data || []
    photoLoading.value = false
  }).catch(() => {
    photoLoading.value = false
  })

  // 加载红线判定结果
  redlineLoading.value = true
  redlineResults.value = []
  getParcelRedlineResults(parcel.parcelId).then(res => {
    redlineResults.value = res.data || []
    redlineLoading.value = false
  }).catch(() => {
    redlineLoading.value = false
  })

  // 获取任务名称
  if (parcel.taskId) {
    getTask(parcel.taskId).then(res => {
      taskName.value = res.data?.taskName || '-'
    })
  } else {
    taskName.value = '-'
  }
}

/** 在地图上显示照片拍摄位置和方位角扇形 */
function handleViewPhotoOnMap(photo) {
  // 关闭抽屉，让地图可见
  detailVisible.value = false
  // 确保地图视图已展开
  if (!mapVisible.value) {
    mapVisible.value = true
    loadParcelGeojson()
  }
  nextTick(() => {
    if (landMapRef.value) {
      landMapRef.value.showPhotoMarker(photo)
    }
  })
}

/** 打开审核对话框 */
function handleAuditOpen(row, defaultAction) {
  auditForm.value = {
    parcelId: row.parcelId,
    parcelName: row.parcelName || row.parcelCode,
    parcelCode: row.parcelCode,
    action: defaultAction || 'approve',
    remark: ''
  }
  auditVisible.value = true
}

/** 提交审核 */
function submitAudit() {
  auditLoading.value = true
  auditParcel(auditForm.value.parcelId, auditForm.value.action, auditForm.value.remark)
    .then(() => {
      proxy.$modal.msgSuccess(auditForm.value.action === 'approve' ? '审核通过' : '已驳回')
      auditVisible.value = false
      // 关闭详情抽屉
      detailVisible.value = false
      // 刷新列表
      getList()
      // 如果地图可见，重新加载地图数据
      if (mapVisible.value) {
        loadParcelGeojson()
      }
    })
    .catch(() => {})
    .finally(() => {
      auditLoading.value = false
    })
}

/** 新增（暂时注释，只允许通过导入方式新增图斑） */
/* function handleAdd() {
  reset()
  open.value = true
  title.value = "新增图斑"
  loadTaskOptions()
} */

/** 修改 */
function handleUpdate(row) {
  reset()
  const parcelId = row.parcelId || ids.value[0]
  getParcel(parcelId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改图斑"
  })
}

/** 删除 */
function handleDelete(row) {
  const parcelIds = row.parcelId || ids.value
  proxy.$modal.confirm('确认删除所选图斑吗？此操作不可恢复。').then(function () {
    return delParcel(parcelIds)
  }).then(() => {
    getList()
    // 地图可见时同步刷新
    if (mapVisible.value) loadParcelGeojson()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导入 */
function handleImport() {
  uploadFile.value = null
  // 优先取路由参数中的 taskId 作为默认选中
  importTaskId.value = queryParams.value.taskId || null
  importOpen.value = true
  loadTaskOptions()
}

function loadTaskOptions() {
  if (taskOptions.value.length > 0) return
  listTask().then(res => {
    taskOptions.value = res.rows || []
  })
}

function handleFileChange(file) {
  uploadFile.value = file.raw
}

function submitImport() {
  if (!uploadFile.value) {
    proxy.$modal.msgWarning("请选择导入文件")
    return
  }
  if (!importTaskId.value) {
    proxy.$modal.msgWarning("请先选择所属任务")
    return
  }
  importLoading.value = true
  importParcels({ file: uploadFile.value, taskId: importTaskId.value }).then(() => {
    proxy.$modal.msgSuccess("导入成功")
    importOpen.value = false
    getList()
  }).finally(() => {
    importLoading.value = false
  })
}

/** 取消 */
function cancel() {
  open.value = false
  reset()
}

/** 重置表单 */
function reset() {
  form.value = {
    parcelId: undefined,
    taskId: queryParams.value.taskId || undefined,
    parcelCode: undefined,
    parcelName: undefined,
    xzqmc: undefined,
    area: undefined,
    status: "pending",
    geom: undefined,
    remark: undefined
  }
  proxy.resetForm("parcelRef")
}

/** 提交 */
function submitForm() {
  proxy.$refs["parcelRef"].validate(valid => {
    if (valid) {
      if (form.value.parcelId != undefined) {
        updateParcel(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addParcel(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

// ========== 分割/合并 ==========
const drawMode = ref(null) // null | 'pick-split' | 'line' | 'polygon' | 'redline' | 'pick-merge'
const splitParcelId = ref(null) // 当前正在分割的图斑ID
const splitMode = ref(null) // 'line' | 'polygon' — 记住分割类型

/** 开始分割 — 在地图上选择目标图斑 */
function startSplit(mode) {
  splitMode.value = mode
  if (!mapVisible.value) {
    // 自动切换到地图视图
    mapVisible.value = true
    loadParcelGeojson()
    nextTick(() => {
      if (landMapRef.value) landMapRef.value.resize()
      // 延迟设置 drawMode，等地图就绪
      setTimeout(() => {
        drawMode.value = mode === 'redline' ? 'redline' : 'pick-split'
      }, 500)
    })
  } else {
    drawMode.value = mode === 'redline' ? 'redline' : 'pick-split'
  }
}

/** 地图上选择分割目标图斑 → 进入绘制模式 */
function handlePickSplitTarget(parcel) {
  splitParcelId.value = parcel.parcelId
  highlightParcelId.value = parcel.parcelId
  // 飞行定位到选中的图斑
  if (landMapRef.value) {
    landMapRef.value.flyTo(parcel.parcelId)
  }
  proxy.$modal.msgSuccess(`已选择图斑：${parcel.parcelCode || parcel.parcelName || parcel.parcelId}，请开始绘制`)
  // 进入绘制模式
  drawMode.value = splitMode.value // 'line' or 'polygon'
}

/** 绘制完成 → 调用分割 API */
function handleDrawComplete({ mode, wkt }) {
  const parcelId = splitParcelId.value
  if (!parcelId) {
    proxy.$modal.msgWarning('请先在地图上选择要分割的图斑')
    drawMode.value = null
    return
  }
  proxy.$modal.loading('正在分割图斑...')
  splitParcel(parcelId, { mode, cutWkt: wkt }).then(res => {
    proxy.$modal.closeLoading()
    proxy.$modal.msgSuccess(`分割成功，生成 ${res.data?.length || 0} 个新图斑`)
    drawMode.value = null
    splitParcelId.value = null
    splitMode.value = null
    getList()
    loadParcelGeojson()
  }).catch(() => {
    proxy.$modal.closeLoading()
    drawMode.value = null
  })
}

/** 红线分割（从地图点击触发） */
function handleRedlineSplitClick({ parcelId, parcelCode }) {
  proxy.$modal.confirm(`确认对图斑【${parcelCode}】执行红线自动分割？`).then(() => {
    proxy.$modal.loading('正在红线分割...')
    splitParcel(parcelId, { mode: 'redline' }).then(res => {
      proxy.$modal.closeLoading()
      proxy.$modal.msgSuccess(`红线分割成功，生成 ${res.data?.length || 0} 个新图斑`)
      drawMode.value = null
      getList()
      loadParcelGeojson()
    }).catch(() => {
      proxy.$modal.closeLoading()
    })
  }).catch(() => {
    drawMode.value = null
  })
}

/** 取消绘制 */
function handleDrawCancel() {
  drawMode.value = null
  splitParcelId.value = null
  splitMode.value = null
  // 清除地图上的合并选中状态
  if (landMapRef.value && landMapRef.value.clearMergeSelection) {
    landMapRef.value.clearMergeSelection()
  }
}

/** 合并图斑 — 进入地图选择模式 */
function handleMerge() {
  if (!mapVisible.value) {
    mapVisible.value = true
    loadParcelGeojson()
    nextTick(() => {
      if (landMapRef.value) landMapRef.value.resize()
      setTimeout(() => { drawMode.value = 'pick-merge' }, 500)
    })
  } else {
    drawMode.value = 'pick-merge'
  }
}

/** 地图合并确认 → 调用合并 API */
function handleMergeConfirm(parcelIds) {
  proxy.$modal.confirm(`确认合并选中的 ${parcelIds.length} 个图斑吗？\n\n合并后将生成一个新图斑，原图斑将被删除。`).then(() => {
    proxy.$modal.loading('正在合并图斑...')
    mergeParcel({ parcelIds }).then(res => {
      proxy.$modal.closeLoading()
      proxy.$modal.msgSuccess('合并成功')
      drawMode.value = null
      // 清除地图上的合并选中状态
      if (landMapRef.value && landMapRef.value.clearMergeSelection) {
        landMapRef.value.clearMergeSelection()
      }
      getList()
      loadParcelGeojson()
    }).catch(() => {
      proxy.$modal.closeLoading()
    })
  }).catch(() => {
    // 用户取消确认，保持选择模式
  })
}

onMounted(() => {
  // 从路由参数读取任务筛选
  if (route.query.taskId) {
    queryParams.value.taskId = Number(route.query.taskId)
  }
  // 加载任务列表并设为默认选中最近导入任务（与红线页面保持一致）
  loadTaskOptions()
  getLastImportTask().then(res => {
    if (res.data && res.data.task_id) {
      queryParams.value.taskId = res.data.task_id
      // 红线任务 ID 独立存储（用于地图叠加层加载）
      redlineTaskId.value = res.data.task_id
    }
  }).finally(() => {
    getList()
  })
})
</script>

<style scoped>
.parcel-map-container {
  position: relative;
  height: 36vw;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-light);
}
.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.log-operator {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.log-detail {
  margin-top: 6px;
}
.parcel-detail-tabs {
  padding: 0;
}
.geom-preview {
  margin-top: 8px;
}
.detail-remark {
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.6;
}

/* 照片 Tab */
.photo-tab-content {
  min-height: 200px;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.photo-item {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
}
.photo-thumb {
  width: 100%;
  height: 120px;
  cursor: pointer;
}
.photo-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
}
.photo-error {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.photo-placeholder {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
}
.photo-meta {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
}
.meta-time {
  color: var(--el-text-color-primary);
  font-weight: 500;
}
.meta-gps {
  font-family: monospace;
}
.meta-azimuth {
  color: var(--el-color-primary);
}
.meta-location {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-view-btn {
  align-self: flex-start;
  margin-top: 2px;
  padding: 0;
}

/* 审核操作条 */
.drawer-audit-bar {
  padding: 0 4px;
}
.audit-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
/* 编辑模式操作条 */
.drawer-edit-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 0 4px;
}

/* 红线判定结果 */
.redline-result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.redline-result-card {
  border-left: 3px solid var(--el-color-primary);
}
.redline-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.redline-result-title {
  font-weight: 600;
  font-size: 13px;
}
.redline-name-list {
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.redline-name-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.redline-name-tag {
  margin: 0;
}
.redline-no-match {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-top: 6px;
  display: block;
}
</style>
