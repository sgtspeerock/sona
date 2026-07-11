# Discover Daily Scheduling System

## Overview

The Discover Daily feature automatically generates personalized playlists based on your Last.fm listening history. The system uses intelligent day-based scheduling to ensure playlists are generated once per day, every day at 00:00.

## Architecture

### Components

1. **Service Layer** (`src/service/`)
   - `discover-weekly.ts` - Core playlist generation logic (retained naming for simplicity)
   - `discover-weekly-manager.ts` - Scheduling, persistence, and day-based tracking

2. **Frontend Hook** (`src/app/hooks/`)
   - `use-discover-weekly.ts` - React hook for UI integration

3. **Electron Integration** (`electron/`)
   - `discover-weekly-scheduler.ts` - Background scheduler (Main Process)
   - `src/app/observers/discover-weekly-observer.tsx` - IPC event handler (Renderer Process)

4. **Storage**
   - `localStorage` for playlist data, metadata, and day flags

## How It Works

### 1. Day-Based Tracking

The system uses date keys (format: `"2026-03-04"`) to track when playlists were generated:

```typescript
function getDateKey(date: Date): string {
  // Returns format: "2026-03-04"
}
```

**Benefits:**
- Prevents multiple generations in the same day
- Works across time zones
- Survives app restarts

### 2. Generation Triggers

#### A. Automatic Midnight Generation (Electron)

**Main Process** (runs 24/7, even when app is closed):
```typescript
// electron/discover-weekly-scheduler.ts
startDiscoverWeeklyScheduler()
```

- Calculates time until next midnight 00:00
- Sends IPC event to Renderer Process
- Reschedules for following midnight

**Renderer Process**:
```typescript
// src/app/observers/discover-weekly-observer.tsx
window.electron.ipcRenderer.on('discover-weekly:schedule-event', handler)
```

- Receives midnight trigger
- Checks if generation is needed
- Generates playlist if required
- Shows notification

#### B. Catch-Up on Startup

If the app wasn't running at midnight, the system catches up:

```typescript
// src/app/hooks/use-discover-weekly.ts
useEffect(() => {
  const performCatchup = async () => {
    if (shouldGeneratePlaylist()) {
      await checkAndCatchUp(config)
    }
  }
  
  setTimeout(performCatchup, 2000) // Delay to not block render
}, [])
```

**Logic:**
1. Check stored `dayKey` vs current day
2. If different → generate new playlist
3. If same → load existing playlist

#### C. Manual Generation

Users can force regeneration:

```typescript
const { generate } = useDiscoverWeekly()

// Forces generation regardless of day
await generate() // force=true
```

### 3. Storage Strategy

**Three localStorage keys:**

```typescript
// Playlist data
localStorage.setItem('discover_daily_playlist', JSON.stringify(songs))

// Metadata
localStorage.setItem('discover_daily_metadata', JSON.stringify({
  generatedAt: '2026-02-15T00:00:00Z',
  artistsUsed: ['Artist 1', 'Artist 2'],
  totalSongs: 50,
  dayKey: '2026-02-15'
}))

// Day flag (for quick checks)
localStorage.setItem('discover_daily_current_day', '2026-02-15')
```

### 4. Generation Flow

```
┌─────────────────────┐
│    Midnight 00:00   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Electron Scheduler  │  (Main Process)
│ Detects Midnight    │
└──────────┬──────────┘
           │
           │ IPC Event
           v
┌─────────────────────┐
│ DiscoverWeekly      │  (Renderer Process)
│ Observer            │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ shouldGenerate?     │
│ Check dayKey        │
└──────────┬──────────┘
           │
           v
    ┌──────┴──────┐
    │             │
   YES           NO
    │             │
    v             v
┌─────────┐  ┌────────┐
│Generate │  │ Skip   │
│Playlist │  │        │
└─────────┘  └────────┘
    │
    v
┌─────────────────────┐
│ Save to localStorage│
│ - Playlist          │
│ - Metadata          │
│ - Day Flag          │
└─────────────────────┘
    │
    v
┌─────────────────────┐
│ Show Notification   │
└─────────────────────┘
```

## Configuration

### Required Settings

In app settings (⚙️ → Integrations):

```typescript
{
  lastfm: {
    username: 'your-username',
    apiKey: 'your-api-key'
  }
}
```

### Optional Parameters

```typescript
const config = {
  targetArtists: 50,      // Number of similar artists to find
  songsPerArtist: 1,      // Songs per artist (total: 50)
}
```

## API Reference

### `discover-weekly-manager.ts`

#### `shouldGeneratePlaylist(): boolean`
Checks if playlist needs generation for current day.

**Returns:** `true` if:
- No playlist exists
- Current day differs from stored day
- Day flag is missing/invalid

#### `loadPlaylist(): { playlist, metadata }`
Loads playlist from localStorage.

#### `generateAndSavePlaylist(config, force?): Promise<Result>`
Generates and saves playlist.

**Parameters:**
- `config` - Last.fm credentials and options
- `force` - Skip day check (for manual generation)

#### `checkAndCatchUp(config): Promise<boolean>`
Performs catch-up check on app startup.

**Returns:** `true` if playlist was generated

#### `getMillisecondsUntilNextMidnight(): number`
Calculates time until next midnight 00:00.

#### `startDailyScheduler(config, onGenerate?): () => void`
Starts daily scheduler (alternative to Electron integration).

**Returns:** Cleanup function

### `use-discover-weekly.ts`

```typescript
const {
  playlist,          // Song[]
  isGenerating,      // boolean
  error,            // string | null
  lastGenerated,    // string | null (ISO timestamp)
  artistsUsed,      // string[]
  dayKey,           // string | null ("2026-03-04")
  generate,         // () => Promise<void>
  isConfigured,     // boolean
} = useDiscoverWeekly()
```

## Testing

### Manual Testing

1. **Test Day Detection:**
   ```javascript
   // In browser console
   localStorage.setItem('discover_daily_current_day', '2026-03-03')
   // Reload app - should trigger regeneration
   ```

2. **Test Catch-Up:**
   ```javascript
   // Clear day flag
   localStorage.removeItem('discover_daily_current_day')
   // Reload app
   ```

3. **Test Manual Generation:**
   - Go to Discover Weekly page
   - Click "Refresh" button
   - Should regenerate regardless of day

### Debugging

Enable console logging:

```javascript
// All operations log with [DiscoverDaily] prefix
// Filter console: /DiscoverDaily/
```

**Log Examples:**
```
[DiscoverDaily] Starting generation...
[DiscoverDaily] Got 30 overall + 30 recent artists
[DiscoverDaily] Found 256 similar artists
[DiscoverDaily] ✓ Found Artist Name (score: 2.45)
[DiscoverDaily] ✓ Generated playlist with 50 songs
[DiscoverDaily] Playlist for day 2026-03-04 already exists
```

## Troubleshooting

### Playlist Not Generating

1. **Check Last.fm Config:**
   ```javascript
   console.log(localStorage.getItem('sona_lastfm_username'))
   console.log(localStorage.getItem('sona_lastfm_api_key'))
   ```

2. **Check Day Flag:**
   ```javascript
   console.log(localStorage.getItem('discover_daily_current_day'))
   ```

3. **Force Regeneration:**
   ```javascript
   localStorage.removeItem('discover_daily_current_day')
   // Reload app
   ```

### Scheduler Not Running

1. **Check Electron Integration:**
   ```typescript
   // electron/main/index.ts should include:
   import { startDiscoverWeeklyScheduler } from '../discover-weekly-scheduler'
   startDiscoverWeeklyScheduler()
   ```

2. **Check IPC Handler:**
   - Observer should be mounted in `App.tsx`
   - Only runs in Electron (not browser)

### Multiple Generations

If playlist generates multiple times in same day:

1. **Check Day Key Storage:**
   ```javascript
   const metadata = JSON.parse(
     localStorage.getItem('discover_daily_metadata')
   )
   console.log('Day key:', metadata.dayKey)
   ```

2. **Verify Date Function:**
   - Should return format: `"YYYY-MM-DD"`

## Performance

### Generation Time

**Typical duration:** 10-30 seconds

**Factors:**
- Number of top artists
- Last.fm API response time
- Subsonic library size

### Optimization Tips

1. **Reduce Target Artists:**
   ```typescript
   targetArtists: 30  // Instead of 50
   ```

2. **Reduce Songs Per Artist:**
   ```typescript
   songsPerArtist: 1
   ```

3. **Cache Last.fm Results:**
   (Future enhancement)

## Future Enhancements

- [ ] Configurable generation time
- [ ] Multiple playlists (Daily Mix, etc.)
- [ ] Genre-based filtering
- [ ] Exclude artists feature
- [ ] Generation history
- [ ] Export to M3U/Subsonic playlist

## References

- [Last.fm API](https://www.last.fm/api)
- [Electron IPC](https://www.electronjs.org/docs/latest/api/ipc-renderer)
