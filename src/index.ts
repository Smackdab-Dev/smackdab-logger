/**
 * Public entry for `@smackdabdevops/logger`: Prism ANSI helpers and types.
 * For nestjs-pino, use subpath `@smackdabdevops/logger/transport` (see README).
 */
export {
  log,
  COLORS,
  LEVELS,
  getDomainColor,
  emit,
  request,
} from "./prism-logger";
export type {
  LogLevel,
  LogData,
  WaterfallStep,
  StatusMetrics,
  BannerMeta,
} from "./types";
