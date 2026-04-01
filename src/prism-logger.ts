// ╔══════════════════════════════════════════════════════════════════╗
// ║  ◆  PRISM LOGGER — ANSI formatting engine for @smackdabdevops/logger
// ║     Used by the pino transport (dev) and direct `log` API (CLI/scripts).
// ╚══════════════════════════════════════════════════════════════════╝

import { hex, bgHex, stripAnsi, type StyleFn } from "./ansi";
import type {
  LogLevel,
  LogData,
  LevelDef,
  WaterfallStep,
  StatusMetrics,
  BannerMeta,
  DomainLoggerInstance,
  PrismLogger,
} from "./types";

/** Writes one ANSI line to stdout (transport worker or main process). */
const devWrite = (line: string): void => {
  process.stdout.write(line + "\n");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  COLOR SYSTEM — Catppuccin Mocha Extended
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const C = {
  // Base
  bg: "#1e1e2e",
  surface: "#313244",
  overlay: "#45475a",
  muted: "#585b70",
  subtle: "#6c7086",
  dim: "#7f849c",
  text: "#cdd6f4",
  bright: "#f5f5f7",

  // Accents
  lavender: "#b4befe",
  blue: "#89b4fa",
  sapphire: "#74c7ec",
  sky: "#89dceb",
  teal: "#94e2d5",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  peach: "#fab387",
  maroon: "#eba0ac",
  red: "#f38ba8",
  mauve: "#cba6f7",
  pink: "#f5c2e7",
  flamingo: "#f2cdcd",
  rosewater: "#f5e0dc",

  // Special
  darkBg: "#11111b",
  fatalBg: "#d20f39",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LEVEL DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface FullLevelDef extends LevelDef {
  color: StyleFn;
  badge: StyleFn;
}

const LEVELS: Record<LogLevel, FullLevelDef> = {
  trace: {
    icon: " ⋯",
    label: "TRC",
    rank: 0,
    color: hex(C.muted),
    badge: bgHex(C.surface, C.subtle),
  },
  debug: {
    icon: " ◦",
    label: "DBG",
    rank: 1,
    color: hex(C.subtle),
    badge: bgHex(C.surface, C.dim),
  },
  info: {
    icon: " ●",
    label: "INF",
    rank: 2,
    color: hex(C.blue),
    badge: bgHex(C.blue, C.darkBg).bold,
  },
  ok: {
    icon: " ✔",
    label: " OK",
    rank: 3,
    color: hex(C.green),
    badge: bgHex(C.green, C.darkBg).bold,
  },
  warn: {
    icon: " ▲",
    label: "WRN",
    rank: 4,
    color: hex(C.yellow),
    badge: bgHex(C.yellow, C.darkBg).bold,
  },
  error: {
    icon: " ✖",
    label: "ERR",
    rank: 5,
    color: hex(C.red),
    badge: bgHex(C.red, C.darkBg).bold,
  },
  fatal: {
    icon: " ◈",
    label: "FTL",
    rank: 6,
    color: hex(C.red).bold,
    badge: bgHex(C.fatalBg, "#ffffff").bold,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DOMAIN COLOR ASSIGNMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DOMAIN_PALETTE = [
  C.mauve,
  C.blue,
  C.yellow,
  C.green,
  C.sky,
  C.pink,
  C.peach,
  C.teal,
  C.lavender,
  C.flamingo,
  C.sapphire,
  C.rosewater,
  C.maroon,
];
const _domainMap = new Map<string, string>();
let _colorIdx = 0;

const dc = (domain: string): string => {
  if (!_domainMap.has(domain)) {
    _domainMap.set(domain, DOMAIN_PALETTE[_colorIdx % DOMAIN_PALETTE.length]);
    _colorIdx++;
  }
  return _domainMap.get(domain)!;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FORMATTING ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const s2 = (n: number): string => String(n).padStart(2, "0");
const s3 = (n: number): string => String(n).padStart(3, "0");

const _ = {
  ts(): string {
    const d = new Date();
    return hex(C.muted)(
      `${s2(d.getHours())}:${s2(d.getMinutes())}:${s2(d.getSeconds())}.${s3(d.getMilliseconds())}`,
    );
  },
  line: (c = C.overlay) => hex(c)("│"),
  dot: hex(C.overlay)("·"),
  arr: hex(C.overlay)("→"),
  dash: (n: number, c = C.overlay) => hex(c)("─".repeat(n)),
};

// ── Value Formatter ────────────────────────────────────────

const fv = (v: unknown): string => {
  if (v === true) return hex(C.green)("✓ true");
  if (v === false) return hex(C.red)("✗ false");
  if (v === null || v === undefined) return hex(C.muted).italic("null");
  if (typeof v === "number") return hex(C.peach).bold(v);
  if (typeof v === "string") {
    // Durations
    if (/^\d+(\.\d+)?\s?ms$/.test(v)) return hex(C.yellow).bold(v);
    // Paths
    if (v.startsWith("/") || v.startsWith("./"))
      return hex(C.sapphire).underline(v);
    // URLs
    if (v.startsWith("http")) return hex(C.sapphire).underline(v);
    // Short strings without quotes
    if (v.length <= 30) return hex(C.text)(v);
    // Long strings truncated
    return hex(C.text)(v.slice(0, 27) + "…");
  }
  if (Array.isArray(v)) return hex(C.dim)(`[${v.length} items]`);
  if (typeof v === "object")
    return hex(C.dim)(
      `{${Object.keys(v as Record<string, unknown>).length} keys}`,
    );
  return hex(C.text)(String(v));
};

// ── Data Formatter ─────────────────────────────────────────

const fmtData = (data?: LogData, indent = 0): string => {
  if (!data || Object.keys(data).length === 0) return "";
  const entries = Object.entries(data);
  const pad = " ".repeat(indent);

  if (entries.length <= 4) {
    // Inline: key=value separated by dots
    const parts = entries.map(
      ([k, v]) => `${hex(C.dim)(k)}${hex(C.overlay)("=")}${fv(v)}`,
    );
    return `  ${hex(C.overlay)("⟨")} ${parts.join(`  ${_.dot}  `)} ${hex(C.overlay)("⟩")}`;
  }

  // Stacked: aligned keys
  const maxKey = Math.max(...entries.map(([k]) => k.length));
  const lines = entries.map(
    ([k, v]) =>
      `${pad}      ${hex(C.overlay)("│")}  ${hex(C.dim)(k.padEnd(maxKey))}  ${hex(C.overlay)("=")}  ${fv(v)}`,
  );
  return "\n" + lines.join("\n");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE EMIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _minLevel = 0;
let _indent = 0;

/** Renders one Prism line for the given logical level (used by transport and `log`). */
export const emit = (
  level: LogLevel,
  domain: string,
  event: string,
  data: LogData = {},
): void => {
  const L = LEVELS[level];
  if (!L || L.rank < _minLevel) return;

  const domainHex = dc(domain);
  const prefix = " ".repeat(_indent * 2);

  const parts = [
    prefix + L.color(L.icon),
    _.ts(),
    L.badge(` ${L.label} `),
    hex(domainHex).bold(domain.padEnd(12)),
    _.line(),
    L.color.bold(event),
    fmtData(data, _indent),
  ];

  devWrite(parts.join(" "));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DECORATORS — Banner, Separator, Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const banner = (title: string, meta: BannerMeta = {}): void => {
  const w = 62;
  const b = hex(C.overlay);
  const t = hex(C.bright).bold;
  const m = hex(C.dim);

  devWrite("");
  devWrite(`  ${b("╔" + "═".repeat(w) + "╗")}`);
  devWrite(
    `  ${b("║")}  ${t("◆  " + title)}${" ".repeat(Math.max(0, w - title.length - 5))}${b("║")}`,
  );

  if (Object.keys(meta).length > 0) {
    const metaStr = Object.entries(meta)
      .map(([k, v]) => `${m(k)} ${hex(C.text)(v)}`)
      .join(hex(C.overlay)("  ·  "));
    devWrite(
      `  ${b("║")}  ${metaStr}${" ".repeat(Math.max(0, w - stripAnsi(metaStr).length - 2))}${b("║")}`,
    );
  }

  devWrite(`  ${b("╚" + "═".repeat(w) + "╝")}`);
  devWrite("");
};

const section = (label: string, icon = "›"): void => {
  const b = hex(C.overlay);
  const l = hex(C.lavender).bold;
  const line = "─".repeat(Math.max(0, 52 - label.length));
  devWrite("");
  devWrite(`  ${b("━━")} ${l(`${icon} ${label}`)} ${b(line)}`);
  devWrite("");
};

const separator = (): void => {
  devWrite(hex(C.surface)(`  ${"┄".repeat(60)}`));
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GROUPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const group = (domain: string, label: string): void => {
  const domainHex = dc(domain);
  const b = hex(C.overlay);
  devWrite("");
  devWrite(
    `  ${b("┌─")} ${hex(domainHex).bold(domain)}  ${hex(C.bright).bold(label)}`,
  );
  devWrite(`  ${b("│")}`);
  _indent++;
};

const groupEnd = (): void => {
  _indent = Math.max(0, _indent - 1);
  devWrite(hex(C.overlay)("  │"));
  devWrite(hex(C.overlay)("  └─────"));
  devWrite("");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIMING — Single + Waterfall
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const time = (domain: string, event: string): ((data?: LogData) => void) => {
  const start = performance.now();
  return (data: LogData = {}) => {
    const ms = performance.now() - start;
    const dur = ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
    const color = ms < 100 ? C.green : ms < 500 ? C.yellow : C.red;
    emit("debug", domain, event, {
      ...data,
      duration: hex(color).bold(dur),
    });
  };
};

const waterfall = (
  domain: string,
  title: string,
  steps: WaterfallStep[],
): void => {
  const b = hex(C.overlay);
  const maxLabel = Math.max(...steps.map((s) => s.label.length));
  const maxMs = Math.max(...steps.map((s) => s.ms));
  const barWidth = 30;

  devWrite("");
  devWrite(`  ${hex(dc(domain)).bold(domain)}  ${hex(C.bright).bold(title)}`);
  devWrite(`  ${b("─".repeat(maxLabel + barWidth + 20))}`);

  steps.forEach((s) => {
    const pct = s.ms / maxMs;
    const filled = Math.max(1, Math.round(pct * barWidth));
    const color = pct < 0.3 ? C.green : pct < 0.7 ? C.yellow : C.red;

    const bar =
      hex(color)("█".repeat(filled)) +
      hex(C.surface)("░".repeat(barWidth - filled));
    const ms = s.ms < 1000 ? `${s.ms}ms` : `${(s.ms / 1000).toFixed(1)}s`;

    devWrite(
      `  ${hex(C.dim)(s.label.padEnd(maxLabel))}  ${b("│")} ${bar} ${hex(color).bold(ms.padStart(7))}`,
    );
  });
  devWrite("");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PROGRESS — Bar + Steps
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const progress = (
  domain: string,
  event: string,
  current: number,
  total: number,
  data: LogData = {},
): void => {
  const pct = Math.round((current / total) * 100);
  const filled = Math.round(pct / 4);
  const empty = 25 - filled;
  const color = pct < 40 ? C.blue : pct < 80 ? C.yellow : C.green;

  const bar =
    hex(color)("█".repeat(filled)) + hex(C.surface)("░".repeat(empty));

  const L = LEVELS.info;
  const domainHex = dc(domain);

  const line = [
    L.color(L.icon),
    _.ts(),
    L.badge(` ${L.label} `),
    hex(domainHex).bold(domain.padEnd(12)),
    _.line(),
    L.color.bold(event),
    ` ${hex(C.overlay)("[")}${bar}${hex(C.overlay)("]")}`,
    hex(C.text).bold(`${pct}%`),
    hex(C.dim)(`(${current}/${total})`),
    fmtData(data),
  ].join(" ");

  devWrite(line);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SPARKLINE — Inline Trend Charts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

const sparkline = (
  domain: string,
  event: string,
  values: number[],
  data: LogData = {},
): void => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const spark = values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * 7);
      const pct = (v - min) / range;
      const color = pct < 0.3 ? C.green : pct < 0.7 ? C.yellow : C.red;
      return hex(color)(SPARK_CHARS[idx]);
    })
    .join("");

  const L = LEVELS.info;
  const domainHex = dc(domain);

  const line = [
    L.color(L.icon),
    _.ts(),
    L.badge(` ${L.label} `),
    hex(domainHex).bold(domain.padEnd(12)),
    _.line(),
    L.color.bold(event),
    ` ${hex(C.overlay)("⌊")}${spark}${hex(C.overlay)("⌋")}`,
    hex(C.dim)(`min=${hex(C.green)(min)}`),
    hex(C.dim)(`max=${hex(C.red)(max)}`),
    hex(C.dim)(
      `avg=${hex(C.yellow)(Math.round(values.reduce((a, b) => a + b, 0) / values.length))}`,
    ),
    fmtData(data),
  ].join(" ");

  devWrite(line);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DIFF — Before/After State Changes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const diff = (
  domain: string,
  event: string,
  before: LogData,
  after: LogData,
): void => {
  emit("info", domain, event);
  const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const maxKey = Math.max(...allKeys.map((k) => k.length));
  const b = hex(C.overlay);

  allKeys.forEach((key) => {
    const bv = before[key];
    const av = after[key];
    const k = hex(C.dim)(key.padEnd(maxKey));
    const pipe = `      ${b("│")}`;

    if (bv === undefined) {
      // Added
      devWrite(
        `${pipe}  ${hex(C.green)("+")} ${k}  ${hex(C.green).bold(String(av))}`,
      );
    } else if (av === undefined) {
      // Removed
      devWrite(
        `${pipe}  ${hex(C.red)("−")} ${k}  ${hex(C.red).strikethrough(String(bv))}`,
      );
    } else if (bv !== av) {
      // Changed
      devWrite(
        `${pipe}  ${hex(C.yellow)("~")} ${k}  ${hex(C.red).strikethrough(String(bv))} ${b("→")} ${hex(C.green).bold(String(av))}`,
      );
    } else {
      // Unchanged
      devWrite(
        `${pipe}    ${hex(C.muted)(key.padEnd(maxKey))}  ${hex(C.muted)(String(bv))}`,
      );
    }
  });
  devWrite("");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TABLE — Structured Columnar Output
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const table = (
  domain: string,
  event: string,
  rows: LogData[],
  columns?: string[],
): void => {
  emit("info", domain, event, { count: rows.length });
  if (!rows.length) return;

  const cols = columns || Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );

  const b = hex(C.overlay);
  const h = hex(C.lavender).bold;
  const pad = "      ";

  // Top border
  devWrite(
    `${pad}${b("┌")}${widths.map((w) => b("─".repeat(w + 2))).join(b("┬"))}${b("┐")}`,
  );

  // Header
  const header = cols.map((c, i) => ` ${h(c.padEnd(widths[i]))} `).join(b("│"));
  devWrite(`${pad}${b("│")}${header}${b("│")}`);

  // Header separator
  devWrite(
    `${pad}${b("├")}${widths.map((w) => b("─".repeat(w + 2))).join(b("┼"))}${b("┤")}`,
  );

  // Rows
  rows.forEach((row) => {
    const line = cols
      .map((c, i) => {
        const val = row[c] ?? "";
        return ` ${fv(val)}${" ".repeat(Math.max(0, widths[i] - String(val).length))} `;
      })
      .join(b("│"));
    devWrite(`${pad}${b("│")}${line}${b("│")}`);
  });

  // Bottom border
  devWrite(
    `${pad}${b("└")}${widths.map((w) => b("─".repeat(w + 2))).join(b("┴"))}${b("┘")}`,
  );
  devWrite("");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  REQUEST TRACE — HTTP/IPC call tracing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Formats an HTTP-style request line (used by pino-http records in the transport). */
export const request = (
  domain: string,
  method: string,
  url: string,
  statusCode: number,
  durationMs: number,
  data: LogData = {},
): void => {
  const color =
    statusCode < 300 ? C.green : statusCode < 400 ? C.yellow : C.red;
  const durColor =
    durationMs < 200 ? C.green : durationMs < 1000 ? C.yellow : C.red;

  const methodColors: Record<string, string> = {
    GET: C.blue,
    POST: C.green,
    PUT: C.yellow,
    PATCH: C.peach,
    DELETE: C.red,
  };
  const mc = methodColors[method] || C.dim;

  const parts = [
    hex(color)(statusCode < 300 ? " ✔" : statusCode < 400 ? " ▲" : " ✖"),
    _.ts(),
    bgHex(mc, C.darkBg).bold(` ${method.padEnd(6)} `),
    hex(dc(domain)).bold(domain.padEnd(12)),
    _.line(),
    hex(color).bold(String(statusCode)),
    hex(C.text)(url),
    hex(durColor).bold(`${durationMs}ms`),
    fmtData(data),
  ].join(" ");

  devWrite(parts);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MEMORY / SYSTEM STATUS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const status = (domain: string, metrics: StatusMetrics): void => {
  const b = hex(C.overlay);
  const domainHex = dc(domain);

  devWrite("");
  devWrite(
    `  ${hex(domainHex).bold(domain)}  ${hex(C.bright).bold("System Status")}`,
  );
  devWrite(`  ${b("─".repeat(56))}`);

  Object.entries(metrics).forEach(([label, { value, max, unit }]) => {
    const pct = Math.round((value / max) * 100);
    const barW = 20;
    const filled = Math.round((value / max) * barW);
    const color = pct < 60 ? C.green : pct < 85 ? C.yellow : C.red;

    const bar =
      hex(color)("█".repeat(filled)) +
      hex(C.surface)("░".repeat(barW - filled));

    devWrite(
      `  ${hex(C.dim)(label.padEnd(14))} ${b("│")} ${bar} ${hex(color).bold(String(pct).padStart(3))}${hex(C.dim)("%")}  ${hex(C.text)(value)}${hex(C.dim)("/")}${hex(C.text)(max)} ${hex(C.dim)(unit)}`,
    );
  });
  devWrite("");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  JSON INSPECT — Deep object pretty-print
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const _printObj = (
  obj: LogData,
  indent: number,
  maxDepth: number,
  currentDepth = 0,
): void => {
  if (currentDepth >= maxDepth) {
    devWrite(" ".repeat(indent) + hex(C.muted)("…"));
    return;
  }
  const b = hex(C.overlay);
  const pad = " ".repeat(indent);

  Object.entries(obj).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      devWrite(`${pad}${hex(C.lavender)(k)}${b(":")} ${b("{")}`);
      _printObj(v as LogData, indent + 2, maxDepth, currentDepth + 1);
      devWrite(`${pad}${b("}")}`);
    } else if (Array.isArray(v)) {
      devWrite(
        `${pad}${hex(C.lavender)(k)}${b(":")} ${b("[")} ${v.map(fv).join(`${b(",")} `)} ${b("]")}`,
      );
    } else {
      devWrite(`${pad}${hex(C.lavender)(k)}${b(":")} ${fv(v)}`);
    }
  });
};

const inspect = (
  domain: string,
  label: string,
  obj: LogData,
  depth = 2,
): void => {
  emit("debug", domain, label);
  _printObj(obj, 6, depth);
  devWrite("");
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DOMAIN LOGGER FACTORY — Scoped logger for a module
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const createDomainLogger = (domain: string): DomainLoggerInstance => ({
  trace: (event, data) => emit("trace", domain, event, data),
  debug: (event, data) => emit("debug", domain, event, data),
  info: (event, data) => emit("info", domain, event, data),
  ok: (event, data) => emit("ok", domain, event, data),
  warn: (event, data) => emit("warn", domain, event, data),
  error: (event, data, err = null) => {
    const d = err
      ? {
          ...data,
          message: err.message,
          stack: err.stack?.split("\n").slice(0, 3).join("\n"),
        }
      : data;
    emit("error", domain, event, d);
  },
  fatal: (event, data, err = null) => {
    const d = err ? { ...data, message: err.message, stack: err.stack } : data;
    emit("fatal", domain, event, d);
  },
  time: (event) => time(domain, event),
  child: (subdomain) => createDomainLogger(`${domain}:${subdomain}`),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const log: PrismLogger = {
  // Core levels
  trace: (domain, event, data) => emit("trace", domain, event, data),
  debug: (domain, event, data) => emit("debug", domain, event, data),
  info: (domain, event, data) => emit("info", domain, event, data),
  ok: (domain, event, data) => emit("ok", domain, event, data),
  warn: (domain, event, data) => emit("warn", domain, event, data),
  error: (domain, event, data, err = null) => {
    const d = err
      ? {
          ...data,
          message: err.message,
          stack: err.stack?.split("\n").slice(0, 3).join("\n"),
        }
      : data;
    emit("error", domain, event, d);
  },
  fatal: (domain, event, data, err = null) => {
    const d = err ? { ...data, message: err.message, stack: err.stack } : data;
    emit("fatal", domain, event, d);
  },

  // Decorators
  banner,
  section,
  separator,

  // Structure
  group,
  groupEnd,

  // Features
  time,
  waterfall,
  progress,
  sparkline,
  diff,
  table,
  request,
  status,
  inspect,

  // Config
  setLevel(level: LogLevel) {
    if (LEVELS[level]) _minLevel = LEVELS[level].rank;
  },

  // Domain logger factory
  domain: createDomainLogger,
};

// Export colors for external use
export { C as COLORS };
export { LEVELS };
export { dc as getDomainColor };
