package com.mohamedabdelnaby.reactnativeliquid

import android.view.View
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/**
 * Extends [ReactViewManager] so the glass view supports every regular `View` prop (overflow,
 * borders, pointerEvents, hitSlop, ...). Glass props are set through [ReactProp] setters.
 */
@ReactModule(name = LiquidGlassViewManager.NAME)
class LiquidGlassViewManager : ReactViewManager() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = LiquidGlassView(context)

  override fun onDropViewInstance(view: ReactViewGroup) {
    (view as? LiquidGlassView)?.dispose()
    super.onDropViewInstance(view)
  }

  // The ComposeView hosting the glass is a private child at index 0.

  override fun addView(parent: ReactViewGroup, child: View, index: Int) {
    parent.addView(child, index + reserved(parent))
  }

  override fun getChildCount(parent: ReactViewGroup): Int = parent.childCount - reserved(parent)

  override fun getChildAt(parent: ReactViewGroup, index: Int): View? =
    parent.getChildAt(index + reserved(parent))

  override fun removeViewAt(parent: ReactViewGroup, index: Int) {
    parent.removeViewAt(index + reserved(parent))
  }

  override fun removeAllViews(parent: ReactViewGroup) {
    val reserved = reserved(parent)
    while (parent.childCount > reserved) {
      parent.removeViewAt(parent.childCount - 1)
    }
  }

  // Clipped subviews would bypass the index offset above.
  override fun setRemoveClippedSubviews(view: ReactViewGroup, removeClippedSubviews: Boolean) = Unit

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: ReactViewGroup, value: String?) {
    view.glass { glassStyle = value ?: "regular" }
  }

  @ReactProp(name = "glassTintColor", customType = "Color")
  fun setGlassTintColor(view: ReactViewGroup, value: Int?) {
    view.glass { tintColor = value }
  }

  @ReactProp(name = "interactive")
  fun setInteractive(view: ReactViewGroup, value: Boolean) {
    view.glass { interactive = value }
  }

  @ReactProp(name = "fadeBottom")
  fun setFadeBottom(view: ReactViewGroup, value: Float) {
    view.glass { fadeBottom = value }
  }

  @ReactProp(name = "fadeCurve")
  fun setFadeCurve(view: ReactViewGroup, value: String?) {
    view.glass { fadeEase = value == "ease" }
  }

  @ReactProp(name = "morph")
  fun setMorph(view: ReactViewGroup, value: Boolean) {
    view.glass { morph = value }
  }

  @ReactProp(name = "cornerRadius", defaultFloat = 0f)
  fun setCornerRadius(view: ReactViewGroup, value: Float) {
    view.glass { cornerRadius = value }
  }

  @ReactProp(name = "colorScheme")
  fun setColorScheme(view: ReactViewGroup, value: String?) {
    view.glass { colorScheme = value ?: "system" }
  }

  @ReactProp(name = "blurRadius", defaultFloat = 3f)
  fun setBlurRadius(view: ReactViewGroup, value: Float) {
    view.glass { blurRadius = value }
  }

  @ReactProp(name = "refractionHeight", defaultFloat = 12f)
  fun setRefractionHeight(view: ReactViewGroup, value: Float) {
    view.glass { refractionHeight = value }
  }

  @ReactProp(name = "refractionAmount", defaultFloat = 24f)
  fun setRefractionAmount(view: ReactViewGroup, value: Float) {
    view.glass { refractionAmount = value }
  }

  @ReactProp(name = "chromaticAberration")
  fun setChromaticAberration(view: ReactViewGroup, value: Boolean) {
    view.glass { chromaticAberration = value }
  }

  @ReactProp(name = "depthEffect")
  fun setDepthEffect(view: ReactViewGroup, value: Boolean) {
    view.glass { depthEffect = value }
  }

  @ReactProp(name = "rimColor", customType = "Color")
  fun setRimColor(view: ReactViewGroup, value: Int?) {
    view.glass { rimColor = value }
  }

  @ReactProp(name = "rimShadeColor", customType = "Color")
  fun setRimShadeColor(view: ReactViewGroup, value: Int?) {
    view.glass { rimShadeColor = value }
  }

  @ReactProp(name = "rimEdgeColor", customType = "Color")
  fun setRimEdgeColor(view: ReactViewGroup, value: Int?) {
    view.glass { rimEdgeColor = value }
  }

  @ReactProp(name = "specularEdge")
  fun setSpecularEdge(view: ReactViewGroup, value: Boolean) {
    view.glass { specularEdge = value }
  }

  @ReactProp(name = "specularTopOpacity", defaultFloat = 0.95f)
  fun setSpecularTopOpacity(view: ReactViewGroup, value: Float) {
    view.glass { specularTopOpacity = value }
  }

  @ReactProp(name = "specularBottomOpacity", defaultFloat = 0.95f)
  fun setSpecularBottomOpacity(view: ReactViewGroup, value: Float) {
    view.glass { specularBottomOpacity = value }
  }

  @ReactProp(name = "specularHairlineOpacity", defaultFloat = 1f)
  fun setSpecularHairlineOpacity(view: ReactViewGroup, value: Float) {
    view.glass { specularHairlineOpacity = value }
  }

  @ReactProp(name = "specularGlowHeight", defaultFloat = 0.16f)
  fun setSpecularGlowHeight(view: ReactViewGroup, value: Float) {
    view.glass { specularGlowHeight = value }
  }

  @ReactProp(name = "specularBottomHeight", defaultFloat = 0.07f)
  fun setSpecularBottomHeight(view: ReactViewGroup, value: Float) {
    view.glass { specularBottomHeight = value }
  }

  @ReactProp(name = "cornerReflection", defaultFloat = 0f)
  fun setCornerReflection(view: ReactViewGroup, value: Float) {
    view.glass { cornerReflection = value }
  }

  @ReactProp(name = "backdropBlur", defaultFloat = 0f)
  fun setBackdropBlur(view: ReactViewGroup, value: Float) {
    view.glass { backdropBlur = value }
  }

  @ReactProp(name = "rimGradient")
  fun setRimGradient(view: ReactViewGroup, value: String?) {
    view.glass { rimGradient = value ?: "diagonal" }
  }

  @ReactProp(name = "rimWidth", defaultFloat = 1f)
  fun setRimWidth(view: ReactViewGroup, value: Float) {
    view.glass { rimWidth = value }
  }

  @ReactProp(name = "highlight", defaultBoolean = true)
  fun setHighlight(view: ReactViewGroup, value: Boolean) {
    view.glass { highlight = value }
  }

  @ReactProp(name = "shadow", defaultBoolean = true)
  fun setShadow(view: ReactViewGroup, value: Boolean) {
    view.glass { shadow = value }
  }

  private fun reserved(parent: ReactViewGroup): Int =
    if (parent is LiquidGlassView) LiquidGlassView.RESERVED_CHILDREN else 0

  private inline fun ReactViewGroup.glass(block: GlassState.() -> Unit) {
    (this as? LiquidGlassView)?.glassState?.block()
  }

  companion object {
    const val NAME = "RNLiquidGlassView"
  }
}
