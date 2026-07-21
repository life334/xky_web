/**
 * LandMap 地图组件配置
 *
 * 复用自老项目 xakc-screen-ai/src/views/welcome/mapConfig.js
 * 适配点：
 *  - center 改为浙江省中心 [120.15, 30.28]
 *  - 天地图 key 使用新项目独立 key
 *  - 移除后端动态配置拉取逻辑（暂不需要）
 */

// 天地图 key（浙江土地变更调查外业核查系统专用）
const TDT_KEY = 'c064a81ca0133a4e2926a003de96951b'

// 8 个子域，瓦片请求并发加速
const TDT_SUBDOMAINS = Array.from({ length: 8 }, (_, i) => `t${i}.tianditu.gov.cn`)

/** 构造天地图瓦片 URL 数组 */
function buildTdtTiles(layerType) {
  return TDT_SUBDOMAINS.map(
    (host) => `https://${host}/DataServer?T=${layerType}&x={x}&y={y}&l={z}&tk=${TDT_KEY}`
  )
}

/**
 * 底图配置
 * - 影像图 img_w + 注记 cia_w
 * - 矢量图 vec_w + 注记 cva_w
 * 注：天地图经纬度投影（EPSG:4326）的瓦片层级标记为 *_w（Web墨卡托投影）
 *     实际请求的瓦片是 EPSG:3857 切片，MapLibre 默认按 3857 渲染，所以前端几何需为 WGS84
 */
const config = {
  // 浙江省中心坐标（WGS84）
  mapInitParams: {
    center: [120.15, 30.28],
    zoom: 8,
    minZoom: 4,
    maxZoom: 18
  },

  // 底图样式列表（切换图层用）
  mapSources: [
    {
      label: '影像图',
      style: {
        version: 8,
        sources: {
          tdt_img: {
            type: 'raster',
            tiles: buildTdtTiles('img_w'),
            tileSize: 256
          }
        },
        layers: [
          { id: 'tdt_img', type: 'raster', source: 'tdt_img' }
        ]
      }
    },
    {
      label: '矢量图',
      style: {
        version: 8,
        sources: {
          tdt_vec: {
            type: 'raster',
            tiles: buildTdtTiles('vec_w'),
            tileSize: 256
          }
        },
        layers: [
          { id: 'tdt_vec', type: 'raster', source: 'tdt_vec' }
        ]
      }
    }
  ],

  // 注记图层（叠加在底图上方，显示地名/道路等文字）
  // key 对应底图 source 名，切换底图时按 key 找到对应注记
  caSources: {
    tdt_img: {
      sourceName: 'tdt_img_ca',
      sources: {
        type: 'raster',
        tiles: buildTdtTiles('cia_w'),
        tileSize: 256
      },
      layers: {
        id: 'tdt_img_ca',
        type: 'raster',
        source: 'tdt_img_ca'
      }
    },
    tdt_vec: {
      sourceName: 'tdt_vec_ca',
      sources: {
        type: 'raster',
        tiles: buildTdtTiles('cva_w'),
        tileSize: 256
      },
      layers: {
        id: 'tdt_vec_ca',
        type: 'raster',
        source: 'tdt_vec_ca'
      }
    }
  }
}

export default config
