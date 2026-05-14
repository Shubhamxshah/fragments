import { IntrospectionSpanProcessor } from '@introspection-sdk/introspection-node'
import type { SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base'
import type { Context } from '@opentelemetry/api'
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base'
import { trace } from '@opentelemetry/api'

// The introspection converter only reads ai.response.text, but streamObject
// emits ai.response.object. This wrapper synthesizes the missing attribute
// so the assistant's response shows up in the trace.
class StreamObjectAwareProcessor implements SpanProcessor {
  private _inner: IntrospectionSpanProcessor

  constructor() {
    this._inner = new IntrospectionSpanProcessor()
  }

  onStart(span: Span, parentContext: Context): void {
    this._inner.onStart(span, parentContext)
  }

  onEnd(span: ReadableSpan): void {
    const attrs = span.attributes
    const responseObject = attrs['ai.response.object']

    if (responseObject != null && attrs['ai.response.text'] == null) {
      const text =
        typeof responseObject === 'string'
          ? responseObject
          : JSON.stringify(responseObject)

      const wrapped = new Proxy(span, {
        get(target, prop) {
          if (prop === 'attributes') {
            return { ...target.attributes, 'ai.response.text': text }
          }
          return (target as any)[prop]
        },
      })
      this._inner.onEnd(wrapped as ReadableSpan)
      return
    }

    this._inner.onEnd(span)
  }

  forceFlush(): Promise<void> {
    return this._inner.forceFlush()
  }

  shutdown(): Promise<void> {
    return this._inner.shutdown()
  }
}

export function registerOtel() {
  if (!process.env.INTROSPECTION_TOKEN) return

  const provider = new BasicTracerProvider({
    spanProcessors: [new StreamObjectAwareProcessor()],
  })
  trace.setGlobalTracerProvider(provider)
}
