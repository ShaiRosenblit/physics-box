# Level Review Findings — Physics Box

Survey done at the canonical mobile portrait viewport (390 × 844, iPhone-class).
Each of the 14 puzzle levels was loaded, visually inspected, and a screenshot was
captured (see `level01.png` … `level14.png`). Level 1 was also test-played end to
end to validate the placement / drag / play loop. This is a UX-level review —
**no code was changed**.

> Severity legend: 🔴 critical (blocks play / unfair), 🟡 important (confuses
> or frustrates), 🟢 polish.

---

## Cross-cutting issues (apply to many or all levels)

### 🔴 1. Goal text is silently truncated by `-webkit-line-clamp: 2`

The floating goal-text "chip" at the top of the canvas uses
`max-width: 100%; -webkit-line-clamp: 2; overflow: hidden; text-overflow: ellipsis`
at `font-size: 11px`. On phone-portrait, this regularly clips the second half of
the level instruction. Confirmed truncated cases:

- **Level 2:** "Pull the metal marble sideways with magnets and land it in the…"
  (full text: "…in the bucket.")
- **Level 8:** "Repel the marble straight up through the channel into the…"
- **Level 10:** "Drop a counterweight on the left end to launch the marble into
  the…"
- **Level 13:** "Break the symmetry with a negative charge to send the marble
  into the…"

These are the *very first words a new player reads*, and the truncated half is
"…the bucket" — i.e. the part that names the goal. The DOM scrollHeight (49px)
is larger than clientHeight (35px), so the data is there, just hidden.
Fix is one line of CSS; until then, every long-goal level looks broken.

### 🔴 2. The default view is way too zoomed out before the first piece is placed

The renderer fits to `viewBounds`, which is set generously (e.g. Level 1 uses
`{ minX:-8, minY:-0.5, maxX:7, maxY:8 }`). The result on phone:

- The marble shows up as a 3–4 px dot.
- Buckets read as **two thin black sticks** with no fill — players don't realise
  it's a bucket. (See `level01.png` vs `level01_after_drag.png` — placing one
  box auto-refits and the bucket's yellow fill suddenly becomes legible. The
  auto-fit *only* triggers after a placement, so the first impression of every
  level is the worst one.)
- The bottom ~50% of the canvas is empty grey on most levels (clearly visible
  on Levels 3, 4, 5, 7, 9, 10, 11, 12, 13, 14).

A puzzle game is read **before** it is interacted with. The opening view should
already be the "playable" framing.

### 🟡 3. Goal-text/title chip eats the top of the playfield

The two floating chips ("Level N — …" + goal text) occupy roughly the top
~120 px of the canvas, centered. They overlap whatever is in the upper-middle of
the scene (most evident on Levels 8 and 11 where the action is up high).
They also stay visible during play. Consider: anchoring them outside the canvas,
auto-collapsing once Play is pressed, or a tap-to-dismiss.

### 🟡 4. Level dropdown clips the level name

Levels with longer titles render as `Level 3 — Coulomb's Ca…`,
`Level 12 — Spring Catap…`, `Level 13 — Coulomb Bal…`. Means a returning
player can't fully read which level they're on after navigating away.

### 🟡 5. Charged objects are visually identical regardless of role

The fixed scene charges and the player-movable marble use the same red ball +
"+" badge sprite (clearest in Level 13: three identical "+" balls in a row plus
a bucket — the user has no visual cue which one is "the marble" they're trying
to move). Same problem in Level 4 (the cradled marble vs. the player's `+`
balls), Level 7, and Level 8. Suggest: a goal-marker outline / pulse / arrow on
"the marble" (or a different palette colour for player-placed pieces).

### 🟡 6. The marble itself is too small / low-contrast at default zoom

On Levels 6, 7, 11 the marble is essentially invisible against the cream
background (a 16–18 px world ball renders as ~3 px on phone). At minimum the
marble should have a coloured outline and probably a goal-tracker reticle.

### 🟢 7. Tools / Inspector drawers exist but have no visible mobile toggle

`role="dialog"` panels labelled "Tools panel" and "Inspector panel" are present
but translated fully off-screen (`transform: translate(-304px,0)` /
`translate(0, 158px)`) with `pointer-events: none`. There is no visible button
on phone-portrait that opens them. For puzzle mode this is mostly fine (the
palette pip is shown inline), but it is a dead-end if a user ever wants the
inspector on phone.

### 🟢 8. Console warning every Play press

`PlaybackButton` triggers a React "mixing shorthand and non-shorthand
properties" warning each time Play is clicked (borderColor over border). Not a
gameplay issue but it is the only error in the console and clutters debugging.

### 🟢 9. URL `?level=…` is not honoured

`http://localhost:5176/?level=level3_coulombCatch` loads Level 1. Minor, but it
prevents direct linking / bookmarking levels and made testing slower.

---

## Per-level notes

### Level 1 — Drop In  (palette: Box ×3)
- **UI:** Marble + ramp + lip + bucket, wide empty world. Bucket reads as two
  sticks until a piece is placed and the view auto-fits.
- **Solvability:** Verified solvable (1-box bridge over the lip drops the
  marble next to the bucket; with better placement it lands in). 3 boxes is
  generous — feels right for a tutorial level.
- **Fun:** Standard tutorial. Fine.

### Level 2 — Magnetic Catch  (palette: Magnet N ×2)
- **UI:** Goal text **truncated**. Vertical chute is clear; bucket is small
  but recognisable.
- **Solvability:** Standard intended solution looks clean.
- **Fun:** Good intro to magnetism, with two magnets you can also experiment.

### Level 3 — Coulomb's Catch  (palette: Ball (−) ×2)
- **UI:** Bucket shows as two posts at default zoom. Bottom ~half of canvas is
  empty.
- **Solvability:** Looks fine; a single − ball near the bucket should pull the
  + marble across.
- **Fun:** Clear escalation from L1 → L2 → L3.

### Level 4 — Push Off  (palette: Ball (+) ×2, Box ×1)
- **UI:** Hard to tell that the leftmost charged ball is the marble vs. a fixed
  scene element. Cradle walls are tiny.
- **Solvability:** Plausible but tuning-sensitive — repulsion strength has to
  beat the wall and friction. 2 player + balls + 1 box gives latitude.
- **Fun:** Concept is great; needs the "this is your marble" cue (issue #5).

### Level 5 — Step Up  (palette: Box ×3)
- **UI:** Cleanest read of any level — wood-textured platform is unmistakable.
- **Solvability:** Trivial-to-medium; classic stair build.
- **Fun:** Solid; arguably the best-readable level.

### Level 6 — Magnetic Crane  (palette: Magnet N ×2)
- **UI:** Marble in pit is a single dim grey pixel. Pit walls are tiny posts.
  High shelf reads well.
- **Solvability:** Two magnets to lift up *and* pull across is tight — it's the
  first level where one wrong placement seems to fully fail.
- **Fun:** High-ceiling concept, but the difficulty step from L2 → L6 is
  steep without intermediate magnet practice.

### Level 7 — Over the Wall  (palette: Ball (−) ×3)
- **UI:** Wall is tall (~7 units) but the marble is tiny and on the floor.
  Charged dot is the only thing you can see of the marble.
- **Solvability:** Concerning. Pulling a + marble *up over* a wall taller than
  it is far requires precisely-stacked − balls; with 3 balls and no fine-grain
  position feedback this could be very fiddly. Worth a real playtest.
- **Fun:** If solvable consistently, it's satisfying; if not, frustrating.

### Level 8 — Rocket  (palette: Ball (+) ×3)
- **UI:** Goal text **truncated**. Channel walls intersect the goal-text chip
  at the top. The placement zone is unclear: most of the open area is *outside*
  the channel, so a new player may try placing inside (impossible) and bounce
  off.
- **Solvability:** Depends on whether walls block the electrostatic field.
  Worth checking that placing + balls on the floor outside the channel
  meaningfully accelerates the marble.
- **Fun:** Strong concept ("rocket up"), but only if the placement zone reads
  obviously.

### Level 9 — Balloon Gate  (palette: Balloon ×2)
- **UI:** The "gate" hanging from the ceiling barely shows a rope (very thin).
  Reads as a floating square. The right-side track ends mid-air with the
  bucket *below* it on the floor — an unexpected layout.
- **Solvability:** Two balloons under the gate should lift it; that part works.
  The marble then has to leave the right track and drop into the bucket — that
  trajectory is set, so the player has nothing to do after lifting the gate.
- **Fun:** Balloons-as-tool is a delightful surprise. The "hand-off" from
  player action to the rest is too automatic; consider asking the player to do
  one more thing.

### Level 10 — Seesaw  (palette: Box ×1)
- **UI:** Goal text **truncated**. The bucket **floats in mid-air with no
  visible attachment**. The level definition says it "hangs above the right
  end" but there is no rope or ceiling rendered, so it just looks broken.
- **Solvability:** With only one box and a fixed pivot, the placement choice
  is "where on the left side of the plank do you drop it" — minor variance.
  Should be reliably solvable.
- **Fun:** Big-payoff lever moment; just fix the floating bucket so it doesn't
  look like a render bug.

### Level 11 — Magnet Relay  (palette: Magnet N ×3)
- **UI:** Two baffles at different heights, marble in the lower-left corner,
  bucket upper-right. The right-hand baffle floats with a gap below it (this
  is intentional per the code, but on screen it looks like a pillar that
  "didn't reach the floor"). Default view crops the bucket area into a small
  upper-right window.
- **Solvability:** Conceptually sound; in practice 3 magnets to thread two
  walls (one full-height, one mid-height) is going to test fine positioning.
  Could be the hardest level in the set; would benefit from a real playtest.
- **Fun:** When it works, this is the puzzle that best showcases magnets.

### Level 12 — Spring Catapult  (palette: Box ×2, fixed)
- **UI:** The catapult arm + cork ball are tiny. The wall and bucket look
  fine. Spring rendering is decorative but small.
- **Solvability:** Two boxes to deflect a flying ball is a credible aim
  challenge; should work.
- **Fun:** Best "wow" moment in the set; the catapult firing is delightful.

### Level 13 — Coulomb Balance  (palette: Ball (−) ×1)
- **UI:** Goal text **truncated**. Three identical-looking "+" balls in a
  row — a player can't tell which is the marble (issue #5 hits hardest here).
- **Solvability:** Subtle physics — the level relies on unstable equilibrium,
  which is sensitive to the simulation step. If the marble "tips" before the
  player drops their − ball, the puzzle is unsolvable; if it doesn't tip on
  its own, fine. Worth verifying determinism.
- **Fun:** Beautiful idea, weakest visual.

### Level 14 — Two for One  (palette: Box ×3, fixed)
- **UI:** Cleanly symmetrical, easy to read. Bucket centered. Two ramps with
  marbles at top corners.
- **Solvability:** Three boxes to redirect two marbles into one bucket reads
  as a cute multi-tool challenge; looks doable.
- **Fun:** Strong finale — the symmetry gives an "aha" feel.

---

## Recommended priorities

1. **Fix goal-text truncation (issue #1).** One CSS change, blocks
   comprehension on 4+ levels today.
2. **Refit the default camera per level (issue #2).** Either auto-fit-to-content
   on level load, or tighten each `viewBounds` in the level files.
3. **Distinguish the player's marble (issue #5/#6).** A subtle outline or
   "this is your marble" reticle drastically improves readability of Levels 4,
   7, 8, 13.
4. **Render the rope on Level 10's bucket** (or anchor it to a visible
   ceiling) so it doesn't look like a render bug.
5. **Truncate level names in the dropdown less aggressively, or shorten the
   titles** ("Coulomb Catch" instead of "Coulomb's Catch" etc.).
6. **Real playtest Levels 6, 7, 11, 13** — these are the four where the
   intended solution looks tightest given the palette budgets.
