#import "RNLiquidSearch.h"

#import <React/RCTConversions.h>

#import <react/renderer/components/ReactNativeLiquidViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/Props.h>
#import <react/renderer/components/ReactNativeLiquidViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static const CGFloat kGap = 16;
// Bar variant: distance between the field and its close button, and the icon size.
static const CGFloat kBarGap = 8;
static const CGFloat kBarIconSize = 18;

// A round glass search button that morphs into a search field. The field and
// the close button live in a glass container, so while they separate the
// glass stretches between them like liquid. React children are the content
// shown next to the button while collapsed; they fade out on expand.
//
// The bar variant is a full-width field under a header row (the children).
// Expanding fades the row up and away, raises the field into it, slides the
// close button in from the trailing edge and moves the icon and placeholder
// from the center to the leading edge.
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
  BOOL _bar;
  CGFloat _headerHeight;
  CGFloat _fieldHeight;
  // Right-to-left layout: frames are worked out left to right, then mirrored.
  BOOL _rtl;
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
    _headerHeight = 52;
    _fieldHeight = 44;

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
  _rtl = layoutMetrics.layoutDirection == LayoutDirection::RightToLeft;
  // Hugs the icon whatever the language of the text or placeholder.
  _textField.textAlignment = _rtl ? NSTextAlignmentRight : NSTextAlignmentLeft;
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

  BOOL bar = newProps.variant == RNLiquidSearchVariant::Bar;
  CGFloat headerHeight = newProps.headerHeight > 0 ? newProps.headerHeight : 52;
  CGFloat fieldHeight = newProps.fieldHeight > 0 ? newProps.fieldHeight : 44;
  if (bar != _bar || !_hasProps) {
    _bar = bar;
    [self applyVariant];
  }
  if (headerHeight != _headerHeight || fieldHeight != _fieldHeight) {
    _headerHeight = headerHeight;
    _fieldHeight = fieldHeight;
    if (newProps.expanded == _expanded) {
      [self layoutForExpanded:_expanded];
    }
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

- (void)applyVariant
{
  UIImageSymbolConfiguration *symbol =
      _bar ? [UIImageSymbolConfiguration configurationWithPointSize:15 weight:UIImageSymbolWeightMedium]
           : [UIImageSymbolConfiguration configurationWithPointSize:17 weight:UIImageSymbolWeightSemibold];
  _searchIcon.image = [UIImage systemImageNamed:@"magnifyingglass" withConfiguration:symbol];
  if (@available(iOS 26.0, *)) {
    // The bar's field and close button stay apart; the button's fuse while separating.
    ((UIGlassContainerEffect *)_containerView.effect).spacing = _bar ? 0 : kGap / 2;
  }
  [self layoutForExpanded:_expanded];
}

#pragma mark - Morph

- (void)layoutForExpanded:(BOOL)expanded
{
  if (_bar) {
    [self layoutBarForExpanded:expanded];
    [self mirrorForRightToLeft];
    return;
  }
  _containerView.frame = self.bounds;
  // Bounds and center, since the content may be scaled.
  _collapsedContentView.bounds = self.bounds;
  _collapsedContentView.center = CGPointMake(CGRectGetMidX(self.bounds), CGRectGetMidY(self.bounds));

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
  [self mirrorForRightToLeft];
}

static CGRect RNLiquidMirror(CGRect frame, CGFloat width)
{
  frame.origin.x = width - CGRectGetMaxX(frame);
  return frame;
}

/// Mirrors the left-to-right layout in right-to-left layout: the button sits
/// at the leading (left) edge and the field grows toward the right. React
/// already mirrors the children.
- (void)mirrorForRightToLeft
{
  if (!_rtl) {
    return;
  }
  CGFloat width = self.bounds.size.width;
  // The container can be wider than the view (the bar's close button waits
  // outside it); it hangs off the left edge instead.
  CGRect container = _containerView.frame;
  CGFloat offset = container.origin.x;
  _containerView.frame = RNLiquidMirror(container, width);
  CGFloat shift = _containerView.frame.origin.x;
  for (UIVisualEffectView *glass in @[ _fieldView, _closeView ]) {
    CGRect frame = glass.frame;
    frame.origin.x += offset;
    frame = RNLiquidMirror(frame, width);
    frame.origin.x -= shift;
    glass.frame = frame;
  }
  CGFloat fieldWidth = _fieldView.bounds.size.width;
  _searchIcon.frame = RNLiquidMirror(_searchIcon.frame, fieldWidth);
  _textField.frame = RNLiquidMirror(_textField.frame, fieldWidth);
}

- (void)layoutBarForExpanded:(BOOL)expanded
{
  CGFloat w = self.bounds.size.width;
  CGFloat fh = _fieldHeight;
  CGFloat hh = _headerHeight;
  if (w <= 0) {
    return;
  }

  // Wide enough to hold the close button while it is outside the view.
  _containerView.frame = CGRectMake(0, 0, w + fh + kBarGap * 4, MAX(self.bounds.size.height, hh + fh));

  CGFloat fieldY = expanded ? (hh - fh) / 2 : hh;
  CGRect field = CGRectMake(0, fieldY, expanded ? w - fh - kBarGap : w, fh);
  // Slides in from beyond the trailing edge, level with the field.
  CGRect close = CGRectMake(expanded ? w - fh : w + kBarGap * 2, fieldY, fh, fh);
  _fieldView.frame = field;
  _closeView.frame = close;
  _closeView.alpha = expanded ? 1 : 0;
  _closeButton.frame = _closeView.bounds;
  if (@available(iOS 26.0, *)) {
    // Capsule corner configurations follow the frames.
  } else {
    _fieldView.layer.cornerRadius = fh / 2;
    _closeView.layer.cornerRadius = fh / 2;
  }

  // The icon and placeholder rest in the center and move to the leading edge
  // while searching.
  CGFloat pad = round(fh * 0.3);
  CGFloat iconGap = 6;
  CGFloat x = pad;
  if (!expanded && _textField.text.length == 0) {
    NSString *placeholder = _textField.placeholder ?: @"";
    CGFloat textWidth = ceil([placeholder sizeWithAttributes:@{NSFontAttributeName : _textField.font}].width);
    x = MAX(pad, round((field.size.width - kBarIconSize - iconGap - textWidth) / 2));
  }
  _searchIcon.frame = CGRectMake(x, (fh - kBarIconSize) / 2, kBarIconSize, kBarIconSize);
  _searchIcon.tintColor = UIColor.secondaryLabelColor;
  CGFloat textX = x + kBarIconSize + iconGap;
  _textField.frame = CGRectMake(textX, 0, MAX(field.size.width - textX - pad, 0), fh);
  _textField.alpha = 1;
  _fieldButton.frame = _fieldView.bounds;
  _fieldButton.hidden = expanded;

  // The header row drifts up and shrinks as it fades.
  _collapsedContentView.bounds = CGRectMake(0, 0, w, hh);
  _collapsedContentView.center = CGPointMake(w / 2, hh / 2);
  _collapsedContentView.alpha = expanded ? 0 : 1;
  _collapsedContentView.transform = expanded
      ? CGAffineTransformScale(CGAffineTransformMakeTranslation(0, -hh * 0.35), 0.9, 0.9)
      : CGAffineTransformIdentity;
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
    // The bar settles quickly with little bounce, like the system search bar.
    [UIView animateWithSpringDuration:_bar ? 0.42 : 0.5
                               bounce:_bar ? 0.08 : 0.22
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
  if (_bar && _textField.text.length > 0) {
    // Closing the bar ends the search, like the system search bar's Cancel.
    _textField.text = @"";
    [self textChanged];
  }
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
