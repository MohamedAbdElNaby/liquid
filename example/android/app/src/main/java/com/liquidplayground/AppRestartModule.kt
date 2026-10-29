package com.liquidplayground

import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * Relaunches the app. React Native applies a new layout direction
 * (I18nManager.forceRTL) only when the app starts, so the direction switch
 * restarts it instead of asking the user to.
 */
class AppRestartModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName() = NAME

  @ReactMethod
  fun restart() {
    val context = reactApplicationContext
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    // I18nManager saves the direction with SharedPreferences.apply(), which writes in the
    // background. Give it time to land before the process exits.
    Handler(Looper.getMainLooper()).postDelayed({
      context.startActivity(Intent.makeRestartActivityTask(launch.component))
      Runtime.getRuntime().exit(0)
    }, 400)
  }

  companion object {
    const val NAME = "AppRestart"
  }
}

class AppRestartPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(AppRestartModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
