# JELLYSHOT

A cute sniper game about horrible things. Peer down a scope at the **Gumdrop Jubilee**, a candy-town festival where every jelly has a job, a schedule, people they love, and a way of freaking out. Three of them are your targets.

**Play:** https://junovhs.github.io/jellyshot/ (mobile first — add it to your home screen for fullscreen)

## The loops

- **Second to second** — drag to aim, scope sway, hold breath to steady, lead moving targets, headshots, combos, juicy pops, hide puddles in water/bushes/chocolate, keep suspicion down.
- **Minute to minute** — a 5-minute festival timeline (arrivals → Big Cake Ceremony → Pie Judging → Maypole → Syndicate Meeting → Farewells). Each phase moves the targets next to a different lethal "accident" opportunity. Witnesses, mourning partners, guards, lures and lockdowns react to everything you do. Some opportunities reroute the schedule.
- **Hour to hour** — 30 challenges (assassinations, mastery, diabolical, feats, collectibles), a challenge multiplier up to 3×, rifle XP levels that unlock zoom, magazine, fizz rounds, sugar bombs and more.

## Run locally

Any static server works:

```
npx http-server -p 5177 -c-1
```

No build step. Plain HTML/CSS/JS in `index.html`, `style.css`, `js/`.
