#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/// A plain container (children mount into it like a View) that, on iOS 26,
/// carries a `UIScrollEdgeElementContainerInteraction` for the scroll view under
/// it: the system scroll edge effect then reaches down behind the container,
/// as it does behind a navigation bar.
@interface RNLiquidScrollEdgeContainer : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
