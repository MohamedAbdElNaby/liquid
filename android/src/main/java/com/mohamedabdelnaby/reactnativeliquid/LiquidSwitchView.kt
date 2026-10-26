package com.mohamedabdelnaby.reactnativeliquid

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.fastCoerceIn
import androidx.compose.ui.util.lerp
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.kyant.backdrop.Backdrop
import com.kyant.backdrop.backdrops.layerBackdrop
import com.kyant.backdrop.backdrops.rememberBackdrop
import com.kyant.backdrop.backdrops.rememberCombinedBackdrop
import com.kyant.backdrop.backdrops.rememberLayerBackdrop
import com.kyant.backdrop.drawBackdrop
import com.kyant.backdrop.effects.blur
import com.kyant.backdrop.effects.lens
import com.kyant.backdrop.highlight.Highlight
import com.kyant.backdrop.shadow.InnerShadow
import com.kyant.backdrop.shadow.Shadow
import kotlinx.coroutines.flow.collectLatest

@Stable
internal class SwitchState {
  var value by mutableStateOf(false)
  var disabled by mutableStateOf(false)
  var onTintColor by mutableStateOf<Int?>(null)
  var offTintColor by mutableStateOf<Int?>(null)
  var thumbTintColor by mutableStateOf<Int?>(null)
  var lensTintColor by mutableStateOf<Int?>(null)
  var colorScheme by mutableStateOf("system")
}

/**
 * Liquid Glass switch. Pressing lifts the white thumb into a clear glass lens (refracting the
 * track below it) that stretches with its speed, then settles and frosts back to white.
 */
class LiquidSwitchView(context: Context) : LiquidComposeHost(context) {

  internal val state = SwitchState()

  init {
    claimsHorizontalDrags = true
    val backdrop = createBackdrop(this)
    addComposeView {
      LiquidSwitch(state, backdrop) { value ->
        dispatchLiquidEvent("ValueChange") { putBoolean("value", value) }
      }
    }
  }
}

@Composable
private fun LiquidSwitch(state: SwitchState, backdrop: Backdrop, onValueChange: (Boolean) -> Unit) {
  val dark = isDarkScheme(state.colorScheme)
  val accentColor = state.onTintColor?.let { Color(it) }
    ?: if (dark) Color(0xFF30D158) else Color(0xFF34C759)
  val trackColor = state.offTintColor?.let { Color(it) }
    ?: if (dark) Color(0xFF787880).copy(0.36f) else Color(0xFF787878).copy(0.2f)
  val thumbColor = state.thumbTintColor?.let { Color(it) } ?: Color.White
  val lensTint = state.lensTintColor?.let { Color(it) }
  val capsule = RoundedCornerShape(percent = 50)

  val density = LocalDensity.current
  val dragWidth = with(density) { 20f.dp.toPx() }
  val animationScope = rememberCoroutineScope()
  var didDrag by remember { mutableStateOf(false) }
  var fraction by remember { mutableFloatStateOf(if (state.value) 1f else 0f) }

  val drag = remember(animationScope) {
    DampedDragAnimation(
      animationScope = animationScope,
      initialValue = fraction,
      valueRange = 0f..1f,
      visibilityThreshold = 0.001f,
      initialScale = 1f,
      pressedScale = 1.5f,
      onDragStarted = {},
      onDragStopped = {
        fraction = if (didDrag) {
          if (targetValue >= 0.5f) 1f else 0f
        } else {
          if (state.value) 0f else 1f
        }
        didDrag = false
        val next = fraction == 1f
        if (next != state.value) {
          state.value = next
          onValueChange(next)
        }
      },
      onDrag = { _, dragAmount ->
        if (!didDrag) {
          didDrag = dragAmount.x != 0f
        }
        fraction = (fraction + dragAmount.x / dragWidth).fastCoerceIn(0f, 1f)
      },
    )
  }
  LaunchedEffect(drag) {
    snapshotFlow { fraction }.collectLatest { drag.updateValue(it) }
  }
  LaunchedEffect(drag) {
    snapshotFlow { state.value }.collectLatest { selected ->
      val target = if (selected) 1f else 0f
      if (target != fraction) {
        fraction = target
        drag.animateToValue(target)
      }
    }
  }

  val trackBackdrop = rememberLayerBackdrop()

  Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    Box(
      Modifier.alpha(if (state.disabled) 0.45f else 1f),
      contentAlignment = Alignment.CenterStart,
    ) {
      Box(
        Modifier
          .layerBackdrop(trackBackdrop)
          .clip(capsule)
          .drawBehind { drawRect(lerp(trackColor, accentColor, drag.value)) }
          .size(64f.dp, 28f.dp),
      )

      Box(
        Modifier
          .graphicsLayer {
            val padding = 2f.dp.toPx()
            translationX = lerp(padding, padding + dragWidth, drag.value)
          }
          .semantics { role = Role.Switch }
          .then(if (state.disabled) Modifier else drag.modifier)
          .drawBackdrop(
            backdrop = rememberCombinedBackdrop(
              backdrop,
              rememberBackdrop(trackBackdrop) { drawBackdrop ->
                val progress = drag.pressProgress
                scale(lerp(2f / 3f, 0.75f, progress), lerp(0f, 0.75f, progress)) {
                  drawBackdrop()
                }
              },
            ),
            shape = { capsule },
            effects = {
              val progress = drag.pressProgress
              blur(8f.dp.toPx() * (1f - progress))
              lens(5f.dp.toPx() * progress, 10f.dp.toPx() * progress, chromaticAberration = true)
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
              InnerShadow(radius = 4f.dp * progress, alpha = progress)
            },
            layerBlock = {
              scaleX = drag.scaleX
              scaleY = drag.scaleY
              val velocity = drag.velocity / 50f
              scaleX /= 1f - (velocity * 0.75f).fastCoerceIn(-0.2f, 0.2f)
              scaleY *= 1f - (velocity * 0.25f).fastCoerceIn(-0.2f, 0.2f)
            },
            onDrawSurface = {
              val progress = drag.pressProgress
              // The solid thumb frosts away into clear (optionally tinted) glass, and back.
              drawRect(thumbColor.copy(alpha = thumbColor.alpha * (1f - progress)))
              lensTint?.let { drawRect(it.copy(alpha = it.alpha * progress)) }
            },
          )
          .size(40f.dp, 24f.dp),
      )
    }
  }
}

@ReactModule(name = LiquidSwitchViewManager.NAME)
class LiquidSwitchViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidSwitchView(context)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> = directEvents("ValueChange")

  @ReactProp(name = "value")
  fun setValue(view: ReactViewGroup, value: Boolean) {
    (view as? LiquidSwitchView)?.state?.value = value
  }

  @ReactProp(name = "disabled")
  fun setDisabled(view: ReactViewGroup, value: Boolean) {
    (view as? LiquidSwitchView)?.state?.disabled = value
  }

  @ReactProp(name = "onTintColor", customType = "Color")
  fun setOnTintColor(view: ReactViewGroup, value: Int?) {
    (view as? LiquidSwitchView)?.state?.onTintColor = value
  }

  @ReactProp(name = "offTintColor", customType = "Color")
  fun setOffTintColor(view: ReactViewGroup, value: Int?) {
    (view as? LiquidSwitchView)?.state?.offTintColor = value
  }

  @ReactProp(name = "thumbTintColor", customType = "Color")
  fun setThumbTintColor(view: ReactViewGroup, value: Int?) {
    (view as? LiquidSwitchView)?.state?.thumbTintColor = value
  }

  @ReactProp(name = "lensTintColor", customType = "Color")
  fun setLensTintColor(view: ReactViewGroup, value: Int?) {
    (view as? LiquidSwitchView)?.state?.lensTintColor = value
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    (view as? LiquidSwitchView)?.state?.colorScheme = value ?: "system"
  }

  companion object {
    const val NAME = "RNLiquidSwitch"
  }
}
