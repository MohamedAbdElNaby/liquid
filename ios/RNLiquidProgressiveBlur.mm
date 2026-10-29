#import "RNLiquidProgressiveBlur.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

/// Core Animation's variable blur: the blur radius follows the alpha of a mask
/// image. Private API: nil when unavailable, and the view falls back.
static id RNLiquidVariableBlurFilter(void)
{
  Class filterClass = NSClassFromString(@"CAFilter");
  SEL make = NSSelectorFromString(@"filterWithType:");
  if (filterClass == nil || ![filterClass respondsToSelector:make]) {
    return nil;
  }
  return ((id (*)(id, SEL, id))[filterClass methodForSelector:make])(filterClass, make, @"variableBlur");
}

@implementation RNLiquidProgressiveBlur {
  UIVisualEffectView *_blurView;
  // The tint, fading out with the blur.
  UIView *_tintView;
  CAGradientLayer *_tint;
  // Without the variable blur: an even blur masked to fade out.
  UIView *_fallbackMask;
  CAGradientLayer *_fallbackGradient;
  CGFloat _maxBlurRadius;
  UIColor *_tintColor;
  CGFloat _fadeHeight;
  BOOL _ease;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidProgressiveBlurComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidProgressiveBlurProps>();
    _props = defaultProps;
    _maxBlurRadius = defaultProps->maxBlurRadius;
    _fadeHeight = defaultProps->fadeHeight;
    _ease = defaultProps->fadeCurve == RNLiquidProgressiveBlurFadeCurve::Ease;
    self.userInteractionEnabled = NO;

    _blurView = [[UIVisualEffectView alloc] initWithEffect:[UIBlurEffect effectWithStyle:UIBlurEffectStyleRegular]];
    _blurView.userInteractionEnabled = NO;
    [self addSubview:_blurView];

    _tintView = [UIView new];
    _tintView.userInteractionEnabled = NO;
    _tint = [CAGradientLayer layer];
    [_tintView.layer addSublayer:_tint];
    [self addSubview:_tintView];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<RNLiquidProgressiveBlurProps const>(props);
  _maxBlurRadius = newViewProps.maxBlurRadius;
  _tintColor = RCTUIColorFromSharedColor(newViewProps.blurTintColor);
  _fadeHeight = newViewProps.fadeHeight;
  _ease = newViewProps.fadeCurve == RNLiquidProgressiveBlurFadeCurve::Ease;
  [super updateProps:props oldProps:oldProps];
  [self applyBlur];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self applyBlur];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self applyBlur];
}

/// Strength at `y`, 1 (full) to 0: full above the fade, then down along a
/// straight line or a smootherstep, so neither end of the fade shows.
- (CGFloat)strengthAt:(CGFloat)y height:(CGFloat)height
{
  CGFloat fade = _fadeHeight > 0 ? MIN(_fadeHeight, height) : height;
  CGFloat solid = height - fade;
  if (y <= solid || fade <= 0) {
    return 1;
  }
  CGFloat t = MIN(1, (y - solid) / fade);
  CGFloat eased = _ease ? t * t * t * (t * (t * 6 - 15) + 10) : t;
  return 1 - eased;
}

- (void)applyBlur
{
  CGRect bounds = self.bounds;
  CGFloat height = bounds.size.height;
  if (height <= 0 || bounds.size.width <= 0) {
    return;
  }
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  _blurView.frame = bounds;
  _tintView.frame = bounds;
  _tint.frame = bounds;

  // Gradient stops for the tint and the fallback mask.
  NSInteger steps = 16;
  NSMutableArray<NSNumber *> *locations = [NSMutableArray arrayWithCapacity:steps + 1];
  NSMutableArray<NSNumber *> *strengths = [NSMutableArray arrayWithCapacity:steps + 1];
  for (NSInteger i = 0; i <= steps; i++) {
    CGFloat location = (CGFloat)i / steps;
    [locations addObject:@(location)];
    [strengths addObject:@([self strengthAt:location * height height:height])];
  }

  _tintView.hidden = _tintColor == nil;
  if (_tintColor != nil) {
    CGFloat alpha = CGColorGetAlpha(_tintColor.CGColor);
    NSMutableArray *colors = [NSMutableArray arrayWithCapacity:strengths.count];
    for (NSNumber *strength in strengths) {
      [colors addObject:(id)[_tintColor colorWithAlphaComponent:alpha * strength.doubleValue].CGColor];
    }
    _tint.colors = colors;
    _tint.locations = locations;
  }

  // The effect view's first subview is its backdrop: give it the variable
  // blur and hide the material's own tint layers above it.
  UIView *backdrop = _blurView.subviews.firstObject;
  id filter = backdrop != nil ? RNLiquidVariableBlurFilter() : nil;
  BOOL variable = NO;
  if (filter != nil) {
    @try {
      [filter setValue:@(MAX(0, _maxBlurRadius)) forKey:@"inputRadius"];
      // Kept alive by `mask` until the filter holds its CGImage.
      UIImage *mask = [self maskImageForHeight:height];
      [filter setValue:(__bridge id)mask.CGImage forKey:@"inputMaskImage"];
      [filter setValue:@YES forKey:@"inputNormalizeEdges"];
      backdrop.layer.filters = @[ filter ];
      CGFloat scale = self.window.screen.scale;
      if (scale > 0) {
        // Keeps the blurred backdrop sharp instead of rendering at 1x.
        [backdrop.layer setValue:@(scale) forKey:@"scale"];
      }
      variable = YES;
    } @catch (NSException *exception) {
      backdrop.layer.filters = nil;
    }
  }
  for (UIView *subview in _blurView.subviews) {
    if (subview != backdrop) {
      subview.alpha = variable ? 0 : 1;
    }
  }

  if (variable) {
    _blurView.maskView = nil;
    _fallbackMask = nil;
    _fallbackGradient = nil;
  } else {
    if (_fallbackMask == nil) {
      _fallbackMask = [UIView new];
      _fallbackGradient = [CAGradientLayer layer];
      [_fallbackMask.layer addSublayer:_fallbackGradient];
      _blurView.maskView = _fallbackMask;
    }
    NSMutableArray *colors = [NSMutableArray arrayWithCapacity:strengths.count];
    for (NSNumber *strength in strengths) {
      [colors addObject:(id)[UIColor colorWithWhite:0 alpha:strength.doubleValue].CGColor];
    }
    _fallbackMask.frame = bounds;
    _fallbackGradient.frame = bounds;
    _fallbackGradient.colors = colors;
    _fallbackGradient.locations = locations;
  }
  [CATransaction commit];
}

/// One column, a row per point: opaque where the blur is full, clear where it is gone.
- (UIImage *)maskImageForHeight:(CGFloat)height
{
  NSInteger rows = MAX(1, (NSInteger)ceil(height));
  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat preferredFormat];
  format.scale = 1;
  format.opaque = NO;
  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:CGSizeMake(1, rows) format:format];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
    for (NSInteger y = 0; y < rows; y++) {
      [[UIColor colorWithWhite:0 alpha:[self strengthAt:y + 0.5 height:rows]] setFill];
      UIRectFill(CGRectMake(0, y, 1, 1));
    }
  }];
}

@end
