package com.mohamedabdelnaby.reactnativeliquid

import android.os.Build
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.withFrameNanos
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Constraints
import kotlin.math.roundToInt
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.unit.dp
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.lens
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.vibrancy
import com.mohamedabdelnaby.reactnativeliquid.backdrop.highlight.Highlight
import com.mohamedabdelnaby.reactnativeliquid.backdrop.highlight.HighlightStyle
import com.mohamedabdelnaby.reactnativeliquid.backdrop.shadow.Shadow
import kotlin.math.min

/** Observable glass configuration, written by the view manager and read by Compose. */
@Stable
internal class GlassState {
  var glassStyle by mutableStateOf("regular")
  var tintColor by mutableStateOf<Int?>(null)
  var colorScheme by mutableStateOf("system")
  var interactive by mutableStateOf(false)
  var pressed by mutableStateOf(false)

  /** Corner radius in dp, as passed from JS. */
  var cornerRadius by mutableFloatStateOf(0f)
  var blurRadius by mutableFloatStateOf(3f)
  var refractionHeight by mutableFloatStateOf(12f)
  var refractionAmount by mutableFloatStateOf(24f)
  var chromaticAberration by mutableStateOf(false)
  var depthEffect by mutableStateOf(false)
  var highlight by mutableStateOf(true)
  /** Specular rim colour (rimColor): the highlight in that colour and width. */
  var rimColor by mutableStateOf<Int?>(null)
  var rimWidth by mutableStateOf(1f)
  /** The rim on the side away from the light (rimShadeColor). */
  var rimShadeColor by mutableStateOf<Int?>(null)
  /** A hairline all round the outside (rimEdgeColor), with the rim's glint just inside it. */
  var rimEdgeColor by mutableStateOf<Int?>(null)
  /** "vertical": the glint along the top and bottom edges instead of the diagonal curves. */
  var rimGradient by mutableStateOf("diagonal")
  /** The iOS 26 light-glass edge (specularEdge): glow inside the top, white line along the bottom, graded hairline. */
  var specularEdge by mutableStateOf(false)
  /** Its strengths (0 to 1) and how far the top glow / bottom shine reach (fractions of the height). */
  var specularTopOpacity by mutableFloatStateOf(0.95f)
  var specularBottomOpacity by mutableFloatStateOf(0.95f)
  var specularHairlineOpacity by mutableFloatStateOf(1f)
  var specularGlowHeight by mutableFloatStateOf(0.16f)
  var specularBottomHeight by mutableFloatStateOf(0.07f)
  /** Light catching the top-left and bottom-right corners (cornerReflection), 0 to 1. */
  var cornerReflection by mutableFloatStateOf(0f)
  /** Blur of the page behind the glass in dp (backdropBlur); 0 uses [blurRadius]. */
  var backdropBlur by mutableFloatStateOf(0f)
  var shadow by mutableStateOf(true)
  /** Fades the glass out over this many dp at its bottom edge. */
  var fadeBottom by mutableFloatStateOf(0f)
  /** fadeCurve "ease": the fade follows an S-curve instead of a straight line. */
  var fadeEase by mutableStateOf(false)

  /** Animate layout changes as a liquid morph. */
  var morph = false
  /**
   * How far each edge of the previous frame is from the current one, in px, animated back to 0.
   * Set synchronously while the view is laid out, so the very first frame drawn at the new size
   * already starts from the old shape instead of flashing the final one.
   */
  var morphLeft by mutableFloatStateOf(0f)
  var morphTop by mutableFloatStateOf(0f)
  var morphRight by mutableFloatStateOf(0f)
  var morphBottom by mutableFloatStateOf(0f)
  var morphGeneration by mutableIntStateOf(0)

  /** Size of the hosting view in px, used to clamp radii. */
  var density = 1f
  var widthPx by mutableIntStateOf(0)
  var heightPx by mutableIntStateOf(0)

  val maxRadiusPx: Float
    get() = min(widthPx, heightPx) / 2f
}

internal val isGlassEffectSupported: Boolean
  get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

@Composable
internal fun LiquidGlassSurface(state: GlassState, backdrop: Backdrop) {
  val dark = when (state.colorScheme) {
    "dark" -> true
    "light" -> false
    else -> isSystemInDarkTheme()
  }
  val pressProgress by animateFloatAsState(
    targetValue = if (state.interactive && state.pressed) 1f else 0f,
    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
    label = "press",
  )

  // The edge offsets start at the old frame (set while laying out) and spring to 0.
  LaunchedEffect(state.morphGeneration) {
    if (state.morphGeneration == 0) return@LaunchedEffect
    // Slightly different springs per edge make the glass stretch like liquid. About 0.55 s, like
    // the iOS 26 morph.
    val left = LiquidSpring(0.72f, 135f, 0.5f).apply { value = state.morphLeft }
    val right = LiquidSpring(0.68f, 115f, 0.5f).apply { value = state.morphRight }
    val top = LiquidSpring(0.76f, 160f, 0.5f).apply { value = state.morphTop }
    val bottom = LiquidSpring(0.76f, 150f, 0.5f).apply { value = state.morphBottom }
    // Stepped per drawn frame, at most a 30 fps frame at a time: when the app stalls (a new
    // screen, a busy GPU), the morph carries on from where it was instead of jumping to its end
    // the way a clock-based animation does.
    var last = 0L
    while (true) {
      val now = withFrameNanos { it }
      val dt = if (last == 0L) 1f / 60f else ((now - last) / 1e9f).coerceIn(1f / 240f, 1f / 30f)
      last = now
      val moving = left.step(dt) or right.step(dt) or top.step(dt) or bottom.step(dt)
      state.morphLeft = left.value
      state.morphRight = right.value
      state.morphTop = top.value
      state.morphBottom = bottom.value
      if (!moving) break
    }
  }

  Box(
    Modifier
      .fillMaxSize()
      .layout { measurable, constraints ->
        val width = constraints.maxWidth
        val height = constraints.maxHeight
        val x = state.morphLeft
        val y = state.morphTop
        val w = (width + state.morphRight - x).roundToInt().coerceAtLeast(1)
        val h = (height + state.morphBottom - y).roundToInt().coerceAtLeast(1)
        val placeable = measurable.measure(Constraints.fixed(w, h))
        layout(width, height) { placeable.place(x.roundToInt(), y.roundToInt()) }
      }
      .then(
        if (state.fadeBottom > 0f) {
          Modifier
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
            .drawWithContent {
              drawContent()
              val start = (1f - state.fadeBottom.dp.toPx() / size.height).coerceIn(0f, 1f)
              // Eased: a smootherstep with enough stops to show no banding, so
              // neither end of the fade shows (as on iOS).
              val steps = if (state.fadeEase) 16 else 1
              val stops = Array(steps + 2) { i ->
                if (i == 0) {
                  0f to Color.Black
                } else {
                  val t = (i - 1).toFloat() / steps
                  val eased = if (state.fadeEase) t * t * t * (t * (t * 6f - 15f) + 10f) else t
                  (start + (1f - start) * t) to Color.Black.copy(alpha = 1f - eased)
                }
              }
              drawRect(Brush.verticalGradient(*stops), blendMode = BlendMode.DstIn)
            }
        } else {
          Modifier
        },
      )
      // The rim's shade goes over the glass and its highlight, which would
      // otherwise light it back up.
      .drawWithContent {
        drawContent()
        if (state.cornerReflection > 0f) {
          drawCornerReflection(state)
        }
        if (state.specularEdge) {
          val radius = min(state.cornerRadius * state.density, min(size.width, size.height) / 2f)
          val corner = androidx.compose.ui.geometry.CornerRadius(radius)
          val top = state.specularTopOpacity.coerceIn(0f, 1f)
          val bottom = state.specularBottomOpacity.coerceIn(0f, 1f)
          val hairline = state.specularHairlineOpacity.coerceIn(0f, 1f)
          // The top glow reaches this far down; the bottom shine this far up (a
          // thin line at the default 7%, a glow like the top one when taller).
          val glowEnd = state.specularGlowHeight.coerceIn(0.02f, 0.9f)
          val lineStart = maxOf(glowEnd, 1f - state.specularBottomHeight.coerceIn(0.02f, 0.9f))
          // Light from above: white just inside the top edge, fading into the
          // glass, and white along the bottom edge.
          drawRoundRect(
            brush = Brush.verticalGradient(
              0f to Color.White.copy(alpha = top),
              glowEnd to Color.White.copy(alpha = 0f),
              lineStart to Color.White.copy(alpha = 0f),
              1f to Color.White.copy(alpha = bottom),
            ),
            cornerRadius = corner,
          )
          // The hairline: light grey along the top, darker down the sides,
          // gone along the bottom under a white line; a bottom glow mirrors
          // the top, light grey along the bottom too.
          val mirrored = state.specularBottomHeight > 0.071f
          val hair = 0.5.dp.toPx()
          drawRoundRect(
            brush = Brush.verticalGradient(
              0f to Color.Black.copy(alpha = 0.13f * hairline),
              0.45f to Color.Black.copy(alpha = 0.3f * hairline),
              (if (mirrored) 0.55f else 0.78f) to Color.Black.copy(alpha = (if (mirrored) 0.3f else 0.24f) * hairline),
              1f to Color.Black.copy(alpha = (if (mirrored) 0.13f else 0f) * hairline),
            ),
            topLeft = androidx.compose.ui.geometry.Offset(hair / 2f, hair / 2f),
            size = androidx.compose.ui.geometry.Size(size.width - hair, size.height - hair),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius((radius - hair / 2f).coerceAtLeast(0f)),
            style = androidx.compose.ui.graphics.drawscope.Stroke(hair),
          )
        }
        state.rimEdgeColor?.let { edgeArgb ->
          val radius = min(state.cornerRadius * state.density, min(size.width, size.height) / 2f)
          val edge = 1.dp.toPx()
          drawRoundRect(
            color = Color(edgeArgb),
            topLeft = androidx.compose.ui.geometry.Offset(edge / 2f, edge / 2f),
            size = androidx.compose.ui.geometry.Size(size.width - edge, size.height - edge),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius((radius - edge / 2f).coerceAtLeast(0f)),
            style = androidx.compose.ui.graphics.drawscope.Stroke(edge),
          )
          state.rimColor?.let { rimArgb ->
            // The glint just inside the edge, drawn normally rather than added
            // like the glass highlight, so it shows on white: bright on the
            // top-left and bottom-right curves, faint along the sides.
            val rim = Color(rimArgb)
            val vertical = state.rimGradient == "vertical"
            // Vertical with a shade: a shiny border, white along the top and
            // bottom edges, turning to the shade down the sides.
            val shade = state.rimShadeColor
            val side = if (vertical && shade != null) Color(shade) else rim.copy(alpha = rim.alpha * 0.2f)
            val stroke = state.rimWidth.dp.toPx()
            val inset = edge + stroke / 2f
            drawRoundRect(
              brush = Brush.linearGradient(
                0f to rim,
                (if (vertical) 0.3f else 0.38f) to side,
                (if (vertical) 0.7f else 0.62f) to side,
                1f to rim,
                start = if (vertical) androidx.compose.ui.geometry.Offset(size.width / 2f, 0f)
                else androidx.compose.ui.geometry.Offset.Zero,
                end = if (vertical) androidx.compose.ui.geometry.Offset(size.width / 2f, size.height)
                else androidx.compose.ui.geometry.Offset(size.width, size.height),
              ),
              topLeft = androidx.compose.ui.geometry.Offset(inset, inset),
              size = androidx.compose.ui.geometry.Size(size.width - inset * 2f, size.height - inset * 2f),
              cornerRadius = androidx.compose.ui.geometry.CornerRadius((radius - inset).coerceAtLeast(0f)),
              style = androidx.compose.ui.graphics.drawscope.Stroke(stroke),
            )
          }
        }
        // (In the vertical shiny border the shade is already the sides' colour.)
        state.rimShadeColor?.takeUnless { state.rimGradient == "vertical" && state.rimEdgeColor != null && state.rimColor != null }?.let { argb ->
          // The far side of the rim: clear at the top-left, the shade at the
          // bottom-right, so the highlight reads as a reflection on white.
          val stroke = state.rimWidth.dp.toPx()
          val radius = min(state.cornerRadius * state.density, min(size.width, size.height) / 2f)
          drawRoundRect(
            brush = Brush.linearGradient(
              0f to Color.Transparent,
              0.45f to Color.Transparent,
              1f to Color(argb),
              start = androidx.compose.ui.geometry.Offset.Zero,
              end = androidx.compose.ui.geometry.Offset(size.width, size.height),
            ),
            topLeft = androidx.compose.ui.geometry.Offset(stroke / 2f, stroke / 2f),
            size = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius((radius - stroke / 2f).coerceAtLeast(0f)),
            style = androidx.compose.ui.graphics.drawscope.Stroke(stroke),
          )
        }
      }
      .drawBackdrop(
        backdrop = backdrop,
        shape = {
          val radius = state.cornerRadius * state.density
          // Capsules stay capsules while the size animates.
          if (radius >= state.maxRadiusPx - 0.5f) RoundedCornerShape(percent = 50)
          else RoundedCornerShape(min(radius, state.maxRadiusPx))
        },
        effects = {
          vibrancy()
          blur((if (state.backdropBlur > 0f) state.backdropBlur else state.blurRadius).dp.toPx())
          val maxHeight = state.maxRadiusPx
          lens(
            refractionHeight = min(state.refractionHeight.dp.toPx() * (1f + 0.25f * pressProgress), maxHeight),
            refractionAmount = state.refractionAmount.dp.toPx() * (1f + 0.5f * pressProgress),
            depthEffect = state.depthEffect,
            chromaticAberration = state.chromaticAberration,
          )
        },
        highlight = {
          val rim = state.rimColor
          if (rim != null) {
            // Angled like iOS: brightest on the top-left and bottom-right curves.
            Highlight(width = state.rimWidth.dp, style = HighlightStyle.Default(color = Color(rim)))
          } else if (!state.highlight) null
          else if (dark) Highlight.Ambient
          else Highlight.Default
        },
        shadow = {
          if (!state.shadow) null
          else Shadow(radius = 16.dp, color = Color.Black.copy(alpha = if (dark) 0.3f else 0.12f))
        },
        onDrawSurface = {
          val clear = state.glassStyle == "clear"
          val surface = when {
            !isGlassEffectSupported && dark -> Color(0xF21C1C1E)
            !isGlassEffectSupported -> Color(0xF2F2F2F7)
            // iOS regular glass is a frost, not a dim: it lightens what is behind it in dark mode
            // too (bright blue stays a lighter blue, black becomes dark grey). Dark fills turned it
            // into navy pills over bright content.
            dark -> if (clear) Color(0xFF1C1C1E).copy(alpha = 0.12f) else Color.White.copy(alpha = 0.14f)
            else -> Color.White.copy(alpha = if (clear) 0.08f else 0.32f)
          }
          drawRect(surface)

          state.tintColor?.let { argb ->
            val tint = Color(argb)
            drawRect(tint, blendMode = BlendMode.Hue)
            drawRect(tint.copy(alpha = tint.alpha * 0.75f))
          }

          if (pressProgress > 0f) {
            // Brightens while pressed, like iOS 26 glass.
            drawRect(Color.White.copy(alpha = (if (dark) 0.22f else 0.5f) * pressProgress))
          }
        },
      ),
  )
}

/**
 * Light catching the top-left and bottom-right corners (cornerReflection): a
 * soft bloom inside the glass and a brighter glint on the edge there, like iOS.
 */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawCornerReflection(state: GlassState) {
  val alpha = state.cornerReflection.coerceIn(0f, 1f)
  val radius = min(state.cornerRadius * state.density, min(size.width, size.height) / 2f)
  // The middle of each corner's curve, where the light sits.
  val inset = radius * (1f - 0.70710677f)
  val corners = listOf(
    androidx.compose.ui.geometry.Offset(inset, inset),
    androidx.compose.ui.geometry.Offset(size.width - inset, size.height - inset),
  )
  val bloomReach = maxOf(12.dp.toPx(), radius * 1.6f)
  val glintReach = maxOf(10.dp.toPx(), radius * 1.3f)
  val glintWidth = 1.2.dp.toPx()
  fun light(center: androidx.compose.ui.geometry.Offset, reach: Float, a: Float) = Brush.radialGradient(
    0f to Color.White.copy(alpha = a),
    0.4f to Color.White.copy(alpha = a * 0.4f),
    1f to Color.Transparent,
    center = center,
    radius = reach,
  )
  val shape = androidx.compose.ui.graphics.Path().apply {
    addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, size.width, size.height, radius, radius))
  }
  clipPath(shape) {
    corners.forEach { drawRect(light(it, bloomReach, alpha)) }
  }
  // The edge catches more light than the glass behind it.
  val glintAlpha = min(1f, alpha * 4f)
  corners.forEach {
    drawRoundRect(
      brush = light(it, glintReach, glintAlpha),
      topLeft = androidx.compose.ui.geometry.Offset(glintWidth / 2f, glintWidth / 2f),
      size = androidx.compose.ui.geometry.Size(size.width - glintWidth, size.height - glintWidth),
      cornerRadius = androidx.compose.ui.geometry.CornerRadius((radius - glintWidth / 2f).coerceAtLeast(0f)),
      style = androidx.compose.ui.graphics.drawscope.Stroke(glintWidth),
    )
  }
}
