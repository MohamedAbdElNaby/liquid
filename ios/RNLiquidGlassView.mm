#import "RNLiquidGlassView.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@implementation RNLiquidGlassView {
  UIVisualEffectView *_effectView;
  CGFloat _cornerRadius;
  BOOL _morph;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidGlassViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidGlassViewProps>();
    _props = defaultProps;

    _effectView = [[UIVisualEffectView alloc] initWithEffect:nil];
    self.contentView = _effectView;

    [self applyEffectWithProps:*defaultProps];
  }

  return self;
}

#pragma mark - Children

// Children are mounted into the effect view's content view so they render on
// top of the glass and so touches reach the interactive glass.
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [_effectView.contentView insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
}

#pragma mark - Props

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<RNLiquidGlassViewProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<RNLiquidGlassViewProps const>(props);

  if (oldViewProps.glassStyle != newViewProps.glassStyle ||
      oldViewProps.glassTintColor != newViewProps.glassTintColor ||
      oldViewProps.interactive != newViewProps.interactive ||
      oldViewProps.colorScheme != newViewProps.colorScheme) {
    [self applyEffectWithProps:newViewProps];
  }

  _morph = newViewProps.morph;

  if (oldViewProps.cornerRadius != newViewProps.cornerRadius) {
    _cornerRadius = newViewProps.cornerRadius;
    [self applyCornerRadius];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)applyEffectWithProps:(RNLiquidGlassViewProps const &)props
{
  switch (props.colorScheme) {
    case RNLiquidGlassViewColorScheme::Light:
      _effectView.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidGlassViewColorScheme::Dark:
      _effectView.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      _effectView.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  UIColor *tintColor = RCTUIColorFromSharedColor(props.glassTintColor);
  // UIGlassEffect adapts to the content behind it, so an explicit dark scheme
  // gets a subtle dark tint to keep light content readable.
  if (tintColor == nil && props.colorScheme == RNLiquidGlassViewColorScheme::Dark) {
    tintColor = [UIColor colorWithWhite:0 alpha:0.3];
  }

  if (@available(iOS 26.0, *)) {
    UIGlassEffectStyle style = props.glassStyle == RNLiquidGlassViewGlassStyle::Clear
        ? UIGlassEffectStyleClear
        : UIGlassEffectStyleRegular;
    UIGlassEffect *effect = [UIGlassEffect effectWithStyle:style];
    effect.tintColor = tintColor;
    effect.interactive = props.interactive;
    _effectView.effect = effect;
  } else {
    UIBlurEffectStyle style = props.glassStyle == RNLiquidGlassViewGlassStyle::Clear
        ? UIBlurEffectStyleSystemUltraThinMaterial
        : UIBlurEffectStyleSystemThinMaterial;
    _effectView.effect = [UIBlurEffect effectWithStyle:style];
    _effectView.contentView.backgroundColor = [tintColor colorWithAlphaComponent:0.35];
  }
}

- (void)applyCornerRadius
{
  CGSize size = self.bounds.size;
  CGFloat radius = MAX(0, MIN(_cornerRadius, MIN(size.width, size.height) / 2));

  if (@available(iOS 26.0, *)) {
    _effectView.cornerConfiguration =
        [UICornerConfiguration configurationWithUniformRadius:[UICornerRadius fixedRadius:radius]];
  } else {
    _effectView.layer.cornerRadius = radius;
    _effectView.layer.cornerCurve = kCACornerCurveContinuous;
    _effectView.clipsToBounds = radius > 0;
  }
}

#pragma mark - Layout

// The default content frame excludes padding and borders. The effect view has
// to cover the whole component because children are laid out relative to it.
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  BOOL morphing = _morph && self.window != nil && oldLayoutMetrics.frame.size.width > 0 &&
      layoutMetrics.frame != oldLayoutMetrics.frame;
  if (!morphing) {
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    _effectView.frame = self.bounds;
    return;
  }

  // Let the glass flow into its new frame. Inside a glass container, iOS
  // merges it with neighbouring glass while the shapes move.
  void (^changes)(void) = ^{
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    self->_effectView.frame = self.bounds;
    [self applyCornerRadius];
    [self layoutIfNeeded];
  };
  UIViewAnimationOptions options =
      UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction;
  if (@available(iOS 17.0, *)) {
    [UIView animateWithSpringDuration:0.55
                               bounce:0.28
                initialSpringVelocity:0
                                delay:0
                              options:options
                           animations:changes
                           completion:nil];
  } else {
    [UIView animateWithDuration:0.55
                          delay:0
         usingSpringWithDamping:0.72
          initialSpringVelocity:0
                        options:options
                     animations:changes
                     completion:nil];
  }

  // The content jumps to its new layout, so fade it in as the glass settles.
  UIView *content = _effectView.contentView;
  content.alpha = 0;
  [UIView animateWithDuration:0.3
                        delay:0.12
                      options:UIViewAnimationOptionCurveEaseOut | UIViewAnimationOptionAllowUserInteraction
                   animations:^{
                     content.alpha = 1;
                   }
                   completion:nil];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self applyCornerRadius];
}

@end
