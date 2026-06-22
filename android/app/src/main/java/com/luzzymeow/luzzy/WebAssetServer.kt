package com.luzzymeow.luzzy

import android.content.Context
import android.util.Log
import android.webkit.MimeTypeMap
import fi.iki.elonen.NanoHTTPD
import java.io.FileNotFoundException
import java.io.IOException
import java.io.InputStream

/**
 * 前端资源本地 HTTP 服务器(端口 18528)。
 *
 * 设计原理(参考 rikkahub web/routes/AIIconRoutes.kt 的 Ktor assets 路由):
 * - 前端 vite 构建产物在 assets/public/ 下,index.html 引用 /assets/xxx.js 等绝对路径
 * - 用 NanoHTTPD 把 http://localhost:18528/ 直接映射到 assets/public/
 * - 与 https://appassets.androidplatform.net 方案相比,localhost HTTP 不需要 DNS 解析,
 *   也不依赖 WebViewAssetLoader 的 path 段约束,直接通过 WebView 网络栈加载
 *
 * 路径映射:
 * - http://localhost:18528/ → assets/public/index.html(根路径回退)
 * - http://localhost:18528/index.html → assets/public/index.html
 * - http://localhost:18528/assets/manifest-xxx.js → assets/public/assets/manifest-xxx.js
 * - http://localhost:18528/favicon.ico → assets/public/favicon.ico
 * - http://localhost:18528/fonts/AlibabaSans/xxx.woff2 → assets/public/fonts/AlibabaSans/xxx.woff2
 *
 * 安全:
 * - 仅监听 127.0.0.1,外部无法访问
 * - 路径中含 .. 直接拒绝,防止目录穿越
 */
class WebAssetServer(
    private val context: Context,
    port: Int = DEFAULT_PORT
) : NanoHTTPD("127.0.0.1", port) {

    companion object {
        const val DEFAULT_PORT = 18528
        private const val TAG = "WebAssetServer"
        private const val ASSET_ROOT = "public"
    }

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri ?: "/"
        // 防止目录穿越
        if (uri.contains("..")) {
            return newFixedLengthResponse(
                Response.Status.FORBIDDEN, "text/plain", "Forbidden"
            )
        }

        // 提取相对路径,根路径回退到 index.html
        var relativePath = uri.trimStart('/')
        if (relativePath.isEmpty()) {
            relativePath = "index.html"
        }

        val assetPath = "$ASSET_ROOT/$relativePath"
        return try {
            val inputStream: InputStream = context.assets.open(assetPath)
            val mime = guessMimeType(assetPath)
            val response = newChunkedResponse(Response.Status.OK, mime, inputStream)
            // Cache-Control:索引文件不缓存,带 hash 的资源长期缓存
            if (relativePath == "index.html" || relativePath.endsWith("/index.html")) {
                response.addHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            } else {
                response.addHeader("Cache-Control", "public, max-age=31536000")
            }
            // 允许 WebView 跨源访问(localhost 子资源)
            response.addHeader("Access-Control-Allow-Origin", "*")
            response
        } catch (e: FileNotFoundException) {
            Log.w(TAG, "Asset not found: $assetPath")
            newFixedLengthResponse(
                Response.Status.NOT_FOUND, "text/plain", "Not Found: $relativePath"
            )
        } catch (e: IOException) {
            Log.e(TAG, "Failed to open asset: $assetPath", e)
            newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR, "text/plain", "IO Error"
            )
        }
    }

    private fun guessMimeType(path: String): String {
        val ext = path.substringAfterLast('.', "").lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
            ?: when (ext) {
                "js", "mjs" -> "application/javascript"
                "css" -> "text/css"
                "html", "htm" -> "text/html"
                "json", "map" -> "application/json"
                "woff2" -> "font/woff2"
                "woff" -> "font/woff"
                "ttf" -> "font/ttf"
                "otf" -> "font/otf"
                "ico" -> "image/x-icon"
                "svg" -> "image/svg+xml"
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                "txt" -> "text/plain"
                "xml" -> "application/xml"
                else -> "application/octet-stream"
            }
    }
}
