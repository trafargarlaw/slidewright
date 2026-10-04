# Security Policy

## Supported versions

The project is pre-1.0. Only the latest published version receives security
fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
from the repository's **Security** tab instead.

Include steps to reproduce, the affected package and version, and the impact
you observed. We aim to acknowledge reports within a week.

## Scope

Areas we care most about:

- HTML sanitisation when rendering untrusted Markdown (for example in the
  hosted playground or when embedding user-supplied decks).
- Code execution through deck files, plugins or the CLI.
