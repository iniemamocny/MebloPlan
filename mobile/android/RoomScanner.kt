package com.mebloplan.mobile

import android.content.Context
import com.google.ar.core.Config
import com.google.ar.core.Session
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

/**
 * Uses ARCore with the Depth API to reconstruct a room mesh and uploads it as glTF.
 */
class RoomScanner(private val context: Context) {
    private val session: Session = Session(context, setOf(Session.Feature.DEPTH))

    fun start() {
        val config = Config(session)
        config.depthMode = Config.DepthMode.AUTOMATIC
        session.configure(config)
    }

    /**
     * Placeholder for mesh reconstruction; the produced file should be a glTF or OBJ.
     */
    fun saveMesh(outFile: File) {
        // Mesh building code would go here using the depth data
    }

    fun upload(file: File) {
        val client = OkHttpClient()
        val body = file.asRequestBody("model/gltf-binary".toMediaType())
        val request = Request.Builder()
            .url("https://example.com/upload")
            .post(body)
            .build()
        client.newCall(request).execute().use {
            if (!it.isSuccessful) {
                throw IllegalStateException("Upload failed: ${it.code}")
            }
        }
    }
}
