# land 业务模块

浙江土地变更调查 Web 端业务模块。

## 目录说明

```
src
├── api/land                # 调查业务 API
├── components/LandMap      # 地图组件库
│   └── hooks               # 地图相关 hooks
├── utils/gis               # GIS 工具函数
├── store/modules/land.js   # 调查业务状态
└── views/land              # 调查业务页面
    ├── dashboard           # 调查工作台首页
    ├── task                # 任务批次管理
    ├── parcel              # 图斑管理
    ├── assignment          # 图斑分派
    ├── redline             # 红线数据
    ├── offlinePackage      # 离线包管理
    ├── sync                # 同步日志
    └── setting             # 调查参数配置
```

## 地图组件说明

- 地图引擎：MapLibre GL
- 空间分析：@turf
- 天地图底图：通过 XYZ/WMTS 接入，Key 在 `views/land/setting/index.vue` 中配置
- 坐标系：CGCS2000 (SRID 4490)
