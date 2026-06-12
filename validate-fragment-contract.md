# Validate generated fragment contract before sandbox execution

## Summary

What changed: this draft PR captures the concrete validation plan for generated fragment fields before E2B sandbox creation.

Why: the current schema makes fields parseable, but broad generated values are passed into sandbox creation, dependency install, file write, and preview URL selection without checking them against the selected template contract.

## Evidence

- [Fragment schema](https://github.com/Shubhamxshah/fragments/blob/main/lib/schema.ts#L3-L53) accepts `template`, `install_dependencies_command`, and `file_path` as broad strings and `port` as any number or null.
- [Template catalog](https://github.com/Shubhamxshah/fragments/blob/main/lib/templates.ts#L10-L95) already defines the finite template IDs, expected entry file, dependencies, and port.
- [Sandbox route](https://github.com/Shubhamxshah/fragments/blob/main/app/api/sandbox/route.ts#L25-L64) passes generated values directly to sandbox creation, dependency installation, file writing, and interpreter execution.

Related Introspection issue: 019e232f-730c-73bf-8758-684dd779f676

## Changes to implement

- Add a shared fragment validation helper that checks generated `template` is one of the known template IDs.
- Check the generated `file_path` and `port` match the selected template metadata unless the product intentionally introduces a multi-file contract.
- Normalize dependency behavior per template family instead of accepting arbitrary install commands as the source of truth.
- Return a clear 400-style JSON error before sandbox creation when the generated fragment is semantically inconsistent.
- Reuse the same validation from Morph-edited fragments before creating a new preview.

## Verification

- Add unit coverage or route-level smoke coverage for invalid template ID, wrong file path, wrong port, and inconsistent dependency command.
- Manually verify a normal Next.js fragment, a Python interpreter fragment, and a Streamlit/Gradio fragment still create previews.

## Acceptance Criteria

- [ ] Issue is linked to this PR.
- [ ] Sandbox creation is never attempted for an unknown template ID.
- [ ] Template/file/port mismatches produce clear client-visible errors.
- [ ] Dependency install behavior is constrained by template family rather than arbitrary generated shell text.
