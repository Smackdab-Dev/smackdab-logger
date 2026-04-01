// ╔══════════════════════════════════════════════════════════════════╗
// ║  @smackdab/logger — Type Definitions                            ║
// ╚══════════════════════════════════════════════════════════════════╝

export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "ok"
  | "warn"
  | "error"
  | "fatal";

export interface LogData {
  [key: string]: unknown;
}

export interface LevelDef {
  icon: string;
  label: string;
  rank: number;
}

export interface WaterfallStep {
  label: string;
  ms: number;
}

export interface StatusMetric {
  value: number;
  max: number;
  unit: string;
}

export interface StatusMetrics {
  [label: string]: StatusMetric;
}

export interface BannerMeta {
  [key: string]: string;
}

export interface DomainLoggerInstance {
  trace: (event: string, data?: LogData) => void;
  debug: (event: string, data?: LogData) => void;
  info: (event: string, data?: LogData) => void;
  ok: (event: string, data?: LogData) => void;
  warn: (event: string, data?: LogData) => void;
  error: (event: string, data?: LogData, err?: Error | null) => void;
  fatal: (event: string, data?: LogData, err?: Error | null) => void;
  time: (event: string) => (data?: LogData) => void;
  child: (subdomain: string) => DomainLoggerInstance;
}

export interface PrismLogger {
  // Core levels
  trace: (domain: string, event: string, data?: LogData) => void;
  debug: (domain: string, event: string, data?: LogData) => void;
  info: (domain: string, event: string, data?: LogData) => void;
  ok: (domain: string, event: string, data?: LogData) => void;
  warn: (domain: string, event: string, data?: LogData) => void;
  error: (
    domain: string,
    event: string,
    data?: LogData,
    err?: Error | null,
  ) => void;
  fatal: (
    domain: string,
    event: string,
    data?: LogData,
    err?: Error | null,
  ) => void;

  // Decorators
  banner: (title: string, meta?: BannerMeta) => void;
  section: (label: string, icon?: string) => void;
  separator: () => void;

  // Grouping
  group: (domain: string, label: string) => void;
  groupEnd: () => void;

  // Features
  time: (domain: string, event: string) => (data?: LogData) => void;
  waterfall: (domain: string, title: string, steps: WaterfallStep[]) => void;
  progress: (
    domain: string,
    event: string,
    current: number,
    total: number,
    data?: LogData,
  ) => void;
  sparkline: (
    domain: string,
    event: string,
    values: number[],
    data?: LogData,
  ) => void;
  diff: (
    domain: string,
    event: string,
    before: LogData,
    after: LogData,
  ) => void;
  table: (
    domain: string,
    event: string,
    rows: LogData[],
    columns?: string[],
  ) => void;
  request: (
    domain: string,
    method: string,
    url: string,
    statusCode: number,
    durationMs: number,
    data?: LogData,
  ) => void;
  status: (domain: string, metrics: StatusMetrics) => void;
  inspect: (
    domain: string,
    label: string,
    obj: LogData,
    depth?: number,
  ) => void;

  // Config
  setLevel: (level: LogLevel) => void;

  // Domain logger factory
  domain: (domain: string) => DomainLoggerInstance;
}
