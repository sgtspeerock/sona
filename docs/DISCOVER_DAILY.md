# Discover Daily - Technical Documentation

## Overview

Discover Daily is a personalized playlist feature that generates daily music recommendations based on Last.fm listening history. The system intelligently manages playlist generation to ensure:

- ✅ **Daily updates** every day at 00:00 (midnight) local time
- ✅ **No duplicate generations** within the same day
- ✅ **Automatic catch-up** if the app wasn't running at midnight
- ✅ **Manual refresh** option for users
- ✅ **Persistent storage** with localStorage

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│           Electron Main Process                 │
│  electron/discover-weekly-scheduler.ts          │
│  • Background timer (Daily 00:00)               │
│  • Sends IPC events to renderer                 │
└──────────────────┬──────────────────────────────┘
                   │ IPC: 'discover-weekly:schedule-event'
                   ▼
┌─────────────────────────────────────────────────┐
│          Renderer Process (React)               │
│                                                 │
│  src/service/discover-weekly-manager.ts         │
│  • Day-based logic (YYYY-MM-DD format)          │
│  • localStorage persistence                     │
│  • Generation & caching                         │
│                                                 │
│  src/app/hooks/use-discover-weekly.ts           │
│  • React integration                            │
│  • One-time catch-up check on mount             │
│  • Manual generation trigger                    │
│                                                 │
│  src/app/pages/discover-weekly.tsx              │
│  • UI display                                   │
│  • Play/Shuffle controls                        │
└─────────────────────────────────────────────────┘
```

## Day Tracking System

### Date Format

Playlists are tracked using local date strings:
- Format: `YYYY-MM-DD` (e.g., `2026-03-04`)
- Ensures consistent daily boundaries globally

### Storage Keys

```typescript
localStorage keys:
- 'discover_daily_playlist'          // Array<Song>
- 'discover_daily_metadata'          // Metadata + dayKey
- 'discover_daily_current_day'       // "2026-03-04" flag
```

### Generation Logic

```typescript
function shouldGeneratePlaylist(): boolean {
  const currentDay = getDateKey(new Date())  // e.g., "2026-03-04"
  const storedDay = localStorage.getItem('discover_daily_current_day')
  
  return currentDay !== storedDay  // Generate if days differ
}
```

## Flow Diagrams

### App Startup Flow

```
App Launch
  |
  ├─> Load cached playlist from localStorage
  |
  ├─> Wait 2 seconds (UI priority)
  |
  └─> Check if catch-up needed
       ├─> Current day === Stored day? → No action
       └─> Current day !== Stored day? → Generate new playlist
```

### Midnight 00:00 Flow (Background)

```
Electron Scheduler (Main Process)
  |
  ├─> Calculate time until next midnight
  |
  ├─> Set timeout
  |
  └─> Midnight arrives
       |
       └─> Send IPC event to renderer
            |
            └─> Renderer checks shouldGeneratePlaylist()
                 ├─> Already generated? → Skip
                 └─> Not generated? → Generate & save
```

### Manual Refresh Flow

```
User clicks "Refresh" button
  |
  └─> generateAndSavePlaylist(config, force: true)
       |
       ├─> Fetch Last.fm top artists
       ├─> Get similar artists
       ├─> Search in Subsonic library
       ├─> Generate playlist
       |
       └─> Save to localStorage with new dayKey
```

## API Reference

### `discover-weekly-manager.ts`

#### `shouldGeneratePlaylist(): boolean`
Checks if current day differs from stored day.

```typescript
if (shouldGeneratePlaylist()) {
  // Generate new playlist
}
```

#### `loadPlaylist(): { playlist: Song[], metadata: PlaylistMetadata | null }`
Loads cached playlist from localStorage.

```typescript
const { playlist, metadata } = loadPlaylist()
```

#### `generateAndSavePlaylist(config, force?): Promise<{ playlist, metadata }>`
Generates and saves playlist. Set `force: true` to bypass day check.

```typescript
await generateAndSavePlaylist(
  { username: 'user', apiKey: 'key' },
  true  // Force regeneration
)
```

#### `checkAndCatchUp(config): Promise<boolean>`
Performs catch-up generation if needed. Returns `true` if generated.

```typescript
const wasGenerated = await checkAndCatchUp(config)
```

#### `startDailyScheduler(config, onGenerate?): () => void`
Starts in-renderer timer for daily checks. Returns cleanup function.

```typescript
const cleanup = startDailyScheduler(config, (success) => {
  console.log('Generated:', success)
})

// Later:
cleanup()
```

### `use-discover-weekly.ts` Hook

```typescript
const {
  playlist,          // Song[]
  isGenerating,      // boolean
  error,             // string | null
  lastGenerated,     // string (ISO timestamp)
  artistsUsed,       // string[]
  dayKey,            // string ("2026-03-04")
  generate,          // () => Promise<void> - Manual refresh
  isConfigured,      // boolean - Last.fm configured?
} = useDiscoverWeekly()
```

## Integration Guide

### Step 1: Enable Electron Scheduler (Optional)

In `electron/main.ts`:

```typescript
import { startDiscoverWeeklyScheduler } from './discover-weekly-scheduler'

app.whenReady().then(() => {
  // ... other initialization
  
  startDiscoverWeeklyScheduler()
})
```

### Step 2: Listen to IPC Events (Optional)

In renderer (e.g., `App.tsx` or main layout):

```typescript
import { useEffect } from 'react'
import { checkAndCatchUp } from '@/service/discover-weekly-manager'
import { useAppIntegrations } from '@/store/app.store'

function App() {
  const { lastfm } = useAppIntegrations()

  useEffect(() => {
    const handler = (event: any, data: any) => {
      console.log('Received scheduler event:', data)
      
      // Trigger catch-up
      checkAndCatchUp({
        username: lastfm.username,
        apiKey: lastfm.apiKey,
      })
    }

    window.electron?.ipcRenderer.on('discover-weekly:schedule-event', handler)

    return () => {
      window.electron?.ipcRenderer.off('discover-weekly:schedule-event', handler)
    }
  }, [lastfm])

  return <YourApp />
}
```

### Step 3: Use the Hook

The hook automatically handles catch-up on mount:

```typescript
function DiscoverWeeklyPage() {
  const { playlist, generate, isGenerating } = useDiscoverWeekly()
  
  return (
    <div>
      <button onClick={generate} disabled={isGenerating}>
        Refresh Playlist
      </button>
      {/* ... render playlist */}
    </div>
  )
}
```

## Testing

### Simulate Day Change

```typescript
// In browser console:
localStorage.setItem('discover_daily_current_day', '2026-03-03')
location.reload()  // Should trigger catch-up
```

### Force Regeneration

```typescript
import { generateAndSavePlaylist } from '@/service/discover-weekly-manager'

await generateAndSavePlaylist(
  { username: 'your-username', apiKey: 'your-key' },
  true  // Force
)
```

## Troubleshooting

### Playlist not regenerating

1. Check localStorage flag:
   ```javascript
   console.log(localStorage.getItem('discover_daily_current_day'))
   ```

2. Verify Electron scheduler is running (check console logs)

3. Ensure Last.fm credentials are configured

### Multiple generations in same day

- This should not happen. Check if `force: true` is being used unintentionally.
- Clear localStorage and reload:
  ```javascript
  localStorage.removeItem('discover_daily_current_day')
  location.reload()
  ```

### Catch-up not working

- Check console for `[DiscoverDaily]` logs
- Verify `hasCheckedCatchup` flag in hook state
- Ensure 2-second delay hasn't been interrupted

## Performance Considerations

- **Catch-up delay**: 2 seconds after mount to prioritize UI rendering
- **localStorage**: Playlist stored as JSON (~50KB typical)
- **Daily check**: Calculated timeout, not polling
- **IPC overhead**: Minimal, event-driven

## Future Improvements

- [ ] IndexedDB migration for larger playlists
- [ ] Progress notifications during generation
- [ ] Playlist history (previous days)
- [ ] User-configurable parameters (artists count, songs per artist)
