#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/// An empty view that, while mounted with `hideTopEdge`, hides the iOS 26
/// top scroll edge effect on every `UIScrollView` in the app (existing ones
/// and ones added later), and restores it once no such view is left.
@interface RNLiquidScrollEdge : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
