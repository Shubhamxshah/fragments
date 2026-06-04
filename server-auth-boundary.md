# Server-side auth boundary for generation and sandbox routes

## Summary

**Context:** Fragments Generator uses a browser session gate before submitting chat, then calls server routes for model generation, Morph edits, and E2B sandbox creation.

**Problem:** The server routes parse request JSON directly and trust caller-supplied identity fields instead of deriving user and team context from a server-verified session.

**Impact:** A direct caller can bypass the UI gate and request model work or sandbox creation outside the intended authenticated product path.

**Recommendation:** Add a shared server-side auth helper, use it in the generation, edit, and sandbox routes, and derive `userID`, `teamID`, and access-token headers from the verified session instead of the request body.

## Evidence

- [Client-only submit gate](https://github.com/Shubhamxshah/fragments/blob/main/app/page.tsx#L171-L204) blocks unauthenticated browser submissions before calling the APIs.
- [Chat route request parsing](https://github.com/Shubhamxshah/fragments/blob/main/app/api/chat/route.ts#L19-L70) accepts caller-provided identity, model, config, and messages without session verification.
- [Sandbox route request parsing and sandbox creation](https://github.com/Shubhamxshah/fragments/blob/main/app/api/sandbox/route.ts#L9-L85) accepts caller-provided identity/token fields and creates the sandbox from the request body.

Related Introspection issue: 019e232f-561c-7162-ab88-0ff36f8ca2cd

## What I Found

The UI has an auth check, but the actual server-side action boundary is not enforced in the route handlers. The route handlers should assume callers can bypass the page and should verify identity before provider or sandbox work starts.

This plan intentionally does not claim a publish or E2B ownership bypass; that needs separate provider-specific verification.

## Options

| Option | What changes | Pros | Cons |
| ------ | ------------ | ---- | ---- |
| A | Add a shared route helper that validates the Supabase bearer token and derives user/team context for `/api/chat`, `/api/morph-chat`, and `/api/sandbox`. | Central boundary, simplest to audit, keeps current routes. | Needs a clear behavior for deployments with Supabase disabled. |
| B | Move generation and sandbox creation behind server actions that already own authenticated context. | Stronger coupling to the authenticated app flow. | Larger refactor and harder to reuse from streaming route handlers. |
| C | Keep routes public but add stronger IP rate limits only. | Lowest code change. | Does not restore the intended authenticated product boundary. |

## Recommended Plan

1. Add a server-side auth/context helper that validates the request session and returns user/team context or a 401 response.
2. Use the helper at the start of `/api/chat`, `/api/morph-chat`, and `/api/sandbox` before model clients or sandboxes are created.
3. Remove `userID`, `teamID`, and `accessToken` from trusted request-body inputs; derive metadata and E2B headers from the verified context.
4. Decide the explicit demo-mode behavior when Supabase is disabled, then cover it with a small route-level test or local smoke check.

## Acceptance Criteria

- [ ] Issue is linked to this PR.
- [ ] Recommended option is clear.
- [ ] Engineer can start without re-reading the review evidence.
