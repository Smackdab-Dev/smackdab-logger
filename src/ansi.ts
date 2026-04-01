// ╔══════════════════════════════════════════════════════════════════╗
// ║  ANSI Color Engine — Zero-dependency terminal coloring          ║
// ║  Replaces chalk with built-in ANSI escape sequences             ║
// ╚══════════════════════════════════════════════════════════════════╝

const ESC = "\x1b[";
const RESET = `${ESC}0m`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HEX → RGB → ANSI 256-color / Truecolor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// Truecolor foreground: ESC[38;2;r;g;bm
function fg(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${ESC}38;2;${r};${g};${b}m`;
}

// Truecolor background: ESC[48;2;r;g;bm
function bg(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${ESC}48;2;${r};${g};${b}m`;
}

// Modifiers
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const UNDERLINE = `${ESC}4m`;
const STRIKETHROUGH = `${ESC}9m`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Chainable Style Builder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface StyleFn {
  (text: string | number): string;
  bold: StyleFn;
  dim: StyleFn;
  italic: StyleFn;
  underline: StyleFn;
  strikethrough: StyleFn;
}

function createStyle(codes: string[]): StyleFn {
  const apply = (text: string | number): string => {
    if (!supportsColor()) return String(text);
    return codes.join("") + String(text) + RESET;
  };

  // Make it chainable
  Object.defineProperty(apply, "bold", {
    get: () => createStyle([...codes, BOLD]),
  });
  Object.defineProperty(apply, "dim", {
    get: () => createStyle([...codes, DIM]),
  });
  Object.defineProperty(apply, "italic", {
    get: () => createStyle([...codes, ITALIC]),
  });
  Object.defineProperty(apply, "underline", {
    get: () => createStyle([...codes, UNDERLINE]),
  });
  Object.defineProperty(apply, "strikethrough", {
    get: () => createStyle([...codes, STRIKETHROUGH]),
  });

  return apply as StyleFn;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Public API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Color text with hex foreground */
export function hex(color: string): StyleFn {
  return createStyle([fg(color)]);
}

/** Color text with hex background + hex foreground */
export function bgHex(bgColor: string, fgColor: string): StyleFn {
  return createStyle([bg(bgColor), fg(fgColor)]);
}

/** Strip ANSI escape codes for length calculation */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Color Support Detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _forceColor: boolean | null = null;

export function forceColor(enabled: boolean): void {
  _forceColor = enabled;
}

export function supportsColor(): boolean {
  if (_forceColor !== null) return _forceColor;

  // Browser environment — no ANSI
  if (typeof window !== "undefined") return false;

  // Check FORCE_COLOR env
  if (typeof process !== "undefined") {
    if (process.env.FORCE_COLOR === "0" || process.env.NO_COLOR) return false;
    if (process.env.FORCE_COLOR === "1" || process.env.FORCE_COLOR === "true")
      return true;

    // Check if stdout is a TTY
    if (process.stdout?.isTTY) return true;

    // CI environments usually support color
    if (process.env.CI) return true;
  }

  return false;
}
