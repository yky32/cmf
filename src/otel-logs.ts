import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { format } from "util";

const LEVELS: Record<string, { text: string; number: SeverityNumber }> = {
    error: { text: "ERROR", number: SeverityNumber.ERROR },
    warn: { text: "WARN", number: SeverityNumber.WARN },
    info: { text: "INFO", number: SeverityNumber.INFO },
    log: { text: "INFO", number: SeverityNumber.INFO },
    debug: { text: "DEBUG", number: SeverityNumber.DEBUG },
};

function logsUrl(endpoint: string): string {
    const trimmed = endpoint.replace(/\/$/, "");
    return trimmed.endsWith("/v1/logs") ? trimmed : `${trimmed}/v1/logs`;
}

/**
 * Ship console output to SigNoz when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Unset = local no-op. Does not replace stdout.
 */
export function startOtelLogs(): void {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint) {
        return;
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || "cmf";
    const provider = new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": serviceName }),
        processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter({ url: logsUrl(endpoint) }) })],
    });
    logs.setGlobalLoggerProvider(provider);
    const logger = logs.getLogger("cmf");

    let emitting = false;
    for (const method of Object.keys(LEVELS)) {
        const level = LEVELS[method];
        const original = (console as unknown as Record<string, (...args: unknown[]) => void>)[method];
        (console as unknown as Record<string, (...args: unknown[]) => void>)[method] = (...args: unknown[]) => {
            original.apply(console, args);
            if (emitting) {
                return;
            }
            emitting = true;
            try {
                logger.emit({
                    severityNumber: level.number,
                    severityText: level.text,
                    body: format(...args),
                });
            } catch {
                // Export must not take down the socket server.
            } finally {
                emitting = false;
            }
        };
    }
}

startOtelLogs();
