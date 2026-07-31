| Task | Status | Commits | Notes |
|---|---|---|---|
| Task 1: Project Scaffold + Design System CSS | Complete | `8b9191a`..`e5746ab` | Vitest + React Scaffold, OKLCH CSS tokens, review clean |
| Task 2: AniList API Client | Complete | `eda7dba`..`0936234` | GraphQL queries, HTTP/GraphQL error handling, 12 tests passing |
| Task 3: Recommendation Logic | Complete | `f1377e6`..`0f44f81` | buildTasteProfile, scoreRecommendations, 12 tests passing |
| Task 4: LoginScreen Component | Complete | `23ab92d`..`c3378fb` | Accessible form, loading spinner, error alert, 6 tests passing |
| Task 5: Dashboard Components | Complete | `7971e47`..`c087617` | TasteProfile, AnimeCard, RecommendationGrid, Dashboard, 5 tests passing |
| Task 6: App Integration | Complete | `c42559f` | Wires LoginScreen, API, Recommender, Dashboard, 6 tests passing |
| Bayesian Task 1: buildTasteProfile | Complete | `08dcfac` | Bayesian average formula, global average fallback, 13 tests passing |
| Bayesian Task 2: scoreRecommendations | Complete | `64600aa` | Uses adjustedAverage for match score, 15 tests passing |
| Bayesian Task 3: TasteProfile Badges | Complete | `4107b1b`..`b8b98b9` | Badge sorting by adjustedAverage, count display, 49 tests passing |
| Links Task 1: siteUrl in PLANNING_QUERY | Complete | `9493497` | Added siteUrl to GraphQL query, 12 API tests passing |
| Links Task 2: Filter unreleased anime | Complete | `b3b4245` | Filter averageScore null/0, attach siteUrl, 16 recommender tests passing |
| Links Task 3: Clickable AnimeCard | Complete | `008301e` | Render AnimeCard as <a> with target _blank, 50 tests passing |
| C15 Task 1: CONFIDENCE_CONSTANT=15 | Complete | `1befbf9` | C=15 and 2 decimal precision in recommender.js, 52 tests passing |
| C15 Task 2: Dynamic TasteProfile Badges | Complete | `d77a335` | Dynamic badges >= 8.00 (min 5) with 2 decimal precision, 52 tests passing |
| C15 Task 3: AnimeCard 2 Decimal Format | Complete | `d92dd4e` | Format scores with toFixed(2) across cards & tests, 53 tests passing |
