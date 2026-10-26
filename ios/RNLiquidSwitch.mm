#import "RNLiquidSwitch.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

// Wraps UISwitch, which renders the native Liquid Glass switch on iOS 26:
// the thumb lifts into a glass lens while it slides.
@implementation RNLiquidSwitch {
  UISwitch *_switch;
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

    _switch = [UISwitch new];
    [_switch addTarget:self action:@selector(valueChanged) forControlEvents:UIControlEventValueChanged];
    [self addSubview:_switch];
  }
  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  CGSize size = _switch.intrinsicContentSize;
  _switch.frame = CGRectMake(
      (self.bounds.size.width - size.width) / 2, (self.bounds.size.height - size.height) / 2, size.width, size.height);
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNLiquidSwitchProps const>(props);

  if (_switch.isOn != newProps.value) {
    [_switch setOn:newProps.value animated:_switch.window != nil];
  }
  _switch.enabled = !newProps.disabled;
  _switch.onTintColor = RCTUIColorFromSharedColor(newProps.onTintColor);

  switch (newProps.colorScheme) {
    case RNLiquidSwitchColorScheme::Light:
      _switch.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidSwitchColorScheme::Dark:
      _switch.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      _switch.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)valueChanged
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSwitchEventEmitter>(_eventEmitter)
        ->onValueChange(RNLiquidSwitchEventEmitter::OnValueChange{.value = static_cast<bool>(_switch.isOn)});
  }
}

@end
