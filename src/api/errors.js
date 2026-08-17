export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = this.constructor.name
    this.isRetryable = options.isRetryable ?? false
    if (options.cause) {
      this.cause = options.cause
    }
  }
}

export class RetryableError extends ProviderError {
  constructor(message = 'Erro temporário de conexão.', options = {}) {
    super(message, { ...options, isRetryable: true })
  }
}

export class NonRetryableError extends ProviderError {
  constructor(message = 'Erro não retentável.', options = {}) {
    super(message, { ...options, isRetryable: false })
  }
}

export class UserNotFoundError extends NonRetryableError {
  constructor(providerName = 'provedor') {
    super(`Usuário não encontrado no ${providerName}.`)
  }
}

export class PrivateListError extends NonRetryableError {
  constructor(_providerName = 'provedor') {
    super(`A lista deste usuário é privada.`)
  }
}

export class RateLimitError extends NonRetryableError {
  constructor(providerName = 'provedor', retryAfterMinutes = 1) {
    super(`O ${providerName} bloqueou temporariamente a requisição (403). Tente novamente em ${retryAfterMinutes} minuto.`)
  }
}
