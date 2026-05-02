# Security Policy

## Supported Versions

We actively provide security updates for the following versions of Alpaka Desktop:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | ✅ Yes             |
| < 1.2.0 | ❌ No              |

## Reporting a Vulnerability

We take the security of Alpaka Desktop seriously. If you believe you have found
a security vulnerability, please report it to us as follows:

1. **Do not open a public issue.** This allows us to fix the issue before it
   can be exploited.
2. Email your report to [nikoteressi@gmail.com](mailto:nikoteressi@gmail.com).
3. Include as much detail as possible, including:
   - Type of issue (e.g., buffer overflow, SQL injection, unauthorized access).
   - The version of Alpaka Desktop affected.
   - A proof-of-concept or clear steps to reproduce.
   - Potential impact.

### Our Commitment

If you report a vulnerability, we will:

- Acknowledge receipt of your report within 48 hours.
- Provide an estimated timeline for a fix.
- Notify you once the vulnerability is resolved.
- Credit you for the discovery (if desired) in our changelog once the fix is
  public.

## Keyring Security

Alpaka Desktop integrates with your system's native Secret Service (KWallet,
GNOME Keyring) to store sensitive information like API keys. We never store
these in plaintext or in the application database. If you notice any behavior
that suggests otherwise, please report it immediately.
