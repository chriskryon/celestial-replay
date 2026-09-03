# Celestial Replay — direção visual

## Princípio

Uma ferramenta pessoal de vídeo, calma e focada. A interface não disputa atenção
com o conteúdo: ela enquadra o player em uma atmosfera noturna e deixa a ação
principal explícita.

## Tokens

- Fundo: a fotografia original da Via Láctea (`public/bg.jpg`), protegida por uma
  camada azul-noite de contraste e um starfield animado, sutil e econômico.
- Superfícies: vidro líquido translúcido, borda fria de baixo contraste e desfoque.
- Ação primária: azul-lavanda translúcido e sóbrio, com texto claro; ela se
  distingue por contexto e não por um brilho promocional.
- Texto: branco frio para conteúdo e lavanda acinzentado para suporte.
- Foco: contorno claro de 3px, sempre visível por teclado.

## Estrutura

1. Um cabeçalho compacto mantém o universo e o player no primeiro viewport;
   a marca funciona como atalho para a página inicial e, com sessão, o avatar
   abre um menu discreto de conta e saída. O acesso frequente a playlists e
   histórico fica nas abas de contexto do estúdio, junto aos modos de reprodução.
2. Alternância acessível entre Vídeo único e Playlist.
3. O vídeo aparece primeiro; os controles ficam compactos logo abaixo, como no
   mobile, e a fila em execução fecha a composição.
4. Estado da sessão e número de repetições restantes ficam próximos ao player.
5. O histórico usa uma linha temporal escaneável: data, repetições e atalho
   para a origem do vídeo aparecem sem competir com a leitura cronológica.
6. A biblioteca de playlists separa navegação e edição em duas colunas: a lista
   preserva o contexto e o editor prioriza nome, vídeos e repetições. Em telas
   pequenas, as duas áreas viram uma sequência única e natural. O editor oferece
   o atalho por linhas (`link;quantidade`) e a edição por campos equivalentes.

## Movimento e responsividade

O starfield tem apenas deriva lenta e é desligado com redução de movimento; o
vidro muda sutilmente no hover. A área principal ocupa preferencialmente uma
viewport dinâmica (`100dvh`), sem impedir rolagem quando um telefone ou a
playlist exigir mais espaço. Em até 760px, as colunas viram uma pilha, o CTA
ocupa toda a largura e nenhuma ação fica fora da ordem natural do teclado.

## Biblioteca

Ícones vêm de Lucide; a experiência de mídia usa ReactPlayer v3. O visual é
CSS próprio para preservar a linguagem celestial/liquid-glass sem depender de
componentes legados do NextUI.
