package com.mohamedabdelnaby.reactnativeliquid

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/**
 * Android has no scroll edge effect under the status bar like iOS 26, so there is nothing to
 * hide. It exists so `LiquidHeaderProvider scrollEdgeEffect={false}` renders on both platforms.
 */
@ReactModule(name = LiquidScrollEdgeViewManager.NAME)
class LiquidScrollEdgeViewManager : ReactViewManager() {

  override fun getName(): String = NAME

  @Suppress("UNUSED_PARAMETER")
  @ReactProp(name = "hideTopEdge", defaultBoolean = false)
  fun setHideTopEdge(view: ReactViewGroup, value: Boolean) = Unit

  companion object {
    const val NAME = "RNLiquidScrollEdge"
  }
}
