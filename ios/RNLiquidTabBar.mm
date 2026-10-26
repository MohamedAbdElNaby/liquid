#import "RNLiquidTabBar.h"

#import <QuartzCore/QuartzCore.h>
#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

#import "RNLiquidSpring.h"

using namespace facebook::react;

static const CGFloat kInset = 4;
/// Scale of the lens while it is lifted, relative to the resting pill.
// The lifted lens is an elliptical drop, wider than the pill.
static const CGFloat kPressedScaleX = 1.3;
static const CGFloat kPressedScaleY = 1.14;
/// Spring stiffness of the lens travelling to a tapped tab, and following a finger.
static const double kTapTravelStiffness = 330;
static const double kDragStiffness = 1000;
/// Spring stiffness of the drop melting back into the pill.
static const double kSettleStiffness = 1100;
/// Extra scale of every tab while the lens is lifted.
static const CGFloat kTabLiftScale = 0;
/// Extra scale of the tab right under the lens.
static const CGFloat kTabMagnification = 0.16;
/// How many rendered frames the lens stays lifted over its tab before settling.
/// Counted in frames, so a main-thread stall (mounting the new screen) doesn't
/// use up the hold and squeeze the settle into a jump.
static const int kHoldFrames = 1;
/// How close (in tabs) the lens must be to its tab to count as arrived. Loose, so the
/// drop starts melting as it lands instead of crawling the last bit lifted.
static const double kArriveDistance = 0.08;
/// How far (in tabs) the lens can be pulled past the first and last tab.
static const CGFloat kMaxOvershoot = 0.35;
/// How much of the overshoot stretches the bar, in tab widths.
static const CGFloat kBarStretch = 0.45;

// Liquid Glass tab bar. React children are the tab items. The bar draws the
// glass, the resting selection pill and a clear glass lens. Pressing lifts the
// lens out of the pill; it follows the finger with spring physics, stretches
// with its speed, magnifies the tabs and settles into the pill on release.
@interface RNLiquidTabBar () <UIGestureRecognizerDelegate>
@end

@implementation RNLiquidTabBar {
  UIVisualEffectView *_barView;
  // A partial blur under the bar's glass, set by `backdropBlur`.
  UIVisualEffectView *_frostView;
  UIView *_pillView;
  UIView *_itemsView;
  // Tabs in the focused color, seen only through the lens: under its glass, so it
  // refracts them, and over it, so they stay sharp.
  UIView *_tintUnderView;
  UIView *_tintView;
  UIColor *_focusedTintColor;
  UIVisualEffectView *_lensView;
  // Specular reflections drawn over the lens, so it reads as a thick drop of liquid.
  UIView *_sheenView;
  CAGradientLayer *_rimLayer;
  CAShapeLayer *_rimMask;
  CAGradientLayer *_glossLayer;
  CAShapeLayer *_glossMask;
  UIColor *_lensTintColor;
  CADisplayLink *_displayLink;

  // Position of the lens, in tabs.
  RNLiquidSpring _value;
  // 0 when resting as the pill, 1 when lifted.
  RNLiquidSpring _press;
  RNLiquidSpring _scaleX;
  RNLiquidSpring _scaleY;
  // Speed of the lens in tabs per second, used for the stretch.
  RNLiquidSpring _velocity;

  NSInteger _selectedIndex;
  BOOL _touching;
  // Set once the finger moves: the lens then follows it instead of snapping to tabs.
  BOOL _dragging;
  CGFloat _touchStartX;
  BOOL _releasePending;
  BOOL _lensEnabled;
  BOOL _hasProps;
  // Set once a pager drives the bar (top tabs): tab changes then glide the pill.
  BOOL _followsPager;
  // After a tap the pager is still scrolling to the new page; its position is
  // ignored until it gets there so the pill doesn't jump back.
  NSInteger _awaitingIndex;
  // Tab chosen on release, reported right away (see flushPendingSelect).
  NSInteger _pendingSelect;
  CFTimeInterval _awaitingSince;

  double _previousValue;
  // Frames rendered since the lens arrived over its tab after release, -1 while travelling.
  int _arrivedFrames;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidTabBarComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidTabBarProps>();
    _props = defaultProps;

    _value = RNLiquidSpring(1, 1000, 0.001);
    _press = RNLiquidSpring(1, 1000, 0.001);
    // Near-critical damping: the lens grows and shrinks without wobbling.
    _scaleX = RNLiquidSpring(0.85, 420, 0.001);
    _scaleY = RNLiquidSpring(0.9, 420, 0.001);
    // A slow, well-damped velocity spring makes the drop heavy: it deforms gradually.
    _velocity = RNLiquidSpring(0.95, 45, 0.01);
    _scaleX.snap(1);
    _scaleY.snap(1);
    _lensEnabled = YES;

    self.clipsToBounds = NO;

    _frostView = [[UIVisualEffectView alloc] initWithEffect:nil];
    _frostView.userInteractionEnabled = NO;
    _frostView.clipsToBounds = YES;
    _frostView.hidden = YES;
    [self addSubview:_frostView];

    _barView = [[UIVisualEffectView alloc] initWithEffect:nil];
    [self addSubview:_barView];

    _pillView = [UIView new];
    _pillView.userInteractionEnabled = NO;
    [_barView.contentView addSubview:_pillView];

    _itemsView = [UIView new];
    [_barView.contentView addSubview:_itemsView];

    _tintUnderView = [self makeTintView];
    [_barView.contentView addSubview:_tintUnderView];
    _tintView = [self makeTintView];

    _lensView = [[UIVisualEffectView alloc] initWithEffect:nil];
    _lensView.userInteractionEnabled = NO;
    _lensView.alpha = 0;
    _lensView.hidden = YES;
    [self addSubview:_lensView];
    [self addSubview:_tintView];

    _sheenView = [UIView new];
    _sheenView.userInteractionEnabled = NO;
    _sheenView.hidden = YES;
    // A bright rim that catches the light at two opposite corners, like a thick glass edge.
    _rimLayer = [CAGradientLayer layer];
    _rimLayer.type = kCAGradientLayerConic;
    _rimLayer.startPoint = CGPointMake(0.5, 0.5);
    // Angle 0 points at the top-left corner.
    _rimLayer.endPoint = CGPointMake(0, 0);
    _rimLayer.locations = @[ @0, @0.14, @0.36, @0.5, @0.64, @0.86, @1 ];
    _rimMask = [CAShapeLayer layer];
    _rimMask.fillColor = UIColor.clearColor.CGColor;
    _rimMask.strokeColor = UIColor.blackColor.CGColor;
    _rimLayer.mask = _rimMask;
    [_sheenView.layer addSublayer:_rimLayer];
    // A soft gloss across the upper part, like a reflection on a curved surface.
    _glossLayer = [CAGradientLayer layer];
    // Fades to transparent white: fading to clearColor (transparent black) turns the middle gray.
    _glossLayer.colors =
        @[ (id)[UIColor colorWithWhite:1 alpha:0.35].CGColor, (id)[UIColor colorWithWhite:1 alpha:0].CGColor ];
    _glossMask = [CAShapeLayer layer];
    _glossLayer.mask = _glossMask;
    [_sheenView.layer addSublayer:_glossLayer];
    [self addSubview:_sheenView];

    _awaitingIndex = -1;
    _pendingSelect = -1;
    _arrivedFrames = -1;
    if (@available(iOS 26.0, *)) {
      [self applyLensTint:nil];
      _lensView.cornerConfiguration = [UICornerConfiguration capsuleConfiguration];
      _barView.cornerConfiguration = [UICornerConfiguration capsuleConfiguration];
    }

    UILongPressGestureRecognizer *touch =
        [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleTouch:)];
    touch.minimumPressDuration = 0;
    touch.allowableMovement = CGFLOAT_MAX;
    touch.cancelsTouchesInView = NO;
    touch.delegate = self;
    [self addGestureRecognizer:touch];

    UILongPressGestureRecognizer *longPress =
        [[UILongPressGestureRecognizer alloc] initWithTarget:self action:@selector(handleLongPress:)];
    longPress.minimumPressDuration = 0.5;
    longPress.cancelsTouchesInView = NO;
    longPress.delegate = self;
    [self addGestureRecognizer:longPress];

    [self applyGlassWithProps:*defaultProps];
  }
  return self;
}

- (void)dealloc
{
  [_displayLink invalidate];
}

#pragma mark - Children

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [_itemsView insertSubview:childComponentView atIndex:index];
  [self render];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  childComponentView.transform = CGAffineTransformIdentity;
  [childComponentView removeFromSuperview];
}

#pragma mark - Layout

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // Keep the bar's own transform out of the frame calculation.
  CGAffineTransform transform = _barView.transform;
  _barView.transform = CGAffineTransformIdentity;
  _barView.frame = self.bounds;
  _barView.transform = transform;
  _frostView.transform = CGAffineTransformIdentity;
  _frostView.frame = self.bounds;
  _frostView.transform = transform;
  _itemsView.frame = self.bounds;
  _tintUnderView.frame = self.bounds;
  _tintView.transform = CGAffineTransformIdentity;
  _tintView.frame = self.bounds;
  _tintView.transform = transform;
  [self render];
}

#pragma mark - Props

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<RNLiquidTabBarProps const>(props);

  [self applyGlassWithProps:newViewProps];
  _pillView.backgroundColor = RCTUIColorFromSharedColor(newViewProps.selectionColor)
      ?: [UIColor colorWithWhite:0.5 alpha:0.15];

  _lensEnabled = newViewProps.lensEnabled;
  [self applyFrost:newViewProps.backdropBlur];
  UIColor *lensTint = RCTUIColorFromSharedColor(newViewProps.lensTintColor);
  if (lensTint != _lensTintColor && ![lensTint isEqual:_lensTintColor]) {
    [self applyLensTint:lensTint];
  }

  // Follow a pager's scroll position (top tabs) while the user is not touching the bar.
  if (newViewProps.pagerPosition >= 0) {
    _followsPager = YES;
  }
  if (_awaitingIndex >= 0 && newViewProps.pagerPosition >= 0) {
    BOOL timedOut = CACurrentMediaTime() - _awaitingSince > 1.0;
    if (timedOut || std::fabs(newViewProps.pagerPosition - _awaitingIndex) <= 0.01) {
      _awaitingIndex = -1;
    }
  }
  if (newViewProps.pagerPosition >= 0 && _awaitingIndex < 0 && !_touching && !_releasePending &&
      _press.target == 0) {
    _value.snap(newViewProps.pagerPosition);
    [self render];
  }
  _focusedTintColor = RCTUIColorFromSharedColor(newViewProps.focusedTintColor);

  BOOL firstProps = !_hasProps;
  _hasProps = YES;
  if (newViewProps.selectedIndex != _selectedIndex || firstProps) {
    // Already there, e.g. after following a pager: no need to lift the lens.
    BOOL animated = self.window != nil && !firstProps && std::fabs(_value.value - newViewProps.selectedIndex) > 0.05;
    _selectedIndex = newViewProps.selectedIndex;
    if (!_touching) {
      if (animated && _followsPager) {
        // The pager already moved the pill most of the way; glide the rest.
        _value.target = _selectedIndex;
        [self startAnimating];
      } else if (animated) {
        // Lift the lens while it travels to the new tab, like iOS 26.
        _value.stiffness = kTapTravelStiffness;
        [self lift];
        _value.target = _selectedIndex;
        _releasePending = YES;
        [self startAnimating];
      } else {
        _value.snap(_selectedIndex);
        [self render];
      }
    }
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)applyGlassWithProps:(RNLiquidTabBarProps const &)props
{
  switch (props.colorScheme) {
    case RNLiquidTabBarColorScheme::Light:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidTabBarColorScheme::Dark:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  UIColor *tint = RCTUIColorFromSharedColor(props.glassTintColor);
  if (@available(iOS 26.0, *)) {
    UIGlassEffect *effect = [UIGlassEffect
        effectWithStyle:props.glassStyle == RNLiquidTabBarGlassStyle::Clear ? UIGlassEffectStyleClear
                                                                           : UIGlassEffectStyleRegular];
    effect.tintColor = tint;
    effect.interactive = YES;
    _barView.effect = effect;
  } else {
    _barView.effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemThinMaterial];
    _barView.layer.cornerRadius = self.bounds.size.height / 2;
    _barView.clipsToBounds = YES;
    _lensView.effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterial];
    _lensView.clipsToBounds = YES;
  }
}

#pragma mark - Touches

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)otherGestureRecognizer
{
  return YES;
}

- (NSInteger)tabCount
{
  return MAX(_itemsView.subviews.count, 1);
}

- (CGFloat)tabWidth
{
  return (self.bounds.size.width - kInset * 2) / [self tabCount];
}

/// Lens position under `x`, rubber-banded past the first and last tab.
- (double)positionForTouchX:(CGFloat)x
{
  double last = [self tabCount] - 1;
  double raw = (x - kInset) / [self tabWidth] - 0.5;
  if (raw < 0) {
    return -kMaxOvershoot * -raw / (-raw + 1);
  }
  if (raw > last) {
    return last + kMaxOvershoot * (raw - last) / (raw - last + 1);
  }
  return raw;
}

- (NSInteger)indexForTouchX:(CGFloat)x
{
  return MIN(MAX((NSInteger)llround([self positionForTouchX:x]), 0), [self tabCount] - 1);
}

- (void)handleTouch:(UILongPressGestureRecognizer *)recognizer
{
  CGFloat x = [recognizer locationInView:self].x;

  switch (recognizer.state) {
    case UIGestureRecognizerStateBegan:
      _touching = YES;
      _dragging = NO;
      _touchStartX = x;
      _releasePending = NO;
      [self lift];
      // A tap glides straight to the tab under the finger.
      _value.stiffness = kTapTravelStiffness;
      _value.target = [self indexForTouchX:x];
      [self startAnimating];
      break;
    case UIGestureRecognizerStateChanged:
      if (!_dragging && std::fabs(x - _touchStartX) > 8) {
        _dragging = YES;
        _value.stiffness = kDragStiffness;
      }
      _value.target = _dragging ? [self positionForTouchX:x] : [self indexForTouchX:x];
      [self startAnimating];
      break;
    case UIGestureRecognizerStateEnded: {
      _touching = NO;
      NSInteger index = [self indexForTouchX:x];
      _value.target = index;
      _releasePending = YES;
      [self startAnimating];
      _pendingSelect = index;
      // Navigate right away: React renders the new screen while the lens is still travelling.
      [self flushPendingSelect];
      break;
    }
    case UIGestureRecognizerStateCancelled:
    case UIGestureRecognizerStateFailed:
      _touching = NO;
      _pendingSelect = -1;
      _value.target = _selectedIndex;
      _releasePending = YES;
      [self startAnimating];
      break;
    default:
      break;
  }
}

- (void)handleLongPress:(UILongPressGestureRecognizer *)recognizer
{
  if (recognizer.state == UIGestureRecognizerStateBegan && _eventEmitter) {
    NSInteger index = [self indexForTouchX:[recognizer locationInView:self].x];
    std::static_pointer_cast<const RNLiquidTabBarEventEmitter>(_eventEmitter)
        ->onTabLongPress(RNLiquidTabBarEventEmitter::OnTabLongPress{.index = static_cast<int>(index)});
  }
}

/// Reports the tab chosen on release, as soon as the finger lifts, so the
/// screen switches without waiting for the lens to finish travelling.
- (void)flushPendingSelect
{
  NSInteger index = _pendingSelect;
  if (index < 0) {
    return;
  }
  _pendingSelect = -1;
  if (_followsPager && index != _selectedIndex) {
    _awaitingIndex = index;
    _awaitingSince = CACurrentMediaTime();
  }
  [self emitTabSelect:index];
}

- (void)emitTabSelect:(NSInteger)index
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidTabBarEventEmitter>(_eventEmitter)
        ->onTabSelect(RNLiquidTabBarEventEmitter::OnTabSelect{.index = static_cast<int>(index)});
  }
}

#pragma mark - Animation

- (void)lift
{
  // Lift quickly, settle a little softer, like the system bar.
  _press.stiffness = 1400;
  if (_press.value < 0.01) {
    [self captureTintedItems];
  }
  _press.target = 1;
  _scaleX.stiffness = 600;
  _scaleY.stiffness = 600;
  _scaleX.target = kPressedScaleX;
  _scaleY.target = kPressedScaleY;
}

/// Renders each tab item as a template image tinted with the focused color.
- (void)captureTintedItems
{
  for (UIView *tintView in @[ _tintUnderView, _tintView ]) {
    for (UIView *view in tintView.subviews) {
      [view removeFromSuperview];
    }
  }
  if (_focusedTintColor == nil) {
    return;
  }
  for (UIView *item in _itemsView.subviews) {
    CGRect bounds = item.bounds;
    if (CGRectIsEmpty(bounds)) {
      continue;
    }
    UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithBounds:bounds];
    UIImage *image = [[renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
      [item.layer renderInContext:context.CGContext];
    }] imageWithRenderingMode:UIImageRenderingModeAlwaysTemplate];
    for (UIView *tintView in @[ _tintUnderView, _tintView ]) {
      UIImageView *copy = [[UIImageView alloc] initWithImage:image];
      copy.tintColor = _focusedTintColor;
      copy.bounds = bounds;
      copy.center = item.center;
      [tintView addSubview:copy];
    }
  }
}

- (UIView *)makeTintView
{
  UIView *view = [UIView new];
  view.userInteractionEnabled = NO;
  view.layer.mask = [CAShapeLayer layer];
  return view;
}

- (void)applyFrost:(CGFloat)amount
{
  amount = MIN(MAX(amount, 0), 1);
  _frostView.hidden = amount <= 0;
  if (amount <= 0) {
    _frostView.effect = nil;
    return;
  }
  if (_frostView.effect == nil) {
    _frostView.effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterial];
  }
  // Fading the blur in mixes it with the sharp content: a lighter blur than any material.
  _frostView.alpha = amount;
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  [self updateRimColors];
}

/// Bright corners on both themes. Between them the rim is a faint white in
/// dark mode and a faint dark line in light mode, where white would vanish
/// against the bar.
- (void)updateRimColors
{
  BOOL dark = self.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark;
  UIColor *bright = [UIColor colorWithWhite:1 alpha:0.7];
  UIColor *second = [UIColor colorWithWhite:1 alpha:0.45];
  UIColor *dim = dark ? [UIColor colorWithWhite:1 alpha:0.08] : [UIColor colorWithWhite:0 alpha:0.045];
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _rimLayer.colors = @[
    (id)bright.CGColor, (id)dim.CGColor, (id)dim.CGColor, (id)second.CGColor, (id)dim.CGColor, (id)dim.CGColor,
    (id)bright.CGColor,
  ];
  [CATransaction commit];
}

- (void)applyLensTint:(UIColor *)tint
{
  [self updateRimColors];
  _lensTintColor = tint;
  if (@available(iOS 26.0, *)) {
    // Clear glass with a light fill: a dense drop that mutes the reflections of the glass.
    UIGlassEffect *lensGlass = [UIGlassEffect effectWithStyle:UIGlassEffectStyleClear];
    lensGlass.tintColor = tint ?: [UIColor colorWithDynamicProvider:^UIColor *(UITraitCollection *traits) {
      return traits.userInterfaceStyle == UIUserInterfaceStyleDark ? [UIColor colorWithWhite:1 alpha:0.16]
                                                                   : [UIColor colorWithWhite:1 alpha:0.26];
    }];
    _lensView.effect = lensGlass;
  }
}

- (void)settle
{
  // The lens shrinks to the pill with the same spring that fades it into the
  // pill, so it melts into it.
  _press.stiffness = kSettleStiffness;
  _scaleX.stiffness = kSettleStiffness;
  _scaleY.stiffness = kSettleStiffness;
  _press.target = 0;
  _scaleX.target = 1;
  _scaleY.target = 1;
}

- (void)startAnimating
{
  if (_displayLink == nil) {
    _previousValue = _value.value;
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick:)];
    if (@available(iOS 15.0, *)) {
      _displayLink.preferredFrameRateRange = CAFrameRateRangeMake(60, 120, 120);
    }
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
}

- (void)stopAnimating
{
  [_displayLink invalidate];
  _displayLink = nil;
}

- (void)tick:(CADisplayLink *)link
{
  double dt = MIN(MAX(link.targetTimestamp - link.timestamp, 1.0 / 240), 1.0 / 30);

  BOOL moving = _value.step(dt);
  double instantVelocity = (_value.value - _previousValue) / dt;
  _previousValue = _value.value;
  _velocity.target = instantVelocity;
  moving |= _velocity.step(dt);

  // Like the system bar, the lens only settles once it is close to its tab.
  // Like the system bar, the lens arrives, stays lifted for a moment, then settles.
  if (_releasePending && std::fabs(_value.value - _value.target) < kArriveDistance) {
    if (_arrivedFrames < 0) {
      _arrivedFrames = 0;
      [self flushPendingSelect];
    } else if (++_arrivedFrames >= kHoldFrames) {
      _releasePending = NO;
      _arrivedFrames = -1;
      [self settle];
    }
  } else {
    _arrivedFrames = -1;
  }

  moving |= _press.step(dt);
  moving |= _scaleX.step(dt);
  moving |= _scaleY.step(dt);

  [self render];

  if (!moving && !_touching && !_releasePending) {
    [self stopAnimating];
  }
}

- (void)render
{
  CGSize size = self.bounds.size;
  if (size.width <= 0 || size.height <= 0) {
    return;
  }

  CGFloat tabWidth = [self tabWidth];
  CGFloat pillHeight = size.height - kInset * 2;
  double last = [self tabCount] - 1;
  double clamped = MIN(MAX(_value.value, 0.0), last);
  CGRect restFrame = CGRectMake(kInset + _value.value * tabWidth, kInset, tabWidth, pillHeight);
  CGRect pillFrame = CGRectMake(kInset + clamped * tabWidth, kInset, tabWidth, pillHeight);
  CGFloat press = MIN(MAX(_press.value, 0), 1);
  CGFloat stretch = (_value.value - clamped) * tabWidth * kBarStretch;

  [CATransaction begin];
  [CATransaction setDisableActions:YES];

  // The bar grows slightly while pressed.
  // It also stretches toward a finger pulled past its ends.
  CGFloat barScale = 1 + (6.0 / size.width) * press;
  _barView.transform = CGAffineTransformScale(
      CGAffineTransformMakeTranslation(stretch / 2, 0), barScale + std::fabs(stretch) / size.width, barScale);
  // The tinted copies and the frost follow the bar.
  _tintView.transform = _barView.transform;
  _frostView.transform = _barView.transform;
  _frostView.layer.cornerRadius = size.height / 2;
  _frostView.layer.cornerCurve = kCACornerCurveContinuous;

  _pillView.frame = pillFrame;
  _pillView.layer.cornerRadius = pillHeight / 2;
  _pillView.layer.cornerCurve = kCACornerCurveContinuous;
  _pillView.alpha = 1 - press;

  // The lens stretches along its direction of travel.
  // Like liquid, the drop stretches along its motion and thins out while it travels.
  double speedStretch = MIN(std::fabs(_velocity.value) / 10 * 0.24, 0.13);
  CGFloat scaleX = _scaleX.value / (1 - speedStretch);
  CGFloat scaleY = _scaleY.value * (1 - speedStretch / 3);
  _lensView.bounds = CGRectMake(0, 0, restFrame.size.width, restFrame.size.height);
  _lensView.center = CGPointMake(CGRectGetMidX(restFrame), CGRectGetMidY(restFrame));
  _lensView.transform = CGAffineTransformMakeScale(scaleX, scaleY);
  // Eased so the drop melts into the pill instead of popping out.
  // Smootherstep: a softer start and end than smoothstep.
  // The drop stays fully glassy while it shrinks and only fades in the last part.
  CGFloat visible = MIN(press * 1.25, 1.0);
  CGFloat fade = visible * visible * visible * (visible * (visible * 6 - 15) + 10);
  _lensView.alpha = _lensEnabled ? fade : 0;
  _lensView.hidden = !_lensEnabled || press < 0.01;

  // The tinted copies show only through the lens.
  CGRect lensRect = CGRectMake(
      _lensView.center.x - restFrame.size.width * scaleX / 2,
      _lensView.center.y - restFrame.size.height * scaleY / 2,
      restFrame.size.width * scaleX,
      restFrame.size.height * scaleY);
  for (UIView *tintView in @[ _tintUnderView, _tintView ]) {
    tintView.hidden = !_lensEnabled || press < 0.01;
    if (!tintView.hidden) {
      CGRect maskRect = [tintView convertRect:lensRect fromView:self];
      ((CAShapeLayer *)tintView.layer.mask).path =
          [UIBezierPath bezierPathWithRoundedRect:maskRect cornerRadius:maskRect.size.height / 2].CGPath;
      tintView.alpha = press;
    }
  }
  if (_lensView.clipsToBounds) {
    _lensView.layer.cornerRadius = restFrame.size.height / 2;
  }

  _sheenView.hidden = _lensView.hidden;
  if (!_sheenView.hidden) {
    CGRect bounds = _lensView.bounds;
    _sheenView.bounds = bounds;
    _sheenView.center = _lensView.center;
    _sheenView.transform = _lensView.transform;
    _sheenView.alpha = _lensView.alpha;
    CGFloat radius = bounds.size.height / 2;
    _rimLayer.frame = bounds;
    _rimMask.frame = bounds;
    _rimMask.lineWidth = 1.5;
    _rimMask.path = [UIBezierPath bezierPathWithRoundedRect:CGRectInset(bounds, 1, 1) cornerRadius:radius - 1].CGPath;
    CGRect gloss = CGRectMake(radius * 0.45, bounds.size.height * 0.1, bounds.size.width - radius * 0.9,
                              bounds.size.height * 0.38);
    _glossLayer.frame = bounds;
    _glossLayer.startPoint = CGPointMake(0.5, CGRectGetMinY(gloss) / bounds.size.height);
    _glossLayer.endPoint = CGPointMake(0.5, CGRectGetMaxY(gloss) / bounds.size.height);
    _glossMask.frame = bounds;
    _glossMask.path = [UIBezierPath bezierPathWithRoundedRect:gloss cornerRadius:gloss.size.height / 2].CGPath;
  }

  // Lift every tab a little and magnify the one under the lens.
  NSArray<UIView *> *items = _itemsView.subviews;
  for (NSUInteger i = 0; i < items.count; i++) {
    double distance = std::fabs(clamped - (double)i);
    double proximity = MAX(0.0, 1.0 - distance);
    CGFloat scale = 1 + (kTabLiftScale + kTabMagnification * proximity) * press;
    items[i].transform = CGAffineTransformMakeScale(scale, scale);
    for (UIView *tintView in @[ _tintUnderView, _tintView ]) {
      if (i < tintView.subviews.count) {
        tintView.subviews[i].transform = items[i].transform;
      }
    }
  }

  [CATransaction commit];
}

@end
