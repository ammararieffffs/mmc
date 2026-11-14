# MMC — MSU Music Club website (v3: Stompbox × Jam Room)

A static website for MSU Music Club, built with plain HTML, CSS and vanilla
JavaScript. There is no framework, no npm install and no build step. Upload the
folder to GitHub Pages or any static host.

**The idea:** a persistent 3D rehearsal room sits behind the whole site. As you
scroll normally, the camera moves through the room. MMC's seven hand-built
effects pedals each switch on as you reach their chapter, and each one changes
the room: the lighting, the camera, post-effects, or a whole space (the
archive). Nothing requires clicking pedals. They're an extra way in, alongside
normal scrolling, the dock and a plain menu.

| Chapter | Pedal | What happens in the room | Content (brief section) |
|---|---|---|---|
| Intro | — | Wide shot of the room, stage lights on | 01 The Opening Act |
| About | FUZZ | Close on the board, photocopy-grain effect | 02 More Than Music |
| Sound | CHORUS | Camera visits six instruments, each playable | 03 Find Your Sound |
| Activities | ECHO | Activity flyer wall with echo trails, setlist on the monitor | 04 Experience + 05 On the Radar |
| Process | LOOPER | Follows the cable from guitar to amp; work lights switch to show lights | 06 Behind the Sound |
| People | TUNER | Top-down on the board; the tuner shows the department you're reading | 07 Committee |
| Archive | ROOM | The room goes dark and real MMC photos float in reverb space | 08 Archive + 09 Member Spotlight |
| Join | BOOST | The empty taped slot on the board: "YOUR SOUND" | 10 Numbers + 11 Join |

---

## ⚠️ Fill in before launch

Search `index.html` for **`TODO(MMC)`**. Each unfinished item also has a
`data-todo="…"` attribute, which draws a dashed yellow **TO FILL / TO CONFIRM**
tag on the page. Delete the attribute once the item is done. The browser
console lists anything still open.

| What | Where |
|---|---|
| Membership steps, eligibility, fee, recruitment status | `#join-details` block |
| Sign-up link | the big **Join MMC** button (`href="#join-details"`) |
| Email, Instagram, TikTok | footer `#contact` block |
| Which activities MMC currently runs | `#experience` list |
| Committee roster (current session, full names, photos) | `#people` (names are the nicknames from the previous MMC site) |
| Verified figures (members, committee, events, performances, years) | `#join` plate (shows "Awaiting verification") |
| Events | `#radar` (copy the commented template; the empty state shows until then) |
| Backstage and Sessions photos | `js/main.js` `PHOTOS` and `js/world/world.js` `photos` |

No events, members, statistics, quotes or contact details have been invented.

---

## Files

```
index.html               all content (fully readable without JavaScript or WebGL)
css/style.css            design system, panels, dock, chapters
css/responsive.css       tablet + phone layouts
js/signal.js             120 BPM beat clock + in-browser synth voices (sound is opt-in)
js/main.js               menu, navigation + history, dock, play buttons, tuner, archive, lightbox
js/animations.js         GSAP + ScrollTrigger + SplitText reveals, Lenis smooth scroll (desktop)
js/world/world.js        Three.js entry: renderer, lights, post FX, camera shots, interactions
js/world/materials.js    PBR materials + procedural canvas textures
js/world/gear.js         guitar/bass, stands, amp head, 4x12 cab, bass combo, mic + boom, monitor, synth, mixer, stool
js/world/drums.js        five-piece kit with hardware and cymbals
js/world/pedals.js       seven MMC pedals, tuner screen, looper ring, board, cables, STORY pedal, empty slot
js/world/room.js         walls, floor, foam, ceiling, light rig + haze beams, shutter, posters, flyers, archive field
assets/textures/         CC0 PBR textures (WebP)
assets/images/           photos (800 + 1600 px WebP), logo, room still (no-WebGL fallback), OG image
```

### Editing the 3D camera
Each chapter's camera is set in `SHOTS` at the top of `js/world/world.js`.
`pos` is where the camera is, `look` is what it points at, and `state` sets the
lighting and effects. A shot is tied to any element with `data-shot="name"` in
the HTML. To preview one shot on its own, open `index.html?shot=fuzz` (or any
shot name). `?q=low|mid|high` forces a quality tier.

## Run locally

ES modules need a server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly still shows
every word of content over the rendered still image, but without the live room.

## Deploy (GitHub Pages)

Push the folder contents to a repo, then go to Settings → Pages → Deploy from
branch → `main` / root. All paths are relative.

---

## 3D assets and licensing

- **Every instrument and piece of gear is modelled in code** (procedural Three.js
  geometry with PBR materials). The designs are original, with no trademarked
  body shapes, headstocks or logos. There are no GLB/GLTF downloads.
- **Textures:** concrete floor, painted brick, metal shutter, carpet, leather and
  plywood from [Poly Haven](https://polyhaven.com), licensed **CC0** (public
  domain). They were converted to WebP and downsized.
- **Lighting:** no HDRI download. A generated `RoomEnvironment` plus real-time
  area, spot and point lights.
- **Fonts (Google Fonts, OFL):** Special Gothic Expanded One, Instrument Serif,
  IBM Plex Mono, Familjen Grotesk.
- **Sound:** synthesised in the browser with WebAudio. No samples and nothing
  to license. It plays only after the visitor turns sound on.
- **Photos:** MSU Music Club.

## Performance and fallbacks

- **Quality tiers:** phones and touch devices get the `low` tier (no shadows,
  no MSAA, no feedback trails, fewer foam instances, DPR ≤ 1.25). Desktop gets
  `high`, and drops a level automatically if frames are slow.
- **Draw calls:** static geometry is merged by material. That's about 650 draw
  calls on desktop (including the shadow pass) and about 240 on phones.
- **No WebGL 2, or the context is lost:** a rendered still of the room
  replaces the canvas, and all content stays.
- **`prefers-reduced-motion`:** no smooth scroll, no intro sequence, no ticker
  animation. The camera jumps between shots and renders only on scroll.
- **Background tabs:** rendering stops, and sound pauses when the tab is hidden.

## Tested (Playwright + Chromium, software WebGL)

Desktop at 1440×900 and an emulated iPhone 13, through every camera shot:
no console errors, no failed requests, no horizontal overflow. Interactions
checked: 3D picking (kick, toms), play buttons, the sound-off toast, sound and
loop toggles, tuner following the departments, archive filters and empty
state, lightbox keyboard controls, dock navigation (hash, focus, back button)
and the menu. Reduced motion, no-WebGL fallback, and axe-core (WCAG 2 A/AA +
best practice: 0 violations).

Not testable here: real-GPU frame rates (the test browser renders on the
CPU), audio output, and real iOS Safari or Android devices.
