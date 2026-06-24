package com.luzzymeow.luzzy

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.json.JSONObject
import fi.iki.elonen.NanoHTTPD

/**
 * LUZZY 主 Activity(方案 D:原生 Kotlin 架构,替代 Capacitor BridgeActivity)。
 *
 * 关键定制:
 * 1. WebAssetServer(NanoHTTPD :18528):本地 HTTP 资源服务器,直接从 assets/public/ 直出前端构建产物
 * 2. DownloadListener:万相广场 iframe 内下载(角色卡/UI模板)转发到 JS 层自动导入
 * 3. ApiProxyServer(NanoHTTPD :18527):本地 HTTP 代理服务器,为 TRPG iframe 内的 API 请求绕过 CORS
 * 4. NativeBridge:JavascriptInterface,替代 @capacitor/device、@capacitor/filesystem、@capacitor/share
 *
 * 资源服务器设计(参考 rikkahub web/routes/AIIconRoutes.kt 的 Ktor assets 路由):
 * - 参考 rikkahub 的做法:用本地 HTTP 服务器直出 assets,而非 WebViewAssetLoader
 * - 端口 18528 专用于前端资源请求,不与 18527 API 代理冲突
 * - 与 https://appassets.androidplatform.net 相比,localhost HTTP 不需要 DNS 解析,
 *   不依赖 WebViewAssetLoader 的 path 段约束(/ 不支持),直接通过 WebView 网络栈加载
 *
 * === ApiProxyServer 设计原理 ===
 *
 * 问题背景:
 * - TRPG 模式通过 iframe 嵌入 aisandboxgame.com(在线纯前端页面)
 * - iframe 内的 fetch 调用外部 API(如火山方舟)会被浏览器 CORS 策略拦截
 * - shouldInterceptRequest 无法获取 POST 请求体,无法用于 API 转发
 *
 * 解决方案:
 * - 在 localhost:18527 启动 NanoHTTPD 微型 HTTP 代理服务器
 * - 用户在 TRPG 网页内配置 API 地址为 http://localhost:18527
 * - 代理服务器接收请求,转发到实际 API 服务器,添加 CORS 头
 *
 * URL 映射规则(自动识别,用户无需手动指定目标):
 * - /v3/... → https://ark.cn-beijing.volces.com/api/coding/v3/...(火山方舟 coding plan)
 * - /v1/... → 需要通过 _target 参数指定目标,或默认火山方舟
 * - /<其他>/... → 需要通过 _target 参数指定目标
 *
 * 自定义目标(支持任意 OpenAI 兼容 API):
 * - http://localhost:18527/v1/chat/completions?_target=https://api.deepseek.com
 *   → https://api.deepseek.com/v1/chat/completions
 *
 * 抗更新能力:
 * - 代理机制完全在 Android 原生层,不依赖 aisandboxgame.com 的代码
 * - aisandboxgame.com 更新后,只要仍使用 fetch 调用 OpenAI 兼容端点,代理就有效
 * - 不修改 aisandboxgame.com 的任何代码,只通过本地代理转发请求
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "LUZZY"
        private const val PROXY_PORT = 18527
        private const val WEB_ASSET_PORT = 18528
        // v0.4.6: 文件选择请求码(角色卡导入)
        const val FILE_CHOOSER_REQUEST_CODE = 10001
    }

    private var downloadListenerRegistered = false
    private var proxyServer: ApiProxyServer? = null
    private var webAssetServer: WebAssetServer? = null
    private lateinit var webView: WebView

    // v0.4.6: 文件选择回调(角色卡导入)
    var filePathCallback: ValueCallback<Array<Uri>>? = null
    // v0.4.6: WebView 是否已加载完成(控制 SplashScreen 保持显示)
    @Volatile private var webViewLoaded = false

    // 配置缓存(由 JS 层通过 JavascriptInterface 推送)
    @Volatile private var cachedApiUrl: String = ""
    @Volatile private var cachedApiKey: String = ""
    // 高级设置缓存(TRPG 代理注入使用)
    @Volatile private var cachedEnableThinking: Boolean = false
    @Volatile private var cachedCustomRequestBody: String = ""

    /**
     * JS 接口,供 LUZZY 主页面推送 API 配置到原生层。
     * NanoHTTPD 代理使用此配置转发 TRPG iframe 内的请求。
     */
    inner class ProxyConfigInterface {
        @JavascriptInterface
        fun setApiConfig(apiUrl: String?, apiKey: String?) {
            cachedApiUrl = apiUrl ?: ""
            cachedApiKey = apiKey ?: ""
            Log.i(TAG, "API config updated: url=$apiUrl key=***")
        }

        @JavascriptInterface
        fun setAdvancedSettings(enableThinking: String?, customRequestBody: String?) {
            cachedEnableThinking = "true" == enableThinking
            cachedCustomRequestBody = customRequestBody ?: ""
            Log.i(
                TAG,
                "Advanced settings updated: thinking=$cachedEnableThinking customBodyLen=${cachedCustomRequestBody.length}"
            )
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // 必须在 super.onCreate() 之前调用,将 SplashScreen 主题切换为 postSplashScreenTheme
        // 否则 Activity 会因主题不兼容 AppCompatActivity 而闪退
        // v0.4.6: 添加 keepOnScreenCondition,在 WebView 加载完成前保持 Splash 显示,
        // 避免从其他 app 返回时短暂白屏
        val splashScreenViewProvider = installSplashScreen()
        splashScreenViewProvider.setKeepOnScreenCondition { !webViewLoaded }
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // v0.8.6-fix: SplashScreen 超时兜底,避免 WebAssetServer 启动失败时永久卡住
        Handler(Looper.getMainLooper()).postDelayed({
            if (!webViewLoaded) {
                webViewLoaded = true
                Log.w(TAG, "Splash timeout (10s), forcing dismiss")
            }
        }, 10000)
        // v0.8.6-fix: 服务器启动移到后台线程,避免主线程阻塞导致 ANR
        // 使用 CountDownLatch 同步,最多等待 2 秒
        val serverLatch = CountDownLatch(1)
        Thread {
            startWebAssetServerIfNeeded()
            serverLatch.countDown()
        }.start()
        try {
            serverLatch.await(2, TimeUnit.SECONDS)
        } catch (e: InterruptedException) {
            Log.w(TAG, "Server startup wait interrupted: ${e.message}")
        }
        initWebView(savedInstanceState)
        registerDownloadListenerIfNeeded()
        // API Proxy Server 非关键路径,完全异步启动
        Thread { startProxyServerIfNeeded() }.start()
    }

    override fun onResume() {
        super.onResume()
        // v0.4.6: WebView 恢复活跃状态
        if (::webView.isInitialized) {
            webView.onResume()
            webView.resumeTimers()
        }
        registerDownloadListenerIfNeeded()
        // v0.8.6-fix: 服务器启动移到后台线程,避免主线程阻塞
        Thread {
            startWebAssetServerIfNeeded()
            startProxyServerIfNeeded()
        }.start()
    }

    // v0.4.6: 完善 WebView 生命周期,避免从其他 app 返回时白屏
    override fun onPause() {
        super.onPause()
        if (::webView.isInitialized) {
            webView.onPause()
        }
    }

    override fun onStop() {
        super.onStop()
        // v0.4.6: 停止 WebView 定时器,降低后台 CPU 占用
        if (::webView.isInitialized) {
            webView.pauseTimers()
        }
    }

    override fun onStart() {
        super.onStart()
        // v0.4.6: 恢复 WebView 定时器
        if (::webView.isInitialized) {
            webView.resumeTimers()
        }
    }

    // v0.4.6: 保存 WebView 状态,避免 Activity 重建后白屏
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::webView.isInitialized) {
            webView.saveState(outState)
            Log.i(TAG, "WebView state saved")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopProxyServer()
        stopWebAssetServer()
        // v0.4.6: 清理文件选择回调
        cancelFilePathCallback()
    }

    // v0.4.6: 处理文件选择结果(角色卡导入)
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            val callback = filePathCallback
            filePathCallback = null
            if (callback == null) {
                Log.w(TAG, "File chooser callback is null")
                return
            }
            // 结果处理
            val result: Array<Uri>? = when {
                resultCode != RESULT_OK -> {
                    Log.i(TAG, "File chooser canceled")
                    null
                }
                data?.data != null -> {
                    Log.i(TAG, "File selected: ${data.data}")
                    arrayOf(data.data!!)
                }
                data?.clipData != null -> {
                    val count = data.clipData!!.itemCount
                    val uris = Array<Uri>(count) { i -> data.clipData!!.getItemAt(i).uri }
                    Log.i(TAG, "Files selected: $count")
                    uris
                }
                else -> {
                    Log.w(TAG, "File chooser returned no data")
                    null
                }
            }
            try {
                callback.onReceiveValue(result)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to deliver file chooser result: ${e.message}", e)
            }
        }
    }

    // v0.4.6: 取消文件选择回调(用于新选择开始前或 Activity 销毁时)
    fun cancelFilePathCallback() {
        filePathCallback?.let {
            try {
                it.onReceiveValue(null)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to cancel file chooser callback: ${e.message}")
            }
        }
        filePathCallback = null
    }

    // v0.4.6: WebView 页面加载完成回调,关闭 SplashScreen
    fun onWebViewPageFinished() {
        webViewLoaded = true
        Log.i(TAG, "WebView page finished, SplashScreen dismissed")
    }

    /**
     * 初始化 WebView(替代 Capacitor BridgeActivity 的默认配置)。
     *
     * 前端资源加载方案(参考 rikkahub 的 Ktor assets 路由):
     * - WebAssetServer 在 localhost:18528 直出 assets/public/ 目录
     * - WebView 通过 http://localhost:18528/index.html 加载首页
     * - 子资源 /assets/xxx.js、/fonts/xxx.woff2 等由 WebAssetServer 统一处理
     * - 与 WebViewAssetLoader 相比,localhost HTTP 不需要 DNS 解析,也不受 path 段约束
     */
    private fun initWebView(savedInstanceState: Bundle? = null) {
        webView = findViewById(R.id.webview)

        // 启用 WebView 远程调试(Chrome DevTools://inspect 可见),便于排查前端运行时错误
        WebView.setWebContentsDebuggingEnabled(true)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        Log.i(TAG, "WebView settings configured")

        webView.webViewClient = LuzzyWebViewClient(this)
        // v0.4.6: 传入 MainActivity 引用,支持 onShowFileChooser
        webView.webChromeClient = LuzzyWebChromeClient(this)

        // 注册 JavascriptInterface(替代 Capacitor 的 bridge)
        webView.addJavascriptInterface(NativeBridge(this), "AndroidBridge")
        webView.addJavascriptInterface(ProxyConfigInterface(), "AndroidProxy")
        Log.i(TAG, "JavascriptInterface registered: AndroidBridge + AndroidProxy")

        // v0.4.6: 优先恢复 WebView 状态(避免 Activity 重建后白屏)
        // 注意:restoreState 恢复的是 WebView 历史栈,不恢复前端 JS 状态
        // 前端使用 IndexedDB 持久化,恢复后会从存储重新加载
        // v0.8.6-fix: restoreState 后不提前 return,继续执行 loadUrl 作为兜底
        // 避免 WebAssetServer 未就绪时恢复的页面无法加载资源
        if (savedInstanceState != null) {
            val restored = webView.restoreState(savedInstanceState)
            if (restored != null) {
                Log.i(TAG, "WebView state restored from savedInstanceState")
                webViewLoaded = false
            }
        }

        // v0.8.6-fix: 服务器启动失败时加载本地错误页面,避免白屏
        if (webAssetServer == null || !webAssetServer!!.isAlive) {
            Log.e(TAG, "WebAssetServer not running, loading error page")
            webView.loadDataWithBaseURL(
                null,
                """<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="font-family:sans-serif;padding:24px;text-align:center;background:#f5f5f5;color:#333">
                <h2>启动失败</h2><p>资源服务器启动失败,请重启应用。</p>
                <p style="color:#999;font-size:12px">如果问题持续,请清除应用数据后重试。</p>
                </body></html>""".trimIndent(),
                "text/html",
                "UTF-8",
                null
            )
            return
        }

        // 加载前端入口
        // 前端构建产物在 assets/public/ 下,WebAssetServer 在 localhost:18528 提供 HTTP 服务
        // 必须使用根路径 / 而非 /index.html:React Router 7 SPA 模式下,
        // index.html 内 SSR context 的 pathname 为 "/",若加载 /index.html 则浏览器 URL 变为
        // /index.html 导致路由不匹配,React Router 渲染 404 页面
        webView.loadUrl("http://localhost:$WEB_ASSET_PORT/")
    }

    private fun registerDownloadListenerIfNeeded() {
        if (downloadListenerRegistered) return

        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
            // v0.4.6: blob: 和 data: URL 由前端处理,不在此拦截
            // 仅转发 http/https 下载(万相广场角色卡/UI模板下载)到 JS 层自动导入
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                Log.i(TAG, "Download skipped (blob/data URL): $url")
                return@setDownloadListener
            }
            val js = String.format(
                "try{window.LuzzyAutoImport&&window.LuzzyAutoImport(%s,%s);}catch(e){console.error('[LUZZY] AutoImport failed:',e);}",
                jsString(url), jsString(mimetype)
            )
            webView.post { webView.evaluateJavascript(js, null) }
            Log.i(TAG, "Download forwarded to JS: $url")
        }
        Log.i(TAG, "ProxyConfigInterface registered as window.AndroidProxy")
        downloadListenerRegistered = true
        Log.i(TAG, "DownloadListener registered")
    }

    private fun startProxyServerIfNeeded() {
        if (proxyServer != null && proxyServer!!.isAlive) return
        try {
            proxyServer = ApiProxyServer()
            proxyServer!!.start()
            Log.i(TAG, "API Proxy Server started on port $PROXY_PORT")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start API Proxy Server", e)
        }
    }

    // v0.4.6: WebAssetServer 启动添加重试逻辑(最多 3 次,间隔 100ms)
    // 避免端口占用或初始化竞态导致白屏
    // v0.8.6-fix: 返回 Boolean 表示启动成功/失败,供调用方决定是否加载错误页面
    private fun startWebAssetServerIfNeeded(): Boolean {
        if (webAssetServer != null && webAssetServer!!.isAlive) return true
        val maxRetries = 3
        var attempt = 0
        while (attempt < maxRetries) {
            try {
                webAssetServer = WebAssetServer(applicationContext, WEB_ASSET_PORT)
                webAssetServer!!.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
                Log.i(TAG, "Web Asset Server started on port $WEB_ASSET_PORT (attempt ${attempt + 1})")
                return true
            } catch (e: Exception) {
                attempt++
                Log.e(TAG, "Failed to start Web Asset Server (attempt $attempt/$maxRetries): ${e.message}", e)
                // 停止可能残留的实例
                try {
                    webAssetServer?.stop()
                } catch (ignore: Exception) {}
                webAssetServer = null
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(100)
                    } catch (ignore: InterruptedException) {
                        Thread.currentThread().interrupt()
                        break
                    }
                }
            }
        }
        Log.e(TAG, "Web Asset Server failed to start after $maxRetries attempts")
        return false
    }

    private fun stopWebAssetServer() {
        if (webAssetServer != null) {
            webAssetServer!!.stop()
            webAssetServer = null
            Log.i(TAG, "Web Asset Server stopped")
        }
    }

    private fun stopProxyServer() {
        if (proxyServer != null) {
            proxyServer!!.stop()
            proxyServer = null
            Log.i(TAG, "API Proxy Server stopped")
        }
    }

    /**
     * 本地 HTTP 代理服务器。
     *
     * 自动识别 API 路径前缀,转发到对应的目标 API 服务器:
     * - /v3/... → 火山方舟 coding plan(ark.cn-beijing.volces.com/api/coding/v3)
     * - /v1/... + _target 参数 → 自定义目标
     * - 其他 + _target 参数 → 自定义目标
     *
     * 用户在 TRPG 网页内配置:
     * - 火山方舟:API 地址填 http://localhost:18527/v3
     * - DeepSeek:API 地址填 http://localhost:18527/v1?_target=https://api.deepseek.com
     * - 其他:API 地址填 http://localhost:18527/<路径>?_target=<目标地址>
     */
    inner class ApiProxyServer : NanoHTTPD("127.0.0.1", PROXY_PORT) {

        // 火山方舟 coding plan API 基础地址
        private val volcanoArkBase = "https://ark.cn-beijing.volces.com/api/coding/v3"

        override fun serve(session: IHTTPSession): Response {
            // OPTIONS 预检请求直接返回 CORS 头
            if (session.method == Method.OPTIONS) {
                val response = newFixedLengthResponse(Response.Status.OK, "text/plain", "")
                addCorsHeaders(response)
                return response
            }

            try {
                val uri = session.uri
                val method = session.method

                // 检查 LUZZY 配置是否可用
                if (cachedApiUrl.isEmpty()) {
                    val errResp = newFixedLengthResponse(
                        Response.Status.SERVICE_UNAVAILABLE,
                        "application/json",
                        "{\"error\":\"LUZZY API config not set. Please configure API in LUZZY settings first.\"}"
                    )
                    addCorsHeaders(errResp)
                    return errResp
                }

                // 注意:不再调用 session.parseBody(params)。
                // parseBody 会用 ISO-8859-1 解码请求体到 String,再 getBytes("UTF-8") 重编码
                // 会造成 latin-1 → UTF-8 双重编码,导致中文(尤其是工具回填后的 tool_calls.arguments
                // 与 role:'tool'.content)变成 mojibake。改为字节透传,见下方 POST/PUT/PATCH 分支。

                // 提取 endpoint(去掉版本前缀 /v1、/v3、/v2 等)
                var endpoint = uri.replaceFirst("^/v\\d+".toRegex(), "")
                if (endpoint.startsWith("/")) endpoint = endpoint.substring(1)

                // v0.4.2-fix: 正确使用 resolveTargetBase() 确定目标 API 基础地址
                // 修复 Bug1: 之前直接用 cachedApiUrl(占位符)作为 baseUrl,导致火山方舟请求失败
                // 现在的逻辑:
                //   1. /v3/* 无 _target → 火山方舟 coding plan(硬编码 volcanoArkBase)
                //   2. /v1/* 或其他 + _target → 自定义目标(支持任意 OpenAI 兼容 API)
                //   3. /v1/* 或其他 无 _target → 回退到 cachedApiUrl(仅当非占位符时)
                var baseUrl = resolveTargetBase(session, uri)
                if (baseUrl == null) {
                    // 无 _target 且非 /v3 路径
                    // v0.4.2-fix: 防止回退到 localhost 代理地址导致死循环
                    // 若 cachedApiUrl 是占位符(包含 localhost:18527),说明用户配置错误
                    val cachedUrl = cachedApiUrl
                    if (cachedUrl.contains("localhost:18527") || cachedUrl.contains("127.0.0.1:18527")) {
                        Log.w(TAG, "Proxy: cachedApiUrl is a placeholder (localhost:18527), cannot resolve target")
                        val errResp = newFixedLengthResponse(
                            Response.Status.BAD_REQUEST,
                            "application/json",
                            "{\"error\":\"无法确定目标 API 地址。请在 TRPG 网页内配置 API 地址为 http://localhost:18527/v3(火山方舟)或 http://localhost:18527/v1?_target=https://你的供应商地址(其他供应商)。\"}"
                        )
                        addCorsHeaders(errResp)
                        return errResp
                    }
                    baseUrl = cachedUrl.replace("/+$".toRegex(), "")
                    Log.i(TAG, "Proxy: no _target, falling back to cachedApiUrl: $baseUrl")
                } else {
                    baseUrl = baseUrl.replace("/+$".toRegex(), "")
                }
                var targetUrl = "$baseUrl/$endpoint"

                // 保留 query string(移除 _target 参数,向后兼容)
                val queryString = buildQueryString(session)
                if (queryString.isNotEmpty()) {
                    targetUrl += "?$queryString"
                }

                Log.i(TAG, "Proxy: $method $uri -> $targetUrl")

                // 转发请求
                val url = URL(targetUrl)
                val conn = (url.openConnection() as HttpURLConnection)
                conn.requestMethod = method.name
                conn.connectTimeout = 30000
                conn.readTimeout = 0 // v0.3.5: 流式响应无超时,避免长时间思考被中断
                conn.doInput = true

                // 复制请求头(排除不需要转发的头,排除占位符 Authorization)
                for ((key, value) in session.headers) {
                    val keyLower = key.lowercase()
                    if (keyLower == "host" || keyLower == "connection" ||
                        keyLower == "content-length" || keyLower == "accept-encoding" ||
                        keyLower == "origin" || keyLower == "referer" ||
                        keyLower == "authorization"
                    ) {
                        continue
                    }
                    conn.setRequestProperty(key, value)
                }

                // v0.4.4: 显式禁用 gzip,避免 HttpURLConnection 缓冲完整 gzip 响应导致流式失效
                conn.setRequestProperty("Accept-Encoding", "identity")

                // 使用 LUZZY 的 apiKey 设置 Authorization
                // v0.4.2-fix: 火山方舟编码计划(/v3 路径)使用 coding plan 认证,不需要 API Key
                // 若 cachedApiKey 是占位符(如 "placeholder" 或空),且目标是火山方舟,则不注入 Authorization
                val isVolcanoArk = targetUrl.contains("ark.cn-beijing.volces.com")
                val isPlaceholderKey = cachedApiKey.isEmpty() ||
                    cachedApiKey.equals("placeholder", ignoreCase = true) ||
                    cachedApiKey.contains("localhost:18527")
                if (isVolcanoArk && isPlaceholderKey) {
                    Log.i(TAG, "Proxy: skipping Authorization for Volcano Ark coding plan (no key needed)")
                } else if (cachedApiKey.isNotEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer $cachedApiKey")
                }

                // 写入请求体(字节透传,保留原样包括 model 字段与中文)
                // 关键修复:弃用 parseBody().get("postData") 字符串中转路径,
                // 改为直接从 session.getInputStream() 读字节并透传,彻底避免编码损坏。
                if (method == Method.POST || method == Method.PUT || method == Method.PATCH) {
                    conn.doOutput = true
                    // 读取请求体字节长度(NanoHTTPD 已把 Content-Length 解析进 headers)
                    val contentLengthHeader = session.headers["content-length"]
                    var contentLength = -1
                    if (contentLengthHeader != null) {
                        try {
                            contentLength = contentLengthHeader.trim().toInt()
                        } catch (ignore: NumberFormatException) {
                            contentLength = -1
                        }
                    }

                    // 读取完整请求体到内存(用于高级设置注入)
                    val clientIn: InputStream = session.inputStream
                    val baos = ByteArrayOutputStream()
                    val buf = ByteArray(8192)
                    var total: Long = 0
                    while (true) {
                        val toRead = if (contentLength >= 0) {
                            minOf(buf.size.toLong(), (contentLength - total)).toInt()
                        } else {
                            buf.size
                        }
                        if (toRead <= 0) break
                        val n = clientIn.read(buf, 0, toRead)
                        if (n <= 0) break
                        baos.write(buf, 0, n)
                        total += n
                        if (contentLength >= 0 && total >= contentLength) break
                    }
                    var bodyBytes = baos.toByteArray()

                    // 高级设置注入:仅对 chat/completions 端点生效
                    // 捕获局部变量避免多线程读写不一致
                    val enableThinking = cachedEnableThinking
                    val customBody = cachedCustomRequestBody
                    val shouldInject = uri.contains("chat/completions") &&
                        (enableThinking || customBody.isNotEmpty())
                    if (shouldInject) {
                        try {
                            val bodyStr = String(bodyBytes, Charsets.UTF_8)
                            val json = JSONObject(bodyStr)

                            // 注入深度思考开关(独立 try-catch,避免自定义请求体解析失败影响 thinking 注入)
                            if (enableThinking && !json.has("thinking")) {
                                json.put("thinking", JSONObject().put("type", "enabled"))
                            }

                            // 注入自定义请求体字段
                            if (customBody.isNotEmpty()) {
                                try {
                                    val custom = JSONObject(customBody)
                                    val keys = custom.keys()
                                    while (keys.hasNext()) {
                                        val key = keys.next()
                                        if (key == "model" || key == "messages") continue
                                        json.put(key, custom.get(key))
                                    }
                                } catch (ce: Exception) {
                                    Log.w(
                                        TAG,
                                        "Failed to parse custom request body: ${ce.message} — skipping custom fields, thinking injection still applied"
                                    )
                                }
                            }

                            bodyBytes = json.toString().toByteArray(Charsets.UTF_8)
                            Log.i(TAG, "Advanced settings injected into request body")
                        } catch (e: Exception) {
                            Log.w(
                                TAG,
                                "Failed to inject advanced settings: ${e.message} — using original request body"
                            )
                            // 注入失败时使用原始请求体
                        }
                    }

                    conn.setFixedLengthStreamingMode(bodyBytes.size.toLong())
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.outputStream.use { upstreamOut ->
                        upstreamOut.write(bodyBytes)
                        upstreamOut.flush()
                    }
                }

                // 读取响应
                val responseCode = conn.responseCode
                var contentType = conn.contentType
                if (contentType == null) contentType = "application/json"

                val inputStream: InputStream? =
                    if (responseCode >= 400) conn.errorStream else conn.inputStream

                Log.i(TAG, "Proxy response: $responseCode type=$contentType for $targetUrl")

                // 统一使用流式透传(修复延迟和乱码)
                // v0.4.4: 禁用代理响应缓冲
                val response = newChunkedResponse(
                    Response.Status.lookup(responseCode),
                    contentType,
                    inputStream
                )
                response.addHeader("Cache-Control", "no-cache")
                response.addHeader("X-Accel-Buffering", "no")
                addCorsHeaders(response)
                copyResponseHeaders(conn, response)
                return response
            } catch (e: Exception) {
                Log.e(TAG, "Proxy error: ${e.message}", e)
                val errMsg = e.message?.replace("\"", "\\\"") ?: e.javaClass.simpleName
                val errorResponse = newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    "{\"error\":\"Proxy failed: $errMsg\"}"
                )
                addCorsHeaders(errorResponse)
                return errorResponse
            }
        }

        /**
         * 根据请求路径和参数确定目标 API 基础地址。
         *
         * v0.4.2-fix: 此方法现在被 serve() 正确调用,修复火山方舟 API 转发失败的问题
         *
         * 优先级:
         * 1. _target 参数(最高优先级,支持任意 API)
         *    - 适用场景:用户在 TRPG 网页配置 API 地址为
         *      http://localhost:18527/v1?_target=https://api.deepseek.com
         *    - 支持任意 OpenAI 兼容 API(需转发的场景)
         * 2. /v3 路径前缀(火山方舟 coding plan)
         *    - 适用场景:用户在 TRPG 网页配置 API 地址为 http://localhost:18527/v3
         *    - 自动转发到 https://ark.cn-beijing.volces.com/api/coding/v3
         * 3. 返回 null(由调用方回退到 cachedApiUrl)
         *    - 适用场景:用户在 LUZZY 设置页直接填写真实 API 地址(无需转发的场景)
         */
        private fun resolveTargetBase(session: IHTTPSession, uri: String): String? {
            // 1. 检查 _target 参数(最高优先级)
            val targetParam = getParam(session, "_target")
            if (!targetParam.isNullOrEmpty()) {
                // 去除末尾斜杠
                return targetParam.replace("/+$".toRegex(), "")
            }

            // 2. /v3 路径 → 火山方舟 coding plan
            if (uri.startsWith("/v3") || uri.startsWith("/v3/")) {
                return volcanoArkBase
            }

            // 3. /v1 路径 → 无 _target 时无法确定目标,返回 null 触发错误提示
            //    (因为 /v1 是通用版本号,不能假设是哪个 API 提供商)
            return null
        }

        /**
         * 构建转发到目标 API 的 query string(移除 _target 参数)
         */
        private fun buildQueryString(session: IHTTPSession): String {
            var queryString = session.queryParameterString ?: ""
            if (queryString.isEmpty()) {
                return ""
            }
            // 移除 _target 参数及其可能带的前导 & 或 ?
            queryString = queryString.replace("(^|[&?])_target=[^&]*".toRegex(), "")
            // 清理开头和连续的多余 & 或 ?
            queryString = queryString.replace("^[&?]+".toRegex(), "")
            queryString = queryString.replace("&{2,}".toRegex(), "&")
            return queryString
        }

        private fun addCorsHeaders(response: Response) {
            response.addHeader("Access-Control-Allow-Origin", "*")
            response.addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
            response.addHeader("Access-Control-Allow-Headers", "*")
            response.addHeader("Access-Control-Max-Age", "86400")
        }

        private fun copyResponseHeaders(conn: HttpURLConnection, response: Response) {
            for ((key, values) in conn.headerFields) {
                if (key != null &&
                    !key.equals("Content-Type", ignoreCase = true) &&
                    !key.equals("Content-Length", ignoreCase = true) &&
                    !key.equals("Transfer-Encoding", ignoreCase = true) &&
                    !key.equals("Content-Encoding", ignoreCase = true) &&
                    // 跳过 CORS 头,避免与 addCorsHeaders 设置的头重复导致浏览器 CORS 冲突
                    !key.lowercase().startsWith("access-control-")
                ) {
                    for (value in values) {
                        response.addHeader(key, value)
                    }
                }
            }
        }

        private fun getParam(session: IHTTPSession, name: String): String? {
            val values = session.parameters[name]
            return if (!values.isNullOrEmpty()) values[0] else null
        }
    }

    /**
     * 转义字符串为 JS 字符串字面量(含双引号),用于 evaluateJavascript
     */
    private fun jsString(s: String?): String {
        if (s == null) return "null"
        return "\"" + s.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\u2028", "\\u2028")
            .replace("\u2029", "\\u2029") + "\""
    }
}
