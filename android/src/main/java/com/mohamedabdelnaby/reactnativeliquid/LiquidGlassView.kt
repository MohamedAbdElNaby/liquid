package com.mohamedabdelnaby.reactnativeliquid

import android.content.Context
import android.os.Build
import android.view.MotionEvent
import android.view.View
import android.view.ViewTreeObserver
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.views.view.ReactViewGroup
import com.kyant.backdrop.Backdrop
import com.kyant.backdrop.backdrops.emptyBackdrop

/**
 * A React view group that draws a Liquid Glass surface (AndroidLiquidGlass by Kyant0) behind its
 * React children.
 *
 * The surface lives in a [ComposeView] kept at child index 0. The view manager offsets every
 * React child index by [RESERVED_CHILDREN] so React never sees it.
 */
class LiquidGlassView(context: Context) : ReactViewGroup(context) {

  internal val glassState = GlassState().apply { density = resources.displayMetrics.density }

  private val viewTreeBackdrop: ViewTreeBackdrop? =
    if (isGlassEffectSupported) ViewTreeBackdrop(this) else null

  private val backdrop: Backdrop = viewTreeBackdrop ?: emptyBackdrop()

  private val lifecycleOwner = GlassLifecycleOwner()

  private val composeView = ComposeView(context).apply {
    lifecycleOwner.install(this)
    // The composition lives as long as the React view, see [GlassLifecycleOwner].
    setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
    clipChildren = false
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    setContent { LiquidGlassSurface(glassState, backdrop) }
  }

  private var observedViewTree: ViewTreeObserver? = null

  private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
    viewTreeBackdrop?.record()
    true
  }

  init {
    clipChildren = false
    addView(composeView, 0)
    composeView.addOnAttachStateChangeListener(object : OnAttachStateChangeListener {
      override fun onViewAttachedToWindow(view: View) = layoutComposeView()

      override fun onViewDetachedFromWindow(view: View) = Unit
    })
  }

  override fun onAttachedToWindow() {
    GlassRegistry.register(this)
    lifecycleOwner.onAttached()
    super.onAttachedToWindow()
    if (viewTreeBackdrop != null) {
      observedViewTree = viewTreeObserver.also { it.addOnPreDrawListener(preDrawListener) }
    }
  }

  override fun onDetachedFromWindow() {
    observedViewTree?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDrawListener)
    observedViewTree = null
    super.onDetachedFromWindow()
    lifecycleOwner.onDetached()
  }

  // Last frame in the parent, used to morph from it.
  private var lastFrame: android.graphics.Rect? = null

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    val previous = lastFrame
    if (glassState.morph && previous != null && isAttachedToWindow &&
      (previous.left != left || previous.top != top || previous.right != right || previous.bottom != bottom)
    ) {
      glassState.morphFrom = android.graphics.RectF(
        (previous.left - left).toFloat(),
        (previous.top - top).toFloat(),
        (previous.right - left).toFloat(),
        (previous.bottom - top).toFloat(),
      )
      glassState.morphGeneration++
      fadeInContent()
    }
    lastFrame = android.graphics.Rect(left, top, right, bottom)
    layoutComposeView()
  }

  /** The React content jumps to its new layout, so fade it in while the glass morphs. */
  private fun fadeInContent() {
    for (i in RESERVED_CHILDREN until childCount) {
      val child = getChildAt(i) ?: continue
      val alpha = child.alpha
      child.alpha = 0f
      child.animate().alpha(alpha).setStartDelay(120).setDuration(300).start()
    }
  }

  private var layoutPosted = false

  /** React views ignore layout requests; the morphing glass needs them while it animates. */
  override fun requestLayout() {
    super.requestLayout()
    // `layoutPosted` is a primitive, valid even when the base constructor calls this.
    if (!layoutPosted && childCount > 0) {
      layoutPosted = true
      postOnAnimation {
        layoutPosted = false
        layoutComposeView()
      }
    }
  }

  /**
   * React lays out its own children; the ComposeView is ours to size. Fabric can lay views out
   * before they are attached, and a ComposeView can only be measured once it has a window, so
   * this also runs when the ComposeView gets attached.
   */
  private fun layoutComposeView() {
    glassState.widthPx = width
    glassState.heightPx = height
    if (!composeView.isAttachedToWindow) {
      return
    }
    composeView.measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    composeView.layout(0, 0, width, height)
  }

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    if (!glassState.interactive) {
      return super.dispatchTouchEvent(ev)
    }
    // Track the press for the interactive effect. JS touch handling happens in the root view, so
    // claiming an otherwise unhandled gesture only makes sure the release reaches this view.
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> glassState.pressed = true
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> glassState.pressed = false
    }
    val handled = super.dispatchTouchEvent(ev)
    return handled || ev.actionMasked == MotionEvent.ACTION_DOWN
  }

  /** Releases the composition and the backdrop. Called when React drops the view. */
  fun dispose() {
    GlassRegistry.unregister(this)
    lifecycleOwner.destroy()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      viewTreeBackdrop?.discard()
    }
  }

  companion object {
    const val RESERVED_CHILDREN = 1
  }
}
