#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/// Hosts its React children inside a `UIVisualEffectView` that uses the
/// native Liquid Glass material (`UIGlassEffect`) on iOS 26 and later and a
/// system material blur on earlier versions.
@interface RNLiquidGlassView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
