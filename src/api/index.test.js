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

vi.mock("../cache/cloudListSync.js", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue(null),
  fetchCloudAnimeList: vi.fn().mockResolvedValue(null),
  scheduleCloudAnimeListSync: vi.fn().mockResolvedValue(true),
}))

import { fetchUserEntries, clearProviderCache } from "./index.js"
import { fetchAllLists as anilistFetchAll } from "./providers/anilist.js"
import { kitsuFetchAll } from "./providers/kitsu.js"
import { RetryableError, UserNotFoundError } from "./errors.js"
import { writeIdbCache, buildProviderCacheKey } from "../cache/idbCache.js"
import {
  getAuthenticatedUserId,
  fetchCloudAnimeList,
  scheduleCloudAnimeListSync,
} from "../cache/cloudListSync.js"

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  getAuthenticatedUserId.mockResolvedValue(null)
  fetchCloudAnimeList.mockResolvedValue(null)
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
    expect(result._cacheMeta?.isStale).toBe(false)
    expect(result._cacheMeta?.source).toBe("network")
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

  it("returns fresh IndexedDB/local cache without hitting provider API", async () => {
    const cachedEntries = [
      { status: "PLANNING", media: { id: 42, title: { english: "Cached Anime" } } },
    ]
    const key = buildProviderCacheKey("anilist", "cacheduser")
    await writeIdbCache(key, cachedEntries, { timestamp: Date.now() })

    const result = await fetchUserEntries("cacheduser", "anilist")

    expect(anilistFetchAll).not.toHaveBeenCalled()
    expect(result).toEqual(cachedEntries)
    expect(result._cacheMeta?.isStale).toBe(false)
  })

  it("returns fresh Supabase Cloud list when local cache misses and user is authenticated", async () => {
    const cloudEntries = [
      { status: "PLANNING", media: { id: 77, title: { english: "Cloud Anime" } } },
    ]
    getAuthenticatedUserId.mockResolvedValue("user-abc")
    fetchCloudAnimeList.mockResolvedValueOnce({
      entries: cloudEntries,
      timestamp: Date.now() - 10_000,
      isFresh: true,
      isStale: false,
    })

    const result = await fetchUserEntries("clouduser", "anilist")

    expect(anilistFetchAll).not.toHaveBeenCalled()
    expect(result).toEqual(cloudEntries)
    expect(result._cacheMeta?.source).toBe("cloud")
    expect(result._cacheMeta?.isStale).toBe(false)
  })

  it("schedules cloud sync when authenticated user fetches fresh data from network", async () => {
    const netEntries = [
      { status: "PLANNING", media: { id: 88, title: { english: "Net Anime" } } },
    ]
    getAuthenticatedUserId.mockResolvedValue("user-xyz")
    anilistFetchAll.mockResolvedValueOnce(netEntries)

    await fetchUserEntries("syncuser", "anilist")

    expect(scheduleCloudAnimeListSync).toHaveBeenCalledWith(
      "user-xyz",
      "anilist",
      "syncuser",
      netEntries
    )
  })

  it("falls back to stale local cache when network fails with RetryableError (Stale-While-Revalidate)", async () => {
    const staleEntries = [
      { status: "PLANNING", media: { id: 55, title: { english: "Offline Anime" } } },
    ]
    const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000
    const key = buildProviderCacheKey("anilist", "offlineuser")
    await writeIdbCache(key, staleEntries, { timestamp: eightHoursAgo })

    anilistFetchAll.mockRejectedValueOnce(new RetryableError("Sem conexão."))

    const result = await fetchUserEntries("offlineuser", "anilist")

    expect(result).toEqual(staleEntries)
    expect(result._cacheMeta?.isStale).toBe(true)
    expect(result._cacheMeta?.source).toBe("stale-idb")
  })

  it("does NOT fallback to stale cache when provider throws UserNotFoundError", async () => {
    const staleEntries = [
      { status: "PLANNING", media: { id: 55, title: { english: "Old Anime" } } },
    ]
    const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000
    const key = buildProviderCacheKey("anilist", "deleteduser")
    await writeIdbCache(key, staleEntries, { timestamp: eightHoursAgo })

    anilistFetchAll.mockRejectedValueOnce(new UserNotFoundError("AniList"))

    await expect(fetchUserEntries("deleteduser", "anilist")).rejects.toThrow(UserNotFoundError)
  })
})
