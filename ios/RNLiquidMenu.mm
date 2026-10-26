#import "RNLiquidMenu.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

/// UIButton that reports when its menu opens and closes.
@interface RNLiquidMenuButton : UIButton
@property (nonatomic, copy, nullable) void (^onMenuWillOpen)(id<UIContextMenuInteractionAnimating> _Nullable animator);
@property (nonatomic, copy, nullable) void (^onMenuWillClose)(id<UIContextMenuInteractionAnimating> _Nullable animator);
@end

@implementation RNLiquidMenuButton

- (void)contextMenuInteraction:(UIContextMenuInteraction *)interaction
    willDisplayMenuForConfiguration:(UIContextMenuConfiguration *)configuration
                           animator:(id<UIContextMenuInteractionAnimating>)animator
{
  [super contextMenuInteraction:interaction willDisplayMenuForConfiguration:configuration animator:animator];
  if (self.onMenuWillOpen) {
    self.onMenuWillOpen(animator);
  }
}

- (void)contextMenuInteraction:(UIContextMenuInteraction *)interaction
       willEndForConfiguration:(UIContextMenuConfiguration *)configuration
                      animator:(id<UIContextMenuInteractionAnimating>)animator
{
  [super contextMenuInteraction:interaction willEndForConfiguration:configuration animator:animator];
  if (self.onMenuWillClose) {
    self.onMenuWillClose(animator);
  }
}

@end

// A glass button whose glass morphs into a menu, using the system button menu
// (iOS 26 animates the button into the menu and back). React children are the
// button's content and are faded out while the menu is open.
@implementation RNLiquidMenu {
  RNLiquidMenuButton *_button;
  UIView *_contentView;
  NSString *_itemsJSON;
  NSString *_title;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidMenuComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidMenuProps>();
    _props = defaultProps;

    _button = [RNLiquidMenuButton buttonWithType:UIButtonTypeCustom];
    _button.showsMenuAsPrimaryAction = YES;
    [self addSubview:_button];

    _contentView = [UIView new];
    _contentView.userInteractionEnabled = NO;
    [self addSubview:_contentView];

    __weak RNLiquidMenu *weakSelf = self;
    _button.onMenuWillOpen = ^(id<UIContextMenuInteractionAnimating> animator) {
      [weakSelf menuWillOpen:YES animator:animator];
    };
    _button.onMenuWillClose = ^(id<UIContextMenuInteractionAnimating> animator) {
      [weakSelf menuWillOpen:NO animator:animator];
    };

    [self applyStyleWithProps:*defaultProps];
  }
  return self;
}

#pragma mark - Children

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [_contentView insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _button.frame = self.bounds;
  _contentView.frame = self.bounds;
}

#pragma mark - Props

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNLiquidMenuProps const>(props);

  NSString *items = RCTNSStringFromStringNilIfEmpty(newProps.items);
  NSString *title = RCTNSStringFromStringNilIfEmpty(newProps.title);
  if (![items isEqualToString:_itemsJSON] || ![title isEqualToString:_title] || (title == nil) != (_title == nil)) {
    _itemsJSON = items;
    _title = title;
    _button.menu = [self buildMenu];
  }

  [self applyStyleWithProps:newProps];

  [super updateProps:props oldProps:oldProps];
}

- (void)applyStyleWithProps:(RNLiquidMenuProps const &)props
{
  switch (props.colorScheme) {
    case RNLiquidMenuColorScheme::Light:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidMenuColorScheme::Dark:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  if (props.bare) {
    UIButtonConfiguration *configuration = [UIButtonConfiguration plainButtonConfiguration];
    configuration.background.backgroundColor = UIColor.clearColor;
    _button.configuration = configuration;
  } else if (@available(iOS 26.0, *)) {
    UIButtonConfiguration *configuration = props.glassStyle == RNLiquidMenuGlassStyle::Clear
        ? [UIButtonConfiguration clearGlassButtonConfiguration]
        : [UIButtonConfiguration glassButtonConfiguration];
    configuration.cornerStyle = UIButtonConfigurationCornerStyleCapsule;
    _button.configuration = configuration;
  } else {
    UIButtonConfiguration *configuration = [UIButtonConfiguration grayButtonConfiguration];
    configuration.cornerStyle = UIButtonConfigurationCornerStyleCapsule;
    _button.configuration = configuration;
  }
}

#pragma mark - Menu

- (UIMenu *)buildMenu
{
  NSArray *items = @[];
  if (_itemsJSON != nil) {
    NSData *data = [_itemsJSON dataUsingEncoding:NSUTF8StringEncoding];
    id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if ([parsed isKindOfClass:[NSArray class]]) {
      items = parsed;
    }
  }
  return [UIMenu menuWithTitle:_title ?: @"" children:[self elementsFromItems:items]];
}

- (NSArray<UIMenuElement *> *)elementsFromItems:(NSArray *)items
{
  NSMutableArray<UIMenuElement *> *elements = [NSMutableArray new];
  for (id item in items) {
    if (![item isKindOfClass:[NSDictionary class]]) {
      continue;
    }
    NSDictionary *dict = item;
    NSString *title = dict[@"title"] ?: @"";
    NSString *subtitle = dict[@"subtitle"];
    NSString *systemImage = dict[@"systemImage"];
    UIImage *image = systemImage.length > 0 ? [UIImage systemImageNamed:systemImage] : nil;
    NSArray *children = dict[@"children"];

    if ([children isKindOfClass:[NSArray class]]) {
      UIMenuOptions options = [dict[@"inline"] boolValue] ? UIMenuOptionsDisplayInline : 0;
      UIMenu *submenu = [UIMenu menuWithTitle:title
                                        image:image
                                   identifier:nil
                                      options:options
                                     children:[self elementsFromItems:children]];
      if (subtitle.length > 0) {
        submenu.subtitle = subtitle;
      }
      [elements addObject:submenu];
      continue;
    }

    NSString *identifier = [dict[@"id"] description] ?: title;
    __weak RNLiquidMenu *weakSelf = self;
    UIAction *action = [UIAction actionWithTitle:title
                                           image:image
                                      identifier:nil
                                         handler:^(__kindof UIAction *_Nonnull a) {
                                           [weakSelf emitSelect:identifier];
                                         }];
    if (subtitle.length > 0) {
      action.subtitle = subtitle;
    }
    UIMenuElementAttributes attributes = 0;
    if ([dict[@"destructive"] boolValue]) {
      attributes |= UIMenuElementAttributesDestructive;
    }
    if ([dict[@"disabled"] boolValue]) {
      attributes |= UIMenuElementAttributesDisabled;
    }
    action.attributes = attributes;
    if ([dict[@"checked"] boolValue]) {
      action.state = UIMenuElementStateOn;
    }
    [elements addObject:action];
  }
  return elements;
}

- (void)menuWillOpen:(BOOL)open animator:(id<UIContextMenuInteractionAnimating>)animator
{
  void (^fade)(void) = ^{
    self->_contentView.alpha = open ? 0 : 1;
  };
  if (animator) {
    [animator addAnimations:fade];
  } else {
    fade();
  }

  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidMenuEventEmitter>(_eventEmitter)
        ->onOpenChange(RNLiquidMenuEventEmitter::OnOpenChange{.open = static_cast<bool>(open)});
  }
}

- (void)emitSelect:(NSString *)identifier
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidMenuEventEmitter>(_eventEmitter)
        ->onItemSelect(RNLiquidMenuEventEmitter::OnItemSelect{.id = std::string(identifier.UTF8String ?: "")});
  }
}

@end
