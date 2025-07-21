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
    const monitorSelect = document.getElementById('monitorSelect');
    const board = document.getElementById('kanbanBoard');
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
    let unsubscribeFromCards = null;
    let pendingAssignments = [];
    let alertTimer = null;

    // --- Lógica Principal (Event Listeners) ---
    monitorSelect.onchange = handleMonitorChange;
    settingsBtn.onclick = openSettingsModal;
    settingsModalCloseBtn.onclick = () => settingsModal.style.display = 'none';
    historyBtn.onclick = openHistoryModal;
    historyModalCloseBtn.onclick = () => historyModal.style.display = 'none';
    fetchHistoryBtn.onclick = fetchHistory;
    toggleMode.onclick = () => document.documentElement.classList.toggle('dark');
    addMonitorBtn.onclick = createMonitor;
    addTeamBtn.onclick = createTeam;
    addAssignmentBtn.onclick = addAssignmentToList;
    saveAssignmentsBtn.onclick = saveAssignments;
    window.addEventListener('click', (event) => {
        if (event.target == settingsModal || event.target == historyModal) {
            settingsModal.style.display = 'none';
            historyModal.style.display = 'none';
        }
    });

    // --- Inicialização da Página ---
    populateSelect(monitorSelect, 'monitors');
    
    // --- Funções do Kanban (Visualização) ---
    function renderCards(cards) {
        board.innerHTML = '';
        if (cards.length === 0) {
            board.innerHTML = '<p class="placeholder-text">Você não tem cards hoje.</p>';
            return;
        }
        cards.forEach(card => {
            const el = document.createElement('div');
            const isDone = card.status === 'feito';
            el.className = `card ${isDone ? 'done' : ''} ${card.status === 'ativo' ? 'active' : ''}`;

            let actionsHTML = '';
            if (isDone) {
                actionsHTML = `<button class="btn btn-reabrir" data-id="${card.id}">↩️ Reabrir</button>`;
            } else {
                actionsHTML = `
                    <button class="btn btn-concluir" data-id="${card.id}">✅ Concluir</button>
                    <button class="btn btn-ajuda" data-id="${card.id}">🆘 Pedir Ajuda</button>
                    <button class="btn btn-ativo" data-id="${card.id}">🔵 Ativo</button>
                `;
            }

            el.innerHTML = `
                <div class="card-content">
                    <h3>${card.time}</h3>
                    <p><strong>Monitor:</strong> ${card.monitor}</p>
                    <p><strong>Data:</strong> ${formatarDataBR(card.data)}</p>
                    <p><strong>Status:</strong> ${card.status}</p>
                </div>
                <div class="actions">
                    ${actionsHTML}
                </div>`;
            board.appendChild(el);
        });
        addCardButtonListeners();
    }
    
    function addCardButtonListeners() {
        document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => marcarFeito(btn.dataset.id)));
        document.querySelectorAll('.btn-ajuda').forEach(btn => btn.addEventListener('click', () => pedirAjuda(btn.dataset.id)));
        document.querySelectorAll('.btn-ativo').forEach(btn => btn.addEventListener('click', () => marcarAtivo(btn.dataset.id)));
        document.querySelectorAll('.btn-reabrir').forEach(btn => btn.addEventListener('click', () => reabrirCard(btn.dataset.id)));
    }

    // --- Funções de Ação dos Cards ---
    async function addLogEntry(id, payload, logMessage) {
        const logEntry = { timestamp: new Date(), mensagem: logMessage };
        const finalPayload = {
            ...payload,
            historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
        };
        try {
            await db.collection("cards").doc(id).update(finalPayload);
        } catch (error) {
            console.error("Erro ao atualizar o card:", error);
            showAlert('Erro ao atualizar o card.', 'error');
        }
    }

    function marcarFeito(id) { addLogEntry(id, { status: "feito" }, "Card concluído"); }
    function pedirAjuda(id) { addLogEntry(id, { status: "pendente", precisaAjuda: true }, "Pedido de ajuda solicitado"); }
    function marcarAtivo(id) { addLogEntry(id, { status: "ativo", precisaAjuda: false }, "Marcado como ativo"); }
    function reabrirCard(id) { addLogEntry(id, { status: "pendente" }, "Card reaberto"); }

    // --- Funções do Histórico ---
    function openHistoryModal() {
        historyModal.style.display = 'flex';
        const hoje = new Date();
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(hoje.getDate() - 7);
        historyDateStart.valueAsDate = umaSemanaAtras;
        historyDateEnd.valueAsDate = hoje;
    }

    // ==========================================================
// FUNÇÕES DO HISTÓRICO (COM A FUNÇÃO CORRIGIDA)
// ==========================================================

async function fetchHistory() {
    // Pega o valor como string 'YYYY-MM-DD' para evitar problemas de timezone com valueAsDate
    const startDateString = historyDateStart.value;
    const endDateString = historyDateEnd.value;

    if (!startDateString || !endDateString) {
        return showAlert('Por favor, selecione as datas de início e fim.', 'error');
    }

    // CRIAÇÃO ROBUSTA DAS DATAS:
    // Cria a data de início no primeiro segundo do dia (local)
    const startDate = new Date(startDateString + 'T00:00:00');
    // Cria a data de fim no último segundo do dia (local)
    const endDate = new Date(endDateString + 'T23:59:59');

    historyResults.innerHTML = '<p class="placeholder-text">Buscando...</p>';

    try {
        // A consulta continua a mesma, mas agora as variáveis startDate e endDate são precisas
        const snapshot = await db.collection('cards')
            .where('data', '>=', startDate)
            .where('data', '<=', endDate)
            .orderBy('data', 'desc')
            .get();

        if (snapshot.empty) {
            historyResults.innerHTML = '<p class="placeholder-text">Nenhuma atividade encontrada para este período.</p>';
            return;
        }

        historyResults.innerHTML = ''; // Limpa a busca
        snapshot.docs.forEach(doc => {
            const card = doc.data();
            const cardEl = document.createElement('div');
            cardEl.className = 'history-item';

            let logsHTML = '<ul class="history-log-list">';
            if (card.historico && card.historico.length > 0) {
                // Ordena o histórico pela data para garantir a ordem cronológica
                card.historico.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
                card.historico.forEach(log => {
                    logsHTML += `<li><span class="log-time">${formatarDataHoraBR(log.timestamp)}:</span> ${log.mensagem}</li>`;
                });
            } else {
                logsHTML += '<li>Nenhum log detalhado.</li>';
            }
            logsHTML += '</ul>';

            cardEl.innerHTML = `
                <div class="history-item-header">
                    <span>${card.time} (${card.monitor}) - </span>
                    <span>${formatarDataBR(card.data)}</span>
                </div>
                ${logsHTML}
            `;
            historyResults.appendChild(cardEl);
        });

    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        showAlert('Não foi possível carregar o histórico.', 'error');
        historyResults.innerHTML = '<p class="placeholder-text">Ocorreu um erro ao buscar.</p>';
    }
}

    // --- Funções de Configuração (Modal) ---
    function openSettingsModal() {
        settingsModal.style.display = 'flex';
        distDateInput.valueAsDate = new Date();
        populateSelect(distMonitorSelect, 'monitors');
        populateSelect(distTeamSelect, 'teams');
    }

    async function createMonitor() {
        const name = newMonitorNameInput.value.trim();
        if (!name) return showAlert('Insira um nome para o monitor.', 'error');
        try {
            await db.collection('monitors').add({ name: name });
            showAlert(`Monitor "${name}" criado!`, 'success');
            newMonitorNameInput.value = '';
            populateSelect(monitorSelect, 'monitors');
            populateSelect(distMonitorSelect, 'monitors');
        } catch (error) { showAlert('Erro ao criar monitor.', 'error'); }
    }

    async function createTeam() {
        const name = newTeamNameInput.value.trim();
        if (!name) return showAlert('Insira um nome para o time.', 'error');
        try {
            await db.collection('teams').add({ name: name });
            showAlert(`Time "${name}" criado!`, 'success');
            newTeamNameInput.value = '';
            populateSelect(distTeamSelect, 'teams');
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
            removeBtn.onclick = () => {
                pendingAssignments.splice(index, 1);
                renderPendingAssignments();
            };
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
            pendingAssignments = [];
            renderPendingAssignments();
        } catch (error) {
            console.error("Erro ao salvar distribuição:", error);
            showAlert('Erro ao salvar a distribuição.', 'error');
        }
    }
    
    // --- Outras Funções ---
    function handleMonitorChange() {
        if (unsubscribeFromCards) unsubscribeFromCards();
        const monitor = monitorSelect.value;
        if (!monitor) {
            board.innerHTML = '<p class="placeholder-text">Selecione seu nome para carregar os cards.</p>';
            return;
        }
        unsubscribeFromCards = db.collection("cards").where("monitor", "==", monitor)
            .onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const cards = data.filter(c => {
                    if (!c.data || !c.data.toDate) return false;
                    const cardDate = c.data.toDate(); cardDate.setHours(0, 0, 0, 0);
                    return cardDate.getTime() === hoje.getTime() || (cardDate < hoje && c.status !== 'feito');
                }).sort((a, b) => {
                    if (a.status === 'feito' && b.status !== 'feito') return 1;
                    if (a.status !== 'feito' && b.status === 'feito') return -1;
                    if (!a.data || !b.data) return 0;
                    return a.data.toDate() - b.data.toDate();
                });
                renderCards(cards);
            }, error => {
                console.error("Erro ao ouvir os cards: ", error);
                showAlert('Erro ao carregar cards.', 'error');
            });
    }

    async function populateSelect(selectElement, collectionName) {
        selectElement.innerHTML = `<option value="">Selecione...</option>`;
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

    function showAlert(message, type = 'success') {
        if (alertTimer) clearTimeout(alertTimer);
        customAlertMessage.textContent = message;
        customAlert.className = 'custom-alert';
        customAlert.classList.add(type, 'show');
        alertTimer = setTimeout(() => { customAlert.classList.remove('show'); }, 3000);
    }
    
    function formatarDataBR(dataStr) {
        if (!dataStr) return 'Data inválida';
        const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    function formatarDataHoraBR(dataStr) {
        if (!dataStr) return '';
        const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
        return data.toLocaleString('pt-BR');
    }

});
