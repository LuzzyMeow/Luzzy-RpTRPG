package com.luzzymeow.luzzy

import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebView

/**
 * WebChromeClient:处理 console.log、JS alert/confirm/prompt 等。
 *
 * 将前端 console 输出转发到 Android Logcat,便于调试。
 */
class LuzzyWebChromeClient : WebChromeClient() {

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
        // 简单实现:记录日志并确认
        Log.i("LUZZY-JS", "Alert: $message")
        result.confirm()
        return true
    }
}
