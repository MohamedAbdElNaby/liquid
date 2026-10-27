import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

type ExpandedEvent = Readonly<{ expanded: boolean }>;
type TextEvent = Readonly<{ text: string }>;

/**
 * A round glass search button that morphs into a search field with a
 * separate close button. React children are the content shown next to the
 * button while collapsed (title, other buttons); it fades out on expand.
 */
export interface NativeProps extends ViewProps {
  expanded?: CodegenTypes.WithDefault<boolean, false>;
  placeholder?: string;
  text?: string;
  glassStyle?: CodegenTypes.WithDefault<'regular' | 'clear', 'regular'>;
  glassTintColor?: ColorValue;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  /**
   * `button`: a round button that morphs into the field. `bar`: a full-width
   * field under a header row (the children) that rises into that row.
   */
  variant?: CodegenTypes.WithDefault<'button' | 'bar', 'button'>;
  /** Height of the header row in the `bar` variant. */
  headerHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 52>;
  /** Height of the field in the `bar` variant. */
  fieldHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 44>;
  onExpandedChange?: CodegenTypes.DirectEventHandler<ExpandedEvent>;
  onChangeText?: CodegenTypes.DirectEventHandler<TextEvent>;
  onSearchSubmit?: CodegenTypes.DirectEventHandler<TextEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidSearch');
