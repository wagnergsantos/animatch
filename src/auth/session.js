/**
 * Camada `auth/`: wrapper fino sobre o cliente de autenticação (Supabase Auth).
 * Não decide UI nem redireciona — só expõe estado de sessão e helpers puros
 * para quem precisar (api/, cache/, components/).
 *
 * Auth entra como estrutura pronta (mesmo padrão do template em
 * arquitetura_inicial/template/src/auth/session.js), mas o AniMatch hoje não
 * tem nenhuma tela de login/escrita que dependa disso — fica pronto pra ser
 * ligado quando o app ganhar dados pessoais no Supabase (ex.: perfil de
 * gosto salvo por usuário, em vez de só localStorage local).
 */
import { supabaseClient } from '../supabase.js'

/** Retorna a sessão atual (ou null se não houver usuário logado). */
export async function getSession() {
  const { data } = await supabaseClient.auth.getSession()
  return data.session
}

/**
 * Registra um listener de mudança de sessão (login/logout/refresh de token).
 * Retorna uma função de unsubscribe.
 */
export function onAuthStateChange(callback) {
  const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}

export async function signOut() {
  await supabaseClient.auth.signOut()
}

/** Extrai o user id de uma sessão, ou null. */
export function getUserId(session) {
  return session?.user?.id ?? null
}
