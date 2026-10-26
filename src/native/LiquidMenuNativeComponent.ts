import {
  codegenNativeComponent,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

type SelectEvent = Readonly<{ id: string }>;
type OpenEvent = Readonly<{ open: boolean }>;

/**
 * A glass button that morphs into a menu. React children are the button's
 * content. Items are passed as JSON because codegen has no recursive types.
 */
export interface NativeProps extends ViewProps {
  /** JSON array of menu items, see `LiquidMenuItem`. */
  items?: string;
  title?: string;
  glassStyle?: CodegenTypes.WithDefault<'regular' | 'clear', 'regular'>;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  menuWidth?: CodegenTypes.WithDefault<CodegenTypes.Float, 250>;
  /** Draws no glass behind the trigger, e.g. inside another glass view. */
  bare?: CodegenTypes.WithDefault<boolean, false>;
  onItemSelect?: CodegenTypes.DirectEventHandler<SelectEvent>;
  onOpenChange?: CodegenTypes.DirectEventHandler<OpenEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidMenu');
