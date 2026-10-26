/*
 * Copyright 2025 Kyant
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Vendored from AndroidLiquidGlass (https://github.com/Kyant0/AndroidLiquidGlass).
 * Modified: moved to the com.mohamedabdelnaby.reactnativeliquid.backdrop package.
 * See THIRD_PARTY_NOTICES.md.
 */
package com.mohamedabdelnaby.reactnativeliquid.backdrop.effects

import android.graphics.ColorFilter
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.RenderEffect
import android.os.Build
import androidx.annotation.FloatRange
import androidx.compose.ui.graphics.asAndroidColorFilter
import com.mohamedabdelnaby.reactnativeliquid.backdrop.BackdropEffectScope
import com.mohamedabdelnaby.reactnativeliquid.backdrop.GammaAdjustmentShaderString
import kotlin.math.pow

fun BackdropEffectScope.colorFilter(colorFilter: ColorFilter) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

    val currentEffect = renderEffect
    renderEffect =
        if (currentEffect != null) {
            RenderEffect.createColorFilterEffect(colorFilter, currentEffect)
        } else {
            RenderEffect.createColorFilterEffect(colorFilter)
        }
}

fun BackdropEffectScope.colorFilter(colorFilter: androidx.compose.ui.graphics.ColorFilter) {
    colorFilter(colorFilter.asAndroidColorFilter())
}

fun BackdropEffectScope.opacity(@FloatRange(from = 0.0, to = 1.0) alpha: Float) {
    val colorMatrix = ColorMatrix(
        floatArrayOf(
            1f, 0f, 0f, 0f, 0f,
            0f, 1f, 0f, 0f, 0f,
            0f, 0f, 1f, 0f, 0f,
            0f, 0f, 0f, alpha, 0f
        )
    )
    colorFilter(ColorMatrixColorFilter(colorMatrix))
}

fun BackdropEffectScope.colorControls(
    brightness: Float = 0f,
    contrast: Float = 1f,
    saturation: Float = 1f
) {
    if (brightness == 0f && contrast == 1f && saturation == 1f) {
        return
    }

    colorFilter(colorControlsColorFilter(brightness, contrast, saturation))
}

fun BackdropEffectScope.vibrancy() {
    colorFilter(VibrantColorFilter)
}

private val VibrantColorFilter = colorControlsColorFilter(saturation = 1.5f)

fun BackdropEffectScope.exposureAdjustment(ev: Float) {
    val scale = 2f.pow(ev / 2.2f)
    val colorMatrix = ColorMatrix(
        floatArrayOf(
            scale, 0f, 0f, 0f, 0f,
            0f, scale, 0f, 0f, 0f,
            0f, 0f, scale, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        )
    )
    colorFilter(ColorMatrixColorFilter(colorMatrix))
}

fun BackdropEffectScope.gammaAdjustment(power: Float) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

    val shader = obtainRuntimeShader("GammaAdjustment", GammaAdjustmentShaderString).apply {
        setFloatUniform("power", power)
    }
    effect(RenderEffect.createRuntimeShaderEffect(shader, "content"))
}

private fun colorControlsColorFilter(
    brightness: Float = 0f,
    contrast: Float = 1f,
    saturation: Float = 1f
): ColorFilter {
    val invSat = 1f - saturation
    val r = 0.213f * invSat
    val g = 0.715f * invSat
    val b = 0.072f * invSat

    val c = contrast
    val t = (0.5f - c * 0.5f + brightness) * 255f
    val s = saturation

    val cr = c * r
    val cg = c * g
    val cb = c * b
    val cs = c * s

    val colorMatrix = ColorMatrix(
        floatArrayOf(
            cr + cs, cg, cb, 0f, t,
            cr, cg + cs, cb, 0f, t,
            cr, cg, cb + cs, 0f, t,
            0f, 0f, 0f, 1f, 0f
        )
    )
    return ColorMatrixColorFilter(colorMatrix)
}
