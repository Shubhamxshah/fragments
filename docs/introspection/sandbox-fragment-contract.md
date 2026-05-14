# Sandbox fragment actions are not validated against the template contract

## Summary

**Context:** The generator returns a structured fragment object, and the sandbox route uses that object to create an E2B sandbox, install dependencies, write code, and return an interpreter result or web preview URL.

**Problem:** The schema constrains shape, but it does not verify that sandbox-bound values match the template catalog before side effects run.

**Impact:** A schema-valid but semantically invalid output can create the wrong sandbox, run an unintended install command, write to the wrong target file, or return a preview URL that does not match the selected template.

**Recommendation:** Validate fragment actions against the known template catalog before sandbox execution and derive values from the template wherever the model should not decide.

## Evidence

- [The fragment schema accepts broad strings for template, dependencies, install command, and file path](https://github.com/Shubhamxshah/fragments/blob/main/lib/schema.ts#L3-L44).
- [The template catalog defines the known template IDs, expected files, dependencies, and ports](https://github.com/Shubhamxshah/fragments/blob/main/lib/templates.ts#L10-L95).
- [The sandbox route passes fragment values into sandbox creation, command execution, file writes, and host selection](https://github.com/Shubhamxshah/fragments/blob/main/app/api/sandbox/route.ts#L25-L84).

Related Introspection issue: 019e2726-de6a-7587-9c54-51166293797f

## What I Found

The current contract makes the model responsible for choosing operational values that the application already knows from `lib/templates.ts`. The route should treat the model object as a proposal, normalize it against trusted catalog data, and reject mismatches before E2B work starts.

## Options

| Option | What changes | Pros | Cons |
| ------ | ------------ | ---- | ---- |
| A | Add a shared fragment validator that checks template ID, expected file path, expected port, and install command shape before sandbox execution. | Minimal disruption; centralizes enforcement near the side effect. | Still allows the model to output fields that are later normalized or rejected. |
| B | Narrow the Zod schema itself to a generated enum and template-derived defaults. | Stronger contract for model output; errors happen before sandbox work. | Requires careful handling of dev template suffixes and selected-template subsets. |
| C | Remove model control over install commands and derive package-manager commands from dependency names. | Reduces command ambiguity and makes dependency installs deterministic. | Needs package-manager-specific handling for Python and JS templates. |

## Recommended Plan

1. Add a template-aware validation/normalization helper that accepts a fragment and the allowed template catalog.
2. Reject unknown template IDs and ports that do not match the selected template's expected port.
3. Derive or validate the expected file path from the selected template before writing code.
4. Replace free-form dependency install commands with deterministic commands built from validated dependency names, or restrict commands to a small allowlist per template family.
5. Call the helper in `/api/sandbox` before `Sandbox.create`, `commands.run`, `files.write`, or `getHost`.
6. Add focused tests or route-level checks for unknown template, wrong port, wrong file path, and unsafe install command cases.

## Acceptance Criteria

- [ ] Issue 019e2726-de6a-7587-9c54-51166293797f is linked to this PR.
- [ ] Unknown template IDs are rejected before sandbox creation.
- [ ] File path and port are checked against the template catalog or derived from it.
- [ ] Dependency installation cannot run arbitrary shell text from the model.
- [ ] Invalid fragments return a clear error before E2B side effects run.
