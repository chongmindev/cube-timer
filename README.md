# Thistle

A cube timer, named after Morwen Thistlethwaite, whose 1981 algorithm was the first to show any 3x3 position can be solved in at most 52 moves.

A speedcubing timer meant to be what csTimer should feel like: easy to navigate, calm while you solve.

Use it at **[cube-timer.chong-m2007.workers.dev](https://cube-timer.chong-m2007.workers.dev)**.

## Run it

```sh
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`. It's deployed on Cloudflare, which rebuilds on every push to `main`.

## What's here

- **Timer:** on a computer, hold space for 0.55 seconds (the Stackmat's hold) until the time turns green, then let go (clicking doesn't start it). On a phone, hold the time instead. Any key or tap stops it.
- Optional 15 second WCA inspection with automatic +2 and DNF. Toggle it right on the timer screen or press `I`.
- Typing mode (`T`) for entering times from another timer: `1234` is 12.34, end with `+` for a +2, or type `DNF`.
- A year of practice on the Sessions page, GitHub style, with your streak. Hover a day for its solves and best single.
- **Reconstruct** a 3x3 solve from its sheet, one CFOP step at a time on a 3D cube: say how you held it, pick or type your cross, then pairs, OLL and PLL. The app suggests likely moves at each step (pairs you'd have seen first rank highest), checks what you enter against the cube, and saves the result so it's included when you share the solve.
- Random-state scrambles for all WCA events (via [cubing.js](https://js.cubing.net/cubing/)), with a few saved ahead for every event so a new one shows up instantly, and a flat preview of the scrambled puzzle, plus Previous and Next scramble.
- Focus mode fades everything but the time while you solve.
- After a solve: `2` toggles +2, `D` toggles DNF, `Backspace` deletes, with undo.
- Live ao5, ao12 and best, plus a notice when you set a new best.
- **Recons:** every reconstruction from every session in one tab, newest first, with drafts marked. Click one to keep editing it.
- **Sessions:** one per event or several, with current and best single, mo3, ao5, ao12, ao50 and ao100.
- **WCA profile:** connect your WCA ID in Settings to see your official singles, averages and world ranks, with your official single shown beside your best on the timer. It uses the WCA's public API, with no sign-in.
- **Settings:** inspection, what to show while solving, decimals, theme, export and import.

Data lives in the browser (localStorage), so each site address keeps its own solves. Move them with export and import in Settings. See `IDEAS.md` for what's next.

MIT licensed. See `LICENSE`.
