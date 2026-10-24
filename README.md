# cube timer

A speedcubing timer meant to be what csTimer should feel like: easy to navigate, calm while you solve.

## Run it

```sh
npm install
npm run dev
```

## What's here

- **Timer:** hold space (or hold the time on a phone) until it turns green, then let go. Any key or tap stops it.
- Optional 15 second WCA inspection with automatic +2 and DNF. Toggle it right on the timer screen or press `I`.
- Random-state scrambles for all WCA events (via [cubing.js](https://js.cubing.net/cubing/)) with a flat preview of the scrambled puzzle, plus Previous and Next scramble.
- Focus mode fades everything but the time while you solve.
- After a solve: `2` toggles +2, `D` toggles DNF, `Backspace` deletes, with undo.
- Live ao5, ao12 and best, plus a notice when you set a new best.
- **Sessions:** one per event or several, with current and best single, mo3, ao5, ao12, ao50 and ao100.
- **Settings:** inspection, hold time, what to show while solving, decimals, theme, export and import.

Data lives in the browser (localStorage). See `IDEAS.md` for what's next.
