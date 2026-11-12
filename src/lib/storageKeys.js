export const STORAGE_KEYS = Object.freeze({
  SETTINGS: 'animatch_settings',
  USERNAME: 'animatch_username',
  PROVIDER: 'animatch_provider',
  RECENT_USERS: 'animatch_recent_users',
  THEME: 'animatch_theme',
  LANG: 'animatch_lang',
  VIEW_MODE: 'animatch_view_mode',
  SUBSCRIPTIONS: 'animatch_subscriptions',
  STREAMING_BOOST: 'animatch_streaming_boost',
  CACHE_INDEX: 'animatch_cache_index',
})

export const CACHE_PREFIXES = Object.freeze({
  ANILIST: 'animatch_cache_',
  KITSU: 'animatch_kitsu_cache_',
  MAL: 'animatch_mal_cache_',
  ENSEMBLE: 'animatch_ensemble_cache_',
})

export const IDB_CONFIG = Object.freeze({
  DB_NAME: 'animatch_db',
  STORE_NAME: 'anime_lists',
})

export const KNOWN_LOCAL_STORAGE_KEYS = Object.freeze(Object.values(STORAGE_KEYS))
