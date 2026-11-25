import React from 'react'

export const legalContent = {
  'pt-BR': {
    about: {
      sections: [
        {
          title: '1. O que é o AniMatch',
          paragraphs: [
            'O AniMatch é uma ferramenta independente, gratuita e sem fins comerciais, desenvolvida para analisar preferências pessoais e oferecer recomendações personalizadas de animes.',
            'A ferramenta consulta listas públicas disponibilizadas pelos próprios usuários em plataformas compatíveis, como AniList, Kitsu e MyAnimeList.',
            'A partir dessas informações, o AniMatch analisa os animes concluídos ou em andamento, as avaliações pessoais atribuídas pelo usuário e as avaliações da comunidade. Com esses dados, calcula indicadores de afinidade por gêneros e outras características, como formato e país de origem.',
            'Esses indicadores são utilizados para organizar e ordenar a lista de animes que o usuário deseja assistir (Plan to Watch), sugerindo títulos que apresentam maior compatibilidade com suas preferências.',
            'O AniMatch não é uma plataforma de streaming, não hospeda episódios, não administra as listas originais dos usuários e não altera os dados nas plataformas de origem.',
          ],
        },
        {
          title: '2. Fontes de dados e propriedade intelectual',
          paragraphs: [
            'As informações sobre animes são obtidas por meio de APIs e serviços disponibilizados por plataformas de terceiros, incluindo AniList, Kitsu e MyAnimeList.',
            'Essas informações podem incluir identificadores, títulos, gêneros, formatos, quantidade de episódios, avaliações da comunidade e referências a imagens e serviços de streaming.',
            'O AniMatch não reivindica propriedade sobre os títulos, personagens, marcas, imagens, obras ou demais conteúdos pertencentes a terceiros. Os direitos autorais e demais direitos de propriedade intelectual permanecem com seus respectivos titulares.',
            'O AniMatch não armazena arquivos de imagens de capas nem textos de sinopses em seu banco de dados. Referências e metadados necessários ao funcionamento da ferramenta podem ser armazenados temporariamente no navegador ou sincronizados em nuvem, conforme as opções escolhidas pelo usuário.',
            'O uso das informações fornecidas pelas plataformas externas está sujeito às condições e aos termos aplicáveis de cada fornecedor.',
          ],
        },
        {
          title: '3. Independência',
          paragraphs: [
            'O AniMatch é um projeto independente e não possui vínculo, parceria, patrocínio ou endosso oficial do AniList, Kitsu ou MyAnimeList. Os nomes e as marcas dessas plataformas são mencionados exclusivamente para identificar os serviços com os quais o AniMatch pode interagir.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de Privacidade',
      lastUpdated: 'Última atualização: 24 de novembro de 2026',
      intro: 'Esta Política de Privacidade explica como o AniMatch coleta, consulta, utiliza, armazena e protege informações durante a utilização do serviço. O AniMatch busca limitar o tratamento de informações ao necessário para oferecer suas funcionalidades de análise de preferências e recomendação personalizada.',
      sections: [
        {
          title: '1. Responsável pelo tratamento',
          paragraphs: [
            'O responsável pelo AniMatch e pelo tratamento de dados pessoais realizado no âmbito do serviço é: Controlador: Wagner Santos. Canal para solicitações de privacidade e proteção de dados: github.com/wagnergsantos/animatch/issues.',
            'Para solicitações relacionadas à privacidade, recomenda-se utilizar o canal indicado acima, evitando o envio de informações sensíveis em espaços públicos.',
          ],
        },
        {
          title: '2. Informações consultadas nas plataformas externas',
          paragraphs: [
            'Para realizar as análises e recomendações, o AniMatch consulta listas públicas de animes disponibilizadas pelo próprio usuário nas plataformas compatíveis (identificadores, títulos, notas, gêneros, status de visualização).',
            'A consulta depende da disponibilidade pública das listas e do funcionamento das APIs de terceiros. Listas públicas de outros usuários pesquisadas não são enviadas à nuvem sem o vínculo explícito da conta pelo titular.',
          ],
        },
        {
          title: '3. Armazenamento local no navegador',
          paragraphs: [
            'As informações consultadas são normalizadas e armazenadas localmente no navegador do usuário utilizando IndexedDB (listas de animes e metadados) e localStorage (configurações, preferências de tema/idioma e últimos usuários pesquisados).',
            'O cache das listas possui prazo de validade de até seis horas, podendo ser atualizado por nova sincronização ou removido pelos controles de limpeza do aplicativo.',
          ],
        },
        {
          title: '4. Sincronização em nuvem e contas vinculadas',
          paragraphs: [
            'A sincronização em nuvem é opcional e exige que o usuário esteja autenticado e tenha vinculado explicitamente a conta da plataforma externa como sendo de sua titularidade.',
            'Usuários visitantes ou não vinculados têm seus dados estritamente locais no navegador (IndexedDB).',
          ],
        },
        {
          title: '5. Informações armazenadas na nuvem',
          paragraphs: [
            'Quando o usuário ativa a sincronização, podem ser armazenados no Supabase: preferências (tema, idioma, serviços de streaming), usernames vinculados, avaliações pessoais e credenciais criptografadas de login.',
          ],
        },
        {
          title: '6. Processamento das recomendações',
          paragraphs: [
            'O perfil de gosto do usuário e os indicadores de afinidade são calculados diretamente no navegador durante a execução do aplicativo em memória RAM, sem envio de perfil de preferência para servidores terceiros.',
          ],
        },
        {
          title: '7. Finalidades do tratamento',
          paragraphs: [
            'As informações são utilizadas estritamente para gerar recomendações personalizadas, permitir persistência multi-dispositivo e proteger o acesso às funcionalidades. O AniMatch não comercializa listas pessoais nem perfis de gosto.',
          ],
        },
        {
          title: '8. Cookies, Armazenamento Local e Publicidade',
          paragraphs: [
            'O AniMatch utiliza armazenamento local (localStorage e IndexedDB) necessário ao funcionamento. Pode exibir anúncios do Google AdSense, cujos parceiros podem utilizar cookies para personalizar publicidade conforme a política do Google.',
            'O usuário pode desativar anúncios personalizados acessando adssettings.google.com ou ajustando as preferências no navegador.',
          ],
        },
        {
          title: '9. Direitos dos titulares (LGPD)',
          paragraphs: [
            'Nos termos da LGPD (Art. 18), você pode solicitar confirmação de tratamento, acesso, correção, eliminação de dados e revogação de consentimento pelo canal oficial no GitHub.',
          ],
        },
        {
          title: '10. Exclusão de dados',
          paragraphs: [
            'Você pode limpar dados locais a qualquer momento pelo botão "Limpar dados locais". Contas na nuvem podem ser permanentemente excluídas na tela de Configurações ("Excluir minha conta e dados da nuvem").',
          ],
        },
      ],
    },
    terms: {
      title: 'Termos de Uso',
      lastUpdated: 'Última atualização: 24 de novembro de 2026',
      intro: 'Ao utilizar o AniMatch, o usuário declara que leu e compreendeu estes Termos de Uso.',
      sections: [
        {
          title: '1. Sobre o serviço',
          paragraphs: [
            'O AniMatch é uma ferramenta independente de análise de preferências e recomendação personalizada de animes. O serviço não hospeda, transmite ou disponibiliza episódios de animes e não substitui as plataformas de origem das listas.',
          ],
        },
        {
          title: '2. Condições de utilização',
          paragraphs: [
            'Para utilizar as consultas, o usuário deve disponibilizar uma lista pública nas plataformas compatíveis. O usuário é responsável pelas informações fornecidas e não deve vincular contas de terceiros como se fossem suas.',
          ],
        },
        {
          title: '3. Vínculo de contas e sincronização',
          paragraphs: [
            'A sincronização em nuvem é opcional e exige confirmação explícita de titularidade. Listas públicas consultadas sem vínculo permanecem armazenadas apenas localmente no navegador.',
          ],
        },
        {
          title: '4. Idade mínima',
          paragraphs: [
            'O AniMatch estabelece, como política própria de utilização de contas em nuvem, a idade mínima de 16 anos. O tratamento de dados pessoais de crianças e adolescentes observa as exigências legais aplicáveis, especialmente o princípio do melhor interesse.',
          ],
        },
        {
          title: '5. Uso das plataformas externas',
          paragraphs: [
            'O AniMatch depende das APIs públicas de AniList, Kitsu e MyAnimeList, sem controle sobre a disponibilidade ininterrupta dos serviços externos.',
          ],
        },
        {
          title: '6. Recomendações e resultados',
          paragraphs: [
            'As recomendações são produzidas por cálculos estatísticos e constituem estimativas de compatibilidade, não garantias de qualidade ou previsões absolutas.',
          ],
        },
        {
          title: '7. Propriedade intelectual',
          paragraphs: [
            'A identidade visual, código e elementos originais do AniMatch pertencem ao desenvolvedor. Títulos, marcas e artes pertencem aos seus respectivos titulares.',
          ],
        },
        {
          title: '8. Disponibilidade e limitações',
          paragraphs: [
            'O serviço é disponibilizado gratuitamente "no estado em que se encontra" (as is), sem garantias de funcionamento ininterrupto.',
          ],
        },
        {
          title: '9. Encerramento da conta',
          paragraphs: [
            'O usuário pode encerrar o uso ou solicitar a exclusão de sua conta e dados na nuvem a qualquer momento nas Configurações.',
          ],
        },
      ],
    },
  },
  en: {
    about: {
      sections: [
        {
          title: '1. What is AniMatch',
          paragraphs: [
            'AniMatch is an independent, free, and non-commercial tool designed to analyze personal preferences and provide personalized anime recommendations.',
            'The tool queries public lists shared by users on compatible platforms, including AniList, Kitsu, and MyAnimeList.',
            'Based on this data, AniMatch analyzes completed or watching titles, personal scores, and community averages. It calculates genre affinity indicators and other media traits like format and release year.',
            'These insights are used to rank and organize your "Plan to Watch" list, prioritizing titles with the highest genuine compatibility with your taste.',
            'AniMatch is not a streaming platform, does not host video files, does not manage user accounts on external platforms, and never modifies your original lists.',
          ],
        },
        {
          title: '2. Data sources & intellectual property',
          paragraphs: [
            'Anime information is retrieved via official public APIs provided by AniList, Kitsu, and MyAnimeList.',
            'This data includes identifiers, titles, genres, formats, episode counts, community scores, cover images, and streaming references.',
            'AniMatch claims no ownership over third-party titles, characters, trademarks, or visual artwork. All copyrights and intellectual property remain with their respective owners.',
            'AniMatch does not store image files or synopsis texts in its database. References and metadata are cached temporarily in your browser or synced to the cloud according to your preferences.',
          ],
        },
        {
          title: '3. Independence',
          paragraphs: [
            'AniMatch is an independent project with no official affiliation, sponsorship, or endorsement from AniList, Kitsu, or MyAnimeList. Third-party brand names are used strictly for service identification.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: November 24, 2026',
      intro: 'This Privacy Policy explains how AniMatch collects, accesses, uses, stores, and protects information. AniMatch minimizes data collection strictly to what is required for personalized recommendation features.',
      sections: [
        {
          title: '1. Data Controller',
          paragraphs: [
            'The controller responsible for personal data processing within AniMatch is Wagner Santos. Privacy contact channel: github.com/wagnergsantos/animatch/issues.',
            'Please use the official issue tracker for privacy inquiries and avoid submitting sensitive information publicly.',
          ],
        },
        {
          title: '2. External Platform Information',
          paragraphs: [
            'To generate recommendations, AniMatch queries public anime lists provided by the user on compatible platforms (titles, genres, ratings, watch status).',
            'Queries depend on public list availability and external API health. Searching other public usernames never saves their data to the cloud unless explicitly linked by the owner.',
          ],
        },
        {
          title: '3. Local Browser Storage',
          paragraphs: [
            'Retrieved data is normalized and stored locally in your browser using IndexedDB (anime list cache) and localStorage (user preferences, theme, language, recent searches).',
            'List caches expire within six hours and can be refreshed or cleared at any time via in-app controls.',
          ],
        },
        {
          title: '4. Cloud Synchronization & Linked Accounts',
          paragraphs: [
            'Cloud synchronization is completely optional and requires an authenticated AniMatch account with confirmed ownership of the external username.',
            'Guest users and unlinked accounts remain strictly local to the browser.',
          ],
        },
        {
          title: '5. Cloud-Stored Data',
          paragraphs: [
            'When sync is enabled, the Supabase backend stores preferences (theme, language, streaming subscriptions), linked usernames, ratings, and encrypted login credentials.',
          ],
        },
        {
          title: '6. Recommendation Processing',
          paragraphs: [
            'Taste profiles and Bayesian affinity scores are computed directly in client-side RAM during session execution. Profiles are not sent to third-party tracking servers.',
          ],
        },
        {
          title: '7. Processing Purposes',
          paragraphs: [
            'Data is processed solely to provide recommendations, enable cross-device synchronization, and secure features. AniMatch never sells user lists or personal taste profiles.',
          ],
        },
        {
          title: '8. Cookies, Local Storage & Advertising',
          paragraphs: [
            'AniMatch uses browser storage (localStorage and IndexedDB) required for basic functionality. Non-intrusive ads via Google AdSense may use cookies under standard Google policies.',
            'You can opt out of personalized ads at any time via adssettings.google.com or your browser settings.',
          ],
        },
        {
          title: '9. User Rights (GDPR / LGPD)',
          paragraphs: [
            'Under data protection laws, you have the right to access, rectify, export, or erase your data, or revoke consent at any time through our GitHub contact channel.',
          ],
        },
        {
          title: '10. Data Deletion',
          paragraphs: [
            'You can clear local data via the "Clear local data" button. Cloud accounts can be permanently deleted anytime in Settings ("Delete my account and cloud data").',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      lastUpdated: 'Last updated: November 24, 2026',
      intro: 'By accessing or using AniMatch, you agree to be bound by these Terms of Use.',
      sections: [
        {
          title: '1. About the Service',
          paragraphs: [
            'AniMatch is an independent anime recommendation and preference analysis tool. The service does not stream, host, or distribute video content and does not replace original cataloging platforms.',
          ],
        },
        {
          title: '2. Conditions of Use',
          paragraphs: [
            'You must maintain a public anime list on supported platforms to use recommendation features. You must not link third-party accounts without authorization.',
          ],
        },
        {
          title: '3. Account Linking & Sync',
          paragraphs: [
            'Cloud sync is optional and requires explicit confirmation of account ownership. Unlinked public queries remain strictly stored in your local browser.',
          ],
        },
        {
          title: '4. Minimum Age',
          paragraphs: [
            'AniMatch policy requires users creating cloud accounts to be at least 16 years of age in compliance with applicable child and adolescent protection standards.',
          ],
        },
        {
          title: '5. External Services',
          paragraphs: [
            'AniMatch relies on public APIs from AniList, Kitsu, and MyAnimeList. We do not guarantee uninterrupted third-party integration availability.',
          ],
        },
        {
          title: '6. Recommendations Disclaimer',
          paragraphs: [
            'Recommendations are generated via statistical modeling and represent compatibility estimates, not absolute ratings or quality guarantees.',
          ],
        },
        {
          title: '7. Intellectual Property',
          paragraphs: [
            'Original UI code and design elements belong to AniMatch. Third-party titles, artwork, and trademarks belong to their respective copyright holders.',
          ],
        },
        {
          title: '8. Availability & Warranty',
          paragraphs: [
            'The service is provided free of charge on an "as is" and "as available" basis without express or implied warranties.',
          ],
        },
        {
          title: '9. Account Termination',
          paragraphs: [
            'You may stop using the service and delete your cloud account and stored preferences at any time in the Settings page.',
          ],
        },
      ],
    },
  },
  ja: {
    about: {
      sections: [
        {
          title: '1. AniMatchについて',
          paragraphs: [
            'AniMatchは、個人の好みを分析し、最適なアニメを提案する独立した無料の非商用ツールです。',
            'AniList、Kitsu、MyAnimeListなどの対応プラットフォーム上で公開されているユーザーのリストを参照して動作します。',
            '視聴済み作品のスコアやコミュニティ平均を分析し、ジャンルごとの親和性やフォーマットなどの特徴をベイズ推定により算出します。',
            'これらの指標を活用し、あなたの「Plan to Watch（見たいリスト）」を好みに合致する順にスマートに並び替えます。',
            'AniMatchは動画配信サービスではなく、動画ファイルのホスティングや外部プラットフォームのリスト改変は行いません。',
          ],
        },
        {
          title: '2. データソースと知的財産権',
          paragraphs: [
            'アニメ関連のメタデータはAniList、Kitsu、MyAnimeListの公式公開APIを通じて取得されています。',
            'タイトル、キャラクター、商標、画像などの知的財産権はすべて各権利者および配信事業者に帰属します。',
            'AniMatchのサーバーには画像ファイルやあらすじ本文は保存されず、ブラウザのキャッシュまたはクラウド同期設定としてのみ保持されます。',
          ],
        },
        {
          title: '3. 独立性',
          paragraphs: [
            'AniMatchは独立した個人プロジェクトであり、AniList、Kitsu、MyAnimeListとは公式な提携・推奨関係はありません。サービス名は互換性識別の目的でのみ使用しています。',
          ],
        },
      ],
    },
    privacy: {
      title: 'プライバシーポリシー',
      lastUpdated: '最終更新日：2026年11月24日',
      intro: '本プライバシーポリシーは、AniMatchにおける情報の収集、利用、保管、および保護方針を説明するものです。必要な最小限のデータのみを処理します。',
      sections: [
        {
          title: '1. データ管理者',
          paragraphs: [
            'AniMatchのデータ管理責任者：Wagner Santos。プライバシーに関するお問い合わせ窓口：github.com/wagnergsantos/animatch/issues。',
            '機密情報を公開のIssueに投稿しないようご配慮ください。',
          ],
        },
        {
          title: '2. 参照する外部情報',
          paragraphs: [
            'レコメンド生成のため、ユーザーが指定した公開アニメリスト（タイトル、ジャンル、評価スコア、視聴ステータス）を参照します。',
            'アカウント連携を行っていない他のユーザーの公開リストを検索した場合でも、本人の明示的な連携なしにクラウドへ保存されることはありません。',
          ],
        },
        {
          title: '3. ブラウザへのローカル保存',
          paragraphs: [
            '取得したデータは、IndexedDB（アニメリストのキャッシュ）およびlocalStorage（設定、言語、テーマ、最近の検索履歴）にローカル保存されます。',
            'キャッシュは最大6時間で失効し、設定画面からいつでも手動で消去可能です。',
          ],
        },
        {
          title: '4. クラウド同期と連携アカウント',
          paragraphs: [
            'クラウド同期は完全に任意です。ログインした上で外部アカウントの所有権を確認した場合にのみ有効になります。',
            'ゲストユーザーのデータはブラウザのローカル保存に限定されます。',
          ],
        },
        {
          title: '5. クラウドに保存される情報',
          paragraphs: [
            '同期有効時、Supabase上に設定情報（テーマ、言語、配信サブスクリプション）、連携ユーザー名、評価データ、暗号化認証情報が安全に保存されます。',
          ],
        },
        {
          title: '6. レコメンド処理',
          paragraphs: [
            '好みのプロファイルおよびベイズ親和性スコアは、ブラウザ実行時にRAM内で直接計算されます。外部の追跡サーバーへ送信されることはありません。',
          ],
        },
        {
          title: '7. 利用目的',
          paragraphs: [
            'データはアニメのレコメンド提供、端末間同期、アカウント保護の目的にのみ使用されます。個人リストや好みのデータを販売することは一切ありません。',
          ],
        },
        {
          title: '8. Cookie、ローカルストレージ、広告',
          paragraphs: [
            'AniMatchは基本機能のためにローカルストレージを使用します。Google AdSenseによる広告表示において、Googleのポリシーに基づくCookieが使用される場合があります。',
            'パーソナライズ広告は adssettings.google.com またはブラウザの設定から無効化できます。',
          ],
        },
        {
          title: '9. 利用者の権利 (GDPR / LGPD)',
          paragraphs: [
            '利用者は、自身のデータへのアクセス、訂正、削除、同意撤回をGitHubの公式窓口を通じていつでも請求できます。',
          ],
        },
        {
          title: '10. データの削除',
          paragraphs: [
            'ブラウザのローカルデータは「ローカルデータを消去」から即時削除できます。クラウドアカウントは設定画面の「アカウントとクラウドデータを削除」から完全に消去可能です。',
          ],
        },
      ],
    },
    terms: {
      title: '利用規約',
      lastUpdated: '最終更新日：2026年11月24日',
      intro: 'AniMatchをご利用いただくことで、本利用規約に同意したものとみなされます。',
      sections: [
        {
          title: '1. サービスについて',
          paragraphs: [
            'AniMatchは独立したアニメレコメンドおよび好み分析ツールです。動画配信やファイルの配布は行いません。',
          ],
        },
        {
          title: '2. 利用条件',
          paragraphs: [
            '機能を利用するには、対応サービス上で公開リストを保持している必要があります。第三者のアカウントを許可なく自己のものとして登録してはなりません。',
          ],
        },
        {
          title: '3. アカウント連携と同期',
          paragraphs: [
            'クラウド同期は任意です。未連携の公開リスト検索データはブラウザのローカルにのみ保存されます。',
          ],
        },
        {
          title: '4. 年齢制限',
          paragraphs: [
            'クラウドアカウントを作成して利用する場合、保護規定に準拠し16歳以上である必要があります。',
          ],
        },
        {
          title: '5. 外部サービスへの依存',
          paragraphs: [
            'AniList、Kitsu、MyAnimeListの公開APIに依存しており、外部サービスの継続的かつ永続的な提供を保証するものではありません。',
          ],
        },
        {
          title: '6. レコメンドの免責',
          paragraphs: [
            'レコメンド結果は統計的手法に基づく推定値であり、作品の品質や満足度を絶対的に保証するものではありません。',
          ],
        },
        {
          title: '7. 知的財産権',
          paragraphs: [
            'AniMatchの独自コードおよびデザインの権利は開発者に帰属します。作品名、商標、画像は各権利者に帰属します。',
          ],
        },
        {
          title: '8. サービスの現状有姿提供',
          paragraphs: [
            '本サービスは無料にて「現状有姿 (as is)」で提供され、中断のない動作を保証するものではありません。',
          ],
        },
        {
          title: '9. アカウントの終了',
          paragraphs: [
            '利用者はいつでも本サービスの利用を中止し、設定画面からアカウントとデータを完全に削除することができます。',
          ],
        },
      ],
    },
  },
}
