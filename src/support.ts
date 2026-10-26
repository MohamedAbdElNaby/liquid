import { Platform } from 'react-native';

function getSupport() {
  if (Platform.OS === 'ios') {
    return parseInt(String(Platform.Version), 10) >= 26;
  }

  if (Platform.OS === 'android') {
    // Blur needs RenderEffect (API 31). Refraction needs RuntimeShader (API 33).
    return Number(Platform.Version) >= 31;
  }

  return false;
}

/**
 * Whether the platform renders the real Liquid Glass material.
 *
 * iOS 26+ uses the native `UIGlassEffect`. Android 12+ uses AndroidLiquidGlass,
 * with lens refraction on Android 13+. Elsewhere a translucent material is used.
 */
export const isLiquidGlassSupported: boolean = getSupport();
