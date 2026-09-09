# AGENTS.md — Celestial Replay

## Objetivo do produto

Celestial Replay é um player pessoal para repetir um vídeo ou executar uma
playlist com quantidades de repetições por item. A experiência central deve
continuar utilizável sem conta. Com autenticação, o usuário pode salvar e
gerenciar playlists, histórico e sessões retomáveis.

O produto privilegia uma interface compacta, escura e espacial, com superfícies
de liquid glass discretas. O vídeo e seus controles são a prioridade visual;
efeitos nunca podem prejudicar a legibilidade ou a reprodução.

## Stack atual

- Next.js 16, React 19 e TypeScript.
- ReactPlayer 3 para provedores de mídia.
- Neon Postgres + Drizzle ORM para dados persistentes.
- Neon Auth para autenticação por e-mail/senha e Google.
- Upstash Redis + `@upstash/ratelimit` para rate limit distribuído.
- Zod para validar entradas e payloads.
- Lucide React para todos os ícones de interface.
- CSS global em `styles/globals.css`; não há Tailwind neste projeto.

## Estrutura importante

| Área | Responsabilidade |
| --- | --- |
| `components/replay-studio.tsx` | Orquestra estado da sessão, formulários e fila. |
| `components/replay-player-surface.tsx` | Superfície visual do player e controles. |
| `components/react-player-client.tsx` | Wrapper client-side do ReactPlayer v3 e encaminhamento de `ref`. |
| `components/persistent-playback-shell.tsx` | Mantém o player montado enquanto o usuário navega entre páginas. |
| `components/replay-composer.tsx` | Formulários de vídeo único e playlist. |
| `components/playback-queue.tsx` | Fila em execução e edição dos próximos itens. |
| `components/auth-*.tsx` | Modal, formulário e controles de conta. |
| `app/api/**` | Rotas de dados; autenticação, autorização, validação e rate limit acontecem aqui. |
| `lib/replay-playlist.ts` | Regras puras de parsing, rascunho e repetição. |
| `lib/media-url.ts` | Validação de URLs reproduzíveis; mantenha a barreira contra imagens e esquemas inseguros. |
| `lib/auth.ts` / `lib/auth-client.ts` | Neon Auth no servidor e cliente. |
| `lib/request-security.ts` | Proteção de mutações por mesma origem. |
| `lib/rate-limit.ts` | Rate limit por escopo e identidade. |
| `db/schema.ts` e `drizzle/` | Schema e migrações versionadas. |

## Regras de negócio de reprodução

1. `repetitions` significa o número total de execuções completas de um vídeo,
   não o número de repetições adicionais. Ex.: `3` toca três vezes no total.
2. Uma playlist avança para o próximo item apenas após concluir todas as
   repetições do item atual.
3. O preview pode carregar o primeiro vídeo antes de iniciar, mas nunca deve
   tocar sem a ação explícita do usuário.
4. Não marcar uma repetição como concluída até o vídeo efetivamente começar e
   terminar. Eventos de carregamento não contam como execução.
5. Uma falha de provider deve mostrar recuperação clara (tentar novamente ou
   pular vídeo), sem avançar indevidamente contador, histórico ou sessão.
6. Histórico, playlists salvas e retomada exigem sessão autenticada. Reprodução
   única e montagem temporária de playlist não exigem login.
7. O player deve sobreviver à navegação para páginas secundárias. Não desmonte
   `ReplayStudio` para “corrigir” um problema visual.

## ReactPlayer v3: invariantes críticos

ReactPlayer v3 usa elementos de mídia/custom elements. Pequenas alterações nos
refs ou no ciclo de vida podem quebrar autoplay após o clique, pausa e troca de
vídeo.

- Preserve o `forwardRef` real em `components/react-player-client.tsx`.
  Nunca passe o ref como prop comum (`playerRef=...`).
- Em `ReplayPlayerSurface`, mantenha `ref={playerRef}` e `innerRef={playerRef}`.
- Preserve `key={displayedVideo.src}` e `playing={activeVideo ? isPlaying : false}`
  salvo se houver uma correção reproduzível com testes manuais para substituí-los.
- O ref é compatível com `HTMLVideoElement`; para seek, prefira `currentTime`.
  Não assuma a API antiga `seekTo()`.
- Eventos `onPlay`/`onPlaying` confirmam reprodução. `onReady` equivale a início
  de carregamento e não é confirmação de que o vídeo está tocando.
- Mude somente o mínimo necessário quando corrigir player. Teste pelo menos:
  preview → iniciar, pausar → continuar, repetir duas vezes e transição X → Y.

## Segurança e dados

- Nunca exponha nem registre `DATABASE_URL`, tokens do Upstash, cookies,
  senhas, cabeçalhos `Authorization` ou URLs completas de usuário.
- Variáveis reais ficam apenas em `.env.local` e nos ambientes da Vercel. Não
  versionar `.env*` com segredos.
- Toda mutação em `app/api/**` deve, nesta ordem: aplicar rate limit, validar
  mesma origem quando aplicável, obter sessão, validar Zod e aplicar escopo do
  proprietário na consulta/escrita.
- Para recursos de usuário, consultas de leitura, atualização e remoção devem
  sempre incluir `owner_id = usuário autenticado`. Nunca aceite um `ownerId`
  vindo do cliente.
- Atualizações de playlists que substituem itens devem ser transacionais.
- Não usar `localStorage` para credenciais, sessão ou dados privados. Neon Auth
  usa cookies; preserve atributos seguros configurados pelo provedor.
- `APP_ORIGIN` protege nossas APIs de mutação. Ele não substitui os **Trusted
  origins** do Neon Auth. Produção e desenvolvimento precisam estar cadastrados
  no Neon Auth como origens confiáveis.
- Ao adicionar uma fonte ou domínio externo ao player, revise também a CSP em
  `next.config.ts`, as regras de URL e o risco de SSRF/URLs internas.

## Interface e acessibilidade

- Use Lucide; não use emojis como ícones estruturais.
- Mantenha o visual espacial/glassmorphism sóbrio: azul-marinho, contraste alto,
  bordas suaves e animações curtas. Evite gradientes ou CTAs excessivamente
  saturados.
- Priorize estabilidade visual. Estados de prévia, iniciando, reproduzindo,
  pausado e erro devem ocupar o mesmo espaço para evitar saltos.
- Controles de ícone precisam de `aria-label`, `title` e estado apropriado
  (`aria-pressed`, `aria-current`, etc.). Preserve `:focus-visible`.
- Não dependa apenas de hover; botões devem funcionar por toque e teclado.
- O layout deve funcionar em telas pequenas sem rolagem horizontal e usar
  `min-height: 100dvh`, não altura fixa com `100vh`.
- Prefira classes e tokens existentes no CSS antes de introduzir novas cores ou
  sombras isoladas.

## Autenticação e origens

- O cliente cria `callbackURL` absoluto a partir de `window.location.origin`.
  Não volte para callback relativo.
- Em produção, o Neon Auth deve permitir `https://celestial-replay.vercel.app`
  como trusted origin; localmente, `http://localhost:3000`. Inclua domínios
  customizados exatos caso sejam usados.
- `APP_ORIGIN` deve ser a origem sem path, por exemplo
  `https://celestial-replay.vercel.app`.
- Ao mexer em login, teste e-mail/senha, criação de conta, Google, cancelamento
  do modal e logout.

## Comandos de trabalho

```powershell
npm run dev
npm run verify
npm run test:urls
npm run db:generate
npm run db:migrate
npm run build
```

- `npm run verify` é obrigatório antes de commit: roda TypeScript e a bateria
  de URLs, incluindo rejeição de imagens e esquemas indevidos.
- Depois de mexer em schema, gere a migração, revise o SQL em `drizzle/` e só
  então aplique-a no ambiente autorizado.
- `npm run build` valida o bundle de produção; em algumas máquinas Windows o
  processo de auditoria pode mostrar `spawn EPERM` após a compilação. Registre
  esse detalhe, mas não o trate como sucesso sem `npm run verify` também passar.

## Git e escopo de mudanças

- A branch principal atual é `master`; use commits convencionais em português ou
  inglês conciso, por exemplo `fix(player): preserve pause state`.
- Faça commits pequenos, de menor dependência para maior dependência. Uma issue
  coesa deve ter um commit coeso.
- Não faça `git reset --hard`, `git checkout --` ou alterações destrutivas para
  “limpar” a árvore.
- Preserve mudanças e arquivos não relacionados do usuário. Em especial,
  `devserver.log` e `devserver.err.log` podem existir localmente e não devem ser
  adicionados ao commit.
- Antes de enviar: confira `git diff --check`, execute a validação proporcional
  ao risco e revise o diff final.

## Forma de trabalhar

1. Declare a suposição quando ela puder mudar o comportamento do player,
   autenticação, dados ou segurança.
2. Prefira a menor alteração que resolva a causa, em vez de reescrever o fluxo.
3. Não misture refactors amplos, estilo e mudança de comportamento no mesmo
   commit sem necessidade.
4. Ao finalizar, informe: o que mudou, como foi validado e o risco remanescente
   se houver.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
