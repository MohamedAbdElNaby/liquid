package com.mohamedabdelnaby.reactnativeliquid

import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.min

/**
 * Tracks the glass views on screen so backdrops can draw them as flat material instead of
 * rendering their live glass (which would sample other glass, recursively).
 */
internal object GlassRegistry {

  private val glassViews: MutableSet<View> = Collections.newSetFromMap(WeakHashMap())
  private val ancestors: MutableSet<View> = Collections.newSetFromMap(WeakHashMap())
  private var ancestorsFrame = -1L
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

  fun register(view: View) {
    glassViews.add(view)
    ancestorsFrame = -1L
  }

  fun unregister(view: View) {
    glassViews.remove(view)
    ancestorsFrame = -1L
  }

  fun isGlass(view: View): Boolean = view in glassViews

  /** Whether [view] contains a glass view, computed once per frame. */
  fun containsGlass(view: View): Boolean {
    val frame = AnimationUtils.currentAnimationTimeMillis()
    if (frame != ancestorsFrame) {
      ancestorsFrame = frame
      ancestors.clear()
      for (glass in glassViews) {
        if (!glass.isAttachedToWindow) continue
        var parent = glass.parent
        while (parent is View && ancestors.add(parent)) {
          parent = parent.parent
        }
      }
    }
    return view in ancestors
  }

  /** Whether [child] is the private glass surface of [parent] rather than React content. */
  fun isGlassSurface(parent: ViewGroup, child: View): Boolean = when (parent) {
    is LiquidGlassView -> parent.indexOfChild(child) < LiquidGlassView.RESERVED_CHILDREN
    is LiquidComposeHost -> {
      val index = parent.indexOfChild(child)
      index < parent.leading || index >= parent.childCount - parent.trailing
    }
    else -> false
  }

  /** Draws a flat stand-in for the glass surface of [glass]. */
  fun drawSurface(glass: ViewGroup, canvas: Canvas) {
    if (glass !is LiquidGlassView) {
      // Native controls draw their own track and thumb; nothing to approximate.
      return
    }
    val state = glass.glassState
    val dark = when (state.colorScheme) {
      "dark" -> true
      "light" -> false
      else -> (glass.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
        Configuration.UI_MODE_NIGHT_YES
    }
    val clear = state.glassStyle == "clear"
    paint.color = state.tintColor
      // The same tint as the glass surface itself (LiquidGlassSurface), so a lens over this glass
      // does not see a darker or lighter copy of it.
      ?: if (dark) Color.argb(if (clear) 31 else 97, 28, 28, 30)
      else Color.argb(if (clear) 20 else 82, 255, 255, 255)
    val radius = min(state.cornerRadius * state.density, min(glass.width, glass.height) / 2f)
    val height = glass.height.toFloat()
    val fade = state.fadeBottom * state.density
    // Glass that melts into the content (fadeBottom) fades out here too, so
    // glass over it still sees the content under the faded part.
    paint.shader = if (fade > 0f && height > 0f) {
      val start = (height - fade).coerceAtLeast(0f)
      android.graphics.LinearGradient(
        0f, start, 0f, height,
        paint.color, paint.color and 0x00FFFFFF,
        android.graphics.Shader.TileMode.CLAMP,
      )
    } else {
      null
    }
    canvas.drawRoundRect(0f, 0f, glass.width.toFloat(), height, radius, radius, paint)
    paint.shader = null
  }
}
