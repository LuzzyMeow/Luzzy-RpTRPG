package com.luzzymeow.luzzy

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import org.json.JSONArray
import org.json.JSONObject

/**
 * NativeBridge:JavascriptInterface,替代 @capacitor/device、@capacitor/filesystem、@capacitor/share 三个插件。
 *
 * 通过 webView.addJavascriptInterface(NativeBridge(this), "AndroidBridge") 注册,
 * 前端通过 window.AndroidBridge.* 调用。
 *
 * 功能清单:
 * - isNativePlatform():替代 Capacitor.isNativePlatform()
 * - getDeviceInfo():替代 Device.getInfo()
 * - writeFile/appendFile/mkdir/readdir/deleteFile/getUri:替代 Filesystem.*
 * - shareFile/shareText:替代 Share.share()
 *
 * 目录映射(resolveDirectory):
 * - DOCUMENTS/EXTERNAL/EXTERNAL_STORAGE → getExternalFilesDir(null)
 *   路径:/sdcard/Android/data/com.luzzymeow.luzzy/files/
 *   Android 11+ scoped storage 推荐,无需额外权限
 * - CACHE → cacheDir
 * - DATA/LIBRARY → filesDir
 */
class NativeBridge(private val context: Context) {

    companion object {
        private const val TAG = "LUZZY-NativeBridge"
    }

    /** 替代 Capacitor.isNativePlatform() */
    @JavascriptInterface
    fun isNativePlatform(): Boolean = true

    /** 替代 Device.getInfo() — 返回 JSON 字符串 */
    @JavascriptInterface
    fun getDeviceInfo(): String {
        val info = JSONObject()
        info.put("platform", "android")
        info.put("manufacturer", Build.MANUFACTURER)
        info.put("model", Build.MODEL)
        info.put("osVersion", Build.VERSION.RELEASE)
        info.put("androidVersion", Build.VERSION.SDK_INT)
        info.put("name", Build.MODEL)
        return info.toString()
    }

    /** 替代 Filesystem.writeFile — 写入指定目录,返回文件 URI */
    @JavascriptInterface
    fun writeFile(directory: String, path: String, base64Data: String, recursive: Boolean): String {
        return try {
            val baseDir = resolveDirectory(directory) ?: return ""
            val targetFile = File(baseDir, path)
            if (recursive) targetFile.parentFile?.mkdirs()
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            FileOutputStream(targetFile).use { it.write(bytes) }
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                targetFile
            )
            uri.toString()
        } catch (e: Exception) {
            Log.e(TAG, "writeFile 失败: ${e.message}")
            ""
        }
    }

    /** 替代 Filesystem.appendFile — 追加写入(用于日志) */
    @JavascriptInterface
    fun appendFile(directory: String, path: String, text: String, encoding: String): Boolean {
        return try {
            val baseDir = resolveDirectory(directory) ?: return false
            val targetFile = File(baseDir, path)
            targetFile.parentFile?.mkdirs()
            targetFile.appendText(text + "\n", charset(encoding))
            true
        } catch (e: Exception) {
            Log.e(TAG, "appendFile 失败: ${e.message}")
            false
        }
    }

    /** 替代 Filesystem.mkdir */
    @JavascriptInterface
    fun mkdir(directory: String, path: String, recursive: Boolean): Boolean {
        return try {
            val baseDir = resolveDirectory(directory) ?: return false
            val targetFile = File(baseDir, path)
            if (recursive) targetFile.mkdirs() else targetFile.mkdir()
            true
        } catch (e: Exception) {
            Log.e(TAG, "mkdir 失败: ${e.message}")
            false
        }
    }

    /** 替代 Filesystem.readdir — 返回 JSON 对象 {files: ["name1", "name2"]} */
    @JavascriptInterface
    fun readdir(directory: String, path: String): String {
        return try {
            val baseDir = resolveDirectory(directory) ?: return """{"files":[]}"""
            val targetFile = File(baseDir, path)
            if (!targetFile.exists() || !targetFile.isDirectory) return """{"files":[]}"""
            val files = targetFile.listFiles()?.map { it.name } ?: emptyList()
            val obj = JSONObject()
            val arr = JSONArray()
            files.forEach { arr.put(it) }
            obj.put("files", arr)
            obj.toString()
        } catch (e: Exception) {
            Log.e(TAG, "readdir 失败: ${e.message}")
            """{"files":[]}"""
        }
    }

    /** 替代 Filesystem.deleteFile */
    @JavascriptInterface
    fun deleteFile(directory: String, path: String): Boolean {
        return try {
            val baseDir = resolveDirectory(directory) ?: return false
            val targetFile = File(baseDir, path)
            targetFile.delete()
        } catch (e: Exception) {
            Log.e(TAG, "deleteFile 失败: ${e.message}")
            false
        }
    }

    /** 替代 Filesystem.getUri */
    @JavascriptInterface
    fun getUri(directory: String, path: String): String {
        return try {
            val baseDir = resolveDirectory(directory) ?: return ""
            val targetFile = File(baseDir, path)
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                targetFile
            )
            uri.toString()
        } catch (e: Exception) {
            Log.e(TAG, "getUri 失败: ${e.message}")
            ""
        }
    }

    /** 替代 Share.share({ url }) — 分享文件 */
    @JavascriptInterface
    fun shareFile(uri: String, title: String, dialogTitle: String): Boolean {
        return try {
            val fileUri = Uri.parse(uri)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "*/*"
                putExtra(Intent.EXTRA_STREAM, fileUri)
                putExtra(Intent.EXTRA_TITLE, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            // v0.4.6: 使用 ClipData 确保 URI 权限可靠传递
            val clipData = ClipData.newUri(context.contentResolver, title, fileUri)
            intent.clipData = clipData

            // v0.4.6: chooser intent 也需要授权标志
            val chooserIntent = Intent.createChooser(intent, dialogTitle).apply {
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            // v0.4.6: startActivity 必须在主线程调用
            // JavascriptInterface 方法默认在后台线程执行,直接 startActivity 会崩溃
            Handler(Looper.getMainLooper()).post {
                try {
                    context.startActivity(chooserIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "shareFile startActivity 失败: ${e.message}")
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "shareFile 失败: ${e.message}")
            false
        }
    }

    /** 替代 Share.share({ text }) — 分享文本 */
    @JavascriptInterface
    fun shareText(text: String, title: String, dialogTitle: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
                putExtra(Intent.EXTRA_TITLE, title)
            }
            val chooserIntent = Intent.createChooser(intent, dialogTitle).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            // v0.4.6: startActivity 必须在主线程调用
            Handler(Looper.getMainLooper()).post {
                try {
                    context.startActivity(chooserIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "shareText startActivity 失败: ${e.message}")
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "shareText 失败: ${e.message}")
            false
        }
    }

    /**
     * 解析 Capacitor Directory 枚举为实际文件系统路径。
     *
     * Capacitor Directory 枚举值:DOCUMENTS, EXTERNAL, EXTERNAL_STORAGE, CACHE, DATA, LIBRARY
     * 映射策略:
     * - DOCUMENTS/EXTERNAL/EXTERNAL_STORAGE → getExternalFilesDir(null)
     *   (Android 11+ scoped storage 推荐,无需额外权限)
     * - CACHE → cacheDir
     * - DATA/LIBRARY → filesDir
     */
    private fun resolveDirectory(directory: String): File? {
        return when (directory) {
            "DOCUMENTS" -> context.getExternalFilesDir(null)
            "EXTERNAL" -> context.getExternalFilesDir(null)
            "EXTERNAL_STORAGE" -> context.getExternalFilesDir(null)
            "CACHE" -> context.cacheDir
            "DATA" -> context.filesDir
            "LIBRARY" -> context.filesDir
            else -> context.getExternalFilesDir(null)
        }
    }
}
