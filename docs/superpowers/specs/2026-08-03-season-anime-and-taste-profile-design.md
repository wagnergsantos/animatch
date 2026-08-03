# Design Spec: Season Anime Filter & TasteProfile Breakdown Modal

**Date:** 2026-08-03
**Status:** Draft / Pending User Review

---

## 1. Overview
This specification details two improvements to the AniMatch application:
1. **Seasonal Anime Filter in Recommendations (`PLANNING` list):** Allow users to easily filter recommendations to show only current season animes.
2. **Taste Profile Origin Breakdown Modal:** Allow users to click on any genre badge in their "Perfil de Gosto" to view a modal showing the exact animes from their list that contributed to that genre score and count.

---

## 2. Feature Details

### Feature 1: Seasonal Anime Filter
- **Location:** `FilterBar.jsx` / `Dashboard.jsx`
- **Behavior:**
  - Add a toggle button or filter option: `"Apenas da Temporada"` (Current Season).
  - An anime is considered current season if its `year` / `seasonYear` matches the current year and/or its `status` is `'RELEASING'` / `startDate` falls within recent season months.
  - Applies to both AniList and Kitsu data seamlessly.

### Feature 2: Taste Profile Breakdown Modal
- **Location:** `TasteProfile.jsx` / `GenreOriginModal.jsx` (New Component)
- **Behavior:**
  - `buildTasteProfile` in `src/logic/recommender.js` is enhanced to attach the array of contributing entries (`sourceAnimes`: Array of `{ id, title, score, coverImage, status }`) to each genre entry in the profile Map.
  - Clicking a badge in `TasteProfile` opens a modal detailing:
    - Genre title & calculated Bayesian / Real Average score.
    - List of evaluated animes belonging to this genre with user ratings.
    - Button to filter recommendations by this genre.

---

## 3. Data Flow & Components Affected

1. **`src/logic/recommender.js`**
   - Update `buildTasteProfile(completedEntries)` to store matching entries for each genre.
2. **`src/components/TasteProfile.jsx`**
   - Intercept badge click to open `GenreOriginModal` instead of directly triggering genre filter, or offer both choices seamlessly.
3. **`src/components/GenreOriginModal.jsx`** (New)
   - Visual dialog listing contributing animes with score badges and cover images.
4. **`src/components/FilterBar.jsx` & `src/components/Dashboard.jsx`**
   - Add "Temporada Atual" toggle state and update recommendation scoring / filtering pipeline.

---

## 4. Testing Plan
- Unit tests for updated `buildTasteProfile` verifying `sourceAnimes` tracking.
- Component tests for `GenreOriginModal` verifying rendering of contributing animes.
- Unit & UI tests for seasonal filtering logic.
