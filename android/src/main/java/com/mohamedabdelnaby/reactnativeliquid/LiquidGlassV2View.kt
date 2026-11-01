package com.mohamedabdelnaby.reactnativeliquid

import android.animation.ValueAnimator
import android.content.Context
import android.view.MotionEvent
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalDensity
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import kotlin.math.min

@Stable
internal class GlassV2State {
  var glassStyle by mutableStateOf("regular")
  var tintColor by mutableStateOf<Int?>(null)
  var cornerRadius by mutableFloatStateOf(0f)
  var colorScheme by mutableStateOf("system")
  var reduceTransparency by mutableStateOf("system")
  var clarity by mutableFloatStateOf(-1f)
  var refraction by mutableFloatStateOf(1f)
  var shine by mutableFloatStateOf(1f)
  /** Drawn by the enclosing group instead of by this view. */
  var grouped by mutableStateOf(false)
  var interactive = false
  var widthPx by mutableIntStateOf(0)
  var heightPx by mutableIntStateOf(0)
}

/**
 * The v2 glass material on Android, tuned to the iOS 26 references
 * (references/ANALYSIS.md): a neutral frost that lets colour through only
 * partly (light saturation instead of a boost), a hairline edge that is grey in
 * light mode and light at the top in dark mode, a soft shadow in light mode
 * only, a lens that bends the page at the rim and a rim lit from the top left
 * (GlassV2Material.kt). One backdrop and one blur per view. Inside a
 * GlassGroupV2 it draws nothing and its group draws it. Below Android 12, or
 * with `reduceTransparency="on"`, an opaque fill in the same shape.
 */
class LiquidGlassV2View(context: Context) : LiquidComposeHost(context) {

  internal val state = GlassV2State()

  init {
    // A grouped shape never samples the page itself: its group does.
    val backdrop = createBackdrop(this, coordinatesDependent = false, enabled = { !state.grouped })
    addComposeView { GlassV2Surface(state, backdrop) }
  }

  override fun onSizeChanged() {
    state.widthPx = width
    state.heightPx = height
  }

  // Press feedback on the UI thread: a small swell, skipped when the system
  // turned animations off (the Android counterpart of Reduce Motion).
  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    if (state.interactive && ValueAnimator.areAnimatorsEnabled()) {
      when (ev.actionMasked) {
        MotionEvent.ACTION_DOWN -> animate().scaleX(1.04f).scaleY(1.04f).setDuration(160).start()
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL ->
          animate().scaleX(1f).scaleY(1f).setDuration(260).start()
      }
    }
    val handled = super.dispatchTouchEvent(ev)
    return handled || (state.interactive && ev.actionMasked == MotionEvent.ACTION_DOWN)
  }
}

@Composable
private fun GlassV2Surface(state: GlassV2State, backdrop: Backdrop) {
  if (state.grouped) {
    // The enclosing GlassGroupV2 draws this shape with its neighbours.
    return
  }
  val dark = isDarkScheme(state.colorScheme)
  val density = LocalDensity.current.density
  val w = state.widthPx.toFloat()
  val h = state.heightPx.toFloat()
  if (w <= 0f || h <= 0f) return
  val radiusPx = min(state.cornerRadius * density, min(w, h) / 2f).coerceAtLeast(0f)
  val shape = GlassV2Shape(0f, 0f, w, h, radiusPx, state.tintColor)
  GlassV2Shapes(
    shapes = listOf(shape),
    look = GlassV2Look(
      dark = dark,
      clarity = glassV2Clarity(state.clarity, state.glassStyle),
      mergePx = 0f,
      refraction = state.refraction,
      shine = state.shine,
    ),
    backdrop = backdrop,
    opaque = state.reduceTransparency == "on",
    soloShape = RoundedCornerShape(radiusPx),
  )
}

@ReactModule(name = LiquidGlassV2ViewManager.NAME)
class LiquidGlassV2ViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidGlassV2View(context)

  private fun state(view: ReactViewGroup) = (view as? LiquidGlassV2View)?.state

  // Makes sure the Compose view draws the rebuilt surface on the next frame
  // (the host's requestLayout invalidates its Compose views).
  override fun onAfterUpdateTransaction(view: ReactViewGroup) {
    super.onAfterUpdateTransaction(view)
    view.requestLayout()
  }

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: ReactViewGroup, value: String?) {
    state(view)?.glassStyle = value ?: "regular"
  }

  @ReactProp(name = "tintColor", customType = "Color")
  fun setTintColor(view: ReactViewGroup, value: Int?) {
    state(view)?.tintColor = value
  }

  @ReactProp(name = "cornerRadius", defaultFloat = 0f)
  fun setCornerRadius(view: ReactViewGroup, value: Float) {
    state(view)?.cornerRadius = value
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    state(view)?.colorScheme = value ?: "system"
  }

  @ReactProp(name = "interactive")
  fun setInteractive(view: ReactViewGroup, value: Boolean) {
    state(view)?.interactive = value
  }

  @ReactProp(name = "reduceTransparency")
  fun setReduceTransparency(view: ReactViewGroup, value: String?) {
    state(view)?.reduceTransparency = value ?: "system"
  }

  @ReactProp(name = "clarity", defaultFloat = -1f)
  fun setClarity(view: ReactViewGroup, value: Float) {
    state(view)?.clarity = value
  }

  @ReactProp(name = "refraction", defaultFloat = 1f)
  fun setRefraction(view: ReactViewGroup, value: Float) {
    state(view)?.refraction = value
  }

  @ReactProp(name = "shine", defaultFloat = 1f)
  fun setShine(view: ReactViewGroup, value: Float) {
    state(view)?.shine = value
  }

  @ReactProp(name = "grouped", defaultBoolean = false)
  fun setGrouped(view: ReactViewGroup, value: Boolean) {
    state(view)?.grouped = value
  }

  companion object {
    const val NAME = "RNLiquidGlassV2"
  }
}
