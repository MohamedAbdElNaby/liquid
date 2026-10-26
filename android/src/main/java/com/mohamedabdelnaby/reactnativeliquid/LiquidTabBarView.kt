package com.mohamedabdelnaby.reactnativeliquid

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import android.view.MotionEvent
import android.view.ViewConfiguration
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.Snapshot
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.kyant.backdrop.Backdrop
import com.kyant.backdrop.drawBackdrop
import com.kyant.backdrop.effects.blur
import com.kyant.backdrop.effects.lens
import com.kyant.backdrop.effects.vibrancy
import com.kyant.backdrop.highlight.Highlight
import com.kyant.backdrop.shadow.InnerShadow
import com.kyant.backdrop.shadow.Shadow
import kotlin.math.abs
import kotlin.math.roundToInt

private const val INSET_DP = 4f
/** Scale of the lens while lifted, relative to the resting pill. */
// The lifted lens is an elliptical drop, wider than the pill.
private const val PRESSED_SCALE_X = 1.3f
private const val PRESSED_SCALE_Y = 1.14f
/** Spring stiffness of the drop melting back into the pill. */
private const val SETTLE_STIFFNESS = 1100f

/** Spring stiffness of the lens travelling to a tapped tab, and following a finger. */
private const val TAP_TRAVEL_STIFFNESS = 330f
private const val DRAG_STIFFNESS = 1000f
/** Extra scale of every tab while the lens is lifted. */
private const val TAB_LIFT_SCALE = 0f
/** Extra scale of the tab under the lens. */
private const val TAB_MAGNIFICATION = 0.12f
/**
 * How many rendered frames the lens stays lifted over its tab before settling. Counted in frames,
 * so a main-thread stall (mounting the new screen) doesn't use up the hold.
 */
private const val HOLD_FRAMES = 1

/**
 * How close (in tabs) the lens must be to its tab to count as arrived. Loose, so the drop starts
 * melting as it lands instead of crawling the last bit lifted.
 */
private const val ARRIVE_DISTANCE = 0.08f
/** How far (in tabs) the lens can be pulled past the first and last tab. */
private const val MAX_OVERSHOOT = 0.35f
/** How much of the overshoot stretches the bar, in tab widths. */
private const val BAR_STRETCH = 0.45f

@Stable
internal class TabBarState {
  var glassStyle by mutableStateOf("regular")
  var backdropBlur by mutableStateOf(0f)
  var tintColor by mutableStateOf<Int?>(null)
  var selectionColor by mutableStateOf<Int?>(null)
  var focusedTintColor by mutableStateOf<Int?>(null)
  var lensTintColor by mutableStateOf<Int?>(null)
  var colorScheme by mutableStateOf("system")
  var lensEnabled by mutableStateOf(true)
  var tabCount by mutableIntStateOf(1)
  var widthPx by mutableIntStateOf(0)
  var heightPx by mutableIntStateOf(0)

  // Animated values, written once per frame by the physics loop.
  /** Position of the lens, in tabs. */
  var value by mutableFloatStateOf(0f)
  /** 0 when resting as the pill, 1 when lifted. */
  var press by mutableFloatStateOf(0f)
  var scaleX by mutableFloatStateOf(1f)
  var scaleY by mutableFloatStateOf(1f)
  /** Speed of the lens in tabs per second. */
  var velocity by mutableFloatStateOf(0f)
  /** How far the bar stretches toward the finger past its ends, in px (negative = left). */
  var stretch by mutableFloatStateOf(0f)
}

/**
 * Liquid Glass tab bar. React children are the tab items. Compose draws the bar glass and the
 * resting pill below the items and a clear glass lens above them. Pressing lifts the lens out of
 * the pill; it follows the finger with spring physics, stretches with its speed, magnifies the
 * tabs and settles into the pill on release.
 */
@SuppressLint("ViewConstructor")
class LiquidTabBarView(context: Context) : LiquidComposeHost(context) {

  internal val state = TabBarState()

  private val value = LiquidSpring(1f, 1000f, 0.001f)
  private val press = LiquidSpring(1f, 1000f, 0.001f)
  // Near-critical damping: the lens grows and shrinks without wobbling.
  private val scaleX = LiquidSpring(0.85f, 420f, 0.001f)
  private val scaleY = LiquidSpring(0.9f, 420f, 0.001f)
  // A slow, well-damped velocity spring makes the drop heavy: it deforms gradually.
  private val velocity = LiquidSpring(0.95f, 45f, 0.01f)

  private var selectedIndex = 0
  // Set once a pager drives the bar (top tabs): tab changes then glide the pill.
  private var followsPager = false
  // After a tap the pager is still scrolling to the new page; ignore its position until it gets
  // there so the pill doesn't jump back.
  private var awaitingIndex = -1
  // Tab chosen on release, reported right away (see flushPendingSelect).
  private var pendingSelect = -1
  private var awaitingSince = 0L
  private var hasSelection = false
  private var touching = false
  // Set once the finger moves: the lens then follows it instead of snapping to tabs.
  private var dragging = false
  private var releasePending = false
  private var animating = false
  private var lastFrameNanos = 0L
  private var previousValue = 0f
  // Frames rendered since the lens arrived over its tab after release, -1 while travelling.
  private var arrivedFrames = -1
  private var downX = 0f
  private var longPressed = false

  private val density = resources.displayMetrics.density
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private val handler = Handler(Looper.getMainLooper())

  private val tintPaint = Paint()
  private var tintPaintColor: Int? = null

  private fun focusedPaint(): Paint? {
    val color = state.focusedTintColor ?: return null
    if (tintPaintColor != color) {
      tintPaintColor = color
      tintPaint.colorFilter = PorterDuffColorFilter(color, PorterDuff.Mode.SRC_IN)
    }
    return tintPaint
  }

  private val frameCallback = Choreographer.FrameCallback { frameTimeNanos -> onFrame(frameTimeNanos) }

  private val longPressRunnable = Runnable {
    longPressed = true
    val index = indexFor(downX)
    dispatchLiquidEvent("TabLongPress") { putInt("index", index) }
  }

  init {
    scaleX.snap(1f)
    scaleY.snap(1f)

    val barBackdrop = createBackdrop(this)
    addComposeView { TabBarBackground(state, barBackdrop) }

    lateinit var lensBackdrop: Backdrop
    val lensView = addComposeView(above = true) { TabBarLens(state, lensBackdrop) }
    lensBackdrop = createBackdrop(
      target = lensView,
      magnification = { 1f + 0.05f * state.press },
      enabled = { state.lensEnabled && state.press > 0.01f },
      // Tab content seen through the lens takes the focused color, like iOS 26.
      childPaint = { parent, child ->
        if (parent === this && !GlassRegistry.isGlassSurface(this, child)) focusedPaint() else null
      },
    )
  }

  // Number of React tab items.
  private val tabCount: Int
    get() = (childCount - leading - trailing).coerceAtLeast(1)

  private val tabWidth: Float
    get() = (width - INSET_DP * density * 2) / tabCount

  /** Lens position under [x], rubber-banded past the first and last tab. */
  private fun positionFor(x: Float): Float {
    val last = (tabCount - 1).toFloat()
    val raw = (x - INSET_DP * density) / tabWidth - 0.5f
    return when {
      raw < 0f -> -rubberBand(-raw)
      raw > last -> last + rubberBand(raw - last)
      else -> raw
    }
  }

  private fun rubberBand(excess: Float): Float = MAX_OVERSHOOT * excess / (excess + 1f)

  private fun indexFor(x: Float): Int = positionFor(x).roundToInt().coerceIn(0, tabCount - 1)

  /** Follows a pager's scroll position, e.g. for top tabs. Negative values are ignored. */
  internal fun setPagerPosition(position: Float) {
    if (position < 0f) {
      return
    }
    followsPager = true
    if (awaitingIndex >= 0) {
      val timedOut = android.os.SystemClock.uptimeMillis() - awaitingSince > 1000L
      if (!timedOut && abs(position - awaitingIndex) > 0.01f) {
        return
      }
      awaitingIndex = -1
    }
    if (touching || releasePending || press.target > 0f) {
      return
    }
    value.snap(position)
    render()
  }

  internal fun setSelectedIndex(index: Int) {
    if (hasSelection && index == selectedIndex) {
      return
    }
    // Already there, e.g. after following a pager: no need to lift the lens.
    val animated = hasSelection && isAttachedToWindow && abs(value.value - index) > 0.05f
    hasSelection = true
    selectedIndex = index
    if (touching) {
      return
    }
    if (animated && followsPager) {
      // The pager already moved the pill most of the way; glide the rest.
      value.target = index.toFloat()
      startAnimating()
    } else if (animated) {
      // Lift the lens while it travels to the new tab.
      value.stiffness = TAP_TRAVEL_STIFFNESS
      lift()
      value.target = index.toFloat()
      releasePending = true
      startAnimating()
    } else {
      value.snap(index.toFloat())
      render()
    }
  }

  override fun onSizeChanged() {
    render()
  }

  // Touches

  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean = true

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        touching = true
        releasePending = false
        longPressed = false
        downX = event.x
        dragging = false
        lift()
        // A tap glides straight to the tab under the finger.
        value.stiffness = TAP_TRAVEL_STIFFNESS
        value.target = indexFor(event.x).toFloat()
        startAnimating()
        handler.postDelayed(longPressRunnable, ViewConfiguration.getLongPressTimeout().toLong())
      }
      MotionEvent.ACTION_MOVE -> {
        if (abs(event.x - downX) > touchSlop) {
          handler.removeCallbacks(longPressRunnable)
          if (!dragging) {
            value.stiffness = DRAG_STIFFNESS
          }
          dragging = true
        }
        value.target = if (dragging) positionFor(event.x) else indexFor(event.x).toFloat()
        startAnimating()
      }
      MotionEvent.ACTION_UP -> {
        handler.removeCallbacks(longPressRunnable)
        touching = false
        val index = indexFor(event.x)
        value.target = index.toFloat()
        releasePending = true
        startAnimating()
        if (!longPressed) {
          pendingSelect = index
          // Navigate right away: React renders the new screen while the lens is still travelling.
          flushPendingSelect()
        }
      }
      MotionEvent.ACTION_CANCEL -> {
        handler.removeCallbacks(longPressRunnable)
        touching = false
        pendingSelect = -1
        value.target = selectedIndex.toFloat()
        releasePending = true
        startAnimating()
      }
    }
    return true
  }

  /**
   * Reports the tab chosen on release, as soon as the finger lifts, so the screen switches without
   * waiting for the lens to finish travelling.
   */
  private fun flushPendingSelect() {
    val index = pendingSelect
    if (index < 0) {
      return
    }
    pendingSelect = -1
    if (followsPager && index != selectedIndex) {
      awaitingIndex = index
      awaitingSince = android.os.SystemClock.uptimeMillis()
    }
    dispatchLiquidEvent("TabSelect") { putInt("index", index) }
  }

  // Physics

  private fun lift() {
    // Lift quickly, settle a little softer, like the iOS bar.
    press.stiffness = 1400f
    scaleX.stiffness = 600f
    scaleY.stiffness = 600f
    press.target = 1f
    scaleX.target = PRESSED_SCALE_X
    scaleY.target = PRESSED_SCALE_Y
  }

  private fun settle() {
    // The lens shrinks to the pill with the same spring that fades it, so it melts into the pill.
    press.stiffness = SETTLE_STIFFNESS
    scaleX.stiffness = SETTLE_STIFFNESS
    scaleY.stiffness = SETTLE_STIFFNESS
    press.target = 0f
    scaleX.target = 1f
    scaleY.target = 1f
  }

  private fun startAnimating() {
    if (!animating) {
      animating = true
      lastFrameNanos = 0L
      previousValue = value.value
      Choreographer.getInstance().postFrameCallback(frameCallback)
    }
  }

  private fun onFrame(frameTimeNanos: Long) {
    val dt = if (lastFrameNanos == 0L) 1f / 60f
    else ((frameTimeNanos - lastFrameNanos) / 1e9f).coerceIn(1f / 240f, 1f / 30f)
    lastFrameNanos = frameTimeNanos

    var moving = value.step(dt)
    velocity.target = (value.value - previousValue) / dt
    previousValue = value.value
    moving = velocity.step(dt) || moving

    // The lens only settles once it is close to its tab.
    // The lens arrives, stays lifted for a moment, then settles into the pill.
    if (releasePending && abs(value.value - value.target) < ARRIVE_DISTANCE) {
      if (arrivedFrames < 0) {
        arrivedFrames = 0
        flushPendingSelect()
      } else if (++arrivedFrames >= HOLD_FRAMES) {
        releasePending = false
        arrivedFrames = -1
        settle()
      }
    } else {
      arrivedFrames = -1
    }

    moving = press.step(dt) || moving
    moving = scaleX.step(dt) || moving
    moving = scaleY.step(dt) || moving

    render()

    if (moving || touching || releasePending) {
      Choreographer.getInstance().postFrameCallback(frameCallback)
    } else {
      animating = false
    }
  }

  private fun render() {
    state.tabCount = tabCount
    state.widthPx = width
    state.heightPx = height
    state.value = value.value
    state.press = press.value.coerceIn(0f, 1f)
    state.scaleX = scaleX.value
    state.scaleY = scaleY.value
    state.velocity = velocity.value
    val overshoot = value.value - value.value.coerceIn(0f, (tabCount - 1).toFloat())
    state.stretch = overshoot * tabWidth * BAR_STRETCH
    // Redraw the glass in this frame instead of the next one.
    Snapshot.sendApplyNotifications()

    // Lift every tab a little and magnify the one under the lens.
    val lift = state.press
    val clamped = value.value.coerceIn(0f, (tabCount - 1).toFloat())
    for (i in 0 until tabCount) {
      val item = getChildAt(leading + i) ?: continue
      val proximity = (1f - abs(clamped - i)).coerceAtLeast(0f)
      val scale = 1f + (TAB_LIFT_SCALE + TAB_MAGNIFICATION * proximity) * lift
      item.scaleX = scale
      item.scaleY = scale
    }
  }

  override fun dispose() {
    Choreographer.getInstance().removeFrameCallback(frameCallback)
    handler.removeCallbacks(longPressRunnable)
    super.dispose()
  }
}

/** The bar glass and the resting selection pill, drawn below the tab items. */
@Composable
private fun TabBarBackground(state: TabBarState, backdrop: Backdrop) {
  val dark = isDarkScheme(state.colorScheme)
  val capsule = RoundedCornerShape(percent = 50)
  // Dark glass stays a visible gray even over black content, like iOS, so the darker pill shows.
  val containerColor = if (dark) Color(0xFF2C2C2E).copy(0.62f) else Color(0xFFFAFAFA).copy(0.4f)
  val pillColor = state.selectionColor?.let { Color(it) }
    ?: if (dark) Color.White.copy(0.12f) else Color.Black.copy(0.08f)
  val density = LocalDensity.current
  val inset = with(density) { INSET_DP.dp.toPx() }

  Box(
    Modifier
      .fillMaxSize()
      .drawBackdrop(
        backdrop = backdrop,
        shape = { capsule },
        effects = {
          vibrancy()
          val blurDp = if (state.glassStyle == "clear") 2f + 6f * state.backdropBlur else 8f
          blur(blurDp.dp.toPx())
          lens(24f.dp.toPx(), 24f.dp.toPx())
        },
        layerBlock = {
          // The bar grows slightly while pressed and stretches toward a finger pulled past its ends.
          val width = size.width.coerceAtLeast(1f)
          val scale = 1f + 6f.dp.toPx() / width * state.press
          scaleX = scale + abs(state.stretch) / width
          scaleY = scale
          translationX = state.stretch / 2f
        },
        onDrawSurface = {
          drawRect(if (state.glassStyle == "clear") containerColor.copy(alpha = 0.1f) else containerColor)
          state.tintColor?.let { argb ->
            val tint = Color(argb)
            // A neutral tint (white or gray frost) has no hue to give; it would only gray out the content.
            val neutral = maxOf(tint.red, tint.green, tint.blue) - minOf(tint.red, tint.green, tint.blue) < 0.05f
            if (!neutral) {
              drawRect(tint, blendMode = BlendMode.Hue)
            }
            drawRect(tint.copy(alpha = tint.alpha * 0.6f))
          }
        },
      )
      .drawBehind {
        // The pill fades out as the lens lifts off it.
        val tabWidth = (size.width - inset * 2) / state.tabCount
        val height = size.height - inset * 2
        val position = state.value.coerceIn(0f, (state.tabCount - 1).toFloat())
        drawRoundRect(
          color = pillColor.copy(alpha = pillColor.alpha * (1f - state.press)),
          topLeft = androidx.compose.ui.geometry.Offset(inset + position * tabWidth, inset),
          size = androidx.compose.ui.geometry.Size(tabWidth, height),
          cornerRadius = CornerRadius(height / 2f),
        )
      },
  )
}

/** The clear glass lens, drawn above the tab items so it refracts and magnifies them. */
@Composable
private fun TabBarLens(state: TabBarState, backdrop: Backdrop) {
  if (!state.lensEnabled || state.widthPx <= 0) {
    return
  }
  val density = LocalDensity.current
  val inset = INSET_DP * density.density
  val tabWidth = (state.widthPx - inset * 2) / state.tabCount
  val height = state.heightPx - inset * 2
  val capsule = RoundedCornerShape(percent = 50)

  // The ComposeView gives its root fixed constraints; the parent Box lets the lens be smaller.
  Box(Modifier.fillMaxSize()) {
  Box(
    Modifier
      // Moved in the draw phase so following the finger never waits for a layout pass.
      .graphicsLayer {
        translationX = inset + state.value * tabWidth
        translationY = inset
        // Fade with the press, eased so the lens melts into the pill instead of popping.
        // The drop stays fully glassy while it shrinks and only fades in the last part.
        alpha = (state.press * 1.25f).coerceAtMost(1f).let { p -> p * p * p * (p * (p * 6f - 15f) + 10f) }
        // Like liquid, the drop stretches along its motion and thins out while it travels.
        val stretch = (abs(state.velocity) / 10f * 0.24f).coerceAtMost(0.13f)
        scaleX = state.scaleX / (1f - stretch)
        scaleY = state.scaleY * (1f - stretch / 3f)
      }
      .size(with(density) { tabWidth.toDp() }, with(density) { height.toDp() })
      // Scaled by the layer above, so the drop keeps its capsule shape at every size.
      .clip(capsule)
      .drawBackdrop(
        backdrop = backdrop,
        shape = { capsule },
        effects = {
          // Refraction stays strong until the very end so the drop never looks blurry.
          val progress = kotlin.math.sqrt(state.press)
          // Light refraction, no color fringes: the rim bends the content without mirroring it.
          lens(8f.dp.toPx() * progress, 12f.dp.toPx() * progress)
        },
        highlight = { Highlight.Default.copy(width = 1.5.dp, alpha = (state.press * 2f).coerceAtMost(1f)) },
        shadow = null,
        innerShadow = { InnerShadow(radius = 8f.dp * state.press, alpha = state.press) },
        // A light fill gives the drop density while it stays see-through.
        onDrawSurface = {
          // Drawn in the drop's own shape so the fill never shows square corners.
          drawRoundRect(
            color = state.lensTintColor?.let { tint -> Color(tint).let { it.copy(alpha = it.alpha * state.press) } }
              ?: Color.White.copy(alpha = 0.32f * state.press),
            cornerRadius = CornerRadius(size.height / 2f),
          )
        },
      ),
  )
  }
}

@ReactModule(name = LiquidTabBarViewManager.NAME)
class LiquidTabBarViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidTabBarView(context)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    directEvents("TabSelect", "TabLongPress")

  private fun bar(view: ReactViewGroup) = view as? LiquidTabBarView

  @ReactProp(name = "selectedIndex", defaultInt = 0)
  fun setSelectedIndex(view: ReactViewGroup, value: Int) {
    bar(view)?.setSelectedIndex(value)
  }

  @ReactProp(name = "backdropBlur", defaultFloat = 0f)
  fun setBackdropBlur(view: ReactViewGroup, value: Float) {
    bar(view)?.state?.backdropBlur = value.coerceIn(0f, 1f)
  }

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: ReactViewGroup, value: String?) {
    bar(view)?.state?.glassStyle = value ?: "regular"
  }

  @ReactProp(name = "glassTintColor", customType = "Color")
  fun setGlassTintColor(view: ReactViewGroup, value: Int?) {
    bar(view)?.state?.tintColor = value
  }

  @ReactProp(name = "selectionColor", customType = "Color")
  fun setSelectionColor(view: ReactViewGroup, value: Int?) {
    bar(view)?.state?.selectionColor = value
  }

  @ReactProp(name = "pagerPosition", defaultFloat = -1f)
  fun setPagerPosition(view: ReactViewGroup, value: Float) {
    bar(view)?.setPagerPosition(value)
  }

  @ReactProp(name = "focusedTintColor", customType = "Color")
  fun setFocusedTintColor(view: ReactViewGroup, value: Int?) {
    bar(view)?.state?.focusedTintColor = value
  }

  @ReactProp(name = "lensTintColor", customType = "Color")
  fun setLensTintColor(view: ReactViewGroup, value: Int?) {
    bar(view)?.state?.lensTintColor = value
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    bar(view)?.state?.colorScheme = value ?: "system"
  }

  @ReactProp(name = "lensEnabled", defaultBoolean = true)
  fun setLensEnabled(view: ReactViewGroup, value: Boolean) {
    bar(view)?.state?.lensEnabled = value
  }

  companion object {
    const val NAME = "RNLiquidTabBar"
  }
}
