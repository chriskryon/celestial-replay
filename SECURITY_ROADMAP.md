# Security roadmap — Celestial Replay

## Objetivo

Preparar o Celestial Replay para exposição pública sem depender do frontend
para autenticação, autorização ou validação. Este plano parte da auditoria
realizada em setembro de 2026 e prioriza acesso horizontal entre contas,
sessões, abuso de APIs e defesa em profundidade.

## Estado atual

O backend deriva o usuário de `getCurrentUser()` e não aceita `ownerId` do
cliente. As operações de playlist usam `id + ownerId` no `PATCH` e `DELETE`,
e consultas de playlists/histórico filtram por `ownerId`. Isso evita o IDOR
mais provável na implementação atual.

Ainda faltam controles de produção: rate limiting, políticas de headers,
proteção CSRF explícita, operações atômicas e testes de regressão adversariais.

## Achados e correções propostas

### P0 — antes de produção pública

| Item | Risco | Correção | Critério de aceite |
| --- | --- | --- | --- |
| Rate limit | Brute force, spam e custo excessivo | Limitar por IP nas rotas de autenticação e por usuário/IP nas APIs próprias. Usar um armazenamento compartilhado compatível com Vercel (por exemplo, Upstash Redis), nunca memória local. | Requisições acima do limite retornam `429`, com `Retry-After`; contas diferentes não compartilham indevidamente o limite de usuário. |
| Headers HTTP | Clickjacking, MIME sniffing, vazamento de referer e superfície XSS maior | Configurar headers em `next.config.ts`: CSP pragmática, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima e `frame-ancestors 'none'` via CSP. HSTS fica no domínio HTTPS/Vercel. | As páginas carregam sem violações CSP; resposta inclui os headers esperados; app não pode ser embutido em iframe externo. |
| CSRF para mutações | Ações autenticadas iniciadas por outro site | Para `POST`, `PATCH` e `DELETE`, aceitar apenas `Origin` igual ao origin público configurado. Em desenvolvimento, permitir explicitamente `localhost`. Confirmar os atributos do cookie Neon Auth no ambiente de produção. | Origin ausente/estrangeiro recebe `403`; fluxo normal no mesmo origin permanece funcional. |
| Testes de ownership | Regressão de IDOR/BOLA | Criar testes de rota com dois usuários simulados: A cria recurso; B não consegue listar, alterar ou apagar. | `GET`, `PATCH`, `DELETE` de recurso alheio resultam em `404`; sem sessão resulta em `401`. |

### P1 — próxima iteração

| Item | Risco | Correção | Critério de aceite |
| --- | --- | --- | --- |
| Update não atômico | Playlist pode ficar sem itens após falha/concorrência | Atualizar playlist e seus itens dentro de uma transação suportada pelo driver Neon; se necessário, usar endpoint SQL transacional seguro. | Falha na inserção não altera a playlist existente; duas atualizações concorrentes não deixam itens parciais. |
| Banco: índices e constraints | Custo de consulta e dados inconsistentes | Índices em `playlists.owner_id`, `playback_history.owner_id + completed_at`; `CHECK` para repetições positivas e posição não negativa; avaliar unicidade de posição por playlist. | Migration aplicada e plano de consulta usa índices nos list endpoints. |
| Limites de domínio | DoS lógico por payload válido | Limitar tamanho de URL, quantidade de playlists por conta e entradas de histórico por janela; manter máximo de 100 itens por playlist. | Payloads acima dos limites recebem `400` ou `429` com mensagem segura. |
| Enumeração de conta | Descoberta de e-mails cadastrados | Validar mensagens e timings do Neon Auth para login/cadastro/reset; usar resposta genérica quando a configuração permitir. | Não há resposta de app que revele se e-mail existe. |

### P2 — hardening e defesa em profundidade

| Item | Risco | Correção | Critério de aceite |
| --- | --- | --- | --- |
| RLS no Neon/Postgres | Futuro endpoint esquecer ownership | Avaliar RLS nas tabelas de aplicação. Como a identidade Neon Auth é externa, definir com cuidado o contexto de sessão/role antes de habilitar. Não ativar RLS sem teste de integração. | Uma consulta direta sem contexto de dono não retorna dados de outros usuários. |
| Observabilidade segura | Ataques sem rastreabilidade | Registrar eventos de autenticação falha, rate limit, mutações e erros sem cookies, tokens, URLs completas ou senhas. | Logs têm correlação e não contêm segredo ou dado sensível desnecessário. |
| Dependências | CVEs transitivas | Rodar `npm audit --omit=dev` no pipeline; avaliar vulnerabilidade e atualização pontual, sem upgrades indiscriminados. | Pipeline falha apenas para severidades acordadas; exceções possuem justificativa documentada. |
| Segurança de deploy | Secrets e ambiente | Rotacionar a URL do banco já compartilhada fora do vault; configurar secrets somente no Vercel/Neon; revisar preview deployments. | Nenhum secret aparece no Git, bundle ou log; produção usa URL e cookie secret próprios. |

## Backlog executável

1. Adicionar testes de rota para `401`, `404` cross-user, campos extras e payload inválido.
2. Adicionar rate limiting distribuído e respostas `429`.
3. Criar helper de validação `Origin` e aplicá-lo às mutações próprias.
4. Configurar e validar headers HTTP/CSP.
5. Tornar `PATCH /api/playlists/:id` transacional.
6. Criar migration de índices e checks.
7. Definir retenção/limites de histórico e playlists.
8. Fazer auditoria de configuração Neon Auth: cookies, expiração, OAuth redirect URLs e enumeração.
9. Rodar auditoria de dependências no CI.
10. Avaliar RLS após testes de integração e modelo de identidade definido.

## Matriz de autorização esperada

| Recurso | Anônimo | Dono autenticado | Outro autenticado |
| --- | --- | --- | --- |
| Playlist: listar | `401` | Somente próprias | Somente próprias |
| Playlist: criar | `401` | Permitido | Permitido apenas na própria conta |
| Playlist: editar/apagar | `401` | Permitido | `404` |
| Histórico: listar/criar | `401` | Somente próprio | Somente próprio |

## Checklist de produção

- [ ] `DATABASE_URL`, `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET` configurados somente no ambiente seguro.
- [ ] Credenciais expostas anteriormente foram rotacionadas.
- [ ] OAuth Google possui redirect URLs de produção e preview restritos.
- [ ] Cookies confirmados como `HttpOnly`, `Secure` em HTTPS e `SameSite` adequado.
- [ ] Rate limit e proteção Origin ativos.
- [ ] Headers verificados com resposta real de produção.
- [ ] Testes IDOR/BOLA passam no CI.
- [ ] Migrations aplicadas e backup/retenção do Neon revisados.
- [ ] Logs e alertas não expõem dados sensíveis.

## Fora de escopo por enquanto

Preferências de código, troca de ORM, reestruturação visual e refatorações sem
impacto mensurável em segurança não pertencem a este roadmap.
