# Changelog

All notable changes to Sona will be documented in this file.

## [Unreleased]

### What's New

### Fixes

---

## [0.21.0] - 2026-07-17

### What's New

#### Search & Resilient Lyrics Lookup:
- Search now ranks artists, albums, and songs by relevance before showing results, with stronger matches and higher-result artists/albums appearing first.
- Search sections now pull a larger candidate pool internally while keeping the visible result list compact and readable.
- Synced lyrics lookup is now more resilient by trying precise and relaxed LRCLIB matches before falling back to plain lyrics.

#### Offline Scrobble Queue & Outage Prevention:
- Integrated a persistent local storage cache for failed scrobbles. During network or server outages, scrobbles are queued and automatically retried with their original listening timestamps when connection is restored (either on app startup or upon the next successful scrobble).

#### Flexible "On This Day" (Jubiläum):
- Redesigned the anniversary algorithm to query all years from 1 to 50 concurrently. It prioritizes exact calendar week anniversaries (±5 days from today), and features singular/plural grammatical localization (e.g., "Vor 1 Jahr" vs. "Vor X Jahren").

#### Playlist Page Overhaul & Management:
- Added a header action button to toggle visibility of auto-imported playlists.
- Introduced a select checkbox column on the left to mark active playlists to keep.
- Removed numbering, comments, and public status columns from the playlists table.
- Completely removed public/private configuration options from create/edit playlist dialogs, setting the default to private.

#### Playlist Cover Recalculation:
- Added a context menu action "Cover neu berechnen" to recalculate playlist cover art on the server, while invalidating the local browser Cache Storage (`'images'`) for immediate, flicker-free reloading.

#### UI & Layout Enhancements:
- Simplified the full-screen queue to show only artist and song name, removed metadata text shadows in full-screen lyrics, and ensured the album art in full-screen lyrics is perfectly square.
- Made the Now Playing cover art in the right sidebar larger by utilizing full sidebar width (`aspect-square w-full`), and made the sidebar itself 10px narrower (`410px` / `440px`) to maximize main panel display space.
- Set `staleTime` for the "Recently Added" query to `0` and enabled `refetchOnWindowFocus: true` to ensure new albums scan and appear instantly when the app is focused.
- Redesigned the Recently Added box to display `56px` cover arts with `p-2.5` padding and a fixed gap to fit the container height perfectly without gaps or vertical stretching.

### Fixes

#### Playlist Table Interactions:
- Prevented click and double-click event propagation on the select checkbox column to stop double-clicks from playing the playlist.
- Fixed a React.memo rendering block in table cells, ensuring checked/unchecked checkbox states update instantly.

#### Search & Metadata Matching:
- Fixed empty or irrelevant zero-result artists/albums appearing in search results.
- Fixed active Lyrics and Queue control icons so they keep the correct accent color on hover.
- Fixed synced lyrics getting stuck on stale plain-text cache entries after enabling synced lyrics.
- Fixed packaged Electron builds failing to reliably load LRCLIB lyrics by falling back to the main-process fetch proxy.
- Fixed LRCLIB lookups being too strict when album or duration metadata differs slightly from the external lyrics database.

---

## Previous Releases

See [GitHub Releases](https://github.com/rinderhackzilla/sona/releases) for full release history.
