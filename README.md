# The HTML Project Music

* Serves a single-page music web app (static frontend from `public/`) using a Fastify server on port `3333`.
* Lets you search for songs; the backend combines iTunes song metadata results with YouTube search results into one list.
* Plays audio by finding a YouTube video ID (when needed) and streaming the best available audio format.
* Supports real scrubbing/seek in the player by providing Range-capable audio streaming (so dragging the progress bar jumps to that time).
* Fetches and caches album art through a backend `/music/cover` proxy endpoint.
* Provides a tabbed UI: Player, Search, Lyrics, Favorites.
* Pulls lyrics from a public lyrics API and displays them when available.
* Maintains a playback queue based on the current list (search results or favorites) and auto-plays the next track when one ends.
* Stores favorites locally in the browser (localStorage) and lets you play or remove them from the Favorites tab.
* Includes volume control and mute/unmute, plus previous/next track controls.

## How to install

Step 1 - Clone Repo and cd into the directory
`git clone https://github.com/TheHTMLProject/music.git && cd music`

Step 2 - Begin npm install
`npm install`

Step 3 - Run script to test. The default port is 3333, you can change this in server.js
`npm run start`

All done! These were super quick instructions, more coming soon!

