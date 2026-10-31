# SEVENTEEN fan site ◆

An aesthetic, unofficial fan site for SEVENTEEN and CARATs.

- **frontend/**: React + Vite + TypeScript
- **backend/**: Python Django + Django REST Framework (SQLite)

## Features (v1)

- **Era themes**: every album has its own palette, heading font and background pattern. Opening an album page restyles the whole site, and you can click "Wear this era site-wide" to keep it (saved in the browser).
- **Member themes**: each member's profile page switches to their colour.
- **Members**: flip cards grouped by unit, plus profile pages with a birthday countdown and fun facts.
- **Discography timeline**: 26 releases (22 Korean, 4 Japanese), from *17 Carat* (2015) to *Happy Burstday* (2025), each with its full tracklist (261 tracks), including discs, Korean/Japanese titles and unit/solo credits.
- **Music page** (`/music`): every album with its tracks, split into Korean and Japanese releases, with "Play all title tracks", shuffle, and play-album buttons. 208 of the 261 tracks come with an official MV or official audio link (SEVENTEEN / HYBE LABELS / SEVENTEEN Japan / "SEVENTEEN - Topic" on YouTube). The rest show "no link".
- **Now Playing page** (`/now-playing`): clicking any song opens a full-screen, audio-only player: album art with a vinyl record that slides out and spins, script title, animated waveform, shuffle / repeat / seek, up-next list. Space = play/pause, Esc = close. "Show video" brings the video back.
- **Mini music player**: an audio bar that keeps playing while you move between pages; tap it to reopen Now Playing.
- **Games**: Memory Match, Unit Sorter, Guess the Member, each with a CARAT leaderboard stored in Django.
- **Diary** (`/diary`): a scrapbook journal shown as a 3D book. Spreads fan out on both sides and turn with a page-flip; you can also browse by month in a grid, search words, dates and members, or jump to a date. Each spread has a date and holds photos (dropped, pasted or uploaded; PNG cut-outs keep their shape), member photos, stickers (words, emoji, washi tape, doodles), handwritten notes and songs. A song is any SEVENTEEN track on the site or any YouTube / Spotify link, shown as a card, a spinning vinyl or a cassette; ▶ plays it through the site's player, and "Play page songs" plays them all. Drag to move, use the corner handle to resize and the top handle to rotate; undo with Ctrl+Z. Every signed-in account can add pages (no extra sign-in) and edit, hide or delete the ones it wrote; each page shows who wrote it. Private pages are seen only by their writer and admins. Admins can edit or delete any page.
- **Photo albums** (`/memories`, "Memories" in the nav): the same 3D book as the diary, kept for SEVENTEEN memories only, with bigger spreads. Album pages have no dates (they keep the order they were made in, with an optional name such as "Attacca fan meeting"). Each page holds photos (uploaded, dropped or pasted), member photos, songs and videos: upload MP4 / WebM / MOV clips up to 100 MB, or add a YouTube link. Pages show a still with ▶, and the video plays full screen (the site's music pauses). Photos and videos can wear any frame: sticker, polaroid, taped, round, heart, arch, postage stamp, film strip, gold frame, torn paper or plain. New pages start on black album paper (linen and the diary's papers are there too). Everyone can look; only admins (Studio accounts) can add, edit or delete pages, and viewers don't see those buttons at all.
- **Home**: days since debut, anniversary countdown, next member birthday, member of the day.
- **Small touches**: sparkle cursor trail and glassy cards. It works on phones and respects "reduce motion".

## Run it (Windows)

You need **Python 3.10+** and **Node 18+**. Use two terminals.

### 1. Backend (terminal 1)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_svt          # loads the 13 members, 26 albums and 261 tracks
python manage.py createsuperuser   # for the admin panel
python manage.py runserver
```

- API: http://127.0.0.1:8000/api/
- Admin: http://127.0.0.1:8000/admin/

### 2. Frontend (terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` and `/media` to Django, so both must be running.

## The Seventeenth Heaven theme

A photo theme built from the Seventeenth Heaven era: night sky, floating smiley daisies, neon-yellow marker lettering, pink sparkles, tracklists styled like the album receipt, polaroid photos beside page titles, the headphones planet behind Now Playing and the white-grass field in the footer. Photos and drawings live in `frontend/public/themes/heaven/`, the styles in `frontend/src/themes/heaven.css`.

It is the site theme right now, and the Seventeenth Heaven era wears it too. To switch: Studio, then Themes management, then "Start from a look": pick **Seventeenth Heaven** or **Rose Quartz & Serenity** (the original), or set **Photo skin** on any theme. Swap a photo by replacing the file with one of the same name.

## The Left & Right theme

A photo theme from the Heng:garæ era (*Left & Right*, 2020): summer sky, white road signs with black arrows, a traffic light on the edge of the page that cycles red, green and yellow, the poster's red italic capitals with a two-way arrow, cards and the nav styled as road signs, yellow warning-sign chips, tracklists as a green highway sign, the group on the brick wall on the home page (with the waving "#GO RIGHT" foam hand), photos on sign posts beside page titles, the graffiti wall at night on sign-in, the crane-and-car poster behind Now Playing and the boys looking up at the signs in the footer. Photos and drawings live in `frontend/public/themes/leftright/`, the styles in `frontend/src/themes/leftright.css`. The Heng:garæ era wears it; to use it everywhere, pick **⇄ Left & Right** under Studio → Themes management → "Start from a look" (or set **Photo skin** on any theme). Its background pattern, **signs**, also works with any other theme.

## The World theme

A photo theme from the Sector 17 era (*_World*, 2022), built on the CARAT Flower Market street from the music video: royal-blue shop fronts and white plaster, the lit shop sign for the nav and buttons, the round "CARAT flower market" badge swinging in the corner, cards trimmed in door blue, the shopfront at dusk on the home page, photos in blue window frames with a hanging OPEN sign beside page titles, tracklists styled as the door's opening-hours board, the Daily Grind café door on sign-in, the neon Sector 17 night behind Now Playing and the flower buckets in the footer. Photos and drawings live in `frontend/public/themes/world/`, the styles in `frontend/src/themes/world.css`. The Sector 17 era wears it; to use it everywhere, pick **❀ World** under Studio → Themes management → "Start from a look" (or set **Photo skin** on any theme). Its background pattern, **flowers**, also works with any other theme.

## The Rock with you theme

A photo theme from the Attacca era (*Rock with You*, 2021): a dark stage lit hot pink, white LED strips under the nav, glowing italic serif headings on an orbit ring, the lyric card's orbits and four-point sparkles (one big orbit turns slowly behind every page), the silhouettes in front of the ROCK WITH YOU curtain on the home page, photos on lyric cards beside page titles, tracklists as the "I wanna stay with you" lyric card with its wireframe heart, the ATTACCA crossing signal on sign-in, the red-lit curtain behind Now Playing and the rooftop group photo in the footer. Photos and drawings live in `frontend/public/themes/attacca/`, the styles in `frontend/src/themes/attacca.css`. The Attacca era wears it; to use it everywhere, pick **✦ Rock with you** under Studio → Themes management → "Start from a look". Its background pattern, **orbits**, also works with any other theme.

## The Hot theme

A photo theme from the Face the Sun era (*Hot*, 2022): the desert night in black and blazing orange, a neon flame sun with its windmill turning at the edge of the page, headings in yellow scribbled marker like "FACE THE SUN" on the wall, ember-edged cards, a slideshow of MV stills behind the home page (the stage skyline, the X silhouette, the desert at night, the gold bullet, the skeleton on the rail and the cracked mirror) with the spinning Sun of Fate coin, film frames beside page titles, tracklists as the phone's now-playing card, FACE THE SUN on sign-in, the neon sun behind Now Playing and the skyline in the footer. Photos and drawings live in `frontend/public/themes/hot/` (exported at high quality, smaller sources enlarged to 1600px), the styles in `frontend/src/themes/hot.css`. Drop a photo named `sun-sign.jpg` in that folder and it takes over the Now Playing background. The Face the Sun era wears it; to use it everywhere, pick **☀ Hot** under Studio → Themes management → "Start from a look" (or set **Photo skin** on any theme). Its background pattern, **suns**, also works with any other theme.

## The Home;Run theme

A photo theme from the ; [Semicolon] era (*Home;Run*, 2020): a smoky pool hall in dark brown, copper script headings with a semicolon flourish, a row of marquee bulbs under the nav, billiard balls and a diamond in the background (one ball rolls along the bottom), the "Forever DIAMOND" marquee under fireworks on the home page with the vintage "Admit one CARAT" ticket, newspaper clippings with a "Where is the missing diamond?" stamp beside page titles, tracklists printed as the Weekly Diamond News, the train corridor on sign-in, the boys leaning over the blue pool table behind Now Playing and the riverboat deck in the footer. Photos and drawings live in `frontend/public/themes/homerun/`, the styles in `frontend/src/themes/homerun.css`. The ; [Semicolon] era wears it; to use it everywhere, pick **; Home;Run** under Studio → Themes management → "Start from a look". Its background pattern, **billiards**, also works with any other theme.

## The Maestro theme

A photo theme from the 17 Is Right Here era (*Maestro*, 2024): a black concert stage under one white spotlight, headings in concert-hall serif with a conductor's baton beneath them, a baton keeping 4/4 time at the edge of the page, staff lines and laser-red notes in the background, matte black cards lit from above, the wall of instruments on the home page, concert stills beside page titles (the red circle of suits, the robot hand, the cello, the orchestra from above) with a red MAESTRO tab, tracklists as a page of the score, the laser violin on sign-in, the piano on the rooftop behind Now Playing and the orchestra in the footer. Photos and drawings live in `frontend/public/themes/maestro/` (exported at high quality, smaller sources enlarged to 1600px), the styles in `frontend/src/themes/maestro.css`. The 17 Is Right Here era wears it; to use it everywhere, pick **♪ Maestro** under Studio → Themes management → "Start from a look" (or set **Photo skin** on any theme), or wear it from **Themes** in the viewer dashboard. Its background pattern, **staves**, also works with any other theme.

## The Aju Nice theme

A photo theme from the *Very Nice* era (Love & Letter Repackage, 2016): a pale summer-sky background, big rounded turquoise headings with an orange shadow and a striped underline like the school walls, cream cards with turquoise stripes, orange buttons, yellow bleacher-seat chips, basketballs and blossom petals in the background (one ball bounces on the right edge), the school yard under the clouds on the home page with a bobbing "AJU NICE!" badge, pinned photos with a basketball beside page titles, tracklists as the class notice board ("Very Nice ♡ 아주 NICE!"), the jump into the blue sky on sign-in, the peach sunset by the orange piano behind Now Playing and the striped school building in the footer. Photos and drawings live in `frontend/public/themes/ajunice/`, the styles in `frontend/src/themes/ajunice.css`. The Love & Letter Repackage era wears it; to use it everywhere, pick **🏀 Aju Nice** under Studio → Themes management → "Start from a look". Its background pattern, **hoops**, also works with any other theme.

## The S.Coups aesthetics theme

A photo theme from S.Coups's own camera roll: warm charcoal and cream with film grain, light leaks and a film strip down both edges, a viewfinder framing the page, headings in italic serif with an amber point-and-shoot date stamp beneath them, a photo-dump slideshow on the home page (Milan at night, Shibuya in the sun, the snowy street, the yellow tram, the Hasselblad mirror selfie, dinner, the supermarket run) with the date burned into the corner, instant prints with pen captions beside page titles, tracklists as a strip of negatives, the tapestry and glasses on sign-in, the tram behind Now Playing and the crosswalk smile in the footer. Photos and drawings live in `frontend/public/themes/scoups/`, the styles in `frontend/src/themes/scoups.css`. It isn't tied to an era: pick **📷 S.Coups aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **film**, also works with any other theme.

## The Jeonghan Aesthetics theme

A member theme made from quiet film photos of Jeonghan: soft grain over charcoal blue, lowercase italic serif headings with a scrap of torn tape, beige-plaid buttons and dusty-sky accents, white butterflies drifting up the page, two taped prints either side of the home-page title (the river in the sun, Budapest at night), tall prints captioned "yoon" beside page titles, tracklists as the black collage with rounded strips and a butterfly, the collage itself on sign-in, Budapest at night behind Now Playing and the dusty sky in the footer. Photos and drawings live in `frontend/public/themes/jeonghan/`, the styles in `frontend/src/themes/jeonghan.css`. It isn't tied to an era: pick **🦋 Jeonghan Aesthetics** under Studio → Themes management → "Start from a look". Its background pattern, **butterflies**, also works with any other theme.

## The Joshua Aesthetics theme

A light photo theme from Joshua's own photos: cream and white with sage and latte, clean sans-serif type, guitar picks and strings scattered in the background (one pick drifting down the page), white paper cards and black pill buttons, a slow slideshow on the home page (the white studio, the Paris café, the peace sign on the sofa, the smile at night, the grocery run) with a handwritten "Joshua · 지수 ♡", prints pinned with a guitar pick beside page titles, tracklists as a handwritten setlist under six guitar strings, the white studio on sign-in, the guitar on the rooftop behind Now Playing and the city lights from the lookout in the footer. Photos and drawings live in `frontend/public/themes/joshua/`, the styles in `frontend/src/themes/joshua.css`. It isn't tied to an era: pick **🎸 Joshua Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **picks**, also works with any other theme.

## The Jun Aesthetics theme

A light photo theme from Jun's photos, a walk through the seasons: stone grey and cream with sea-mist blue and ginkgo gold, italic serif headings with a ginkgo leaf at the end of a fine line, clear umbrellas, rain, ginkgo leaves and cherry petals in the background (one ginkgo leaf falling down the page), cream paper cards and slate buttons, a slow slideshow on the home page (the sea, the cherry blossoms, the sunlit stone wall, the clear umbrella in the rain, the white shirt) with a handwritten "Jun · 준휘 ☂", white-bordered prints with a ginkgo leaf caught on the corner beside page titles, tracklists as a rainy-walk playlist, the sea on sign-in, hood up on the sofa behind Now Playing and the ginkgo leaves under the streetlight in the footer. Photos and drawings live in `frontend/public/themes/jun/`, the styles in `frontend/src/themes/jun.css`. It isn't tied to an era: pick **☂ Jun Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **umbrellas**, also works with any other theme.

## The DK Aesthetics theme

A light photo theme from DK's photos, hung like a black-and-white photo show: gallery white and ink black with denim blue (the cap, the denim shirt, the beanie, the summer sky) and a warm tortoiseshell brown from his round glasses. Bold sans-serif headings sit over a focus bracket, and white roses, camera apertures and viewfinder brackets are scattered in the background (one aperture slowly turning). Cards are white with thin ink rules, buttons are black. The home page runs a slow slideshow (the camera on the beach, the summer park, the mirror selfie, the smile in glasses, the rose at night) in black and white that develops into colour when you hover, with a handwritten "DK · 도겸 ❀". Beside page titles hang framed, matted prints, each with a museum wall label underneath. Tracklists become the exhibition checklist. Sign-in shows the reflection with the white orchids, Now Playing sits in front of the dark hotel-mirror portrait, and the footer is lit by the warm streetlight at night. Photos and drawings live in `frontend/public/themes/dk/`, the styles in `frontend/src/themes/dk.css`. It isn't tied to an era: pick **🌹 DK Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **roses**, also works with any other theme.

## The Woozi Aesthetics theme

A dark photo theme from Woozi's photos, the producer's booth and the encore: stage black with confetti pink and stage-light blue. Bold sans-serif headings sit over a pink waveform, small labels light up with a red "●" like a recording light, and pink confetti, petals, a blue butterfly bow and the sparkly red mic are scattered in the background (petals drift down both edges of the page). Cards are black like his stage tees, buttons are confetti pink. The home page is the encore, with confetti falling over the title and a pink "prod. WOOZI · 우지" credit in the corner. Beside page titles sit prints tagged like song credits (the black-and-white spotlight, the pout in the green studio, arms crossed on stage, the smile in the grey hoodie). Tracklists become a recording session ("● REC session_woozi_final_FINAL.wav"). Sign-in shows the flash film photo in his glasses, Now Playing sits in front of the crouching smile at the stage edge, and the footer walks into the spotlight. Photos and drawings live in `frontend/public/themes/woozi/`, the styles in `frontend/src/themes/woozi.css`. It isn't tied to an era: pick **🎙 Woozi Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **confetti**, also works with any other theme.

## The The8 Aesthetics theme

A light photo theme from The8's photos, hung like a painter's gallery: gallery-white walls with afternoon sun across them, charcoal ink, olive and the sky blue of his butterfly T-shirt, quiet lowercase headings with an ink brush stroke beneath them, ink-brush circles, brush strokes, round glasses and the spiral butterfly in the background (the butterfly drifts across the page), square white cards and black buttons, a framed slideshow on the home page (the sea from the boat, the garden in the butterfly T-shirt, glasses and the cream cardigan, coffee by the window, the black coat on the sofa) signed "the8 · 明浩", black-framed photos with a museum label beside page titles, tracklists as a "works on view" list, the sunlit wall on sign-in, the sofa behind Now Playing and the sea in the footer. Photos and drawings live in `frontend/public/themes/the8/`, the styles in `frontend/src/themes/the8.css`. It isn't tied to an era: pick **✎ The8 Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **ink**, also works with any other theme.

## The Wonwoo Aesthetics theme

A dark photo theme from Wonwoo's photos, a quiet reading room at night: graphite and paper cream with sage and dusty mauve taken from the flowers beside the white shirt. Serif headings sit on a fine sage line that ends in a bookmark, and open books, black square glasses and flower sprigs are scattered in the background (a bookmark ribbon sways from the top of the page). Cards are graphite with a thin cream edge, buttons are cream. The home page runs a slideshow (the face in the rushing crowd, the white shirt, leaning back on the sofa, the smile in glasses) where each photo blurs and then comes into focus, with a handwritten "Wonwoo · 원우 ✎". Beside page titles, cream-bordered photos are tucked between the pages with a mauve bookmark ribbon. Tracklists become a typed library card ("Reading list · due back soon"). Sign-in shows the white shirt and the flowers, Now Playing sits in front of the black-and-white sofa portrait, and the footer is the crowd rushing past. Photos and drawings live in `frontend/public/themes/wonwoo/`, the styles in `frontend/src/themes/wonwoo.css`. It isn't tied to an era: pick **📚 Wonwoo Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **books**, also works with any other theme.

## The Dino Aesthetics theme

A member theme made from Dino's photos: soft grain over matte black, bold uppercase headings with a red-orange-and-green stripe (his sleeve and the hoodie), amber café glow, little dino footprints walking up the page and a small green dino that peeks up from the bottom corner, the black-and-white window seat on the home page, black-and-white prints beside page titles that warm into colour when you hover, tracklists as a café menu board signed "Chan's pick ♡", snow under the streetlights on sign-in, the warm café behind Now Playing and the diner under the hanging bulbs in the footer. Photos and drawings live in `frontend/public/themes/dino/`, the styles in `frontend/src/themes/dino.css`. It isn't tied to an era: pick **🦖 Dino Aesthetics** under Studio → Themes management → "Start from a look". Its background pattern, **footprints**, also works with any other theme.

## The Seungkwan Aesthetics theme

A dark photo theme from Seungkwan's photos, a night walk over the bridges: midnight navy with the mint of the green bridge at night and Jeju-tangerine orange, city lights blurred at the edges of the page, a suspension bridge drawn under every heading, tangerines, earbuds and soft bokeh lights in the background (one tangerine bobbing like a lantern on the water), navy-glass cards and tangerine buttons, a slow slideshow on the home page (the green bridge at night, the river by day, the willow, the winter lights, the cap and earbuds) with a handwritten "Seungkwan · 승관 ♪", postcards from the walk with a tangerine "BOO" stamp beside page titles, tracklists as what's on repeat in his earbuds tonight, the willow on sign-in, the late-night café behind Now Playing and the river at night with city lights across the water in the footer. Photos and drawings live in `frontend/public/themes/seungkwan/`, the styles in `frontend/src/themes/seungkwan.css`. It isn't tied to an era: pick **🍊 Seungkwan Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **tangerines**, also works with any other theme.

## The Vernon Aesthetics theme

A light photo theme from Vernon's photos, a summer afternoon: pale sky and white with sky blue from his shirts and hoodie and lemon yellow from the lemon in his hand and the wall of yellow mums. Bold sans-serif headings are underlined with the navy-and-orange stripes of his knit tie, and lemons, pompom mums, gold wire glasses and clouds are scattered in the background (one cloud drifting slowly across the top). Cards are white with a soft sky-blue edge, buttons are sky blue. The home page runs a slow slideshow (the hills and the white fence, the lemon and the blue hoodie, the knit tie on stage, the yellow mums, the blue jacket on film, the cap at practice), each photo drifting a little closer, with a handwritten "Vernon · 한솔 🍋". Beside page titles hang white-bordered snapshots with a lemon sticker on the corner. Tracklists become a mixtape J-card ("side A · hansol's mix") striped like the tie. Sign-in shows the wall of yellow mums, Now Playing sits in front of the blue jacket against the steel wall, and the footer is the hills, the grass and the white fence. Photos and drawings live in `frontend/public/themes/vernon/`, the styles in `frontend/src/themes/vernon.css`. It isn't tied to an era: pick **🍋 Vernon Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **lemons**, also works with any other theme.

## The Hoshi Aesthetics theme

A dark photo theme from Hoshi's photos, the tiger in the pines: deep forest green with tiger orange and leaf green, bold display type, headings with a striped tiger-tape underline, tiger stripes, pine branches and paw prints in the background (a trail of paw prints walks up the side of the page), deep-green cards and orange buttons, a slideshow on the home page (the park in summer, the willow by the Han River, the palace pines, the pine at night, the boat at night) with a nodding "호랑해 🐯" badge, photos in a striped frame with a paw-print stamp beside page titles, tracklists as a "5, 6, 7, 8 →" dance-practice cue sheet, the pine under the streetlight on sign-in, the boat at night behind Now Playing and the willow by the river in the footer. Photos and drawings live in `frontend/public/themes/hoshi/`, the styles in `frontend/src/themes/hoshi.css`. It isn't tied to an era: pick **🐯 Hoshi Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **tiger**, also works with any other theme.

## The Mingyu Aesthetics theme

A light photo theme from Mingyu's photos, summer and a little out of focus: cream film paper with grass and vine green and the deep blue of the Capri sea. Italic serif headings sit on a fine green line that starts with a leaf, and leaves, sprigs and a little puppy are scattered in the background (one leaf blows across the page). Cards are linen white, buttons are grass green. The home page runs a slideshow (the bicycle on the country road, sitting on the grass, the vines and the cup, the boat at Capri) where each photo arrives blurry, sharpens, then blurs away, with a handwritten "mingyu ♡ 민규". Beside page titles hang white-bordered snapshots with handwritten captions. Tracklists become a "summer playlist ♡ mingyu" with the puppy in the corner. Sign-in shows the blurry mirror selfie, Now Playing sits out on the Capri sea, and the footer is the grass field. Photos and drawings live in `frontend/public/themes/mingyu/`, the styles in `frontend/src/themes/mingyu.css`. It isn't tied to an era: pick **🌿 Mingyu Aesthetics** under Studio → Themes management → "Start from a look", set it as the **Photo skin** on any theme, or wear it from **Themes** in the viewer dashboard. Its background pattern, **leaves**, also works with any other theme.

## For CARATs: calendar, units, the story, photocards, letters and fanchants

Everything here is for signed-in viewers (under **More** in the nav, and on the viewer dashboard).

- **Calendar** (`/calendar`): every member's birthday, the debut anniversary (26 May) and the comebacks, concerts, fan meetings and broadcasts admins add in **Studio → Calendar**. Pick a day to see what's on; "Add to my calendar" downloads the year as an `.ics` file. The next date counts down to the second on the landing page and the viewer dashboard.
- **Birthday themes**: on a member's birthday the whole site wears that member's theme for the day, with a ribbon under the nav. Fans can go back to their usual theme for the day; admins switch the feature off in Studio → Calendar. DK and Vernon share 18 February, so DK has the morning and Vernon the afternoon. Open `/me?birthday=<slug>` to preview a member's day (`/me?birthday=` stops the preview).
- **Units** (`/units`, `/units/<slug>`): the Hip-hop, Vocal and Performance teams, plus SVT Leaders, BSS, Jeonghan × Wonwoo, Hoshi × Woozi and S.Coups × Mingyu. Each page lists the members, the songs credited to exactly that line-up (read from each song's note) and the albums they're on. The unit list lives in `frontend/src/fan/units.ts`.
- **The story** (`/timeline`): debut to today on one line, every era plus enlistments and homecomings (from members' service dates) and past concerts. Pointing at an era previews its theme across the whole site; "Wear it" keeps it.
- **Photocard binder** (`/binder`): admins upload cards in **Studio → Photocards** (drop several photos at once; pick the member, era and rarity). Every viewer opens one pack of 3 cards a day. Rare cards come up 4× less often than common ones, special cards 10× less. Duplicates are counted, and missing pockets show what's still to find.
- **Letters** (`/letters`): write to one member or to all thirteen, on one of six papers. A viewer's letter waits in **Studio → Letters** until an admin posts it, and then every CARAT can open it from that member's mailbox. Letters admins write are posted straight away. A viewer can have 5 letters waiting at once.
- **Fanchant guide & concert mode** (every song page): admins add the lyrics on the song page. `[square brackets]` mark what CARATs chant and `# Chorus` names a part. **Concert mode** turns the screen into a glowing CARAT bong in the era's colours (steady, pulse, wave, Rose Quartz & Serenity, or the 13 member colours), with the fanchant one line at a time: tap, press space or use the arrow keys. Colours never flash faster than once a second.
- **Diary extras**: "On this day" shows pages written on today's date in earlier years. **More → Save as image** downloads the open page as a PNG (1600 × 1200).

## Accounts: viewers and admins

The site has three separate areas:

| Area | Who | What's there |
|---|---|---|
| **Landing page** (`/`) | Everyone, signed out | A welcome, who SEVENTEEN are (units, debut, CARAT), stat cards, the 13 members by unit, the latest eras, recent title tracks, and **Log in** / **Sign up** buttons. Games, the diary, memories, music, themes and the full member and era pages are locked here. |
| **Viewer dashboard** (`/me` and its sections) | Any signed-in account | Dashboard, Members, Eras, Music (and Now Playing), Themes (wear any era site-wide), Games, Diary and Memories. Signed-out visitors who open one of these are sent to sign in and brought back afterwards, `?page=` and all. |
| **Admin dashboard** (`/studio`) | Admins | All the management: members, music, album management, themes, users and games. Admins can use the viewer dashboard too (diary and memories pages are edited there). |

Each area says which one it is: the viewer dashboard has a **Viewer dashboard** label beside the logo, and the admin dashboard has its own sidebar layout ("SVT Admin"). Signed in, `/` takes you to your own dashboard (admin or viewer), not the landing page. To see the landing page as visitors do, use **Landing page ↗** in the admin sidebar or open `/?preview=landing`; it shows under a "Previewing the landing page" banner with a button back. The only way into the admin dashboard is the **Admin dashboard** button, which only admins see.

**One theme everywhere:** the theme a viewer wears (Themes page, or an album's "Wear this era" button) is used on every page, landing page included; with none chosen, every page uses the site theme from the Studio. Member, album and song pages no longer swap it for their own colours; they only tint their own header.

The API enforces the same split: members, albums, songs and the site settings are public (the landing page needs them); diary and photo album pages and game scores need a signed-in account; viewers add diary pages and change their own, and every other change is admin-only.

| Role | How you get it | What you get |
|---|---|---|
| **Viewer** (fan) | Sign up at **/register** | A personal dashboard at **/me**: your playlist (tap ♥ on any song), your bias (their colour tints your welcome card, with a birthday countdown), your saved game scores, and account settings (name, password) |
| **Admin** | `python manage.py seed_admin` (prints a generated password; or pass `--username` / `--password`), `python manage.py createsuperuser`, or an admin switches you on in Studio → Fans | Everything a viewer has, plus the **Studio** at **/studio** to edit the whole site and manage accounts |

Everyone signs in at **/login** (or **Log in** on the landing page): admins land in the admin dashboard, viewers in the viewer dashboard. Nobody can make themselves an admin; only an admin can, from Studio → Fans (where you can also switch an account off).

## The admin dashboard (Studio)

Open **http://localhost:5173/studio** (or sign in at /login with an admin account).

| Section | What you can do |
|---|---|
| Overview | Shortcuts to every section, community stats (viewers, admins, sign-ups, game plays, hearts) and a to-do list |
| Members | Drag in a photo; edit name, birthday, unit, colour, emoji, tagline and fun facts |
| Music management | Albums: covers, details, new comebacks, deleting; every song's title, disc, title-track star and YouTube / Spotify link, with a preview |
| Album management | The Memories photo album pages: add a page, put them in order (drag, arrows, or move to the start or end), rename, hide from visitors, duplicate, delete; photo, video and page counts |
| Themes management | The site theme and home-page words; a gallery of every era theme to edit; all 13 member colours side by side |
| User management | Add accounts (viewer or admin), switch roles, reset a password (shown once), switch an account off, delete it |
| Games management | Plays, players, top and average score per game; pause or resume a game; remove single scores; clear a leaderboard for a new season |

Visitors and viewers can only read; every change needs an admin account. Django's own admin (http://127.0.0.1:8000/admin/) still works too.

Changes show up for everyone without a reload, whether they're made in the Studio, Django admin or `import_images`: other tabs in the same browser update straight away, and other browsers and devices within about 20 seconds (sooner when the tab is brought back into view). Every uploaded picture gets a fresh file name, so nobody keeps seeing an old cached cover.

## Making it yours (through Django admin)

| What | Where |
|---|---|
| Member photos | Admin → Members → upload **Photo** (otherwise the card shows the member's emoji) |
| Lots of images at once | Put files in `backend/images/members/` and `backend/images/albums/`, named after the member or album (`hoshi.jpg`, `The8.png`, `fml.jpg`, `Face the Sun.webp`), then run `python manage.py import_images`. `--list` shows every name it recognises. |
| Album covers | Admin → Albums → **Cover** |
| Make songs play | Most songs already play their official MV or audio. For songs marked "no link": Admin → Albums → pick an album → in **Songs**, paste the YouTube or Spotify track link. Songs with no link play SEVENTEEN's Spotify artist page. |
| Play a whole album | Admin → Albums → pick an album → paste its Spotify album link in **Spotify url**. A "Full album on Spotify" button appears on the Music and album pages. |
| More tracks | Same place: add rows to the Songs table (disc, track number, Korean/Japanese title, unit note) |
| New comeback | Admin → Albums → Add, and set the `theme` JSON (copy one from another album) |

Theme JSON example:

```json
{"bg": "#0B0F24", "surface": "#141A3A", "text": "#EAF0FF", "accent": "#FFD400",
 "accent2": "#6AA8FF", "font": "display", "pattern": "stars", "dark": true}
```

`font`: `serif | sans | display | mono` · `pattern`: `sparkle | grid | waves | stars | petals | none`

Starter data lives in `backend/fandom/seed/*.json`; `albums.json` holds every album with its `tracks` list. Tracklists follow each release's English Wikipedia article (Oct 2026); the order of the new tracks on *Director's Cut* and *Sector 17* is inferred. Running `seed_svt` again updates members and albums, and keeps the song links you added in admin. The member colours and emoji are design choices for this site, not official ones. Double-check facts and edit freely.

## API

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/members/` | `?unit=hiphop\|vocal\|performance` |
| GET | `/api/members/<slug>/` | e.g. `hoshi` |
| GET | `/api/albums/` | ordered by release date |
| GET | `/api/albums/<slug>/` | includes `songs` |
| GET | `/api/songs/` | `?title_tracks=1` |
| GET | `/api/scores/?game=memory` | signed in; top 10 (`memory`, `unit_sort`, `guess`) |
| POST | `/api/scores/` | signed in; `{"game": "memory", "player": "name", "score": 1200}` |
| GET | `/api/version/` | a stamp that changes whenever members, albums, songs or site settings change; open pages watch it to refresh |
| GET | `/api/diary/` | signed in; diary pages, oldest first, each with `author_name` and `can_edit` (private pages only for their writer and staff) |
| POST/PATCH/DELETE | `/api/diary/` · `/api/diary/<id>/` | signed in: anyone adds a diary page (it's theirs) and changes their own; staff change any page and add photo album pages; `items` are validated |
| POST | `/api/diary/<id>/photos/` | whoever can change that page; multipart `image`, for placing on it |
| GET | `/api/diary/?book=album` | the photo albums' pages, undated (the diary is `book=diary`, the default, and its pages need a `date`) |
| POST | `/api/diary/reorder/` | staff only; `{"ids": [...]}` with every photo album page id once, in the new order (new pages go last) |
| POST | `/api/diary/<id>/videos/` | whoever can change that page; multipart `file` (MP4, WebM, MOV up to 100 MB) |
| GET | `/api/songs/<id>/` | one song, with `lyrics` (lists of songs leave them out); staff PATCH `{"lyrics": "..."}` |
| GET/POST/PATCH/DELETE | `/api/events/` · `/api/events/<id>/` | calendar dates; anyone reads, staff write `{title, date, kind, note, link}` (`kind`: comeback, concert, fanmeeting, broadcast, other) |
| GET/POST/PATCH/DELETE | `/api/cards/` · `/api/cards/<id>/` | photocards; signed in to read, staff upload (multipart `image`, `title`, `member`, `album`, `rarity`) |
| GET/POST | `/api/me/binder/` | signed in; GET: my cards (`counts`) and whether today's pack is waiting; POST opens today's pack (3 cards, once a day) |
| GET/POST/DELETE | `/api/letters/` · `/api/letters/<id>/` | signed in; approved letters plus your own (`?member=<slug>`, `?member=all` for letters to the whole team); POST `{member, body, paper}`; delete your own |
| POST | `/api/letters/<id>/review/` | staff; `{"status": "approved" \| "hidden" \| "pending"}` (staff list every letter with `?all=1`) |
| PATCH | `/api/site/` | staff; also `{"birthday_themes": false}` switches off birthday themes |

Tests: `python manage.py test fandom`

## Project map

```
backend/
  config/            settings & urls
  fandom/            models, serializers, views, admin, tests
    seed/            members.json, albums.json
    management/commands/seed_svt.py
frontend/src/
  lib/               api, theme (era/member themes), player, colour & date helpers
  components/        Nav, MiniPlayer, SparkleTrail, MemberAvatar, Leaderboard
  pages/             Home, Members, MemberDetail, Discography, AlbumDetail, Games
  pages/games/       MemoryMatch, UnitSorter, GuessMember
  diary/             Diary page, 3D Book, Editor, Sheet (renders a spread), kit (stickers, fonts, API)
  fan/               calendar dates, birthday themes, units, lyrics/fanchant, fan.css (calendar, units, story, binder, letters, concert mode)
  index.css          all styles (driven by CSS variables)
```

## Ideas for next

- Guess the song from a short preview
- "Which member are you?" quiz with a shareable result card
- Trading duplicate photocards between CARATs

## Copyright

Use official photos with credit and don't upload song audio files or lyrics. Music plays through official YouTube/Spotify embeds. SEVENTEEN © PLEDIS Entertainment. This is a fan project.
