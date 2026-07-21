/**
 * 坐标转换工具
 * 当前项目统一使用 CGCS2000 (SRID 4490)，与 WGS84 偏差较小，可视为一致处理。
 */

/**
 * 经纬度数组转 GeoJSON Point
 */
export function lngLatToPoint([lng, lat]) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    properties: {}
  }
}

/**
 * 计算两点距离（米）
 */
export function distance(p1, p2) {
  const R = 6371000
  const dLat = (p2[1] - p1[1]) * Math.PI / 180
  const dLon = (p2[0] - p1[0]) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
