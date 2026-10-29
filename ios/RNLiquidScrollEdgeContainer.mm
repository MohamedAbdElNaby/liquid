#import "RNLiquidScrollEdgeContainer.h"

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static BOOL RNLiquidIsVisible(UIView *view)
{
  for (UIView *v = view; v != nil; v = v.superview) {
    if (v.hidden || v.alpha < 0.01) {
      return NO;
    }
  }
  return view.window != nil;
}

@implementation RNLiquidScrollEdgeContainer {
  id _interaction;
  BOOL _extend;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidScrollEdgeContainerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidScrollEdgeContainerProps>();
    _props = defaultProps;
    _extend = YES;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<RNLiquidScrollEdgeContainerProps const>(props);
  // Only while a screen shows a header (screenKey set).
  _extend = newViewProps.extendScrollEdge && !newViewProps.screenKey.empty();
  [super updateProps:props oldProps:oldProps];
  [self scheduleResolve];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self scheduleResolve];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self scheduleResolve];
}

/// The new screen's scroll view mounts around the same time as the header
/// update, and lists can appear a little later: look now and once more after.
- (void)scheduleResolve
{
  __weak RNLiquidScrollEdgeContainer *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf resolveScrollView];
  });
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.4 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    [weakSelf resolveScrollView];
  });
}

/// The largest visible, vertically scrolling scroll view under this container.
- (UIScrollView *)findScrollView
{
  UIWindow *window = self.window;
  if (window == nil) {
    return nil;
  }
  CGRect area = [self convertRect:self.bounds toView:window];
  __block UIScrollView *best = nil;
  __block CGFloat bestArea = 0;
  __block void (^visit)(UIView *) = nil;
  __weak __block void (^weakVisit)(UIView *) = nil;
  visit = ^(UIView *view) {
    if (view == self || view.hidden || view.alpha < 0.01) {
      return;
    }
    if ([view isKindOfClass:[UIScrollView class]]) {
      UIScrollView *scrollView = (UIScrollView *)view;
      CGRect frame = [scrollView convertRect:scrollView.bounds toView:window];
      BOOL horizontalOnly = scrollView.contentSize.width > scrollView.bounds.size.width + 1 &&
          scrollView.contentSize.height <= scrollView.bounds.size.height + 1;
      if (!horizontalOnly && CGRectIntersectsRect(frame, area) && RNLiquidIsVisible(scrollView)) {
        CGFloat size = frame.size.width * frame.size.height;
        // Later (frontmost) wins ties: a pushed screen sits above the last one.
        if (size >= bestArea) {
          best = scrollView;
          bestArea = size;
        }
      }
    }
    for (UIView *subview in view.subviews) {
      weakVisit(subview);
    }
  };
  weakVisit = visit;
  visit(window);
  return best;
}

- (void)resolveScrollView
{
  if (@available(iOS 26.0, *)) {
    UIScrollView *scrollView = _extend ? [self findScrollView] : nil;
    UIScrollEdgeElementContainerInteraction *current = _interaction;
    if (current.scrollView == scrollView && (current != nil) == (scrollView != nil)) {
      return;
    }
    // UIKit reads the scroll view when the interaction is added (as in Apple's
    // example), so a new scroll view means a new interaction.
    if (current != nil) {
      [self removeInteraction:current];
      _interaction = nil;
    }
    if (scrollView != nil) {
      UIScrollEdgeElementContainerInteraction *interaction = [UIScrollEdgeElementContainerInteraction new];
      interaction.scrollView = scrollView;
      interaction.edge = UIRectEdgeTop;
      [self addInteraction:interaction];
      _interaction = interaction;
    }
  }
}

@end
