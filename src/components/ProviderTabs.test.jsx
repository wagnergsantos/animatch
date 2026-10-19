import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProviderTabs from './ProviderTabs.jsx'

describe('ProviderTabs', () => {
  it('renders nothing if less than 2 linked accounts exist', () => {
    const { container: c1 } = render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', kitsu: '', mal: '' }}
        activeScope="anilist"
        onScopeChange={vi.fn()}
      />
    )
    expect(c1.firstChild).toBeNull()

    const { container: c2 } = render(
      <ProviderTabs
        linkedUsernames={{ anilist: '   ', kitsu: null }}
        activeScope="ensemble"
        onScopeChange={vi.fn()}
      />
    )
    expect(c2.firstChild).toBeNull()

    const { container: c3 } = render(
      <ProviderTabs
        linkedUsernames={null}
        activeScope="ensemble"
        onScopeChange={vi.fn()}
      />
    )
    expect(c3.firstChild).toBeNull()
  })

  it('renders consolidated tab and tabs for each configured provider when >= 2 accounts', () => {
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', kitsu: 'alice_k', mal: 'alice_m' }}
        activeScope="ensemble"
        onScopeChange={vi.fn()}
      />
    )

    const region = screen.getByRole('region', { name: 'Escopo de Provedor' })
    expect(region).toBeInTheDocument()

    const consolidatedBtn = screen.getByRole('button', { name: /Consolidado \(3\)/i })
    expect(consolidatedBtn).toBeInTheDocument()
    expect(consolidatedBtn.className).toMatch(/active/)

    const anilistBtn = screen.getByRole('button', { name: /AniList/i })
    expect(anilistBtn).toBeInTheDocument()
    expect(anilistBtn.className).not.toMatch(/active/)

    const kitsuBtn = screen.getByRole('button', { name: /Kitsu/i })
    expect(kitsuBtn).toBeInTheDocument()

    const malBtn = screen.getByRole('button', { name: /MyAnimeList/i })
    expect(malBtn).toBeInTheDocument()
  })

  it('sets active class on active provider tab when activeScope is not ensemble', () => {
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', kitsu: 'alice_k', mal: 'alice_m' }}
        activeScope="anilist"
        onScopeChange={vi.fn()}
      />
    )

    const consolidatedBtn = screen.getByRole('button', { name: /Consolidado/i })
    expect(consolidatedBtn.className).not.toMatch(/active/)

    const anilistBtn = screen.getByRole('button', { name: /AniList/i })
    expect(anilistBtn.className).toMatch(/active/)
  })

  it('calls onScopeChange when clicking a provider tab and consolidated tab', () => {
    const handleScopeChange = vi.fn()
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', mal: 'alice_m' }}
        activeScope="ensemble"
        onScopeChange={handleScopeChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /MyAnimeList/i }))
    expect(handleScopeChange).toHaveBeenCalledWith('mal')

    fireEvent.click(screen.getByRole('button', { name: /Consolidado/i }))
    expect(handleScopeChange).toHaveBeenCalledWith('ensemble')
  })

  it('renders warning banner and retry button when failedProviders is non-empty in ensemble scope', () => {
    const handleRetry = vi.fn()
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', mal: 'alice_m' }}
        activeScope="ensemble"
        failedProviders={['mal']}
        onScopeChange={vi.fn()}
        onRetryProvider={handleRetry}
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/Não foi possível carregar dados de MyAnimeList/i)

    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i })
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledWith('mal')
  })

  it('does not render retry button if onRetryProvider is not provided', () => {
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', mal: 'alice_m' }}
        activeScope="ensemble"
        failedProviders={['mal']}
        onScopeChange={vi.fn()}
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).toBeNull()
  })

  it('does not render warning banner when activeScope is not ensemble', () => {
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', mal: 'alice_m' }}
        activeScope="anilist"
        failedProviders={['mal']}
        onScopeChange={vi.fn()}
      />
    )

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders sync icon button on Consolidated and each provider tab and calls onSyncProvider', () => {
    const handleSync = vi.fn()
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', kitsu: 'alice_k', mal: 'alice_m' }}
        activeScope="ensemble"
        onScopeChange={vi.fn()}
        onSyncProvider={handleSync}
        loadingProviders={['kitsu']}
      />
    )

    const syncEnsembleBtn = screen.getByTestId('sync-tab-ensemble')
    const syncAnilistBtn = screen.getByTestId('sync-tab-anilist')
    const syncKitsuBtn = screen.getByTestId('sync-tab-kitsu')
    const syncMalBtn = screen.getByTestId('sync-tab-mal')

    // Since loadingProviders has 'kitsu', both ensemble and kitsu sync buttons are disabled
    expect(syncEnsembleBtn).toBeDisabled()
    expect(syncKitsuBtn).toBeDisabled()
    expect(syncAnilistBtn).not.toBeDisabled()
    expect(syncMalBtn).not.toBeDisabled()

    fireEvent.click(syncAnilistBtn)
    expect(handleSync).toHaveBeenCalledWith('anilist')

    fireEvent.click(syncMalBtn)
    expect(handleSync).toHaveBeenCalledWith('mal')
  })

  it('calls onSyncProvider("ensemble") when clicking Consolidated sync icon button', () => {
    const handleSync = vi.fn()
    render(
      <ProviderTabs
        linkedUsernames={{ anilist: 'alice', mal: 'alice_m' }}
        activeScope="ensemble"
        onScopeChange={vi.fn()}
        onSyncProvider={handleSync}
      />
    )

    const syncEnsembleBtn = screen.getByTestId('sync-tab-ensemble')
    expect(syncEnsembleBtn).not.toBeDisabled()
    fireEvent.click(syncEnsembleBtn)
    expect(handleSync).toHaveBeenCalledWith('ensemble')
  })
})
