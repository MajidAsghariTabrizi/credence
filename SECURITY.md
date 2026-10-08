# Security Policy

## Supported versions

v0.1.x (the current release line).

## Reporting a vulnerability

Open a private security advisory (GitHub → Security → Advisories) or contact
the maintainer via the address on the GitHub profile. Do not open a public
issue for vulnerabilities. You will get a response within 7 days.

## Scope notes

- credence is a local library: it listens on nothing and phones nowhere.
- Claim stores are plain JSONL files; treat store directories as trusted
  input boundaries. Do not load stores from untrusted parties without review.
