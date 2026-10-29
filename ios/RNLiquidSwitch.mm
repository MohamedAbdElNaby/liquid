#import "RNLiquidSwitch.h"

#import <QuartzCore/QuartzCore.h>
#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

#import "RNLiquidSpring.h"

using namespace facebook::react;

/// Scale of the glass lens while pressed, relative to the resting thumb.
static const CGFloat kPressedScale = 1.35;
/// Gap between the thumb and the track edge.
static const CGFloat kInset = 2;
/// Distance a touch must move before it drags the thumb instead of tapping.
static const CGFloat kDragSlop = 4;

/// RGBA components of a color, resolved for the current appearance, so the
/// track can blend between its off and on colors every frame.
struct RNLiquidRGBA {
  CGFloat r = 0, g = 0, b = 0, a = 0;
};

static RNLiquidRGBA RNLiquidResolve(UIColor *color, UITraitCollection *traits)
{
  RNLiquidRGBA rgba;
  [[color resolvedColorWithTraitCollection:traits] getRed:&rgba.r green:&rgba.g blue:&rgba.b alpha:&rgba.a];
  return rgba;
}

// iOS 26 style Liquid Glass switch. Pressing turns the white thumb into a
// clear glass lens that grows past the track and refracts it, slides to the
// other side while the track fills with color, then deflates back into a
// solid thumb. Every part can be recolored, unlike UISwitch.
@implementation RNLiquidSwitch {
  BOOL _rtl;
  // Holds every part, so disabling can dim it: React owns this view's own opacity.
  UIView *_contentView;
  UIView *_trackView;
  UIVisualEffectView *_lensView;
  UIView *_thumbView;
  CADisplayLink *_displayLink;

  UIColor *_onColor;
  UIColor *_offColor;
  UIColor *_thumbColor;
  UIColor *_lensTint;
  RNLiquidRGBA _onRGBA;
  RNLiquidRGBA _offRGBA;

  // 0 when off, 1 when on.
  RNLiquidSpring _position;
  // 0 at rest, 1 while the lens is lifted.
  RNLiquidSpring _press;
  RNLiquidSpring _scale;

  BOOL _on;
  BOOL _hasProps;
  BOOL _disabled;
  BOOL _touching;
  BOOL _dragging;
  // Released: the lens stays lifted until the thumb reaches its side.
  BOOL _settlePending;
  CGFloat _touchStartX;
  double _positionAtTouch;
  UIImpactFeedbackGenerator *_haptics;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidSwitchComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidSwitchProps>();
    _props = defaultProps;

    // The lens grows past the track, like the system switch.
    self.clipsToBounds = NO;

    // Slides stay heavy and smooth; the lens lifts quickly and settles a little softer.
    _position = RNLiquidSpring(0.8, 300, 0.001);
    _press = RNLiquidSpring(0.9, 700, 0.001);
    _scale = RNLiquidSpring(0.62, 380, 0.001);
    _scale.snap(1);

    _contentView = [UIView new];
    _contentView.userInteractionEnabled = NO;
    _contentView.clipsToBounds = NO;
    [self addSubview:_contentView];

    _trackView = [UIView new];
    _trackView.userInteractionEnabled = NO;
    _trackView.layer.cornerCurve = kCACornerCurveContinuous;
    [_contentView addSubview:_trackView];

    _lensView = [[UIVisualEffectView alloc] initWithEffect:nil];
    _lensView.userInteractionEnabled = NO;
    _lensView.hidden = YES;
    [_contentView addSubview:_lensView];

    _thumbView = [UIView new];
    _thumbView.userInteractionEnabled = NO;
    _thumbView.layer.cornerCurve = kCACornerCurveContinuous;
    _thumbView.layer.shadowColor = UIColor.blackColor.CGColor;
    _thumbView.layer.shadowOpacity = 0.12;
    _thumbView.layer.shadowRadius = 3;
    _thumbView.layer.shadowOffset = CGSizeMake(0, 1.5);
    [_contentView addSubview:_thumbView];

    if (@available(iOS 26.0, *)) {
      _lensView.cornerConfiguration = [UICornerConfiguration capsuleConfiguration];
    } else {
      _lensView.clipsToBounds = YES;
      _lensView.layer.borderWidth = 0.5;
      _lensView.layer.borderColor = [UIColor colorWithWhite:1 alpha:0.6].CGColor;
    }

    _haptics = [[UIImpactFeedbackGenerator alloc] initWithStyle:UIImpactFeedbackStyleLight];
    [self applyColorsWithProps:*defaultProps];
  }
  return self;
}

- (void)dealloc
{
  [_displayLink invalidate];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window == nil) {
    [self stopAnimating];
  }
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  [self resolveColors];
  [self render];
}

#pragma mark - Props

#pragma mark - Right to left

// The control has no text, so right-to-left layout mirrors all of it: the
// track fills from the right and touches are mirrored with it. Fabric sets
// the layer transform from the `transform` style while finishing an update,
// so the mirror is applied after that.
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _rtl = layoutMetrics.layoutDirection == LayoutDirection::RightToLeft;
}

- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask
{
  [super finalizeUpdates:updateMask];
  CATransform3D transform = self.layer.transform;
  BOOL mirrored = transform.m11 < 0;
  if (_rtl != mirrored) {
    self.layer.transform = CATransform3DScale(transform, -1, 1, 1);
  }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNLiquidSwitchProps const>(props);

  switch (newProps.colorScheme) {
    case RNLiquidSwitchColorScheme::Light:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidSwitchColorScheme::Dark:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  _disabled = newProps.disabled;
  _contentView.alpha = _disabled ? 0.45 : 1;
  [self applyColorsWithProps:newProps];

  BOOL first = !_hasProps;
  _hasProps = YES;
  if (newProps.value != _on || first) {
    _on = newProps.value;
    if (first || self.window == nil) {
      _position.snap(_on ? 1 : 0);
    } else if (!_touching) {
      // Changed from JS: slide without lifting the lens.
      _position.target = _on ? 1 : 0;
      [self startAnimating];
    }
  }

  [super updateProps:props oldProps:oldProps];
  [self render];
}

- (void)applyColorsWithProps:(RNLiquidSwitchProps const &)props
{
  _onColor = RCTUIColorFromSharedColor(props.onTintColor) ?: UIColor.systemGreenColor;
  _offColor = RCTUIColorFromSharedColor(props.offTintColor)
      ?: [UIColor colorWithDynamicProvider:^UIColor *(UITraitCollection *traits) {
           return [UIColor colorWithRed:120 / 255.0
                                  green:120 / 255.0
                                   blue:128 / 255.0
                                  alpha:traits.userInterfaceStyle == UIUserInterfaceStyleDark ? 0.36 : 0.16];
         }];
  _thumbColor = RCTUIColorFromSharedColor(props.thumbTintColor) ?: UIColor.whiteColor;
  _thumbView.backgroundColor = _thumbColor;

  UIColor *lensTint = RCTUIColorFromSharedColor(props.lensTintColor);
  if (_lensView.effect == nil || lensTint != _lensTint) {
    _lensTint = lensTint;
    if (@available(iOS 26.0, *)) {
      UIGlassEffect *glass = [UIGlassEffect effectWithStyle:UIGlassEffectStyleClear];
      // A faint white body makes the lens read as glass without hiding the track.
      glass.tintColor = lensTint ?: [UIColor colorWithDynamicProvider:^UIColor *(UITraitCollection *traits) {
        return [UIColor colorWithWhite:1 alpha:traits.userInterfaceStyle == UIUserInterfaceStyleDark ? 0.03 : 0.06];
      }];
      _lensView.effect = glass;
    } else {
      _lensView.effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemUltraThinMaterial];
      _lensView.contentView.backgroundColor = lensTint;
    }
  }
  [self resolveColors];
}

- (void)resolveColors
{
  _onRGBA = RNLiquidResolve(_onColor, self.traitCollection);
  _offRGBA = RNLiquidResolve(_offColor, self.traitCollection);
}

#pragma mark - Touches

- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  if (_disabled) {
    return;
  }
  _touching = YES;
  _dragging = NO;
  _settlePending = NO;
  _touchStartX = [touches.anyObject locationInView:self].x;
  _positionAtTouch = _position.value;
  [_haptics prepare];
  [self lift];
}

- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  if (!_touching) {
    return;
  }
  CGFloat dx = [touches.anyObject locationInView:self].x - _touchStartX;
  if (!_dragging && std::fabs(dx) > kDragSlop) {
    _dragging = YES;
  }
  if (_dragging) {
    // The thumb follows the finger, held back a little past the ends.
    double travel = MAX([self travel], 1);
    double raw = _positionAtTouch + dx / travel;
    double clamped = MIN(MAX(raw, 0.0), 1.0);
    _position.target = clamped + (raw - clamped) * 0.15;
    [self startAnimating];
  }
}

- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  if (!_touching) {
    return;
  }
  _touching = NO;
  BOOL next = _dragging ? _position.target >= 0.5 : !_on;
  _position.target = next ? 1 : 0;
  // Stays lifted while it slides, then deflates once it lands.
  _settlePending = YES;
  [self startAnimating];

  if (next != _on) {
    _on = next;
    [_haptics impactOccurred];
    if (_eventEmitter) {
      std::static_pointer_cast<const RNLiquidSwitchEventEmitter>(_eventEmitter)
          ->onValueChange(RNLiquidSwitchEventEmitter::OnValueChange{.value = static_cast<bool>(next)});
    }
  }
}

- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event
{
  // A parent scroll view took the touch: go back to the current value.
  _touching = NO;
  _position.target = _on ? 1 : 0;
  [self settle];
}

- (void)lift
{
  _press.target = 1;
  _scale.target = kPressedScale;
  [self startAnimating];
}

- (void)settle
{
  _settlePending = NO;
  _press.target = 0;
  _scale.target = 1;
  [self startAnimating];
}

#pragma mark - Animation

- (void)startAnimating
{
  if (_displayLink == nil && self.window != nil) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick:)];
    if (@available(iOS 15.0, *)) {
      _displayLink.preferredFrameRateRange = CAFrameRateRangeMake(60, 120, 120);
    }
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  } else if (self.window == nil) {
    [self render];
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

  BOOL moving = _position.step(dt);
  if (_settlePending && std::fabs(_position.value - _position.target) < 0.08) {
    [self settle];
  }
  moving |= _press.step(dt);
  moving |= _scale.step(dt);

  [self render];

  if (!moving && !_touching && !_settlePending) {
    [self stopAnimating];
  }
}

- (CGSize)trackSize
{
  CGSize size = self.bounds.size;
  // 64 x 28, like the system switch, scaled to the view's width.
  CGFloat width = MIN(size.width, size.height * 64 / 28);
  return CGSizeMake(width, width * 28 / 64);
}

- (CGSize)thumbSize
{
  CGFloat height = [self trackSize].height - kInset * 2;
  return CGSizeMake(height * 40 / 24, height);
}

- (double)travel
{
  return [self trackSize].width - [self thumbSize].width - kInset * 2;
}

- (void)render
{
  CGSize size = self.bounds.size;
  if (size.width <= 0 || size.height <= 0) {
    return;
  }
  CGSize track = [self trackSize];
  CGSize thumb = [self thumbSize];
  CGRect trackFrame = CGRectMake((size.width - track.width) / 2, (size.height - track.height) / 2, track.width, track.height);

  double position = _position.value;
  double fill = MIN(MAX(position, 0.0), 1.0);
  CGFloat press = MIN(MAX(_press.value, 0.0), 1.0);

  [CATransaction begin];
  [CATransaction setDisableActions:YES];

  _trackView.frame = trackFrame;
  _trackView.layer.cornerRadius = track.height / 2;
  _trackView.backgroundColor = [UIColor colorWithRed:_offRGBA.r + (_onRGBA.r - _offRGBA.r) * fill
                                               green:_offRGBA.g + (_onRGBA.g - _offRGBA.g) * fill
                                                blue:_offRGBA.b + (_onRGBA.b - _offRGBA.b) * fill
                                               alpha:_offRGBA.a + (_onRGBA.a - _offRGBA.a) * fill];

  CGPoint center = CGPointMake(CGRectGetMinX(trackFrame) + kInset + thumb.width / 2 + position * [self travel],
                               CGRectGetMidY(trackFrame));
  // Like liquid, the lens stretches along its motion and thins out.
  double speed = std::fabs(_position.velocity);
  CGFloat stretch = MIN(speed * 0.03, 0.18) * press;
  CGFloat scale = _scale.value;
  CGAffineTransform transform = CGAffineTransformMakeScale(scale / (1 - stretch), scale * (1 - stretch / 3));

  CGRect thumbBounds = CGRectMake(0, 0, thumb.width, thumb.height);
  _thumbView.bounds = thumbBounds;
  _thumbView.center = center;
  _thumbView.transform = transform;
  _thumbView.layer.cornerRadius = thumb.height / 2;
  // The solid thumb frosts away into clear glass, and back.
  _thumbView.alpha = 1 - press;
  _thumbView.layer.shadowOpacity = 0.12 * (1 - press);

  _lensView.bounds = thumbBounds;
  _lensView.center = center;
  _lensView.transform = transform;
  _lensView.alpha = MIN(press * 1.6, 1.0);
  _lensView.hidden = press < 0.01;
  if (_lensView.clipsToBounds) {
    _lensView.layer.cornerRadius = thumb.height / 2;
  }

  [CATransaction commit];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _contentView.frame = self.bounds;
  [self render];
}

@end
