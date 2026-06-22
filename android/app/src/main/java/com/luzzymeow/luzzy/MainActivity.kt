package com.luzzymeow.luzzy

import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import fi.iki.elonen.NanoHTTPD

/**
 * LUZZY 主 Activity(方案 D:原生 Kotlin 架构,替代 Capacitor BridgeActivity)。
 *
 * 关键定制:
 * 1. WebViewAssetLoader:用 https://appassets.androidplatform.net/ 协议加载 assets 中的前端资源
 * 2. DownloadListener:万相广场 iframe 内下载(角色卡/UI模板)转发到 JS 层自动导入
 * 3. ApiProxyServer:本地 HTTP 代理服务器,为 TRPG iframe 内的 API 请求绕过 CORS
 * 4. NativeBridge:JavascriptInterface,替代 @capacitor/device、@capacitor/filesystem、@capacitor/share
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
    }

    private var downloadListenerRegistered = false
    private var proxyServer: ApiProxyServer? = null
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader

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
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        initWebView()
        registerDownloadListenerIfNeeded()
        startProxyServerIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        registerDownloadListenerIfNeeded()
        startProxyServerIfNeeded()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopProxyServer()
    }

    /**
     * 初始化 WebView(替代 Capacitor BridgeActivity 的默认配置)
     */
    private fun initWebView() {
        webView = findViewById(R.id.webview)

        // WebViewAssetLoader:用 https://appassets.androidplatform.net/ 协议加载 assets
        // 保留 https 协议,避免混合内容警告,前端代码无需任何路径调整
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        // v0.3.2: 配置 WebView 缓存模式,避免 TRPG iframe 每次冷启动重新下载
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        Log.i(TAG, "WebView settings configured")

        webView.webViewClient = LuzzyWebViewClient(assetLoader)
        webView.webChromeClient = LuzzyWebChromeClient()

        // 注册 JavascriptInterface(替代 Capacitor 的 bridge)
        webView.addJavascriptInterface(NativeBridge(this), "AndroidBridge")
        webView.addJavascriptInterface(ProxyConfigInterface(), "AndroidProxy")
        Log.i(TAG, "JavascriptInterface registered: AndroidBridge + AndroidProxy")

        // 加载前端入口
        // 前端构建产物位于 android/app/src/main/assets/public/index.html
        // WebViewAssetLoader 通过 https://appassets.androidplatform.net/assets/ 前缀访问
        webView.loadUrl("https://appassets.androidplatform.net/assets/public/index.html")
    }

    private fun registerDownloadListenerIfNeeded() {
        if (downloadListenerRegistered) return

        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
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
        private val volcanoArkBase = "https://ark.cn-beijing.volces.com/api/coding"

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
