/*
 * The lens, vibrancy and rim light follow the shader of Liquid-Glass-Android by
 * pandadog (https://github.com/QWEA0/Liquid-Glass-Android), MIT License,
 * Copyright (c) 2025-2026 pandadog. See LICENSE-Liquid-Glass-Android.
 * Modified: several shapes melted into one with a smooth union, per-shape frost
 * and tint, and a soft shadow.
 */
package com.mohamedabdelnaby.reactnativeliquid

import android.graphics.RenderEffect
import android.os.Build
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.unit.dp
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.BackdropEffectScope
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.effect
import kotlin.math.min

/** Most shapes one container merges (the shader's array size). */
internal const val MERGED_GLASS_MAX_SHAPES = 8

/** One glass shape in the container's glass layer, in px. */
@Immutable
internal data class MergedGlassShape(
  val left: Float,
  val top: Float,
  val width: Float,
  val height: Float,
  val radius: Float,
  val tint: Int?,
  val dark: Boolean,
  val clear: Boolean,
  /** 0 resting, 1 pressed (brightens like iOS). */
  val pressed: Boolean,
)

@Immutable
internal data class MergedGlassLook(
  val blurPx: Float,
  val bevelPx: Float,
  val refractPx: Float,
  /** Glass closer than this (the container's spacing, px) melts together. */
  val mergePx: Float,
  val dark: Boolean,
)

private const val MERGED_GLASS_SHADER = """
uniform shader content;
uniform float2 origin;
uniform float2 area;
uniform float4 rects[8];
uniform float radii[8];
uniform float4 frost[8];
uniform float4 tints[8];
uniform float k;
uniform float bevel;
uniform float refractPx;
uniform float2 lightDir;
uniform float specStrength;
uniform float rimBandMax;
uniform float satFactor;
uniform float shadowAlpha;
uniform float shadowRadius;

// Distance to a rounded box and the outward direction from it.
float3 sdBoxN(float2 p, float4 r, float rad) {
  float2 hs = r.zw * 0.5;
  float rr = min(rad, min(hs.x, hs.y));
  float2 v = p - (r.xy + hs);
  float2 q = abs(v) - hs + rr;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rr;
  float2 n;
  if (q.x > 0.0 || q.y > 0.0) {
    n = max(q, 0.0);
    n = n / max(length(n), 0.0001);
  } else {
    n = q.x > q.y ? float2(1.0, 0.0) : float2(0.0, 1.0);
  }
  float2 sg = float2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
  return float3(d, n * sg);
}

// A smooth union that grows a bridge only between shapes facing each other,
// so a swollen button reaches out to its neighbour like liquid.
float field(float2 p) {
  float3 acc = float3(100000.0, 0.0, 0.0);
  for (int i = 0; i < 8; i++) {
    if (rects[i].z > 0.0) {
      float3 s = sdBoxN(p, rects[i], radii[i]);
      if (acc.x > 50000.0) {
        acc = s;
      } else {
        float f = clamp(-dot(acc.yz, s.yz), 0.0, 1.0);
        float h = k > 0.0 ? max(k - abs(acc.x - s.x), 0.0) / k : 0.0;
        float m = min(acc.x, s.x) - f * h * h * k * 0.25;
        acc = float3(m, acc.x < s.x ? acc.yz : s.yz);
      }
    }
  }
  return acc.x;
}

half4 main(float2 coord) {
  float2 p = coord - origin;
  float d = field(p);
  float cov = clamp(0.5 - d / 1.5, 0.0, 1.0);
  if (cov <= 0.004) {
    // A soft shadow below the glass (light mode).
    if (shadowAlpha > 0.0) {
      float ds = max(field(p - float2(0.0, shadowRadius * 0.35)), 0.0);
      float a = shadowAlpha * exp(-ds / max(shadowRadius, 1.0));
      return half4(0.0, 0.0, 0.0, half(a));
    }
    return half4(0.0);
  }

  float2 n = float2(
    field(p + float2(1.0, 0.0)) - field(p - float2(1.0, 0.0)),
    field(p + float2(0.0, 1.0)) - field(p - float2(0.0, 1.0)));
  float nLen = length(n);
  n = nLen > 0.0001 ? n / nLen : float2(0.0, -1.0);

  // The bend packs into the rim: a compressed mirror of what is just inside.
  float t = clamp(-d / max(bevel, 1.0), 0.0, 1.0);
  float gB = pow(5.0, -2.0);
  float slope = (pow(1.0 + 4.0 * t, -2.0) - gB) / (1.0 - gB);
  float2 at = clamp(coord - n * (slope * refractPx), origin, origin + area);
  float3 col = content.eval(at).rgb;

  // Vibrancy: lifts muted colours more than vivid ones and spares highlights.
  float lum = dot(col, float3(0.2126, 0.7152, 0.0722));
  float satNow = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
  float room = 1.0 - smoothstep(0.2, 0.85, satNow);
  float hl = 1.0 - smoothstep(0.75, 0.98, lum);
  float amount = 1.0 + (satFactor - 1.0) * mix(0.3, 1.0, room * hl);
  col = clamp(mix(float3(lum), col, amount), float3(0.0), float3(1.0));

  // Each shape's frost and tint, blended where shapes meet; inside a shape
  // that shape's own.
  float4 a = float4(0.0);
  float4 b = float4(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 8; i++) {
    if (rects[i].z > 0.0) {
      float di = max(sdBoxN(p, rects[i], radii[i]).x, 0.0) + 1.0;
      float w = 1.0 / (di * di * di * di);
      a += frost[i] * w;
      b += tints[i] * w;
      wsum += w;
    }
  }
  a /= wsum;
  b /= wsum;
  col = mix(col, a.rgb, a.a);
  col = mix(col, b.rgb, b.a);

  // Rim light from the same normals: equal lobes facing the light (top left)
  // and opposite it, gone at the sides, with a soft glow on the lit side.
  float facing = dot(n, -lightDir);
  float lobeF = pow(max(facing, 0.0), 4.5);
  float lobeB = pow(max(-facing, 0.0), 4.5);
  float bandW = clamp(bevel * 0.3, 2.0, rimBandMax);
  float glowIn = clamp((-d - 1.0) / 2.0, 0.0, 1.0);
  float glow = glowIn * pow(clamp(1.0 - (-d - 3.0) / bandW, 0.0, 1.0), 1.5) * cov;
  float hair = clamp(1.0 - abs(d + 1.0) / 2.0, 0.0, 1.0) * cov;
  col = clamp(col + float3((hair * 0.70 * (lobeF + lobeB) + glow * 0.10 * lobeF) * specStrength),
              float3(0.0), float3(1.0));
  return half4(half3(col * cov), half(cov));
}
"""

private fun FloatArray.put(index: Int, color: Color) {
  this[index * 4] = color.red
  this[index * 4 + 1] = color.green
  this[index * 4 + 2] = color.blue
  this[index * 4 + 3] = color.alpha
}

/** The same frost and tint as a single LiquidGlassView (LiquidGlassSurface). */
private fun frostOf(shape: MergedGlassShape): Color {
  val base = when {
    shape.dark -> if (shape.clear) Color(0xFF1C1C1E).copy(alpha = 0.12f) else Color.White.copy(alpha = 0.14f)
    else -> Color.White.copy(alpha = if (shape.clear) 0.08f else 0.32f)
  }
  if (!shape.pressed) return base
  // Brightens while pressed, like iOS 26 glass.
  val extra = if (shape.dark) 0.22f else 0.5f
  return Color.White.copy(alpha = (base.alpha + extra).coerceAtMost(0.85f))
}

private fun BackdropEffectScope.mergedGlass(shapes: List<MergedGlassShape>, look: MergedGlassLook) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
  blur(look.blurPx)

  val rects = FloatArray(MERGED_GLASS_MAX_SHAPES * 4)
  val radii = FloatArray(MERGED_GLASS_MAX_SHAPES)
  val frost = FloatArray(MERGED_GLASS_MAX_SHAPES * 4)
  val tints = FloatArray(MERGED_GLASS_MAX_SHAPES * 4)
  var smallest = Float.MAX_VALUE
  shapes.take(MERGED_GLASS_MAX_SHAPES).forEachIndexed { i, s ->
    rects[i * 4] = s.left
    rects[i * 4 + 1] = s.top
    rects[i * 4 + 2] = s.width
    rects[i * 4 + 3] = s.height
    radii[i] = s.radius
    frost.put(i, frostOf(s))
    tints.put(i, s.tint?.let { Color(it).let { c -> c.copy(alpha = c.alpha * 0.75f) } } ?: Color.Transparent)
    smallest = min(smallest, min(s.width, s.height))
  }
  if (smallest == Float.MAX_VALUE) return
  // Small buttons are not all edge: the bevel and bend shrink with them.
  val ref = 110f * density
  val bevel = min(look.bevelPx, smallest * 0.3f).coerceAtLeast(2f)
  val refract = min(look.refractPx, 0.7f * smallest * min(1f, smallest / ref))

  val shader = obtainRuntimeShader("MergedGlass", MERGED_GLASS_SHADER).apply {
    setFloatUniform("origin", padding, padding)
    setFloatUniform("area", size.width, size.height)
    setFloatUniform("rects", rects)
    setFloatUniform("radii", radii)
    setFloatUniform("frost", frost)
    setFloatUniform("tints", tints)
    // Halfway between two shapes the smooth union reaches in by k / 4 from each
    // side, so a gap narrower than k / 2 = spacing bridges, as on iOS.
    setFloatUniform("k", look.mergePx * 2f)
    setFloatUniform("bevel", bevel)
    setFloatUniform("refractPx", refract)
    setFloatUniform("lightDir", 0.866f, 0.5f)
    setFloatUniform("specStrength", if (look.dark) 0.85f else 1f)
    setFloatUniform("rimBandMax", min(2f * density, smallest * 0.05f).coerceAtLeast(2f))
    setFloatUniform("satFactor", 1.4f)
    setFloatUniform("shadowAlpha", if (look.dark) 0f else 0.12f)
    setFloatUniform("shadowRadius", 8f.dp.toPx())
  }
  effect(RenderEffect.createRuntimeShaderEffect(shader, "content"))
}

/** All the container's glass in one pass over one backdrop (Android 13+). */
@Composable
internal fun MergedGlassSurface(shapes: List<MergedGlassShape>, look: MergedGlassLook, backdrop: Backdrop) {
  if (shapes.isEmpty()) return
  Box(
    Modifier
      .fillMaxSize()
      .drawBackdrop(
        backdrop = backdrop,
        shape = { RectangleShape },
        effects = { mergedGlass(shapes, look) },
        highlight = null,
        shadow = null,
      ),
  )
}
