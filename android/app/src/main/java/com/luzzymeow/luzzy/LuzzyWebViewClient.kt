package com.luzzymeow.luzzy

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * WebViewClient:配置 WebViewAssetLoader 拦截前端资源请求。
 *
 * 通过 https://appassets.androidplatform.net/assets/ 前缀访问 assets 中的前端资源,
 * 保留 https 协议,避免混合内容警告,前端代码无需任何路径调整。
 */
class LuzzyWebViewClient(private val assetLoader: WebViewAssetLoader) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        return assetLoader.shouldInterceptRequest(request?.url)
    }

    // 内部链接在 WebView 内打开,不跳出到系统浏览器
    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
    ): Boolean {
        val url = request?.url ?: return false
        // 允许 appassets.androidplatform.net 和 localhost:18527
        val host = url.host ?: return false
        if (host == "appassets.androidplatform.net" || host == "localhost" || host == "127.0.0.1") {
            return false
        }
        // 其他链接(如 TRPG iframe 内的外部链接)交由系统处理
        return true
    }
}
