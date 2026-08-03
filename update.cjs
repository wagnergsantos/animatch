const fs = require('fs');

const indexTest = `import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock do adaptador AniList
vi.mock("./providers/anilist.js", () => ({
  fetchAllLists: vi.fn(),
  fetchDubInfo: vi.fn(),
  clearUserCache: vi.fn(),
  DUB_LANGUAGE_MAP: {
    "pt-br": "Portuguese",
    "en": "English",
  },
}))

vi.mock("./providers/kitsu.js", () => ({
  kitsuFetchAll: vi.fn(),
  kitsuFetchDubInfo: vi.fn(),
  clearKitsuCache: vi.fn(),
  DUB_LANGUAGE_MAP: {
    "pt-br": "Portuguese",
    "en": "English",
  },
}))

import { fetchUserEntries, fetchDubInfo, clearProviderCache } from "./index.js"
import { fetchAllLists as anilistFetchAll } from "./providers/anilist.js"
import { kitsuFetchAll } from "./providers/kitsu.js"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("fetchUserEntries", () => {
  it("delegates to AniList adapter when provider is 'anilist'", async () => {
    const mockEntries = [
      { status: "COMPLETED", score: 9.0, media: { id: 1, title: { english: "Test Anime" } } },
    ]
    anilistFetchAll.mockResolvedValueOnce(mockEntries)

    const result = await fetchUserEntries("testuser", "anilist")

    expect(anilistFetchAll).toHaveBeenCalledWith("testuser", {})
    expect(result).toEqual(mockEntries)
  })

  it("delegates to Kitsu adapter when provider is 'kitsu'", async () => {
    const mockEntries = [
      { status: "COMPLETED", score: 8.0, media: { id: 999, provider: "kitsu", title: { english: "Steins;Gate" } } },
    ]
    kitsuFetchAll.mockResolvedValueOnce(mockEntries)

    const result = await fetchUserEntries("testuser", "kitsu")

    expect(kitsuFetchAll).toHaveBeenCalledWith("testuser", {})
    expect(result).toEqual(mockEntries)
  })

  it("passes forceRefresh option through to AniList adapter", async () => {
    anilistFetchAll.mockResolvedValueOnce([])

    await fetchUserEntries("testuser", "anilist", { forceRefresh: true })

    expect(anilistFetchAll).toHaveBeenCalledWith("testuser", { forceRefresh: true })
  })

  it("defaults to 'anilist' provider when none is specified", async () => {
    anilistFetchAll.mockResolvedValueOnce([])

    await fetchUserEntries("testuser")

    expect(anilistFetchAll).toHaveBeenCalledWith("testuser", {})
  })

  it("throws an error for unsupported provider", async () => {
    await expect(fetchUserEntries("testuser", "myanimelist")).rejects.toThrow(
      "Provedor 'myanimelist' não é suportado."
    )
  })
})
`
fs.writeFileSync('src/api/index.test.js', indexTest, 'utf8');

const indexJs = `import { fetchAllLists as anilistFetchAll, fetchDubInfo as anilistFetchDub, clearUserCache as anilistClearCache } from "./providers/anilist.js"
import { kitsuFetchAll, kitsuFetchDubInfo, clearKitsuCache } from './providers/kitsu.js'

const SUPPORTED_PROVIDERS = ["anilist", "kitsu"]

export async function fetchUserEntries(username, provider = "anilist", options = {}) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(\`Provedor "\${provider}" não é suportado.\`)
  }

  if (provider === "anilist") {
    return anilistFetchAll(username, options)
  }
  if (provider === 'kitsu') {
    return kitsuFetchAll(username, options)
  }

  throw new Error(\`Provedor "\${provider}" ainda não foi implementado.\`)
}

export async function fetchDubInfo(mediaIds, language = "pt-br", provider = "anilist") {
  if (provider === "anilist") {
    return anilistFetchDub(mediaIds, language)
  }
  if (provider === 'kitsu') {
    return kitsuFetchDubInfo(mediaIds, language)
  }

  return new Map()
}

export function clearProviderCache(username, provider = "anilist") {
  if (provider === "anilist") {
    anilistClearCache(username)
  }
  if (provider === 'kitsu') {
    clearKitsuCache(username)
  }
}

export { DUB_LANGUAGE_MAP } from "./providers/anilist.js"
`
fs.writeFileSync('src/api/index.js', indexJs, 'utf8');

console.log("Done");
