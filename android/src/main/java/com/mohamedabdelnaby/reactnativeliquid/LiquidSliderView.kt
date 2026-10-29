package com.mohamedabdelnaby.reactnativeliquid

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.fastCoerceIn
import androidx.compose.ui.util.lerp
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.layerBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.rememberBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.rememberCombinedBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.rememberLayerBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.lens
import com.mohamedabdelnaby.reactnativeliquid.backdrop.highlight.Highlight
import com.mohamedabdelnaby.reactnativeliquid.backdrop.shadow.InnerShadow
import com.mohamedabdelnaby.reactnativeliquid.backdrop.shadow.Shadow
import kotlinx.coroutines.flow.collectLatest
import kotlin.math.roundToInt

@Stable
internal class SliderState {
  var value by mutableFloatStateOf(0f)
  var minimumValue by mutableFloatStateOf(0f)
  var maximumValue by mutableFloatStateOf(1f)
  var step by mutableFloatStateOf(0f)
  var disabled by mutableStateOf(false)
  var tintColor by mutableStateOf<Int?>(null)
  var colorScheme by mutableStateOf("system")

  fun snap(value: Float): Float {
    val clamped = value.coerceIn(minimumValue, maximumValue.coerceAtLeast(minimumValue))
    if (step <= 0f) {
      return clamped
    }
    return (minimumValue + ((clamped - minimumValue) / step).roundToInt() * step)
      .coerceAtMost(maximumValue)
  }
}

/** Liquid Glass slider. Dragging lifts the thumb into a clear glass lens over the track. */
class LiquidSliderView(context: Context) : LiquidComposeHost(context) {

  override val mirrorsInRtl = true

  internal val state = SliderState()

  init {
    claimsHorizontalDrags = true
    val backdrop = createBackdrop(this)
    addComposeView {
      LiquidSlider(
        state = state,
        backdrop = backdrop,
        onEvent = { name, value -> dispatchLiquidEvent(name) { putDouble("value", value.toDouble()) } },
      )
    }
  }
}

@Composable
private fun LiquidSlider(state: SliderState, backdrop: Backdrop, onEvent: (String, Float) -> Unit) {
  val dark = isDarkScheme(state.colorScheme)
  val accentColor = state.tintColor?.let { Color(it) }
    ?: if (dark) Color(0xFF0091FF) else Color(0xFF0088FF)
  val trackColor = if (dark) Color(0xFF787880).copy(0.36f) else Color(0xFF787878).copy(0.2f)
  val capsule = RoundedCornerShape(percent = 50)
  val min = state.minimumValue
  val max = state.maximumValue.coerceAtLeast(min + 0.0001f)

  val trackBackdrop = rememberLayerBackdrop()

  BoxWithConstraints(
    Modifier.fillMaxSize().alpha(if (state.disabled) 0.45f else 1f),
    contentAlignment = Alignment.CenterStart,
  ) {
    val trackWidth = constraints.maxWidth
    val animationScope = rememberCoroutineScope()
    var lastEmitted by remember { mutableFloatStateOf(state.value) }
    var dragging by remember { mutableStateOf(false) }

    val drag = remember(animationScope, min, max) {
      DampedDragAnimation(
        animationScope = animationScope,
        initialValue = state.value.coerceIn(min, max),
        valueRange = min..max,
        visibilityThreshold = (max - min) / 1000f,
        initialScale = 1f,
        pressedScale = 1.5f,
        onDragStarted = {
          dragging = true
          onEvent("SlidingStart", state.snap(targetValue))
        },
        onDragStopped = {
          dragging = false
          val value = state.snap(targetValue)
          if (state.step > 0f) {
            updateValue(value)
          }
          onEvent("SlidingComplete", value)
        },
        onDrag = { _, dragAmount ->
          val delta = (max - min) * (dragAmount.x / trackWidth)
          val target = (targetValue + delta).coerceIn(min, max)
          updateValue(target)
          val value = state.snap(target)
          if (value != lastEmitted) {
            lastEmitted = value
            state.value = value
            onEvent("ValueChange", value)
          }
        },
      )
    }
    LaunchedEffect(drag) {
      snapshotFlow { state.value }.collectLatest { value ->
        if (!dragging && drag.targetValue != value) {
          lastEmitted = value
          drag.updateValue(value)
        }
      }
    }

    Box(Modifier.layerBackdrop(trackBackdrop)) {
      Box(
        Modifier
          .clip(capsule)
          .background(trackColor)
          .then(
            if (state.disabled) Modifier
            else Modifier.pointerInput(animationScope, trackWidth) {
              detectTapGestures { position ->
                val value = state.snap(min + (max - min) * (position.x / trackWidth))
                drag.animateToValue(value)
                lastEmitted = value
                state.value = value
                onEvent("ValueChange", value)
                onEvent("SlidingComplete", value)
              }
            },
          )
          // The fill is drawn, not laid out, so it follows the thumb on every frame.
          .drawWithContent {
            drawContent()
            drawRoundRect(
              color = accentColor,
              size = Size(size.width * drag.progress.coerceIn(0f, 1f), size.height),
              cornerRadius = CornerRadius(size.height / 2f),
            )
          }
          .height(6f.dp)
          .fillMaxWidth(),
      )
    }

    Box(
      Modifier
        .graphicsLayer {
          translationX = (-size.width / 2f + trackWidth * drag.progress)
            .fastCoerceIn(-size.width / 4f, trackWidth - size.width * 3f / 4f)
        }
        .then(if (state.disabled) Modifier else drag.modifier)
        .drawBackdrop(
          backdrop = rememberCombinedBackdrop(
            backdrop,
            rememberBackdrop(trackBackdrop) { drawBackdrop ->
              val progress = drag.pressProgress
              scale(lerp(2f / 3f, 1f, progress), lerp(0f, 1f, progress)) { drawBackdrop() }
            },
          ),
          shape = { capsule },
          effects = {
            val progress = drag.pressProgress
            blur(8f.dp.toPx() * (1f - progress))
            lens(6f.dp.toPx() * progress, 10f.dp.toPx() * progress)
          },
          highlight = {
            Highlight.Ambient.copy(
              width = Highlight.Ambient.width / 1.5f,
              blurRadius = Highlight.Ambient.blurRadius / 1.5f,
              alpha = drag.pressProgress,
            )
          },
          shadow = { Shadow(radius = 4f.dp, color = Color.Black.copy(alpha = 0.05f)) },
          innerShadow = {
            val progress = drag.pressProgress
            // Light, so the lens stays clear instead of darkening at its edge.
            InnerShadow(radius = 3f.dp * progress, alpha = 0.3f * progress)
          },
          layerBlock = {
            scaleX = drag.scaleX
            scaleY = drag.scaleY
            val velocity = drag.velocity / 10f
            scaleX /= 1f - (velocity * 0.75f).fastCoerceIn(-0.2f, 0.2f)
            scaleY *= 1f - (velocity * 0.25f).fastCoerceIn(-0.2f, 0.2f)
          },
          onDrawSurface = {
            val progress = drag.pressProgress
            // The solid thumb frosts away into clear glass with a faint white body, and back.
            drawRect(Color.White.copy(alpha = 1f - progress + 0.06f * progress))
          },
        )
        .size(40f.dp, 24f.dp),
    )
  }
}

@ReactModule(name = LiquidSliderViewManager.NAME)
class LiquidSliderViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidSliderView(context)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    directEvents("ValueChange", "SlidingStart", "SlidingComplete")

  private fun state(view: ReactViewGroup) = (view as? LiquidSliderView)?.state

  @ReactProp(name = "value", defaultFloat = 0f)
  fun setValue(view: ReactViewGroup, value: Float) {
    state(view)?.value = value
  }

  @ReactProp(name = "minimumValue", defaultFloat = 0f)
  fun setMinimumValue(view: ReactViewGroup, value: Float) {
    state(view)?.minimumValue = value
  }

  @ReactProp(name = "maximumValue", defaultFloat = 1f)
  fun setMaximumValue(view: ReactViewGroup, value: Float) {
    state(view)?.maximumValue = value
  }

  @ReactProp(name = "step", defaultFloat = 0f)
  fun setStep(view: ReactViewGroup, value: Float) {
    state(view)?.step = value
  }

  @ReactProp(name = "disabled")
  fun setDisabled(view: ReactViewGroup, value: Boolean) {
    state(view)?.disabled = value
  }

  @ReactProp(name = "minimumTrackTintColor", customType = "Color")
  fun setMinimumTrackTintColor(view: ReactViewGroup, value: Int?) {
    state(view)?.tintColor = value
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    state(view)?.colorScheme = value ?: "system"
  }

  companion object {
    const val NAME = "RNLiquidSlider"
  }
}
