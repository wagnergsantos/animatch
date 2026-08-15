import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock do adaptador AniList
vi.mock("./providers/anilist.js", () => ({
  fetchAllLists: vi.fn(),
  clearUserCache: vi.fn(),
}))

vi.mock("./providers/kitsu.js", () => ({
  kitsuFetchAll: vi.fn(),
  clearKitsuCache: vi.fn(),
}))

import { fetchUserEntries, clearProviderCache } from "./index.js"
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
      "Provedor \"myanimelist\" não é suportado."
    )
  })
})
