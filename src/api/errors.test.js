import { describe, it, expect } from 'vitest'
import {
  ProviderError,
  RetryableError,
  NonRetryableError,
  UserNotFoundError,
  PrivateListError,
  RateLimitError,
} from '../../src/api/errors.js'

describe('Custom API Errors', () => {
  it('instantiates ProviderError with defaults', () => {
    const err = new ProviderError('Test error')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.name).toBe('ProviderError')
    expect(err.isRetryable).toBe(false)
    expect(err.message).toBe('Test error')
  })

  it('instantiates RetryableError as retryable', () => {
    const err = new RetryableError('Conexão falhou')
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.name).toBe('RetryableError')
    expect(err.isRetryable).toBe(true)
  })

  it('instantiates NonRetryableError as non-retryable', () => {
    const err = new NonRetryableError('Regra de negócio violada')
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.name).toBe('NonRetryableError')
    expect(err.isRetryable).toBe(false)
  })

  it('instantiates UserNotFoundError with provider name', () => {
    const err = new UserNotFoundError('AniList')
    expect(err).toBeInstanceOf(NonRetryableError)
    expect(err.name).toBe('UserNotFoundError')
    expect(err.message).toBe('Usuário não encontrado no AniList.')
    expect(err.isRetryable).toBe(false)
  })

  it('instantiates PrivateListError', () => {
    const err = new PrivateListError('AniList')
    expect(err).toBeInstanceOf(NonRetryableError)
    expect(err.name).toBe('PrivateListError')
    expect(err.message).toBe('A lista deste usuário é privada.')
    expect(err.isRetryable).toBe(false)
  })

  it('instantiates RateLimitError with custom minutes', () => {
    const err = new RateLimitError('AniList', 1)
    expect(err).toBeInstanceOf(NonRetryableError)
    expect(err.name).toBe('RateLimitError')
    expect(err.message).toContain('O AniList bloqueou temporariamente a requisição (403)')
    expect(err.isRetryable).toBe(false)
  })
})
