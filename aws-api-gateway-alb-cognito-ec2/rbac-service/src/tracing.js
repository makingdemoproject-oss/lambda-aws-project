/**
 * OpenTelemetry bootstrap. MUST be `require()`'d as the very first thing in
 * server.js — auto-instrumentation works by monkey-patching modules at
 * require time, so anything loaded BEFORE this won't get spans.
 *
 * Exports traces over OTLP/HTTP to SigNoz (or any OTel collector). In
 * production set:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector.signoz.svc.cluster.local:4318
 *
 * Disable by setting OTEL_ENABLED=false (e.g. in tests).
 */
if (process.env.OTEL_ENABLED === 'false') {
  module.exports = null;
} else {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { Resource } = require('@opentelemetry/resources');
  const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'rbac-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'}/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations({
      // The fs instrumentation is extremely noisy; disable.
      '@opentelemetry/instrumentation-fs': { enabled: false },
    })],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch((e) => console.error('[otel] shutdown error', e)).finally(() => process.exit(0));
  });

  module.exports = sdk;
}
