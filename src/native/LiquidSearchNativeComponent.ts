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
  onExpandedChange?: CodegenTypes.DirectEventHandler<ExpandedEvent>;
  onChangeText?: CodegenTypes.DirectEventHandler<TextEvent>;
  onSearchSubmit?: CodegenTypes.DirectEventHandler<TextEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidSearch');
