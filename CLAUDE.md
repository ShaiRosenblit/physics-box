# Physics Box — Claude Code Project Rules

## Target form factor: phone, portrait

This is a **mobile-first, portrait-first** game. The canonical viewport
is a phone in portrait (≈390 × 844). Tablet and desktop layouts exist
and must keep working, but they are derivatives of the phone layout —
the design is not a desktop app that "also works on phone."

When you change UI:

- Sanity-check the change at phone-portrait sizes first; only then look
  at tablet and desktop. Tests under `tests/smoke/responsive.spec.ts`
  cover all three breakpoints.
- The canvas is the game. Every chrome panel takes pixels away from the
  play area, so favor small, dense, single-row controls on phone over
  multi-row wrapping panels.
- Treat 16px as the floor for input font size **only if** the viewport
  meta does not pin scale; we currently set `maximum-scale=1` so iOS
  Safari does not auto-zoom on focus, which lets controls go smaller.
- The viewport is locked (no pan / zoom / scroll) — see `Renderer`'s
  `setViewBounds` and `fitToContent`. Scenes and levels can declare a
  `viewBounds` rectangle to lock the camera; otherwise the renderer
  fits to content.

## After completing any task

Always commit and push changes to `origin/main` when a task is done:

1. Stage the relevant files (be specific, avoid `git add -A`)
2. Commit with a conventional commit message (`feat(scope): ...`, `fix(scope): ...`, etc.) matching the style in git log
3. Push with `git push`

Do this automatically at the end of every task — do not wait to be asked.
