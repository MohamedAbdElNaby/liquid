package com.mohamedabdelnaby.reactnativeliquid

import android.os.Build
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Constraints
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.unit.dp
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.lens
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.vibrancy
import com.mohamedabdelnaby.reactnativeliquid.backdrop.highlight.Highlight
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
  var shadow by mutableStateOf(true)
  /** Fades the glass out over this many dp at its bottom edge. */
  var fadeBottom by mutableFloatStateOf(0f)

  /** Animate layout changes as a liquid morph. */
  var morph = false
  /** Previous frame relative to the current one, in px; animated back to the current frame. */
  var morphFrom by mutableStateOf<android.graphics.RectF?>(null)
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

  // Offsets of each edge from the current frame, animated to 0 when the view morphs.
  val left = remember { Animatable(0f) }
  val top = remember { Animatable(0f) }
  val right = remember { Animatable(0f) }
  val bottom = remember { Animatable(0f) }
  LaunchedEffect(state.morphGeneration) {
    val from = state.morphFrom ?: return@LaunchedEffect
    left.snapTo(from.left)
    top.snapTo(from.top)
    right.snapTo(from.right - state.widthPx)
    bottom.snapTo(from.bottom - state.heightPx)
    // Slightly different springs per edge make the glass stretch like liquid.
    launch { left.animateTo(0f, spring(0.7f, 260f)) }
    launch { right.animateTo(0f, spring(0.66f, 210f)) }
    launch { top.animateTo(0f, spring(0.75f, 320f)) }
    launch { bottom.animateTo(0f, spring(0.75f, 300f)) }
  }

  Box(
    Modifier
      .fillMaxSize()
      .layout { measurable, constraints ->
        val width = constraints.maxWidth
        val height = constraints.maxHeight
        val x = left.value
        val y = top.value
        val w = (width + right.value - x).roundToInt().coerceAtLeast(1)
        val h = (height + bottom.value - y).roundToInt().coerceAtLeast(1)
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
              drawRect(
                Brush.verticalGradient(0f to Color.Black, start to Color.Black, 1f to Color.Transparent),
                blendMode = BlendMode.DstIn,
              )
            }
        } else {
          Modifier
        },
      )
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
          blur(state.blurRadius.dp.toPx())
          val maxHeight = state.maxRadiusPx
          lens(
            refractionHeight = min(state.refractionHeight.dp.toPx() * (1f + 0.25f * pressProgress), maxHeight),
            refractionAmount = state.refractionAmount.dp.toPx() * (1f + 0.5f * pressProgress),
            depthEffect = state.depthEffect,
            chromaticAberration = state.chromaticAberration,
          )
        },
        highlight = {
          if (!state.highlight) null
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
            dark -> Color(0xFF1C1C1E).copy(alpha = if (clear) 0.12f else 0.38f)
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
