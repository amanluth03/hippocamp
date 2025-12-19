# Security TODO - Hippo Campus

This document tracks security improvements to implement before wider production use.

---

## 🔴 HIGH PRIORITY

### 1. RDS Database Publicly Accessible
**Current State:** RDS is set to `publicly_accessible = true` with security group allowing `0.0.0.0/0` on port 5432.

**Risk:** Anyone on the internet can attempt to connect to the database.

**Mitigation in place:** Strong password authentication required.

**Fix:**
- Set `publicly_accessible = false` in `infrastructure/terraform/rds.tf`
- Use AWS Secrets Manager + Lambda in VPC for database access
- Or set up a bastion host for admin access
- For migrations, use a VPN or run migrations from within AWS (CodeBuild)

**Files:** `infrastructure/terraform/rds.tf` (lines ~95-100)

---

### 2. Sensitive Credentials in terraform.tfvars
**Current State:** Database password, JWT secret, Google OAuth credentials stored in plaintext in `terraform.tfvars`.

**Risk:** If this file is accidentally committed or exposed, all credentials are compromised.

**Mitigation in place:** File is in `.gitignore`.

**Fix:**
- Use AWS Secrets Manager or Parameter Store for secrets
- Reference secrets in Terraform using `data.aws_secretsmanager_secret_version`
- Rotate credentials regularly

**Files:** `infrastructure/terraform/terraform.tfvars`, `infrastructure/terraform/.gitignore`

---

## 🟡 MEDIUM PRIORITY

### 3. Photo URLs Are Publicly Accessible (No Auth)
**Current State:** Anyone with a photo URL can view it without authentication.

**Risk:** Photo URLs could be shared or leaked, allowing unauthorized access.

**Mitigation in place:** 
- URLs contain UUIDs that are practically impossible to guess
- URLs are only displayed to authenticated, authorized users

**Fix (if needed):**
- Implement CloudFront Signed URLs with expiration
- Or use Lambda@Edge to validate JWT tokens on photo requests

**Files:** `backend/app/services/s3.py`, `infrastructure/terraform/cloudfront.tf`

---

### 4. Dev Login Endpoint Exists in Codebase
**Current State:** `/auth/dev/login` endpoint exists but is protected by `DEBUG` flag.

**Risk:** If DEBUG is accidentally set to true in production, anyone could impersonate any user.

**Mitigation in place:** `DEBUG=false` in Lambda environment, endpoint only included when DEBUG is true.

**Fix:**
- Consider removing dev login code entirely for production branch
- Or add additional safeguards (IP whitelist, separate deployment)

**Files:** `backend/app/api/auth.py`, `backend/app/main.py`

---

### 5. CORS Configuration
**Current State:** Production CORS only allows `FRONTEND_URL`, which is correct.

**Status:** ✅ Already secure in production.

**Verify:** Ensure `DEBUG=false` in production Lambda.

**Files:** `backend/app/main.py`

---

## 🟢 LOW PRIORITY / FUTURE IMPROVEMENTS

### 6. JWT Token Expiration
**Current State:** Tokens expire after 7 days.

**Consideration:** Implement refresh tokens for better security without impacting UX.

**Files:** `backend/app/core/security.py`

---

### 7. Rate Limiting
**Current State:** No rate limiting on API endpoints.

**Risk:** Vulnerable to brute force attacks or abuse.

**Fix:** 
- Add rate limiting middleware (e.g., `slowapi`)
- Or use AWS WAF with API Gateway

---

### 8. Input Validation & SQL Injection
**Current State:** Using SQLAlchemy ORM which provides parameterized queries.

**Status:** ✅ Protected by ORM.

**Verify:** Ensure no raw SQL queries are used.

---

### 9. File Upload Validation
**Current State:** Only checking `content_type` header for image validation.

**Risk:** Content-type can be spoofed.

**Fix:** 
- Validate actual file contents (magic bytes)
- Scan uploads for malware
- Limit file sizes

**Files:** `backend/app/services/s3.py`

---

### 10. Logging & Monitoring
**Current State:** Basic CloudWatch logging enabled.

**Improvements:**
- Set up CloudWatch Alarms for errors
- Enable AWS CloudTrail for audit logging
- Consider centralized logging (DataDog, etc.)

---

### 11. HTTPS/TLS
**Status:** ✅ All traffic uses HTTPS via CloudFront.

---

### 12. Security Headers
**Current State:** Basic headers from CloudFront.

**Improvements:**
- Add Content-Security-Policy
- Add X-Frame-Options
- Add X-Content-Type-Options
- Consider CloudFront response headers policy

---

## Summary

| Priority | Issue | Status |
|----------|-------|--------|
| 🔴 High | RDS publicly accessible | TODO |
| 🔴 High | Secrets in terraform.tfvars | TODO |
| 🟡 Medium | Photo URLs public | Acceptable for MVP |
| 🟡 Medium | Dev login in codebase | Protected by flag |
| 🟢 Low | Rate limiting | TODO |
| 🟢 Low | File validation | TODO |
| ✅ Done | CORS | Secure |
| ✅ Done | HTTPS | Secure |
| ✅ Done | SQL Injection | Protected by ORM |

---

*Last updated: December 19, 2025*

