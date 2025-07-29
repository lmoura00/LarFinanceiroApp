# Lar Financeiro

## 📝 Descrição

O **Lar Financeiro** é um aplicativo móvel de educação financeira familiar, construído com React Native e Expo. Ele foi projetado para ajudar pais a ensinarem seus filhos a gerenciar dinheiro de forma eficaz, definindo mesadas, metas de poupança e acompanhando despesas.

A plataforma utiliza **inteligência artificial (Google Gemini)** para gerar dicas financeiras personalizadas com base nos hábitos de gastos dos usuários, tornando o aprendizado financeiro mais interativo e relevante.

## ✨ Funcionalidades Principais

### Para Todos os Usuários
* **Autenticação Segura:** Cadastro e login com e-mail e senha, com opção de recuperação de senha.
* **Login Biométrico:** Suporte para login rápido e seguro usando a biometria do dispositivo 🤳.
* **Edição de Perfil:** Atualize o nome e altere a senha diretamente no aplicativo.
* **Dicas Financeiras com IA:** Receba dicas financeiras inteligentes e personalizadas, geradas pelo Google Gemini, com base no seu histórico de transações 💡.
* **Tema Dinâmico:** Alterne entre os modos claro (☀️) e escuro (🌙) com persistência da preferência do usuário.
* **Notificações Push em Tempo Real:** Mantenha-se informado sobre atividades importantes na conta através de notificações push.
* **Adicionar Transações:** Registre despesas ou receitas com descrição, valor, categoria e data.
* **Anexos e Localização:** Adicione comprovantes (imagens da galeria ou fotos da câmera) e a localização geográfica às suas transações.

### Para os Pais (Responsáveis)
* **Gerenciamento de Dependentes:** Adicione, edite e remova perfis de filhos. A criação de um dependente gera automaticamente uma conta para ele.
* **Controle de Mesada:** Defina valores e a frequência (semanal ou mensal) da mesada para cada dependente.
* **Visão Geral Financeira:** Monitore o seu próprio saldo e o saldo de cada um dos seus filhos em um dashboard centralizado.
* **Relatórios em PDF:** Gere e compartilhe relatórios de despesas e dados de login dos dependentes de forma fácil 📄.
* **Mural de Conquistas:** Visualize as metas e prêmios alcançados por todos os seus filhos.
* **Conceder Prêmios:** Premie seus filhos com um valor em dinheiro ao completarem uma meta, transferindo o valor diretamente para o saldo deles.

### Para os Filhos (Dependentes)
* **Dashboard Pessoal:** Acompanhe o saldo da mesada, despesas e o valor poupado para metas.
* **Metas de Poupança:** Crie e gerencie metas para economizar para itens desejados 🎯.
* **Conquistas e Prêmios:** Ganhe medalhas 🏅 ao atingir metas financeiras e receba os prêmios em dinheiro concedidos por seus responsáveis.
* **Análise de Orçamento:** Visualize gráficos de receitas vs. despesas e um detalhamento de gastos por categoria para entender melhor seus hábitos financeiros.

## 🚀 Tecnologias Utilizadas

* **Frontend & Mobile:**
    * React Native & Expo
    * TypeScript
    * Expo Router (para navegação)
    * React Native Chart Kit (para gráficos)
* **Backend & Infraestrutura:**
    * **Supabase:**
        * Autenticação
        * Banco de Dados (PostgreSQL)
        * Storage (para imagens de comprovantes)
        * **Edge Functions (Deno):**
            * `generate-financial-tips`: Integração com a API do Gemini para gerar dicas.
            * `send-push-notification`: Envio de notificações via Expo Push API.
* **Inteligência Artificial:**
    * **Google Gemini API (`gemini-1.5-flash-latest`)**: Para a geração de dicas financeiras.

## ⚙️ Como Começar

Siga estas instruções para obter uma cópia do projeto e executá-lo em sua máquina local.

### Pré-requisitos

* Node.js e npm (ou yarn)
* Expo CLI (`npm install -g expo-cli`)
* Conta no Supabase
* Chave de API do Google Gemini

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/lmoura00/LarFinanceiroApp.git
    cd Lar-Financeiro
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configure o Cliente Supabase:**
    * Crie um ficheiro `supabaseClient.ts` (ou similar).
    * Insira as suas chaves de API do Supabase:
        ```typescript
        import { createClient } from '@supabase/supabase-js';

        const supabaseUrl = 'SUA_SUPABASE_URL';
        const supabaseAnonKey = 'SUA_SUPABASE_ANON_KEY';

        export const supabase = createClient(supabaseUrl, supabaseAnonKey);
        ```

4.  **Configure o Backend (Supabase):**
    * **Edge Functions:**
        * Faça o deploy das funções localizadas na sua pasta `supabase/functions/`.
        * Certifique-se de ter a CLI do Supabase instalada e configurada.
    * **Variáveis de Ambiente:**
        * No seu projeto Supabase, vá para `Settings` > `Edge Functions`.
        * Adicione um novo segredo (`New secret`) chamado `GEMINI_API_KEY` e cole a sua chave da API do Google Gemini.

5.  **Execute o aplicativo:**
    ```bash
    npx expo start
    ```
    Escaneie o QR code com o aplicativo Expo Go no seu telemóvel (Android ou iOS) ou execute num emulador.