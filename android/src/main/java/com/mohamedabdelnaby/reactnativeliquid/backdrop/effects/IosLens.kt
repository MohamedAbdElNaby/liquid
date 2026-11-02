/*
 * Adapted from the lens shader of Liquid-Glass-Android by pandadog
 * (https://github.com/QWEA0/Liquid-Glass-Android, GlassLensRenderer.kt),
 * MIT License, Copyright (c) 2025-2026 pandadog. See LICENSE-Liquid-Glass-Android.
 * Modified: one rounded rectangle, run as a backdrop effect after the blur;
 * tint and frost are drawn by the surface instead of the shader.
 */
package com.mohamedabdelnaby.reactnativeliquid.backdrop.effects

import android.graphics.RenderEffect
import android.os.Build
import com.mohamedabdelnaby.reactnativeliquid.backdrop.BackdropEffectScope
import kotlin.math.min

private const val IOS_LENS_SHADER = """
uniform shader content;
uniform float2 origin;
uniform float2 size;
uniform float radius;
uniform float bevel;
uniform float refractPx;
uniform float falloff;
uniform float dispersion;
uniform float2 lightDir;
uniform float specStrength;
uniform float rimBandMax;
uniform float satFactor;
uniform float press;
uniform float2 touchPos;

float sdRoundedBox(float2 p, float2 b, float r) {
  float2 q = abs(p) - b + r;
  return length(max(q, float2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(float2 p) {
  float2 hs = size * 0.5;
  return sdRoundedBox(p - hs, hs, radius);
}

half4 main(float2 coord) {
  float2 p = coord - origin;
  float d = shapeSDF(p);
  float cov = clamp(0.5 - d / 1.5, 0.0, 1.0);
  if (cov <= 0.004) {
    return half4(0.0);
  }

  float2 n = float2(
    shapeSDF(p + float2(1.0, 0.0)) - shapeSDF(p - float2(1.0, 0.0)),
    shapeSDF(p + float2(0.0, 1.0)) - shapeSDF(p - float2(0.0, 1.0)));
  float nLen = length(n);
  n = nLen > 0.0001 ? n / nLen : float2(0.0, -1.0);

  // Thickness profile: flat inside, a bevel at the rim. The inverse-power
  // falloff packs most of the bend into the outer pixels, so the rim shows a
  // compressed mirror of what is just inside it, like iOS 26 glass.
  float t = clamp(-d / max(bevel, 1.0), 0.0, 1.0);
  float slope;
  if (falloff > 0.001) {
    float gB = pow(5.0, -falloff);
    slope = (pow(1.0 + 4.0 * t, -falloff) - gB) / (1.0 - gB);
  } else {
    slope = (1.0 - t) * (1.0 - t);
  }

  // Inward refraction (sampling along the inward normal), stronger pressed.
  float refr = refractPx * (1.0 + 0.6 * press);
  float2 offset = -n * (slope * refr);

  // Pressed: a soft bulge under the finger magnifies the page there.
  if (press > 0.001) {
    float2 tp = p - touchPos;
    float tr = length(tp);
    float sigma = max(max(size.x, size.y) * 0.5, 1.0);
    float bump = 0.6 * press * exp(-(tr * tr) / (sigma * sigma * 0.30));
    if (tr > 1.0) {
      offset -= (tp / tr) * (bump * refr * 0.5);
    }
  }
  float2 lo = origin;
  float2 hi = origin + size;
  float3 col = float3(
    content.eval(clamp(coord + offset * (1.0 - dispersion * slope), lo, hi)).r,
    content.eval(clamp(coord + offset, lo, hi)).g,
    content.eval(clamp(coord + offset * (1.0 + dispersion * slope), lo, hi)).b);

  // Vibrancy: lifts muted colours more than vivid ones and spares highlights.
  float lum = dot(col, float3(0.2126, 0.7152, 0.0722));
  if (satFactor <= 1.0) {
    col = mix(float3(lum), col, satFactor);
  } else {
    float satNow = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
    float room = 1.0 - smoothstep(0.2, 0.85, satNow);
    float hl = 1.0 - smoothstep(0.75, 0.98, lum);
    float amount = 1.0 + (satFactor - 1.0) * mix(0.3, 1.0, room * hl);
    col = clamp(mix(float3(lum), col, amount), float3(0.0), float3(1.0));
  }

  // Rim light from the same normals: two equal lobes, facing the light (top
  // left) and the inner reflection opposite (bottom right), gone at the sides;
  // a 2px line at the edge plus a soft glow inside it on the lit side.
  float facing = dot(n, -lightDir);
  float lobeF = pow(max(facing, 0.0), 4.5);
  float lobeB = pow(max(-facing, 0.0), 4.5);
  float bandW = clamp(bevel * 0.3, 2.0, rimBandMax);
  float glowIn = clamp((-d - 1.0) / 2.0, 0.0, 1.0);
  float glow = glowIn * pow(clamp(1.0 - (-d - 3.0) / bandW, 0.0, 1.0), 1.5) * cov;
  float hair = clamp(1.0 - abs(d + 1.0) / 2.0, 0.0, 1.0) * cov;
  float spec = (hair * 0.70 * (lobeF + lobeB) + glow * 0.10 * lobeF)
               * specStrength * (1.0 - 0.35 * press);
  col = clamp(col + float3(spec), float3(0.0), float3(1.0));
  return half4(half3(col * cov), half(cov));
}
"""

/**
 * The iOS 26 lens for one rounded rectangle filling the effect area: inward
 * refraction concentrated at the rim, vibrancy, and a normal-driven two-lobe
 * rim light. Android 13+ (no-op below). Bevel, refraction and the rim band
 * shrink with the shape's short side, so small buttons are not all edge.
 */
fun BackdropEffectScope.iosLens(
  cornerRadius: Float,
  bevel: Float,
  refraction: Float,
  falloff: Float = 2f,
  dispersion: Float = 0f,
  specular: Float = 1f,
  saturation: Float = 1.4f,
  press: Float = 0f,
  touchX: Float = 0f,
  touchY: Float = 0f,
) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
  val w = size.width
  val h = size.height
  if (w <= 0f || h <= 0f) return

  val minDim = min(w, h)
  val ref = 110f * density
  val bevelEff = min(bevel, minDim * 0.3f).coerceAtLeast(2f)
  val refractEff = min(refraction, 0.7f * minDim * min(1f, minDim / ref))
  val rimBandMax = min(2f * density, minDim * 0.05f).coerceAtLeast(2f)

  val shader = obtainRuntimeShader("IosLens", IOS_LENS_SHADER).apply {
    setFloatUniform("origin", padding, padding)
    setFloatUniform("size", w, h)
    setFloatUniform("radius", cornerRadius.coerceIn(0f, minDim / 2f))
    setFloatUniform("bevel", bevelEff)
    setFloatUniform("refractPx", refractEff)
    setFloatUniform("falloff", falloff)
    setFloatUniform("dispersion", dispersion)
    // The light comes from the top left, about 30 degrees above horizontal.
    setFloatUniform("lightDir", 0.866f, 0.5f)
    setFloatUniform("specStrength", specular)
    setFloatUniform("rimBandMax", rimBandMax)
    setFloatUniform("satFactor", saturation)
    setFloatUniform("press", press)
    // Whole pixels, so a still finger doesn't rebuild the effect.
    setFloatUniform("touchPos", touchX.toInt().toFloat(), touchY.toInt().toFloat())
  }
  effect(RenderEffect.createRuntimeShaderEffect(shader, "content"))
}
