#import "RNLiquidGlassContainerView.h"

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation RNLiquidGlassContainerView {
  UIVisualEffectView *_effectView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidGlassContainerViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidGlassContainerViewProps>();
    _props = defaultProps;

    _effectView = [[UIVisualEffectView alloc] initWithEffect:nil];
    if (@available(iOS 26.0, *)) {
      _effectView.effect = [UIGlassContainerEffect new];
    }
    self.contentView = _effectView;
  }

  return self;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [_effectView.contentView insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
}

#pragma mark - Layout

// The default content frame excludes padding and borders. The effect view has
// to cover the whole component because children are laid out relative to it.
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _effectView.frame = self.bounds;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<RNLiquidGlassContainerViewProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<RNLiquidGlassContainerViewProps const>(props);

  if (oldViewProps.spacing != newViewProps.spacing) {
    if (@available(iOS 26.0, *)) {
      UIGlassContainerEffect *effect = [UIGlassContainerEffect new];
      effect.spacing = newViewProps.spacing;
      _effectView.effect = effect;
    }
  }

  [super updateProps:props oldProps:oldProps];
}

@end
