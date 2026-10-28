package com.mohamedabdelnaby.reactnativeliquid

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.view.ViewGroup
import android.os.Build
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewTreeObserver
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.emptyBackdrop
import kotlin.math.abs

/**
 * A React view group that renders Jetpack Compose glass around its React children.
 *
 * Compose views are private children: [leading] ones are drawn below the React children,
 * [trailing] ones above them. [LiquidComposeHostManager] hides them from React by offsetting
 * child indices.
 */
abstract class LiquidComposeHost(context: Context) : ReactViewGroup(context) {

  private val lifecycleOwner = GlassLifecycleOwner()
  private val composeViews = ArrayList<ComposeView>()
  // What is laid out over the host: the ComposeViews, or the frames wrapping them.
  private val hostedViews = ArrayList<View>()
  // Primitive so it is valid (0) when the base constructor already calls requestLayout().
  private var composeViewCount = 0
  private val backdrops = ArrayList<ViewTreeBackdrop>()
  private var observedViewTree: ViewTreeObserver? = null

  internal var leading = 0
    private set
  internal var trailing = 0
    private set

  private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
    for (backdrop in backdrops) {
      backdrop.record()
    }
    true
  }

  init {
    clipChildren = false
  }

  /**
   * Adds a ComposeView below ([above] = false) or above the React children. With
   * [touchableReactChildrenBelow], React never picks the ComposeView as a touch target, so JS
   * touchables under it (like buttons next to a search field) still get their presses; Compose
   * gets the native touches it handles either way.
   */
  protected fun addComposeView(
    above: Boolean = false,
    touchableReactChildrenBelow: Boolean = false,
    content: @Composable () -> Unit,
  ): ComposeView {
    val view = ComposeView(context).apply {
      lifecycleOwner.install(this)
      setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
      clipChildren = false
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
      setContent(content)
      addOnAttachStateChangeListener(object : OnAttachStateChangeListener {
        override fun onViewAttachedToWindow(view: View) = layoutComposeViews()

        override fun onViewDetachedFromWindow(view: View) = Unit
      })
    }
    val hosted: View = if (touchableReactChildrenBelow) {
      NoReactTouchFrame(context).apply {
        clipChildren = false
        addView(view, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
      }
    } else {
      view
    }
    if (above) {
      addView(hosted)
      trailing++
    } else {
      addView(hosted, leading)
      leading++
    }
    composeViews.add(view)
    hostedViews.add(hosted)
    composeViewCount++
    return view
  }

  /**
   * A backdrop that samples what is drawn behind [target], refreshed before every frame.
   * Falls back to an empty backdrop where RenderEffect is not available.
   */
  internal fun createBackdrop(
    target: View,
    coordinatesDependent: Boolean = true,
    magnification: () -> Float = { 1f },
    enabled: () -> Boolean = { true },
    childPaint: (parent: ViewGroup, child: View) -> Paint? = { _, _ -> null },
    drawChildContent: (parent: ViewGroup, child: View, canvas: Canvas) -> Boolean = { _, _, _ -> false },
  ): Backdrop {
    if (!isGlassEffectSupported) {
      return emptyBackdrop()
    }
    return ViewTreeBackdrop(target, coordinatesDependent, magnification, enabled, childPaint, drawChildContent)
      .also { backdrops.add(it) }
  }

  override fun onAttachedToWindow() {
    GlassRegistry.register(this)
    lifecycleOwner.onAttached()
    super.onAttachedToWindow()
    if (backdrops.isNotEmpty()) {
      observedViewTree = viewTreeObserver.also { it.addOnPreDrawListener(preDrawListener) }
    }
  }

  override fun onDetachedFromWindow() {
    observedViewTree?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDrawListener)
    observedViewTree = null
    super.onDetachedFromWindow()
    lifecycleOwner.onDetached()
  }

  private var layoutPosted = false
  private val layoutRunnable = Runnable {
    layoutPosted = false
    layoutComposeViews()
    // Compose lays out and places its content while drawing; make sure that draw happens.
    for (view in composeViews) {
      view.invalidate()
      (view.getChildAt(0) as? View)?.invalidate()
    }
  }

  /**
   * React views ignore layout requests because React lays them out. Compose content (menus,
   * search morphs) requests layouts while it animates, so those are handled here.
   */
  override fun requestLayout() {
    super.requestLayout()
    if (!layoutPosted && composeViewCount > 0) {
      layoutPosted = true
      postOnAnimation(layoutRunnable)
    }
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    layoutComposeViews()
  }

  /** React lays out its own children; the ComposeViews are ours to size (once attached). */
  private fun layoutComposeViews() {
    for (view in hostedViews) {
      if (!view.isAttachedToWindow) {
        continue
      }
      view.measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
      )
      view.layout(0, 0, width, height)
    }
    onSizeChanged()
  }

  /**
   * Set by horizontal controls (slider, switch): they keep horizontal drags from the parent
   * scroll view, while vertical drags still scroll it.
   */
  protected var claimsHorizontalDrags = false
  private var downX = 0f
  private var downY = 0f
  private var dragDecided = false

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    if (claimsHorizontalDrags) {
      when (ev.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downX = ev.x
          downY = ev.y
          dragDecided = false
          parent?.requestDisallowInterceptTouchEvent(true)
        }
        MotionEvent.ACTION_MOVE -> if (!dragDecided) {
          val dx = abs(ev.x - downX)
          val dy = abs(ev.y - downY)
          val slop = ViewConfiguration.get(context).scaledTouchSlop
          if (dx > slop || dy > slop) {
            dragDecided = true
            // A mostly vertical drag belongs to the scroll view.
            if (dy > dx) {
              parent?.requestDisallowInterceptTouchEvent(false)
            }
          }
        }
      }
    }
    return super.dispatchTouchEvent(ev)
  }

  /** Called after the host was laid out. */
  protected open fun onSizeChanged() = Unit

  /** Releases compositions and backdrops. Called when React drops the view. */
  open fun dispose() {
    GlassRegistry.unregister(this)
    lifecycleOwner.destroy()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      backdrops.forEach { it.discard() }
    }
  }
}

/** View manager for [LiquidComposeHost]s: hides the private Compose children from React. */
abstract class LiquidComposeHostManager : ReactViewManager() {

  abstract override fun createViewInstance(context: ThemedReactContext): ReactViewGroup

  override fun onDropViewInstance(view: ReactViewGroup) {
    (view as? LiquidComposeHost)?.dispose()
    super.onDropViewInstance(view)
  }

  override fun addView(parent: ReactViewGroup, child: View, index: Int) {
    parent.addView(child, index + leading(parent))
  }

  override fun getChildCount(parent: ReactViewGroup): Int =
    parent.childCount - leading(parent) - trailing(parent)

  override fun getChildAt(parent: ReactViewGroup, index: Int): View? =
    parent.getChildAt(index + leading(parent))

  override fun removeViewAt(parent: ReactViewGroup, index: Int) {
    parent.removeViewAt(index + leading(parent))
  }

  override fun removeAllViews(parent: ReactViewGroup) {
    while (getChildCount(parent) > 0) {
      removeViewAt(parent, 0)
    }
  }

  override fun setRemoveClippedSubviews(view: ReactViewGroup, removeClippedSubviews: Boolean) = Unit

  private fun leading(parent: ReactViewGroup) = (parent as? LiquidComposeHost)?.leading ?: 0

  private fun trailing(parent: ReactViewGroup) = (parent as? LiquidComposeHost)?.trailing ?: 0
}

@Composable
internal fun isDarkScheme(colorScheme: String): Boolean = when (colorScheme) {
  "dark" -> true
  "light" -> false
  else -> isSystemInDarkTheme()
}

/** Holds a ComposeView that React's touch targeting skips (see addComposeView). */
private class NoReactTouchFrame(context: Context) :
  android.widget.FrameLayout(context),
  com.facebook.react.uimanager.ReactPointerEventsView {
  override val pointerEvents: com.facebook.react.uimanager.PointerEvents
    get() = com.facebook.react.uimanager.PointerEvents.NONE
}
