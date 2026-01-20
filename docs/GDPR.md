# GDPR Compliance Guide

This document outlines how CFP Directory Self-Hosted handles personal data and how you as an operator can ensure GDPR compliance.

## Overview

As a self-hosted platform, **you** (the operator) are the Data Controller. This means you are responsible for:

- Ensuring lawful processing of personal data
- Responding to data subject requests
- Implementing appropriate security measures
- Maintaining records of processing activities

CFP Directory Self-Hosted is designed to help you meet these obligations.

---

## Personal Data Processed

### User Accounts

| Data Field | Purpose | Lawful Basis |
|------------|---------|--------------|
| Email address | Account identification, communication | Contract (necessary for service) |
| Name | Display name, communication | Legitimate interest |
| Password (hashed) | Authentication | Contract |
| Profile image | User identification | Consent |
| Role | Access control | Contract |

### Submissions

| Data Field | Purpose | Lawful Basis |
|------------|---------|--------------|
| Speaker name | Speaker identification | Contract |
| Speaker email | Communication | Contract |
| Talk title | Event content | Contract |
| Abstract | Event content | Contract |
| Bio | Speaker profile | Contract |
| Materials (files) | Event content | Contract |

### Messages

| Data Field | Purpose | Lawful Basis |
|------------|---------|--------------|
| Message content | Communication | Contract |
| Sender info | Attribution | Contract |
| Timestamps | Record keeping | Legitimate interest |

### Federation Data (if enabled)

| Data Field | Purpose | Lawful Basis |
|------------|---------|--------------|
| cfp.directory speaker ID | Profile linking | Consent |
| Consented scopes | Access control | Consent |
| Synced profile data | Pre-filling | Consent |

---

## Data Subject Rights

### Right of Access (Article 15)

Users can request a copy of their personal data.

**Implementation:**
```bash
# Export user data via database query
# This should be implemented as an admin feature
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM submissions WHERE speaker_id = 'user_id';
SELECT * FROM messages WHERE sender_id = 'user_id';
```

### Right to Rectification (Article 16)

Users can correct their personal data.

**Implementation:** Users can edit their profile and submissions through the UI.

### Right to Erasure (Article 17)

Users can request deletion of their data.

**Implementation:**
```sql
-- Delete user and related data
-- CASCADE deletes will remove related records

-- First, anonymize submissions if needed
UPDATE submissions 
SET speaker_id = 'anonymous_user_id' 
WHERE speaker_id = 'user_id_to_delete';

-- Then delete the user
DELETE FROM users WHERE id = 'user_id_to_delete';
```

### Right to Data Portability (Article 20)

Users can request their data in a machine-readable format.

**Implementation:** Export user data as JSON:
```json
{
  "user": {
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "submissions": [...],
  "messages": [...]
}
```

### Right to Object (Article 21)

Users can object to certain processing activities.

**Implementation:** Provide opt-out mechanisms for:
- Marketing communications (if any)
- Analytics tracking (if any)

---

## Data Retention

### Recommended Retention Periods

| Data Type | Retention Period | Justification |
|-----------|-----------------|---------------|
| User accounts | Until deletion requested | Service provision |
| Submissions | Event lifetime + 1 year | Historical record |
| Messages | 2 years | Communication record |
| Logs | 90 days | Security/debugging |
| Session data | 30 days | Authentication |

### Implementing Data Retention

Create a scheduled job to purge old data:

```typescript
// Example: Purge old messages
async function purgeOldMessages() {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  await prisma.message.deleteMany({
    where: {
      createdAt: { lt: twoYearsAgo },
    },
  });
}
```

---

## Security Measures

### Technical Measures

- **Encryption in transit:** HTTPS required (configure via reverse proxy)
- **Encryption at rest:** Configure database encryption
- **Password hashing:** bcrypt with strong salt rounds
- **Session security:** HttpOnly, Secure, SameSite cookies
- **Input validation:** Zod schemas for all inputs
- **Rate limiting:** Built-in API rate limiting

### Organizational Measures

As the operator, you should:

1. **Limit access** to production systems
2. **Train staff** on data protection
3. **Document processing activities**
4. **Establish incident response procedures**
5. **Conduct regular security audits**

---

## Data Processing Agreement (Federation)

When using federation with cfp.directory, a Data Processing Agreement (DPA) governs the transfer of personal data.

### Key DPA Terms

1. **cfp.directory as Processor:** When speakers consent to share data, cfp.directory processes data on their behalf.

2. **Your instance as Controller:** You determine the purposes and means of processing.

3. **Sub-processors:** cfp.directory may use sub-processors (e.g., cloud providers).

4. **Data location:** Check cfp.directory's privacy policy for data location.

### Consent for Federation

Speakers must explicitly consent before their data is shared:

- Consent is collected on cfp.directory
- Consent is scope-based (profile, email, materials, etc.)
- Consent can be revoked at any time
- Revocation triggers data deletion notification

---

## Privacy Policy Template

Include these sections in your privacy policy:

### 1. Data Controller
```
[Your Organization Name]
[Your Address]
[Contact Email]
```

### 2. Data Collected
- Account information (email, name, password)
- Submission content (talks, abstracts, materials)
- Communication data (messages)
- Technical data (IP address, browser info)

### 3. Purpose of Processing
- Providing the CFP platform service
- Communicating about submissions
- Ensuring platform security
- [Federation, if enabled]

### 4. Data Sharing
- [List any third parties]
- [Federation with cfp.directory, if enabled]

### 5. User Rights
- Access, rectification, erasure, portability, objection

### 6. Contact
```
For data protection inquiries: [email]
Data Protection Officer (if applicable): [contact]
```

---

## Cookie Policy

### Cookies Used

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| `authjs.session-token` | Authentication | Session | Essential |
| `authjs.csrf-token` | CSRF protection | Session | Essential |
| `authjs.callback-url` | Redirect after auth | Session | Essential |

### Cookie Consent

Since all cookies are essential for functionality, explicit consent may not be required. However, you should:

1. Document cookies in your privacy policy
2. Consider a cookie banner for transparency

---

## Incident Response

### Data Breach Procedure

1. **Identify** the breach
2. **Contain** the breach
3. **Assess** the risk to data subjects
4. **Notify** supervisory authority within 72 hours (if high risk)
5. **Notify** affected data subjects (if high risk)
6. **Document** the breach and response

### Breach Notification Template

```
Subject: Important Security Notice

Dear [Name],

We are writing to inform you of a data incident that may have affected your personal information.

What happened: [Description]
When it happened: [Date]
What data was involved: [Types of data]
What we're doing: [Remediation steps]
What you can do: [Recommendations]

If you have questions, please contact us at [email].

[Your Organization]
```

---

## Checklist for Compliance

### Initial Setup

- [ ] Designate a data protection contact
- [ ] Create a privacy policy
- [ ] Create a cookie policy (if needed)
- [ ] Configure HTTPS
- [ ] Review default data retention settings
- [ ] Set up backup encryption

### Ongoing Operations

- [ ] Process data subject requests within 30 days
- [ ] Review and update privacy policy annually
- [ ] Conduct annual security audits
- [ ] Train new staff on data protection
- [ ] Review sub-processor agreements

### Federation (if enabled)

- [ ] Review cfp.directory's DPA
- [ ] Verify consent mechanisms are working
- [ ] Test consent revocation handling
- [ ] Document data flows

---

## Resources

- [GDPR Full Text](https://gdpr-info.eu/)
- [ICO Guide to GDPR](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [EDPB Guidelines](https://edpb.europa.eu/our-work-tools/general-guidance_en)

---

## Disclaimer

This document provides guidance but does not constitute legal advice. Consult with a qualified legal professional for specific compliance requirements in your jurisdiction.
