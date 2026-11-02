package com.mohamedabdelnaby.reactnativeliquid

import android.content.Context
import android.graphics.RectF
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.ComposeView
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import kotlin.math.abs
import kotlin.math.min

/** Whether glass inside a container merges on this device (AGSL needs Android 13). */
internal val isGlassMergeSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

@Stable
internal class GlassContainerState {
  var spacing by mutableFloatStateOf(0f)
  var shapes by mutableStateOf<List<MergedGlassShape>>(emptyList())
  var look by mutableStateOf<MergedGlassLook?>(null)
}

/**
 * LiquidGlassContainer on Android 13+: draws every LiquidGlassView inside it (up to
 * [MERGED_GLASS_MAX_SHAPES]) in one pass over one backdrop, so glass closer than `spacing` melts
 * together and pulls apart again as it moves, like an iOS 26 glass container. The shapes follow
 * their views on every frame, with their press swell, drag pull and morph, so a pressed button
 * that swells toward its neighbour bridges into it. The member views keep their content and
 * touches but stop drawing their own glass. Below Android 13 it is a plain view.
 */
class LiquidGlassContainerView(context: Context) : LiquidComposeHost(context) {

  internal val state = GlassContainerState()
  private val rect = RectF()
  private var last = FloatArray(0)
  private val members = HashSet<LiquidGlassView>()
  private var observed: ViewTreeObserver? = null

  // Glass swells past the container (a pressed button grows up to 45 %), so its layer reaches out.
  private val outset = (24f * resources.displayMetrics.density).toInt()
  override val composeOutset: Int
    get() = if (isGlassMergeSupported) outset else 0

  private val trackShapes = ViewTreeObserver.OnPreDrawListener {
    collectShapes()
    true
  }

  init {
    if (isGlassMergeSupported) {
      lateinit var backdrop: Backdrop
      val layer = addComposeView {
        val look = state.look
        if (look != null) MergedGlassSurface(state.shapes, look, backdrop)
      }
      backdrop = createBackdrop(layer, coordinatesDependent = false, enabled = { state.shapes.isNotEmpty() })
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (isGlassMergeSupported) {
      observed = viewTreeObserver.also { it.addOnPreDrawListener(trackShapes) }
    }
  }

  override fun onDetachedFromWindow() {
    observed?.takeIf { it.isAlive }?.removeOnPreDrawListener(trackShapes)
    observed = null
    release(members.toList())
    super.onDetachedFromWindow()
  }

  private fun release(views: Collection<LiquidGlassView>) {
    for (view in views) {
      view.glassState.grouped = false
      members.remove(view)
    }
  }

  private fun collectShapes() {
    val found = ArrayList<MergedGlassShape>(4)
    val seen = HashSet<LiquidGlassView>()
    for (i in 0 until childCount) {
      collect(getChildAt(i), found, seen)
    }
    // Members that left the container draw their own glass again.
    release(members.filter { it !in seen })
    for (view in seen) {
      if (members.add(view)) view.glassState.grouped = true
    }

    val first = seen.firstOrNull()?.glassState
    val density = resources.displayMetrics.density
    val look = first?.let {
      MergedGlassLook(
        blurPx = (if (it.backdropBlur > 0f) it.backdropBlur else it.blurRadius) * density,
        // The same profile as a single glass's iOS lens at its props.
        bevelPx = it.refractionHeight * 1.33f * density,
        refractPx = it.refractionAmount * 2.2f * density,
        mergePx = state.spacing * density,
        dark = darkFor(it.colorScheme),
      )
    }
    if (look != state.look) state.look = look

    // Only a real change reaches Compose (and rebuilds the effect).
    val packed = FloatArray(found.size * 7)
    found.forEachIndexed { i, s ->
      packed[i * 7] = s.left
      packed[i * 7 + 1] = s.top
      packed[i * 7 + 2] = s.width
      packed[i * 7 + 3] = s.height
      packed[i * 7 + 4] = s.radius
      packed[i * 7 + 5] = (s.tint ?: 0).toFloat()
      packed[i * 7 + 6] = (if (s.pressed) 1f else 0f) + (if (s.dark) 2f else 0f) + (if (s.clear) 4f else 0f)
    }
    if (packed.size == last.size && packed.indices.all { abs(packed[it] - last[it]) < 0.25f }) {
      return
    }
    last = packed
    state.shapes = found
  }

  private fun collect(view: View, out: MutableList<MergedGlassShape>, seen: MutableSet<LiquidGlassView>) {
    if (out.size >= MERGED_GLASS_MAX_SHAPES || view.visibility != View.VISIBLE || view.alpha <= 0f) {
      return
    }
    if (view is LiquidGlassContainerView || view is ComposeView) {
      // A nested container merges its own glass; Compose views are glass layers.
      return
    }
    if (view is LiquidGlassView) {
      if (view.width > 0 && view.height > 0) {
        out.add(shapeOf(view))
        seen.add(view)
      }
      return
    }
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        collect(view.getChildAt(i), out, seen)
      }
    }
  }

  private fun darkFor(scheme: String): Boolean = when (scheme) {
    "dark" -> true
    "light" -> false
    else -> (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
      android.content.res.Configuration.UI_MODE_NIGHT_YES
  }

  /** The member's glass in the layer's pixels: its morph frame, through every transform on the way. */
  private fun shapeOf(member: LiquidGlassView): MergedGlassShape {
    val s = member.glassState
    rect.set(s.morphLeft, s.morphTop, member.width + s.morphRight, member.height + s.morphBottom)
    var v: View = member
    while (v !== this) {
      if (!v.matrix.isIdentity) {
        v.matrix.mapRect(rect)
      }
      val parent = v.parent as? View ?: break
      rect.offset((v.left - parent.scrollX).toFloat(), (v.top - parent.scrollY).toFloat())
      v = parent
    }
    rect.offset(outset.toFloat(), outset.toFloat())
    val scale = if (member.width > 0) rect.width() / member.width else 1f
    val radius = min(s.cornerRadius * s.density * scale, min(rect.width(), rect.height()) / 2f)
    return MergedGlassShape(
      left = rect.left,
      top = rect.top,
      width = rect.width(),
      height = rect.height(),
      radius = radius.coerceAtLeast(0f),
      tint = s.tintColor,
      dark = darkFor(s.colorScheme),
      clear = s.glassStyle == "clear",
      pressed = s.interactive && s.pressed,
    )
  }
}

@ReactModule(name = LiquidGlassContainerViewManager.NAME)
class LiquidGlassContainerViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    LiquidGlassContainerView(context)

  /** iOS: where glass starts blending. Android 13+: glass closer than this melts together. */
  @ReactProp(name = "spacing", defaultFloat = 0f)
  fun setSpacing(view: ReactViewGroup, value: Float) {
    (view as? LiquidGlassContainerView)?.state?.spacing = value
  }

  companion object {
    const val NAME = "RNLiquidGlassContainerView"
  }
}
