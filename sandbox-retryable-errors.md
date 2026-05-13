# Return retryable sandbox preview errors

## Summary

What changed: this draft PR captures the implementation steps needed to make sandbox creation failures visible and retryable in the preview flow.

Why: the current client assumes `/api/sandbox` returns successful JSON and clears preview loading only on the success path, while the route can throw during sandbox creation, dependency installation, file writing, or code execution.

## Evidence

- [Preview completion handler](https://github.com/Shubhamxshah/fragments/blob/main/app/page.tsx#L98-L125) sets preview loading, fetches `/api/sandbox`, immediately parses JSON, and clears loading only after the successful path completes.
- [Sandbox route](https://github.com/Shubhamxshah/fragments/blob/main/app/api/sandbox/route.ts#L9-L85) does not wrap sandbox create/install/write/run operations in a typed JSON error response.

Related Introspection issue: 019e232f-9b2f-7162-9b61-852495ff602d

## Changes to implement

- Wrap sandbox creation, dependency installation, file writes, and interpreter execution in a route-level error envelope.
- Return JSON errors with a stable shape such as `{ "error": { "code": "sandbox_failed", "message": "..." } }` and an appropriate non-2xx status.
- Update the client to check `response.ok` before parsing as a successful `ExecutionResult`.
- Put `setIsPreviewLoading(false)` in a `finally` block so failed previews cannot leave the UI spinning.
- Surface the sandbox error next to the chat input or preview pane with a retry action that reuses the same fragment.

## Verification

- Simulate an invalid template or forced sandbox-route failure and confirm the UI clears loading and shows a retryable error.
- Verify a successful web-template fragment still switches to the preview tab.
- Verify a successful `code-interpreter-v1` fragment still renders interpreter output.

## Acceptance Criteria

- [ ] Issue is linked to this PR.
- [ ] `/api/sandbox` returns JSON on known sandbox failures.
- [ ] The browser checks response status before treating the result as a preview.
- [ ] Preview loading clears on both success and failure.
- [ ] Users get a clear retry path without losing the generated fragment.
