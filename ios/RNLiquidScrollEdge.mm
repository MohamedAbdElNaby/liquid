#import "RNLiquidScrollEdge.h"

#import <objc/runtime.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

/// Mounted views that ask to hide the edge; the effect is hidden while any is in a window.
static NSHashTable<RNLiquidScrollEdge *> *RNLiquidScrollEdgeViews(void)
{
  static NSHashTable *views;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    views = [NSHashTable weakObjectsHashTable];
  });
  return views;
}

static BOOL gTopEdgeHidden = NO;

static void RNLiquidApplyTopEdge(UIScrollView *scrollView)
{
  if (@available(iOS 26.0, *)) {
    scrollView.topEdgeEffect.hidden = gTopEdgeHidden;
  }
}

static void RNLiquidApplyTopEdgeInView(UIView *view)
{
  if ([view isKindOfClass:[UIScrollView class]]) {
    RNLiquidApplyTopEdge((UIScrollView *)view);
  }
  for (UIView *subview in view.subviews) {
    RNLiquidApplyTopEdgeInView(subview);
  }
}

// Scroll views that appear later (a pushed screen, a lazy list) follow the
// current setting as soon as they join a window. `didMoveToWindow` is only
// inherited from UIView, so the override is added to UIScrollView itself
// (exchanging implementations would swap UIView's and break every view).
static void RNLiquidSwizzleScrollViews(void)
{
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    Class cls = [UIScrollView class];
    SEL selector = @selector(didMoveToWindow);
    Method method = class_getInstanceMethod(cls, selector);
    typedef void (*DidMoveToWindow)(id, SEL);
    DidMoveToWindow original = (DidMoveToWindow)method_getImplementation(method);
    IMP override = imp_implementationWithBlock(^(UIScrollView *scrollView) {
      original(scrollView, selector);
      if (scrollView.window != nil) {
        RNLiquidApplyTopEdge(scrollView);
      }
    });
    if (!class_addMethod(cls, selector, override, method_getTypeEncoding(method))) {
      method_setImplementation(method, override);
    }
  });
}

@implementation RNLiquidScrollEdge {
  BOOL _hideTopEdge;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidScrollEdgeComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidScrollEdgeProps>();
    _props = defaultProps;
    self.userInteractionEnabled = NO;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<RNLiquidScrollEdgeProps const>(props);
  _hideTopEdge = newViewProps.hideTopEdge;
  [super updateProps:props oldProps:oldProps];
  [self update];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self update];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _hideTopEdge = NO;
  [self update];
}

- (void)update
{
  NSHashTable *views = RNLiquidScrollEdgeViews();
  if (_hideTopEdge && self.window != nil) {
    [views addObject:self];
  } else {
    [views removeObject:self];
  }

  BOOL hidden = views.allObjects.count > 0;
  if (hidden == gTopEdgeHidden) {
    return;
  }
  gTopEdgeHidden = hidden;
  RNLiquidSwizzleScrollViews();
  // Apply to the scroll views already on screen.
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:[UIWindowScene class]]) {
      continue;
    }
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      RNLiquidApplyTopEdgeInView(window);
    }
  }
}

@end
