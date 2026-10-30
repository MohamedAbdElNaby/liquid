package com.mohamedabdelnaby.reactnativeliquid

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Rect
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import com.facebook.react.bridge.ReactContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.backdrops.emptyBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.lens
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.vibrancy
import com.mohamedabdelnaby.reactnativeliquid.backdrop.highlight.Highlight
import com.mohamedabdelnaby.reactnativeliquid.backdrop.shadow.Shadow
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.json.JSONArray
import kotlin.math.roundToInt

internal data class MenuItem(
  val id: String,
  val title: String,
  val subtitle: String?,
  val destructive: Boolean,
  val disabled: Boolean,
  val checked: Boolean,
  val children: List<MenuItem>?,
)

internal fun parseMenuItems(json: String?): List<MenuItem> {
  if (json.isNullOrEmpty()) {
    return emptyList()
  }
  return try {
    parseMenuItems(JSONArray(json))
  } catch (_: Exception) {
    emptyList()
  }
}

private fun parseMenuItems(array: JSONArray): List<MenuItem> = (0 until array.length()).mapNotNull { i ->
  val item = array.optJSONObject(i) ?: return@mapNotNull null
  val title = item.optString("title")
  MenuItem(
    id = item.optString("id", title),
    title = title,
    subtitle = item.optString("subtitle").takeIf { it.isNotEmpty() },
    destructive = item.optBoolean("destructive"),
    disabled = item.optBoolean("disabled"),
    checked = item.optBoolean("checked"),
    children = item.optJSONArray("children")?.let { parseMenuItems(it) },
  )
}

@Stable
internal class MenuState {
  var items by mutableStateOf<List<MenuItem>>(emptyList())
  var title by mutableStateOf<String?>(null)
  var glassStyle by mutableStateOf("regular")
  var colorScheme by mutableStateOf("system")
  var menuWidth by mutableFloatStateOf(250f)
  var bare by mutableStateOf(false)
  var pressed by mutableStateOf(false)
}

/**
 * A glass button that morphs into a menu. React children are the button content. The menu is
 * drawn in an overlay inside the activity's content view, so its glass refracts the screen.
 */
@SuppressLint("ViewConstructor")
class LiquidMenuView(context: Context) : LiquidComposeHost(context) {

  internal val state = MenuState()
  private var overlay: MenuOverlay? = null
  private var downInside = false

  init {
    val backdrop = createBackdrop(this)
    addComposeView { MenuButton(state, backdrop) }
  }

  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean = true

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downInside = true
        state.pressed = true
      }
      MotionEvent.ACTION_MOVE -> {
        val inside = event.x in 0f..width.toFloat() && event.y in 0f..height.toFloat()
        downInside = inside
        state.pressed = inside
      }
      MotionEvent.ACTION_UP -> {
        state.pressed = false
        if (downInside) {
          open()
        }
      }
      MotionEvent.ACTION_CANCEL -> state.pressed = false
    }
    return true
  }

  override fun performClick(): Boolean {
    open()
    return super.performClick()
  }

  private fun open() {
    if (overlay != null) {
      return
    }
    val activity = (context as? ReactContext)?.currentActivity ?: return
    val root = activity.findViewById<ViewGroup>(android.R.id.content) ?: return

    // A bare menu sits inside a glass (a toolbar capsule): like iOS, that whole glass turns
    // into the menu, not just the menu's own spot in it.
    val source: View = if (state.bare) enclosingGlass() ?: this else this
    val rootLocation = IntArray(2).also { root.getLocationInWindow(it) }
    val location = IntArray(2).also { source.getLocationInWindow(it) }
    val trigger = Rect(
      location[0] - rootLocation[0],
      location[1] - rootLocation[1],
      location[0] - rootLocation[0] + source.width,
      location[1] - rootLocation[1] + source.height,
    )

    overlay = MenuOverlay(
      context = context,
      state = state,
      trigger = trigger,
      onSelect = { id -> dispatchLiquidEvent("ItemSelect") { putString("id", id) } },
      onClosed = {
        root.removeView(overlay)
        overlay = null
        source.alpha = 1f
        dispatchLiquidEvent("OpenChange") { putBoolean("open", false) }
      },
      // The button and the drop cross-fade while the drop is about the button's size: the button
      // fades out as the drop grows over it, and back in as the menu shrinks into it.
      onProgress = { size -> source.alpha = ((SOURCE_GONE - size) / (SOURCE_GONE - SOURCE_BACK)).coerceIn(0f, 1f) },
    ).also { root.addView(it, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)) }

    dispatchLiquidEvent("OpenChange") { putBoolean("open", true) }
  }

  /** The nearest glass view this menu is drawn in, if any. */
  private fun enclosingGlass(): View? {
    var view = parent
    while (view is View) {
      if (view is LiquidGlassView) {
        return view
      }
      view = view.parent
    }
    return null
  }

  override fun dispose() {
    overlay?.let { (it.parent as? ViewGroup)?.removeView(it) }
    overlay = null
    super.dispose()
  }

  private companion object {
    const val MATCH_PARENT = ViewGroup.LayoutParams.MATCH_PARENT
  }
}

/** The glass circle or capsule behind the trigger content. */
@Composable
private fun MenuButton(state: MenuState, backdrop: Backdrop) {
  val dark = isDarkScheme(state.colorScheme)
  val press = remember { Animatable(0f) }
  LaunchedEffect(state.pressed) {
    press.animateTo(if (state.pressed) 1f else 0f, spring(0.5f, 300f))
  }
  val capsule = RoundedCornerShape(percent = 50)

  if (state.bare) {
    // No glass of its own: only a soft press highlight inside the parent glass.
    Box(
      Modifier
        .fillMaxSize()
        .graphicsLayer { alpha = press.value }
        .background(Color.White.copy(alpha = if (dark) 0.14f else 0.22f), capsule),
    )
    return
  }

  Box(
    Modifier
      .fillMaxSize()
      .drawBackdrop(
        backdrop = backdrop,
        shape = { capsule },
        effects = {
          vibrancy()
          blur(if (state.glassStyle == "clear") 2f.dp.toPx() else 8f.dp.toPx())
          lens(12f.dp.toPx(), 16f.dp.toPx())
        },
        layerBlock = {
          val scale = 1f + 0.08f * press.value
          scaleX = scale
          scaleY = scale
        },
        onDrawSurface = {
          drawRect(glassSurfaceColor(dark, state.glassStyle == "clear"))
          drawRect(Color.White.copy(alpha = (if (dark) 0.08f else 0.16f) * press.value))
        },
      ),
  )
}

internal fun glassSurfaceColor(dark: Boolean, clear: Boolean): Color = when {
  !isGlassEffectSupported && dark -> Color(0xF21C1C1E)
  !isGlassEffectSupported -> Color(0xF2F2F2F7)
  dark -> Color(0xFF1C1C1E).copy(alpha = if (clear) 0.12f else 0.45f)
  else -> Color.White.copy(alpha = if (clear) 0.08f else 0.45f)
}

/** Full-screen overlay hosting the morphing menu panel. */
@SuppressLint("ViewConstructor")
private class MenuOverlay(
  context: Context,
  private val state: MenuState,
  private val trigger: Rect,
  private val onSelect: (String) -> Unit,
  private val onClosed: () -> Unit,
  private val onProgress: (Float) -> Unit,
) : FrameLayout(context) {

  private val lifecycleOwner = GlassLifecycleOwner()
  private val composeView = ComposeView(context)
  private val backdrop: Backdrop
  private var observedViewTree: ViewTreeObserver? = null
  private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
    (backdrop as? ViewTreeBackdrop)?.record()
    true
  }

  init {
    clipChildren = false
    backdrop = if (isGlassEffectSupported) ViewTreeBackdrop(composeView, coordinatesDependent = true)
    else emptyBackdrop()
    lifecycleOwner.install(composeView)
    composeView.setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
    composeView.setContent {
      MenuPanel(state, trigger, backdrop, onSelect, onProgress) { post { onClosed() } }
    }
    addView(composeView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  override fun onAttachedToWindow() {
    lifecycleOwner.onAttached()
    super.onAttachedToWindow()
    observedViewTree = viewTreeObserver.also { it.addOnPreDrawListener(preDrawListener) }
  }

  override fun onDetachedFromWindow() {
    observedViewTree?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDrawListener)
    observedViewTree = null
    super.onDetachedFromWindow()
    lifecycleOwner.destroy()
    (backdrop as? ViewTreeBackdrop)?.discard()
  }
}

@Composable
private fun MenuPanel(
  state: MenuState,
  trigger: Rect,
  backdrop: Backdrop,
  onSelect: (String) -> Unit,
  onProgress: (Float) -> Unit,
  onClosed: () -> Unit,
) {
  val dark = isDarkScheme(state.colorScheme)
  val density = LocalDensity.current
  val scope = rememberCoroutineScope()
  // Two springs with different stiffness make the glass morph like a droplet.
  val openX = remember { mutableFloatStateOf(0f) }
  val openY = remember { mutableFloatStateOf(0f) }
  var morph by remember { mutableStateOf<Job?>(null) }

  // Stepped per drawn frame (at most a 30 fps frame at a time), so the stall of opening the
  // overlay cannot make the drop jump ahead: it always grows out of the button.
  fun morphTo(target: Float, x: LiquidSpring, y: LiquidSpring, then: (() -> Unit)? = null) {
    morph?.cancel()
    morph = scope.launch {
      x.value = openX.floatValue
      y.value = openY.floatValue
      x.target = target
      y.target = target
      var last = 0L
      while (true) {
        val now = withFrameNanos { it }
        val dt = if (last == 0L) 1f / 60f else ((now - last) / 1e9f).coerceIn(1f / 240f, 1f / 30f)
        last = now
        val moving = x.step(dt) or y.step(dt)
        openX.floatValue = x.value
        openY.floatValue = y.value
        // How far the drop is from the button's size, in either direction.
        val size = maxOf(x.value, y.value)
        onProgress(size)
        // Closing ends once the drop has faded into the button, not in the spring's slow tail.
        if (!moving || (target == 0f && size < DROP_GONE)) break
      }
      then?.invoke()
    }
  }
  var contentHeight by remember { mutableFloatStateOf(0f) }
  var closing by remember { mutableStateOf(false) }
  var expandedId by remember { mutableStateOf<String?>(null) }
  // Where the content sits inside the morphing panel; set during layout.
  var contentOffsetX = 0f
  var contentOffsetY = 0f

  fun close(then: (() -> Unit)? = null) {
    if (closing) {
      return
    }
    closing = true
    then?.invoke()
    morphTo(0f, LiquidSpring(1f, 600f, 0.001f), LiquidSpring(1f, 520f, 0.001f)) { onClosed() }
  }

  // Starts growing on the first frame, like iOS; the height aims at the menu's once measured.
  LaunchedEffect(Unit) {
    morphTo(1f, LiquidSpring(0.72f, 340f, 0.001f), LiquidSpring(0.8f, 240f, 0.001f))
  }

  val labelColor = if (dark) Color.White else Color.Black
  val secondaryColor = if (dark) Color(0x99EBEBF5) else Color(0x993C3C43)
  val separatorColor = if (dark) Color.White.copy(0.12f) else Color.Black.copy(0.08f)

  Box(
    Modifier
      .fillMaxSize()
      .pointerInput(Unit) { detectTapGestures { close() } },
  ) {
    val menuWidthPx = with(density) { state.menuWidth.dp.toPx() }
    val margin = with(density) { 12.dp.toPx() }
    val panelRadius = with(density) { 26.dp.toPx() }

    Box(
      Modifier
        .layout { measurable, constraints ->
          val screenWidth = constraints.maxWidth.toFloat()
          val screenHeight = constraints.maxHeight.toFloat()

          // Final rect: aligned to the trigger's nearest side, below it when there is room.
          val alignRight = trigger.centerX() > screenWidth / 2
          val finalLeft = (if (alignRight) trigger.right - menuWidthPx else trigger.left.toFloat())
            .coerceIn(margin, (screenWidth - menuWidthPx - margin).coerceAtLeast(margin))
          val finalHeight = (if (contentHeight > 0f) contentHeight else trigger.height().toFloat())
            .coerceAtMost(screenHeight - margin * 2)
          val finalTop = if (trigger.top + finalHeight + margin <= screenHeight) trigger.top.toFloat()
          else (trigger.bottom - finalHeight).coerceAtLeast(margin)

          val x = openX.value
          val y = openY.value
          val left = lerp(trigger.left.toFloat(), finalLeft, x)
          val width = lerp(trigger.width().toFloat(), menuWidthPx, x)
          val top = lerp(trigger.top.toFloat(), finalTop, y)
          val height = lerp(trigger.height().toFloat(), finalHeight.coerceAtLeast(1f), y)

          // The content stays at its final position while the glass grows around it.
          contentOffsetX = finalLeft - left
          contentOffsetY = finalTop - top
          val placeable = measurable.measure(
            Constraints.fixed(width.roundToInt().coerceAtLeast(1), height.roundToInt().coerceAtLeast(1)),
          )
          layout(constraints.maxWidth, constraints.maxHeight) {
            placeable.place(left.roundToInt(), top.roundToInt())
          }
        }
        // Fades in over the button as it lifts, and out as it lands back on it, so the two
        // never show as two glasses on top of each other.
        .graphicsLayer {
          alpha = ((maxOf(openX.value, openY.value) - DROP_GONE) / (DROP_SHOWN - DROP_GONE)).coerceIn(0f, 1f)
        }
        .drawBackdrop(
          backdrop = backdrop,
          shape = {
            val progress = minOf(openX.value, openY.value)
            RoundedCornerShape(lerp(trigger.height() / 2f, panelRadius, progress))
          },
          effects = {
            vibrancy()
            // A clear drop at first, so the button shows through it; the blur of the menu
            // builds up as it grows.
            val progress = minOf(openX.value, openY.value).coerceIn(0f, 1f)
            blur(16f.dp.toPx() * progress)
            lens(16f.dp.toPx(), 24f.dp.toPx())
          },
          highlight = { Highlight.Default },
          shadow = {
            val progress = minOf(openX.value, openY.value).coerceIn(0f, 1f)
            Shadow(radius = 24.dp, color = Color.Black.copy(alpha = (if (dark) 0.35f else 0.15f) * progress))
          },
          onDrawSurface = {
            // The drop starts in the button's light glass and turns into the menu's material.
            val progress = minOf(openX.value, openY.value).coerceIn(0f, 1f)
            val clear = state.glassStyle == "clear"
            val drop = when {
              clear && dark -> Color(0xFF1C1C1E).copy(alpha = 0.12f)
              clear -> Color.White.copy(alpha = 0.08f)
              dark -> Color.White.copy(alpha = 0.14f)
              else -> Color.White.copy(alpha = 0.32f)
            }
            drawRect(androidx.compose.ui.graphics.lerp(drop, glassSurfaceColor(dark, clear), progress))
          },
        )
        .pointerInput(Unit) { detectTapGestures { } },
    ) {
      Column(
        Modifier
          .layout { measurable, constraints ->
            // Measure at the final width with unbounded height to know the menu's size.
            val width = menuWidthPx.roundToInt()
            val placeable = measurable.measure(Constraints(width, width, 0, Constraints.Infinity))
            contentHeight = placeable.height.toFloat()
            layout(constraints.maxWidth, constraints.maxHeight) {
              placeable.place(contentOffsetX.roundToInt(), contentOffsetY.roundToInt())
            }
          }
          .graphicsLayer {
            val shown = ((minOf(openX.value, openY.value) - 0.4f) / 0.5f).coerceIn(0f, 1f)
            alpha = shown
            // The items sharpen as they appear, like iOS.
            val radius = 8.dp.toPx() * (1f - shown)
            renderEffect = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S && radius > 0.5f) {
              BlurEffect(radius, radius)
            } else {
              null
            }
          }
          .animateContentSize(spring(0.85f, Spring.StiffnessMediumLow))
          .padding(vertical = 8.dp),
      ) {
        state.title?.let { title ->
          BasicText(
            title,
            Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            style = TextStyle(color = secondaryColor, fontSize = 13.sp, fontWeight = FontWeight.SemiBold),
          )
          Separator(separatorColor)
        }

        for (item in state.items) {
          val expanded = expandedId == item.id
          val dimmed = expandedId != null && !expanded
          Column(Modifier.alpha(if (dimmed) 0.4f else 1f)) {
            MenuRow(
              item = item,
              labelColor = labelColor,
              secondaryColor = secondaryColor,
              expanded = expanded,
              onClick = {
                if (item.children != null) {
                  expandedId = if (expanded) null else item.id
                } else {
                  close { onSelect(item.id) }
                }
              },
            )
            if (item.children != null) {
              AnimatedVisibility(
                visible = expanded,
                enter = fadeIn(spring(1f, 400f)) + expandVertically(spring(0.85f, 400f)),
                exit = fadeOut(spring(1f, 500f)) + shrinkVertically(spring(1f, 500f)),
              ) {
                Column(Modifier.padding(start = 16.dp)) {
                  for (child in item.children) {
                    MenuRow(
                      item = child,
                      labelColor = labelColor,
                      secondaryColor = secondaryColor,
                      expanded = false,
                      onClick = { close { onSelect(child.id) } },
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun Separator(color: Color) {
  Box(
    Modifier
      .padding(vertical = 4.dp, horizontal = 16.dp)
      .fillMaxWidth()
      .height(0.5.dp)
      .background(color),
  )
}

@Composable
private fun MenuRow(
  item: MenuItem,
  labelColor: Color,
  secondaryColor: Color,
  expanded: Boolean,
  onClick: () -> Unit,
) {
  val interaction = remember { MutableInteractionSource() }
  val pressed by interaction.collectIsPressedAsState()
  val color = if (item.destructive) Color(0xFFFF3B30) else labelColor

  Row(
    Modifier
      .fillMaxWidth()
      .alpha(if (item.disabled) 0.4f else 1f)
      .clickable(
        interactionSource = interaction,
        indication = null,
        enabled = !item.disabled,
        onClick = onClick,
      )
      .graphicsLayer {
        val scale = if (pressed) 0.97f else 1f
        scaleX = scale
        scaleY = scale
      }
      .padding(horizontal = 20.dp, vertical = 11.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(10.dp),
  ) {
    Column(Modifier.weight(1f)) {
      BasicText(item.title, style = TextStyle(color = color, fontSize = 17.sp))
      item.subtitle?.let {
        BasicText(it, style = TextStyle(color = secondaryColor, fontSize = 13.sp))
      }
    }
    when {
      item.children != null -> BasicText(
        "›",
        Modifier.width(14.dp).rotate(if (expanded) 90f else 0f),
        style = TextStyle(color = secondaryColor, fontSize = 22.sp),
      )
      item.checked -> BasicText("✓", style = TextStyle(color = color, fontSize = 17.sp))
    }
  }
}

@ReactModule(name = LiquidMenuViewManager.NAME)
class LiquidMenuViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidMenuView(context)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    directEvents("ItemSelect", "OpenChange")

  private fun state(view: ReactViewGroup) = (view as? LiquidMenuView)?.state

  @ReactProp(name = "items")
  fun setItems(view: ReactViewGroup, value: String?) {
    state(view)?.items = parseMenuItems(value)
  }

  @ReactProp(name = "title")
  fun setTitle(view: ReactViewGroup, value: String?) {
    state(view)?.title = value?.takeIf { it.isNotEmpty() }
  }

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: ReactViewGroup, value: String?) {
    state(view)?.glassStyle = value ?: "regular"
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    state(view)?.colorScheme = value ?: "system"
  }

  @ReactProp(name = "bare")
  fun setBare(view: ReactViewGroup, value: Boolean) {
    state(view)?.bare = value
  }

  @ReactProp(name = "menuWidth", defaultFloat = 250f)
  fun setMenuWidth(view: ReactViewGroup, value: Float) {
    state(view)?.menuWidth = value
  }

  companion object {
    const val NAME = "RNLiquidMenu"
  }
}

// The drop and its button cross-fade only while the drop is nearly the button's size (its
// larger side within these fractions of the way to the menu's), so they never show apart.

/** Size by which the drop is fully shown over its button. */
private const val DROP_SHOWN = 0.12f

/** Size below which the drop is gone (and closing ends). */
private const val DROP_GONE = 0.02f

/** Size below which the button is fully back, under the drop before it fades. */
private const val SOURCE_BACK = 0.12f

/** Size by which the button under the drop is gone. */
private const val SOURCE_GONE = 0.3f
