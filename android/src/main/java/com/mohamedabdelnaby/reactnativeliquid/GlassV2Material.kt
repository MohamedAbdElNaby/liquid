package com.mohamedabdelnaby.reactnativeliquid

import android.graphics.RenderEffect
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.key
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.BackdropEffectScope
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.colorControls
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.effect
import com.mohamedabdelnaby.reactnativeliquid.backdrop.shadow.Shadow
import kotlin.math.min

/** One glass shape inside a host, in the host's pixels. */
@Immutable
internal data class GlassV2Shape(
  val left: Float,
  val top: Float,
  val width: Float,
  val height: Float,
  val radius: Float,
  val tint: Int?,
)

/** Most shapes one pass draws (the shader's array size). */
internal const val GLASS_V2_MAX_SHAPES = 8

/** Whether the merged, refracting material can run (AGSL needs Android 13). */
internal val isGlassV2ShaderSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

/**
 * The v2 material for one or more shapes in one pass over one backdrop, tuned to
 * the iOS 26 close-ups (references/ANALYSIS.md):
 * - shapes closer than the merge width melt into one (a smooth union of their
 *   distance fields), like glass in an iOS glass container;
 * - the blurred page bends near the edges, most where the outline curves;
 * - each shape's frost or tint, blended where shapes meet;
 * - a thin rim lit from the top left (dimmer at the bottom right) over a hairline.
 */
private const val GLASS_V2_SHADER = """
uniform shader content;
uniform float2 offset;
uniform float4 rects[8];
uniform float radii[8];
uniform float4 surfA[8];
uniform float4 surfB[8];
uniform float k;
uniform float refractionHeight;
uniform float refractionAmount;
uniform float rimWidth;
uniform float4 rimColor;
uniform float rimBase;
uniform float4 hairline;

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

// A union that grows a bridge only between shapes (where their outward
// directions face each other), so shapes stacked on one another never swell.
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
  float2 p = coord - offset;
  float d = field(p);
  float mask = 1.0 - smoothstep(-0.75, 0.75, d);
  if (mask <= 0.0) { return half4(0.0); }

  float2 grad = float2(
    field(p + float2(1.0, 0.0)) - field(p - float2(1.0, 0.0)),
    field(p + float2(0.0, 1.0)) - field(p - float2(0.0, 1.0)));
  float2 n = grad / max(length(grad), 0.0001);

  // A rounded glass edge: no bend deep inside, a steep one at the rim.
  float t = clamp(1.0 + d / max(refractionHeight, 0.001), 0.0, 1.0);
  float bend = refractionAmount * (1.0 - sqrt(max(1.0 - t * t, 0.0)));
  float3 col = content.eval(coord - n * bend).rgb;

  // In a bridge, the surfaces of the nearest shapes blend; inside a shape,
  // the topmost shape there (the last one) shows, like stacked glass.
  float4 a = float4(0.0);
  float4 b = float4(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 8; i++) {
    if (rects[i].z > 0.0) {
      float di = max(sdBoxN(p, rects[i], radii[i]).x, 0.0) + 1.0;
      float w = 1.0 / (di * di * di * di);
      a += surfA[i] * w;
      b += surfB[i] * w;
      wsum += w;
    }
  }
  a /= wsum;
  b /= wsum;
  for (int i = 0; i < 8; i++) {
    if (rects[i].z > 0.0) {
      float inside = 1.0 - smoothstep(-1.0, 1.0, sdBoxN(p, rects[i], radii[i]).x);
      a = mix(a, surfA[i], inside);
      b = mix(b, surfB[i], inside);
    }
  }
  col = mix(col, a.rgb, a.a);
  col = mix(col, b.rgb, b.a);

  // Rim: brightest where the edge faces the light (top left), weaker opposite.
  float rim = 1.0 - smoothstep(0.0, rimWidth, -d);
  float lit = max(dot(n, float2(-0.581, -0.814)), 0.0);
  float back = max(dot(n, float2(0.581, 0.814)), 0.0);
  float spec = rimBase + rimColor.a * (lit * lit + 0.4 * back * back);
  col += rimColor.rgb * spec * rim;

  float hair = 1.0 - smoothstep(0.0, 1.0, -d);
  col = mix(col, hairline.rgb, hairline.a * hair);

  return half4(half3(col) * mask, mask);
}
"""

@Immutable
internal data class GlassV2Look(
  val dark: Boolean,
  /** 0 = regular to 1 = clear: less blur and frost as it rises. */
  val clarity: Float,
  /** Distance (px) under which neighbouring shapes melt together; 0 never. */
  val mergePx: Float,
  /** Strength of the bend at the rim, 0 to 1. */
  val refraction: Float = 1f,
  /** Brightness of the lit rim, 0 to 1. */
  val shine: Float = 1f,
)

/** The clarity a view asks for: its own value, or 0/1 from its glass style. */
internal fun glassV2Clarity(clarity: Float, glassStyle: String): Float =
  if (clarity >= 0f) clarity.coerceIn(0f, 1f) else if (glassStyle == "clear") 1f else 0f

private fun lerp(regular: Float, clear: Float, t: Float) = regular + (clear - regular) * t

private fun GlassV2Look.blurDp() = lerp(14f, 4f, clarity)

private fun FloatArray.put(index: Int, color: Color) {
  this[index * 4] = color.red
  this[index * 4 + 1] = color.green
  this[index * 4 + 2] = color.blue
  this[index * 4 + 3] = color.alpha
}

/** The frost (or tint) drawn over the blurred page, as two layers. */
private fun surfaces(look: GlassV2Look, tint: Int?): Pair<Color, Color> {
  if (tint != null) {
    val c = Color(tint)
    return c.copy(alpha = c.alpha * 0.88f) to Color.Transparent
  }
  val t = look.clarity
  return if (look.dark) {
    // Dims bright content to about half, as iOS dark glass does over a photo,
    // and lifts black to a dark grey.
    Color(0xFF1C1C1E).copy(alpha = lerp(0.45f, 0.28f, t)) to
      Color.White.copy(alpha = lerp(0.06f, 0.04f, t))
  } else {
    Color.White.copy(alpha = lerp(0.42f, 0.18f, t)) to Color.Transparent
  }
}

private fun BackdropEffectScope.glassV2(shapes: List<GlassV2Shape>, look: GlassV2Look) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
  // iOS keeps colours behind the glass recognisable but not boosted; its dark
  // glass mutes them a little.
  colorControls(saturation = if (look.dark) 0.9f else 1.15f)
  blur(look.blurDp().dp.toPx())

  val rects = FloatArray(GLASS_V2_MAX_SHAPES * 4)
  val radii = FloatArray(GLASS_V2_MAX_SHAPES)
  val surfA = FloatArray(GLASS_V2_MAX_SHAPES * 4)
  val surfB = FloatArray(GLASS_V2_MAX_SHAPES * 4)
  var smallestHalf = Float.MAX_VALUE
  shapes.take(GLASS_V2_MAX_SHAPES).forEachIndexed { i, s ->
    rects[i * 4] = s.left
    rects[i * 4 + 1] = s.top
    rects[i * 4 + 2] = s.width
    rects[i * 4 + 3] = s.height
    radii[i] = s.radius
    val (a, b) = surfaces(look, s.tint)
    surfA.put(i, a)
    surfB.put(i, b)
    smallestHalf = min(smallestHalf, min(s.width, s.height) / 2f)
  }
  if (smallestHalf == Float.MAX_VALUE) return

  // The bend reaches about 40 % into the shape and moves the page by up to
  // ~14 dp at the very rim, like the ends of an iOS 26 tab bar.
  val refractionHeight = min(smallestHalf * 0.4f, 16.dp.toPx())
  val refractionAmount = min(smallestHalf * 0.55f, 14.dp.toPx()) * look.refraction.coerceIn(0f, 1f)
  val shine = look.shine.coerceIn(0f, 1f)
  val rim = Color.White.copy(alpha = (if (look.dark) 0.55f else 0.85f) * shine)
  val hair = if (look.dark) Color.White.copy(alpha = 0.12f) else Color.Black.copy(alpha = 0.10f)

  val shader = obtainRuntimeShader("GlassV2", GLASS_V2_SHADER).apply {
    setFloatUniform("offset", padding, padding)
    setFloatUniform("rects", rects)
    setFloatUniform("radii", radii)
    setFloatUniform("surfA", surfA)
    setFloatUniform("surfB", surfB)
    // A smooth union this wide bridges a gap of about 27 % of it.
    setFloatUniform("k", look.mergePx * 3.7f)
    setFloatUniform("refractionHeight", refractionHeight)
    setFloatUniform("refractionAmount", refractionAmount)
    setFloatUniform("rimWidth", 1.6f.dp.toPx())
    setFloatUniform("rimColor", rim.red, rim.green, rim.blue, rim.alpha)
    setFloatUniform("rimBase", (if (look.dark) 0.06f else 0.10f) * shine)
    setFloatUniform("hairline", hair.red, hair.green, hair.blue, hair.alpha)
  }
  effect(RenderEffect.createRuntimeShaderEffect(shader, "content"))
}

/**
 * Draws [shapes] over [backdrop] filling the composable. Android 13+: one
 * merged, refracting pass. Android 12: each shape on its own (no merge, no
 * bend). [opaque] (Reduce Transparency, or no glass below Android 12): solid
 * fills in the same shapes.
 */
@Composable
internal fun GlassV2Shapes(
  shapes: List<GlassV2Shape>,
  look: GlassV2Look,
  backdrop: Backdrop,
  opaque: Boolean,
  /** The solo case clips to its rounded shape so the shadow follows it. */
  soloShape: Shape? = null,
) {
  if (opaque || !isGlassEffectSupported) {
    for (s in shapes) {
      OpaqueShape(s, look.dark)
    }
    return
  }
  if (!isGlassV2ShaderSupported) {
    for (s in shapes) {
      PlainGlassShape(s, look, backdrop)
    }
    return
  }
  Box(
    Modifier
      .fillMaxSize()
      .drawBackdrop(
        backdrop = backdrop,
        shape = { soloShape ?: RectangleShape },
        effects = { glassV2(shapes, look) },
        highlight = null,
        shadow = {
          if (look.dark || soloShape == null) null
          else Shadow(radius = 10.dp, color = Color.Black.copy(alpha = 0.10f))
        },
      ),
  )
}

@Composable
private fun OpaqueShape(s: GlassV2Shape, dark: Boolean) {
  val density = LocalDensity.current.density
  val shape = RoundedCornerShape(s.radius)
  val fill = s.tint?.let { Color(it) } ?: if (dark) Color(0xFF2C2C2E) else Color(0xFFF7F7F9)
  Box(
    Modifier
      .offset { IntOffset(s.left.toInt(), s.top.toInt()) }
      .size((s.width / density).dp, (s.height / density).dp)
      .background(fill, shape)
      .border(0.5.dp, if (dark) Color.White.copy(alpha = 0.16f) else Color.Black.copy(alpha = 0.10f), shape),
  )
}

/** Android 12: blur and frost per shape, with a drawn rim (no AGSL). */
@Composable
private fun PlainGlassShape(s: GlassV2Shape, look: GlassV2Look, backdrop: Backdrop) {
  val density = LocalDensity.current.density
  val shape = RoundedCornerShape(s.radius)
  val (a, b) = surfaces(look, s.tint)
  // The backdrop node keeps its recorded surface until the page changes, so a
  // new look rebuilds it.
  key(look, s.tint) {
    Box(
      Modifier
        .offset { IntOffset(s.left.toInt(), s.top.toInt()) }
        .size((s.width / density).dp, (s.height / density).dp)
        .drawWithContent {
          drawContent()
          drawGlassV2Edge(look.dark, s.radius)
        }
        .drawBackdrop(
          backdrop = backdrop,
          shape = { shape },
          effects = {
            colorControls(saturation = if (look.dark) 0.9f else 1.15f)
            blur(look.blurDp().dp.toPx())
          },
          highlight = null,
          shadow = {
            if (look.dark) null else Shadow(radius = 10.dp, color = Color.Black.copy(alpha = 0.10f))
          },
          onDrawSurface = {
            drawRect(a)
            drawRect(b)
          },
        ),
    )
  }
}

/** Hairline round the glass plus a soft highlight just inside the top edge. */
private fun DrawScope.drawGlassV2Edge(dark: Boolean, radiusPx: Float) {
  val hair = 0.5.dp.toPx().coerceAtLeast(1f)
  val inset = hair / 2f
  drawRoundRect(
    brush = if (dark) {
      Brush.verticalGradient(0f to Color.White.copy(alpha = 0.30f), 1f to Color.White.copy(alpha = 0.10f))
    } else {
      Brush.verticalGradient(0f to Color.Black.copy(alpha = 0.08f), 1f to Color.Black.copy(alpha = 0.12f))
    },
    topLeft = Offset(inset, inset),
    size = Size(size.width - hair, size.height - hair),
    cornerRadius = CornerRadius((radiusPx - inset).coerceAtLeast(0f)),
    style = Stroke(hair),
  )
  val glow = 1.dp.toPx()
  val gInset = hair + glow / 2f
  drawRoundRect(
    brush = Brush.verticalGradient(
      0f to Color.White.copy(alpha = if (dark) 0.35f else 0.85f),
      0.35f to Color.White.copy(alpha = 0f),
    ),
    topLeft = Offset(gInset, gInset),
    size = Size(size.width - gInset * 2f, size.height - gInset * 2f),
    cornerRadius = CornerRadius((radiusPx - gInset).coerceAtLeast(0f)),
    style = Stroke(glow),
  )
}
