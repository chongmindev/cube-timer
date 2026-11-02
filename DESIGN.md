# Design

Thistle, a cube timer, follows the Bauhaus: primary colors, three geometric forms, heavy black rules, and one geometric typeface. A speedcube is already a Bauhaus object (a grid of flat primary-colored squares), so the style comes from the subject rather than being pasted on.

The rule behind every decision: **form follows function.** Nothing is decoration. Every color, shape and line encodes something, and if it stops meaning something it gets removed.

## Principles

1. **The timer is the hero.** One big circle with the time inside it. Everything else is quieter.
2. **Color is information, not mood.** The primaries appear only when they mean something (see the color table). Most of the screen is paper and ink.
3. **One shape, one meaning.** Circle, triangle and square each have a job, and only that job.
4. **Structure with few rules, not boxes.** A handful of heavy black lines frame the page; everything inside is grouped by whitespace and weight. No cards, no rounded corners, no shadows, no pills.
7. **No instructions the screen can show for itself.** No "press space to start" or "your solves show up here": an empty table with its headers, or the control itself, says enough. Text is for facts and for errors.
5. **Get out of the way while solving.** Focus mode fades everything except the circle and the time.
6. **Motion answers the person.** Things move when you press, release, stop, open or choose. Nothing moves on its own.

## Typeface

**Jost**, a free revival of Futura (Paul Renner, 1927), the geometric typeface of the same era and design school as the Bauhaus.

- One family for everything: the time, scrambles, stats and interface.
- Tabular figures are on globally (`font-variant-numeric: tabular-nums`) so the running time and the stat columns never jitter.
- Fallbacks: Futura, Century Gothic, then the system sans.

| Use | Size | Weight |
| --- | --- | --- |
| Time in the circle | 30% of the circle's height (21% for times of 6 characters or more) | 400 |
| Page title (sessions, settings) | clamp(2.5rem, 6vw, 4.25rem) | 700 |
| Event and session pickers | 1.4rem | 700 |
| Scramble | clamp(1.2rem, 2.1vw, 1.65rem), wide word spacing | 450 |
| Stat values | 1.6rem | 500 |
| Body | 1.0625rem | 400 |
| Labels | 0.85rem, muted | 500 |

Everything is sentence case, names capitalized, and cubing notation as cubers write it (ao5, mo3, R U2). No all-caps labels anywhere.

## Color

| Token | Light | Dark | Meaning |
| --- | --- | --- | --- |
| `--paper` | `#ffffff` | `#1a1a1a` | Background (pure white; no grey or cream) |
| `--ink` | `#000000` | `#f2f2ee` | Text and rules |
| `--muted` | `#5d5d58` | `#9b9b94` | Labels, secondary text |
| `--hairline` | `#cfcfc8` | `#3a3a37` | Faint marks: empty streak days, the typing placeholder, a loading share card |
| `--red` | `#d7261e` | `#ef4a3c` | Holding (not ready yet), penalties, destructive actions |
| `--green` | `#1d8a4b` | `#35b86b` | Ready: let go to start. Used nowhere else |
| `--yellow` | `#f5c400` | `#ffd21a` | Solving, personal bests, hover in menus |
| `--blue` | `#1c4fa0` | `#5b8ae0` | Inspection, links and actions, focus rings |

Green is the one color that isn't a Bauhaus primary. It stays because every cuber reads green as "go" (csTimer, Stackmat and every other timer use it), and it is also a cube sticker color.

## Shapes

| Shape | Means | Where |
| --- | --- | --- |
| Circle | The timer | The large circle on the timer screen |
| Triangle | A personal best | Yellow triangle before your best single in the times list and before "New best" notices |
| Square | A choice or a penalty | Small black square marks the current page and the chosen option; red square marks a +2 or DNF solve |

## Name

**Thistle**, after Morwen Thistlethwaite, whose 1981 algorithm first showed any 3x3 position can be solved in at most 52 moves. Cubers who know the algorithm catch the nod; everyone else hears a plain, soft word. It is capitalized like any name, with "cube timer" beside it in muted regular weight wherever there is room (header, share card, page title), so the name never has to explain itself.

## Logo

A cube drawn only with three primary ribbons, no outlines. Each ribbon runs along the outer row of two faces, parallel to the cube's edges, and folds around one corner: red around the top-left corner, blue around the top-right, yellow around the bottom. Where two ribbons meet they overlap like a weave, cyclically (red over blue at the top, blue over yellow at the right, yellow over red at the left), so the mark is rotationally symmetric. The middle of the cube is empty. The geometry lives in `src/lib/logoPaths.ts` and is shared by the header (`Logo.tsx`), the share card and `public/favicon.svg`. Change it in one place, then copy the paths into the favicon. Under 420px the header shows the cube without the wordmark.

## The timer circle

The circle's fill shows the timer state, so you can read it from the corner of your eye:

| State | Circle | Digits |
| --- | --- | --- |
| Idle | Black outline | Ink |
| Holding | Filled red, shrinks slightly as if pressed | White |
| Ready | Filled green | White |
| Inspecting | Filled blue, counting down 15 to 1, then +2, then DNF | White |
| Running | Filled yellow | Black |
| Stopped | Outline again, with a brief overshoot | Ink |

The overshoot when you stop is the single signature motion in the app. Don't add competing animations.

Everything else moves on one curve, `--ease` (`cubic-bezier(0.32, 0.72, 0, 1)`), kept short (120–300ms) because a timer has to feel instant. Every button pushes down 1px while pressed.

## Rules and layout

- `--rule: 3px` solid ink is the structural line, used sparingly: under the top bar, between the side columns and the timer, above the stats, at the solve panel's edge, under the time in that panel, and under table headers so columns line up. Section headings and table rows have no lines; spacing separates them.
- Text fields are an underline (`--rule`), which is what makes them read as fields.
- Desktop timer screen: three columns. Scramble preview on the left, times on the right, both the same width (14 to 22rem) so the circle sits in the true center of the page. The center column holds the pickers and scramble (centered), then the circle, then the stats. Heavy rules split the columns.
- Under 860px everything stacks into one column (scramble, circle, times, preview) and the heavy rules turn horizontal.
- Under 420px the header shows just the cube logo.
- Square corners everywhere. The circle is the only curve.

## Components

- **Navigation and options:** plain text. The current one turns ink and gets a small black square that springs in. No underlines, tabs or pills.
- **Text actions** ("Next scramble", "Copy", "Delete"): blue (red if destructive), with an underline that draws in on hover.
- **Menus:** 3px ink border, no shadow. The hovered row turns yellow; the selected row has the square.
- **Solve panel:** slides in from the right (from the bottom on phones), with the time huge and a heavy rule under it.
- **Sharing a solve:** the solve panel has a Share section with Text or Image (Text first, since it pastes anywhere).
  - **Text:** an emoji header (🟨🟥🟦 event: time), ▲ New personal best when it is one, ao5 and ao12, a bar chart of the last 12 solves made of ▁ to █ characters (taller is slower, ✕ for DNF), the scramble, and "Timed with Thistle". Shown in a preview with a yellow rule on its left, then Copy text.
  - **Image:** a 1080x1350 (4:5) poster drawn on a canvas, with Copy image and Save image. Same rules as the app: logo and date over a heavy rule, the event name big and left aligned, the time in a yellow circle (red for a DNF) set off-center to the right, the yellow triangle and "Personal best" when it is one, then ao5, ao12 and the solve number in ruled cells, and the scramble along the bottom.
- **Scramble preview:** for cubes (2x2 to 7x7, OH, BLD) an unfolded net drawn by the app: square stickers with no rounding, set into solid black face blocks, in the WCA scheme (white top, green front) using the app's own red, yellow, blue and green with green lightened to `#29a35a` and a vivid orange `#ff7300` that still sits clearly between red and yellow. Stickers come from `src/lib/cubeState.ts`, a small simulator that applies the scramble. Other puzzles still use cubing.js's 2D view until they get the same treatment.
- **Typing mode:** the Typing toggle swaps the clock for a text field inside the same circle. The circle turns blue while the field has focus and red when the entry isn't a time. Plain digits use the cubing shorthand (`1234` is 12.34), a trailing `+` adds two seconds, and `DNF` marks a DNF. Inspection is hidden in this mode.
- **Reconstruction:** three columns like the timer: a 3D cube from cubing.js, repainted in the scramble preview's sticker colors and following light and dark mode (drawn from how you held it, white top and green front before that; the hidden back, left and bottom stickers float just off those faces so every piece shows, and you can drag to turn it), the step list (label, moves, move count), and suggestions with one moves field. Suggestion rows turn yellow on hover like menu rows; the chosen pair gets the black square, and the cube greys out every piece but that pair and the centers. What you type previews on the cube live, with Play these moves to watch them turn. Clicking an added step shows the cube at that step, plays it, and opens its moves under the row to edit (the cube follows as you type) or delete; saving relabels the steps after it, and Play solve replays the whole reconstruction from the scramble; and a line under the field says what it solves or what it breaks, in red when something's wrong.
- **Daily streak:** in the top bar after the wordmark: the day count plus seven short bars for the last week (ink for a day with a solve, hairline for none, today's bar taller and red once solved). A streak still waiting on today's solve shows its count in muted grey. Bars are rules, not squares, so they don't borrow the square's meaning.
- **Timer toggles:** on/off options on the timer screen (Inspection, with its `I` shortcut shown as a muted key hint) use the same black square as navigation: square shown means on.
- **Times header:** "Times" title with "Clear times" in red. Clearing is instant with an undo, never a pop-up.
- **Toast:** an ink bar at the bottom, with the action in yellow ("Solve deleted. Undo").
- **Confirming danger:** no browser pop-ups. Deleting a solve offers an undo; deleting a session or erasing data asks for a second click on the same button, which spells out what will be lost.

## Writing

- Sentence case, plain verbs, from the cuber's side: "Next scramble", "Practice this session", "Erase all data".
- Errors say what happened and what to do. Empty states tell you how to start ("Hold space to start").
- Cubing terms are used as cubers say them: ao5, mo3, DNF, +2, inspection.

## Don'ts

- No rounded cards, chips, pills or drop shadows.
- No gradients, glows or glassmorphism.
- No primaries used just to decorate. If you can't say what it means, use ink.
- No second typeface.
- No all-caps labels, no monospace labels, no decorative numbering.
- Nothing moves unless the person did something.
