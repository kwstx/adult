/**
 * ============================================================================
 * AUTHORITATIVE DISTRIBUTED TRACING ENGINE (W3C TRACE CONTEXT STANDARD)
 * ============================================================================
 * Production distributed tracing conforming to W3C TraceContext specifications:
 * - traceparent: version (00) - traceId (32 hex) - parentSpanId (16 hex) - traceFlags (01 sampled)
 * - tracestate: opaque vendor state key-values
 * - AsyncLocalStorage context propagation across async boundaries
 */

import { AsyncLocalStorage } from "async_hooks";
import * as crypto from "crypto";

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentId?: string;
  traceFlags: string;
  tracestate?: string;
}

export type SpanStatusCode = "UNSET" | "OK" | "ERROR";

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

export interface SpanData {
  traceId: string;
  spanId: string;
  parentId?: string;
  name: string;
  kind: "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER";
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, any>;
  events: SpanEvent[];
  status: SpanStatus;
}

export class Span {
  public readonly context: SpanContext;
  public readonly name: string;
  public readonly kind: "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER";
  public readonly startTime: number;
  public endTime?: number;
  public durationMs?: number;
  public attributes: Record<string, any> = {};
  public events: SpanEvent[] = [];
  public status: SpanStatus = { code: "UNSET" };

  constructor(
    name: string,
    context: SpanContext,
    kind: "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER" = "INTERNAL",
    attributes: Record<string, any> = {}
  ) {
    this.name = name;
    this.context = context;
    this.kind = kind;
    this.startTime = Date.now();
    this.attributes = { ...attributes };
  }

  public setAttribute(key: string, value: any): this {
    this.attributes[key] = value;
    return this;
  }

  public setAttributes(attrs: Record<string, any>): this {
    Object.assign(this.attributes, attrs);
    return this;
  }

  public addEvent(name: string, attributes?: Record<string, any>): this {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    return this;
  }

  public setStatus(code: SpanStatusCode, message?: string): this {
    this.status = { code, message };
    return this;
  }

  public recordException(error: Error | any): this {
    this.setStatus("ERROR", error?.message || String(error));
    this.addEvent("exception", {
      "exception.type": error?.name || "Error",
      "exception.message": error?.message || String(error),
      "exception.stacktrace": error?.stack,
    });
    return this;
  }

  public end(): SpanData {
    this.endTime = Date.now();
    this.durationMs = this.endTime - this.startTime;
    if (this.status.code === "UNSET") {
      this.status.code = "OK";
    }

    const data: SpanData = {
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      parentId: this.context.parentId,
      name: this.name,
      kind: this.kind,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs: this.durationMs,
      attributes: { ...this.attributes },
      events: [...this.events],
      status: { ...this.status },
    };

    Tracer.recordCompletedSpan(data);
    return data;
  }
}

export class Tracer {
  private static asyncLocalStorage = new AsyncLocalStorage<Span>();
  private static completedSpans: SpanData[] = [];
  private static maxSpanBuffer = 500;

  /**
   * Generates a standard W3C 32-hex (16-byte) Trace ID.
   */
  public static generateTraceId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Generates a standard W3C 16-hex (8-byte) Span ID.
   */
  public static generateSpanId(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  /**
   * Parses standard W3C `traceparent` header (format: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01).
   */
  public static parseTraceparent(headerValue?: string | null): SpanContext | null {
    if (!headerValue) return null;
    const parts = headerValue.trim().split("-");
    if (parts.length < 4) return null;
    const [version, traceId, parentSpanId, traceFlags] = parts;

    // Validate lengths: version=2, traceId=32, parentSpanId=16, flags=2
    if (version !== "00" && version !== "01") return null;
    if (traceId.length !== 32 || traceId === "00000000000000000000000000000000") return null;
    if (parentSpanId.length !== 16 || parentSpanId === "0000000000000000") return null;

    return {
      traceId,
      spanId: Tracer.generateSpanId(),
      parentId: parentSpanId,
      traceFlags: traceFlags || "01",
    };
  }

  /**
   * Formats a SpanContext into a standard W3C `traceparent` string.
   */
  public static formatTraceparent(context: SpanContext): string {
    return `00-${context.traceId}-${context.spanId}-${context.traceFlags || "01"}`;
  }

  /**
   * Extracts tracing context from HTTP Request headers.
   */
  public static extractContext(headers: Headers | Record<string, string | undefined>): SpanContext {
    const getHeader = (key: string): string | undefined => {
      if (typeof (headers as any).get === "function") {
        return (headers as Headers).get(key) || undefined;
      }
      return (headers as Record<string, string | undefined>)[key] || (headers as Record<string, string | undefined>)[key.toLowerCase()];
    };

    const traceparent = getHeader("traceparent");
    const parsed = Tracer.parseTraceparent(traceparent);
    if (parsed) {
      parsed.tracestate = getHeader("tracestate");
      return parsed;
    }

    // Fallback: Check custom or B3 header
    const xTraceId = getHeader("x-trace-id") || getHeader("x-correlation-id");
    const traceId = xTraceId && xTraceId.length === 32 ? xTraceId : Tracer.generateTraceId();
    return {
      traceId,
      spanId: Tracer.generateSpanId(),
      traceFlags: "01",
    };
  }

  /**
   * Injects active or provided tracing context into outgoing HTTP/RPC headers.
   */
  public static injectContext(targetHeaders: Record<string, string>, context?: SpanContext): void {
    const ctx = context || Tracer.getActiveContext();
    if (!ctx) return;
    targetHeaders["traceparent"] = Tracer.formatTraceparent(ctx);
    targetHeaders["x-trace-id"] = ctx.traceId;
    if (ctx.tracestate) {
      targetHeaders["tracestate"] = ctx.tracestate;
    }
  }

  /**
   * Retrieves the currently active span in the async execution context.
   */
  public static getActiveSpan(): Span | undefined {
    return Tracer.asyncLocalStorage.getStore();
  }

  /**
   * Retrieves the current active trace context if any.
   */
  public static getActiveContext(): SpanContext | undefined {
    return Tracer.getActiveSpan()?.context;
  }

  /**
   * Starts a new Span. If a parent context exists, links as child.
   */
  public static startSpan(
    name: string,
    options: {
      parentContext?: SpanContext;
      kind?: "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER";
      attributes?: Record<string, any>;
    } = {}
  ): Span {
    const activeSpan = Tracer.getActiveSpan();
    const parent = options.parentContext || activeSpan?.context;

    const context: SpanContext = {
      traceId: parent?.traceId || Tracer.generateTraceId(),
      spanId: Tracer.generateSpanId(),
      parentId: parent?.spanId,
      traceFlags: parent?.traceFlags || "01",
      tracestate: parent?.tracestate,
    };

    return new Span(name, context, options.kind || "INTERNAL", options.attributes);
  }

  /**
   * Runs an asynchronous callback within the context of a new active span.
   */
  public static async withSpan<T>(
    name: string,
    callback: (span: Span) => Promise<T>,
    options: {
      parentContext?: SpanContext;
      kind?: "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER";
      attributes?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const span = Tracer.startSpan(name, options);
    return Tracer.asyncLocalStorage.run(span, async () => {
      try {
        const result = await callback(span);
        span.setStatus("OK");
        return result;
      } catch (error: any) {
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  public static recordCompletedSpan(span: SpanData): void {
    if (Tracer.completedSpans.length >= Tracer.maxSpanBuffer) {
      Tracer.completedSpans.shift();
    }
    Tracer.completedSpans.push(span);
  }

  public static getCompletedSpans(): SpanData[] {
    return [...Tracer.completedSpans];
  }

  public static clearCompletedSpans(): void {
    Tracer.completedSpans = [];
  }
}
