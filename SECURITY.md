# Security Policy

## Reporting a vulnerability

Please do not publish security vulnerabilities in a public issue. Use the repository's [private vulnerability reporting form](https://github.com/soloshow-labs/radial-vocab-video-studio/security/advisories/new). If that form is unavailable, contact the maintainers through the WeChat Official Account **一人独角show**.

Include the affected version, reproduction steps, and expected impact. Use placeholders or redacted samples instead of real API keys, credentials, personal data, or private media.

We will acknowledge a complete report as soon as practical and coordinate a fix before public disclosure.

## Credential handling

Azure Speech credentials belong in the local `.env` file only. Never commit `.env`, paste credentials into issues, or include them in exported project files. If a key may have been exposed, revoke it in Azure immediately and create a replacement.

## Supported deployment boundary

The full editor and API are designed for a trusted, single-user computer. The API binds to `127.0.0.1`; its Origin and session-token checks protect against cross-origin browser requests, not against other programs or operating-system users on the same host.

Do not publish the full local API through a reverse proxy, port forward, tunnel, container port, or public hosting service. Do not use it as a shared multi-user service. The Cloudflare Pages demo is a separate static build created with `pnpm build:demo`; it intentionally disables uploads, Azure Speech calls, and MP4 rendering.
