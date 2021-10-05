import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { trace, context, propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { NodeTracerProvider } from '@opentelemetry/node';

const tracerProvider = new NodeTracerProvider({});
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

tracerProvider.register();
registerInstrumentations({
  tracerProvider: tracerProvider,
  instrumentations: [new HttpInstrumentation()]
});

console.log('Tracing initialised');

export const tracer = tracerProvider.getTracer('repo-to-gp-tracer');

export const setCurrentSpanAttributes = attributes => {
  const currentSpan = trace.getSpan(context.active());
  if (currentSpan) {
    currentSpan.setAttributes(attributes);
  }
};
