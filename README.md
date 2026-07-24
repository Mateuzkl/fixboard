# FixBoard - Bug Tracking & Management (Supabase Edition)

🚀 **[Acesse a Demonstração Online Aqui](https://mateuzkl.github.io/fixboard/)**

FixBoard é um painel moderno para organização de bugs em colunas no estilo Trello.
Esta versão foi construída utilizando **HTML5**, **CSS3**, e **JavaScript puro**, integrando com o **Supabase** (Auth, Database, RLS, e Realtime) como backend, permitindo hospedagem totalmente gratuita no GitHub Pages.

## Configuração do Supabase

### 1. Criar Projeto
1. Crie uma conta e um projeto gratuito no [Supabase](https://supabase.com).
2. Vá em `Project Settings` -> `API`.
3. Copie a **URL do Projeto** e a **anon public key**.

### 2. Configurar o Frontend
1. Abra o arquivo `assets/js/supabase-config.js`.
2. Substitua `COLOQUE_A_URL_AQUI` pela URL do projeto.
3. Substitua `COLOQUE_A_CHAVE_PUBLICA_AQUI` pela **anon public key**.
> **ATENÇÃO:** Nunca exponha a sua `service_role` ou chave secreta no frontend. A chave *anon public* é segura, pois o banco de dados está protegido por regras de RLS!

### 3. Criar o Banco de Dados (SQL)
No painel do Supabase, acesse **SQL Editor** e execute os três arquivos da pasta `supabase/` do projeto na seguinte ordem:

1. **`schema.sql`**: Cria as tabelas, extensões (UUID), e os *triggers* que automaticamente criam perfis quando um usuário se cadastra.
2. **`policies.sql`**: Ativa e define as regras rigorosas de segurança (RLS - Row Level Security). Ninguém não aprovado poderá ler ou escrever os bugs.
3. **`seed.sql`**: (Opcional) Migra os 4 bugs iniciais originais para o banco de dados.

### 4. Configurar Autenticação e Redirecionamentos
1. Vá em `Authentication` -> `URL Configuration`.
2. Em **Site URL**, coloque a URL base onde seu painel será hospedado (ex: `https://seu-usuario.github.io/fixboard/` ou `http://localhost:8000`).
3. Adicione também as URLs na aba **Redirect URLs** para permitir login correto.

## Gerenciamento de Equipe

### Acessando como Administrador (A primeira vez)
Por padrão, todo usuário criado tem a função (role) de `viewer` e inicia **bloqueado** (approved = false) por segurança. Para configurar você mesmo como Administrador, rode esse comando no **SQL Editor** do Supabase após ter criado a conta na tela de login:

```sql
UPDATE public.profiles
SET role = 'admin', approved = true, active = true
WHERE email = 'SEU_EMAIL_AQUI';
```

A partir daí, ao logar no FixBoard, você verá o ícone de engrenagem da **Equipe** (<i class="fas fa-users-cog"></i>) no cabeçalho. Por lá, você poderá:
- Aprovar novos usuários que tentaram se cadastrar.
- Transformar visualizadores em Desenvolvedores (Developers).
- Banir/Desativar contas.

## Publicação no GitHub Pages

O site funciona perfeitamente sem processo de build.
1. Envie todos os arquivos deste projeto para a branch `main` do seu repositório.
2. No repositório, acesse **Settings** -> **Pages**.
3. Selecione **Deploy from a branch** e aponte para a `main`, pasta `/root`.
4. Em poucos minutos seu site estará rodando online conectado ao seu banco de dados na nuvem!

## Informações Adicionais (Segurança)

- **Migração do LocalStorage**: Na versão anterior, usávamos localStorage para salvar bugs. Agora tudo é sincronizado pelo Supabase. Se você tiver dados antigos, será necessário criar manualmente pelo painel (ou via SQL). O localStorage agora é usado *apenas* para manter o tema e sessão.
- **Service Role**: Nunca faça chamadas usando chaves secretas no JavaScript (`service_role`). As permissões de acesso foram todas escritas em SQL (`policies.sql`) para garantir que os hackers não consigam burlar a interface.
- **Realtime**: O painel já inclui listeners para tabelas. Se outro desenvolvedor mudar a coluna de um bug, sua tela atualizará automaticamente!
