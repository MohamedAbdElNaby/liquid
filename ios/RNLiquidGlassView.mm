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
