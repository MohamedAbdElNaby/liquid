package com.mohamedabdelnaby.reactnativeliquid

import android.content.Context
import android.graphics.RectF
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import kotlin.math.abs
import kotlin.math.min

@Stable
internal class GlassGroupV2State {
  var spacing by mutableFloatStateOf(0f)
  var colorScheme by mutableStateOf("system")
  var glassStyle by mutableStateOf("regular")
  var reduceTransparency by mutableStateOf("system")
  var clarity by mutableFloatStateOf(-1f)
  var refraction by mutableFloatStateOf(1f)
  var shine by mutableFloatStateOf(1f)
  var shapes by mutableStateOf<List<GlassV2Shape>>(emptyList())
}

/**
 * GlassGroupV2 on Android: draws every grouped v2 glass inside it (up to
 * [GLASS_V2_MAX_SHAPES]) in one pass over one backdrop, so neighbours closer
 * than `spacing` melt into each other and pull apart again as they move, like
 * an iOS 26 glass container. The shapes follow their views every frame,
 * including transforms (a press swell, a native-driver animation).
 */
class LiquidGlassGroupV2View(context: Context) : LiquidComposeHost(context) {

  internal val state = GlassGroupV2State()
  private val rect = RectF()
  private var last = FloatArray(0)

  private val trackShapes = ViewTreeObserver.OnPreDrawListener {
    collectShapes()
    true
  }
  private var observed: ViewTreeObserver? = null

  init {
    val backdrop = createBackdrop(this, coordinatesDependent = false, enabled = { state.shapes.isNotEmpty() })
    addComposeView { GlassGroupV2Surface(state, backdrop) }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    observed = viewTreeObserver.also { it.addOnPreDrawListener(trackShapes) }
  }

  override fun onDetachedFromWindow() {
    observed?.takeIf { it.isAlive }?.removeOnPreDrawListener(trackShapes)
    observed = null
    super.onDetachedFromWindow()
  }

  private fun collectShapes() {
    val found = ArrayList<GlassV2Shape>(4)
    for (i in 0 until childCount) {
      collect(getChildAt(i), found)
    }
    // Only a real change reaches Compose (and re-runs the shader setup).
    val packed = FloatArray(found.size * 6)
    found.forEachIndexed { i, s ->
      packed[i * 6] = s.left
      packed[i * 6 + 1] = s.top
      packed[i * 6 + 2] = s.width
      packed[i * 6 + 3] = s.height
      packed[i * 6 + 4] = s.radius
      packed[i * 6 + 5] = (s.tint ?: 0).toFloat()
    }
    if (packed.size == last.size && packed.indices.all { abs(packed[it] - last[it]) < 0.25f }) {
      return
    }
    last = packed
    state.shapes = found
  }

  private fun collect(view: View, out: MutableList<GlassV2Shape>) {
    if (out.size >= GLASS_V2_MAX_SHAPES || view.visibility != View.VISIBLE || view.alpha <= 0f) {
      return
    }
    if (view is LiquidGlassGroupV2View || view is ComposeView) {
      // A nested group draws its own shapes; Compose views are the glass itself.
      return
    }
    if (view is LiquidGlassV2View && view.state.grouped) {
      if (view.width > 0 && view.height > 0) {
        out.add(shapeOf(view))
      }
      return
    }
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        collect(view.getChildAt(i), out)
      }
    }
  }

  /** The member's bounds in this view's pixels, through every transform on the way. */
  private fun shapeOf(member: LiquidGlassV2View): GlassV2Shape {
    rect.set(0f, 0f, member.width.toFloat(), member.height.toFloat())
    var v: View = member
    while (v !== this) {
      if (!v.matrix.isIdentity) {
        v.matrix.mapRect(rect)
      }
      val parent = v.parent as? View ?: break
      rect.offset((v.left - parent.scrollX).toFloat(), (v.top - parent.scrollY).toFloat())
      v = parent
    }
    val scale = if (member.width > 0) rect.width() / member.width else 1f
    val radius = min(member.state.cornerRadius * resources.displayMetrics.density * scale, min(rect.width(), rect.height()) / 2f)
    return GlassV2Shape(rect.left, rect.top, rect.width(), rect.height(), radius.coerceAtLeast(0f), member.state.tintColor)
  }
}

@Composable
private fun GlassGroupV2Surface(state: GlassGroupV2State, backdrop: Backdrop) {
  val shapes = state.shapes
  if (shapes.isEmpty()) return
  val density = LocalDensity.current.density
  GlassV2Shapes(
    shapes = shapes,
    look = GlassV2Look(
      dark = isDarkScheme(state.colorScheme),
      clarity = glassV2Clarity(state.clarity, state.glassStyle),
      mergePx = state.spacing * density,
      refraction = state.refraction,
      shine = state.shine,
    ),
    backdrop = backdrop,
    opaque = state.reduceTransparency == "on",
  )
}

@ReactModule(name = LiquidGlassGroupV2ViewManager.NAME)
class LiquidGlassGroupV2ViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidGlassGroupV2View(context)

  private fun state(view: ReactViewGroup) = (view as? LiquidGlassGroupV2View)?.state

  @ReactProp(name = "spacing", defaultFloat = 0f)
  fun setSpacing(view: ReactViewGroup, value: Float) {
    state(view)?.spacing = value
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    state(view)?.colorScheme = value ?: "system"
  }

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: ReactViewGroup, value: String?) {
    state(view)?.glassStyle = value ?: "regular"
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

  companion object {
    const val NAME = "RNLiquidGlassGroupV2"
  }
}
