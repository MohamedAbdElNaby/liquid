package com.mohamedabdelnaby.reactnativeliquid

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.os.SystemClock
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import android.view.ViewTreeObserver
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.emptyBackdrop

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
      // Written before the compose view is measured below, so the first frame at the new size
      // already starts from the old shape.
      glassState.morphLeft = (previous.left - left).toFloat()
      glassState.morphTop = (previous.top - top).toFloat()
      glassState.morphRight = (previous.right - right).toFloat()
      glassState.morphBottom = (previous.bottom - bottom).toFloat()
      glassState.morphGeneration++
      // A content swap animates itself (see onViewAdded); only fade a plain relayout.
      if (SystemClock.uptimeMillis() - contentSwappedAt > 100) {
        fadeInContent()
      }
    }
    lastFrame = android.graphics.Rect(left, top, right, bottom)
    layoutComposeView()
  }

  // The opacity React gave each child, kept while our fades run: reading `alpha` mid-fade would
  // pick up a partial value, and the next fade would end there, leaving the content faded.
  private val contentAlpha = java.util.WeakHashMap<View, Float>()

  /** The React content jumps to its new layout, so fade it in while the glass morphs. */
  private fun fadeInContent() {
    for (i in RESERVED_CHILDREN until childCount) {
      val child = getChildAt(i) ?: continue
      val target = contentAlpha.getOrPut(child) { child.alpha }
      child.animate().cancel()
      child.alpha = 0f
      child.animate().alpha(target).setStartDelay(120).setDuration(300)
        .withEndAction { contentAlpha.remove(child) }
        .start()
    }
  }

  // When React last swapped this morphing view's content, see onViewAdded.
  private var contentSwappedAt = 0L

  /** Content changes animate only on a morphing view that is already on screen. */
  private val animatesContentChanges: Boolean
    get() = glassState.morph && isAttachedToWindow && lastFrame != null

  /** New content sharpens and grows into place, like iOS 26. */
  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    if (child === composeView || !animatesContentChanges) {
      return
    }
    contentSwappedAt = SystemClock.uptimeMillis()
    val target = contentAlpha.getOrPut(child) { child.alpha }
    child.alpha = 0f
    child.scaleX = 0.85f
    child.scaleY = 0.85f
    child.animate().alpha(target).scaleX(1f).scaleY(1f).setStartDelay(60).setDuration(380)
      .withEndAction { contentAlpha.remove(child) }
      .start()
    animateBlur(child, from = CONTENT_BLUR_DP, to = 0f, durationMs = 380) {}
  }

  /** Old content blurs away. It keeps drawing while it animates, then is let go. */
  override fun removeViewAt(index: Int) {
    val child = getChildAt(index)
    if (child == null || child === composeView || !animatesContentChanges) {
      super.removeViewAt(index)
      return
    }
    contentSwappedAt = SystemClock.uptimeMillis()
    startViewTransition(child)
    super.removeViewAt(index)
    child.animate().alpha(0f).scaleX(0.85f).scaleY(0.85f).setStartDelay(0).setDuration(260)
      .withEndAction {
        endViewTransition(child)
        child.alpha = 1f
        child.scaleX = 1f
        child.scaleY = 1f
      }
      .start()
    animateBlur(child, from = 0f, to = CONTENT_BLUR_DP, durationMs = 260) {}
  }

  /** Animates a gaussian blur on [view] (Android 12+). */
  private fun animateBlur(view: View, from: Float, to: Float, durationMs: Long, end: () -> Unit) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return
    }
    val density = resources.displayMetrics.density
    ValueAnimator.ofFloat(from, to).apply {
      duration = durationMs
      addUpdateListener {
        val radius = (it.animatedValue as Float) * density
        view.setRenderEffect(
          if (radius < 0.5f) null else RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.DECAL),
        )
      }
      doOnEnd {
        if (to == 0f) view.setRenderEffect(null)
        end()
      }
      start()
    }
  }

  private fun ValueAnimator.doOnEnd(action: () -> Unit) {
    addListener(object : android.animation.AnimatorListenerAdapter() {
      override fun onAnimationEnd(animation: android.animation.Animator) = action()
    })
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
      MotionEvent.ACTION_DOWN -> {
        glassState.pressed = true
        press(true)
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        glassState.pressed = false
        press(false)
      }
    }
    val handled = super.dispatchTouchEvent(ev)
    return handled || ev.actionMasked == MotionEvent.ACTION_DOWN
  }

  // Interactive glass swells while pressed and bounces back on release, like iOS 26. The press
  // scale multiplies the scale React sets, so transforms from JS keep working.
  private var baseScaleX = 1f
  private var baseScaleY = 1f
  // Created on first use: the base constructor can set the scale before fields exist.
  private var pressSpringOrNull: LiquidSpring? = null
  private val pressSpring: LiquidSpring
    get() = pressSpringOrNull ?: LiquidSpring(0.7f, 520f, 0.0005f).apply { snap(1f) }.also { pressSpringOrNull = it }
  private var pressFrameTime = 0L
  private var pressScheduled = false

  override fun setScaleX(scaleX: Float) {
    baseScaleX = scaleX
    super.setScaleX(scaleX * pressScale())
  }

  override fun setScaleY(scaleY: Float) {
    baseScaleY = scaleY
    super.setScaleY(scaleY * pressScale())
  }

  private fun pressScale(): Float = pressSpringOrNull?.value ?: 1f

  private fun press(down: Boolean) {
    val size = maxOf(width, height).coerceAtLeast(1)
    // Small buttons swell the most: a 44 dp circle to about 1.45, a wide field barely.
    val grow = minOf(0.45f, 20f * resources.displayMetrics.density / size)
    if (down) {
      // Matches iOS 26: the glass takes about 0.3 s to swell.
      pressSpring.dampingRatio = 0.82f
      pressSpring.stiffness = 170f
      pressSpring.target = 1f + grow
    } else {
      // Underdamped, so it dips below its size and wobbles back like a drop.
      pressSpring.dampingRatio = 0.5f
      pressSpring.stiffness = 210f
      pressSpring.target = 1f
    }
    if (!pressScheduled) {
      pressScheduled = true
      pressFrameTime = 0L
      Choreographer.getInstance().postFrameCallback(pressFrame)
    }
  }

  private val pressFrame: Choreographer.FrameCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      val dt = if (pressFrameTime == 0L) 1f / 60f else ((frameTimeNanos - pressFrameTime) / 1e9f).coerceIn(1f / 240f, 1f / 30f)
      pressFrameTime = frameTimeNanos
      val moving = pressSpring.step(dt)
      super@LiquidGlassView.setScaleX(baseScaleX * pressSpring.value)
      super@LiquidGlassView.setScaleY(baseScaleY * pressSpring.value)
      if (moving) {
        Choreographer.getInstance().postFrameCallback(this)
      } else {
        pressScheduled = false
      }
    }
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
    /** Blur radius of content as it blurs out and in during a morph, in dp. */
    private const val CONTENT_BLUR_DP = 8f
  }
}
