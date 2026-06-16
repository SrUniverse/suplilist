# SupliList - Security Incident Response Plan

**Version:** 1.0.0  
**Date:** 2026-06-16  
**Scope:** All security incidents affecting SupliList systems or user data  
**Effective:** Immediately upon approval

---

## Table of Contents

1. [Plan Overview](#plan-overview)
2. [Incident Response Team](#incident-response-team)
3. [Incident Classification](#incident-classification)
4. [Response Procedures](#response-procedures)
5. [Communication Protocol](#communication-protocol)
6. [Data Breach Notification](#data-breach-notification)
7. [Post-Incident Activities](#post-incident-activities)
8. [Recovery Procedures](#recovery-procedures)

---

## Plan Overview

### Purpose

To minimize the impact of security incidents through:
- Rapid detection and containment
- Clear chain of command
- Effective stakeholder communication
- Rapid recovery and remediation
- Regulatory compliance (GDPR, CCPA)

### Scope

This plan covers:
- Confirmed security incidents (intrusions, data breaches, unauthorized access)
- Suspected incidents (unusual activity, potential compromises)
- Near-miss events (blocked attacks)
- Third-party security events (partner breaches affecting our users)

---

## Incident Response Team

### Organizational Structure

```
                    Chief Security Officer
                            |
        ____________________________________________
        |               |               |            |
    Lead Responder  Technical Lead   Communications  Legal
    (On-Call 24/7)  (Database/Infra) (PR Manager)   (General Counsel)
        |               |               |            |
    Security Team   Dev Team         Marketing      Compliance
```

### Roles & Responsibilities

#### Chief Security Officer (Incident Commander)

**Responsibilities:**
- Declare incident severity level
- Activate response team
- Make executive decisions (shutdown, notify users)
- Interface with executive leadership
- Approve public communications

**On-Call Schedule:** 24/7 rotation  
**Contact:** security@suplilist.app (escalates to on-call)

#### Lead Responder (First Responder)

**Responsibilities:**
- First to acknowledge incident
- Initial triage and severity assessment
- Assemble response team
- Document timeline
- Coordinate containment

**On-Call Schedule:** 24/7 rotation (24 hours per week)

#### Technical Lead (Infrastructure/Database)

**Responsibilities:**
- Access control and log analysis
- Containment measures (disable accounts, revoke tokens)
- Evidence preservation
- System recovery
- Post-incident hardening

**On-Call Schedule:** Business hours + weekly rotation for after-hours

#### Communications Lead

**Responsibilities:**
- Draft user notifications
- Coordinate media responses
- Update status page
- Manage social media
- Prepare press releases

**On-Call Schedule:** Business hours + on-call for Critical/High incidents

#### Legal/Compliance Lead

**Responsibilities:**
- GDPR breach notification compliance
- Legal counsel coordination
- Regulatory reporting requirements
- Insurance claims
- Privacy policy updates

**On-Call Schedule:** Business hours, available for escalation

---

## Incident Classification

### Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|----------------|-----------
| **Critical** | Confirmed data breach or RCE | 15 minutes | Attacker in production, user data exposed |
| **High** | Confirmed security incident with user impact | 1 hour | Account takeover, unauthorized access to PII |
| **Medium** | Potential security issue requiring investigation | 4 hours | Failed login attempts, suspicious activity |
| **Low** | Security event with minimal impact | 1 business day | Failed firewall rules, informational alerts |

### Severity Decision Matrix

Use to classify incident:

```
1. Is user data exposed or at risk?
   YES → High/Critical | NO → Medium/Low

2. Is authentication/authorization compromised?
   YES → High/Critical | NO → Medium/Low

3. Is source confirmed malicious or unknown?
   CONFIRMED EXTERNAL → Critical | UNKNOWN → High | INTERNAL → Medium

4. Are multiple users affected?
   ALL USERS → Critical | MANY (>100) → High | SOME → Medium | FEW → Low

5. Is attacker still active?
   YES → Critical | NO → High | UNKNOWN → High

→ RESULT: Assign to highest applicable level
```

---

## Response Procedures

### Phase 1: Detection & Analysis (First Hour)

#### 1.1 Incident Discovery

**Trigger Sources:**
- Automated alerts (Sentry, Cloudflare WAF, AWS CloudWatch)
- Manual report (employee, user, support ticket)
- Third-party notification (law enforcement, bug bounty)
- Security monitoring (unusual database activity)

**Upon Discovery:**

```bash
# 1. Log the incident
INCIDENT_ID="INC-$(date +%Y%m%d)-$(printf '%03d' $RANDOM)"
echo "$INCIDENT_ID: [Description]" >> INCIDENT_LOG.txt
```

#### 1.2 Initial Triage

**Immediate Actions (0-5 minutes):**

1. **Acknowledge receipt**
   - Response lead confirms receipt within 5 minutes
   - Assign INCIDENT_ID
   - Create Slack channel: #incident-{INCIDENT_ID}

2. **Initial assessment**
   ```
   Is this a real security incident? (Yes/No)
   
   If YES:
   - What is affected? (Frontend / Backend / Database / Third-party)
   - Is attacker still active? (Yes/No/Unknown)
   - User data exposed? (Yes/No/Unknown)
   - Services impacted? (List)
   ```

3. **Determine severity**
   - Use classification matrix above
   - Document reasoning
   - Assign incident lead

**Example Triage:**
```
Alert: "1000+ failed login attempts from 203.45.67.89 in last 5 minutes"

Analysis:
- Is this real? YES (confirmed in logs)
- What's affected? Authentication system
- Attacker still active? YES (recent attempts in last minute)
- User data exposed? NO (rate limiting preventing entry)
- Services impacted? Login endpoint degraded

Severity: MEDIUM
Rationale: Attack in progress but rate-limited; no successful breaches
```

#### 1.3 Preserve Evidence

**Critical:** Preserve all evidence before remediation.

```bash
# Immediately after severity classification:

# 1. Preserve logs
tar czf incident_logs_${INCIDENT_ID}.tar.gz /var/log/app/ /var/log/auth /var/log/syslog
aws s3 cp incident_logs_${INCIDENT_ID}.tar.gz s3://forensics-bucket/

# 2. Create database backup
mongodump --uri="$MONGO_URI" --out incident_backup_${INCIDENT_ID}/
aws s3 sync incident_backup_${INCIDENT_ID}/ s3://forensics-bucket/

# 3. Network packet capture (10 min window)
tcpdump -i eth0 -w incident_packets_${INCIDENT_ID}.pcap &
sleep 600
kill %1

# 4. Screenshot system state
ps aux > ps_${INCIDENT_ID}.txt
netstat -an > netstat_${INCIDENT_ID}.txt
df -h > disk_${INCIDENT_ID}.txt
docker logs > container_logs_${INCIDENT_ID}.txt
```

### Phase 2: Containment (1-2 Hours)

#### 2.1 Immediate Containment Actions

**By Severity:**

**CRITICAL:**
```
1. Kill any suspicious processes
   docker ps -a | grep <suspicious>
   docker kill <container_id>

2. Revoke all active sessions
   redis-cli FLUSHALL --async  # WARNING: Logs everyone out

3. Block attacker IP at firewall
   aws ec2 authorize-security-group-ingress \
     --group-id sg-xxx \
     --cidr 203.45.67.89/32 \
     --protocol tcp \
     --port 443 \
     --rule-action deny

4. Disable affected authentication mechanisms
   Stripe webhook disabled
   OAuth temporarily disabled
   
5. Scale down production
   docker-compose scale app=1  # Reduce exposure
```

**HIGH:**
```
1. Increase monitoring
   Lower alert thresholds temporarily

2. Block suspicious IPs
   Update Cloudflare firewall rules

3. Disable vulnerable endpoint (if possible)
   Return 503 Service Unavailable
   Redirect to announcement page

4. Reset potentially compromised credentials
   Force password reset for affected users
   Revoke API tokens
```

**MEDIUM/LOW:**
```
1. Enable additional logging
2. Restrict access to sensitive operations
3. Schedule investigation window
```

#### 2.2 Incident Response Team Activation

**Send notifications:**

```bash
# Email to response team
To: security@suplilist.app, cto@suplilist.app, legal@suplilist.app
Subject: INCIDENT INC-20240115-001 - Authentication Attack

Incident Level: MEDIUM
Assigned Lead: [Name]
Status Channel: Slack #incident-INC-20240115-001

Description: 1000+ failed logins from single IP indicating brute force attempt

Actions Taken:
- IP 203.45.67.89 blocked at Cloudflare
- Rate limiting engaged
- User accounts remain secure

Next Steps:
- Analysis meeting in 30 minutes
- All hands meeting in 60 minutes
```

### Phase 3: Investigation (1-24 Hours)

#### 3.1 Forensic Analysis

**Objectives:**
1. Confirm breach (or rule out false positive)
2. Identify attack vector
3. Determine scope (how many users affected)
4. Find evidence of attacker activity
5. Document timeline

**Investigation Checklist:**

```bash
# 1. Review authentication logs
grep "failed" /var/log/app/auth.log | sort | uniq -c | sort -rn

# 2. Check for unauthorized data access
grep "SELECT.*FROM users" /var/log/mongodb/audit.log
grep "GET /api/profile/" /var/log/app/access.log | grep "200" | wc -l

# 3. Review database modifications
mongodump --uri="$MONGO_URI" > incident_backup_${INCIDENT_ID}/
mongodiff incident_backup_baseline incident_backup_${INCIDENT_ID}

# 4. Check application logs for errors
grep -i "error\|exception" /var/log/app/app.log | head -50

# 5. Review web server logs for suspicious requests
grep "400\|403\|500" /var/log/nginx/access.log
grep -E "(union|select|drop|exec|system)" /var/log/nginx/access.log

# 6. Analyze network traffic
wireshark incident_packets_${INCIDENT_ID}.pcap
# Look for: Exfiltration, Command & Control, Lateral movement

# 7. Check container/system changes
docker diff <container_id>
auditctl -l  # Check audit log for unauthorized changes

# 8. Timeline reconstruction
grep -h "timestamp" forensics/*.log | sort | tail -100
```

**Document Findings:**

```markdown
## Forensic Analysis Report - INC-20240115-001

### Timeline
- 14:30 UTC: First failed login attempt detected
- 14:32 UTC: Brute force pattern detected (>100/min)
- 14:35 UTC: Attackers IP blocked
- 14:40 UTC: Incident declared
- 14:45 UTC: No successful authentications found

### Attack Vector
- Brute force attack on /api/auth/login endpoint
- Source: 203.45.67.89 (Amsterdam)
- Duration: 10 minutes
- Attempts: 1,247 requests
- Success rate: 0%

### Scope
- Users affected: 0 (rate limiting prevented entry)
- Data exposed: None
- Systems compromised: None
- Attacker access: Denied

### Root Cause
- Rate limiting was working as designed
- WAF blocked majority of requests
- No security control bypass found

### Recommendations
1. Lower rate limit threshold further
2. Implement geo-blocking for failed logins
3. Add CAPTCHA after 5 failed attempts
```

#### 3.2 User Impact Assessment

**Determine scope of data exposure:**

```typescript
// Run user impact query
db.collection('users').countDocuments({
  last_login: { $gte: new Date('2024-01-15T14:00:00Z') },
  account_status: { $ne: 'deleted' }
});

// If there WAS a breach:
// Find users whose data was accessed
db.collection('audit_logs').find({
  event_type: { $in: ['user.data_accessed', 'user.profile_viewed'] },
  accessed_by: 'attacker_uid',
  timestamp: { $gte: breachStartTime, $lte: breachEndTime }
}).distinct('target_user_id');

// Calculate PII exposed
const exposedUsers = [list of user IDs];
const piiExposed = {
  emails: exposedUsers.length,
  phone_numbers: exposedUsers.filter(u => u.phone).length,
  health_preferences: exposedUsers.filter(u => u.supplements).length,
  payment_info: exposedUsers.filter(u => u.subscriptions).length
};
```

### Phase 4: Eradication (1-7 Days)

#### 4.1 Vulnerability Remediation

**For each identified vulnerability:**

1. **Patch application code**
   ```bash
   git checkout -b fix/incident-INC-20240115-001
   # Apply security patch
   git commit -m "Security fix: Prevent brute force attack"
   ```

2. **Deploy fix**
   ```bash
   # Use blue-green deployment for zero downtime
   docker build -t suplilist:patched .
   docker push suplilist:patched
   
   # Deploy to staging first
   docker-compose -f docker-compose.staging.yml up -d
   
   # Run smoke tests
   npm run test:smoke
   
   # If all tests pass, deploy to production
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify fix**
   ```bash
   # Re-run original attack test
   # Ensure attack no longer succeeds
   ```

#### 4.2 Security Hardening

**Implement additional controls:**

```bash
# Update Cloudflare WAF rules
cloudflare-cli --action add-rule \
  --expression "(http.method == \"POST\" and cf.threat_score > 50)" \
  --action "challenge"

# Increase rate limiting
redis-cli CONFIG SET maxmemory-policy allkeys-lru
# Reduce rate limit window: 5 attempts per 1 minute

# Add CAPTCHA after failed attempts
# Implement device fingerprinting
# Enable 2FA enrollment campaign
```

#### 4.3 Evidence Preservation & Containment

```bash
# Preserve all forensic evidence
tar czf forensics_${INCIDENT_ID}_final.tar.gz \
  incident_logs_${INCIDENT_ID}.tar.gz \
  incident_backup_${INCIDENT_ID}/ \
  incident_packets_${INCIDENT_ID}.pcap

# Lock down forensics storage (immutable)
aws s3api put-object-legal-hold \
  --bucket forensics-bucket \
  --key forensics_${INCIDENT_ID}_final.tar.gz \
  --legal-hold Status=ON

# Remove any temporary access granted during response
revoke_emergency_access_tokens()
docker restart nginx  # Clear any temporary bypasses
```

### Phase 5: Recovery (1-24 Hours)

#### 5.1 Restoration from Backup

**If data was corrupted:**

```bash
# 1. Create clean backup for rollback
tar czf recovery_backup_pre_restore.tar.gz /data/

# 2. Restore from last known good backup
# (Verified before breach occurred)
mongorestore --uri="$MONGO_URI" incident_backup_baseline/

# 3. Replay clean transactions after restore point
# (If available from transaction logs)

# 4. Verify data integrity
db.collection('users').find().limit(10).pretty()
# Spot-check: 5 random users, verify data looks correct

# 5. Monitor application metrics
# Watch for any anomalies indicating incomplete recovery
```

#### 5.2 Service Restoration

**Steps to restore full service:**

```bash
# 1. Health checks
GET /health/live     # Should return 200
GET /health/ready    # Should check all dependencies

# 2. Restore full capacity
docker-compose scale app=5  # Scale back up

# 3. Verify all endpoints
for endpoint in /api/auth /api/profile /api/supplements /api/payments; do
  curl -s -o /dev/null -w "%{http_code}" https://suplilist.app${endpoint}
  echo " - ${endpoint}"
done

# 4. Run smoke tests
npm run test:smoke

# 5. Announce recovery
POST to #status-page "All systems operational"
```

### Phase 6: Post-Incident (1 Week)

#### 6.1 Postmortem Meeting

**Within 3-5 days of incident resolution:**

```markdown
## Postmortem: INC-20240115-001

**Date:** 2024-01-16  
**Attendees:** Security, Dev, Ops, Product, CEO  
**Duration:** 90 minutes

### Timeline
- 14:30: Attack detected
- 14:35: Rate limiting engaged
- 14:40: Incident declared
- 14:45: All-hands meeting
- 17:00: Full recovery confirmed

### Root Cause Analysis (RCA)
1. Primary: Attacker used password spray technique
2. Contributing: Low rate limit threshold allowed 1000+ attempts
3. Contributing: No CAPTCHA after failed attempts

### What Went Well
- Detection took <5 minutes
- Team assembled quickly
- Rate limiting worked as designed
- No data breach occurred

### What Could Be Improved
- Incident notification could be faster
- Status page update was delayed
- User communication lacked details

### Action Items
1. Reduce rate limit to 5 attempts/minute (from 10)
2. Add CAPTCHA after 3 failed attempts
3. Implement automatic notification to users
4. Update incident response runbook
5. Schedule quarterly incident response drills

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Rate limit reduction | [Dev] | 2024-01-22 | In Progress |
| CAPTCHA implementation | [Dev] | 2024-01-29 | Not Started |
| Auto-notification | [Dev] | 2024-02-05 | Not Started |
| Runbook update | [Security] | 2024-01-20 | Not Started |
| Drill scheduling | [Security] | 2024-01-18 | In Progress |
```

---

## Communication Protocol

### Initial Notification (0-30 Minutes)

**Step 1: Internal Notification**

```
Slack #incident-INC-20240115-001:
@here Critical incident declared
Severity: MEDIUM
Incident ID: INC-20240115-001
Incident Lead: [Name]
Status: Investigating

Details will be shared in 15 minutes
```

**Step 2: Leadership Notification**

```
Email to: CEO, CTO, CFO, Head of Legal

Subject: SECURITY INCIDENT - INC-20240115-001

Incident Severity: MEDIUM
Detected: [time]
Status: Ongoing investigation

Summary: [1 paragraph non-technical]

Actions Taken: [Bullet points]

Expected Impact: [Users / Services / Data]

Next Update: [Time]
```

### Ongoing Updates (Every 1-2 Hours During Incident)

```
Slack #incident-INC-20240115-001:

[14:45] STATUS UPDATE

Current Situation:
- Brute force attack in progress (1000+ attempts)
- Rate limiting preventing unauthorized access
- No data breach at this time

Actions Completed:
✓ IP blocked at Cloudflare
✓ Monitoring escalated
✓ Backup created

In Progress:
⏳ Forensic analysis
⏳ Notification drafting

Next Steps:
□ Complete analysis (30 min)
□ Prepare user notification
□ Deploy hardening measures

Next Update: 16:00 UTC
```

### Public Communication

**Timing:** For High/Critical incidents, communicate within 24 hours

**Template:**

```markdown
# Security Incident Statement

We take the security of your data seriously. We're writing to inform you of a security incident that occurred on [date].

## What Happened
On [date and time], we detected and quickly responded to [brief description of incident].

## What We Know
- When it started: [timestamp]
- When it ended: [timestamp]
- What was affected: [systems/features]
- Scope of impact: [number of users, data types]

## What We Did
- Immediately contained the incident
- Prevented unauthorized access to user data
- Preserved evidence for investigation
- Implemented additional security measures

## What We're Doing
- Full forensic investigation underway
- [Specific security improvements]
- Increased monitoring
- Third-party security firm engaged (if applicable)

## What You Should Do
- Change your password
- Enable 2FA if you haven't already
- Monitor your account for unusual activity
- Contact us if you notice anything suspicious

## Questions?
Contact us at security@suplilist.app

We appreciate your patience and continued trust.
```

---

## Data Breach Notification

### GDPR Breach Notification Requirements

**Condition:** "A breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to personal data"

**Notification Timeline:**

```
1. Authority notification: Within 72 hours of discovery
2. Individual notification: Without undue delay (GDPR Article 34)
3. If high risk: Consider notification even before investigation complete
```

**Content Required (GDPR Article 34):**

```markdown
## Mandatory Information

1. **Nature of breach**
   - What personal data (names, emails, payment info)
   - How was it breached (unauthorized access, system compromise)
   - Approximate number affected

2. **Likely consequences**
   - Risk of discrimination
   - Risk of identity theft
   - Risk of financial loss
   - Risk of loss of confidentiality

3. **Measures taken or proposed**
   - Immediate containment
   - Investigation steps
   - Security improvements
   - Monitoring for further incidents

4. **Contact point**
   - Name: Data Protection Officer
   - Email: dpo@suplilist.app
   - Phone: [number]
```

**Notification Template:**

```
Subject: Important Security Notification - Data Breach

Dear [Name],

We are writing to inform you of a data breach affecting your account on SupliList.

INCIDENT DETAILS:
Date Discovered: [date]
Date of Breach: [date range]
Affected Data: [specific fields - email, profile info, etc.]

WHAT HAPPENED:
[Clear, non-technical explanation]

IMPACT TO YOU:
[Specific risks to individual]

OUR RESPONSE:
[Immediate actions taken]

YOUR NEXT STEPS:
1. Change your password immediately
2. Enable two-factor authentication
3. Monitor your account for suspicious activity
4. [Specific additional steps if applicable]

SUPPORT:
If you have questions or concerns:
Email: dpo@suplilist.app
Phone: [24/7 hotline]
Website: https://security.suplilist.app/breach-information

We sincerely apologize for this incident and appreciate your patience.

Best regards,
SupliList Security Team
```

### Regulatory Authority Notification

**For EU data subjects (GDPR):**

```
Contact: Relevant Data Protection Authority (DPA)
Timing: Within 72 hours of discovery
Channel: Online portal or email (varies by country)

Content:
1. Description of breach
2. Data categories and approximate numbers of affected individuals
3. Likely consequences
4. Measures taken or proposed
5. DPO or contact point
6. Documentation of delay (if notification delayed)
```

---

## Post-Incident Activities

### 6.2 User Communication

**Email Campaign:**

```
Subject: We've Improved Security Based on Recent Incident

Dear [Name],

Following the security incident we reported to you on [date], we've 
implemented significant security improvements to prevent similar incidents.

New Security Features:
✓ Mandatory two-factor authentication for sensitive operations
✓ Enhanced rate limiting to prevent brute force attacks
✓ CAPTCHA challenges after repeated failed logins
✓ Real-time anomaly detection
✓ Increased encryption for stored data

Additional Resources:
- Security best practices: https://suplilist.app/security-tips
- FAQs about the incident: https://suplilist.app/faq/incident-2024
- Contact security team: security@suplilist.app

We appreciate your continued trust in SupliList.
```

### 6.3 Lessons Learned Report

**Complete within 2 weeks:**

```markdown
## Lessons Learned Report - INC-20240115-001

### Executive Summary
- Incident: Brute force attack
- Detection time: 5 minutes (excellent)
- Response time: 15 minutes (good)
- Resolution time: 3 hours (acceptable)
- Data lost: None (critical success)

### What Went Well
1. **Rapid detection** - Alert triggered immediately
2. **Clear communication** - Team assembled quickly
3. **Effective containment** - No data breach
4. **Thorough investigation** - Root cause identified

### Areas for Improvement
1. **Status page updates** - 2 hour delay in public communication
2. **Incident runbook** - Several steps were unclear
3. **User notification** - Template didn't match brand voice
4. **Team coordination** - Some duplicate efforts in investigation

### Action Items

| Item | Owner | Priority | Due Date | Status |
|------|-------|----------|----------|--------|
| Update incident runbook | [Lead] | High | 2024-01-22 | Open |
| Implement auto-status page | [Dev] | High | 2024-01-29 | Open |
| Create notification templates | [Comms] | High | 2024-01-20 | In Progress |
| Schedule monthly drills | [Security] | Medium | 2024-02-15 | Open |
| Upgrade monitoring dashboard | [Ops] | Medium | 2024-03-01 | Open |

### Metrics & Trending
- Similar attacks this quarter: 3
- Average detection time: 8 minutes (improved to 5)
- Response team assembly: 12 minutes (improved to 15)
- Customer satisfaction: 92% (unchanged)

### Recommendations
1. Increase training for on-call team
2. Quarterly incident response drills
3. Upgrade SIEM for better detection
4. Implement automated response for common attacks
```

---

## Recovery Procedures

### Service Recovery Time Objectives (RTO)

```
Service                 Target RTO
─────────────────────────────────────
Frontend (UI)           15 minutes
Authentication API      5 minutes
User data endpoints     15 minutes
Payment processing      30 minutes (Stripe - their responsibility)
Email notifications     30 minutes
Admin dashboard         1 hour
```

### Recovery Point Objective (RPO)

```
Data Type               Target RPO
─────────────────────────────────────
User profiles           5 minutes
Transactions            1 minute
Analytics               1 hour
Backups                 1 day
```

### Disaster Recovery Plan Summary

**For major incidents (data center loss, ransomware, etc.):**

```bash
# 1. Activate DR site (AWS alternate region)
aws cloudformation create-stack \
  --stack-name suplilist-dr \
  --template-body file://dr-template.yaml

# 2. Restore database from backup
mongorestore --uri="mongodb+srv://dr-cluster" backup/

# 3. Update DNS to point to DR
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123 \
  --change-batch file://dns-failover.json

# 4. Verify service health
curl https://suplilist.app/health/ready

# 5. Notify customers
POST https://status.suplilist.app/api/incidents
{
  "status": "degraded",
  "message": "Operating from backup facility with full service"
}

# 6. Detailed communication
Email to all users with recovery status
```

---

## Appendices

### A. Incident Response Runbook

**Quick Reference for Common Incidents:**

#### Brute Force Attack

```
DETECTION: >100 failed logins from single IP in 5 minutes

IMMEDIATE (0-5 min):
1. Declare incident severity: MEDIUM
2. Block attacker IP at Cloudflare: IP Rules → Block
3. Reduce rate limit threshold: 5 attempts/min
4. Increase authentication logging

INVESTIGATION (5-30 min):
1. Query login attempt logs
2. Identify scope (users affected)
3. Check for successful breaches
4. Review attacker IP geolocation

RESOLUTION:
1. Deploy CAPTCHA after 3 failed attempts
2. Implement geo-blocking for unusual IPs
3. Alert users if their accounts affected
4. Update WAF rules
```

#### SQL/NoSQL Injection Attempt

```
DETECTION: WAF blocks >10 injection payloads in 5 minutes

IMMEDIATE (0-5 min):
1. Declare incident severity: HIGH (potential RCE)
2. Block attacker IP
3. Take screenshots of payload attempts
4. Preserve logs

INVESTIGATION (5-60 min):
1. Analyze payloads to understand target
2. Check for any successful injections
3. Review database logs for unauthorized queries
4. Scan code for vulnerable endpoints

RESOLUTION:
1. Update input validation rules
2. Patch vulnerable endpoint
3. Add parameterized query verification
4. Implement automated code scanning
```

#### Account Takeover

```
DETECTION: User reports unauthorized access

IMMEDIATE (0-5 min):
1. Declare incident severity: HIGH
2. Reset user's password
3. Revoke all active sessions
4. Disable any API tokens
5. Contact affected user

INVESTIGATION (5-60 min):
1. Review user's login history
2. Check for data accessed by attacker
3. Verify MFA was bypassed or disabled
4. Check if credentials leaked elsewhere

RESOLUTION:
1. Restore user data from backup
2. Require password change + MFA setup
3. Check for any compromised data (credit cards, etc)
4. Implement mandatory MFA for high-risk actions
```

### B. Contact Information Template

```
INCIDENT RESPONSE TEAM CONTACTS

Security Lead (24/7):
  Name: [Name]
  Personal Mobile: [Number]
  Email: [Email]
  Slack: @[Handle]
  Response Target: 15 minutes

On-Call Rotation:
  Week 1: [Name] - [Contact]
  Week 2: [Name] - [Contact]
  Week 3: [Name] - [Contact]

Infrastructure Team:
  Lead: [Name] - [Phone]
  Backup: [Name] - [Phone]

Communications/PR:
  Lead: [Name] - [Phone]

Legal/Compliance:
  DPO: [Name] - [Email]
  General Counsel: [Name] - [Phone]

External Contacts:
  Cybersecurity Firm: [Name] - [Phone]
  Law Enforcement: FBI Cyber Division
  Regulatory Body: [DPA] - [Email]
```

### C. Incident Response Checklist

Use this checklist during actual incident:

```
□ Incident declared (severity: ___)
□ Incident ID assigned (INC-_______)
□ Slack channel created (#incident-INC-____)
□ Response team assembled
□ Initial notification sent
□ Leadership notified
□ Evidence preserved
□ Attackers blocked
□ Forensic analysis started
□ Root cause identified
□ Patches deployed
□ Service restored
□ Users notified
□ Regulatory reporting (if needed)
□ Postmortem scheduled
□ Action items tracked
```

---

## Training & Drills

### Quarterly Incident Response Drills

**Objective:** Test response procedures and team readiness

**Drill Types:**

1. **Tabletop Exercise** (1 hour)
   - Presenter walks through hypothetical incident
   - Team discusses response procedures
   - No actual systems affected

2. **Simulated Breach** (2 hours)
   - Inject fake security alerts
   - Team must respond as if real
   - Systems remain operational
   - Measure response time metrics

3. **Recovery Drill** (4 hours)
   - Test disaster recovery procedures
   - Failover to backup systems
   - Verify data restoration
   - Restore to primary

**Schedule:**

```
Q1 2024: Tabletop - Social Engineering
Q2 2024: Simulated Breach - Data Exfiltration
Q3 2024: Recovery Drill - Full Data Center Loss
Q4 2024: Full Incident Response Simulation
```

---

## Approval & Distribution

**Approvals:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CEO | | | |
| CTO | | | |
| Chief Security Officer | | | |
| General Counsel | | | |

**Distribution:**

- [ ] All incident response team members
- [ ] Executive leadership
- [ ] Customer support team
- [ ] Board of directors
- [ ] Insurance provider
- [ ] Legal counsel

**Version Control:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-06-16 | Initial document | Security Team |

---

**Document Status:** APPROVED  
**Effective Date:** 2026-06-16  
**Last Updated:** 2026-06-16  
**Next Review:** 2026-12-16 (6 months)
