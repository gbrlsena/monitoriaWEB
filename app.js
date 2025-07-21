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
    // 1. DEFINIÇÃO DE TODAS AS FUNÇÕES
    // ==========================================================
    
    function openSettingsModal() {
        settingsModal.classList.add('visible');
        distDateInput.valueAsDate = new Date();
        populateSelect(distMonitorSelect, 'monitors', 'Selecione...');
        populateSelect(distTeamSelect, 'teams', 'Selecione...');
    }

    function openHistoryModal() {
        historyModal.classList.add('visible');
        const hoje = new Date();
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(hoje.getDate() - 7);
        historyDateStart.valueAsDate = umaSemanaAtras;
        historyDateEnd.valueAsDate = hoje;
    }

    function closeSettingsModal() { settingsModal.classList.remove('visible'); }
    function closeHistoryModal() { historyModal.classList.remove('visible'); }

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
                boardContainer.innerHTML = `<p class="placeholder-text error">Ocorreu um erro ao carregar o painel. Verifique se o índice do Firestore foi criado.</p>`;
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
            el.className = 'card';
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
        boardContainer.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => marcarFeito(btn.dataset.id)));
        boardContainer.querySelectorAll('.btn-ajuda').forEach(btn => btn.addEventListener('click', () => pedirAjuda(btn.dataset.id)));
        boardContainer.querySelectorAll('.btn-ativo').forEach(btn => btn.addEventListener('click', () => marcarAtivo(btn.dataset.id)));
        boardContainer.querySelectorAll('.btn-reabrir').forEach(btn => btn.addEventListener('click', () => reabrirCard(btn.dataset.id)));
        boardContainer.querySelectorAll('.btn-pausar').forEach(btn => btn.addEventListener('click', () => pausarCard(btn.dataset.id)));
    }

    function toggleCardButtons(cardId, disabled) {
        const button = boardContainer.querySelector(`[data-id="${cardId}"]`);
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

    async function fetchHistory() {
        const startDateString = historyDateStart.value;
        const endDateString = historyDateEnd.value;
        if (!startDateString || !endDateString) return showAlert('Por favor, selecione as datas de início e fim.', 'error');
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

    async function createMonitor() {
        const name = newMonitorNameInput.value.trim();
        if (!name) return showAlert('Insira um nome para o monitor.', 'error');
        try {
            await db.collection('monitors').add({ name: name });
            showAlert(`Monitor "${name}" criado!`, 'success');
            newMonitorNameInput.value = '';
            populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
            populateSelect(distMonitorSelect, 'monitors', 'Selecione...');
        } catch (error) { showAlert('Erro ao criar monitor.', 'error'); }
    }

    async function createTeam() {
        const name = newTeamNameInput.value.trim();
        if (!name) return showAlert('Insira um nome para o time.', 'error');
        try {
            await db.collection('teams').add({ name: name });
            showAlert(`Time "${name}" criado!`, 'success');
            newTeamNameInput.value = '';
            populateSelect(distTeamSelect, 'teams', 'Selecione...');
        } catch (error) { showAlert('Erro ao criar time.', 'error'); }
    }

    function addAssignmentToList() {
        const assignment = { monitor: distMonitorSelect.value, team: distTeamSelect.value, date: distDateInput.value };
        if (!assignment.monitor || !assignment.team || !assignment.date) return showAlert('Selecione data, monitor e time.', 'error');
        pendingAssignments.push(assignment);
        renderPendingAssignments();
    }

    function renderPendingAssignments() {
        assignmentList.innerHTML = '';
        pendingAssignments.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = `${item.team} → ${item.monitor}`;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '❌';
            removeBtn.onclick = () => { pendingAssignments.splice(index, 1); renderPendingAssignments(); };
            li.appendChild(removeBtn);
            assignmentList.appendChild(li);
        });
    }

    async function saveAssignments() {
        if (pendingAssignments.length === 0) return showAlert('Nenhuma distribuição para salvar.', 'error');
        const batch = db.batch();
        pendingAssignments.forEach(item => {
            const newCardRef = db.collection('cards').doc();
            batch.set(newCardRef, {
                monitor: item.monitor, time: item.team,
                data: firebase.firestore.Timestamp.fromDate(new Date(item.date + 'T12:00:00')),
                status: "pendente", precisaAjuda: false,
                historico: [{ timestamp: new Date(), mensagem: "Card criado" }]
            });
        });
        try {
            await batch.commit();
            showAlert('Distribuição salva com sucesso!', 'success');
            pendingAssignments = []; renderPendingAssignments();
        } catch (error) {
            console.error("Erro ao salvar distribuição:", error);
            showAlert('Erro ao salvar a distribuição.', 'error');
        }
    }
    
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

    function updateView() {
        if (unsubscribeFromData) unsubscribeFromData();
        const selectedMonitor = monitorSelect.value;
        const selectedDateStr = kanbanDateSelect.value;
        if (!selectedDateStr) return;
        if (selectedMonitor) {
            renderKanbanView(selectedMonitor, selectedDateStr);
        } else {
            renderDashboardView(selectedDateStr);
        }
    }

    // ==========================================================
    // 2. CONFIGURAÇÃO DOS EVENT LISTENERS (ABORDAGEM DIRETA)
    // ==========================================================
    kanbanDateSelect.addEventListener('change', updateView);
    monitorSelect.addEventListener('change', updateView);
    
    // Listeners diretos para os botões de abrir modais
    settingsBtn.onclick = openSettingsModal;
    historyBtn.onclick = openHistoryModal;

    // Listeners para fechar
    settingsModalCloseBtn.onclick = closeSettingsModal;
    historyModalCloseBtn.onclick = closeHistoryModal;
    
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettingsModal(); });
    historyModal.addEventListener('click', (e) => { if (e.target === historyModal) closeHistoryModal(); });

    // Listeners para os botões dentro dos modais
    toggleMode.onclick = () => document.documentElement.classList.toggle('dark');
    addMonitorBtn.onclick = createMonitor;
    addTeamBtn.onclick = createTeam;
    addAssignmentBtn.onclick = addAssignmentToList;
    saveAssignmentsBtn.onclick = saveAssignments;
    fetchHistoryBtn.onclick = fetchHistory;
    
    // ==========================================================
    // 3. INICIALIZAÇÃO DA APLICAÇÃO
    // ==========================================================
    async function initializeApp() {
        kanbanDateSelect.valueAsDate = new Date();
        await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        updateView();
    }

    initializeApp();

});
