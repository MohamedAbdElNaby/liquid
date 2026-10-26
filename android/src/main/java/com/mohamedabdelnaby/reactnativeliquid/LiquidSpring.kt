package com.mohamedabdelnaby.reactnativeliquid

import kotlin.math.abs
import kotlin.math.sqrt

/**
 * A damped spring stepped once per frame. Same parameters as Compose's
 * `spring(dampingRatio, stiffness)` and the iOS implementation, so both platforms move alike.
 */
internal class LiquidSpring(
  private val dampingRatio: Float,
  var stiffness: Float,
  private val threshold: Float,
) {
  var value = 0f
  var velocity = 0f
  var target = 0f

  val isAtRest: Boolean
    get() = value == target && velocity == 0f

  fun snap(newValue: Float) {
    value = newValue
    target = newValue
    velocity = 0f
  }

  /** Advances by [dt] seconds and returns true while moving. */
  fun step(dt: Float): Boolean {
    if (isAtRest) {
      return false
    }
    val substeps = 8
    val h = dt / substeps
    val damping = 2f * dampingRatio * sqrt(stiffness)
    repeat(substeps) {
      val acceleration = -stiffness * (value - target) - damping * velocity
      velocity += acceleration * h
      value += velocity * h
    }
    if (abs(value - target) < threshold && abs(velocity) < threshold * 10f) {
      value = target
      velocity = 0f
      return false
    }
    return true
  }
}
