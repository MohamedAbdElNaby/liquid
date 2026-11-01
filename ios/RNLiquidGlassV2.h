#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/// The v2 glass material. iOS 26+: the system `UIGlassEffect` only (its own
/// edge, specular and shadow), tinted for prominent buttons. Earlier iOS: a
/// system material blur with a hairline and a soft top highlight. With Reduce
/// Transparency (system setting or `reduceTransparency="on"`) it draws an
/// opaque fill in the same shape.
@interface RNLiquidGlassV2 : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
