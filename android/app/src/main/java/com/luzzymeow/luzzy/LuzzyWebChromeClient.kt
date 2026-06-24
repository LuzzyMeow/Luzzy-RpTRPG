package com.luzzymeow.luzzy

import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import java.lang.ref.WeakReference

/**
 * WebChromeClient:处理 console.log、JS alert/confirm/prompt、文件选择等。
 *
 * 将前端 console 输出转发到 Android Logcat,便于调试。
 * v0.4.6: 重写 onShowFileChooser,支持 <input type="file"> 角色卡导入。
 * v0.8.6-fix: 使用 WeakReference 持有 Activity,避免内存泄漏
 */
class LuzzyWebChromeClient(
    activity: MainActivity
) : WebChromeClient() {

    private val activityRef = WeakReference<MainActivity>(activity)

    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
        val msg = consoleMessage ?: return super.onConsoleMessage(consoleMessage)
        val level = when (msg.messageLevel()) {
            ConsoleMessage.MessageLevel.ERROR -> Log.ERROR
            ConsoleMessage.MessageLevel.WARNING -> Log.WARN
            ConsoleMessage.MessageLevel.DEBUG -> Log.DEBUG
            ConsoleMessage.MessageLevel.LOG -> Log.INFO
            else -> Log.INFO
        }
        Log.println(level, "LUZZY-JS", "${msg.message()} (${msg.sourceId()}:${msg.lineNumber()})")
        return true
    }

    override fun onJsAlert(
        view: WebView?,
        url: String?,
        message: String?,
        result: JsResult
    ): Boolean {
        Log.i("LUZZY-JS", "Alert: $message")
        result.confirm()
        return true
    }

    /**
     * v0.4.6: 处理 <input type="file"> 文件选择请求。
     * 修复角色卡导入按钮失效问题。
     */
    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?
    ): Boolean {
        val activity = activityRef.get() ?: run {
            filePathCallback?.onReceiveValue(null)
            return false
        }
        activity.cancelFilePathCallback()
        activity.filePathCallback = filePathCallback

        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT)
            intent.addCategory(Intent.CATEGORY_OPENABLE)
            intent.type = "*/*"
            intent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "application/json"))

            val chooserIntent = Intent.createChooser(intent, "选择角色卡文件")
            activity.startActivityForResult(chooserIntent, MainActivity.FILE_CHOOSER_REQUEST_CODE)
            Log.i("LUZZY", "File chooser started for character card import")
            return true
        } catch (e: Exception) {
            Log.e("LUZZY", "Failed to start file chooser: ${e.message}", e)
            filePathCallback?.onReceiveValue(null)
            activity.filePathCallback = null
            return false
        }
    }
}
