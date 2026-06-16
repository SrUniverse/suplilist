# Error Handling & Monitoring Implementation Checklist

## Files Created

### Core Error System
- [x] `src/shared/errors/app-error.ts` - Standardized error classes
- [x] `src/middleware/error-handler.middleware.ts` - Global error handler
- [x] `src/shared/services/error-metrics.service.ts` - Error metrics collection
- [x] `src/shared/services/alerting.service.ts` - Alert management
- [x] `src/shared/config/alert-rules.config.ts` - Alert rule definitions
- [x] `src/shared/services/monitoring.service.ts` - Rule evaluation & monitoring

### Documentation
- [x] `src/shared/errors/ERROR_HANDLING.md` - Complete error handling guide
- [x] `server/MIGRATION_GUIDE.md` - Migration from old to new system
- [x] `server/src/shared/examples/error-handling.example.ts` - Usage examples
- [x] `server/IMPLEMENTATION_CHECKLIST.md` - This file

## Setup Steps

### 1. Verify Installation
- [ ] All files are in correct locations
- [ ] Run `npm install` to ensure dependencies are available
- [ ] Verify `prom-client` is in package.json (for metrics)

### 2. Update Main Application File
- [ ] Import error handler middleware in `src/app.ts`
- [ ] Import monitoring service in `src/app.ts`
- [ ] Add error handler as LAST middleware
- [ ] Initialize monitoring service
- [ ] Verify imports work without errors

### 3. Configure Environment Variables
Create or update `.env.local`:

```bash
# Alerting configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_INTEGRATION_KEY=your-integration-key
ALERT_WEBHOOK_URL=https://your-api.com/alerts
ALERT_MIN_LEVEL=medium

# Monitoring configuration
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000

# Optional: Custom alert rules
# (Edit alert-rules.config.ts for complex rules)
```

### 4. Test Error Handler
- [ ] Start the server in development mode
- [ ] Make a request to trigger a validation error (e.g., missing required field)
- [ ] Verify error response includes:
  - `success: false`
  - `error: "error_code"`
  - `message: "..."`
  - `requestId: "..."`
  - In development: `metadata` and `stack`
- [ ] Check server logs include structured error entry

### 5. Test Metrics Collection
- [ ] Make several API requests
- [ ] Visit `/metrics` endpoint
- [ ] Verify Prometheus metrics are present:
  - `errors_total`
  - `errors_by_endpoint_total`
  - `error_rate_by_endpoint`
  - Other HTTP metrics

### 6. Test Alerting (if configured)
- [ ] Set up Slack webhook URL
- [ ] Trigger a critical error (e.g., call unimplemented endpoint)
- [ ] Verify alert appears in Slack
- [ ] Test deduplication by triggering same error twice
- [ ] Verify second alert is not sent (5-minute window)

### 7. Test Monitoring Service
- [ ] Access monitoring status via code:
  ```typescript
  const status = monitoringService.getMonitoringStatus();
  console.log(status);
  ```
- [ ] Verify alert rules are being evaluated
- [ ] Check SLO status is calculated correctly

## Migration Tasks (per module)

For each module that needs migration:

### Module: `[Name]`
- [ ] List all route files in module
- [ ] Identify all error responses (manual res.status().json())
- [ ] Replace with appropriate error class throws
- [ ] Update service files to use error classes
- [ ] Wrap async handlers with `asyncHandler`
- [ ] Add metadata to error context (field names, IDs, etc.)
- [ ] Test all error paths
- [ ] Update API documentation

## Code Changes by Module

### Template for Each Module

```markdown
## [Module Name] Module

### Files to Update
- `src/modules/[name]/presentation/express/[name].controller.ts`
- `src/modules/[name]/application/use-cases/*.ts`
- `src/modules/[name]/infrastructure/mongoose/*.ts`

### Error Types Used
- ValidationError - for field validation
- NotFoundError - when resource not found
- ConflictError - when duplicate resource
- ForbiddenError - for permission checks
- ExternalServiceError - for external API calls

### Example Changes
[Show before/after code snippets]

### Testing
- [ ] All existing tests pass
- [ ] Error responses match new format
- [ ] Metadata included in errors
```

## Performance & Operations

### Baseline Metrics (to establish before alerts)
- [ ] Record baseline error rate
- [ ] Record baseline response times (p50, p95, p99)
- [ ] Record baseline memory usage
- [ ] Record baseline database query times

### Alert Tuning
- [ ] Review alert rule thresholds
- [ ] Adjust based on baseline metrics
- [ ] Test alert severity levels
- [ ] Verify appropriate channels configured

### Monitoring Dashboard
- [ ] Set up Prometheus scrape for `/metrics`
- [ ] Create Grafana dashboard with:
  - Error rate by endpoint
  - Error distribution (pie chart)
  - Critical errors over time
  - Alert frequency
  - SLO status
- [ ] Set up alert notifications in Grafana

## Testing Checklist

### Unit Tests
- [ ] Error classes instantiate correctly
- [ ] Error.toJSON() produces correct format
- [ ] Error.toLogEntry() includes all fields
- [ ] Helpers (isAppError, getErrorStatus) work

### Integration Tests
- [ ] Error handler catches errors from all layers
- [ ] Error responses have correct HTTP status
- [ ] Request IDs included in responses
- [ ] Metrics recorded for each error
- [ ] Alerts triggered for critical errors

### End-to-End Tests
- [ ] Validation errors return 400
- [ ] Not found errors return 404
- [ ] Unauthorized errors return 401
- [ ] Server errors return 500
- [ ] Error messages are user-friendly
- [ ] Stack traces hidden in production

### Manual Testing
- [ ] Invalid request body → 400 validation_error
- [ ] Missing required field → 400 validation_error
- [ ] Invalid ID format → 400 bad_request
- [ ] Non-existent resource → 404 not_found
- [ ] Duplicate email → 409 conflict
- [ ] Invalid token → 401 authentication_failed
- [ ] Insufficient permissions → 403 forbidden
- [ ] Rate limit exceeded → 429 rate_limit_exceeded
- [ ] External service down → 502 external_service_error
- [ ] Service down → 503 service_unavailable
- [ ] Timeout → 504 gateway_timeout
- [ ] Unexpected error → 500 internal_server_error

## Deployment Steps

### Pre-Deployment
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Error handling documentation updated
- [ ] Team trained on new error system
- [ ] Alert channels configured
- [ ] Baseline metrics recorded

### Staging Deployment
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Verify all error types work
- [ ] Monitor error rates for 24 hours
- [ ] Tune alert thresholds if needed
- [ ] Verify alerts trigger correctly
- [ ] Review alert frequency (watch for noise)

### Production Deployment
- [ ] Schedule deployment for low-traffic window
- [ ] Have rollback plan ready
- [ ] Deploy to production
- [ ] Monitor error rates closely (first 1-2 hours)
- [ ] Watch alert frequency
- [ ] Verify metrics in dashboard
- [ ] Confirm SLO tracking works
- [ ] Document any issues encountered

### Post-Deployment
- [ ] Monitor for 7 days
- [ ] Adjust alert thresholds based on production data
- [ ] Review alert patterns
- [ ] Identify and fix any false positives
- [ ] Update documentation with production learnings
- [ ] Schedule retrospective with team

## Monitoring & Maintenance

### Daily Checks
- [ ] Review alert frequency (expect few per day)
- [ ] Check error rate trends
- [ ] Verify SLO status remains met
- [ ] Check for any new error patterns

### Weekly Reviews
- [ ] Review alert rule effectiveness
- [ ] Identify trends in errors
- [ ] Check for recurring issues
- [ ] Update alert thresholds if needed

### Monthly Reviews
- [ ] Analyze SLO compliance
- [ ] Review alert rule effectiveness
- [ ] Plan improvements based on data
- [ ] Update documentation
- [ ] Schedule team training if needed

## Support & Troubleshooting

### Common Issues

**Issue: Alerts not being sent**
- [ ] Verify webhook URLs are correct
- [ ] Check error severity is above minimum threshold
- [ ] Look for deduplication (5-minute window)
- [ ] Check logs for alert sending errors

**Issue: Too many alerts (alert fatigue)**
- [ ] Increase alert thresholds
- [ ] Increase evaluation duration
- [ ] Increase minimum severity level
- [ ] Review and remove false-positive rules

**Issue: Missing error context**
- [ ] Verify metadata passed to error constructor
- [ ] Check request ID is available
- [ ] Verify log masking isn't hiding important data

**Issue: Stack traces in production**
- [ ] Check NODE_ENV is set to 'production'
- [ ] Verify error handler middleware masks traces
- [ ] Review log output carefully

## Success Criteria

The implementation is successful when:

- [ ] All errors return standardized JSON response
- [ ] Request IDs included in all error responses
- [ ] Error metrics visible in `/metrics` endpoint
- [ ] Alert rules evaluating (checkable via monitoring service)
- [ ] Alerts triggering for critical errors
- [ ] No production incidents related to error handling
- [ ] Team comfortable using new error classes
- [ ] Documentation is clear and up-to-date

## Additional Resources

- **Error Types Guide**: `src/shared/errors/ERROR_HANDLING.md`
- **Migration Guide**: `MIGRATION_GUIDE.md`
- **Usage Examples**: `src/shared/examples/error-handling.example.ts`
- **Alert Rules**: `src/shared/config/alert-rules.config.ts`

## Contacts & Support

For questions about the error handling system:

1. Check ERROR_HANDLING.md in src/shared/errors/
2. Review migration guide and examples
3. Check alert rules configuration
4. Review monitoring service logs
5. Contact the team lead if issue persists

## Sign-Off

Once all items are complete, have the following people sign off:

- [ ] Team Lead
- [ ] DevOps/SRE
- [ ] QA Lead
- [ ] Product Owner
