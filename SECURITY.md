# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | yes       |
| 1.x     | no        |

## Reporting a vulnerability

Please do not open a public issue for security problems.

Email **zahaanass277@gmail.com** with:

- A description of the issue and its impact
- Steps to reproduce or a proof of concept
- The affected version or commit

You will receive an acknowledgement within 72 hours. We aim to ship a fix within 14 days for confirmed issues and will credit you in the changelog unless you prefer otherwise.

## Scope notes

- Model API keys live only on the server. If you find any path that exposes them to the browser, report it.
- `POST /api/tools/url` fetches user-supplied URLs; it blocks private, loopback and link-local destinations. SSRF bypasses are in scope.
- Shared chat links (`/api/share/:token`) are unguessable 16-character tokens; report any enumeration or authorization flaw.
