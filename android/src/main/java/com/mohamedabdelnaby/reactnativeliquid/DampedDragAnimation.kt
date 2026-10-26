// Adapted from the AndroidLiquidGlass catalog by Kyant0
// (https://github.com/Kyant0/AndroidLiquidGlass), Apache License 2.0.

package com.mohamedabdelnaby.reactnativeliquid

import android.os.SystemClock
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.MutatorMutex
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.PointerInputChange
import androidx.compose.ui.input.pointer.PointerInputScope
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.unit.IntSize
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.drag
import androidx.compose.ui.input.pointer.PointerEventPass
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.android.awaitFrame
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlin.math.abs

/**
 * Spring physics for glass that is pressed and dragged: a value that follows the finger, a press
 * progress that lifts the glass, an anisotropic scale and a velocity used to stretch the glass
 * along its motion. On release the glass only settles once the value has (almost) arrived.
 */
internal class DampedDragAnimation(
  private val animationScope: CoroutineScope,
  initialValue: Float,
  val valueRange: ClosedRange<Float>,
  visibilityThreshold: Float,
  val initialScale: Float,
  val pressedScale: Float,
  val onDragStarted: DampedDragAnimation.(position: Offset) -> Unit,
  val onDragStopped: DampedDragAnimation.() -> Unit,
  val onDrag: DampedDragAnimation.(size: IntSize, dragAmount: Offset) -> Unit,
) {

  private val valueAnimationSpec = spring(1f, 1000f, visibilityThreshold)
  private val velocityAnimationSpec = spring(0.5f, 300f, visibilityThreshold * 10f)
  private val pressProgressAnimationSpec = spring(1f, 1000f, 0.001f)
  private val scaleXAnimationSpec = spring(0.6f, 250f, 0.001f)
  private val scaleYAnimationSpec = spring(0.7f, 250f, 0.001f)

  private val valueAnimation = Animatable(initialValue, visibilityThreshold)
  private val velocityAnimation = Animatable(0f, 5f)
  private val pressProgressAnimation = Animatable(0f, 0.001f)
  private val scaleXAnimation = Animatable(initialScale, 0.001f)
  private val scaleYAnimation = Animatable(initialScale, 0.001f)

  private val mutatorMutex = MutatorMutex()
  private val velocityTracker = VelocityTracker()

  val value: Float get() = valueAnimation.value
  val progress: Float get() = (value - valueRange.start) / (valueRange.endInclusive - valueRange.start)
  val targetValue: Float get() = valueAnimation.targetValue
  val pressProgress: Float get() = pressProgressAnimation.value
  val scaleX: Float get() = scaleXAnimation.value
  val scaleY: Float get() = scaleYAnimation.value
  val velocity: Float get() = velocityAnimation.value

  val modifier: Modifier = Modifier.pointerInput(Unit) {
    inspectDragGestures(
      onDragStart = { down ->
        onDragStarted(down.position)
        press()
      },
      onDragEnd = {
        onDragStopped()
        release()
      },
      onDragCancel = {
        onDragStopped()
        release()
      },
    ) { _, dragAmount ->
      onDrag(size, dragAmount)
    }
  }

  fun press() {
    velocityTracker.resetTracking()
    animationScope.launch {
      launch { pressProgressAnimation.animateTo(1f, pressProgressAnimationSpec) }
      launch { scaleXAnimation.animateTo(pressedScale, scaleXAnimationSpec) }
      launch { scaleYAnimation.animateTo(pressedScale, scaleYAnimationSpec) }
    }
  }

  fun release() {
    animationScope.launch {
      awaitFrame()
      if (value != targetValue) {
        val threshold = (valueRange.endInclusive - valueRange.start) * 0.025f
        snapshotFlow { valueAnimation.value }
          .filter { abs(it - valueAnimation.targetValue) < threshold }
          .first()
      }
      launch { pressProgressAnimation.animateTo(0f, pressProgressAnimationSpec) }
      launch { scaleXAnimation.animateTo(initialScale, scaleXAnimationSpec) }
      launch { scaleYAnimation.animateTo(initialScale, scaleYAnimationSpec) }
    }
  }

  fun updateValue(value: Float) {
    val targetValue = value.coerceIn(valueRange)
    animationScope.launch {
      launch { valueAnimation.animateTo(targetValue, valueAnimationSpec) { updateVelocity() } }
    }
  }

  fun snapToValue(value: Float) {
    animationScope.launch { valueAnimation.snapTo(value.coerceIn(valueRange)) }
  }

  fun animateToValue(value: Float) {
    animationScope.launch {
      mutatorMutex.mutate {
        press()
        val targetValue = value.coerceIn(valueRange)
        launch { valueAnimation.animateTo(targetValue, valueAnimationSpec) { updateVelocity() } }
        if (velocity != 0f) {
          launch { velocityAnimation.animateTo(0f, velocityAnimationSpec) }
        }
        release()
      }
    }
  }

  private fun updateVelocity() {
    velocityTracker.addPosition(SystemClock.uptimeMillis(), Offset(value, 0f))
    val targetVelocity =
      velocityTracker.calculateVelocity().x / (valueRange.endInclusive - valueRange.start)
    animationScope.launch { velocityAnimation.animateTo(targetVelocity, velocityAnimationSpec) }
  }
}

/** Reports every pointer movement of a gesture, starting at the first down. */
internal suspend fun PointerInputScope.inspectDragGestures(
  onDragStart: (down: PointerInputChange) -> Unit = {},
  onDragEnd: (change: PointerInputChange) -> Unit = {},
  onDragCancel: () -> Unit = {},
  onDrag: (change: PointerInputChange, dragAmount: Offset) -> Unit,
) {
  awaitEachGesture {
    val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
    onDragStart(down)
    onDrag(down, Offset.Zero)
    var last: PointerInputChange? = null
    val completed = drag(down.id) { change ->
      last = change
      onDrag(change, change.positionChange())
    }
    if (completed) {
      onDragEnd(last ?: down)
    } else {
      onDragCancel()
    }
  }
}
