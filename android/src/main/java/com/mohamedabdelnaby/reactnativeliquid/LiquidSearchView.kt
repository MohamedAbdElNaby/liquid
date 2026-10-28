package com.mohamedabdelnaby.reactnativeliquid

import android.annotation.SuppressLint
import android.content.Context
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.withFrameNanos
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.drawBackdrop
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.blur
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.lens
import com.mohamedabdelnaby.reactnativeliquid.backdrop.effects.vibrancy
import com.mohamedabdelnaby.reactnativeliquid.backdrop.highlight.Highlight
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private const val GAP_DP = 16f
/** Bar variant: distance between the field and its close button. */
private const val BAR_GAP_DP = 8f

@Stable
internal class SearchState {
  var expanded by mutableStateOf(false)
  var placeholder by mutableStateOf("Search")
  var text by mutableStateOf("")
  var glassStyle by mutableStateOf("regular")
  var tintColor by mutableStateOf<Int?>(null)
  var colorScheme by mutableStateOf("system")
  /** Morph progress, 0 = round button, 1 = field. Mirrored to the React children. */
  var progress by mutableStateOf(0f)
  /** `button` or `bar` (a full-width field under the header row of React children). */
  var variant by mutableStateOf("button")
  var headerHeight by mutableStateOf(52f)
  var fieldHeight by mutableStateOf(44f)
}

/**
 * A round glass search button that morphs into a search field with a separate close button.
 * React children are the content shown while collapsed; they fade out as the field expands.
 */
@SuppressLint("ViewConstructor")
class LiquidSearchView(context: Context) : LiquidComposeHost(context) {

  internal val state = SearchState()

  init {
    lateinit var backdrop: Backdrop
    val overlay = addComposeView(above = true, touchableReactChildrenBelow = true) {
      SearchMorph(
        state = state,
        backdrop = backdrop,
        onProgress = ::applyProgressToChildren,
        onExpandedChange = { expanded ->
          dispatchLiquidEvent("ExpandedChange") { putBoolean("expanded", expanded) }
        },
        onChangeText = { text -> dispatchLiquidEvent("ChangeText") { putString("text", text) } },
        onSubmit = { text -> dispatchLiquidEvent("SearchSubmit") { putString("text", text) } },
      )
    }
    backdrop = createBackdrop(overlay)
  }

  private fun applyProgressToChildren(progress: Float) {
    val bar = state.variant == "bar"
    val density = resources.displayMetrics.density
    for (i in leading until childCount - trailing) {
      val child = getChildAt(i) ?: continue
      child.alpha = 1f - progress
      // The bar's header row drifts up as it fades.
      val scale = 1f - (if (bar) 0.1f else 0.08f) * progress
      child.scaleX = scale
      child.scaleY = scale
      child.translationY = if (bar) -state.headerHeight * density * 0.35f * progress else 0f
    }
  }
}

@Composable
private fun SearchMorph(
  state: SearchState,
  backdrop: Backdrop,
  onProgress: (Float) -> Unit,
  onExpandedChange: (Boolean) -> Unit,
  onChangeText: (String) -> Unit,
  onSubmit: (String) -> Unit,
) {
  if (state.variant == "bar") {
    SearchBarMorph(state, backdrop, onProgress, onExpandedChange, onChangeText, onSubmit)
    return
  }
  val dark = isDarkScheme(state.colorScheme)
  val labelColor = if (dark) Color.White else Color.Black
  val secondaryColor = if (dark) Color(0x99EBEBF5) else Color(0x993C3C43)
  val density = LocalDensity.current
  val gap = with(density) { GAP_DP.dp.toPx() }
  val focusRequester = remember { FocusRequester() }
  val focusManager = LocalFocusManager.current
  val keyboard = LocalSoftwareKeyboardController.current
  val capsule = RoundedCornerShape(percent = 50)

  // The field leads; the close button follows with a softer spring so the glass stretches.
  val field = remember { Animatable(if (state.expanded) 1f else 0f) }
  val close = remember { Animatable(if (state.expanded) 1f else 0f) }
  var pressed by remember { mutableStateOf(false) }

  LaunchedEffect(Unit) {
    snapshotFlow { state.expanded }.collectLatest { expanded ->
      val target = if (expanded) 1f else 0f
      launch { close.animateTo(target, spring(0.7f, 260f)) }
      launch {
        field.animateTo(target, spring(0.78f, 320f)) { onProgress(value.coerceIn(0f, 1f)) }
      }
      if (expanded) {
        // The field is only enabled once expanded: let that recomposition land first.
        withFrameNanos { }
        focusRequester.requestFocus()
        keyboard?.show()
      } else {
        focusManager.clearFocus()
        keyboard?.hide()
      }
    }
  }

  val glassModifier = { press: () -> Float ->
    Modifier.drawBackdrop(
      backdrop = backdrop,
      shape = { capsule },
      effects = {
        vibrancy()
        blur(if (state.glassStyle == "clear") 2f.dp.toPx() else 8f.dp.toPx())
        lens(12f.dp.toPx(), 18f.dp.toPx())
      },
      highlight = { Highlight.Default },
      layerBlock = {
        val scale = 1f + 0.06f * press()
        scaleX = scale
        scaleY = scale
      },
      onDrawSurface = {
        drawRect(glassSurfaceColor(dark, state.glassStyle == "clear"))
        state.tintColor?.let { drawRect(Color(it).copy(alpha = Color(it).alpha * 0.6f)) }
      },
    )
  }

  Box(Modifier.fillMaxSize()) {
    // Search field (round button while collapsed).
    Box(
      Modifier
        .layout { measurable, constraints ->
          val width = constraints.maxWidth.toFloat()
          val height = constraints.maxHeight.toFloat()
          val p = field.value
          val fieldWidth = lerp(height, width - height - gap, p).coerceAtLeast(height * 0.5f)
          val left = lerp(width - height, 0f, p)
          val placeable = measurable.measure(Constraints.fixed(fieldWidth.roundToInt(), height.roundToInt()))
          layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(left.roundToInt(), 0) }
        }
        .then(glassModifier { if (pressed) 1f else 0f })
        .pointerInput(Unit) {
          detectTapGestures(
            onPress = {
              if (!state.expanded) {
                pressed = true
                tryAwaitRelease()
                pressed = false
              }
            },
            onTap = { if (!state.expanded) onExpandedChange(true) },
          )
        },
    ) {
      SearchIcon(
        color = if (field.value > 0.5f) secondaryColor else labelColor,
        // Centered in the button, moving to the leading edge of the field.
        modifier = Modifier
          .layout { measurable, constraints ->
            val placeable = measurable.measure(constraints)
            val p = field.value
            val parentHeight = constraints.maxHeight.toFloat()
            val centered = (constraints.maxWidth - placeable.width) / 2f
            val leading = parentHeight * 0.32f
            layout(constraints.maxWidth, constraints.maxHeight) {
              placeable.place(lerp(centered, leading, p).roundToInt(), ((parentHeight - placeable.height) / 2).roundToInt())
            }
          },
      )
      BasicTextField(
        value = state.text,
        onValueChange = {
          state.text = it
          onChangeText(it)
        },
        singleLine = true,
        // While collapsed the field must not take the tap that expands the search.
        enabled = state.expanded,
        textStyle = TextStyle(color = labelColor, fontSize = 17.sp),
        cursorBrush = SolidColor(if (dark) Color(0xFF0A84FF) else Color(0xFF007AFF)),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = {
          onSubmit(state.text)
          focusManager.clearFocus()
        }),
        modifier = Modifier
          .align(Alignment.CenterStart)
          .padding(start = 44.dp, end = 14.dp)
          .focusRequester(focusRequester)
          .graphicsLayer { alpha = ((field.value - 0.5f) / 0.5f).coerceIn(0f, 1f) },
        decorationBox = { inner ->
          Box {
            if (state.text.isEmpty()) {
              BasicText(state.placeholder, style = TextStyle(color = secondaryColor, fontSize = 17.sp))
            }
            inner()
          }
        },
      )
    }

    // Close button, growing out of the field's trailing edge.
    Box(
      Modifier
        .layout { measurable, constraints ->
          val width = constraints.maxWidth.toFloat()
          val height = constraints.maxHeight.toFloat()
          val p = close.value.coerceIn(0f, 1.2f)
          val size = lerp(height * 0.4f, height, p.coerceIn(0f, 1f))
          val placeable = measurable.measure(Constraints.fixed(size.roundToInt(), size.roundToInt()))
          val centerX = lerp(width - height / 2f - gap, width - height / 2f, p)
          layout(constraints.maxWidth, constraints.maxHeight) {
            placeable.place((centerX - size / 2f).roundToInt(), ((height - size) / 2f).roundToInt())
          }
        }
        .graphicsLayer { alpha = close.value.coerceIn(0f, 1f) }
        .then(glassModifier { 0f })
        .pointerInput(Unit) {
          detectTapGestures { if (state.expanded) onExpandedChange(false) }
        },
      contentAlignment = Alignment.Center,
    ) {
      BasicText("✕", style = TextStyle(color = labelColor, fontSize = 17.sp))
    }
  }
}

/**
 * Full-width field under a header row of React children. Expanding raises the field into the
 * row, slides the close button in from the trailing edge and moves the icon and placeholder from
 * the center to the leading edge. Closing clears the text.
 */
@Composable
private fun SearchBarMorph(
  state: SearchState,
  backdrop: Backdrop,
  onProgress: (Float) -> Unit,
  onExpandedChange: (Boolean) -> Unit,
  onChangeText: (String) -> Unit,
  onSubmit: (String) -> Unit,
) {
  val dark = isDarkScheme(state.colorScheme)
  val labelColor = if (dark) Color.White else Color.Black
  val secondaryColor = if (dark) Color(0x99EBEBF5) else Color(0x993C3C43)
  val density = LocalDensity.current
  val gap = with(density) { BAR_GAP_DP.dp.toPx() }
  val headerHeight = with(density) { state.headerHeight.dp.toPx() }
  val fieldHeight = with(density) { state.fieldHeight.dp.toPx() }
  val iconSize = with(density) { 18.dp.toPx() }
  val iconGap = with(density) { 6.dp.toPx() }
  val pad = fieldHeight * 0.3f
  val focusRequester = remember { FocusRequester() }
  val focusManager = LocalFocusManager.current
  val keyboard = LocalSoftwareKeyboardController.current
  val capsule = RoundedCornerShape(percent = 50)
  val textStyle = TextStyle(color = labelColor, fontSize = 17.sp)
  val textMeasurer = androidx.compose.ui.text.rememberTextMeasurer()
  val placeholderWidth = remember(state.placeholder) {
    textMeasurer.measure(state.placeholder, textStyle).size.width.toFloat()
  }

  val progress = remember { Animatable(if (state.expanded) 1f else 0f) }
  LaunchedEffect(Unit) {
    snapshotFlow { state.expanded }.collectLatest { expanded ->
      launch {
        progress.animateTo(if (expanded) 1f else 0f, spring(0.92f, 224f)) {
          onProgress(value.coerceIn(0f, 1f))
        }
      }
      if (expanded) {
        withFrameNanos { }
        focusRequester.requestFocus()
        keyboard?.show()
      } else {
        focusManager.clearFocus()
        keyboard?.hide()
      }
    }
  }

  val glass = Modifier.drawBackdrop(
    backdrop = backdrop,
    shape = { capsule },
    effects = {
      vibrancy()
      blur(if (state.glassStyle == "clear") 2f.dp.toPx() else 8f.dp.toPx())
      lens(10f.dp.toPx(), 14f.dp.toPx())
    },
    highlight = { Highlight.Default },
    onDrawSurface = {
      drawRect(glassSurfaceColor(dark, state.glassStyle == "clear"))
      state.tintColor?.let { drawRect(Color(it).copy(alpha = Color(it).alpha * 0.6f)) }
    },
  )

  Box(Modifier.fillMaxSize()) {
    // The field.
    Box(
      Modifier
        .layout { measurable, constraints ->
          val width = constraints.maxWidth.toFloat()
          val p = progress.value
          val fieldWidth = lerp(width, width - fieldHeight - gap, p)
          val y = lerp(headerHeight, (headerHeight - fieldHeight) / 2f, p)
          val placeable = measurable.measure(Constraints.fixed(fieldWidth.roundToInt(), fieldHeight.roundToInt()))
          layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(0, y.roundToInt()) }
        }
        .then(glass)
        .pointerInput(Unit) {
          detectTapGestures { if (!state.expanded) onExpandedChange(true) }
        },
    ) {
      // Icon and placeholder: centered at rest, at the leading edge while searching.
      val contentX = { fieldWidth: Float ->
        val centered = if (state.text.isEmpty()) {
          (fieldWidth - iconSize - iconGap - placeholderWidth) / 2f
        } else {
          pad
        }
        lerp(centered.coerceAtLeast(pad), pad, progress.value)
      }
      SearchIcon(
        color = secondaryColor,
        modifier = Modifier.layout { measurable, constraints ->
          val placeable = measurable.measure(Constraints())
          layout(constraints.maxWidth, constraints.maxHeight) {
            placeable.place(
              contentX(constraints.maxWidth.toFloat()).roundToInt(),
              ((constraints.maxHeight - placeable.height) / 2f).roundToInt(),
            )
          }
        },
      )
      BasicTextField(
        value = state.text,
        onValueChange = {
          state.text = it
          onChangeText(it)
        },
        singleLine = true,
        enabled = state.expanded,
        textStyle = textStyle,
        cursorBrush = SolidColor(if (dark) Color(0xFF0A84FF) else Color(0xFF007AFF)),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = {
          onSubmit(state.text)
          focusManager.clearFocus()
        }),
        modifier = Modifier
          .layout { measurable, constraints ->
            val width = constraints.maxWidth.toFloat()
            val x = contentX(width) + iconSize + iconGap
            val placeable = measurable.measure(
              Constraints.fixedWidth((width - x - pad).coerceAtLeast(0f).roundToInt()),
            )
            layout(constraints.maxWidth, constraints.maxHeight) {
              placeable.place(x.roundToInt(), ((constraints.maxHeight - placeable.height) / 2f).roundToInt())
            }
          }
          .focusRequester(focusRequester),
        decorationBox = { inner ->
          Box {
            if (state.text.isEmpty()) {
              BasicText(state.placeholder, style = textStyle.copy(color = secondaryColor))
            }
            inner()
          }
        },
      )
    }

    // Close button, sliding in from beyond the trailing edge.
    Box(
      Modifier
        .layout { measurable, constraints ->
          val width = constraints.maxWidth.toFloat()
          val p = progress.value
          val x = lerp(width + gap * 2f, width - fieldHeight, p)
          val y = lerp(headerHeight, (headerHeight - fieldHeight) / 2f, p)
          val placeable = measurable.measure(Constraints.fixed(fieldHeight.roundToInt(), fieldHeight.roundToInt()))
          layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(x.roundToInt(), y.roundToInt()) }
        }
        .graphicsLayer { alpha = progress.value.coerceIn(0f, 1f) }
        .then(glass)
        .pointerInput(Unit) {
          detectTapGestures {
            if (state.expanded) {
              if (state.text.isNotEmpty()) {
                state.text = ""
                onChangeText("")
              }
              onExpandedChange(false)
            }
          }
        },
      contentAlignment = Alignment.Center,
    ) {
      BasicText("✕", style = TextStyle(color = labelColor, fontSize = 17.sp))
    }
  }
}

/** Magnifying glass drawn with Compose so the library needs no icon assets. */
@Composable
private fun SearchIcon(color: Color, modifier: Modifier = Modifier) {
  androidx.compose.foundation.Canvas(modifier.size(20.dp)) {
    val stroke = 2.2.dp.toPx()
    val radius = size.minDimension * 0.34f
    val center = androidx.compose.ui.geometry.Offset(size.width * 0.42f, size.height * 0.42f)
    drawCircle(color, radius, center, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
    val start = androidx.compose.ui.geometry.Offset(center.x + radius * 0.72f, center.y + radius * 0.72f)
    val end = androidx.compose.ui.geometry.Offset(size.width * 0.92f, size.height * 0.92f)
    drawLine(color, start, end, stroke, cap = androidx.compose.ui.graphics.StrokeCap.Round)
  }
}

@ReactModule(name = LiquidSearchViewManager.NAME)
class LiquidSearchViewManager : LiquidComposeHostManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidSearchView(context)

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    directEvents("ExpandedChange", "ChangeText", "SearchSubmit")

  private fun state(view: ReactViewGroup) = (view as? LiquidSearchView)?.state

  @ReactProp(name = "expanded")
  fun setExpanded(view: ReactViewGroup, value: Boolean) {
    state(view)?.expanded = value
  }

  @ReactProp(name = "placeholder")
  fun setPlaceholder(view: ReactViewGroup, value: String?) {
    state(view)?.placeholder = value ?: "Search"
  }

  @ReactProp(name = "text")
  fun setText(view: ReactViewGroup, value: String?) {
    val state = state(view) ?: return
    if (state.text != (value ?: "")) {
      state.text = value ?: ""
    }
  }

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: ReactViewGroup, value: String?) {
    state(view)?.glassStyle = value ?: "regular"
  }

  @ReactProp(name = "glassTintColor", customType = "Color")
  fun setGlassTintColor(view: ReactViewGroup, value: Int?) {
    state(view)?.tintColor = value
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    state(view)?.colorScheme = value ?: "system"
  }

  @ReactProp(name = "variant")
  fun setVariant(view: ReactViewGroup, value: String?) {
    state(view)?.variant = value ?: "button"
  }

  @ReactProp(name = "headerHeight", defaultFloat = 52f)
  fun setHeaderHeight(view: ReactViewGroup, value: Float) {
    state(view)?.headerHeight = value
  }

  @ReactProp(name = "fieldHeight", defaultFloat = 44f)
  fun setFieldHeight(view: ReactViewGroup, value: Float) {
    state(view)?.fieldHeight = value
  }

  companion object {
    const val NAME = "RNLiquidSearch"
  }
}
