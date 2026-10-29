package com.mohamedabdelnaby.reactnativeliquid

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/**
 * Android has no scroll edge effect to extend, so the header container behaves like a regular
 * view. It exists so the same component tree renders on both platforms.
 */
@ReactModule(name = LiquidScrollEdgeContainerViewManager.NAME)
class LiquidScrollEdgeContainerViewManager : ReactViewManager() {

  override fun getName(): String = NAME

  @Suppress("UNUSED_PARAMETER")
  @ReactProp(name = "extendScrollEdge", defaultBoolean = true)
  fun setExtendScrollEdge(view: ReactViewGroup, value: Boolean) = Unit

  @Suppress("UNUSED_PARAMETER")
  @ReactProp(name = "screenKey")
  fun setScreenKey(view: ReactViewGroup, value: String?) = Unit

  companion object {
    const val NAME = "RNLiquidScrollEdgeContainer"
  }
}
