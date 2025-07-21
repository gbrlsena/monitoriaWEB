document.addEventListener('DOMContentLoaded', () => {

    // --- Configuração do Firebase (com suas chaves) ---
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
    
    // --- Variáveis Globais ---
    let unsubscribeFromData = null; // Renomeado para refletir ambos os usos

    // --- Lógica Principal (Event Listeners) ---
    kanbanDateSelect.addEventListener('change', updateView);
    monitorSelect.addEventListener('change', updateView);
    // ... todos os outros listeners ...
    
    // --- Inicialização ---
    kanbanDateSelect.valueAsDate = new Date(); // Define a data de hoje
    populateSelect(monitorSelect, 'monitors', '-- Visão Geral --'); // Popula monitores
    updateView(); // Chama a função central para carregar a visão inicial (Dashboard)

    // ==========================================================
    // FUNÇÃO CENTRAL DE CONTROLE
    // ==========================================================
    function updateView() {
        if (unsubscribeFromData) unsubscribeFromData(); // Cancela a escuta anterior

        const selectedMonitor = monitorSelect.value;
        const selectedDateStr = kanbanDateSelect.value;

        if (!selectedDateStr) return; // Não faz nada se a data não estiver selecionada

        if (selectedMonitor) {
            // Se um monitor está selecionado, renderiza a visão Kanban
            renderKanbanView(selectedMonitor, selectedDateStr);
        } else {
            // Senão, renderiza a visão Dashboard
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

        unsubscribeFromData = db.collection('cards')
            .where('data', '>=', startOfDay)
            .where('data', '<=', endOfDay)
            .onSnapshot(snapshot => {
                const allCards = snapshot.docs.map(doc => doc.data());

                if (snapshot.empty) {
                    boardContainer.innerHTML = '<p class="placeholder-text">Nenhum card encontrado para este dia.</p>';
                    return;
                }

                // Cálculos para os painéis
                const totalCards = allCards.length;
                const completedCards = allCards.filter(c => c.status === 'feito');
                const activeCards = allCards.filter(c => c.status === 'ativo');
                const percentage = totalCards > 0 ? Math.round((completedCards.length / totalCards) * 100) : 0;
                
                // Geração do HTML do Dashboard
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
                            <ul>
                                ${ activeCards.length > 0 ? activeCards.map(c => `<li><span class="monitor-name">${c.monitor}</span> em <span class="team-name">${c.time}</span></li>`).join('') : '<li>Ninguém ativo no momento.</li>' }
                            </ul>
                        </div>
                        <div class="dashboard-panel">
                            <h3>Concluídos Hoje</h3>
                            <ul>
                                ${ completedCards.length > 0 ? completedCards.map(c => `<li><span class="team-name">${c.time}</span> (por <span class="monitor-name">${c.monitor}</span>)</li>`).join('') : '<li>Nenhum card concluído ainda.</li>' }
                            </ul>
                        </div>
                    </div>
                `;
                boardContainer.innerHTML = dashboardHTML;
            }, error => {
                console.error("Erro ao carregar dashboard:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Ocorreu um erro ao carregar o painel.</p>`;
            });
    }

    // ==========================================================
    // RENDERIZAÇÃO DO KANBAN
    // ==========================================================
    function renderKanbanView(monitor, dateString) {
        const startOfDay = new Date(dateString + 'T00:00:00');
        const endOfDay = new Date(dateString + 'T23:59:59');

        boardContainer.innerHTML = '<p class="placeholder-text">Carregando seus cards...</p>';

        unsubscribeFromData = db.collection("cards")
            .where("monitor", "==", monitor)
            .where("data", ">=", startOfDay)
            .where("data", "<=", endOfDay)
            .onSnapshot(snapshot => {
                const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Adiciona a classe de grid para o Kanban
                boardContainer.className = 'kanban-grid';
                renderCards(cards);
            }, error => {
                console.error("Erro ao carregar cards do Kanban:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Erro ao carregar os cards. Verifique a console (F12) para um link de criação de índice.</p>`;
            });
    }

    function renderCards(cards) {
        boardContainer.innerHTML = ''; // Limpa o container
        if (cards.length === 0) {
            boardContainer.innerHTML = '<p class="placeholder-text">Você não tem cards para este dia.</p>';
            return;
        }
        // O resto desta função (que cria o HTML de cada card) continua o mesmo...
        // ...
    }
    
    // --- Função para desabilitar botões ---
    function toggleCardButtons(cardId, disabled) {
        const button = document.querySelector(`[data-id="${cardId}"]`);
        if (button) {
            const cardElement = button.closest('.card');
            if (cardElement) {
                cardElement.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
            }
        }
    }

    // --- Funções de Ação dos Cards (Atualizadas) ---
    async function addLogEntry(id, payload, logMessage) {
        toggleCardButtons(id, true); // Desabilita os botões
        // ... resto da função sem alteração
    }
    
    // Todas as outras funções (addCardButtonListeners, marcarFeito, histórico, etc.) continuam aqui...
    // A função populateSelect foi levemente modificada para aceitar um texto padrão
    async function populateSelect(selectElement, collectionName, defaultOptionText) {
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        try {
            const snapshot = await db.collection(collectionName).orderBy("name").get();
            snapshot.docs.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.data().name;
                option.textContent = doc.data().name;
                selectElement.appendChild(option);
            });
        } catch (error) { console.error(`Erro ao popular o select ${collectionName}:`, error); }
    }
    // ...
});
