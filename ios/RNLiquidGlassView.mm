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
  // fadeCurve 'ease': the fade follows an S-curve instead of a straight line.
  BOOL _fadeEase;
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
  // A hairline all round the outside (rimEdgeColor), under the rim.
  CAShapeLayer *_rimEdge;
  UIColor *_rimEdgeColor;
  // Along the top and bottom edges instead of the diagonal curves (rimGradient).
  BOOL _rimVertical;
  // Reflection (sheenOpacity): white fading down from the top, clipped to the shape.
  CAGradientLayer *_sheen;
  CGFloat _sheenOpacity;
  // The iOS 26 light-glass edge (specularEdge): a white glow inside the top
  // edge and a white line along the bottom, under a graded hairline.
  BOOL _specularEdge;
  CAGradientLayer *_specGlow;
  CAShapeLayer *_specGlowMask;
  CAGradientLayer *_specLine;
  CAShapeLayer *_specLineMask;
  // Its strengths: top glow, bottom line, hairline, and how far down the glow reaches.
  CGFloat _specTopOpacity;
  CGFloat _specBottomOpacity;
  CGFloat _specHairlineOpacity;
  CGFloat _specGlowHeight;
  CGFloat _specBottomHeight;
  // Corner reflection (cornerReflection): light catching the top-left and
  // bottom-right corners, a soft bloom inside and a glint on the edge.
  CGFloat _cornerReflection;
  CALayer *_cornerBloom;
  CAShapeLayer *_cornerBloomMask;
  CALayer *_cornerGlint;
  CAShapeLayer *_cornerGlintMask;
  // An adjustable blur inside the glass (backdropBlur), clipped to its shape:
  // clear glass then shows the page blurred this much, between clear (sharp)
  // and regular (frosted).
  UIView *_backdropBlurView;
  CALayer *_backdropLayer;
  id _backdropBlurFilter;
  CGFloat _backdropBlur;
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
  // The backdrop blur stays the bottom subview, under the content.
  NSInteger offset = _backdropBlurView.superview == _effectView.contentView ? 1 : 0;
  [_effectView.contentView insertSubview:childComponentView atIndex:index + offset];
  // The sheen, edge and rim stay above the content.
  if (_sheen != nil) {
    [_effectView.contentView.layer addSublayer:_sheen];
  }
  if (_cornerBloom != nil) {
    [_effectView.contentView.layer addSublayer:_cornerBloom];
    [_effectView.contentView.layer addSublayer:_cornerGlint];
  }
  if (_specGlow != nil) {
    [_effectView.contentView.layer addSublayer:_specGlow];
    [_effectView.contentView.layer addSublayer:_specLine];
  }
  if (_rimEdge != nil) {
    [_effectView.contentView.layer addSublayer:_rimEdge];
  }
  if (_rim != nil) {
    [_effectView.contentView.layer addSublayer:_rim];
  }
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
  BOOL fadeEase = newViewProps.fadeCurve == RNLiquidGlassViewFadeCurve::Ease;
  if (_fadeBottom != newViewProps.fadeBottom || _fadeEase != fadeEase) {
    _fadeBottom = newViewProps.fadeBottom;
    _fadeEase = fadeEase;
    [self applyFade];
  }

  if (_specularEdge != newViewProps.specularEdge || _specTopOpacity != newViewProps.specularTopOpacity ||
      _specBottomOpacity != newViewProps.specularBottomOpacity ||
      _specHairlineOpacity != newViewProps.specularHairlineOpacity ||
      _specGlowHeight != newViewProps.specularGlowHeight ||
      _specBottomHeight != newViewProps.specularBottomHeight) {
    _specularEdge = newViewProps.specularEdge;
    _specTopOpacity = newViewProps.specularTopOpacity;
    _specBottomOpacity = newViewProps.specularBottomOpacity;
    _specHairlineOpacity = newViewProps.specularHairlineOpacity;
    _specGlowHeight = newViewProps.specularGlowHeight;
    _specBottomHeight = newViewProps.specularBottomHeight;
    [self applySpecularEdge];
  }

  if (_backdropBlur != newViewProps.backdropBlur) {
    _backdropBlur = newViewProps.backdropBlur;
    [self applyBackdropBlur];
  }

  if (_cornerReflection != newViewProps.cornerReflection) {
    _cornerReflection = newViewProps.cornerReflection;
    [self applyCornerReflection];
  }

  if (_sheenOpacity != newViewProps.sheenOpacity) {
    _sheenOpacity = newViewProps.sheenOpacity;
    [self applySheen];
  }
  UIColor *rimColor = RCTUIColorFromSharedColor(newViewProps.rimColor);
  UIColor *rimShadeColor = RCTUIColorFromSharedColor(newViewProps.rimShadeColor);
  UIColor *rimEdgeColor = RCTUIColorFromSharedColor(newViewProps.rimEdgeColor);
  if (![rimColor isEqual:_rimColor] || _rimWidth != newViewProps.rimWidth ||
      _rimSideOpacity != newViewProps.rimSideOpacity ||
      (rimShadeColor != _rimShadeColor && ![rimShadeColor isEqual:_rimShadeColor]) ||
      (rimEdgeColor != _rimEdgeColor && ![rimEdgeColor isEqual:_rimEdgeColor]) ||
      _rimVertical != (newViewProps.rimGradient == RNLiquidGlassViewRimGradient::Vertical)) {
    _rimVertical = newViewProps.rimGradient == RNLiquidGlassViewRimGradient::Vertical;
    _rimColor = rimColor;
    _rimShadeColor = rimShadeColor;
    _rimEdgeColor = rimEdgeColor;
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
  // Inside the glass, so it grows with it when pressed; under the rim.
  CALayer *host = _effectView.contentView.layer;
  if (_rim.superlayer == host) {
    [host insertSublayer:_sheen below:_rim];
  } else {
    [host addSublayer:_sheen];
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
  CGRect bounds = (CGRect){CGPointZero, self.bounds.size};
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _sheen.frame = bounds;
  _sheen.cornerRadius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
  [CATransaction commit];
}

- (void)applySpecularEdge
{
  if (!_specularEdge) {
    [_specGlow removeFromSuperlayer];
    [_specLine removeFromSuperlayer];
    _specGlow = nil;
    _specGlowMask = nil;
    _specLine = nil;
    _specLineMask = nil;
    return;
  }
  if (_specGlow == nil) {
    // Light from above: white just inside the top edge, fading into the glass,
    // and a white line along the bottom edge.
    _specGlow = [CAGradientLayer layer];
    _specGlow.startPoint = CGPointMake(0.5, 0);
    _specGlow.endPoint = CGPointMake(0.5, 1);
    _specGlowMask = [CAShapeLayer layer];
    _specGlowMask.fillColor = UIColor.blackColor.CGColor;
    _specGlow.mask = _specGlowMask;

    // The hairline: light grey along the top, darker down the sides, gone
    // along the bottom where the white line is.
    _specLine = [CAGradientLayer layer];
    _specLine.startPoint = CGPointMake(0.5, 0);
    _specLine.endPoint = CGPointMake(0.5, 1);
    _specLineMask = [CAShapeLayer layer];
    _specLineMask.fillColor = UIColor.clearColor.CGColor;
    _specLineMask.strokeColor = UIColor.blackColor.CGColor;
    _specLine.mask = _specLineMask;
  }
  CGFloat top = MAX(0, MIN(1, _specTopOpacity));
  CGFloat bottom = MAX(0, MIN(1, _specBottomOpacity));
  CGFloat hairline = MAX(0, MIN(1, _specHairlineOpacity));
  // The top glow reaches this far down; the bottom one this far up (a thin
  // line at the default 7%, a glow like the top one when taller). They
  // never overlap: the top glow keeps its share when both are large.
  CGFloat glowEnd = MAX(0.02, MIN(0.9, _specGlowHeight));
  CGFloat lineStart = MAX(glowEnd, 1 - MAX(0.02, MIN(0.9, _specBottomHeight)));
  _specGlow.colors = @[
    (__bridge id)[UIColor colorWithWhite:1 alpha:top].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:0].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:0].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:bottom].CGColor,
  ];
  _specGlow.locations = @[ @0, @(glowEnd), @(lineStart), @1 ];
  // A bottom glow (taller than the default line) mirrors the top edge: the
  // hairline light along the bottom too, darker down the sides. A bottom
  // line keeps the Messages look, the hairline gone under the white line.
  BOOL mirrored = _specBottomHeight > 0.07 + 0.001;
  _specLine.colors = @[
    (__bridge id)[UIColor colorWithWhite:0 alpha:0.13 * hairline].CGColor,
    (__bridge id)[UIColor colorWithWhite:0 alpha:0.3 * hairline].CGColor,
    (__bridge id)[UIColor colorWithWhite:0 alpha:(mirrored ? 0.3 : 0.24) * hairline].CGColor,
    (__bridge id)[UIColor colorWithWhite:0 alpha:(mirrored ? 0.13 : 0) * hairline].CGColor,
  ];
  _specLine.locations = mirrored ? @[ @0, @0.45, @0.55, @1 ] : @[ @0, @0.45, @0.78, @1 ];
  // Inside the glass so they grow with it when pressed, above the content.
  CALayer *host = _effectView.contentView.layer;
  [host addSublayer:_specGlow];
  [host addSublayer:_specLine];

  CGRect bounds = (CGRect){CGPointZero, self.bounds.size};
  CGFloat radius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
  CGFloat scale = self.traitCollection.displayScale > 0 ? self.traitCollection.displayScale : 3;
  // A hairline of about one and a half pixels.
  CGFloat hair = 1.5 / scale;
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _specGlow.frame = bounds;
  _specGlowMask.frame = bounds;
  _specGlowMask.path = [UIBezierPath bezierPathWithRoundedRect:bounds cornerRadius:radius].CGPath;
  _specLine.frame = bounds;
  _specLineMask.frame = bounds;
  _specLineMask.lineWidth = hair;
  _specLineMask.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, hair / 2, hair / 2)
                                                  cornerRadius:MAX(0, radius - hair / 2)]
                           .CGPath;
  [CATransaction commit];
}

/// A white radial gradient centred on `center`, fading out at `reach`.
static CAGradientLayer *RNLiquidCornerLight(CGPoint center, CGFloat reach, CGFloat alpha)
{
  CAGradientLayer *light = [CAGradientLayer layer];
  light.type = kCAGradientLayerRadial;
  light.frame = CGRectMake(center.x - reach, center.y - reach, reach * 2, reach * 2);
  light.startPoint = CGPointMake(0.5, 0.5);
  light.endPoint = CGPointMake(1, 1);
  light.colors = @[
    (__bridge id)[UIColor colorWithWhite:1 alpha:alpha].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:alpha * 0.4].CGColor,
    (__bridge id)[UIColor colorWithWhite:1 alpha:0].CGColor,
  ];
  light.locations = @[ @0, @0.4, @1 ];
  return light;
}

/// Light catching the top-left and bottom-right corners: a soft bloom inside
/// the glass (`cornerReflection`) and a brighter glint on the edge there.
- (void)applyCornerReflection
{
  CGFloat alpha = MAX(0, MIN(1, _cornerReflection));
  CGRect bounds = (CGRect){CGPointZero, self.bounds.size};
  if (alpha <= 0 || bounds.size.width <= 0 || bounds.size.height <= 0) {
    [_cornerBloom removeFromSuperlayer];
    [_cornerGlint removeFromSuperlayer];
    _cornerBloom = nil;
    _cornerBloomMask = nil;
    _cornerGlint = nil;
    _cornerGlintMask = nil;
    return;
  }
  if (_cornerBloom == nil) {
    _cornerBloom = [CALayer layer];
    _cornerBloomMask = [CAShapeLayer layer];
    _cornerBloomMask.fillColor = UIColor.blackColor.CGColor;
    _cornerBloom.mask = _cornerBloomMask;
    _cornerGlint = [CALayer layer];
    _cornerGlintMask = [CAShapeLayer layer];
    _cornerGlintMask.fillColor = UIColor.clearColor.CGColor;
    _cornerGlintMask.strokeColor = UIColor.blackColor.CGColor;
    _cornerGlint.mask = _cornerGlintMask;
  }
  // Inside the glass so they grow with it when pressed: over the sheen,
  // under the specular edge and the rim.
  CALayer *host = _effectView.contentView.layer;
  CALayer *above = _specGlow.superlayer == host ? _specGlow
      : _rimEdge.superlayer == host           ? _rimEdge
      : _rim.superlayer == host               ? _rim
                                              : nil;
  for (CALayer *layer in @[ _cornerBloom, _cornerGlint ]) {
    if (above != nil) {
      [host insertSublayer:layer below:above];
    } else {
      [host addSublayer:layer];
    }
  }

  CGFloat radius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
  // The middle of each corner's curve, where the light sits.
  CGFloat inset = radius * (1 - M_SQRT1_2);
  CGPoint topLeft = CGPointMake(inset, inset);
  CGPoint bottomRight = CGPointMake(bounds.size.width - inset, bounds.size.height - inset);
  CGFloat bloomReach = MAX(12, radius * 1.6);
  CGFloat glintReach = MAX(10, radius * 1.3);
  CGFloat glintWidth = 1.2;
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _cornerBloom.frame = bounds;
  _cornerBloomMask.frame = bounds;
  _cornerBloomMask.path = [UIBezierPath bezierPathWithRoundedRect:bounds cornerRadius:radius].CGPath;
  _cornerBloom.sublayers = @[
    RNLiquidCornerLight(topLeft, bloomReach, alpha), RNLiquidCornerLight(bottomRight, bloomReach, alpha)
  ];
  // The edge catches more light than the glass behind it.
  CGFloat glintAlpha = MIN(1, alpha * 4);
  _cornerGlint.frame = bounds;
  _cornerGlintMask.frame = bounds;
  _cornerGlintMask.lineWidth = glintWidth;
  _cornerGlintMask.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, glintWidth / 2, glintWidth / 2)
                                                     cornerRadius:MAX(0, radius - glintWidth / 2)]
                              .CGPath;
  _cornerGlint.sublayers = @[
    RNLiquidCornerLight(topLeft, glintReach, glintAlpha), RNLiquidCornerLight(bottomRight, glintReach, glintAlpha)
  ];
  [CATransaction commit];
}

- (void)applyRim
{
  // The edge: a hairline round the outside, under the rim, so the rim's light
  // shines against it on light backgrounds.
  CGFloat edgeWidth = 0;
  if (_rimEdgeColor != nil) {
    if (_rimEdge == nil) {
      _rimEdge = [CAShapeLayer layer];
      _rimEdge.fillColor = UIColor.clearColor.CGColor;
    }
    edgeWidth = 1;
    CGRect bounds = (CGRect){CGPointZero, self.bounds.size};
    CGFloat radius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
    // Inside the glass so it grows with it when pressed, under the rim.
    CALayer *host = _effectView.contentView.layer;
    if (_rim.superlayer == host) {
      [host insertSublayer:_rimEdge below:_rim];
    } else {
      [host addSublayer:_rimEdge];
    }
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    _rimEdge.frame = bounds;
    _rimEdge.strokeColor = _rimEdgeColor.CGColor;
    _rimEdge.lineWidth = edgeWidth;
    _rimEdge.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, edgeWidth / 2, edgeWidth / 2)
                                               cornerRadius:MAX(0, radius - edgeWidth / 2)]
                        .CGPath;
    [CATransaction commit];
  } else {
    [_rimEdge removeFromSuperlayer];
    _rimEdge = nil;
  }

  if (_rimColor == nil || _rimWidth <= 0) {
    [_rim removeFromSuperlayer];
    _rim = nil;
    _rimMask = nil;
    return;
  }
  if (_rim == nil) {
    _rim = [CAGradientLayer layer];
    _rimMask = [CAShapeLayer layer];
    _rimMask.fillColor = UIColor.clearColor.CGColor;
    _rimMask.strokeColor = UIColor.blackColor.CGColor;
    _rim.mask = _rimMask;
  }
  // Inside the glass, above its content: the glass grows when pressed and
  // the rim has to grow with it, or a second outline shows.
  [_effectView.contentView.layer addSublayer:_rim];

  // Bright on the top-left and bottom-right curves, fainter along the sides;
  // or, vertical, bright along the top and bottom edges, fading down the
  // left and right sides.
  _rim.startPoint = _rimVertical ? CGPointMake(0.5, 0) : CGPointMake(0, 0);
  _rim.endPoint = _rimVertical ? CGPointMake(0.5, 1) : CGPointMake(1, 1);
  _rim.locations = _rimVertical ? @[ @0, @0.3, @0.7, @1 ] : @[ @0, @0.38, @0.62, @1 ];
  CGFloat alpha = CGColorGetAlpha(_rimColor.CGColor);
  CGColorRef side = [_rimColor colorWithAlphaComponent:alpha * MAX(0, MIN(1, _rimSideOpacity))].CGColor;
  if (_rimShadeColor != nil && _rimVertical) {
    // A shiny border: white along the top and bottom edges, turning to the
    // shade down the left and right sides.
    _rim.colors = @[
      (__bridge id)_rimColor.CGColor, (__bridge id)_rimShadeColor.CGColor, (__bridge id)_rimShadeColor.CGColor,
      (__bridge id)_rimColor.CGColor
    ];
  } else if (_rimShadeColor != nil) {
    // Lit from the top-left: the highlight there, the shade on the far side.
    CGFloat shadeAlpha = CGColorGetAlpha(_rimShadeColor.CGColor);
    CGColorRef halfShade = [_rimShadeColor colorWithAlphaComponent:shadeAlpha * 0.5].CGColor;
    _rim.colors = @[
      (__bridge id)_rimColor.CGColor, (__bridge id)side, (__bridge id)halfShade, (__bridge id)_rimShadeColor.CGColor
    ];
  } else {
    _rim.colors = @[ (__bridge id)_rimColor.CGColor, (__bridge id)side, (__bridge id)side, (__bridge id)_rimColor.CGColor ];
  }

  CGRect bounds = (CGRect){CGPointZero, self.bounds.size};
  CGFloat radius = MAX(0, MIN(_cornerRadius, MIN(bounds.size.width, bounds.size.height) / 2));
  // Just inside the edge, like light on a bevel.
  CGFloat inset = edgeWidth + _rimWidth / 2;
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

  // Follows the glass, also while it morphs (this runs in the animation).
  if (_backdropBlurView != nil) {
    _backdropBlurView.frame = self.bounds;
    _backdropBlurView.layer.cornerRadius = radius;
    _backdropLayer.frame = _backdropBlurView.bounds;
  }

  if (@available(iOS 26.0, *)) {
    _effectView.cornerConfiguration =
        [UICornerConfiguration configurationWithUniformRadius:[UICornerRadius fixedRadius:radius]];
  } else {
    _effectView.layer.cornerRadius = radius;
    _effectView.layer.cornerCurve = kCACornerCurveContinuous;
    _effectView.clipsToBounds = radius > 0;
  }
}

/// The blur inside the glass (`backdropBlur`): a Core Animation backdrop
/// layer with a gaussian blur, under the glass's content, clipped to its
/// shape. It captures what the clear glass shows (the page, bent at the
/// edges) and blurs it by `backdropBlur` points. The glass can't sample a
/// blur placed behind it, so it lives inside. Private API: nothing changes
/// when the backdrop layer or the filter is unavailable.
- (void)applyBackdropBlur
{
  UIView *host = _effectView.contentView;
  if (_backdropBlur <= 0) {
    [_backdropBlurView removeFromSuperview];
    _backdropBlurView = nil;
    _backdropLayer = nil;
    return;
  }
  if (_backdropBlurView == nil) {
    Class backdropClass = NSClassFromString(@"CABackdropLayer");
    Class filterClass = NSClassFromString(@"CAFilter");
    SEL make = NSSelectorFromString(@"filterWithType:");
    if (backdropClass == nil || filterClass == nil || ![filterClass respondsToSelector:make]) {
      return;
    }
    _backdropBlurFilter = ((id (*)(id, SEL, id))[filterClass methodForSelector:make])(filterClass, make, @"gaussianBlur");
    if (_backdropBlurFilter == nil) {
      return;
    }
    _backdropBlurView = [UIView new];
    _backdropBlurView.userInteractionEnabled = NO;
    _backdropBlurView.clipsToBounds = YES;
    _backdropBlurView.layer.cornerCurve = kCACornerCurveContinuous;
    _backdropLayer = [backdropClass new];
    [_backdropBlurView.layer addSublayer:_backdropLayer];
  }
  if (_backdropBlurView.superview != host) {
    // Under the content, which is mounted above it (see mountChildComponentView).
    [host insertSubview:_backdropBlurView atIndex:0];
    [self applyCornerRadius];
  }
  @try {
    [_backdropBlurFilter setValue:@(_backdropBlur) forKey:@"inputRadius"];
    [_backdropBlurFilter setValue:@YES forKey:@"inputNormalizeEdges"];
    _backdropLayer.filters = @[ _backdropBlurFilter ];
    CGFloat scale = self.window.screen.scale;
    if (scale > 0) {
      // Keeps the blurred backdrop sharp instead of rendering at 1x.
      [_backdropLayer setValue:@(scale) forKey:@"scale"];
    }
  } @catch (NSException *exception) {
    _backdropLayer.filters = nil;
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self applyBackdropBlur];
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
  [self applyBackdropBlur];
  [self applyFade];
  [self applySheen];
  [self applyCornerReflection];
  [self applySpecularEdge];
  [self applyRim];
}

/// A gradient mask on the effect view: opaque, then clear over the last
/// `fadeBottom` points, in a straight line or (fadeCurve 'ease') along an
/// S-curve that melts into the content without a visible start or end.
/// Effect views take masks through `maskView`.
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
  NSMutableArray *colors = [NSMutableArray arrayWithObject:(id)UIColor.blackColor.CGColor];
  NSMutableArray<NSNumber *> *locations = [NSMutableArray arrayWithObject:@0];
  // Enough stops that the eased curve shows no banding.
  NSInteger steps = _fadeEase ? 16 : 1;
  for (NSInteger i = 0; i <= steps; i++) {
    CGFloat t = (CGFloat)i / steps;
    // Smootherstep: flat at both ends, so neither end of the fade shows.
    CGFloat eased = _fadeEase ? t * t * t * (t * (t * 6 - 15) + 10) : t;
    [colors addObject:(id)[UIColor colorWithWhite:0 alpha:1 - eased].CGColor];
    [locations addObject:@(start + (1 - start) * t)];
  }
  _fadeGradient.colors = colors;
  _fadeGradient.locations = locations;
  [CATransaction commit];
}

@end
