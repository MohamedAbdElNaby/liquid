package com.mohamedabdelnaby.reactnativeliquid

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class ReactNativeLiquidViewPackage : BaseReactPackage() {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return listOf(
      LiquidGlassViewManager(),
      LiquidGlassContainerViewManager(),
      LiquidSwitchViewManager(),
      LiquidSliderViewManager(),
      LiquidTabBarViewManager(),
      LiquidMenuViewManager(),
      LiquidSearchViewManager(),
      LiquidScrollEdgeViewManager(),
      LiquidScrollEdgeContainerViewManager(),
    )
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
