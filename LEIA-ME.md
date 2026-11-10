# Mapa de cruzamentos: clientes × eventos

Site onde o time sobe as listas de cada evento e vê, ao vivo, quais clientes encontraram a Capgemini.

**Quer ver antes de configurar?** Descompacte o zip e dê dois cliques no arquivo `index.html`. Ele abre no navegador uma demonstração com dados fictícios (nada é salvo).

Para colocar no ar são quatro partes. Faça uma de cada vez, na ordem.

---

## Parte 1. Supabase (onde os dados ficam guardados)

1. Entre em **supabase.com** com a sua conta.
2. Clique em **New project**.
   - Nome: `mapa-cruzamentos`
   - Senha do banco: crie uma e guarde (o site não usa, mas o Supabase pede).
   - Região: **South America (São Paulo)**.
   - Clique em **Create new project** e espere uns 2 minutos.
   - Se o Supabase avisar que você chegou ao limite de projetos grátis, use um projeto que você já tem (por exemplo, o do painel de eventos). As tabelas deste site têm nomes próprios e não mexem em nada que já existe.
3. No menu da esquerda, clique em **SQL Editor**.
4. Abra o arquivo **banco.sql** (dá para abrir no Bloco de Notas), copie tudo, cole no SQL Editor e clique em **Run**. Tem que aparecer “Success”.
   - Se você já tinha rodado um banco.sql antes, rode este também. Ele só acrescenta o que falta e não apaga nada.
5. Crie o acesso de cada pessoa do time:
   - Menu **Authentication** → **Users** → **Add user** → **Create new user**.
   - Digite o e-mail e uma senha.
   - Marque **Auto Confirm User**.
   - Clique em **Create user**.
   - Repita para cada pessoa (comece por você).
6. Feche a porta para quem não foi convidado:
   - Em **Authentication**, abra **Sign In / Providers**.
   - Desligue **Allow new users to sign up** e salve.
7. Pegue os dois dados que o site precisa:
   - Clique em **Connect**, no topo do projeto (ou vá em **Project Settings** → **API Keys**).
   - Copie a **Project URL** (fica assim: `https://abcdefghijkl.supabase.co`).
   - Copie a chave **publishable** (começa com `sb_publishable_`).
   - Não use a chave “secret”.

## Parte 2. GitHub (onde os arquivos do site ficam)

1. Descompacte o arquivo zip: clique com o botão direito → **Extrair tudo**.
2. Entre em **github.com**, clique no **+** (canto de cima) → **New repository**.
3. Nome: `mapa-cruzamentos`. Marque **Private**. Clique em **Create repository**.
4. Na página que abrir, clique no link **uploading an existing file**.
5. Abra a pasta descompactada, selecione **todos os arquivos** de dentro dela e arraste para a página do GitHub.
6. Espere todos aparecerem na lista e clique em **Commit changes**.
7. Agora cole os dados do Supabase:
   - No GitHub, clique no arquivo **config.js**.
   - Clique no ícone de **lápis** (Edit), no canto direito.
   - Troque `COLE_AQUI_A_PROJECT_URL` pela Project URL e `COLE_AQUI_A_CHAVE_PUBLISHABLE` pela chave publishable. Mantenha as aspas simples em volta.
   - Clique em **Commit changes** (duas vezes, se ele pedir confirmação).

## Parte 3. Render (o que coloca o site no ar)

1. Entre em **render.com**.
2. Clique em **New +** → **Static Site**.
3. Se pedir, conecte o GitHub e escolha o repositório **mapa-cruzamentos**.
4. Preencha:
   - **Build Command**: deixe em branco.
   - **Publish Directory**: digite só um ponto: `.`
5. Clique em **Deploy Static Site**.
6. Em 1 ou 2 minutos aparece o endereço do site, no topo da página (algo como `https://mapa-cruzamentos.onrender.com`).

## Parte 4. Testar

1. Abra o endereço do site e entre com o seu e-mail e a sua senha.
2. Clique em **Ver com dados de exemplo** para ver como o painel fica.
3. Abra o site em outro computador (ou em outra janela anônima) com outro usuário: o topo mostra quantas pessoas estão com o site aberto, e o que um sobe aparece na tela do outro.
4. Quando terminar de olhar, clique em **Apagar exemplo**.
5. Mande o endereço para o time. Cada pessoa entra com o acesso que você criou na Parte 1.

---

## Bom saber

- **Se o site mostrar “Falta ligar o site ao Supabase”:** o config.js no GitHub ainda não tem a Project URL e a chave publishable (Parte 2, passo 7). Sem isso, o site não pede senha e não salva nada.
- **Se o site disser que os arquivos estão misturados:** suba de novo todos os arquivos do zip no GitHub, incluindo o index.html, e aperte **Ctrl + F5** na página do site.
- **Meu perfil:** clicando no seu nome, no topo, você vê as listas que subiu e pode trocar o nome que aparece para o time. Cada lista fica gravada com o nome de quem subiu.
- **Subir uma lista:** botão **Subir lista de um evento**. O site aceita o modelo de planilha e também listas do jeito que vêm dos eventos (Excel ou CSV). Antes de enviar, ele mostra quantas pessoas vão entrar e o que fica de fora.
- **Errou a lista?** Clique em **Gerenciar listas** e em **Excluir** na lista errada.
- **Mesma empresa com dois nomes?** Em **Gerenciar listas**, use **A mesma empresa apareceu com dois nomes?**. As próximas listas já entram com o nome certo.
- **Atualizar o site depois:** no GitHub, clique em **Add file** → **Upload files**, arraste todos os arquivos novos e clique em **Commit changes**. Se o seu config.js no GitHub já tem os dados do Supabase, não suba o config.js do zip (ele está em branco). O Render atualiza sozinho em 1 ou 2 minutos; depois aperte **Ctrl + F5** no site.
- **Logo da Capgemini no topo (opcional):** suba no GitHub o arquivo oficial do logo com o nome `logo-capgemini.svg` e ele aparece sozinho.
- **Projeto parado:** no plano grátis, o Supabase pausa o projeto depois de uns dias sem ninguém usar. Se o site parar de carregar, entre no Supabase e clique em **Restore project**.
- **Privacidade (LGPD):** o site guarda empresa, nome, cargo e tipo de interação. E-mails servem só para descobrir a empresa e não são guardados. Pessoas da própria Capgemini ficam de fora sozinhas.

## Arquivos

| Arquivo | Para que serve |
| --- | --- |
| index.html | a página do site |
| estilo.css | cores e visual |
| app.js | o funcionamento do site |
| regras.js | como o site lê as planilhas e faz as contas |
| visual.js | os cartões, a linha do tempo e os ícones |
| config.js | onde ficam a Project URL e a chave publishable |
| supabase.js | peça pronta que conecta o site ao Supabase (não mexa) |
| banco.sql | cria as tabelas no Supabase (Parte 1) |
| modelo-lista-cruzamentos.xlsx | modelo de planilha para o time preencher |
