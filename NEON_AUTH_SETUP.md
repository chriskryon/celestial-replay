# Conectar o Neon Auth

O código já espera estas variáveis em `.env.local` e, depois, no projeto da
Vercel:

```bash
NEON_AUTH_BASE_URL=https://seu-endpoint-de-auth
NEON_AUTH_COOKIE_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
```

No painel do Neon Auth, habilite os provedores **Email and password** e
**Google**. Para o Google, cadastre as URLs de retorno do ambiente local e da
Vercel conforme exibidas pelo Neon Auth. Não coloque o segredo do cliente
Google no repositório.

Com as variáveis presentes, as rotas abaixo passam a usar a sessão do Neon:

- `POST /api/history`: grava uma reprodução concluída para o usuário atual.
- `GET /api/history`: lista somente o histórico do usuário atual.
- `POST /api/playlists`: salva uma playlist para o usuário atual.
- `GET /api/playlists`: lista somente as playlists do usuário atual.

Sem login, a reprodução continua livre, mas essas rotas retornam `401` e não
gravam dados.
