# Monitoring & Alerting Documentation

## Overview

The Consent Manager backend includes comprehensive monitoring using Prometheus metrics and structured logging with Winston.

## Prometheus Metrics

### Endpoint

```
GET /metrics
```

Returns metrics in Prometheus format for scraping.

### Available Metrics

#### 1. HTTP Request Metrics

**http_request_duration_seconds** (Histogram)
- Description: Duration of HTTP requests in seconds
- Labels: `method`, `route`, `status_code`
- Buckets: 0.01, 0.05, 0.1, 0.5, 1, 2, 5 seconds

**http_requests_total** (Counter)
- Description: Total number of HTTP requests
- Labels: `method`, `route`, `status_code`

#### 2. Consent Operations

**consent_operations_total** (Counter)
- Description: Total number of consent operations
- Labels: `operation`, `status`
- Operations: CREATE, APPROVE, REJECT, REVOKE, EXPIRE

**active_consents_total** (Gauge)
- Description: Current number of active consents
- Updated every 5 minutes by cron job

#### 3. Audit Logging

**audit_log_events_total** (Counter)
- Description: Total number of audit log events
- Labels: `event_type`
- Event Types: CONSENT_REQUESTED, CONSENT_ACTIVE, CONSENT_REVOKED, CONSENT_EXPIRED, PROCESSING_ALLOWED, PROCESSING_DENIED, NOTICE_SHOWN, RECEIPT_GENERATED

#### 4. Webhook Delivery

**webhook_deliveries_total** (Counter)
- Description: Total number of webhook delivery attempts
- Labels: `webhook_id`, `event_type`, `status`
- Statuses: DELIVERED, FAILED, PENDING

#### 5. Rate Limiting

**rate_limit_hits_total** (Counter)
- Description: Total number of rate limit violations
- Labels: `endpoint`, `ip`
- Endpoints: general, consent_creation, token_endpoint, admin, process

#### 6. System Metrics (Default)

- `nodejs_heap_size_total_bytes` - Total heap size
- `nodejs_heap_size_used_bytes` - Used heap size
- `nodejs_external_memory_bytes` - External memory
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `process_cpu_user_seconds_total` - CPU user time
- `process_resident_memory_bytes` - Resident memory size

## Structured Logging

### Winston Logger Configuration

- **Development**: Colorized console output with timestamps
- **Production**: JSON format for log aggregation
- **Log Levels**: error, warn, info, debug
- **Log Files**:
  - `logs/error.log` - Errors only (max 10MB, 5 files)
  - `logs/combined.log` - All logs (max 10MB, 10 files)

### Log Format

```json
{
  "timestamp": "2026-02-11 10:30:00",
  "level": "info",
  "message": "HTTP Request",
  "service": "consent-manager",
  "environment": "production",
  "method": "POST",
  "url": "/consents",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Key Log Events

- **HTTP Requests/Responses**: All API calls with duration and status
- **Audit Events**: All consent lifecycle changes
- **Security Events**: Rate limit hits, authentication failures
- **Webhook Deliveries**: Delivery attempts, retries, failures
- **Errors**: Application errors with stack traces

## Grafana Dashboard Setup

### 1. Add Prometheus Data Source

```yaml
apiVersion: v1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
```

### 2. Prometheus Configuration

Add scrape config to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'consent-manager'
    scrape_interval: 15s
    static_configs:
      - targets: ['consent-manager-backend:3000']
```

### 3. Key Dashboard Panels

#### Request Rate & Latency
```promql
# Request rate (requests/sec)
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

#### Consent Operations
```promql
# Consent creation rate
rate(consent_operations_total{operation="CREATE"}[5m])

# Active consents
active_consents_total

# Revocation rate
rate(audit_log_events_total{event_type="CONSENT_REVOKED"}[5m])
```

#### Webhook Health
```promql
# Webhook delivery success rate
sum(rate(webhook_deliveries_total{status="DELIVERED"}[5m])) / sum(rate(webhook_deliveries_total[5m]))

# Failed deliveries
sum(rate(webhook_deliveries_total{status="FAILED"}[5m]))
```

#### System Health
```promql
# Memory usage
process_resident_memory_bytes / 1024 / 1024

# Event loop lag
nodejs_eventloop_lag_seconds

# Heap usage percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
```

## Alerting Rules

### Critical Alerts

#### High Error Rate
```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected (>5%)"
    description: "Error rate is {{ $value | humanizePercentage }}"
```

#### High Latency
```yaml
- alert: HighLatency
  expr: |
    histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High latency detected (P95 > 2s)"
    description: "P95 latency is {{ $value }}s"
```

#### Webhook Delivery Failures
```yaml
- alert: WebhookDeliveryFailures
  expr: |
    sum(rate(webhook_deliveries_total{status="FAILED"}[10m])) > 5
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High webhook failure rate"
    description: "{{ $value }} webhook deliveries failing per second"
```

#### Rate Limit Abuse
```yaml
- alert: RateLimitAbuse
  expr: |
    sum(rate(rate_limit_hits_total[5m])) by (ip) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Rate limit abuse detected"
    description: "IP {{ $labels.ip }} hitting rate limits frequently"
```

### Warning Alerts

#### Memory Usage
```yaml
- alert: HighMemoryUsage
  expr: |
    (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.85
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage (>85%)"
```

#### Event Loop Lag
```yaml
- alert: EventLoopLag
  expr: |
    nodejs_eventloop_lag_seconds > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Event loop lag detected"
```

## Log Aggregation Integration

### Loki Configuration

```yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
    tenant_id: consent-manager

scrape_configs:
  - job_name: consent-manager
    static_configs:
      - targets:
          - localhost
        labels:
          job: consent-manager
          __path__: /app/logs/*.log
```

### Key LogQL Queries

```logql
# Error logs
{job="consent-manager"} |= "level=error"

# Audit events
{job="consent-manager"} |= "Audit Event"

# Security events
{job="consent-manager"} |= "Security Event"

# Webhook failures
{job="consent-manager"} |= "Webhook delivery error"

# Rate limit hits
{job="consent-manager"} |= "Rate limit exceeded"
```

## Health Check

### Endpoint

```
GET /health
```

Returns:
```json
{
  "status": "UP"
}
```

Use for liveness/readiness probes in Kubernetes/Docker.

## Testing Metrics

```bash
# Query metrics endpoint
curl http://localhost:3000/metrics

# Generate load for metrics
for i in {1..100}; do
  curl -X POST http://localhost:3000/consents -H "Content-Type: application/json" -d '{"userId":"test","purpose":"test"}' &
done

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets
```

## Production Recommendations

1. **Retention**: Keep metrics for 15+ days
2. **Scrape Interval**: 15-30 seconds
3. **Alert Routing**: Send critical alerts to PagerDuty/Slack
4. **Log Rotation**: Automatic via Winston (10MB files)
5. **Backup**: Export Prometheus data to long-term storage
6. **Access Control**: Secure /metrics endpoint (whitelist Prometheus IP)
