import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsMenu from './SettingsMenu.jsx'
import { STREAMING_SERVICES } from '../logic/streaming.js'

describe('SettingsMenu', () => {

  it('renders sync button text based on provider', () => {
    const onRefresh = vi.fn()
    const { rerender } = render(<SettingsMenu provider="anilist" isLoading={false} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: /Configura/i }))
    expect(screen.getByRole('button', { name: /Sincronizar AniList/i })).toBeInTheDocument()

    rerender(<SettingsMenu provider="kitsu" isLoading={false} onRefresh={onRefresh} />)
    expect(screen.getByRole('button', { name: /Sincronizar Kitsu/i })).toBeInTheDocument()
    
    rerender(<SettingsMenu provider="kitsu" isLoading={true} onRefresh={onRefresh} />)
    expect(screen.getByRole('button', { name: /Sincronizando com Kitsu/i })).toBeInTheDocument()
  })

  it('renders a gear button and keeps the panel hidden until clicked', () => {
    render(<SettingsMenu />)
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the settings panel when the gear button is clicked', () => {
    render(<SettingsMenu />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders all streaming services checkboxes and handles toggling', () => {
    const onSubscriptionsChange = vi.fn()
    render(
      <SettingsMenu
        subscriptions={['Netflix']}
        onSubscriptionsChange={onSubscriptionsChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))

    STREAMING_SERVICES.forEach((service) => {
      const checkbox = screen.getByRole('checkbox', { name: service })
      expect(checkbox).toBeInTheDocument()
      if (service === 'Netflix') {
        expect(checkbox).toBeChecked()
      } else {
        expect(checkbox).not.toBeChecked()
      }
    })

    // Click Crunchyroll to add
    const crunchyrollCb = screen.getByRole('checkbox', { name: 'Crunchyroll' })
    fireEvent.click(crunchyrollCb)
    expect(onSubscriptionsChange).toHaveBeenCalledWith(['Netflix', 'Crunchyroll'])

    // Click Netflix to remove
    const netflixCb = screen.getByRole('checkbox', { name: 'Netflix' })
    fireEvent.click(netflixCb)
    expect(onSubscriptionsChange).toHaveBeenCalledWith([])
  })

  it('renders streaming boost toggle checkbox and calls onStreamingBoostChange', () => {
    const onStreamingBoostChange = vi.fn()
    const { rerender } = render(
      <SettingsMenu
        streamingBoost={false}
        onStreamingBoostChange={onStreamingBoostChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))

    const boostCheckbox = screen.getByRole('checkbox', {
      name: /priorizar no ranking/i,
    })
    expect(boostCheckbox).toBeInTheDocument()
    expect(boostCheckbox).not.toBeChecked()

    fireEvent.click(boostCheckbox)
    expect(onStreamingBoostChange).toHaveBeenCalledWith(true)

    rerender(
      <SettingsMenu
        streamingBoost={true}
        onStreamingBoostChange={onStreamingBoostChange}
      />
    )
    expect(boostCheckbox).toBeChecked()
  })

  describe('Cloud Account & Auth', () => {
    it('renders login prompt when user is not authenticated and opens modal on click', () => {
      const onOpenAuthModal = vi.fn()
      render(<SettingsMenu user={null} onOpenAuthModal={onOpenAuthModal} />)
      fireEvent.click(screen.getByRole('button', { name: /configurações/i }))

      const loginBtn = screen.getByRole('button', { name: /entrar|sincronização em nuvem/i })
      expect(loginBtn).toBeInTheDocument()

      fireEvent.click(loginBtn)
      expect(onOpenAuthModal).toHaveBeenCalledTimes(1)
    })

    it('renders user email, sync status badge, and sign out button when logged in', () => {
      const onSignOut = vi.fn()
      const user = { email: 'otaku@example.com' }
      const { rerender } = render(
        <SettingsMenu
          user={user}
          syncStatus="synced"
          onSignOut={onSignOut}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /configurações/i }))

      expect(screen.getByText('otaku@example.com')).toBeInTheDocument()
      expect(screen.getByText(/sincronizado na nuvem/i)).toBeInTheDocument()

      rerender(
        <SettingsMenu
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
    it('renders inputs for AniList, Kitsu, and MyAnimeList and triggers onLinkedUsernamesChange', () => {
      const onLinkedUsernamesChange = vi.fn()
      const linkedUsernames = {
        anilist: 'ani_user',
        kitsu: 'kitsu_user',
        mal: 'mal_user',
      }

      render(
        <SettingsMenu
          linkedUsernames={linkedUsernames}
          onLinkedUsernamesChange={onLinkedUsernamesChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /configurações/i }))

      const anilistInput = screen.getByLabelText(/usuário anilist/i)
      const kitsuInput = screen.getByLabelText(/usuário kitsu/i)
      const malInput = screen.getByLabelText(/usuário myanimelist/i)

      expect(anilistInput).toHaveValue('ani_user')
      expect(kitsuInput).toHaveValue('kitsu_user')
      expect(malInput).toHaveValue('mal_user')

      fireEvent.change(anilistInput, { target: { value: 'new_ani' } })
      expect(onLinkedUsernamesChange).toHaveBeenCalledWith({
        anilist: 'new_ani',
        kitsu: 'kitsu_user',
        mal: 'mal_user',
      })

      fireEvent.change(kitsuInput, { target: { value: 'new_kitsu' } })
      expect(onLinkedUsernamesChange).toHaveBeenCalledWith({
        anilist: 'ani_user',
        kitsu: 'new_kitsu',
        mal: 'mal_user',
      })

      fireEvent.change(malInput, { target: { value: 'new_mal' } })
      expect(onLinkedUsernamesChange).toHaveBeenCalledWith({
        anilist: 'ani_user',
        kitsu: 'kitsu_user',
        mal: 'new_mal',
      })
    })
  })
})


