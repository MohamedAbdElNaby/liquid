#import "RNLiquidSearch.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static const CGFloat kGap = 16;

// A round glass search button that morphs into a search field. The field and
// the close button live in a glass container, so while they separate the
// glass stretches between them like liquid. React children are the content
// shown next to the button while collapsed; they fade out on expand.
@interface RNLiquidSearch () <UITextFieldDelegate>
@end

@implementation RNLiquidSearch {
  UIView *_collapsedContentView;
  UIVisualEffectView *_containerView;
  UIVisualEffectView *_fieldView;
  UIVisualEffectView *_closeView;
  UIImageView *_searchIcon;
  UITextField *_textField;
  UIButton *_fieldButton;
  UIButton *_closeButton;
  BOOL _expanded;
  BOOL _hasProps;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNLiquidSearchComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNLiquidSearchProps>();
    _props = defaultProps;

    _collapsedContentView = [UIView new];
    [self addSubview:_collapsedContentView];

    _containerView = [[UIVisualEffectView alloc] initWithEffect:nil];
    [self addSubview:_containerView];

    _fieldView = [[UIVisualEffectView alloc] initWithEffect:nil];
    _closeView = [[UIVisualEffectView alloc] initWithEffect:nil];
    [_containerView.contentView addSubview:_fieldView];
    [_containerView.contentView addSubview:_closeView];

    if (@available(iOS 26.0, *)) {
      UIGlassContainerEffect *container = [UIGlassContainerEffect new];
      // Below the gap: the glass fuses while the close button separates, then
      // rests as two shapes.
      container.spacing = kGap / 2;
      _containerView.effect = container;
      _fieldView.cornerConfiguration = [UICornerConfiguration capsuleConfiguration];
      _closeView.cornerConfiguration = [UICornerConfiguration capsuleConfiguration];
    } else {
      _fieldView.clipsToBounds = YES;
      _closeView.clipsToBounds = YES;
    }

    UIImageSymbolConfiguration *symbol =
        [UIImageSymbolConfiguration configurationWithPointSize:17 weight:UIImageSymbolWeightSemibold];
    _searchIcon = [[UIImageView alloc] initWithImage:[UIImage systemImageNamed:@"magnifyingglass"
                                                              withConfiguration:symbol]];
    _searchIcon.tintColor = UIColor.labelColor;
    _searchIcon.contentMode = UIViewContentModeCenter;

    _textField = [UITextField new];
    _textField.delegate = self;
    _textField.returnKeyType = UIReturnKeySearch;
    _textField.font = [UIFont systemFontOfSize:17];
    _textField.alpha = 0;
    [_textField addTarget:self action:@selector(textChanged) forControlEvents:UIControlEventEditingChanged];

    // Covers the collapsed button; hidden once expanded so the text field gets touches.
    _fieldButton = [UIButton buttonWithType:UIButtonTypeCustom];
    [_fieldButton addTarget:self action:@selector(requestExpand) forControlEvents:UIControlEventTouchUpInside];

    [_fieldView.contentView addSubview:_textField];
    [_fieldView.contentView addSubview:_searchIcon];
    [_fieldView.contentView addSubview:_fieldButton];

    _closeButton = [UIButton buttonWithType:UIButtonTypeSystem];
    [_closeButton setImage:[UIImage systemImageNamed:@"xmark" withConfiguration:symbol] forState:UIControlStateNormal];
    _closeButton.tintColor = UIColor.labelColor;
    [_closeButton addTarget:self action:@selector(requestCollapse) forControlEvents:UIControlEventTouchUpInside];
    [_closeView.contentView addSubview:_closeButton];
    _closeView.alpha = 0;

    [self applyStyleWithProps:*defaultProps];
  }
  return self;
}

#pragma mark - Touches

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  UIView *hit = [super hitTest:point withEvent:event];
  // The glass container spans the whole view; outside the glass shapes, touches
  // belong to the content next to the button (and to nothing while expanded).
  if (hit == _containerView || hit == _containerView.contentView) {
    if (_expanded) {
      return nil;
    }
    return [_collapsedContentView hitTest:[self convertPoint:point toView:_collapsedContentView] withEvent:event];
  }
  return hit;
}

#pragma mark - Children

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [_collapsedContentView insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _collapsedContentView.frame = self.bounds;
  _containerView.frame = self.bounds;
  [self layoutForExpanded:_expanded];
}

#pragma mark - Props

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNLiquidSearchProps const>(props);

  [self applyStyleWithProps:newProps];

  _textField.placeholder = RCTNSStringFromStringNilIfEmpty(newProps.placeholder) ?: @"Search";
  NSString *text = RCTNSStringFromString(newProps.text);
  if (![_textField.text isEqualToString:text]) {
    _textField.text = text;
  }

  if (newProps.expanded != _expanded || !_hasProps) {
    BOOL animated = _hasProps && self.window != nil;
    _expanded = newProps.expanded;
    [self setExpanded:_expanded animated:animated];
  }
  _hasProps = YES;

  [super updateProps:props oldProps:oldProps];
}

- (void)applyStyleWithProps:(RNLiquidSearchProps const &)props
{
  switch (props.colorScheme) {
    case RNLiquidSearchColorScheme::Light:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleLight;
      break;
    case RNLiquidSearchColorScheme::Dark:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleDark;
      break;
    default:
      self.overrideUserInterfaceStyle = UIUserInterfaceStyleUnspecified;
      break;
  }

  UIColor *tint = RCTUIColorFromSharedColor(props.glassTintColor);
  if (@available(iOS 26.0, *)) {
    UIGlassEffectStyle style =
        props.glassStyle == RNLiquidSearchGlassStyle::Clear ? UIGlassEffectStyleClear : UIGlassEffectStyleRegular;
    UIGlassEffect *field = [UIGlassEffect effectWithStyle:style];
    field.tintColor = tint;
    field.interactive = YES;
    UIGlassEffect *close = [UIGlassEffect effectWithStyle:style];
    close.interactive = YES;
    _fieldView.effect = field;
    _closeView.effect = close;
  } else {
    _fieldView.effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemThinMaterial];
    _closeView.effect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleSystemThinMaterial];
  }
}

#pragma mark - Morph

- (void)layoutForExpanded:(BOOL)expanded
{
  CGSize size = self.bounds.size;
  CGFloat h = size.height;
  if (size.width <= 0 || h <= 0) {
    return;
  }

  CGRect button = CGRectMake(size.width - h, 0, h, h);
  CGRect field = expanded ? CGRectMake(0, 0, size.width - h - kGap, h) : button;
  // The close button grows out of the field's trailing edge.
  CGRect close = expanded ? button : CGRectInset(CGRectMake(CGRectGetMaxX(button) - h, 0, h, h), h * 0.3, h * 0.3);

  _fieldView.frame = field;
  _closeView.frame = close;
  _closeView.alpha = expanded ? 1 : 0;
  _closeButton.frame = _closeView.bounds;
  if (@available(iOS 26.0, *)) {
    // Capsule corner configurations follow the frames.
  } else {
    _fieldView.layer.cornerRadius = h / 2;
    _closeView.layer.cornerRadius = close.size.height / 2;
  }

  CGFloat iconSize = 22;
  _searchIcon.frame = expanded ? CGRectMake(h * 0.32, (h - iconSize) / 2, iconSize, iconSize)
                               : CGRectMake((h - iconSize) / 2, (h - iconSize) / 2, iconSize, iconSize);
  _searchIcon.tintColor = expanded ? UIColor.secondaryLabelColor : UIColor.labelColor;
  CGFloat textX = h * 0.32 + iconSize + 8;
  _textField.frame = CGRectMake(textX, 0, MAX(field.size.width - textX - h * 0.32, 0), h);
  _textField.alpha = expanded ? 1 : 0;
  _fieldButton.frame = _fieldView.bounds;
  _fieldButton.hidden = expanded;

  _collapsedContentView.alpha = expanded ? 0 : 1;
  _collapsedContentView.transform = expanded ? CGAffineTransformMakeScale(0.92, 0.92) : CGAffineTransformIdentity;
}

- (void)setExpanded:(BOOL)expanded animated:(BOOL)animated
{
  if (!animated) {
    [self layoutForExpanded:expanded];
    return;
  }

  void (^changes)(void) = ^{
    [self layoutForExpanded:expanded];
  };
  if (@available(iOS 17.0, *)) {
    [UIView animateWithSpringDuration:0.5
                               bounce:0.22
                initialSpringVelocity:0
                                delay:0
                              options:UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction
                           animations:changes
                           completion:nil];
  } else {
    [UIView animateWithDuration:0.5
                          delay:0
         usingSpringWithDamping:0.78
          initialSpringVelocity:0
                        options:UIViewAnimationOptionBeginFromCurrentState
                     animations:changes
                     completion:nil];
  }

  if (expanded) {
    [_textField becomeFirstResponder];
  } else {
    [_textField resignFirstResponder];
  }
}

#pragma mark - Events

- (void)requestExpand
{
  [self emitExpanded:YES];
}

- (void)requestCollapse
{
  [self emitExpanded:NO];
}

- (void)emitExpanded:(BOOL)expanded
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSearchEventEmitter>(_eventEmitter)
        ->onExpandedChange(RNLiquidSearchEventEmitter::OnExpandedChange{.expanded = static_cast<bool>(expanded)});
  }
}

- (void)textChanged
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSearchEventEmitter>(_eventEmitter)
        ->onChangeText(RNLiquidSearchEventEmitter::OnChangeText{.text = std::string(_textField.text.UTF8String ?: "")});
  }
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField
{
  if (_eventEmitter) {
    std::static_pointer_cast<const RNLiquidSearchEventEmitter>(_eventEmitter)
        ->onSearchSubmit(RNLiquidSearchEventEmitter::OnSearchSubmit{.text = std::string(textField.text.UTF8String ?: "")});
  }
  [textField resignFirstResponder];
  return YES;
}

@end
