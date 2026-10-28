package com.mohamedabdelnaby.reactnativeliquid

import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RecordingCanvas
import android.graphics.RenderNode
import android.os.Build
import android.view.View
import android.view.ViewGroup
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
) : Backdrop {

  private val node = RenderNode("LiquidGlassBackdrop").apply { setClipToBounds(false) }
  private val targetToRoot = Matrix()
  private val rootToTarget = Matrix()
  private val ancestors = ArrayList<View>()

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

  /** Records what is currently drawn behind [target], in the target's local coordinates. */
  fun record() {
    val width = target.width
    val height = target.height
    if (width <= 0 || height <= 0 || !target.isAttachedToWindow || !enabled()) {
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

    node.setPosition(0, 0, width, height)
    val canvas = node.beginRecording(width, height)
    try {
      canvas.concat(rootToTarget)
      drawBehindTarget(canvas)
    } finally {
      node.endRecording()
    }
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
