# Server routes rely on browser-only authentication for AI and sandbox work

## Summary

**Context:** Fragments Builder uses the browser session to decide whether a user can submit a chat turn, then server routes create model calls, E2B sandboxes, and published sandbox links.

**Problem:** The server receives `userID`, `teamID`, and `accessToken` from the request body or action parameters and forwards them without verifying a session server-side.

**Impact:** A direct caller can bypass the browser gate and trigger model, sandbox, or publish side effects with spoofed identity metadata, consuming shared resources and weakening team ownership boundaries.

**Recommendation:** Add server-side session verification to every side-effecting route/action and derive identity from the verified session rather than trusting request payload fields.

## Evidence

- [The browser submit handler checks for a session before calling the AI route](https://github.com/Shubhamxshah/fragments/blob/main/app/page.tsx#L173-L207).
- [The chat route reads caller-supplied identity fields from JSON before creating the model call](https://github.com/Shubhamxshah/fragments/blob/main/app/api/chat/route.ts#L20-L58).
- [The sandbox route reads caller-supplied identity fields and creates an E2B sandbox without server-side session verification](https://github.com/Shubhamxshah/fragments/blob/main/app/api/sandbox/route.ts#L9-L41).
- [The publish action accepts caller-provided team and token values before extending a sandbox timeout](https://github.com/Shubhamxshah/fragments/blob/main/app/actions/publish.ts#L12-L31).

Related Introspection issue: 019e2726-c322-748e-86b8-288197038005

## What I Found

The UI-level auth gate is useful for normal browser users, but it is not an enforcement boundary for API callers. The side-effecting server surfaces need to validate the Supabase session themselves, bind team access to that session, and reject unauthenticated requests before provider or sandbox work starts.

## Options

| Option | What changes | Pros | Cons |
| ------ | ------------ | ---- | ---- |
| A | Add a shared server auth helper and require it in chat, Morph edit, sandbox, and publish paths. | Centralized enforcement; identity is derived consistently. | Requires choosing the right Supabase server-client pattern for this app. |
| B | Add route-specific checks only around the sandbox and publish paths first. | Smaller first change; protects the most expensive side effects. | Leaves AI provider calls with weaker identity/resource boundaries. |
| C | Keep browser auth and add only stronger rate limits. | Fastest to ship. | Still allows spoofed identity metadata and unauthenticated side effects. |

## Recommended Plan

1. Add a server-side auth/session helper that verifies the Supabase access token or cookie for route handlers and server actions.
2. Update chat, Morph edit, sandbox, and publish paths to call that helper before provider work starts.
3. Remove `userID`, `teamID`, and `accessToken` as trusted request fields; derive the user and default team from the verified session.
4. Add sandbox-specific rate/resource limits keyed by verified user/team, with a fallback denial for unauthenticated callers.
5. Verify direct unauthenticated POSTs/actions fail before model, sandbox, or publish work begins.

## Acceptance Criteria

- [ ] Issue 019e2726-c322-748e-86b8-288197038005 is linked to this PR.
- [ ] Side-effecting server paths verify a session server-side.
- [ ] Server paths derive user/team identity from the verified session.
- [ ] Sandbox creation has a user/team-scoped resource limit or explicit denial path.
- [ ] Direct unauthenticated API calls cannot start provider or sandbox work.
