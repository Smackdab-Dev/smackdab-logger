/**
 * Pino worker transport entry: maps JSON log lines to Prism ANSI output.
 * Loaded via nestjs-pino `target: '@smackdabdevops/logger/transport'`.
 * Must use `module.exports` so Node's require() in worker_threads resolves correctly.
 */
import build from "pino-abstract-transport";
import { forceColor } from "./ansi";
import { emit, request as fmtRequest } from "./prism-logger";
import type { LogLevel, LogData } from "./types";

/** Pino numeric level → Prism level name (35 = custom `ok`). */
const LEVEL_NUM_MAP: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  35: "ok",
  40: "warn",
  50: "error",
  60: "fatal",
};

/** String level labels (e.g. when formatters.level is enabled). */
const LEVEL_STR_MAP: Record<string, string> = {
  trace: "trace",
  debug: "debug",
  info: "info",
  ok: "ok",
  warn: "warn",
  error: "error",
  fatal: "fatal",
};

function resolveLevel(level: unknown): LogLevel {
  if (typeof level === "number") {
    const mapped = LEVEL_NUM_MAP[level];
    return (mapped as LogLevel) || "info";
  }
  if (typeof level === "string") {
    const mapped = LEVEL_STR_MAP[level];
    return (mapped as LogLevel) || "info";
  }
  return "info";
}

function resolveDomain(record: Record<string, unknown>): string {
  const d = record.domain ?? record.context ?? record.name;
  if (typeof d === "string" && d.length > 0) return d;
  return "APP";
}

/**
 * Remove pino/core serialization fields; remainder is passed to Prism as structured data.
 */
function restData(record: Record<string, unknown>): LogData {
  const {
    level: _l,
    time: _t,
    pid: _p,
    hostname: _h,
    msg: _m,
    domain: _d,
    context: _c,
    name: _n,
    v: _v,
    req: _req,
    res: _res,
    responseTime: _rt,
    ...data
  } = record;
  return data as LogData;
}

forceColor(true);

module.exports = async function prismTransport(_opts: Record<string, unknown>) {
  return build(async function (source: AsyncIterable<Record<string, unknown>>) {
    for await (const record of source) {
      const levelStr = resolveLevel(record.level);
      const domain = resolveDomain(record);
      const msg =
        typeof record.msg === "string" ? record.msg : String(record.msg ?? "");

      const req = record.req as Record<string, unknown> | undefined;
      const res = record.res as Record<string, unknown> | undefined;
      if (req && res) {
        const method =
          typeof req?.method === "string"
            ? req.method
            : String(req?.method ?? "");
        const urlRaw = req?.url;
        const url =
          typeof urlRaw === "string"
            ? urlRaw
            : urlRaw != null
              ? String(urlRaw)
              : "";
        const statusCode = Number(res?.statusCode ?? 0);
        const rt = record.responseTime;
        const durationMs =
          typeof rt === "number" && !Number.isNaN(rt)
            ? rt
            : Number(rt ?? 0) || 0;
        fmtRequest(domain, method, url, statusCode, durationMs);
        continue;
      }

      emit(levelStr, domain, msg, restData(record));
    }
  });
};
