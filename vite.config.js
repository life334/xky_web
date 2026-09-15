import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import createVitePlugins from './vite/plugins'

const baseUrl = 'http://localhost:9997' // 后端接口

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd())
  const { VITE_APP_ENV } = env
  return {
    // 部署生产环境和开发环境下的URL。
    // 默认情况下，vite 会假设你的应用是被部署在一个域名的根路径上
    // 例如 https://www.ruoyi.vip/。如果应用被部署在一个子路径上，你就需要用这个选项指定这个子路径。例如，如果你的应用被部署在 https://www.ruoyi.vip/admin/，则设置 baseUrl 为 /admin/。
    base: VITE_APP_ENV === 'production' ? '/xky-project/' : '/',
    plugins: createVitePlugins(env, command === 'build'),
    resolve: {
      // https://cn.vitejs.dev/config/#resolve-alias
      alias: {
        // 设置路径
        '~': path.resolve(__dirname, './'),
        // 设置别名
        '@': path.resolve(__dirname, './src')
      },
      // https://cn.vitejs.dev/config/#resolve-extensions
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    // 打包配置
    build: {
      // https://vite.dev/config/build-options.html
      sourcemap: command === 'build' ? false : 'inline',
      outDir: 'dist',
      assetsDir: 'assets',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          // 配置：仅把「职责独立、不与 vue 生态交叉」的大库单独分包（长缓存收益最大），
          // 其余 node_modules 统一进 vendor。
          //
          // ⚠️ 为什么不做更细的拆分（重要）：
          // element-plus 依赖 @vueuse/core、@popperjs/core、@floating-ui/dom、lodash-es、dayjs 等，
          // 而这些包又依赖 vue / @vue/shared；同时 vue-vendor 侧模块也可能反向引用 element-plus 内部工具。
          // 一旦按「包名」把它们切到不同 chunk，必然形成 chunk 之间的循环依赖（Rollup 无法保证初始化顺序），
          // 生产环境即报 "Cannot access 'X' before initialization"（TDZ）。
          // 因此 vue 生态（vue + element-plus + 其运行时依赖）必须同处一个 vendor chunk；
          // echarts / maplibre / quill 三个大库互不依赖 vue 生态之外的包，可安全独立。
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            const m = id.split('node_modules/').pop()
            const seg = m.split('/')
            const pkgName = m.startsWith('@') ? seg[0] + '/' + seg[1] : seg[0]

            // 独立大库（与 vue 生态无交叉，单独缓存收益高）
            if (pkgName === 'echarts' || pkgName.startsWith('zrender')) return 'echarts'
            if (pkgName === 'maplibre-gl' || pkgName.startsWith('@mapbox/') || pkgName.startsWith('@maplibre/')) return 'maplibre'
            if (pkgName === 'quill' || pkgName === 'quill-delta' || pkgName.startsWith('@vueup/')) return 'quill'

            // HTTP
            if (pkgName === 'axios') return 'axios'

            // 其余全部归入 vendor（vue、vue-router、pinia、element-plus 及其全部依赖、工具库）
            // 该 chunk 内自闭环，不产生跨 chunk 依赖 —— 这是本项目的稳定分法。
            // 不要再尝试把 lodash/dayjs/popper 等拆出去：element-plus 与 vue 生态对这些包存在
            // 双向引用，一旦分到不同 chunk 即形成循环依赖，生产环境报 TDZ
            // "Cannot access 'X' before initialization"。
            return 'vendor'
          }
        }
      }
    },
    // vite 相关配置
    server: {
      port: 8080,
      host: true,
      open: true,
      proxy: {
        // https://cn.vitejs.dev/config/#server-proxy
        '/dev-api': {
          target: baseUrl,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/dev-api/, '')
        },
         // springdoc proxy
         '^/v3/api-docs/(.*)': {
          target: baseUrl,
          changeOrigin: true,
        }
      }
    },
    css: {
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove()
                }
              }
            }
          }
        ]
      }
    }
  }
})
