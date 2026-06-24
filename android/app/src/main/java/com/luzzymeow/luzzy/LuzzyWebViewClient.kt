package com.luzzymeow.luzzy

import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import java.lang.ref.WeakReference

/**
 * WebViewClient:控制 URL 加载行为。
 *
 * 设计说明(参考 rikkahub WebView.kt 的 MyWebViewClient):
 * - 不重写 shouldInterceptRequest:前端资源由 WebAssetServer(localhost:18528)直出,
 *   WebView 网络栈直接走 HTTP 请求,无需拦截
 * - 仅处理 shouldOverrideUrlLoading:把内部链接(localhost / 127.0.0.1)留给 WebView,
 *   外部链接(http/https 真实域名)交由系统浏览器打开
 * - v0.4.6: onPageFinished 通知 MainActivity WebView 已加载完成,关闭 SplashScreen
 * - v0.8.6-fix: 使用 WeakReference 持有 Activity,避免内存泄漏
 */
class LuzzyWebViewClient(activity: MainActivity) : WebViewClient() {

    companion object {
        private const val TAG = "LuzzyWebViewClient"
    }

    private val activityRef = WeakReference<MainActivity>(activity)

    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
    ): Boolean {
        val url = request?.url ?: return false
        val host = url.host ?: return false
        val activity = activityRef.get() ?: return false
        // 内部链接(本地 HTTP 服务器、API 代理服务器)在 WebView 内打开
        if (host == "localhost" || host == "127.0.0.1") {
            return false
        }
        // 外部链接(如分享链接、外部网页)交由系统浏览器打开
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url.toString()))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Failed to open external URL: $url", e)
            false
        }
    }

    // v0.4.6: 页面加载完成,通知 MainActivity 关闭 SplashScreen
    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        activityRef.get()?.onWebViewPageFinished()
        Log.i(TAG, "Page finished: $url")
    }
}

