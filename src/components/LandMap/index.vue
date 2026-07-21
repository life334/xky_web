<template>
  <div class="land-map-wrap">
    <div ref="mapContainer" class="land-map-container"></div>

    <!-- 图斑列表面板（左侧浮动，可折叠） -->
    <div v-if="!hidePanel" class="parcel-panel" :class="{ collapsed: !panelVisible }">
      <div class="parcel-panel-header">
        <span v-show="panelVisible" class="panel-title">图斑列表</span>
        <span v-show="panelVisible" class="panel-count">{{ parcelFeatures.length }}</span>
        <el-button class="panel-toggle" link size="small" @click="panelVisible = !panelVisible">
          <el-icon><Fold v-if="panelVisible" /><Expand v-else /></el-icon>
        </el-button>
      </div>
      <div v-show="panelVisible" class="parcel-panel-body">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索编号或名称"
          clearable
          size="small"
          :prefix-icon="Search"
          class="panel-search"
        />
        <div class="parcel-list" v-if="filteredFeatures.length">
          <div
            v-for="feat in filteredFeatures"
            :key="feat.properties.parcelId"
            class="parcel-list-item"
            :class="{ active: highlightId === feat.properties.parcelId }"
            @click="onListItemClick(feat)"
          >
            <span class="item-status-dot" :style="{ background: getStatusColor(feat.properties.status) }"></span>
            <span class="item-name">{{ feat.properties.parcelName || feat.properties.parcelCode || '未命名' }}</span>
            <span class="item-code">{{ feat.properties.parcelCode }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无图斑" :image-size="60" />
      </div>
    </div>

    <!-- 图层切换控件 -->
    <div class="land-map-controls">
      <el-dropdown @command="handleLayerSwitch" placement="bottom-start" v-if="false">
        <el-button size="small" :icon="Picture" circle />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="item in layerOptions"
              :key="item.value"
              :command="item.value"
              :disabled="item.value === currentLayer"
            >
              {{ item.label }}
              <el-icon v-if="item.value === currentLayer" class="el-icon--right"><Check /></el-icon>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 红线图层显示/隐藏开关 -->
      <el-tooltip content="显示/隐藏红线" placement="top" v-if="hasRedlineFeatures">
        <el-switch v-model="redlineVisible" size="small" inline-prompt active-text="红线" inactive-text="红线" />
      </el-tooltip>
    </div>

    <!-- 绘制工具栏（分割/合并模式下显示） -->
    <div v-if="drawMode" class="draw-toolbar">
      <template v-if="drawMode === 'pick-split'">
        <span class="draw-hint">请在地图上点击要分割的图斑</span>
        <el-button size="small" @click="cancelDraw">取消</el-button>
      </template>
      <template v-else-if="drawMode === 'line' || drawMode === 'polygon'">
        <span class="draw-hint">
          {{ drawMode === 'line' ? '点击地图绘制切割线，需穿过图斑（至少2个点）' : '点击地图绘制多边形区域（至少3个点）' }}
          <b>{{ drawPoints.length }} 点</b>
        </span>
        <el-button size="small" type="primary" @click="finishDraw" :disabled="!canFinishDraw">确定</el-button>
        <el-button size="small" @click="undoLastPoint" :disabled="drawPoints.length === 0">撤销</el-button>
        <el-button size="small" @click="cancelDraw">取消</el-button>
      </template>
      <template v-else-if="drawMode === 'redline'">
        <span class="draw-hint">红线自动分割：请在地图上点击需要分割的图斑</span>
        <el-button size="small" @click="cancelDraw">取消</el-button>
      </template>
      <template v-else-if="drawMode === 'pick-merge'">
        <span class="draw-hint">
          依次点击图斑选择合并（至少2个），再次点击可取消
          <b>已选 {{ mergeSelectedIds.length }} 个</b>
        </span>
        <el-button size="small" type="primary" @click="confirmMerge" :disabled="mergeSelectedIds.length < 2">确认合并</el-button>
        <el-button size="small" @click="cancelDraw">取消</el-button>
      </template>
    </div>

    <!-- 状态统计角标 -->
    <div v-if="statusSummary.total > 0" class="land-map-summary">
      <span>共 <b>{{ statusSummary.total }}</b> 个图斑</span>
      <span v-if="statusSummary.pending" class="summary-tag pending">待核查 {{ statusSummary.pending }}</span>
      <span v-if="statusSummary.investigating" class="summary-tag investigating">核查中 {{ statusSummary.investigating }}</span>
      <span v-if="statusSummary.completed" class="summary-tag completed">已完成 {{ statusSummary.completed }}</span>
      <span v-if="statusSummary.audited" class="summary-tag audited">已审核 {{ statusSummary.audited }}</span>
    </div>

    <!-- 调试信息（数据为空时显示） -->
    <div v-if="statusSummary.total === 0 && mapReady" class="land-map-empty">
      <el-icon><Warning /></el-icon>
      <span>当前任务下暂无图斑几何数据</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Picture, Check, Search, Fold, Expand, Warning } from '@element-plus/icons-vue'
import mapConfig from './mapConfig'

const props = defineProps({
  geojson: {
    type: Object,
    default: () => ({ type: 'FeatureCollection', features: [] })
  },
  highlightId: {
    type: [Number, String],
    default: null
  },
  /** 自定义填充颜色（可选，用于非图斑数据如红线） */
  fillColor: {
    type: String,
    default: null
  },
  /** 自定义边框颜色（可选） */
  strokeColor: {
    type: String,
    default: null
  },
  /** 隐藏图斑列表面板（用于非图斑场景，如红线地图） */
  hidePanel: {
    type: Boolean,
    default: false
  },
  /** 红线 GeoJSON FeatureCollection（叠加在图上） */
  redlineGeojson: {
    type: Object,
    default: () => ({ type: 'FeatureCollection', features: [] })
  },
  /** 绘图模式：null=正常浏览, 'line'=切割线, 'polygon'=多边形, 'redline'=红线自动 */
  drawMode: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['parcel-click', 'map-ready', 'draw-complete', 'draw-cancel', 'redline-split', 'pick-split-target', 'merge-confirm'])

const mapContainer = ref(null)
let map = null
let hoveredId = null

const layerOptions = [
  { label: '影像图', value: 'img' },
  { label: '矢量图', value: 'vec' }
]
const currentLayer = ref('img')
const mapReady = ref(false)

// ========== 绘制状态 ==========
const DRAW_SOURCE = 'draw-temp-source'
const DRAW_LAYER_LINE = 'draw-temp-line'
const DRAW_LAYER_FILL = 'draw-temp-fill'
const DRAW_LAYER_POINT = 'draw-temp-point'
const DRAW_PREVIEW_SOURCE = 'draw-preview-source'
const DRAW_PREVIEW_LAYER = 'draw-preview-line'
const drawPoints = ref([]) // 收集的点击点 [{lng, lat}]
const mergeSelectedIds = ref([]) // 合并模式下选中的图斑ID列表
let mouseCoord = null // 鼠标当前坐标 [lng, lat]

// 本地存储 features（用于列表面板 + flyTo 查找，不依赖 MapLibre 内部 API）
const parcelFeatures = ref([])
const searchKeyword = ref('')
const panelVisible = ref(true)

// 红线图层可见性开关
const redlineVisible = ref(false)

const hasRedlineFeatures = computed(() => {
  return props.redlineGeojson?.features?.length > 0
})

const canFinishDraw = computed(() => {
  if (props.drawMode === 'line') return drawPoints.value.length >= 2
  if (props.drawMode === 'polygon') return drawPoints.value.length >= 3
  return false
})

const filteredFeatures = computed(() => {
  if (!searchKeyword.value) return parcelFeatures.value
  const kw = searchKeyword.value.toLowerCase()
  return parcelFeatures.value.filter((f) => {
    const p = f.properties || {}
    return (
      (p.parcelCode && p.parcelCode.toLowerCase().includes(kw)) ||
      (p.parcelName && p.parcelName.toLowerCase().includes(kw))
    )
  })
})

const statusSummary = reactive({
  total: 0,
  pending: 0,
  investigating: 0,
  completed: 0,
  audited: 0
})

const LAYER_FILL = 'parcel-fill'
const LAYER_LINE = 'parcel-line'
const LAYER_HIGHLIGHT = 'parcel-highlight'
const SOURCE_PARCEL = 'parcel-source'

// 照片 marker 相关
const SOURCE_PHOTO = 'photo-marker-source'
const LAYER_PHOTO_SECTOR = 'photo-sector-fill'
const LAYER_PHOTO_MARKER = 'photo-marker-circle'

// 红线叠加图层
const SOURCE_REDLINE = 'redline-source'
const LAYER_REDLINE_FILL = 'redline-fill'
const LAYER_REDLINE_LINE = 'redline-line'

const STATUS_COLORS = {
  pending: '#FFA000',
  investigating: '#F44336',
  completed: '#4CAF50',
  audited: '#1A73E8',
  default: '#FFA000'
}

function getStatusColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.default
}

/** 从 FeatureCollection 提取 features 到本地 ref */
function syncFeatures(fc) {
  if (!fc || !fc.features) {
    parcelFeatures.value = []
    return
  }
  const features = JSON.parse(JSON.stringify(fc.features))
  features.forEach((f) => {
    if (f.id == null && f.properties && f.properties.parcelId != null) {
      f.id = f.properties.parcelId
    }
  })
  parcelFeatures.value = features
}

/** 统计状态分布 */
function calcSummary(features) {
  const s = { total: 0, pending: 0, investigating: 0, completed: 0, audited: 0 }
  s.total = features.length
  features.forEach((f) => {
    const st = f.properties?.status
    if (s[st] != null) s[st]++
  })
  Object.assign(statusSummary, s)
}

/** 构造底图样式 */
function buildStyle(idx) {
  const src = mapConfig.mapSources[idx]?.style
  if (!src) return null
  return src
}

/** 切换底图 */
function handleLayerSwitch(cmd) {
  if (cmd === currentLayer.value) return
  currentLayer.value = cmd
  const idx = cmd === 'vec' ? 1 : 0
  const newStyle = buildStyle(idx)
  if (!map || !newStyle) return

  map.setStyle(newStyle)
  map.once('style.load', () => {
    addAnnotationLayer(idx)
    rebuildParcelLayers()
  })
}

/** 添加注记层 */
function addAnnotationLayer(idx) {
  const sourceKey = idx === 1 ? 'tdt_vec' : 'tdt_img'
  const ca = mapConfig.caSources[sourceKey]
  if (!ca || map.getSource(ca.sourceName)) return
  map.addSource(ca.sourceName, ca.sources)
  map.addLayer(ca.layers)
}

/** 获取当前 GeoJSON 数据对象（用于 setData） */
function getCurrentGeoJson() {
  return {
    type: 'FeatureCollection',
    features: parcelFeatures.value
  }
}

/** 重建图斑图层（切换底图后调用） */
function rebuildParcelLayers() {
  ;[LAYER_HIGHLIGHT, LAYER_LINE, LAYER_FILL].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id)
  })
  if (map.getSource(SOURCE_PARCEL)) map.removeSource(SOURCE_PARCEL)

  map.addSource(SOURCE_PARCEL, {
    type: 'geojson',
    data: getCurrentGeoJson(),
    promoteId: 'parcelId'
  })

  addParcelLayerDefinitions()
  bindParcelEvents()

  // 重新叠加红线图层
  if (props.redlineGeojson?.features?.length > 0) {
    updateRedlineLayers(props.redlineGeojson)
  }
}

/** 添加图斑图层定义（不含 addSource） */
function addParcelLayerDefinitions() {
  // 填充层
  map.addLayer({
    id: LAYER_FILL,
    type: 'fill',
    source: SOURCE_PARCEL,
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'mergeSelected'], false],
        '#1565c0',
        props.fillColor || [
          'match',
          ['get', 'status'],
          'pending', STATUS_COLORS.pending,
          'investigating', STATUS_COLORS.investigating,
          'completed', STATUS_COLORS.completed,
          'audited', STATUS_COLORS.audited,
          STATUS_COLORS.default
        ]
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'mergeSelected'], false],
        0.5,
        ['case',
        ['boolean', ['feature-state', 'hover'], false],
        0.7,
        0.35]
      ]
    }
  })

  // 边线层
  map.addLayer({
    id: LAYER_LINE,
    type: 'line',
    source: SOURCE_PARCEL,
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'mergeSelected'], false],
        '#1565c0',
        props.strokeColor || [
          'match',
          ['get', 'status'],
          'pending', STATUS_COLORS.pending,
          'investigating', STATUS_COLORS.investigating,
          'completed', STATUS_COLORS.completed,
          'audited', STATUS_COLORS.audited,
          STATUS_COLORS.default
        ]
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'mergeSelected'], false],
        4,
        ['case',
        ['boolean', ['feature-state', 'hover'], false],
        3,
        1.5]
      ],
      'line-opacity': 0.9
    }
  })

  // 高亮层
  map.addLayer({
    id: LAYER_HIGHLIGHT,
    type: 'line',
    source: SOURCE_PARCEL,
    filter: ['==', ['get', 'parcelId'], props.highlightId == null ? -1 : Number(props.highlightId)],
    paint: {
      'line-color': '#ffff00',
      'line-width': 4,
      'line-opacity': 1
    }
  })
}

/** 绑定图斑事件 */
function bindParcelEvents() {
  map.off('mousemove', LAYER_FILL, onMouseMove)
  map.off('mouseleave', LAYER_FILL, onMouseLeave)
  map.off('click', LAYER_FILL, onParcelClick)
  map.off('mouseenter', LAYER_FILL, onMouseEnterCursor)
  map.off('mouseleave', LAYER_FILL, onMouseLeaveCursor)

  map.on('mousemove', LAYER_FILL, onMouseMove)
  map.on('mouseleave', LAYER_FILL, onMouseLeave)
  map.on('click', LAYER_FILL, onParcelClick)
  map.on('mouseenter', LAYER_FILL, onMouseEnterCursor)
  map.on('mouseleave', LAYER_FILL, onMouseLeaveCursor)
}

function onMouseEnterCursor() {
  map.getCanvas().style.cursor = 'pointer'
}
function onMouseLeaveCursor() {
  map.getCanvas().style.cursor = ''
}

function onMouseMove(e) {
  if (!e.features || e.features.length === 0) return
  const feat = e.features[0]
  const id = feat.id
  if (hoveredId != null && hoveredId !== id) {
    map.setFeatureState({ source: SOURCE_PARCEL, id: hoveredId }, { hover: false })
  }
  if (id != null) {
    map.setFeatureState({ source: SOURCE_PARCEL, id }, { hover: true })
  }
  hoveredId = id
}

function onMouseLeave() {
  if (hoveredId != null) {
    map.setFeatureState({ source: SOURCE_PARCEL, id: hoveredId }, { hover: false })
  }
  hoveredId = null
}

function onParcelClick(e) {
  // line/polygon 绘制模式由 map 级别 click 处理，不在此处理
  if (props.drawMode === 'redline') {
    if (redlineModeClick(e)) return
  }
  if (props.drawMode === 'pick-split') {
    if (pickSplitModeClick(e)) return
  }
  if (props.drawMode === 'pick-merge') {
    if (pickMergeModeClick(e)) return
  }
  // 绘制模式（line/polygon）下不响应用户对图斑的点击，避免误弹抽屉
  if (props.drawMode === 'line' || props.drawMode === 'polygon') return

  if (!e.features || e.features.length === 0) return
  const feat = e.features[0]
  const p = feat.properties || {}
  emit('parcel-click', {
    parcelId: p.parcelId,
    // parcelCode: p.parcelCode,
    parcelName: p.parcelName,
    xzqmc: p.xzqmc,
    status: p.status,
    area: p.area
  })
}

/** map 级别 click：line/polygon 绘制模式下收集点击点（允许在图斑外画线） */
function onMapClickForDraw(e) {
  if (props.drawMode === 'line' || props.drawMode === 'polygon') {
    drawModeClick(e)
  }
}

// ========== 绘制模式处理 ==========

/** 绘制模式下收集点击点 */
function drawModeClick(e) {
  const lngLat = e.lngLat
  if (!lngLat) return false
  drawPoints.value.push({ lng: lngLat.lng, lat: lngLat.lat })
  refreshDrawPreview()
  updatePreviewLine()
  return true
}

/** 鼠标移动 → 更新预览线（从最后一个点到鼠标位置） */
function onDrawMouseMove(e) {
  if (!map) return
  mouseCoord = [e.lngLat.lng, e.lngLat.lat]
  updatePreviewLine()
}

/** 更新预览线 */
function updatePreviewLine() {
  if (!map) return
  // 没有点击点或没有鼠标坐标时不显示预览线
  if (drawPoints.value.length === 0 || !mouseCoord) {
    if (map.getLayer(DRAW_PREVIEW_LAYER)) {
      map.setLayoutProperty(DRAW_PREVIEW_LAYER, 'visibility', 'none')
    }
    return
  }

  const lastPoint = drawPoints.value[drawPoints.value.length - 1]
  const coords = [[lastPoint.lng, lastPoint.lat], mouseCoord]

  // polygon 模式且有 >= 2 个点时，预览线还应该闭合回第一个点
  if (props.drawMode === 'polygon' && drawPoints.value.length >= 2) {
    const firstPoint = drawPoints.value[0]
    coords.push([firstPoint.lng, firstPoint.lat])
  }

  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords }
    }]
  }

  if (map.getSource(DRAW_PREVIEW_SOURCE)) {
    map.getSource(DRAW_PREVIEW_SOURCE).setData(geojson)
    if (map.getLayer(DRAW_PREVIEW_LAYER)) {
      map.setLayoutProperty(DRAW_PREVIEW_LAYER, 'visibility', 'visible')
    }
  } else {
    map.addSource(DRAW_PREVIEW_SOURCE, { type: 'geojson', data: geojson })
    map.addLayer({
      id: DRAW_PREVIEW_LAYER,
      type: 'line',
      source: DRAW_PREVIEW_SOURCE,
      paint: {
        'line-color': '#ffffff',
        'line-width': 2,
        'line-dasharray': [3, 2],
        'line-opacity': 0.8
      }
    })
  }
}

/** 红线模式下点击图斑 → 执行红线分割 */
function redlineModeClick(e) {
  if (!e.features || e.features.length === 0) return false
  const feat = e.features[0]
  const p = feat.properties || {}
  emit('redline-split', {
    parcelId: p.parcelId,
    parcelCode: p.parcelCode
  })
  return true
}

/** 选择分割目标模式：点击图斑 → 通知父组件 */
function pickSplitModeClick(e) {
  if (!e.features || e.features.length === 0) return false
  const feat = e.features[0]
  const p = feat.properties || {}
  emit('pick-split-target', {
    parcelId: p.parcelId,
    parcelCode: p.parcelCode,
    parcelName: p.parcelName
  })
  return true
}

/** 合并选择模式：点击图斑 → 切换选中状态 */
function pickMergeModeClick(e) {
  if (!e.features || e.features.length === 0) return false
  const p = e.features[0].properties || {}
  const id = Number(p.parcelId)
  if (isNaN(id)) return false
  // 切换选中状态
  const idx = mergeSelectedIds.value.indexOf(id)
  if (idx >= 0) {
    mergeSelectedIds.value.splice(idx, 1)
    map.setFeatureState({ source: SOURCE_PARCEL, id }, { mergeSelected: false })
  } else {
    mergeSelectedIds.value.push(id)
    map.setFeatureState({ source: SOURCE_PARCEL, id }, { mergeSelected: true })
  }
  return true
}

/** 清除合并选中状态 */
function clearMergeSelection() {
  if (!map) return
  mergeSelectedIds.value.forEach(id => {
    map.setFeatureState({ source: SOURCE_PARCEL, id }, { mergeSelected: false })
  })
  mergeSelectedIds.value = []
}

/** 确认合并 → emit 选中ID列表 */
function confirmMerge() {
  if (mergeSelectedIds.value.length < 2) return
  emit('merge-confirm', [...mergeSelectedIds.value])
}

/** 刷新绘制预览图层 */
function refreshDrawPreview() {
  if (!map || drawPoints.value.length === 0) return
  const coords = drawPoints.value.map(p => [p.lng, p.lat])

  // 构建 GeoJSON
  const features = []

  // 点
  features.push({
    type: 'Feature',
    geometry: { type: 'MultiPoint', coordinates: coords }
  })

  // 线（至少2个点）
  if (coords.length >= 2) {
    if (props.drawMode === 'line') {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords }
      })
    } else {
      // polygon 预览用线
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [...coords, coords[0]] }
      })
    }
  }

  // 面（至少3个点 + polygon模式）
  if (props.drawMode === 'polygon' && coords.length >= 3) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] }
    })
  }

  const geojson = { type: 'FeatureCollection', features }

  if (map.getSource(DRAW_SOURCE)) {
    map.getSource(DRAW_SOURCE).setData(geojson)
  } else {
    map.addSource(DRAW_SOURCE, { type: 'geojson', data: geojson })
    map.addLayer({
      id: DRAW_LAYER_FILL,
      type: 'fill',
      source: DRAW_SOURCE,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#ff6b6b', 'fill-opacity': 0.2 }
    })
    map.addLayer({
      id: DRAW_LAYER_LINE,
      type: 'line',
      source: DRAW_SOURCE,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#ff6b6b', 'line-width': 3, 'line-dasharray': [1, 1] }
    })
    map.addLayer({
      id: DRAW_LAYER_POINT,
      type: 'circle',
      source: DRAW_SOURCE,
      filter: ['==', ['geometry-type'], 'MultiPoint'],
      paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': '#ff6b6b', 'circle-stroke-width': 3 }
    })
  }
}

/** 完成绘制：生成 WKT 并 emit */
function finishDraw() {
  const coords = drawPoints.value.map(p => [p.lng, p.lat])
  let wkt = ''
  if (props.drawMode === 'line' && coords.length >= 2) {
    wkt = 'LINESTRING(' + coords.map(c => c[0] + ' ' + c[1]).join(',') + ')'
  } else if (props.drawMode === 'polygon' && coords.length >= 3) {
    const ring = [...coords, coords[0]].map(c => c[0] + ' ' + c[1]).join(',')
    wkt = 'POLYGON((' + ring + '))'
  }
  if (wkt) {
    emit('draw-complete', { mode: props.drawMode, wkt })
  }
  clearDrawLayers()
}

/** 撤销最后一个点 */
function undoLastPoint() {
  drawPoints.value.pop()
  refreshDrawPreview()
  updatePreviewLine()
}

/** 取消绘制 */
function cancelDraw() {
  clearDrawLayers()
  emit('draw-cancel')
}

/** 清除绘制图层 */
function clearDrawLayers() {
  drawPoints.value = []
  mouseCoord = null
  if (!map) return
  if (map.getLayer(DRAW_PREVIEW_LAYER)) map.removeLayer(DRAW_PREVIEW_LAYER)
  if (map.getSource(DRAW_PREVIEW_SOURCE)) map.removeSource(DRAW_PREVIEW_SOURCE)
  if (map.getLayer(DRAW_LAYER_POINT)) map.removeLayer(DRAW_LAYER_POINT)
  if (map.getLayer(DRAW_LAYER_LINE)) map.removeLayer(DRAW_LAYER_LINE)
  if (map.getLayer(DRAW_LAYER_FILL)) map.removeLayer(DRAW_LAYER_FILL)
  if (map.getSource(DRAW_SOURCE)) map.removeSource(DRAW_SOURCE)
}

// 监听 drawMode prop 变化 → 进入/退出绘制模式
watch(() => props.drawMode, (mode, oldMode) => {
  if (!map) return
  // 退出 line/polygon 绘制模式时解绑事件
  if (oldMode === 'line' || oldMode === 'polygon') {
    map.off('mousemove', onDrawMouseMove)
    map.off('click', onMapClickForDraw)
  }
  if (mode === 'line' || mode === 'polygon') {
    drawPoints.value = []
    mouseCoord = null
    map.getCanvas().style.cursor = 'crosshair'
    // 绑定 map 级别事件：mousemove → 实时预览线，click → 收集点（允许在图斑外点击）
    map.on('mousemove', onDrawMouseMove)
    map.on('click', onMapClickForDraw)
  } else if (mode === 'redline' || mode === 'pick-split' || mode === 'pick-merge') {
    drawPoints.value = []
    map.getCanvas().style.cursor = 'pointer'
    // 进入合并模式时清空之前的选择
    if (mode === 'pick-merge') {
      clearMergeSelection()
    }
  } else {
    map.getCanvas().style.cursor = ''
    clearDrawLayers()
    clearMergeSelection()
  }
})

/** 列表项点击 → flyTo */
function onListItemClick(feat) {
  const parcelId = feat?.properties?.parcelId
  if (parcelId == null) return
  // emit('parcel-click', feat.properties)
  flyTo(parcelId)
}

/** 飞行到指定图斑（使用本地 parcelFeatures 查找，不依赖 MapLibre 内部 API） */
function flyTo(parcelId) {
  if (!map || !parcelId) return
  const feat = parcelFeatures.value.find((f) => {
    const pid = f.properties?.parcelId
    return pid == parcelId || pid == Number(parcelId) || f.id == parcelId
  })
  if (!feat || !feat.geometry) return
  const coords = extractCoords(feat.geometry)
  if (!coords.length) return
  const bounds = computeBounds(coords)
  if (bounds) {
    map.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 1000 })
  }
  if (map.getLayer(LAYER_HIGHLIGHT)) {
    map.setFilter(LAYER_HIGHLIGHT, ['==', ['get', 'parcelId'], Number(parcelId)])
  }
}

/** 适应所有图斑范围 */
function fitBounds() {
  if (!map) return
  if (!parcelFeatures.value.length) return
  const allCoords = []
  parcelFeatures.value.forEach((f) => {
    allCoords.push(...extractCoords(f.geometry))
  })
  const bounds = computeBounds(allCoords)
  if (bounds) {
    map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 })
  }
}

function extractCoords(geometry) {
  if (!geometry) return []
  const { type, coordinates } = geometry
  if (!coordinates) return []
  if (type === 'Point') return [coordinates]
  if (type === 'MultiPoint' || type === 'LineString') return coordinates
  if (type === 'MultiLineString' || type === 'Polygon') return coordinates.flat()
  if (type === 'MultiPolygon') return coordinates.flat(2)
  return []
}

function computeBounds(coords) {
  const valid = coords.filter((c) => {
    if (!Array.isArray(c) || c.length < 2) return false
    const lng = Number(c[0])
    const lat = Number(c[1])
    if (isNaN(lng) || isNaN(lat)) return false
    if (lng === 0 && lat === 0) return false
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
  })
  if (!valid.length) return null
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  valid.forEach((c) => {
    w = Math.min(w, c[0]); s = Math.min(s, c[1])
    e = Math.max(e, c[0]); n = Math.max(n, c[1])
  })
  if (w === e && s === n) { w -= 0.005; s -= 0.005; e += 0.005; n += 0.005 }
  const buf = Math.max(e - w, n - s) * 0.1
  return [[w - buf, s - buf], [e + buf, n + buf]]
}

function switchLayer(type) {
  handleLayerSwitch(type)
}

function getMap() {
  return map
}

function resize() {
  if (map) {
    map.resize()
  }
}

// ── 照片 marker + 方位角扇形 ──

/**
 * 在地图上显示照片拍摄位置的 marker 和方位角扇形。
 * @param {Object} photo - { longitude, latitude, azimuth, location, shootTime }
 */
function showPhotoMarker(photo) {
  if (!map || !photo || photo.longitude == null || photo.latitude == null) return

  clearPhotoMarker()

  const lng = Number(photo.longitude)
  const lat = Number(photo.latitude)
  const azimuth = photo.azimuth != null ? Number(photo.azimuth) : null

  // 构建 GeoJSON FeatureCollection
  const features = []

  // 1. 方位角扇形（如果有 azimuth）
  if (azimuth != null) {
    const sectorPolygon = generateSectorPolygon(lng, lat, azimuth, 50, 30)
    if (sectorPolygon) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: sectorPolygon }
      })
    }
  }

  // 2. 中心点 marker
  features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {}
  })

  const geojson = { type: 'FeatureCollection', features }

  map.addSource(SOURCE_PHOTO, {
    type: 'geojson',
    data: geojson
  })

  // 扇形填充层
  if (azimuth != null) {
    map.addLayer({
      id: LAYER_PHOTO_SECTOR,
      type: 'fill',
      source: SOURCE_PHOTO,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': '#ff9800',
        'fill-opacity': 0.25
      }
    })
  }

  // 圆点 marker 层
  map.addLayer({
    id: LAYER_PHOTO_MARKER,
    type: 'circle',
    source: SOURCE_PHOTO,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 8,
      'circle-color': '#ff5722',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff'
    }
  })

  // 飞行到照片位置
  map.flyTo({
    center: [lng, lat],
    zoom: Math.max(map.getZoom(), 16),
    duration: 1000
  })
}

/** 清除照片 marker */
function clearPhotoMarker() {
  if (!map) return
  if (map.getLayer(LAYER_PHOTO_MARKER)) map.removeLayer(LAYER_PHOTO_MARKER)
  if (map.getLayer(LAYER_PHOTO_SECTOR)) map.removeLayer(LAYER_PHOTO_SECTOR)
  if (map.getSource(SOURCE_PHOTO)) map.removeSource(SOURCE_PHOTO)
}

/**
 * 生成以 (lng, lat) 为圆心的方位角扇形 Polygon 坐标。
 * @param {number} lng - 中心经度
 * @param {number} lat - 中心纬度
 * @param {number} azimuth - 方位角（0=正北, 90=正东）
 * @param {number} radiusMeters - 扇形半径（米）
 * @param {number} halfSpread - 半张角（度），总张角 = 2 * halfSpread
 * @returns {Array} Polygon coordinates [ring]
 */
function generateSectorPolygon(lng, lat, azimuth, radiusMeters, halfSpread) {
  const R = 6378137 // 地球半径（米）
  const φ1 = lat * Math.PI / 180
  const λ1 = lng * Math.PI / 180
  const δ = radiusMeters / R

  const coords = [[lng, lat]] // 从中心点开始

  const startAngle = azimuth - halfSpread
  const endAngle = azimuth + halfSpread
  const step = 2 // 每 2° 一个点

  for (let angle = startAngle; angle <= endAngle; angle += step) {
    const θ = angle * Math.PI / 180
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
    const λ2 = λ1 + Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    )
    coords.push([λ2 * 180 / Math.PI, φ2 * 180 / Math.PI])
  }

  // 确保最后一个点（endAngle）被包含
  const θEnd = endAngle * Math.PI / 180
  const φ2End = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θEnd))
  const λ2End = λ1 + Math.atan2(
    Math.sin(θEnd) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2End)
  )
  coords.push([λ2End * 180 / Math.PI, φ2End * 180 / Math.PI])

  coords.push([lng, lat]) // 回到中心点闭合
  return [coords]
}

defineExpose({ flyTo, fitBounds, switchLayer, getMap, resize, showPhotoMarker, clearPhotoMarker, clearMergeSelection })

// ── 红线叠加图层 ──

/** 添加/更新红线图层（调用方保证 map 已 ready） */
function updateRedlineLayers(fc) {
  if (!map) return

  // 先清旧的红线图层
  removeRedlineLayers()

  const features = fc?.features
  if (!features || features.length === 0) return

  map.addSource(SOURCE_REDLINE, {
    type: 'geojson',
    data: fc
  })

  const rv = redlineVisible.value ? 'visible' : 'none'

  // 红线填充层（红色半透明，在图斑上面）
  map.addLayer({
    id: LAYER_REDLINE_FILL,
    type: 'fill',
    source: SOURCE_REDLINE,
    layout: { visibility: rv },
    paint: {
      'fill-color': '#e74c3c',
      'fill-opacity': 0.15
    }
  })

  // 红线边线层
  map.addLayer({
    id: LAYER_REDLINE_LINE,
    type: 'line',
    source: SOURCE_REDLINE,
    layout: { visibility: rv },
    paint: {
      'line-color': '#e74c3c',
      'line-width': 2,
      'line-opacity': 0.8
    }
  })
}

/** 清除红线图层 */
function removeRedlineLayers() {
  if (!map) return
  if (map.getLayer(LAYER_REDLINE_LINE)) map.removeLayer(LAYER_REDLINE_LINE)
  if (map.getLayer(LAYER_REDLINE_FILL)) map.removeLayer(LAYER_REDLINE_FILL)
  if (map.getSource(SOURCE_REDLINE)) map.removeSource(SOURCE_REDLINE)
}

// geojson 变化时刷新
watch(
  () => props.geojson,
  (newFc) => {
    if (!map) return
    const fc = newFc || { type: 'FeatureCollection', features: [] }
    syncFeatures(fc)
    calcSummary(parcelFeatures.value)

    const src = map.getSource(SOURCE_PARCEL)
    if (src) {
      src.setData(getCurrentGeoJson())
    } else if (map.isStyleLoaded()) {
      rebuildParcelLayers()
    }

    if (parcelFeatures.value.length) {
      nextTick(() => fitBounds())
    }
  },
  { deep: false }
)

// highlightId 变化
watch(
  () => props.highlightId,
  (newId) => {
    if (!map || !map.getLayer(LAYER_HIGHLIGHT)) return
    map.setFilter(LAYER_HIGHLIGHT, ['==', ['get', 'parcelId'], newId == null ? -1 : Number(newId)])
  }
)

// 红线 geojson 变化 → 更新叠加图层
watch(
  () => props.redlineGeojson,
  (newFc) => {
    const fc = newFc || { type: 'FeatureCollection', features: [] }
    if (!mapReady.value) return
    updateRedlineLayers(fc)
  },
  { deep: false }
)

// 红线可见性开关 → 设置图层 visibility
watch(redlineVisible, (visible) => {
  if (!mapReady.value) return
  const visibility = visible ? 'visible' : 'none'
  if (map.getLayer(LAYER_REDLINE_FILL)) {
    map.setLayoutProperty(LAYER_REDLINE_FILL, 'visibility', visibility)
  }
  if (map.getLayer(LAYER_REDLINE_LINE)) {
    map.setLayoutProperty(LAYER_REDLINE_LINE, 'visibility', visibility)
  }
})

onMounted(() => {
  const initStyle = buildStyle(0)
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: initStyle,
    center: mapConfig.mapInitParams.center,
    zoom: mapConfig.mapInitParams.zoom,
    minZoom: mapConfig.mapInitParams.minZoom,
    maxZoom: mapConfig.mapInitParams.maxZoom,
    attributionControl: false
  })

  map.on('load', () => {
    mapReady.value = true
    addAnnotationLayer(0)

    // 同步 features 到本地
    syncFeatures(props.geojson)
    calcSummary(parcelFeatures.value)

    // 添加 source + 图层
    map.addSource(SOURCE_PARCEL, {
      type: 'geojson',
      data: getCurrentGeoJson(),
      promoteId: 'parcelId'
    })
    addParcelLayerDefinitions()
    bindParcelEvents()

    // 有数据则自动适应范围
    if (parcelFeatures.value.length) {
      nextTick(() => fitBounds())
    }

    // 加载红线叠加图层
    updateRedlineLayers(props.redlineGeojson)


    emit('map-ready', map)
  })
})

onBeforeUnmount(() => {
  if (map) {
    map.off('mousemove', onDrawMouseMove)
    map.off('click', onMapClickForDraw)
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.land-map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}
.land-map-container {
  width: 100%;
  height: 100%;
  background: #e8eef3;
}

/* 图斑列表面板 */
.parcel-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  width: 280px;
  max-height: calc(100% - 24px);
  background: rgba(255, 255, 255, 0.96);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.25s ease;
}
.parcel-panel.collapsed {
  width: 44px;
}
.parcel-panel.collapsed .parcel-panel-header {
  justify-content: center;
  padding: 8px 0;
  border-bottom: none;
}
.parcel-panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
  flex: 1;
}
.panel-count {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  border-radius: 10px;
  padding: 1px 8px;
}
.panel-toggle {
  padding: 2px;
}
.parcel-panel-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.panel-search {
  padding: 8px 10px;
  flex-shrink: 0;
}
.parcel-list {
  overflow-y: auto;
  flex: 1;
  padding: 0 6px 8px;
}
.parcel-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  transition: background 0.15s;
}
.parcel-list-item:hover {
  background: #f5f7fa;
}
.parcel-list-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}
.item-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-code {
  color: #909399;
  font-size: 11px;
  flex-shrink: 0;
}

/* 图层切换控件 */
.land-map-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  padding: 6px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 状态统计角标 */
.land-map-summary {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.land-map-summary b {
  color: #409eff;
  margin: 0 2px;
}
.summary-tag {
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
}
.summary-tag.pending { background: #FFA000; }
.summary-tag.investigating { background: #F44336; }
.summary-tag.completed { background: #4CAF50; }
.summary-tag.audited { background: #1A73E8; }

/* 空数据提示 */
.land-map-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  padding: 16px 24px;
  font-size: 14px;
  color: #909399;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 绘制工具栏 */
.draw-toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 11;
  background: rgba(33, 150, 243, 0.95);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.draw-hint {
  white-space: nowrap;
}
.draw-hint b {
  color: #ffeb3b;
  margin-left: 4px;
}
.draw-toolbar .el-button {
  margin-left: 0;
}
</style>

<style>
/* Popup 全局样式已移除，地图点击改为打开详情抽屉 */
</style>
