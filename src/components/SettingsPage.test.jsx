import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsPage from './SettingsPage.jsx'
import { STREAMING_SERVICES } from '../logic/streaming.js'

describe('SettingsPage', () => {
  const defaultProps = {
    user: null,
    syncStatus: 'idle',
    onOpenAuthModal: vi.fn(),
    onSignOut: vi.fn(),
    linkedUsernames: { anilist: 'ani_hero', kitsu: 'kitsu_hero', mal: 'mal_hero' },
    onLinkedUsernamesChange: vi.fn(),
    subscriptions: ['Crunchyroll'],
    onSubscriptionsChange: vi.fn(),
    streamingBoost: false,
    onStreamingBoostChange: vi.fn(),
    titlePref: 'english',
    onTitlePrefChange: vi.fn(),
    onRefresh: vi.fn(),
    isLoading: false,
    onLogout: vi.fn(),
    provider: 'anilist',
  }

  it('renders all 5 main settings sections', () => {
    render(<SettingsPage {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /Conta.*Sincronização|Conta AniMatch/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Contas Vinculadas/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Streaming.*Assinaturas/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Preferências de Interface|Interface/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Dados da Lista/i })).toBeInTheDocument()
  })

  describe('Cloud Account & Auth', () => {
    it('renders login prompt and button when user is not logged in', () => {
      const onOpenAuthModal = vi.fn()
      render(<SettingsPage {...defaultProps} user={null} onOpenAuthModal={onOpenAuthModal} />)

      const loginBtn = screen.getByRole('button', { name: /entrar|sincronização em nuvem/i })
      expect(loginBtn).toBeInTheDocument()

      fireEvent.click(loginBtn)
      expect(onOpenAuthModal).toHaveBeenCalledTimes(1)
    })

    it('renders user email, sync badge and logout button when logged in', () => {
      const onSignOut = vi.fn()
      const user = { email: 'otaku@example.com' }
      const { rerender } = render(
        <SettingsPage
          {...defaultProps}
          user={user}
          syncStatus="synced"
          onSignOut={onSignOut}
        />
      )

      expect(screen.getByText('otaku@example.com')).toBeInTheDocument()
      expect(screen.getByText(/sincronizado na nuvem/i)).toBeInTheDocument()

      rerender(
        <SettingsPage
          {...defaultProps}
          user={user}
          syncStatus="syncing"
          onSignOut={onSignOut}
        />
      )
      expect(screen.getByText(/sincronizando/i)).toBeInTheDocument()

      const signOutBtn = screen.getByRole('button', { name: /sair da conta/i })
      expect(signOutBtn).toBeInTheDocument()

      fireEvent.click(signOutBtn)
      expect(onSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('Linked Accounts', () => {
    it('renders provider inputs and triggers onLinkedUsernamesChange', () => {
      const onLinkedUsernamesChange = vi.fn()
      render(
        <SettingsPage
          {...defaultProps}
          linkedUsernames={{ anilist: 'ani_hero', kitsu: 'kitsu_hero', mal: 'mal_hero' }}
          onLinkedUsernamesChange={onLinkedUsernamesChange}
        />
      )

      const anilistInput = screen.getByLabelText(/usuário anilist/i)
      const kitsuInput = screen.getByLabelText(/usuário kitsu/i)
      const malInput = screen.getByLabelText(/usuário myanimelist/i)

      expect(anilistInput).toHaveValue('ani_hero')
      expect(kitsuInput).toHaveValue('kitsu_hero')
      expect(malInput).toHaveValue('mal_hero')

      fireEvent.change(anilistInput, { target: { value: 'new_ani' } })
      expect(onLinkedUsernamesChange).toHaveBeenCalledWith({
        anilist: 'new_ani',
        kitsu: 'kitsu_hero',
        mal: 'mal_hero',
      })
    })

    it('allows syncing and unlinking individual providers', () => {
      const onRefreshProvider = vi.fn()
      const onLinkedUsernamesChange = vi.fn()
      render(
        <SettingsPage
          {...defaultProps}
          linkedUsernames={{ anilist: 'ani_hero', kitsu: 'kitsu_hero', mal: '' }}
          onRefreshProvider={onRefreshProvider}
          onLinkedUsernamesChange={onLinkedUsernamesChange}
        />
      )

      // Sync button for AniList
      const aniSyncBtn = screen.getByTitle('Sincronizar AniList')
      expect(aniSyncBtn).not.toBeDisabled()
      fireEvent.click(aniSyncBtn)
      expect(onRefreshProvider).toHaveBeenCalledWith('anilist')

      // Sync button for empty MAL should be disabled
      const malSyncBtn = screen.getByTitle('Sincronizar MyAnimeList')
      expect(malSyncBtn).toBeDisabled()

      // Unlink button for Kitsu
      const kitsuUnlinkBtn = screen.getByTitle('Desvincular conta do Kitsu')
      expect(kitsuUnlinkBtn).toBeInTheDocument()
      fireEvent.click(kitsuUnlinkBtn)
      expect(onLinkedUsernamesChange).toHaveBeenCalledWith({
        anilist: 'ani_hero',
        kitsu: '',
        mal: '',
      })
    })
  })

  describe('Streaming & Subscriptions', () => {
    it('renders all streaming checkboxes and toggles them', () => {
      const onSubscriptionsChange = vi.fn()
      render(
        <SettingsPage
          {...defaultProps}
          subscriptions={['Netflix']}
          onSubscriptionsChange={onSubscriptionsChange}
        />
      )

      STREAMING_SERVICES.forEach((service) => {
        expect(screen.getByRole('checkbox', { name: service })).toBeInTheDocument()
      })

      const crunchyrollCb = screen.getByRole('checkbox', { name: 'Crunchyroll' })
      expect(crunchyrollCb).not.toBeChecked()
      fireEvent.click(crunchyrollCb)
      expect(onSubscriptionsChange).toHaveBeenCalledWith(['Netflix', 'Crunchyroll'])

      const netflixCb = screen.getByRole('checkbox', { name: 'Netflix' })
      expect(netflixCb).toBeChecked()
      fireEvent.click(netflixCb)
      expect(onSubscriptionsChange).toHaveBeenCalledWith([])
    })

    it('renders streaming boost toggle and updates on change', () => {
      const onStreamingBoostChange = vi.fn()
      const { rerender } = render(
        <SettingsPage
          {...defaultProps}
          streamingBoost={false}
          onStreamingBoostChange={onStreamingBoostChange}
        />
      )

      const boostCheckbox = screen.getByRole('checkbox', {
        name: /priorizar no ranking/i,
      })
      expect(boostCheckbox).not.toBeChecked()

      fireEvent.click(boostCheckbox)
      expect(onStreamingBoostChange).toHaveBeenCalledWith(true)

      rerender(
        <SettingsPage
          {...defaultProps}
          streamingBoost={true}
          onStreamingBoostChange={onStreamingBoostChange}
        />
      )
      expect(boostCheckbox).toBeChecked()
    })
  })

  describe('Interface Preferences', () => {
    it('allows changing title preference', () => {
      const onTitlePrefChange = vi.fn()
      render(
        <SettingsPage
          {...defaultProps}
          titlePref="english"
          onTitlePrefChange={onTitlePrefChange}
        />
      )

      const titleSelect = screen.getByLabelText(/título dos animes/i)
      expect(titleSelect).toHaveValue('english')

      fireEvent.change(titleSelect, { target: { value: 'romaji' } })
      expect(onTitlePrefChange).toHaveBeenCalledWith('romaji')
    })

    it('renders theme switcher and language selector', () => {
      render(<SettingsPage {...defaultProps} />)
      expect(screen.getByText(/tema/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/idioma/i)).toBeInTheDocument()
    })
  })

  describe('List Data & Actions', () => {
    it('renders single-provider sync button and logout button when 1 account is active', () => {
      const onRefresh = vi.fn()
      const onLogout = vi.fn()
      const { rerender } = render(
        <SettingsPage
          {...defaultProps}
          linkedUsernames={{ anilist: 'ani_hero', kitsu: '', mal: '' }}
          provider="anilist"
          isLoading={false}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />
      )

      const syncBtn = screen.getByRole('button', { name: /sincronizar anilist/i })
      expect(syncBtn).toBeInTheDocument()
      expect(syncBtn).not.toBeDisabled()
      fireEvent.click(syncBtn)
      expect(onRefresh).toHaveBeenCalledTimes(1)

      const logoutBtn = screen.getByRole('button', { name: /trocar de conta/i })
      expect(logoutBtn).toBeInTheDocument()
      fireEvent.click(logoutBtn)
      expect(onLogout).toHaveBeenCalledTimes(1)

      rerender(
        <SettingsPage
          {...defaultProps}
          linkedUsernames={{ anilist: 'ani_hero', kitsu: '', mal: '' }}
          provider="anilist"
          isLoading={true}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />
      )
      const syncingBtn = screen.getByRole('button', { name: /sincronizando com anilist/i })
      expect(syncingBtn).toBeDisabled()
    })

    it('renders sync all button and disconnect session button when multi-provider is active', () => {
      const onRefresh = vi.fn()
      const onLogout = vi.fn()
      const { rerender } = render(
        <SettingsPage
          {...defaultProps}
          linkedUsernames={{ anilist: 'ani_hero', kitsu: 'kitsu_hero', mal: 'mal_hero' }}
          isLoading={false}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />
      )

      const syncAllBtn = screen.getByRole('button', { name: /sincronizar todos os provedores/i })
      expect(syncAllBtn).toBeInTheDocument()
      expect(syncAllBtn).not.toBeDisabled()
      fireEvent.click(syncAllBtn)
      expect(onRefresh).toHaveBeenCalledTimes(1)

      const disconnectBtn = screen.getByRole('button', { name: /desconectar sessão atual/i })
      expect(disconnectBtn).toBeInTheDocument()
      fireEvent.click(disconnectBtn)
      expect(onLogout).toHaveBeenCalledTimes(1)

      rerender(
        <SettingsPage
          {...defaultProps}
          linkedUsernames={{ anilist: 'ani_hero', kitsu: 'kitsu_hero', mal: 'mal_hero' }}
          isLoading={true}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />
      )
      const syncingAllBtn = screen.getByRole('button', { name: /sincronizando todos os provedores/i })
      expect(syncingAllBtn).toBeDisabled()
    })
  })
})
