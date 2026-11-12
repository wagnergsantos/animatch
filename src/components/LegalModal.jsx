import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useModalFocusTrap } from '../hooks/useModalFocusTrap.js'
import styles from './LegalModal.module.css'

export default function LegalModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('about')
  const modalRef = useRef(null)

  useModalFocusTrap(Boolean(isOpen), modalRef, onClose)

  if (!isOpen) return null

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      data-testid="legal-modal-overlay"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id="legal-modal-title" className={styles.title}>
            {t('legal.modalTitle', 'Sobre, Privacidade & Termos')}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t('auth.close', 'Fechar')}
          >
            ✕
          </button>
        </header>

        <nav className={styles.tabs} role="tablist" aria-label="Seções legais">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            aria-controls="panel-about"
            id="tab-about"
            className={`${styles.tabBtn} ${activeTab === 'about' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('about')}
          >
            Sobre o AniMatch
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'privacy'}
            aria-controls="panel-privacy"
            id="tab-privacy"
            className={`${styles.tabBtn} ${activeTab === 'privacy' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Política de Privacidade
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'terms'}
            aria-controls="panel-terms"
            id="tab-terms"
            className={`${styles.tabBtn} ${activeTab === 'terms' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('terms')}
          >
            Termos de Uso
          </button>
        </nav>

        <div className={styles.body}>
          {activeTab === 'about' && (
            <div id="panel-about" role="tabpanel" aria-labelledby="tab-about" className={styles.section}>
              <h3 className={styles.sectionTitle}>1. O que é o AniMatch</h3>
              <p className={styles.paragraph}>
                O AniMatch é uma ferramenta independente, gratuita e sem fins comerciais, desenvolvida para analisar preferências pessoais e oferecer recomendações personalizadas de animes.
              </p>
              <p className={styles.paragraph}>
                A ferramenta consulta listas públicas disponibilizadas pelos próprios usuários em plataformas compatíveis, como AniList, Kitsu e MyAnimeList.
              </p>
              <p className={styles.paragraph}>
                A partir dessas informações, o AniMatch analisa os animes concluídos ou em andamento, as avaliações pessoais atribuídas pelo usuário e as avaliações da comunidade. Com esses dados, calcula indicadores de afinidade por gêneros e outras características, como formato e país de origem.
              </p>
              <p className={styles.paragraph}>
                Esses indicadores são utilizados para organizar e ordenar a lista de animes que o usuário deseja assistir (<em>Plan to Watch</em>), sugerindo títulos que apresentam maior compatibilidade com suas preferências.
              </p>
              <p className={styles.paragraph}>
                O AniMatch não é uma plataforma de streaming, não hospeda episódios, não administra as listas originais dos usuários e não altera os dados nas plataformas de origem.
              </p>

              <h3 className={styles.sectionTitle}>2. Fontes de dados e propriedade intelectual</h3>
              <p className={styles.paragraph}>
                As informações sobre animes são obtidas por meio de APIs e serviços disponibilizados por plataformas de terceiros, incluindo AniList, Kitsu e MyAnimeList.
              </p>
              <p className={styles.paragraph}>
                Essas informações podem incluir identificadores, títulos, gêneros, formatos, quantidade de episódios, avaliações da comunidade e referências a imagens e serviços de streaming.
              </p>
              <p className={styles.paragraph}>
                O AniMatch não reivindica propriedade sobre os títulos, personagens, marcas, imagens, obras ou demais conteúdos pertencentes a terceiros. Os direitos autorais e demais direitos de propriedade intelectual permanecem com seus respectivos titulares.
              </p>
              <p className={styles.paragraph}>
                O AniMatch não armazena arquivos de imagens de capas nem textos de sinopses em seu banco de dados. Referências e metadados necessários ao funcionamento da ferramenta podem ser armazenados temporariamente no navegador ou sincronizados em nuvem, conforme as opções escolhidas pelo usuário.
              </p>
              <p className={styles.paragraph}>
                O uso das informações fornecidas pelas plataformas externas está sujeito às condições e aos termos aplicáveis de cada fornecedor.
              </p>

              <h3 className={styles.sectionTitle}>3. Independência</h3>
              <p className={styles.paragraph}>
                O AniMatch é um projeto independente e não possui vínculo, parceria, patrocínio ou endosso oficial do AniList, Kitsu ou MyAnimeList. Os nomes e as marcas dessas plataformas são mencionados exclusivamente para identificar os serviços com os quais o AniMatch pode interagir.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy" className={styles.section}>
              <h3 className={styles.sectionTitle}>Política de Privacidade</h3>
              <p className={styles.lastUpdated}>Última atualização: 12 de novembro de 2026</p>
              <p className={styles.paragraph}>
                Esta Política de Privacidade explica como o AniMatch coleta, consulta, utiliza, armazena e protege informações durante a utilização do serviço. O AniMatch busca limitar o tratamento de informações ao necessário para oferecer suas funcionalidades de análise de preferências e recomendação personalizada.
              </p>

              <h4 className={styles.subHeading}>1. Responsável pelo tratamento</h4>
              <p className={styles.paragraph}>
                O responsável pelo AniMatch e pelo tratamento de dados pessoais realizado no âmbito do serviço é:
              </p>
              <p className={styles.paragraph}>
                <strong>Controlador:</strong> Wagner Santos<br />
                <strong>Canal para solicitações de privacidade e proteção de dados:</strong>{' '}
                <a href="https://github.com/wagnergsantos/animatch/issues" target="_blank" rel="noopener noreferrer">
                  github.com/wagnergsantos/animatch/issues
                </a>
              </p>
              <p className={styles.paragraph}>
                Para solicitações relacionadas à privacidade, recomenda-se utilizar o canal indicado acima, evitando o envio de informações sensíveis em espaços públicos.
              </p>

              <h4 className={styles.subHeading}>2. Informações consultadas nas plataformas externas</h4>
              <p className={styles.paragraph}>
                Para realizar as análises e recomendações, o AniMatch consulta listas públicas de animes disponibilizadas pelo próprio usuário nas plataformas compatíveis. A consulta pode incluir:
              </p>
              <ul className={styles.list}>
                <li>Identificadores dos animes;</li>
                <li>Títulos, incluindo versões romaji e em inglês;</li>
                <li>Gêneros;</li>
                <li>Formato, como TV e filme;</li>
                <li>Quantidade de episódios;</li>
                <li>Status de visualização, como concluído, assistindo e planejado;</li>
                <li>Nota pessoal atribuída pelo usuário;</li>
                <li>Nota média da comunidade;</li>
                <li>Referências de capas;</li>
                <li>Links relacionados a serviços de streaming.</li>
              </ul>
              <p className={styles.paragraph}>
                A consulta depende da disponibilidade pública das listas e do funcionamento das APIs e serviços de terceiros. O AniMatch também permite pesquisar listas públicas de outros usuários; essas listas podem ser consultadas para análise, mas não são enviadas à nuvem do AniMatch sem o vínculo explícito da conta pelo titular.
              </p>

              <h4 className={styles.subHeading}>3. Armazenamento local no navegador</h4>
              <p className={styles.paragraph}>
                As informações consultadas são normalizadas e armazenadas localmente no navegador do usuário, utilizando:
              </p>
              <ul className={styles.list}>
                <li><strong>IndexedDB:</strong> armazenamento das listas de animes e informações associadas;</li>
                <li><strong>localStorage:</strong> armazenamento de configurações, preferências e um espelho recente do cache.</li>
              </ul>
              <p className={styles.paragraph}>
                O armazenamento local pode incluir dados normalizados das listas consultadas, referências de capas, links de streaming, usernames vinculados, serviços de streaming selecionados, preferências de tema e idioma, e até os cinco últimos usernames pesquisados na busca inicial.
              </p>
              <p className={styles.paragraph}>
                O cache das listas possui prazo de validade de até seis horas, podendo ser atualizado por nova sincronização ou removido pelos controles de limpeza disponibilizados pelo aplicativo. O armazenamento local não significa que essas informações sejam automaticamente enviadas ao servidor do AniMatch.
              </p>

              <h4 className={styles.subHeading}>4. Sincronização em nuvem</h4>
              <p className={styles.paragraph}>
                A sincronização em nuvem é opcional e depende de duas condições: (1) o usuário deve estar autenticado em sua conta AniMatch; e (2) o usuário deve ter vinculado explicitamente a conta da plataforma externa como sendo de sua titularidade.
              </p>
              <p className={styles.paragraph}>
                <strong>Usuários visitantes:</strong> não têm suas listas copiadas para a nuvem; os dados permanecem estritamente locais no navegador.
              </p>
              <p className={styles.paragraph}>
                <strong>Usuários autenticados sem contas vinculadas:</strong> podem pesquisar listas públicas de terceiros sem que esses dados sejam enviados à nuvem.
              </p>
              <p className={styles.paragraph}>
                <strong>Usuários autenticados com contas vinculadas:</strong> ao confirmar o vínculo, o AniMatch habilita a sincronização daquela lista em segundo plano no Supabase, permitindo persistência entre dispositivos. A confirmação de vínculo representa uma declaração do usuário de que aquela conta externa é sua.
              </p>

              <h4 className={styles.subHeading}>5. Informações armazenadas na nuvem</h4>
              <p className={styles.paragraph}>
                A infraestrutura de nuvem utiliza o Supabase. Quando o usuário ativa a sincronização, podem ser armazenados:
              </p>
              <ul className={styles.list}>
                <li><strong>Preferências e configurações:</strong> usernames vinculados, tema, idioma, serviços de streaming selecionados.</li>
                <li><strong>Listas vinculadas:</strong> plataforma, username, identificadores de animes, avaliações pessoais, status e metadados necessários.</li>
                <li><strong>Autenticação:</strong> endereço de e-mail, credenciais criptografadas de autenticação e registros técnicos de aceite dos Termos de Uso (versão e timestamp).</li>
              </ul>

              <h4 className={styles.subHeading}>6. Processamento das recomendações</h4>
              <p className={styles.paragraph}>
                O perfil de gosto do usuário e os indicadores de afinidade são calculados diretamente no navegador durante a execução do aplicativo. Esses resultados (afinidade por gênero, pontuações estimadas e ordenação) são processados em memória RAM e não são gravados permanentemente no armazenamento local nem enviados ao banco de dados em nuvem.
              </p>

              <h4 className={styles.subHeading}>7. Finalidades do tratamento</h4>
              <p className={styles.paragraph}>
                As informações são utilizadas para consultar listas públicas, identificar preferências individuais, calcular afinidades estatísticas, gerar recomendações personalizadas, permitir sincronização multi-dispositivo e proteger o acesso às funcionalidades. O AniMatch não comercializa listas pessoais, avaliações individuais ou perfis de gosto.
              </p>

              <h4 className={styles.subHeading}>8. Cookies e tecnologias de armazenamento</h4>
              <p className={styles.paragraph}>
                O AniMatch utiliza apenas recursos de armazenamento do próprio navegador (localStorage e IndexedDB) estritamente necessários ao funcionamento. O AniMatch não utiliza cookies publicitários nem ferramentas de rastreamento de terceiros para publicidade comportamental.
              </p>

              <h4 className={styles.subHeading}>9. Compartilhamento de informações</h4>
              <p className={styles.paragraph}>
                O AniMatch não vende dados pessoais. As informações podem ser processadas por fornecedores tecnológicos estritamente necessários: Supabase (autenticação e banco de dados), Google (autenticação OAuth, quando acionada), GitHub Pages (hospedagem) e provedores AniList, Kitsu e MyAnimeList (fornecimento de metadados públicos).
              </p>

              <h4 className={styles.subHeading}>10. Armazenamento e transferência internacional</h4>
              <p className={styles.paragraph}>
                O banco de dados principal do AniMatch utiliza infraestrutura do Supabase configurada na região sa-east-1 (São Paulo, Brasil). Serviços complementares envolvidos na hospedagem e autenticação podem realizar tratamentos sob salvaguardas contratuais adequadas (SCCs), em conformidade com a LGPD e regulamentações da ANPD.
              </p>

              <h4 className={styles.subHeading}>11. Segurança das informações</h4>
              <p className={styles.paragraph}>
                Adotamos medidas técnicas e organizacionais como regras de segurança no banco de dados (RLS), criptografia em trânsito (HTTPS), controle de acesso e isolamento de chaves. Nenhum sistema é absolutamente imune a riscos, portanto não é possível garantir segurança integral contra todas as ameaças.
              </p>

              <h4 className={styles.subHeading}>12. Direitos dos titulares (LGPD)</h4>
              <p className={styles.paragraph}>
                Nos termos da LGPD (Art. 18), você pode solicitar: confirmação de tratamento, acesso, correção, eliminação de dados tratados com consentimento, revogação do consentimento e informações sobre compartilhamento. As solicitações podem ser feitas pelo canal oficial no GitHub.
              </p>

              <h4 className={styles.subHeading}>13. Exclusão de dados</h4>
              <p className={styles.paragraph}>
                Você pode limpar seus dados locais a qualquer momento pelo botão "Limpar dados locais do navegador". Contas na nuvem podem ser permanentemente excluídas (junto a todas as listas vinculadas) pelo botão "Excluir minha conta e dados da nuvem" nas Configurações.
              </p>

              <h4 className={styles.subHeading}>14. Alterações nesta política</h4>
              <p className={styles.paragraph}>
                Esta Política de Privacidade poderá ser atualizada para refletir novas funcionalidades ou mudanças regulatórias. A versão vigente estará sempre publicada nesta seção.
              </p>

              <h4 className={styles.subHeading}>15. Contato</h4>
              <p className={styles.paragraph}>
                Para dúvidas ou solicitações sobre proteção de dados pessoais:{' '}
                <a href="https://github.com/wagnergsantos/animatch/issues" target="_blank" rel="noopener noreferrer">
                  github.com/wagnergsantos/animatch/issues
                </a>
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div id="panel-terms" role="tabpanel" aria-labelledby="tab-terms" className={styles.section}>
              <h3 className={styles.sectionTitle}>Termos de Uso</h3>
              <p className={styles.lastUpdated}>Última atualização: 12 de novembro de 2026</p>
              <p className={styles.paragraph}>
                Ao utilizar o AniMatch, o usuário declara que leu e compreendeu estes Termos de Uso.
              </p>

              <h4 className={styles.subHeading}>1. Sobre o serviço</h4>
              <p className={styles.paragraph}>
                O AniMatch é uma ferramenta independente de análise de preferências e recomendação personalizada de animes. O serviço não hospeda, transmite ou disponibiliza episódios de animes e não substitui as plataformas de origem das listas.
              </p>

              <h4 className={styles.subHeading}>2. Condições de utilização</h4>
              <p className={styles.paragraph}>
                Para utilizar as consultas, o usuário deve disponibilizar uma lista pública nas plataformas compatíveis. A utilização de recursos de sincronização depende de criação de conta. O usuário é responsável pelas informações fornecidas e não deve vincular contas de terceiros como se fossem suas.
              </p>

              <h4 className={styles.subHeading}>3. Vínculo de contas e sincronização</h4>
              <p className={styles.paragraph}>
                A sincronização em nuvem é opcional e exige confirmação explícita de titularidade. Listas públicas consultadas sem vínculo permanecem armazenadas apenas localmente no navegador.
              </p>

              <h4 className={styles.subHeading}>4. Idade mínima</h4>
              <p className={styles.paragraph}>
                O AniMatch estabelece, como política própria de utilização de contas em nuvem, a idade mínima de 16 anos. O tratamento de dados pessoais de crianças e adolescentes observa as exigências legais aplicáveis, especialmente o princípio do melhor interesse.
              </p>

              <h4 className={styles.subHeading}>5. Uso das plataformas externas</h4>
              <p className={styles.paragraph}>
                O AniMatch depende das APIs e termos de AniList, Kitsu e MyAnimeList. O AniMatch não controla os serviços externos nem garante a permanência ininterrupta de suas integrações.
              </p>

              <h4 className={styles.subHeading}>6. Recomendações e resultados</h4>
              <p className={styles.paragraph}>
                As recomendações são produzidas por cálculos estatísticos e constituem estimativas, não garantias de qualidade ou previsões absolutas. O usuário permanece livre para escolher quais animes deseja assistir.
              </p>

              <h4 className={styles.subHeading}>7. Propriedade intelectual</h4>
              <p className={styles.paragraph}>
                A identidade visual, código e elementos originais do AniMatch são protegidos pela legislação de propriedade intelectual. Títulos, marcas e artes pertencem aos seus respectivos titulares.
              </p>

              <h4 className={styles.subHeading}>8. Disponibilidade e limitações</h4>
              <p className={styles.paragraph}>
                O serviço é disponibilizado gratuitamente "no estado em que se encontra" (<em>as is</em>). Não há garantia de funcionamento ininterrupto ou compatibilidade permanente com todos os navegadores.
              </p>

              <h4 className={styles.subHeading}>9. Responsabilidades</h4>
              <p className={styles.paragraph}>
                O usuário é responsável por suas credenciais e pelo uso em conformidade com a legislação. O AniMatch não se responsabiliza por indisponibilidades de terceiros nem por decisões tomadas exclusivamente com base nas notas estimadas.
              </p>

              <h4 className={styles.subHeading}>10. Privacidade e proteção de dados</h4>
              <p className={styles.paragraph}>
                O tratamento de dados pessoais segue a Política de Privacidade do AniMatch, que integra estes Termos.
              </p>

              <h4 className={styles.subHeading}>11. Encerramento da conta</h4>
              <p className={styles.paragraph}>
                O usuário pode deixar de utilizar o serviço ou solicitar a exclusão de sua conta e dados a qualquer momento nas Configurações.
              </p>

              <h4 className={styles.subHeading}>12. Alterações dos Termos</h4>
              <p className={styles.paragraph}>
                Estes Termos podem ser atualizados para refletir melhorias do serviço. A versão vigente estará sempre publicada nesta página.
              </p>

              <h4 className={styles.subHeading}>13. Legislação aplicável</h4>
              <p className={styles.paragraph}>
                Estes Termos são interpretados de acordo com as leis da República Federativa do Brasil.
              </p>

              <h4 className={styles.subHeading}>14. Contato</h4>
              <p className={styles.paragraph}>
                Para dúvidas e suporte geral:{' '}
                <a href="https://github.com/wagnergsantos/animatch/issues" target="_blank" rel="noopener noreferrer">
                  github.com/wagnergsantos/animatch/issues
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
