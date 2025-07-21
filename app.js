document.addEventListener('DOMContentLoaded', () => {

    // --- Configuração do Firebase ---
    const firebaseConfig = {
      apiKey: "AIzaSyArGe8B4_ptptY6EU1B5OWSVKEj_1mUnus",
      authDomain: "monitoriasite-eb2ad.firebaseapp.com",
      projectId: "monitoriasite-eb2ad",
      storageBucket: "monitoriasite-eb2ad.appspot.com",
      messagingSenderId: "992773117560",
      appId: "1:992773117560:web:d10679616fd64fe66c7f8d",
      measurementId: "G-80845BMJMZ"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // --- Seletores do DOM ---
    const kanbanDateSelect = document.getElementById('kanbanDateSelect');
    const monitorSelect = document.getElementById('monitorSelect');
    const boardContainer = document.getElementById('boardContainer');
    // ... todos os outros seletores ...
    
    let unsubscribeFromData = null;

    // --- Lógica de Inicialização ---
    // Envolvemos a lógica principal em uma função async para controlar a ordem de execução
    async function initializeApp() {
        kanbanDateSelect.valueAsDate = new Date();
        // Espera os monitores serem carregados antes de fazer a primeira busca
        await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        
        // Adiciona os event listeners DEPOIS que tudo está pronto
        kanbanDateSelect.addEventListener('change', updateView);
        monitorSelect.addEventListener('change', updateView);
        
        // Agora, chama a primeira atualização da tela
        updateView();
    }

    // Chama a função de inicialização
    initializeApp();

    // ==========================================================
    // FUNÇÃO CENTRAL DE CONTROLE
    // ==========================================================
    function updateView() {
        if (unsubscribeFromData) unsubscribeFromData();

        const selectedMonitor = monitorSelect.value;
        const selectedDateStr = kanbanDateSelect.value;

        // A verificação agora é mais simples e segura
        if (selectedMonitor) {
            renderKanbanView(selectedMonitor, selectedDateStr);
        } else {
            renderDashboardView(selectedDateStr);
        }
    }

    // ==========================================================
    // RENDERIZAÇÃO DO DASHBOARD
    // ==========================================================
    function renderDashboardView(dateString) {
        const startOfDay = new Date(dateString + 'T00:00:00');
        const endOfDay = new Date(dateString + 'T23:59:59');

        boardContainer.innerHTML = '<p class="placeholder-text">Carregando painel do dia...</p>';
        boardContainer.className = ''; // Garante que a classe de grid do kanban seja removida

        unsubscribeFromData = db.collection('cards')
            .where('data', '>=', startOfDay)
            .where('data', '<=', endOfDay)
            .onSnapshot(snapshot => {
                const allCards = snapshot.docs.map(doc => doc.data());

                if (snapshot.empty) {
                    boardContainer.innerHTML = '<p class="placeholder-text">Nenhum card encontrado para este dia.</p>';
                    return;
                }

                const totalCards = allCards.length;
                const completedCards = allCards.filter(c => c.status === 'feito');
                const activeCards = allCards.filter(c => c.status === 'ativo');
                const percentage = totalCards > 0 ? Math.round((completedCards.length / totalCards) * 100) : 0;
                
                const dashboardHTML = `
                    <div class="dashboard-grid">
                        <div class="progress-container">
                            <div class="progress-circle" style="--progress: ${percentage}%">
                                <div class="progress-inner">
                                    <div>
                                        <div class="progress-percentage">${percentage}%</div>
                                        <div class="progress-label">Concluído</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dashboard-panel">
                            <h3>Ativos no Momento</h3>
                            <ul>${ activeCards.length > 0 ? activeCards.map(c => `<li><span class="monitor-name">${c.monitor}</span> em <span class="team-name">${c.time}</span></li>`).join('') : '<li>Ninguém ativo no momento.</li>' }</ul>
                        </div>
                        <div class="dashboard-panel">
                            <h3>Concluídos Hoje</h3>
                            <ul>${ completedCards.length > 0 ? completedCards.map(c => `<li><span class="team-name">${c.time}</span> (por <span class="monitor-name">${c.monitor}</span>)</li>`).join('') : '<li>Nenhum card concluído ainda.</li>' }</ul>
                        </div>
                    </div>
                `;
                boardContainer.innerHTML = dashboardHTML;
            }, error => {
                console.error("Erro ao carregar dashboard:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Ocorreu um erro ao carregar o painel. Verifique se o índice do Firestore foi criado.</p>`;
            });
    }

    // ==========================================================
    // RENDERIZAÇÃO DO KANBAN
    // ==========================================================
    function renderKanbanView(monitor, dateString) {
        const startOfDay = new Date(dateString + 'T00:00:00');
        const endOfDay = new Date(dateString + 'T23:59:59');

        boardContainer.innerHTML = '<p class="placeholder-text">Carregando seus cards...</p>';
        boardContainer.className = 'kanban-grid'; // Adiciona a classe de grid para o Kanban

        unsubscribeFromData = db.collection("cards")
            .where("monitor", "==", monitor)
            .where("data", ">=", startOfDay)
            .where("data", "<=", endOfDay)
            .onSnapshot(snapshot => {
                const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderCards(cards);
            }, error => {
                console.error("Erro ao carregar cards do Kanban:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Erro ao carregar os cards. Verifique a console (F12) para um link de criação de índice.</p>`;
            });
    }

    // O resto das suas funções (renderCards, addLogEntry, etc.) permanece aqui...
    // ...
});
