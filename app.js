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
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsModalCloseBtn = document.getElementById('settingsModalCloseBtn');
    const toggleMode = document.getElementById('toggleMode');
    const newMonitorNameInput = document.getElementById('newMonitorName');
    const addMonitorBtn = document.getElementById('addMonitorBtn');
    const newTeamNameInput = document.getElementById('newTeamName');
    const addTeamBtn = document.getElementById('addTeamBtn');
    const distDateInput = document.getElementById('distDate');
    const distMonitorSelect = document.getElementById('distMonitorSelect');
    const distTeamSelect = document.getElementById('distTeamSelect');
    const addAssignmentBtn = document.getElementById('addAssignmentBtn');
    const assignmentList = document.getElementById('assignmentList');
    const saveAssignmentsBtn = document.getElementById('saveAssignmentsBtn');
    const customAlert = document.getElementById('customAlert');
    const customAlertMessage = document.getElementById('customAlertMessage');
    const historyBtn = document.getElementById('historyBtn');
    const historyModal = document.getElementById('historyModal');
    const historyModalCloseBtn = document.getElementById('historyModalCloseBtn');
    const historyDateStart = document.getElementById('historyDateStart');
    const historyDateEnd = document.getElementById('historyDateEnd');
    const fetchHistoryBtn = document.getElementById('fetchHistoryBtn');
    const historyResults = document.getElementById('historyResults');
    
    // --- Variáveis Globais ---
    let unsubscribeFromData = null;
    let pendingAssignments = [];
    let alertTimer = null;

    // ==========================================================
    // DEFINIÇÃO DE TODAS AS FUNÇÕES AUXILIARES
    // ==========================================================

    function showAlert(message, type = 'success') {
        if (alertTimer) clearTimeout(alertTimer);
        customAlertMessage.textContent = message;
        customAlert.className = 'custom-alert';
        customAlert.classList.add(type, 'show');
        alertTimer = setTimeout(() => { customAlert.classList.remove('show'); }, 3000);
    }

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

    function renderDashboardView(dateString) {
        const startOfDay = new Date(dateString + 'T00:00:00');
        const endOfDay = new Date(dateString + 'T23:59:59');
        boardContainer.innerHTML = '<p class="placeholder-text">Carregando painel do dia...</p>';
        boardContainer.className = '';
        unsubscribeFromData = db.collection('cards').where('data', '>=', startOfDay).where('data', '<=', endOfDay)
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
                                <div class="progress-inner"><div><div class="progress-percentage">${percentage}%</div><div class="progress-label">Concluído</div></div></div>
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
                    </div>`;
                boardContainer.innerHTML = dashboardHTML;
            }, error => {
                console.error("Erro ao carregar dashboard:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Ocorreu um erro ao carregar o painel.</p>`;
            });
    }

    function renderKanbanView(monitor, dateString) {
        const startOfDay = new Date(dateString + 'T00:00:00');
        const endOfDay = new Date(dateString + 'T23:59:59');
        boardContainer.innerHTML = '<p class="placeholder-text">Carregando seus cards...</p>';
        boardContainer.className = 'kanban-grid';
        unsubscribeFromData = db.collection("cards").where("monitor", "==", monitor).where("data", ">=", startOfDay).where("data", "<=", endOfDay)
            .onSnapshot(snapshot => {
                const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderCards(cards);
            }, error => {
                console.error("Erro ao carregar cards do Kanban:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Erro ao carregar os cards. Verifique a console (F12) para um link de criação de índice.</p>`;
            });
    }
    
    function renderCards(cards) {
        boardContainer.innerHTML = '';
        if (cards.length === 0) {
            boardContainer.innerHTML = '<p class="placeholder-text">Você não tem cards para este dia.</p>';
            return;
        }
        cards.forEach(card => {
            const el = document.createElement('div');
            el.className = 'card'; // As classes de status são adicionadas abaixo
            const isDone = card.status === 'feito';
            const isActive = card.status === 'ativo';
            if (isDone) el.classList.add('done');
            if (isActive) el.classList.add('active');
            
            let actionsHTML = '';
            if (isDone) {
                actionsHTML = `<button class="btn btn-reabrir" data-id="${card.id}">↩️ Reabrir</button>`;
            } else {
                actionsHTML = `<button class="btn btn-concluir" data-id="${card.id}">✅ Concluir</button><button class="btn btn-ajuda" data-id="${card.id}">🆘 Pedir Ajuda</button>`;
                if (isActive) {
                    actionsHTML += `<button class="btn btn-pausar" data-id="${card.id}">⏸️ Pausar</button>`;
                } else {
                    actionsHTML += `<button class="btn btn-ativo" data-id="${card.id}">🔵 Ativo</button>`;
                }
            }
            el.innerHTML = `<div class="card-content"><h3>${card.time}</h3><p><strong>Status:</strong> ${card.status}</p></div><div class="actions">${actionsHTML}</div>`;
            boardContainer.appendChild(el);
        });
        addCardButtonListeners();
    }

    function addCardButtonListeners() {
        document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => marcarFeito(btn.dataset.id)));
        document.querySelectorAll('.btn-ajuda').forEach(btn => btn.addEventListener('click', () => pedirAjuda(btn.dataset.id)));
        document.querySelectorAll('.btn-ativo').forEach(btn => btn.addEventListener('click', () => marcarAtivo(btn.dataset.id)));
        document.querySelectorAll('.btn-reabrir').forEach(btn => btn.addEventListener('click', () => reabrirCard(btn.dataset.id)));
        document.querySelectorAll('.btn-pausar').forEach(btn => btn.addEventListener('click', () => pausarCard(btn.dataset.id)));
    }

    function toggleCardButtons(cardId, disabled) {
        const button = document.querySelector(`[data-id="${cardId}"]`);
        if (button) {
            const cardElement = button.closest('.card');
            if (cardElement) cardElement.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
        }
    }

    async function addLogEntry(id, payload, logMessage) {
        toggleCardButtons(id, true);
        const logEntry = { timestamp: new Date(), mensagem: logMessage };
        const finalPayload = { ...payload, historico: firebase.firestore.FieldValue.arrayUnion(logEntry) };
        try {
            await db.collection("cards").doc(id).update(finalPayload);
        } catch (error) {
            console.error("Erro ao atualizar o card:", error);
            showAlert('Erro ao atualizar o card.', 'error');
            toggleCardButtons(id, false);
        }
    }

    function marcarFeito(id) { addLogEntry(id, { status: "feito" }, "Card concluído"); }
    function pedirAjuda(id) { addLogEntry(id, { status: "pendente", precisaAjuda: true }, "Pedido de ajuda solicitado"); }
    function marcarAtivo(id) { addLogEntry(id, { status: "ativo", precisaAjuda: false }, "Marcado como ativo"); }
    function reabrirCard(id) { addLogEntry(id, { status: "pendente" }, "Card reaberto"); }
    function pausarCard(id) { addLogEntry(id, { status: "pendente" }, "Atividade pausada"); }

    function openSettingsModal() {
        settingsModal.style.display = 'flex';
        distDateInput.valueAsDate = new Date();
        populateSelect(distMonitorSelect, 'monitors', 'Selecione...');
        populateSelect(distTeamSelect, 'teams', 'Selecione...');
    }

    function openHistoryModal() {
        historyModal.style.display = 'flex';
        const hoje = new Date();
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(hoje.getDate() - 7);
        historyDateStart.valueAsDate = umaSemanaAtras;
        historyDateEnd.valueAsDate = hoje;
    }
    
    async function fetchHistory() {
        const startDateString = historyDateStart.value;
        const endDateString = historyDateEnd.value;
        if (!startDateString || !endDateString) {
            return showAlert('Por favor, selecione as datas de início e fim.', 'error');
        }
        const startDate = new Date(startDateString + 'T00:00:00');
        const endDate = new Date(endDateString + 'T23:59:59');
        historyResults.innerHTML = '<p class="placeholder-text">Buscando...</p>';
        try {
            const snapshot = await db.collection('cards').where('data', '>=', startDate).where('data', '<=', endDate).orderBy('data', 'desc').get();
            if (snapshot.empty) {
                historyResults.innerHTML = '<p class="placeholder-text">Nenhuma atividade encontrada para este período.</p>';
                return;
            }
            historyResults.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const card = doc.data();
                const cardEl = document.createElement('div');
                cardEl.className = 'history-item';
                let logsHTML = '<ul class="history-log-list">';
                if (card.historico && card.historico.length > 0) {
                    card.historico.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
                    card.historico.forEach(log => {
                        logsHTML += `<li><span class="log-time">${formatarDataHoraBR(log.timestamp)}:</span> ${log.mensagem}</li>`;
                    });
                } else { logsHTML += '<li>Nenhum log detalhado.</li>'; }
                logsHTML += '</ul>';
                cardEl.innerHTML = `<div class="history-item-header"><span>${card.time} (${card.monitor}) - </span><span>${formatarDataBR(card.data)}</span></div>${logsHTML}`;
                historyResults.appendChild(cardEl);
            });
        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
            showAlert('Não foi possível carregar o histórico.', 'error');
            historyResults.innerHTML = '<p class="placeholder-text">Ocorreu um erro ao buscar.</p>';
        }
    }

    async function createMonitor() { /* ...código sem alteração... */ }
    async function createTeam() { /* ...código sem alteração... */ }
    function addAssignmentToList() { /* ...código sem alteração... */ }
    function renderPendingAssignments() { /* ...código sem alteração... */ }
    async function saveAssignments() { /* ...código sem alteração... */ }
    
    function formatarDataBR(dataStr) {
        if (!dataStr) return 'Data inválida';
        const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
        return data.toLocaleDateString('pt-BR');
    }

    function formatarDataHoraBR(dataStr) {
        if (!dataStr) return '';
        const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
        return data.toLocaleString('pt-BR');
    }

    // ==========================================================
    // FUNÇÃO CENTRAL DE CONTROLE
    // ==========================================================
    function updateView() {
        if (unsubscribeFromData) unsubscribeFromData();
        const selectedMonitor = monitorSelect.value;
        const selectedDateStr = kanbanDateSelect.value;
        if (!selectedDateStr) return; // Proteção para evitar busca sem data
        
        if (selectedMonitor) {
            renderKanbanView(selectedMonitor, selectedDateStr);
        } else {
            renderDashboardView(selectedDateStr);
        }
    }

    // ==========================================================
    // FUNÇÃO DE INICIALIZAÇÃO E EVENT LISTENERS
    // ==========================================================
    async function initializeApp() {
        kanbanDateSelect.valueAsDate = new Date();
        await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        
        // Listeners principais
        kanbanDateSelect.addEventListener('change', updateView);
        monitorSelect.addEventListener('change', updateView);
        
        // Listeners para abrir os modais
        settingsBtn.addEventListener('click', openSettingsModal);
        historyBtn.addEventListener('click', openHistoryModal);
        
        // Listeners para fechar os modais
        settingsModalCloseBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        historyModalCloseBtn.addEventListener('click', () => historyModal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal) settingsModal.style.display = 'none';
            if (event.target == historyModal) historyModal.style.display = 'none';
        });

        // Listeners para os botões dentro dos modais
        toggleMode.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
        addMonitorBtn.addEventListener('click', createMonitor);
        addTeamBtn.addEventListener('click', createTeam);
        addAssignmentBtn.addEventListener('click', addAssignmentToList);
        saveAssignmentsBtn.addEventListener('click', saveAssignments);
        fetchHistoryBtn.addEventListener('click', fetchHistory);

        // Chama a primeira atualização da tela
        updateView();
    }

    initializeApp();

});
