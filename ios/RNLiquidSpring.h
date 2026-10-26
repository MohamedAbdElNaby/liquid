#pragma once

#include <cmath>

// A damped spring integrated per display frame. Mirrors Compose's
// `spring(dampingRatio, stiffness)` (mass 1) so iOS and Android animations
// share the same feel.
struct RNLiquidSpring {
  double value = 0;
  double velocity = 0;
  double target = 0;
  double dampingRatio = 1;
  double stiffness = 1000;
  double threshold = 0.001;

  RNLiquidSpring() = default;
  RNLiquidSpring(double dampingRatio, double stiffness, double threshold)
      : dampingRatio(dampingRatio), stiffness(stiffness), threshold(threshold)
  {
  }

  void snap(double newValue)
  {
    value = newValue;
    target = newValue;
    velocity = 0;
  }

  bool isAtRest() const
  {
    return value == target && velocity == 0;
  }

  /// Advances the spring by `dt` seconds. Returns true while it is moving.
  bool step(double dt)
  {
    if (isAtRest()) {
      return false;
    }
    // Sub-steps keep stiff springs stable on 60 Hz frames.
    const int substeps = 8;
    const double h = dt / substeps;
    const double damping = 2 * dampingRatio * std::sqrt(stiffness);
    for (int i = 0; i < substeps; i++) {
      double acceleration = -stiffness * (value - target) - damping * velocity;
      velocity += acceleration * h;
      value += velocity * h;
    }
    if (std::fabs(value - target) < threshold && std::fabs(velocity) < threshold * 10) {
      value = target;
      velocity = 0;
      return false;
    }
    return true;
  }
};
