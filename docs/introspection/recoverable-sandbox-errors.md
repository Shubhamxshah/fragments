# Sandbox failures are not returned as recoverable preview state

## Summary

**Context:** After a fragment object finishes streaming, the page creates an E2B sandbox and switches to the preview tab when execution succeeds.

**Problem:** Sandbox creation, dependency installation, file writes, and code execution are not normalized into a typed error response, and the client only clears preview loading after successful JSON parsing and state updates.

**Impact:** If sandbox setup fails or returns a non-JSON error, the user can be left with generated code but no clear preview failure, retry path, or loading reset.

**Recommendation:** Make sandbox execution return a consistent success/error envelope and update the client to handle non-OK responses in a retryable preview state.

## Evidence

- Sandbox operations are awaited directly without a route-level try/catch or typed error payload: [`app/api/sandbox/route.ts`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/app/api/sandbox/route.ts#L25-L84)
- The client sets preview loading before the fetch and clears it only after successful JSON parsing and state updates: [`app/page.tsx`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/app/page.tsx#L100-L128)

## What I Found

The model-generation step has an `onError` path, but the sandbox-preview step is embedded inside `onFinish` without equivalent error state. Preview failures therefore do not get the same recovery treatment as LLM failures.

## Options

| Option | What changes | Pros | Cons |
| ------ | ------------ | ---- | ---- |
| A | Return `{ ok: true, result }` / `{ ok: false, error }` JSON from `/api/sandbox` and handle it in the page. | Simple contract and clear UI behavior. | Requires touching result typing and preview state. |
| B | Keep the success shape but return JSON errors with non-2xx status, then branch on `response.ok`. | Smaller type change for existing success rendering. | Error and success shapes remain less explicit. |

## Recommended Plan

1. Wrap sandbox creation, dependency install, file writes, and code execution in route-level error handling.
2. Return JSON for both success and failure with a clear status code and a short user-safe error message.
3. In the client, use `try/finally` so `setIsPreviewLoading(false)` always runs after the sandbox attempt.
4. Check `response.ok` before parsing success result, store a sandbox-specific error message, and keep retry available.
5. Avoid switching to the preview tab unless a valid sandbox result exists.

## Acceptance Criteria

- [ ] Related Introspection issue is linked to this PR.
- [ ] Sandbox route returns JSON for expected create/install/write/run failures.
- [ ] Client loading state clears on both success and failure.
- [ ] Failed preview attempts display an actionable error without losing the generated code.
- [ ] Retry can reattempt sandbox creation after a preview failure.
