/**
 * Camada `auth/`: wrapper fino sobre o cliente de autenticação (Supabase Auth).
 * Não decide UI nem redireciona — só expõe estado de sessão e helpers puros
 * para quem precisar (api/, cache/, components/, hooks/).
 */
import { supabaseClient } from '../supabase.js'

/** Retorna a sessão atual (ou null se não houver usuário logado). */
export async function getSession() {
  const { data } = await supabaseClient.auth.getSession()
  return data?.session ?? null
}

/**
 * Registra um listener de mudança de sessão (login/logout/refresh de token).
 * Retorna uma função de unsubscribe.
 */
export function onAuthStateChange(callback) {
  const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data?.subscription?.unsubscribe()
}

/** Autentica um usuário existente com e-mail e senha. */
export async function signInWithPassword(credentials) {
  return supabaseClient.auth.signInWithPassword(credentials)
}

/** Cria uma nova conta de usuário com e-mail e senha. */
export async function signUpWithPassword(credentials) {
  return supabaseClient.auth.signUp(credentials)
}

/** Autentica via provedor OAuth (ex: Google). */
export async function signInWithOAuth(options) {
  return supabaseClient.auth.signInWithOAuth(options)
}

/** Envia e-mail de recuperação de senha via Supabase Auth. */
export async function resetPasswordForEmail(email) {
  if (!supabaseClient?.auth?.resetPasswordForEmail) {
    return { data: null, error: new Error('Recuperação de senha indisponível.') }
  }
  return supabaseClient.auth.resetPasswordForEmail(email)
}

/** Encerra a sessão do usuário no Supabase Auth. */
export async function signOut() {
  return supabaseClient.auth.signOut()
}

/** Exclui permanentemente a própria conta e todos os dados na nuvem via RPC security definer. */
export async function deleteOwnAccount() {
  if (!supabaseClient?.rpc) return { error: new Error('RPC indisponível.') }
  return supabaseClient.rpc('delete_own_account')
}

/** Extrai o user id de uma sessão, ou null. */
export function getUserId(session) {
  return session?.user?.id ?? null
}
