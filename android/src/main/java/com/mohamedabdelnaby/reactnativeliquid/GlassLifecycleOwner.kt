package com.mohamedabdelnaby.reactnativeliquid

import android.view.View
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

/**
 * Lifecycle for the ComposeView inside a glass view.
 *
 * Without it, Compose binds to the nearest view tree owner, which inside react-native-screens is
 * the screen Fragment's view lifecycle. That lifecycle is destroyed whenever a screen is detached
 * (switching tabs, pushing a screen), which disposes the glass for good. This owner instead lives
 * as long as the React view: started while attached and destroyed when React drops the view.
 */
internal class GlassLifecycleOwner : LifecycleOwner, SavedStateRegistryOwner {

  private val registry = LifecycleRegistry(this)
  private val savedStateController = SavedStateRegistryController.create(this)

  override val lifecycle: Lifecycle
    get() = registry

  override val savedStateRegistry: SavedStateRegistry
    get() = savedStateController.savedStateRegistry

  init {
    savedStateController.performAttach()
    savedStateController.performRestore(null)
    registry.currentState = Lifecycle.State.CREATED
  }

  fun install(view: View) {
    view.setViewTreeLifecycleOwner(this)
    view.setViewTreeSavedStateRegistryOwner(this)
  }

  fun onAttached() {
    if (registry.currentState != Lifecycle.State.DESTROYED) {
      registry.currentState = Lifecycle.State.RESUMED
    }
  }

  fun onDetached() {
    if (registry.currentState != Lifecycle.State.DESTROYED) {
      registry.currentState = Lifecycle.State.CREATED
    }
  }

  fun destroy() {
    registry.currentState = Lifecycle.State.DESTROYED
  }
}
