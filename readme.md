# Lar Financeiro

## 📝 Descrição

O **Lar Financeiro** é um aplicativo móvel de educação financeira familiar, construído com React Native e Expo. Ele foi projetado para ajudar pais a ensinarem seus filhos a gerenciar dinheiro de forma eficaz, definindo mesadas, metas de poupança e acompanhando despesas.

A plataforma utiliza **inteligência artificial (Google Gemini)** para gerar dicas financeiras personalizadas com base nos hábitos de gastos dos usuários, tornando o aprendizado financeiro mais interativo e relevante.
## Screenshots:
<img width="395" height="861" alt="Captura de tela 2025-07-29 184547" src="https://github.com/user-attachments/assets/71c04b7f-6f5c-461b-870f-3efa1e94cfe2" />
<img width="395" height="853" alt="Captura de tela 2025-07-29 184556" src="https://github.com/user-attachments/assets/1f61cd92-a168-4705-8b75-ebcd8ad6b6a7" />
<img width="399" height="850" alt="Captura de tela 2025-07-29 184612" src="https://github.com/user-attachments/assets/4497d824-2b19-43d3-acaa-86f1b24f30bc" />
<img width="388" height="859" alt="Captura de tela 2025-07-29 184630" src="https://github.com/user-attachments/assets/1adee4ed-f3c4-4795-83a3-798aeaca027f" />
<img width="400" height="839" alt="Captura de tela 2025-07-29 185020" src="https://github.com/user-attachments/assets/1f1452b3-9ebf-455f-bd25-e6cc3f84e704" />


## ✨ Funcionalidades Principais

### Para Todos os Usuários

* **Autenticação Segura:** Cadastro e login com e-mail e senha, com opção de recuperação de senha.
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
* ENV:
* EXPO_PUBLIC_API_URL="https://ogwawiodxxwkshvdpudb.supabase.co"
* EXPO_PUBLIC_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nd2F3aW9keHh3a3NodmRwdWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTMxMjIsImV4cCI6MjA2ODMyOTEyMn0.FxzyJHMEWf6Pq6Ox_1PyF3LwQLlu-eUxLapcJbdf1W4"
* GOOGLE_GEMINI_API_KEY = "AIzaSyDTwBGsxf30oBjHydUYBLaZNQAKQykdO3U"
* GOOGLE_MAPS_API_KEY = "AIzaSyDUyp7OcPnMcwwQejUCRkqGL4hdKd3wq2k"
* EXPO_PUBLIC_IMGBB_API_KEY = "7d991af21840f0ba40bd39ac33f64657"

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
