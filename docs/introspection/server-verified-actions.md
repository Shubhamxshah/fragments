# Server actions trust client-supplied identity for generation and sandbox work

## Summary

**Context:** Fragments Builder should let an authenticated user generate code, create an E2B sandbox, and publish a sandbox URL under the correct user/team context.

**Problem:** The browser checks for a session before submit, but the server routes and publish action accept user, team, and token values from request bodies or action arguments.

**Impact:** A direct caller can bypass the intended login gate, attribute sandbox work to arbitrary IDs, or ask the server to extend/publish sandbox resources with caller-supplied team context.

**Recommendation:** Re-derive the current Supabase session and default team inside the server entrypoints before model, sandbox, or publish work starts.

## Evidence

- Generation accepts `userID` and `teamID` from the JSON body: [`app/api/chat/route.ts`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/app/api/chat/route.ts#L20-L58)
- Sandbox creation accepts `userID`, `teamID`, and `accessToken` from the JSON body and forwards team headers: [`app/api/sandbox/route.ts`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/app/api/sandbox/route.ts#L9-L41)
- Publish accepts `teamID` and `accessToken` as action arguments before extending sandbox timeout: [`app/actions/publish.ts`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/app/actions/publish.ts#L10-L36)

## What I Found

The client submit handler is the only clear login gate. The server should treat client-supplied identity fields as hints at most, because route handlers and server actions are separate server entrypoints.

## Options

| Option | What changes | Pros | Cons |
| ------ | ------------ | ---- | ---- |
| A | Add a shared server auth helper that reads the current Supabase session, resolves the default team, and returns typed `{ userID, teamID, accessToken }`. | Centralizes authority checks and reduces route drift. | Requires deciding the server-side Supabase auth pattern for this app. |
| B | Add per-route checks inline in chat, Morph chat, sandbox, and publish. | Smallest initial diff. | Easier for future routes to diverge or forget a check. |

## Recommended Plan

1. Add a server-only helper that validates the request/session and resolves the default team on the server.
2. Use that helper in `/api/chat`, `/api/morph-chat`, `/api/sandbox`, and `publish`; remove trusted identity/team/token values from client payloads.
3. For publish, verify the sandbox being extended was created for the current user/team before calling `Sandbox.setTimeout`.
4. Return a typed 401/403 response or action error before provider/sandbox work starts.

## Acceptance Criteria

- [ ] Related Introspection issue is linked to this PR.
- [ ] Server entrypoints reject unauthenticated calls before model or sandbox work.
- [ ] Team context is derived server-side, not trusted from the browser.
- [ ] Publish/timeout extension checks sandbox ownership or equivalent server-side authority before mutation.
