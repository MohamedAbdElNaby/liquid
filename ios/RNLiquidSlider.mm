#import "RNLiquidSlider.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

// Wraps UISlider, which renders the native Liquid Glass slider on iOS 26:
// the thumb turns into a glass lens while dragging.
@implementation RNLiquidSlider {
  BOOL _rtl;
  UISlider *_slider;
  float _step;
  float _lastValue;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidSliderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidSliderProps>();
    _props = defaultProps;

    _slider = [UISlider new];
    _slider.maximumValue = 1;
    [_slider addTarget:self action:@selector(valueChanged) forControlEvents:UIControlEventValueChanged];
    [_slider addTarget:self action:@selector(touchDown) forControlEvents:UIControlEventTouchDown];
    [_slider addTarget:self
                action:@selector(touchUp)
      forControlEvents:UIControlEventTouchUpInside | UIControlEventTouchUpOutside | UIControlEventTouchCancel];
    [self addSubview:_slider];
  }
  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _slider.frame = self.bounds;
}

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
  const auto &newProps = *std::static_pointer_cast<RNLiquidSliderProps const>(props);

  _slider.minimumValue = newProps.minimumValue;
  _slider.maximumValue = newProps.maximumValue;
  _step = newProps.step;
  _slider.enabled = !newProps.disabled;
  _slider.minimumTrackTintColor = RCTUIColorFromSharedColor(newProps.minimumTrackTintColor);

  if (!_slider.isTracking && _slider.value != newProps.value) {
    [_slider setValue:newProps.value animated:_slider.window != nil];
    _lastValue = newProps.value;
  }

  switch (newProps.colorScheme) {
    case RNLiquidSliderColorScheme::Light:
      _slider.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidSliderColorScheme::Dark:
      _slider.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      _slider.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  [super updateProps:props oldProps:oldProps];
}

- (float)steppedValue
{
  float value = _slider.value;
  if (_step > 0) {
    float min = _slider.minimumValue;
    value = MIN(_slider.maximumValue, min + roundf((value - min) / _step) * _step);
  }
  return value;
}

- (void)valueChanged
{
  float value = [self steppedValue];
  if (_step > 0) {
    _slider.value = value;
  }
  if (value == _lastValue) {
    return;
  }
  _lastValue = value;
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSliderEventEmitter>(_eventEmitter)
        ->onValueChange(RNLiquidSliderEventEmitter::OnValueChange{.value = value});
  }
}

- (void)touchDown
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSliderEventEmitter>(_eventEmitter)
        ->onSlidingStart(RNLiquidSliderEventEmitter::OnSlidingStart{.value = [self steppedValue]});
  }
}

- (void)touchUp
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSliderEventEmitter>(_eventEmitter)
        ->onSlidingComplete(RNLiquidSliderEventEmitter::OnSlidingComplete{.value = [self steppedValue]});
  }
}

@end
