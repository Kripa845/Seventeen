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
- **Diary** (`/diary`): a scrapbook journal shown as a 3D book. Spreads fan out on both sides and turn with a page-flip; you can also browse by month in a grid, search words, dates and members, or jump to a date. Each spread has a date and holds photos (dropped, pasted or uploaded; PNG cut-outs keep their shape), member photos, stickers (words, emoji, washi tape, doodles), handwritten notes and songs. A song is any SEVENTEEN track on the site or any YouTube / Spotify link, shown as a card, a spinning vinyl or a cassette; ▶ plays it through the site's player, and "Play page songs" plays them all. Drag to move, use the corner handle to resize and the top handle to rotate; undo with Ctrl+Z. Pages can be private. Anyone can read public pages; writing needs a Studio (staff) account.
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

## Accounts: viewers and admins

The site has three separate areas:

| Area | Who | What's there |
|---|---|---|
| **Landing page** (`/`) | Everyone, signed out | A welcome, who SEVENTEEN are (units, debut, CARAT), stat cards, the 13 members by unit, the latest eras, recent title tracks, and **Log in** / **Sign up** buttons. Games, the diary, memories, music, themes and the full member and era pages are locked here. |
| **Viewer dashboard** (`/me` and its sections) | Any signed-in account | Dashboard, Members, Eras, Music (and Now Playing), Themes (wear any era site-wide), Games, Diary and Memories. Signed-out visitors who open one of these are sent to sign in and brought back afterwards, `?page=` and all. |
| **Admin dashboard** (`/studio`) | Admins | All the management: members, music, album management, themes, users and games. Admins can use the viewer dashboard too (diary and memories pages are edited there). |

The API enforces the same split: members, albums, songs and the site settings are public (the landing page needs them); diary and photo album pages and game scores need a signed-in account; every change is admin-only.

| Role | How you get it | What you get |
|---|---|---|
| **Viewer** (fan) | Sign up at **/register** | A personal dashboard at **/me**: your playlist (tap ♥ on any song), your bias (the page wears their colour, with a birthday countdown), your saved game scores, and account settings (name, password) |
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
| GET | `/api/diary/` | signed in; diary pages, oldest first (private pages only for staff) |
| POST/PATCH/DELETE | `/api/diary/` · `/api/diary/<id>/` | staff only; `items` are validated |
| POST | `/api/diary/<id>/photos/` | staff only; multipart `image`, for placing on that page |
| GET | `/api/diary/?book=album` | the photo albums' pages, undated (the diary is `book=diary`, the default, and its pages need a `date`) |
| POST | `/api/diary/reorder/` | staff only; `{"ids": [...]}` with every photo album page id once, in the new order (new pages go last) |
| POST | `/api/diary/<id>/videos/` | staff only; multipart `file` (MP4, WebM, MOV up to 100 MB) |

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
  index.css          all styles (driven by CSS variables)
```

## Ideas for next

- Photocard gacha: one random card a day, collected in a binder
- Guess the song from a short preview
- "Which member are you?" quiz with a shareable result card
- CARAT lightstick simulator
- Concert / dark mode toggle
- Member birthday banners on the home page

## Copyright

Use official photos with credit and don't upload song audio files or lyrics. Music plays through official YouTube/Spotify embeds. SEVENTEEN © PLEDIS Entertainment. This is a fan project.
