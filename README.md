# FixBoard

FixBoard é um painel moderno e estático para organização de bugs em colunas no estilo Trello.
Foi construído utilizando apenas HTML5, CSS3, e JavaScript puro, lendo os dados de um arquivo JSON local.

## Como usar (Localmente)

1. Clone ou baixe este repositório.
2. Como os arquivos são estáticos, você pode abrir o `index.html` diretamente no seu navegador.
3. Nota: Alguns navegadores podem bloquear o fetch de arquivos locais (`issues.json`) devido ao CORS. Recomenda-se utilizar uma extensão de servidor local (ex: Live Server no VSCode) ou rodar localmente com Python (`python -m http.server`).

## Como publicar no GitHub Pages

O site funciona diretamente no GitHub Pages, sem necessidade de build.

1. Faça login no GitHub e crie um novo repositório chamado `fixboard`.
2. Envie todos os arquivos deste projeto para a branch `main` do seu repositório.
3. No repositório, acesse **Settings** -> **Pages**.
4. Em "Source", selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve. Em poucos minutos seu site estará no ar!

## Como adicionar e editar bugs

**Pela Interface**:
- Clique em "Novo Bug" no topo da página.
- Preencha o formulário e clique em Salvar. O bug aparecerá na coluna selecionada (ou em "Reportado" por padrão).
- Você pode editar clicando no botão de lápis ou visualizar os detalhes clicando sobre o card.
- **Importante**: Ao editar pela interface, os dados são salvos no `localStorage` do seu navegador para você não perder as alterações.

**Restaurar Dados**:
- Se quiser recarregar os dados do arquivo JSON e limpar suas modificações locais, clique em "Restaurar dados originais" ou acesse a opção de limpar dados nas configurações.

**Adicionar via Arquivo (Repositório)**:
- Você pode adicionar bugs no arquivo `data/issues.json` diretamente no repositório. Edite este arquivo para adicionar, alterar status ou modificar qualquer propriedade permanentemente.
- Para marcar como corrigido, altere a propriedade `"status"` para `"Corrigido"`.
- A estrutura do JSON é simples e segue o formato das issues originais (ID, título, descrição, status, prioridade, etc).

## Alterando as cores dos status

As cores dos cards baseadas no status podem ser alteradas diretamente no arquivo `assets/css/style.css`, buscando pelas variáveis de cor correspondentes:
- Reportado: `--status-reported` (vermelho)
- Em análise: `--status-analysis` (amarelo)
- Em correção: `--status-fixing` (azul)
- Aguardando teste: `--status-testing` (roxo)
- Corrigido: `--status-fixed` (verde)
- Fechado: `--status-closed` (cinza)

## Limpar o LocalStorage

Para limpar o armazenamento do navegador (excluindo os dados modificados pela interface):
- Abra o painel e utilize o botão "Restaurar dados originais".
- Ou, no navegador, pressione F12 para abrir o DevTools -> Aba **Application** (ou Armazenamento) -> **Local Storage** -> clique com botão direito na URL e selecione **Clear**.
