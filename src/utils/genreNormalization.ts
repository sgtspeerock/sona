/**
 * Central genre hygiene + canonicalization.
 *
 * Goals:
 * - Filter out labels that are clearly not genres (years, artists, countries, URLs, list labels).
 * - Merge common variants into canonical main genres.
 * - Handle mixed strings like "Pop, Rock, Metal" by picking the first usable canonical token.
 */

function normalizeKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/m³|m\xB3/gi, 'muzik')
    .toLowerCase()
    .trim()
}

function cleanupToken(value: string): string {
  return normalizeKey(value)
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s*\|\s*/g, ' ')
    .trim()
}

function splitGenreTokens(value: string): string[] {
  const normalized = normalizeKey(value)
  if (!normalized) return []

  return normalized
    .split(/[,/&;]| and | und |\||\+|\\|\(|\)|:/gi)
    .map((token) => cleanupToken(token))
    .filter(Boolean)
}

const CANONICAL_GENRE_ALIASES: Record<string, string[]> = {
  Rock: [
    'rock',
    'rock n roll',
    'rock and roll',
    'soft rock',
    'glam rock',
    'psychedelic rock',
    'instrumental rock',
    'rock pop',
    'rock/pop',
    'rock pops',
    'pop rock',
    'hard grunge rock',
    'speedrock',
    'stoner rock',
    'math rock',
    'post-rock',
    'post rock',
    'garage rock',
    'arena rock',
    'new wave',
    'surf rock',
    'blues rock',
  ],
  'Classic Rock': ['classic rock', 'old school rock'],
  'Hard Rock': ['hard rock', 'hard/grunge rock'],
  'Alternative Rock': [
    'alternative',
    'alternative rock',
    'alt rock',
    'alt. rock',
    'alt-pop',
    'alternrock',
    'alternatif',
    'alternative & punk',
    'alternative punk',
    'alternative rock / hip hop',
    'alternative rock hip hop',
  ],
  'Indie Rock': [
    'indie rock',
    'indie',
    'indie pop',
    'indie folk',
    'indietronica',
    'britpop',
    'shoegaze',
    'grunge',
    'post-grunge',
  ],
  'Progressive Rock': ['progressive rock', 'progressive rock metal'],
  'Garage Rock': ['garage rock'],
  Metal: [
    'metal',
    'alternative metal',
    'alt metal',
    'female metal',
    'modern meta metalcore',
    'rock, metal',
    'pop, rock, metal',
    'rock, hard rock, alternative metal',
  ],
  'Heavy Metal': ['heavy metal', 'heavy power metal', 'heavy | power metal'],
  'Black Metal': ['black metal'],
  Deathcore: ['deathcore', 'symphonic deathcore'],
  'Death Metal': [
    'death metal',
    'brutal death metal',
    'melodic death metal',
    'technical death metal',
    'viking death metal',
    'symphonic death metal',
  ],
  Grindcore: ['grindcore'],
  'Thrash Metal': ['thrash metal'],
  'Power Metal': ['power metal', 'power epic metal'],
  'Progressive Metal': [
    'progressive metal',
    'progressive melodic metal',
    'progressive metalcore',
  ],
  'Symphonic Metal': [
    'symphonic metal',
    'symphonic power metal',
    'symphonic gothic metal',
  ],
  'Nu Metal': ['nu metal'],
  Djent: ['djent'],
  'Groove Metal': ['groove metal'],
  'Melodic Metal': ['melodic metal'],
  Metalcore: [
    'metalcore',
    'post/metalcore',
    'metalcore post-hardcore deathcore',
    'melodic death metal metalcore',
    'metalcore alternative metal electronic',
    'modern meta/metalcore',
  ],
  'Industrial Metal': ['industrial metal'],
  'Folk Metal': ['folk metal', 'pirate metal', 'kawaii metal'],
  'Doom Metal': ['doom metal', 'sludge metal'],
  'Gothic Metal': ['gothic metal'],
  'Post-Metal': ['post-metal', 'post metal'],
  'Technical Metal': ['technical death metal'],
  Punk: [
    'punk',
    'punk rock',
    'garage punk',
    'hardcore punk',
    'dance punk',
    'horror punk',
    'pop punk',
    'ska punk',
    'post-punk',
  ],
  Hardcore: ['hardcore', 'melodic hardcore', 'post-hardcore', 'post hardcore'],
  'Post-Punk': ['post-punk', 'post punk'],
  Emo: ['emo', 'midwest emo', 'emocore', 'screamo'],
  'Math Rock': ['math rock'],
  'Post-Rock': ['post-rock', 'post rock'],
  Shoegaze: ['shoegaze'],
  Pop: [
    'pop',
    'rock pop',
    'alternative pop',
    'alt pop',
    'alt-pop',
    'dance pop',
    'country pop',
    'adult contemporary',
    'top 40',
    'melodramatic',
  ],
  'Pop Rock': ['pop rock', 'rock/pop'],
  Synthpop: ['synthpop'],
  Synthwave: ['synthwave'],
  Electropop: ['electropop'],
  'Dream Pop': ['dream pop', 'ambient pop', 'baroque pop'],
  'J-Pop': ['j pop', 'jpop', 'j-pop'],
  'K-Pop': ['k pop', 'kpop', 'k-pop', 'pop, kpop'],
  'Hip-Hop': [
    'hip hop',
    'hip-hop',
    'hiphop',
    'hip hop rap',
    'rap',
    'rap & hip-hop',
    'rap/hip hop',
    'rap hip hop',
    'alt hip hop',
    'experimental hip hop',
    'political hip hop',
    'west coast hip hop',
    'southern rap',
    'rapcore',
    'rap rock',
    'grime',
    'horrorcore',
    'cloud rap',
    'deutscher hiphop',
    'deutschrap',
    'nerdcore',
    'trap',
  ],
  'R&B': [
    'r&b',
    'rnb',
    'rhythm and blues',
    'alternative r&b',
    'alternative rnb',
    'contemporary rnb',
    'neo soul',
  ],
  Electronic: [
    'electronic',
    'electronica',
    'electronic dance music',
    'edm',
    'dance/electronic',
    'dance electronic',
    'beats',
    'funkot',
    'chiptune',
    'baltimore club',
  ],
  House: ['house', 'acid house', 'electro house', 'deep house', 'tech house'],
  Techno: [
    'techno',
    'minimal techno',
    'minimal',
    'detroit techno',
    'hard techno',
  ],
  Trance: [
    'trance',
    'progressive trance',
    'uplifting trance',
    'psytrance',
    'goa trance',
  ],
  Dubstep: ['dubstep', 'brostep'],
  'Drum & Bass': [
    'drum and bass',
    'drum & bass',
    'dnb',
    "d'n'b",
    'liquid drum and bass',
    'neurofunk',
    'jump up',
  ],
  Breakbeat: ['breakbeat', 'big beat', 'nu skool breaks'],
  'UK Garage': ['uk garage', '2-step', '2 step', 'garage'],
  Electro: ['electro', 'electroclash'],
  IDM: ['idm', 'intelligent dance music', 'glitch-hop', 'glitch hop'],
  'Future Bass': ['future bass'],
  Chillout: ['chillout', 'downtempo', 'lofi', 'lo-fi'],
  'Trip-Hop': ['trip hop', 'trip-hop'],
  Disco: ['disco', 'eurodance', 'dance'],
  Ambient: ['ambient', 'dark ambient', 'new age', 'noise'],
  Classical: [
    'classical',
    'classique',
    'cinematic classical',
    'contemporary classical',
    'modern classical',
    'impressionism',
    'composer',
    'piano',
    'piano rock',
    'instrumental',
  ],
  Soundtrack: [
    'soundtrack',
    'film',
    'film score',
    'film scores',
    'films/games, film scores',
    'films/games, film scores, game scores',
    'classical, films/games, film scores',
    'alternative, films/games, film scores',
    'rock, films/games, film scores',
    'film bandes originales de films',
    'film/original',
    'film oyun, film muzikleri',
    'film/oyun, film muzikleri',
    'alternatif, film/oyun, film muzikleri',
    'original score',
    'original soundtrack',
    'cinematic',
    'game soundtrack',
    'video game music',
    'game',
    'anime',
    'ost',
    'sonic free riders',
  ],
  Jazz: ['jazz', 'drjazzmrfunkmusic'],
  'Jazz Fusion': ['jazz fusion'],
  'Acid Jazz': ['acid jazz'],
  Blues: ['blues'],
  'Blues Rock': ['blues rock'],
  Funk: ['funk', 'funk rock'],
  Soul: ['soul'],
  'Neo Soul': ['neo soul'],
  Folk: [
    'folk',
    'singer-songwriter',
    'folk, singer & songwriter',
    'acoustic',
    'a cappella',
    'americana',
    'folk pop',
  ],
  Country: ['country', 'alt-country', 'countrypolitan', 'country pop'],
  Americana: ['americana'],
  Reggae: ['reggae'],
  Dancehall: ['dancehall'],
  Dub: ['dub'],
  Gospel: ['gospel', 'christian rock'],
  Ska: ['ska', 'ska punk'],
  Industrial: ['industrial', 'industrial rock'],
  Gothic: ['goth', 'gothic rock'],
  Oldies: ['oldies', 'schlageroldies'],
  Latin: ['latin', 'samba'],
  Grime: ['grime'],
  Trap: ['trap'],
  Rap: ['rap', 'rap rock', 'rapcore', 'southern rap'],
  'Cloud Rap': ['cloud rap'],
  'West Coast Hip-Hop': ['west coast hip hop'],
  'J-Rock': ['j-rock'],
  'K-Rock': ['k-rock'],
  Vocaloid: ['vocaloid'],
  Experimental: ['experimental', 'experimental hip hop'],
  Art: ['art pop', 'art rock', 'nagoya kei', 'melodramatic'],
}

const NON_GENRE_LABELS = new Set(
  [
    'all',
    'other',
    'unknown',
    'divers',
    'cover',
    'duet',
    'female vocal',
    'female vocalist',
    'female vocalists',
    'female metal',
    'vocal',
    'best songs',
    'my top songs',
    'one track mind',
    'one hit wonder',
    'love at first listen',
    'cloud nine',
    '4 stars',
    'do not touch me',
    'funk_add_to_lidarr_batch_17',
    'under 5000 listeners',
    'not camp',
    'sad',
    'american',
    'australian',
    'british',
    'canada',
    'german',
    'japan',
    'japanese',
    'korean',
    'germany',
    'ukrainian',
    'portuguese',
    'russian',
    'swedish',
    'uk',
    'usa',
    'united states',
    'united states of america',
    'belgium',
    'china',
    'chinese',
    'luanco',
    'wsum 91.7 fm madison',
    'http://musozavr.com/',
    // artist / custom tags from provided list
    'dominique simone',
    'nicki minaj',
    'rihanna',
    'paramore',
    'gorillaz',
    'king diamond',
    'roxette',
    'the prodigy',
    'the national',
    'fall out boy',
    'ice nine kills',
    'sleep token',
    'santa cruz',
    'good left undone',
    'the method',
    'lili own this song',
    'cambrian o clock',
    'rotz rock',
    'mtv',
    '80s',
    '90s',
  ].map((value) => cleanupToken(value)),
)

const NON_GENRE_PATTERNS = [
  /^\d{4}$/, // years like 2022
  /^\d{2}s$/,
  /^\d+\s*stars?$/,
  /^https?:\/\//,
  /(?:^|\s)fm(?:$|\s)/,
  /listeners?/,
  /\btop songs?\b/,
  /\bbest songs?\b/,
]

const REVERSE_MAP: Record<string, string> = {}
for (const [canonical, aliases] of Object.entries(CANONICAL_GENRE_ALIASES)) {
  REVERSE_MAP[cleanupToken(canonical)] = canonical
  for (const alias of aliases) {
    REVERSE_MAP[cleanupToken(alias)] = canonical
  }
}

function isUsableToken(token: string): boolean {
  if (!token) return false
  if (NON_GENRE_LABELS.has(token)) return false
  if (NON_GENRE_PATTERNS.some((pattern) => pattern.test(token))) return false
  // very short noise tokens
  if (token.length <= 1) return false
  return true
}

function canonicalizeToken(token: string): string | null {
  if (!isUsableToken(token)) return null

  const mapped = REVERSE_MAP[token]
  if (mapped) return mapped

  // strict mode: unknown tokens are not treated as genres
  return null
}

/**
 * Returns canonical display name for a genre string.
 * For mixed strings, the first usable canonical token is returned.
 */
export function normalizeGenreName(name: string): string {
  const raw = (name ?? '').trim()
  if (!raw) return ''

  const tokens = splitGenreTokens(raw)
  for (const token of tokens) {
    const canonical = canonicalizeToken(token)
    if (canonical) return canonical
  }

  return raw
}

/**
 * Returns true if the provided label contains at least one usable genre token.
 */
export function isGenreUsable(name: string): boolean {
  const tokens = splitGenreTokens(name ?? '')
  return tokens.some((token) => Boolean(canonicalizeToken(token)))
}

/**
 * Given a canonical genre name and all raw server genre names,
 * returns all server names that map to this canonical genre.
 */
export function getConstituentGenres(
  canonicalName: string,
  allGenreNames: string[],
): string[] {
  const normalizedCanonical = normalizeGenreName(canonicalName)
  return allGenreNames.filter(
    (name) => normalizeGenreName(name) === normalizedCanonical,
  )
}
