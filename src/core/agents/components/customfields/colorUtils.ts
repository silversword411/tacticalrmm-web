interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/**
 * Parses a hex color string (#RGB or #RRGGBB) into { r, g, b } in 0-255 range.
 */
export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, "");
  let r: number, g: number, b: number;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0]! + cleaned[0]!, 16);
    g = parseInt(cleaned[1]! + cleaned[1]!, 16);
    b = parseInt(cleaned[2]! + cleaned[2]!, 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  } else {
    return null;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Converts { r, g, b } (0-255) to a 6-character hex string with leading #.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts a hex color to HSL.
 */
export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to a hex color string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return rgbToHex(f(0), f(8), f(4));
}

/**
 * Derives a lighter shade from a hex color.
 * @param targetLightness HSL lightness 0-100 (default 92)
 * @param targetSaturation HSL saturation 0-100. If undefined, defaults to 60% of original.
 */
export function lightenColor(hex: string, targetLightness = 92, targetSaturation?: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const newL = Math.min(Math.max(hsl.l + 20, targetLightness), 97);
  const newS = targetSaturation != null ? Math.max(targetSaturation, 0) : Math.max(hsl.s * 0.6, 10);
  return hslToHex(hsl.h, newS, newL);
}

/**
 * Computes WCAG 2.0 relative luminance (0 = black, 1 = white).
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const linearize = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  );
}

/**
 * Returns the most readable text color for a given background.
 * Uses WCAG luminance threshold.
 */
export function getContrastTextColor(bgHex: string): string {
  const lum = getRelativeLuminance(bgHex);
  return lum > 0.179 ? "#1a1a1a" : "#f5f5f5";
}

/**
 * Generates an array of evenly-spaced hue colors around the color wheel.
 * @param count Number of hue stops (default 18 = every 20 degrees)
 * @param saturation HSL saturation 0-100 (default 70)
 * @param lightness HSL lightness 0-100 (default 55)
 */
export function generateHueWheel(
  count = 18,
  saturation = 70,
  lightness = 55,
): string[] {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) =>
    hslToHex(Math.round(i * step), saturation, lightness),
  );
}
