package com.luzzymeow.rphub;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.DownloadListener;

import com.getcapacitor.BridgeActivity;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

/**
 * RP-Hub 主 Activity。
 *
 * 关键定制：
 * 1. DownloadListener：万相广场 iframe 内下载（角色卡/UI模板）转发到 JS 层自动导入
 * 2. ApiProxyServer：本地 HTTP 代理服务器，为 TRPG iframe 内的 API 请求绕过 CORS
 *
 * ApiProxyServer 工作流程：
 * 1. 在 localhost:18527 启动微型 HTTP 代理服务器
 * 2. 用户在 TRPG 网页（aisandboxgame.com）内配置 API 地址为 http://localhost:18527/v3
 * 3. TRPG iframe 内的 fetch 请求发送到本地代理
 * 4. 代理服务器接收请求，转发到实际的 API 服务器（如 ark.cn-beijing.volces.com）
 * 5. 代理服务器在响应中添加 CORS 头（Access-Control-Allow-Origin 等）
 * 6. 支持 SSE 流式响应透传
 *
 * 为什么不用 shouldInterceptRequest？
 * - Android WebView 的 shouldInterceptRequest 无法获取 POST 请求体
 * - CapacitorHttp 通过 JS Bridge 传递请求体，但只对主页面有效，iframe 内无法使用
 * - 本地代理服务器是最可靠的方案，支持所有 HTTP 方法、请求体和流式响应
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "RP-Hub";
    private static final int PROXY_PORT = 18527;
    private boolean downloadListenerRegistered = false;
    private ApiProxyServer proxyServer;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerDownloadListenerIfNeeded();
        startProxyServerIfNeeded();
    }

    @Override
    public void onResume() {
        super.onResume();
        registerDownloadListenerIfNeeded();
        startProxyServerIfNeeded();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopProxyServer();
    }

    private void registerDownloadListenerIfNeeded() {
        if (downloadListenerRegistered) return;
        if (this.bridge == null) return;
        WebView webView = this.bridge.getWebView();
        if (webView == null) return;

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent,
                                        String contentDisposition, String mimetype,
                                        long contentLength) {
                String js = String.format(
                    "try{window.RPHubAutoImport&&window.RPHubAutoImport(%s,%s);}catch(e){console.error('[RP-Hub] AutoImport failed:',e);}",
                    jsString(url), jsString(mimetype)
                );
                webView.post(() -> webView.evaluateJavascript(js, null));
                Log.i(TAG, "Download forwarded to JS: " + url);
            }
        });
        downloadListenerRegistered = true;
        Log.i(TAG, "DownloadListener registered");
    }

    private void startProxyServerIfNeeded() {
        if (proxyServer != null && proxyServer.isAlive()) return;
        try {
            proxyServer = new ApiProxyServer();
            proxyServer.start();
            Log.i(TAG, "API Proxy Server started on port " + PROXY_PORT);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start API Proxy Server", e);
        }
    }

    private void stopProxyServer() {
        if (proxyServer != null) {
            proxyServer.stop();
            proxyServer = null;
            Log.i(TAG, "API Proxy Server stopped");
        }
    }

    /**
     * 本地 HTTP 代理服务器。
     *
     * URL 映射规则：
     * - 请求 http://localhost:18527/v3/chat/completions
     *   → 转发到 https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions
     * - 请求 http://localhost:18527/v1/chat/completions?_target=https://api.deepseek.com
     *   → 转发到 https://api.deepseek.com/v1/chat/completions
     *
     * 默认目标：火山方舟 coding plan API（ark.cn-beijing.volces.com/api/coding）
     * 可通过 _target query parameter 指定其他 API 服务器
     */
    private class ApiProxyServer extends NanoHTTPD {

        private static final String DEFAULT_TARGET_BASE = "https://ark.cn-beijing.volces.com/api/coding";

        public ApiProxyServer() {
            super(PROXY_PORT);
        }

        @Override
        public Response serve(IHTTPSession session) {
            // OPTIONS 预检请求直接返回 CORS 头
            if (session.getMethod() == Method.OPTIONS) {
                Response response = newFixedLengthResponse(Response.Status.OK, "text/plain", "");
                addCorsHeaders(response);
                return response;
            }

            try {
                String uri = session.getUri();
                Method method = session.getMethod();
                String targetBase = DEFAULT_TARGET_BASE;

                // 解析请求体
                Map<String, String> params = new HashMap<>();
                session.parseBody(params);

                // 检查是否有 _target 参数指定其他 API 服务器
                String targetParam = getParam(session, "_target");
                if (targetParam != null && !targetParam.isEmpty()) {
                    targetBase = targetParam;
                }

                // 构建目标 URL
                String targetUrl = targetBase + uri;
                String queryString = session.getQueryParameterString();
                // 移除 _target 参数
                if (queryString != null && !queryString.isEmpty()) {
                    queryString = queryString.replaceAll("[&?]_target=[^&]*", "");
                    if (!queryString.isEmpty()) {
                        targetUrl += "?" + queryString;
                    }
                }

                Log.i(TAG, "Proxy: " + method + " " + uri + " -> " + targetUrl);

                // 转发请求
                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method.name());
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(180000); // 3 分钟超时，适配长对话
                conn.setDoInput(true);

                // 复制请求头
                for (Map.Entry<String, String> header : session.getHeaders().entrySet()) {
                    String key = header.getKey().toLowerCase();
                    if ("host".equals(key) || "connection".equals(key) ||
                        "content-length".equals(key) || "accept-encoding".equals(key) ||
                        "origin".equals(key) || "referer".equals(key)) {
                        continue;
                    }
                    conn.setRequestProperty(header.getKey(), header.getValue());
                }

                // 写入请求体（POST/PUT/PATCH）
                if (method == Method.POST || method == Method.PUT || method == Method.PATCH) {
                    conn.setDoOutput(true);
                    String postData = params.get("postData");
                    if (postData != null && !postData.isEmpty()) {
                        byte[] body = postData.getBytes("UTF-8");
                        try (OutputStream os = conn.getOutputStream()) {
                            os.write(body);
                            os.flush();
                        }
                    }
                }

                // 读取响应
                int responseCode = conn.getResponseCode();
                String contentType = conn.getContentType();
                if (contentType == null) contentType = "application/json";

                InputStream inputStream = responseCode >= 400 ? conn.getErrorStream() : conn.getInputStream();

                // 检测是否为 SSE 流式响应
                boolean isSSE = contentType != null &&
                    (contentType.contains("text/event-stream") || contentType.contains("application/stream"));

                Log.i(TAG, "Proxy response: " + responseCode + " type=" + contentType +
                    " sse=" + isSSE + " for " + targetUrl);

                if (isSSE) {
                    // SSE 流式响应：使用 Chunked 编码透传
                    final InputStream proxyInput = inputStream;
                    Response response = newChunkedResponse(
                        Response.Status.lookup(responseCode),
                        contentType,
                        proxyInput
                    );
                    addCorsHeaders(response);

                    // 复制响应头
                    copyResponseHeaders(conn, response);

                    return response;
                } else {
                    // 普通响应：读取完整内容
                    String responseBody = readFully(inputStream);

                    Response response = newFixedLengthResponse(
                        Response.Status.lookup(responseCode),
                        contentType,
                        responseBody
                    );
                    addCorsHeaders(response);
                    copyResponseHeaders(conn, response);

                    conn.disconnect();
                    return response;
                }

            } catch (Exception e) {
                Log.e(TAG, "Proxy error: " + e.getMessage(), e);
                Response errorResponse = newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    "{\"error\":\"Proxy failed: " + e.getMessage().replace("\"", "\\\"") + "\"}"
                );
                addCorsHeaders(errorResponse);
                return errorResponse;
            }
        }

        private void addCorsHeaders(Response response) {
            response.addHeader("Access-Control-Allow-Origin", "*");
            response.addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            response.addHeader("Access-Control-Allow-Headers", "*");
            response.addHeader("Access-Control-Max-Age", "86400");
        }

        private void copyResponseHeaders(HttpURLConnection conn, Response response) {
            for (Map.Entry<String, List<String>> entry : conn.getHeaderFields().entrySet()) {
                if (entry.getKey() != null &&
                    !"Content-Type".equalsIgnoreCase(entry.getKey()) &&
                    !"Content-Length".equalsIgnoreCase(entry.getKey()) &&
                    !"Transfer-Encoding".equalsIgnoreCase(entry.getKey())) {
                    for (String value : entry.getValue()) {
                        response.addHeader(entry.getKey(), value);
                    }
                }
            }
        }

        private String getParam(IHTTPSession session, String name) {
            List<String> values = session.getParameters().get(name);
            return (values != null && !values.isEmpty()) ? values.get(0) : null;
        }

        private String readFully(InputStream inputStream) throws Exception {
            if (inputStream == null) return "";
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"));
            char[] buffer = new char[8192];
            int bytesRead;
            while ((bytesRead = reader.read(buffer)) != -1) {
                sb.append(buffer, 0, bytesRead);
            }
            return sb.toString();
        }
    }

    /**
     * 转义字符串为 JS 字符串字面量（含双引号），用于 evaluateJavascript
     */
    private String jsString(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\")
                       .replace("\"", "\\\"")
                       .replace("\n", "\\n")
                       .replace("\r", "\\r")
                       .replace("\u2028", "\\u2028")
                       .replace("\u2029", "\\u2029") + "\"";
    }
}
