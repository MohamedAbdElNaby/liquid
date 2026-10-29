#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

/// A blur that is strongest at the top and weakens down the view, with an
/// optional tint fading out with it: the iOS 26 scroll edge behind a bar
/// (Photos, Telegram). Uses Core Animation's variable blur, falling back to
/// an even blur that fades out where it is unavailable.
@interface RNLiquidProgressiveBlur : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
