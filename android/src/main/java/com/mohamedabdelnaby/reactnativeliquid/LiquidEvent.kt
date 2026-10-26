package com.mohamedabdelnaby.reactnativeliquid

import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event

/** A direct event sent from a Liquid view to its `on...` React prop. */
internal class LiquidEvent(
  surfaceId: Int,
  viewId: Int,
  private val name: String,
  private val payload: WritableMap,
) : Event<LiquidEvent>(surfaceId, viewId) {

  override fun getEventName(): String = name

  override fun getEventData(): WritableMap = payload

  override fun canCoalesce(): Boolean = false
}

/** Dispatches `top<Name>` to the `on<Name>` prop of [view]. */
internal fun View.dispatchLiquidEvent(name: String, build: WritableMap.() -> Unit) {
  val reactContext = context as? ReactContext ?: return
  val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
  val surfaceId = UIManagerHelper.getSurfaceId(this)
  dispatcher.dispatchEvent(LiquidEvent(surfaceId, id, "top$name", Arguments.createMap().apply(build)))
}

/** Direct event registrations for the given `on<Name>` props. */
internal fun directEvents(vararg names: String): Map<String, Any> =
  names.associate { "top$it" to mapOf("registrationName" to "on$it") }
