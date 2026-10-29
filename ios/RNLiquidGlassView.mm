#import "RNLiquidGlassView.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

/// Blur radius of content as it blurs out and in during a morph.
static const CGFloat kContentBlur = 8;

/// Blurs `layer` from one radius to another with Core Animation's gaussian
/// blur filter, which UIKit uses for the same transition. Private API: does
/// nothing when the filter is unavailable, leaving the plain fade.
static void RNLiquidAnimateBlur(CALayer *layer, CGFloat from, CGFloat to, CFTimeInterval duration)
{
  Class filterClass = NSClassFromString(@"CAFilter");
  SEL make = NSSelectorFromString(@"filterWithType:");
  if (filterClass == nil || ![filterClass respondsToSelector:make]) {
    return;
  }
  id filter = ((id (*)(id, SEL, id))[filterClass methodForSelector:make])(filterClass, make, @"gaussianBlur");
  if (filter == nil) {
    return;
  }
  @try {
    [filter setValue:@"gaussianBlur" forKey:@"name"];
    [filter setValue:@(to) forKey:@"inputRadius"];
    layer.filters = @[ filter ];
    CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:@"filters.gaussianBlur.inputRadius"];
    animation.fromValue = @(from);
    animation.toValue = @(to);
    animation.duration = duration;
    animation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseOut];
    [layer addAnimation:animation forKey:@"liquidBlur"];
  } @catch (NSException *exception) {
    layer.filters = nil;
  }
}

/// Runs UIView animations even inside `performWithoutAnimation`, which
/// navigation libraries use while pushing screens: the glass should still
/// morph while a screen is pushed under it.
static void RNLiquidAnimate(void (^animations)(void))
{
  BOOL enabled = UIView.areAnimationsEnabled;
  [UIView setAnimationsEnabled:YES];
  animations();
  [UIView setAnimationsEnabled:enabled];
}

@implementation RNLiquidGlassView {
  UIVisualEffectView *_effectView;
  CGFloat _cornerRadius;
  BOOL _morph;
  BOOL _laidOut;
  CGFloat _fadeBottom;
  // Masks the effect so it fades out at the bottom (see fadeBottom).
  UIView *_fadeMask;
  CAGradientLayer *_fadeGradient;
  // Set when a morphing view's children change, until the next layout: the
  // content then crossfades with a blur and stays in place while the glass
  // moves, instead of fading in after it.
  BOOL _contentSwapped;
  // Specular rim (rimColor): a diagonal gradient drawn only along the edge.
  CAGradientLayer *_rim;
  CAShapeLayer *_rimMask;
  UIColor *_rimColor;
  CGFloat _rimWidth;
  CGFloat _rimSideOpacity;
  UIColor *_rimShadeColor;
  // Reflection (sheenOpacity): white fading down from the top, clipped to the shape.
  CAGradientLayer *_sheen;
  CGFloat _sheenOpacity;
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
  if ([self animatesContentChanges]) {
    [self markContentSwapped];
    // The new content sharpens and grows into place.
    childComponentView.alpha = 0;
    childComponentView.transform = CGAffineTransformMakeScale(0.85, 0.85);
    RNLiquidAnimateBlur(childComponentView.layer, kContentBlur, 0, 0.32);
    RNLiquidAnimate(^{
      [UIView animateWithDuration:0.32
          delay:0.04
          options:UIViewAnimationOptionCurveEaseOut | UIViewAnimationOptionAllowUserInteraction
          animations:^{
            childComponentView.alpha = 1;
            childComponentView.transform = CGAffineTransformIdentity;
          }
          completion:^(BOOL finished) {
            childComponentView.layer.filters = nil;
          }];
    });
  }
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  if ([self animatesContentChanges]) {
    // The old content blurs away from a snapshot, since React reuses the view.
    UIView *snapshot = [childComponentView snapshotViewAfterScreenUpdates:NO];
    if (snapshot != nil) {
      [self markContentSwapped];
      snapshot.frame = childComponentView.frame;
      snapshot.userInteractionEnabled = NO;
      [_effectView.contentView addSubview:snapshot];
      RNLiquidAnimateBlur(snapshot.layer, 0, kContentBlur, 0.22);
      RNLiquidAnimate(^{
        [UIView animateWithDuration:0.22
            delay:0
            options:UIViewAnimationOptionCurveEaseIn
            animations:^{
              snapshot.alpha = 0;
              snapshot.transform = CGAffineTransformMakeScale(0.85, 0.85);
            }
            completion:^(BOOL finished) {
              [snapshot removeFromSuperview];
            }];
      });
    }
  }
  childComponentView.alpha = 1;
  childComponentView.transform = CGAffineTransformIdentity;
  childComponentView.layer.filters = nil;
  [childComponentView removeFromSuperview];
}

/// Content changes animate only on a morphing view that is already on screen.
- (BOOL)animatesContentChanges
{
  return _morph && _laidOut && self.window != nil;
}

- (void)markContentSwapped
{
  if (_contentSwapped) {
    return;
  }
  _contentSwapped = YES;
  // Cleared after this mount transaction, in case the size does not change.
  dispatch_async(dispatch_get_main_queue(), ^{
    self->_contentSwapped = NO;
  });
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
  if (_fadeBottom != newViewProps.fadeBottom) {
    _fadeBottom = newViewProps.fadeBottom;
    [self applyFade];
  }

  if (_sheenOpacity != newViewProps.sheenOpacity) {
    _sheenOpacity = newViewProps.sheenOpacity;
    [self applySheen];
  }
  UIColor *rimColor = RCTUIColorFromSharedColor(newViewProps.rimColor);
  UIColor *rimShadeColor = RCTUIColorFromSharedColor(newViewProps.rimShadeColor);
  if (![rimColor isEqual:_rimColor] || _rimWidth != newViewProps.rimWidth ||
      _rimSideOpacity != newViewProps.rimSideOpacity ||
      (rimShadeColor != _rimShadeColor && ![rimShadeColor isEqual:_rimShadeColor])) {
    _rimColor = rimColor;
    _rimShadeColor = rimShadeColor;
    _rimWidth = newViewProps.rimWidth;
    _rimSideOpacity = newViewProps.rimSideOpacity;
    [self applyRim];
  }

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

/// The rim: bright on the top-left and bottom-right curves, clear along the
/// sides, masked to a stroke following the glass's rounded shape.
/// The reflection: light catching the top of the glass. Drawn over the effect
/// and its content, under the rim, clipped to the glass's rounded shape.
- (void)applySheen
{
  if (_sheenOpacity <= 0) {
    [_sheen removeFromSuperlayer];
    _sheen = nil;
    return;
  }
  if (_sheen == nil) {
    _sheen = [CAGradientLayer layer];
    _sheen.startPoint = CGPointMake(0.5, 0);
    _sheen.endPoint = CGPointMake(0.5, 1);
    _sheen.locations = @[ @0, @0.42, @0.68, @1 ];
    _sheen.masksToBounds = YES;
    _sheen.cornerCurve = kCACornerCurveContinuous;
  }
  // Under the rim when there is one.
  if (_rim.superlayer == self.layer) {
    [self.layer insertSublayer:_sheen below:_rim];
  } else {
    [self.layer addSublayer:_sheen];
  }
  CGFloat alpha = MAX(0, MIN(1, _sheenOpacity));
  // Like light on a lens: bright at the top, clear through the middle, a
  // faint shade along the bottom, so it reads even over white content.
  _sheen.colors = @[
    (__bridge id)[UIColor colorWithWhite:1 alpha:alpha].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:alpha * 0.2].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:0].CGColor,
    (__bridge id)[UIColor colorWithWhite:0 alpha:alpha * 0.14].CGColor,
  ];
  CGRect bounds = self.bounds;
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _sheen.frame = bounds;
  _sheen.cornerRadius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
  [CATransaction commit];
}

- (void)applyRim
{
  if (_rimColor == nil || _rimWidth <= 0) {
    [_rim removeFromSuperlayer];
    _rim = nil;
    _rimMask = nil;
    return;
  }
  if (_rim == nil) {
    _rim = [CAGradientLayer layer];
    _rim.startPoint = CGPointMake(0, 0);
    _rim.endPoint = CGPointMake(1, 1);
    _rim.locations = @[ @0, @0.38, @0.62, @1 ];
    _rimMask = [CAShapeLayer layer];
    _rimMask.fillColor = UIColor.clearColor.CGColor;
    _rimMask.strokeColor = UIColor.blackColor.CGColor;
    _rim.mask = _rimMask;
  }
  // Above the effect view and its content.
  [self.layer addSublayer:_rim];

  // Bright on the top-left and bottom-right curves, fainter along the sides.
  CGFloat alpha = CGColorGetAlpha(_rimColor.CGColor);
  CGColorRef side = [_rimColor colorWithAlphaComponent:alpha * MAX(0, MIN(1, _rimSideOpacity))].CGColor;
  if (_rimShadeColor != nil) {
    // Lit from the top-left: the highlight there, the shade on the far side.
    CGFloat shadeAlpha = CGColorGetAlpha(_rimShadeColor.CGColor);
    CGColorRef halfShade = [_rimShadeColor colorWithAlphaComponent:shadeAlpha * 0.5].CGColor;
    _rim.colors = @[
      (__bridge id)_rimColor.CGColor, (__bridge id)side, (__bridge id)halfShade, (__bridge id)_rimShadeColor.CGColor
    ];
  } else {
    _rim.colors = @[ (__bridge id)_rimColor.CGColor, (__bridge id)side, (__bridge id)side, (__bridge id)_rimColor.CGColor ];
  }

  CGRect bounds = self.bounds;
  CGFloat radius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
  CGFloat inset = _rimWidth / 2;
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _rim.frame = bounds;
  _rimMask.frame = bounds;
  _rimMask.lineWidth = _rimWidth;
  _rimMask.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, inset, inset)
                                             cornerRadius:MAX(0, radius - inset)]
                      .CGPath;
  [CATransaction commit];
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
  if (layoutMetrics.frame.size.width > 0) {
    _laidOut = YES;
  }
  if (!morphing) {
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    _effectView.frame = self.bounds;
    return;
  }

  // New content is laid out for the final frame at once. Keep it there on
  // screen while the glass moves, so it doesn't slide with the glass's edge.
  UIView *content = _effectView.contentView;
  if (_contentSwapped) {
    content.transform = CGAffineTransformMakeTranslation(
        layoutMetrics.frame.origin.x - oldLayoutMetrics.frame.origin.x,
        layoutMetrics.frame.origin.y - oldLayoutMetrics.frame.origin.y);
  }

  // Let the glass flow into its new frame. Inside a glass container, iOS
  // merges it with neighbouring glass while the shapes move.
  void (^changes)(void) = ^{
    [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
    self->_effectView.frame = self.bounds;
    content.transform = CGAffineTransformIdentity;
    [self applyCornerRadius];
    [self layoutIfNeeded];
  };
  UIViewAnimationOptions options =
      UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction;
  RNLiquidAnimate(^{
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
  });

  if (_contentSwapped) {
    return;
  }
  // The content jumps to its new layout, so fade it in as the glass settles.
  content.alpha = 0;
  RNLiquidAnimate(^{
    [UIView animateWithDuration:0.3
                          delay:0.12
                        options:UIViewAnimationOptionCurveEaseOut | UIViewAnimationOptionAllowUserInteraction
                     animations:^{
                       content.alpha = 1;
                     }
                     completion:nil];
  });
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self applyCornerRadius];
  [self applyFade];
  [self applySheen];
  [self applyRim];
}

/// A gradient mask on the effect view: opaque, then clear over the last
/// `fadeBottom` points. Effect views take masks through `maskView`.
- (void)applyFade
{
  if (_fadeBottom <= 0) {
    if (_fadeMask != nil) {
      _effectView.maskView = nil;
      _fadeMask = nil;
      _fadeGradient = nil;
    }
    return;
  }
  if (_fadeMask == nil) {
    _fadeMask = [UIView new];
    _fadeGradient = [CAGradientLayer layer];
    _fadeGradient.colors = @[
      (id)UIColor.blackColor.CGColor, (id)UIColor.blackColor.CGColor, (id)[UIColor colorWithWhite:0 alpha:0].CGColor
    ];
    [_fadeMask.layer addSublayer:_fadeGradient];
    _effectView.maskView = _fadeMask;
  }
  CGRect bounds = _effectView.bounds;
  CGFloat height = MAX(bounds.size.height, 1);
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _fadeMask.frame = bounds;
  _fadeGradient.frame = CGRectMake(0, 0, bounds.size.width, bounds.size.height);
  CGFloat start = MAX(0, 1 - _fadeBottom / height);
  _fadeGradient.locations = @[ @0, @(start), @1 ];
  [CATransaction commit];
}

@end
