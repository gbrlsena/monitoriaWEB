# 🗂️ Monitoria – Painel de Controle

Bem-vindo ao **Monitoria Painel de Controle**, uma ferramenta web desenvolvida para otimizar o gerenciamento e o acompanhamento de tarefas das equipes de monitoria.  
Construída com **HTML**, **CSS** e **JavaScript**, a aplicação é totalmente integrada ao **Google Firebase**, proporcionando uma experiência em **tempo real**, rápida e escalável.

> Esta solução substitui o uso de planilhas complexas, oferecendo:
> - Um painel de controle centralizado
> - Um espaço pessoal para cada monitor
> - Um sistema de administração visual para gestão de equipes e tarefas


## ✨ Funcionalidades Principais

### 📊 Dashboard Geral
- Visão geral do progresso da equipe para qualquer data selecionada
- Porcentagem de conclusão do dia
- Painel com monitores **Ativos no Momento**
- Painéis de **Cards Pendentes** e **Cards Concluídos**

### 🧑‍💻 Espaço Pessoal
- Visualização individual dos cards do dia, ordenados por status:
  - Ativo
  - Pendente
  - Concluído

### 🔄 Controle de Status Interativo
- Marque cards como **Ativo**, **Pendente** ou **Concluído**
- **Pause** uma atividade em andamento
- **Reabra** cards concluídos por engano
- **Copie** rapidamente o status para a área de transferência

### ⚙️ Administração Integrada
- Modal de configurações com:
  - Criação e edição de **Monitores** e **Times**
  - Distribuição de tarefas via matriz visual com sumário em tempo real
  - Alternância entre os modos **Claro** e **Escuro**

### 🕓 Histórico de Atividades
- Acompanhe todas as ações realizadas nos cards em um determinado período:
  - Criação
  - Ativação
  - Conclusão
  - Pausas e reaberturas

### ⚡ Atualizações em Tempo Real
- Todas as ações são sincronizadas instantaneamente entre os usuários via **Firebase Firestore**
- Não é necessário recarregar a página

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Estilização com Grid, Flexbox e variáveis para modo claro/escuro
- **JavaScript (ES6+)**: Lógica de funcionamento, manipulação de DOM e interatividade
- **Google Firebase**:
  - **Firestore**: Banco de dados NoSQL com sincronização em tempo real
  - **Hosting** *(opcional)*: Para publicação da aplicação
