package com.mohamedabdelnaby.reactnativeliquid

import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RecordingCanvas
import android.graphics.RenderNode
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import androidx.annotation.RequiresApi
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.GraphicsLayerScope
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.unit.Density
import com.mohamedabdelnaby.reactnativeliquid.backdrop.Backdrop

/**
 * A [Backdrop] that samples the classic Android view hierarchy drawn *behind* [target].
 *
 * The content is recorded into a [RenderNode] (see [record]) right before every frame, and the
 * Compose backdrop layer only references that node. Re-recording the node is therefore enough to
 * refresh the glass, without recomposing or redrawing the Compose tree.
 *
 * Only views that are drawn before [target] are recorded (its preceding siblings and those of its
 * ancestors, plus the ancestors' backgrounds). Views drawn on top of the glass are never part of
 * its backdrop, which also guarantees that two glass views can never reference each other.
 *
 * When [target] is a ComposeView whose glass elements move inside it (lenses, morphing panels),
 * set [coordinatesDependent] so each element samples the content under its own position.
 * [magnification] then scales the sampled content around the element's center.
 */
@RequiresApi(Build.VERSION_CODES.Q)
internal class ViewTreeBackdrop(
  private val target: View,
  private val coordinatesDependent: Boolean = false,
  private val magnification: () -> Float = { 1f },
  private val enabled: () -> Boolean = { true },
  /** Optional paint (e.g. a color filter) applied to a child while it is recorded. */
  private val childPaint: (parent: ViewGroup, child: View) -> Paint? = { _, _ -> null },
  /** Draws [child] in its own coordinates instead of its display list; returns false to skip. */
  private val drawChildContent: (parent: ViewGroup, child: View, canvas: Canvas) -> Boolean = { _, _, _ -> false },
  /**
   * Keeps the last recording while nothing behind [target] changed. A new recording makes the GPU
   * blur the glass again, so recording every glass before every frame made every frame redo every
   * blur on screen. Only for plain glass: backdrops with [childPaint] or [drawChildContent] depend
   * on state this class cannot see.
   */
  private val skipUnchanged: Boolean = false,
) : Backdrop {

  private val node = RenderNode("LiquidGlassBackdrop").apply { setClipToBounds(false) }
  private val targetToRoot = Matrix()
  private val rootToTarget = Matrix()
  private val ancestors = ArrayList<View>()
  private val visibleRect = android.graphics.Rect()
  private val matrixValues = FloatArray(9)
  private val location = IntArray(2)
  // The window area this glass samples while recording, see [computeSampleArea].
  private val recordArea = android.graphics.Rect()

  /** The glass's frame in window coordinates, plus what a lens or morph can reach past it. */
  private fun computeSampleArea(out: android.graphics.Rect) {
    target.getLocationInWindow(location)
    val margin = (SAMPLE_MARGIN_DP * target.resources.displayMetrics.density).toInt()
    out.set(
      location[0] - margin,
      location[1] - margin,
      location[0] + (target.width * target.scaleX).toInt() + margin,
      location[1] + (target.height * target.scaleY).toInt() + margin,
    )
  }

  /** Whether [view] can show inside [area] (views without a size always count). */
  private fun overlaps(view: View, area: android.graphics.Rect): Boolean {
    if (view.width <= 0 || view.height <= 0) {
      return true
    }
    view.getLocationInWindow(location)
    // Scaled or rotated views: check their scaled bounds generously.
    val grow = maxOf(1f, kotlin.math.abs(view.scaleX), kotlin.math.abs(view.scaleY))
    val w = (view.width * grow).toInt()
    val h = (view.height * grow).toInt()
    val dx = if (grow > 1f) (w - view.width) / 2 else 0
    val dy = if (grow > 1f) (h - view.height) / 2 else 0
    return area.intersects(location[0] - dx, location[1] - dy, location[0] - dx + w, location[1] - dy + h)
  }

  // What the last recording was made from, to tell whether it is still current.
  private val recordedTargetToRoot = Matrix()
  private var recordedWidth = -1
  private var recordedHeight = -1
  private var recordedSignature = 0L
  // Set by the per-frame check (see [record]) before any backdrop records.
  private var needsRecord = true

  override val isCoordinatesDependent: Boolean = coordinatesDependent

  override fun DrawScope.drawBackdrop(
    density: Density,
    coordinates: LayoutCoordinates?,
    layerBlock: (GraphicsLayerScope.() -> Unit)?,
  ) {
    val canvas = drawContext.canvas.nativeCanvas
    if (canvas !is RecordingCanvas || !node.hasDisplayList()) {
      return
    }
    if (!coordinatesDependent || coordinates == null || !coordinates.isAttached) {
      canvas.drawRenderNode(node)
      return
    }

    // Map the recorded content (in the ComposeView's coordinates) into this element's local
    // coordinates, undoing any translation and scale applied to the element.
    val origin = coordinates.localToRoot(Offset.Zero)
    val unitX = coordinates.localToRoot(Offset(UNIT, 0f))
    val unitY = coordinates.localToRoot(Offset(0f, UNIT))
    val scaleX = ((unitX.x - origin.x) / UNIT).takeIf { it != 0f } ?: 1f
    val scaleY = ((unitY.y - origin.y) / UNIT).takeIf { it != 0f } ?: 1f
    val zoom = magnification()

    withTransform({
      if (zoom != 1f) {
        scale(zoom, zoom, pivot = Offset(size.width / 2f, size.height / 2f))
      }
      scale(1f / scaleX, 1f / scaleY, pivot = Offset.Zero)
      translate(-origin.x, -origin.y)
    }) {
      drawContext.canvas.nativeCanvas.let { (it as? RecordingCanvas)?.drawRenderNode(node) }
    }
  }

  /**
   * Records what is currently drawn behind [target], in the target's local coordinates, before a
   * frame. Recording draws views, which clears their "changed since last drawn" flag, so every
   * backdrop first decides whether it needs a new recording, then they record.
   */
  fun record() {
    val frame = AnimationUtils.currentAnimationTimeMillis()
    if (frame != checkedFrame) {
      checkedFrame = frame
      for (backdrop in live) {
        backdrop.needsRecord = !backdrop.skipUnchanged || backdrop.changedSinceRecording()
      }
    }
    if (live.add(this)) {
      needsRecord = true
    }
    if (!needsRecord) {
      return
    }
    needsRecord = false
    recordNow()
  }

  private fun recordNow() {
    val width = target.width
    val height = target.height
    if (width <= 0 || height <= 0 || !target.isAttachedToWindow || !enabled()) {
      return
    }

    // Glass scrolled off screen or clipped away is not drawn: skip it until it shows again (its
    // next frame on screen records first). Every glass records before every frame, so on a long
    // page this is most of the work.
    if (!target.getGlobalVisibleRect(visibleRect)) {
      return
    }
    val root = collectAncestors() ?: return
    // Nothing to sample for glass that is hidden or fully transparent.
    if (ancestors.any { it.visibility != View.VISIBLE || it.alpha <= 0f }) {
      return
    }
    if (!computeTargetToRoot(root) || !targetToRoot.invert(rootToTarget)) {
      return
    }

    if (skipUnchanged) {
      computeSampleArea(recordArea)
    }
    node.setPosition(0, 0, width, height)
    val canvas = node.beginRecording(width, height)
    try {
      canvas.concat(rootToTarget)
      drawBehindTarget(canvas)
    } finally {
      node.endRecording()
    }
    if (skipUnchanged) {
      recordedTargetToRoot.set(targetToRoot)
      recordedWidth = width
      recordedHeight = height
      recordedSignature = signatureBehindTarget(DirtyCheck())
    }
  }

  /**
   * Whether the last recording is out of date: the glass moved or resized, a view drawn behind it
   * changed, or a glass behind it (drawn as a stand-in) changed size, tint or shape. Glass that is
   * not on screen keeps its old recording and is refreshed when it shows again.
   */
  private fun changedSinceRecording(): Boolean {
    if (!node.hasDisplayList() || !target.isAttachedToWindow) {
      return true
    }
    if (!target.getGlobalVisibleRect(visibleRect)) {
      // Not drawn: let it record on the first frame it is visible again.
      recordedWidth = -1
      return false
    }
    if (target.width != recordedWidth || target.height != recordedHeight) {
      return true
    }
    val root = collectAncestors() ?: return true
    if (!computeTargetToRoot(root) || targetToRoot != recordedTargetToRoot) {
      return true
    }
    val check = DirtyCheck()
    val signature = signatureBehindTarget(check)
    return check.dirty || signature != recordedSignature
  }

  private class DirtyCheck {
    var dirty = false
    var signature = 17L
    // The area the glass samples, in window coordinates: views outside it cannot change it.
    val area = android.graphics.Rect()

    fun add(value: Long) {
      signature = signature * 31 + value
    }
  }

  /**
   * Walks the views [drawBehindTarget] draws, without drawing: flags any whose content changed
   * since it was last drawn, and hashes what a recording depends on beyond their content
   * (positions, visibility, glass stand-ins). Uses [ancestors] as filled by [collectAncestors].
   */
  private fun signatureBehindTarget(check: DirtyCheck): Long {
    if (ancestors.isEmpty()) collectAncestors()
    computeSampleArea(check.area)
    addBackground(ancestors.firstOrNull() ?: return check.signature, check)
    for (i in 0 until ancestors.size - 1) {
      val group = ancestors[i] as? ViewGroup ?: break
      val next = ancestors[i + 1]
      val glassAncestor = GlassRegistry.isGlass(group)
      if (glassAncestor && group !== target) {
        addGlass(group, check)
      }
      for (child in childrenInDrawingOrder(group)) {
        if (child === next) break
        if (glassAncestor && GlassRegistry.isGlassSurface(group, child)) {
          continue
        }
        checkChild(child, check)
      }
      check.add(next.left.toLong() - group.scrollX)
      check.add(next.top.toLong() - group.scrollY)
      if (next !== target) {
        addBackground(next, check)
      }
    }
    return check.signature
  }

  /** Mirrors [drawChild] and [drawView], for the views that overlap the sampled area. */
  private fun checkChild(child: View, check: DirtyCheck) {
    if (!overlaps(child, check.area)) {
      return
    }
    check.add(System.identityHashCode(child).toLong())
    check.add(child.visibility.toLong())
    check.add(child.alpha.toRawBits().toLong())
    check.add(child.left.toLong())
    check.add(child.top.toLong())
    check.add(child.width.toLong())
    check.add(child.height.toLong())
    check.add(child.scrollX.toLong())
    check.add(child.scrollY.toLong())
    // Matrix.hashCode() is a constant: hash the values.
    if (!child.matrix.isIdentity) {
      child.matrix.getValues(matrixValues)
      for (value in matrixValues) check.add(value.toRawBits().toLong())
    }
    if (child.visibility != View.VISIBLE || child.alpha <= 0f || child.width <= 0 || child.height <= 0) {
      return
    }
    val glass = child is ViewGroup && GlassRegistry.isGlass(child)
    if (child !is ViewGroup || isComposeManaged(child) ||
      (!glass && !GlassRegistry.containsGlass(child))
    ) {
      // Drawn from its own content: changed if it or anything in it was invalidated.
      if (child.isDirty) {
        check.dirty = true
      }
      return
    }
    // Walked into, like drawView: a glass inside is a stand-in, so its own animation (which marks
    // it and its parents changed every frame) does not count, only its size, tint and shape.
    addBackground(child, check)
    if (glass) {
      addGlass(child, check)
    }
    for (grandChild in childrenInDrawingOrder(child)) {
      if (glass && GlassRegistry.isGlassSurface(child, grandChild)) {
        continue
      }
      checkChild(grandChild, check)
    }
  }

  private fun addBackground(view: View, check: DirtyCheck) {
    val background = view.background ?: return
    check.add(System.identityHashCode(background).toLong())
    if (background is android.graphics.drawable.ColorDrawable) {
      check.add(background.color.toLong())
    }
    check.add(background.bounds.hashCode().toLong())
  }

  private fun addGlass(view: View, check: DirtyCheck) {
    val state = (view as? LiquidGlassView)?.glassState ?: return
    check.add((state.tintColor ?: 0).toLong())
    check.add(state.cornerRadius.toRawBits().toLong())
    check.add(state.fadeBottom.toRawBits().toLong())
    check.add(state.glassStyle.hashCode().toLong())
    check.add(state.colorScheme.hashCode().toLong())
  }

  fun discard() {
    node.discardDisplayList()
  }

  /** Fills [ancestors] from the root view down to [target] and returns the root. */
  private fun collectAncestors(): View? {
    ancestors.clear()
    var view: View? = target
    while (view != null) {
      ancestors.add(view)
      view = view.parent as? View
    }
    ancestors.reverse()
    return ancestors.firstOrNull()?.takeIf { it !== target }
  }

  private fun computeTargetToRoot(root: View): Boolean {
    targetToRoot.reset()
    var view: View = target
    while (view !== root) {
      val parent = view.parent as? View ?: return false
      val local = Matrix(view.matrix)
      local.postTranslate((view.left - parent.scrollX).toFloat(), (view.top - parent.scrollY).toFloat())
      targetToRoot.postConcat(local)
      view = parent
    }
    return true
  }

  private fun drawBehindTarget(canvas: Canvas) {
    val saveCount = canvas.save()
    drawBackground(ancestors[0], canvas)

    for (i in 0 until ancestors.size - 1) {
      val group = ancestors[i] as? ViewGroup ?: break
      val next = ancestors[i + 1]

      val glassAncestor = GlassRegistry.isGlass(group)
      if (glassAncestor && group !== target) {
        GlassRegistry.drawSurface(group, canvas)
      }
      for (child in childrenInDrawingOrder(group)) {
        if (child === next) break
        if (glassAncestor && GlassRegistry.isGlassSurface(group, child)) {
          continue
        }
        drawChild(group, child, canvas)
      }

      canvas.translate((next.left - group.scrollX).toFloat(), (next.top - group.scrollY).toFloat())
      if (!next.matrix.isIdentity) {
        canvas.concat(next.matrix)
      }
      if (next !== target) {
        drawBackground(next, canvas)
      }
    }

    canvas.restoreToCount(saveCount)
  }

  private fun drawChild(parent: ViewGroup, child: View, canvas: Canvas) {
    if (child.visibility != View.VISIBLE || child.alpha <= 0f || child.width <= 0 || child.height <= 0) {
      return
    }
    // Views away from the glass are left out: they cannot show in it, and a recording that
    // referenced them would make the GPU redo this glass's blur whenever they change.
    if (skipUnchanged && !overlaps(child, recordArea)) {
      return
    }

    val saveCount = canvas.save()
    canvas.translate((child.left - parent.scrollX).toFloat(), (child.top - parent.scrollY).toFloat())
    if (!child.matrix.isIdentity) {
      canvas.concat(child.matrix)
    }
    if (child.alpha < 1f) {
      canvas.saveLayerAlpha(null, (child.alpha * 255).toInt())
    }
    if (!drawChildContent(parent, child, canvas)) {
      childPaint(parent, child)?.let { canvas.saveLayer(null, it) }
      drawView(child, canvas)
    }
    canvas.restoreToCount(saveCount)
  }

  /**
   * Draws [view] in its own coordinates. Content without glass uses the view's display list. Glass
   * is drawn as a flat stand-in, so a backdrop never renders another backdrop: the cost stays
   * linear in the number of glass views instead of exponential.
   */
  private fun drawView(view: View, canvas: Canvas) {
    val glass = view is ViewGroup && GlassRegistry.isGlass(view)
    // Only walk into plain view groups. Views laid out by Compose (e.g. react-native-pager-view)
    // position their children while drawing, so they must draw themselves.
    if (view !is ViewGroup || isComposeManaged(view) ||
      (!glass && !GlassRegistry.containsGlass(view))
    ) {
      // Like View.updateDisplayListIfDirty: content is drawn shifted by the view's own scroll, so
      // a scrolled list shows what is on screen instead of its top.
      if (view.scrollX != 0 || view.scrollY != 0) {
        val saveCount = canvas.save()
        canvas.translate(-view.scrollX.toFloat(), -view.scrollY.toFloat())
        canvas.clipRect(view.scrollX, view.scrollY, view.scrollX + view.width, view.scrollY + view.height)
        view.draw(canvas)
        canvas.restoreToCount(saveCount)
      } else {
        view.draw(canvas)
      }
      return
    }

    drawBackground(view, canvas)
    if (glass) {
      GlassRegistry.drawSurface(view, canvas)
    }
    val saveCount = canvas.save()
    if (view.clipChildren) {
      canvas.clipRect(0, 0, view.width, view.height)
    }
    for (child in childrenInDrawingOrder(view)) {
      if (glass && GlassRegistry.isGlassSurface(view, child)) {
        continue
      }
      drawChild(view, child, canvas)
    }
    canvas.restoreToCount(saveCount)
  }

  private fun drawBackground(view: View, canvas: Canvas) {
    val background = view.background ?: return
    if (background.bounds.isEmpty) {
      background.setBounds(0, 0, view.width, view.height)
    }
    if (view.scrollX == 0 && view.scrollY == 0) {
      background.draw(canvas)
    } else {
      canvas.translate(view.scrollX.toFloat(), view.scrollY.toFloat())
      background.draw(canvas)
      canvas.translate(-view.scrollX.toFloat(), -view.scrollY.toFloat())
    }
  }

  private companion object {
    const val UNIT = 1000f
    /** How far past its frame a glass may sample (lens, morph), in dp. */
    const val SAMPLE_MARGIN_DP = 40f

    /** Backdrops that have recorded, checked together once per frame (see [record]). */
    val live: MutableSet<ViewTreeBackdrop> = java.util.Collections.newSetFromMap(java.util.WeakHashMap())
    var checkedFrame = -1L

    fun isComposeManaged(view: View): Boolean = view.javaClass.name.startsWith("androidx.compose.")
  }

  /** Mirrors the order used by [ViewGroup.dispatchDraw]: custom drawing order, then Z. */
  private fun childrenInDrawingOrder(group: ViewGroup): List<View> {
    val count = group.childCount
    val children = ArrayList<View>(count)
    for (i in 0 until count) {
      val index = group.getChildDrawingOrder(i).takeIf { it in 0 until count } ?: i
      group.getChildAt(index)?.let(children::add)
    }
    children.sortBy { it.z }
    return children
  }
}
