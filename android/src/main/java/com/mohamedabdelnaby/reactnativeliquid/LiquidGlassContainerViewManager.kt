package com.mohamedabdelnaby.reactnativeliquid

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/**
 * Glass shapes cannot merge on Android, so the container behaves like a regular view. It exists
 * so the same component tree renders on both platforms.
 */
@ReactModule(name = LiquidGlassContainerViewManager.NAME)
class LiquidGlassContainerViewManager : ReactViewManager() {

  override fun getName(): String = NAME

  @Suppress("UNUSED_PARAMETER")
  @ReactProp(name = "spacing", defaultFloat = 0f)
  fun setSpacing(view: ReactViewGroup, value: Float) = Unit

  companion object {
    const val NAME = "RNLiquidGlassContainerView"
  }
}
