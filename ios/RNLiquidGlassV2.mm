#import "RNLiquidGlassV2.h"

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>

using namespace facebook::react;

@interface RNLiquidGlassV2 () <RCTRNLiquidGlassV2ViewProtocol>
@end

@implementation RNLiquidGlassV2 {
  UIVisualEffectView *_effectView;
  // Pre-iOS 26 only: the edge the system glass draws by itself on iOS 26.
  CAShapeLayer *_hairline;
  CAGradientLayer *_highlight;
  CAShapeLayer *_highlightMask;

  BOOL _clear;
  BOOL _interactive;
  UIColor *_tintColor;
  CGFloat _cornerRadius;
  RNLiquidGlassV2ColorScheme _colorScheme;
  RNLiquidGlassV2ReduceTransparency _reduceTransparency;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidGlassV2ComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidGlassV2Props>();
    _props = defaultProps;
    _effectView = [[UIVisualEffectView alloc] initWithEffect:nil];
    self.contentView = _effectView;
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(accessibilityChanged)
                                                 name:UIAccessibilityReduceTransparencyStatusDidChangeNotification
                                               object:nil];
    [self apply];
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

#pragma mark - Children

// Children live in the effect view's content view, above the glass, so the
// interactive glass also receives their touches.
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
  const auto &p = *std::static_pointer_cast<RNLiquidGlassV2Props const>(props);
  _clear = p.glassStyle == RNLiquidGlassV2GlassStyle::Clear;
  _interactive = p.interactive;
  _tintColor = RCTUIColorFromSharedColor(p.tintColor);
  _cornerRadius = p.cornerRadius;
  _colorScheme = p.colorScheme;
  _reduceTransparency = p.reduceTransparency;
  [super updateProps:props oldProps:oldProps];
  [self apply];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _tintColor = nil;
}

- (void)accessibilityChanged
{
  [self apply];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  [self applyEdge];
}

- (BOOL)reducesTransparency
{
  switch (_reduceTransparency) {
    case RNLiquidGlassV2ReduceTransparency::On:
      return YES;
    case RNLiquidGlassV2ReduceTransparency::Off:
      return NO;
    default:
      return UIAccessibilityIsReduceTransparencyEnabled();
  }
}

- (BOOL)isDark
{
  switch (_colorScheme) {
    case RNLiquidGlassV2ColorScheme::Dark:
      return YES;
    case RNLiquidGlassV2ColorScheme::Light:
      return NO;
    default:
      return self.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark;
  }
}

/// Material, colour scheme and shape. Called whenever a prop or the
/// accessibility setting changes; never during layout or drawing.
- (void)apply
{
  switch (_colorScheme) {
    case RNLiquidGlassV2ColorScheme::Light:
      _effectView.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidGlassV2ColorScheme::Dark:
      _effectView.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      _effectView.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  if ([self reducesTransparency]) {
    // Opaque, like the system's own controls with Reduce Transparency on.
    _effectView.effect = nil;
    _effectView.backgroundColor = _tintColor
        ?: ([self isDark] ? [UIColor colorWithRed:0.17 green:0.17 blue:0.18 alpha:1]
                          : [UIColor colorWithRed:0.97 green:0.97 blue:0.98 alpha:1]);
  } else if (@available(iOS 26.0, *)) {
    UIGlassEffect *effect =
        [UIGlassEffect effectWithStyle:_clear ? UIGlassEffectStyleClear : UIGlassEffectStyleRegular];
    effect.tintColor = _tintColor;
    effect.interactive = _interactive;
    _effectView.effect = effect;
    _effectView.backgroundColor = nil;
  } else {
    _effectView.effect = [UIBlurEffect
        effectWithStyle:_clear ? UIBlurEffectStyleSystemUltraThinMaterial : UIBlurEffectStyleSystemThinMaterial];
    _effectView.backgroundColor = [_tintColor colorWithAlphaComponent:0.85];
  }
  [self applyShape];
  [self applyEdge];
}

- (CGFloat)radius
{
  CGSize size = self.bounds.size;
  return MAX(0, MIN(_cornerRadius, MIN(size.width, size.height) / 2));
}

- (void)applyShape
{
  CGFloat radius = [self radius];
  if (@available(iOS 26.0, *)) {
    _effectView.cornerConfiguration =
        [UICornerConfiguration configurationWithUniformRadius:[UICornerRadius fixedRadius:radius]];
    _effectView.clipsToBounds = [self reducesTransparency];
    _effectView.layer.cornerRadius = radius;
    _effectView.layer.cornerCurve = kCACornerCurveContinuous;
  } else {
    _effectView.layer.cornerRadius = radius;
    _effectView.layer.cornerCurve = kCACornerCurveContinuous;
    _effectView.clipsToBounds = radius > 0;
  }
}

/// iOS 26 glass draws its own edge and specular; earlier iOS and the opaque
/// fallback get a hairline (grey in light mode, light in dark mode) and a soft
/// highlight just inside the top edge.
- (void)applyEdge
{
  BOOL systemGlass = NO;
  if (@available(iOS 26.0, *)) {
    systemGlass = ![self reducesTransparency];
  }
  if (systemGlass) {
    [_hairline removeFromSuperlayer];
    [_highlight removeFromSuperlayer];
    _hairline = nil;
    _highlight = nil;
    return;
  }
  if (_hairline == nil) {
    _hairline = [CAShapeLayer layer];
    _hairline.fillColor = UIColor.clearColor.CGColor;
    _highlight = [CAGradientLayer layer];
    _highlightMask = [CAShapeLayer layer];
    _highlightMask.fillColor = UIColor.clearColor.CGColor;
    _highlightMask.strokeColor = UIColor.blackColor.CGColor;
    _highlight.mask = _highlightMask;
  }
  [self.layer addSublayer:_highlight];
  [self.layer addSublayer:_hairline];

  BOOL dark = [self isDark];
  _hairline.strokeColor = (dark ? [UIColor colorWithWhite:1 alpha:0.16] : [UIColor colorWithWhite:0 alpha:0.10]).CGColor;
  _highlight.colors = @[
    (__bridge id)[UIColor colorWithWhite:1 alpha:dark ? 0.35 : 0.85].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:0].CGColor,
  ];
  _highlight.locations = @[ @0, @0.35 ];
  [self layoutEdge];
}

- (void)layoutEdge
{
  if (_hairline == nil) {
    return;
  }
  CGRect bounds = self.bounds;
  CGFloat scale = self.window.screen.scale ?: 3;
  CGFloat hair = 1 / scale;
  CGFloat radius = [self radius];
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _hairline.frame = bounds;
  _hairline.lineWidth = hair;
  _hairline.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, hair / 2, hair / 2)
                                              cornerRadius:MAX(0, radius - hair / 2)]
                       .CGPath;
  _highlight.frame = bounds;
  _highlight.startPoint = CGPointMake(0.5, 0);
  _highlight.endPoint = CGPointMake(0.5, 1);
  _highlightMask.frame = bounds;
  _highlightMask.lineWidth = 1;
  _highlightMask.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, hair + 0.5, hair + 0.5)
                                                   cornerRadius:MAX(0, radius - hair - 0.5)]
                            .CGPath;
  [CATransaction commit];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _effectView.frame = self.bounds;
  [self applyShape];
  [self layoutEdge];
}

@end
