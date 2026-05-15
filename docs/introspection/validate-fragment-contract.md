# Fragment schema accepts outputs the sandbox cannot safely execute

## Summary

**Context:** The model returns a structured fragment that the app immediately sends to E2B for preview execution.

**Problem:** The schema only checks broad types for executable fields, while the sandbox route trusts those values as the sandbox template, file path, dependency install command, and preview port.

**Impact:** A schema-valid model response can still pick an unsupported template, wrong path or port, or inconsistent dependency command, causing sandbox work to fail after the generation step appears successful.

**Recommendation:** Validate the generated fragment against the selected template catalog before sandbox creation and return a repairable validation error when the contract is invalid.

## Evidence

- Fragment fields are free-form strings/numbers rather than catalog-constrained values: [`lib/schema.ts`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/lib/schema.ts#L3-L53)
- Sandbox execution directly consumes `fragment.template`, `fragment.install_dependencies_command`, `fragment.file_path`, and `fragment.port`: [`app/api/sandbox/route.ts`](https://github.com/Shubhamxshah/fragments/blob/484379ddbdbf0a535ea307b090b0467465823eec/app/api/sandbox/route.ts#L25-L84)
- E2B sandbox template docs describe the template name as the identifier used with `Sandbox.create("template-tag")`.

## What I Found

The prompt tells the model which templates exist, but the application does not enforce that contract before running generated output. Schema validity is therefore treated as execution readiness even though the fields have domain-specific constraints.

## Options

| Option | What changes | Pros | Cons |
| ------ | ------------ | ---- | ---- |
| A | Add a `validateFragmentForSandbox(fragment, templates)` helper before sandbox creation. | Clear boundary, easy to test, keeps schema general for streaming. | Adds a second validation stage after model output. |
| B | Encode template-specific constraints directly into the Zod schema. | Fails earlier during object generation. | Harder to keep dynamic dev/prod template IDs and template-specific paths in sync. |

## Recommended Plan

1. Add a server-side validation helper that checks the template exists in the catalog, file path matches the template expectation, port matches the template expectation, and dependency command is consistent with `has_additional_dependencies`.
2. Call the helper at the start of `/api/sandbox` before `Sandbox.create`.
3. Return a JSON validation error that the client can display or use to trigger regeneration/repair instead of spending sandbox work.
4. Add focused unit tests or route-level checks for unsupported template, wrong path, wrong port, and inconsistent dependency fields.

## Acceptance Criteria

- [ ] Related Introspection issue is linked to this PR.
- [ ] Unsupported template IDs are rejected before `Sandbox.create`.
- [ ] Template-specific file path and port mismatches are rejected before sandbox execution.
- [ ] Dependency command fields are checked for consistency before command execution.
- [ ] The client receives a structured validation error rather than an opaque preview failure.
