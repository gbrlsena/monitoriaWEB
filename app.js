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
    const settingsModal = document.getElementById('settingsModal');
    const historyModal = document.getElementById('historyModal');
    const cardHistoryModal = document.getElementById('cardHistoryModal');
    const transferModal = document.getElementById('transferModal');
    
    // --- Variáveis Globais ---
    let unsubscribeFromData = null;
    let alertTimer = null;
    let currentTransferCardId = null;

    // ==========================================================
    // 1. DEFINIÇÃO DE TODAS AS FUNÇÕES
    // ==========================================================

    function showAlert(message, type = 'success') {
        const customAlert = document.getElementById('customAlert');
        const customAlertMessage = document.getElementById('customAlertMessage');
        if (alertTimer) clearTimeout(alertTimer);
        customAlertMessage.textContent = message;
        customAlert.className = 'custom-alert';
        customAlert.classList.add(type, 'show');
        alertTimer = setTimeout(() => { customAlert.classList.remove('show'); }, 3000);
    }

    async function populateSelect(selectElement, collectionName, defaultOptionText, exclude = []) {
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        try {
            const snapshot = await db.collection(collectionName).orderBy("name").get();
            snapshot.docs.forEach(doc => {
                const name = doc.data().name;
                if (!exclude.includes(name)) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    selectElement.appendChild(option);
                }
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
                const completedCards = allCards.filter(c => c.currentStatus && c.currentStatus.state === 'feito');
                const activeCards = allCards.filter(c => c.currentStatus && c.currentStatus.state === 'ativo');
                const pendingCards = allCards.filter(c => !c.currentStatus || c.currentStatus.state === 'pendente');
                const percentage = totalCards > 0 ? Math.round((completedCards.length / totalCards) * 100) : 0;
                
                const dashboardHTML = `
                    <div class="progress-container">
                        <div class="progress-circle" style="--progress: ${percentage}%"><div class="progress-inner"><div><div class="progress-percentage">${percentage}%</div><div class="progress-label">Concluído</div></div></div></div>
                    </div>
                    <div class="dashboard-grid">
                        <div class="dashboard-panel"><h3>Ativos no Momento</h3><ul>${ activeCards.length > 0 ? activeCards.map(c => `<li><span class="monitor-name">${c.monitor}</span> em <span class="team-name">${c.time}</span></li>`).join('') : '<li>Ninguém ativo no momento.</li>' }</ul></div>
                        <div class="dashboard-panel"><h3>Pendentes</h3><ul>${ pendingCards.length > 0 ? pendingCards.map(c => `<li><span class="team-name">${c.time}</span> (com <span class="monitor-name">${c.monitor}</span>)</li>`).join('') : '<li>Nenhum card pendente.</li>' }</ul></div>
                        <div class="dashboard-panel"><h3>Concluídos Hoje</h3><ul>${ completedCards.length > 0 ? completedCards.map(c => `<li><span class="team-name">${c.time}</span> (por <span class="monitor-name">${c.monitor}</span>)</li>`).join('') : '<li>Nenhum card concluído ainda.</li>' }</ul></div>
                    </div>`;
                boardContainer.innerHTML = dashboardHTML;
            }, error => {
                console.error("Erro ao carregar dashboard:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Ocorreu um erro. Verifique se o índice do Firestore foi criado.</p>`;
            });
    }

    function renderKanbanView(monitor, dateString) {
        const startOfDay = new Date(dateString + 'T00:00:00');
        const endOfDay = new Date(dateString + 'T23:59:59');
        boardContainer.innerHTML = '<p class="placeholder-text">Carregando...</p>';
        boardContainer.className = 'kanban-grid';
        unsubscribeFromData = db.collection("cards")
            .where("data", ">=", startOfDay)
            .where("data", "<=", endOfDay)
            .onSnapshot(snapshot => {
                let allCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                let cards = allCards.filter(card => 
                    (card.monitor === monitor && !card.transferInfo) || 
                    (card.transferInfo && card.transferInfo.toMonitor === monitor)
                );
                cards.sort((a, b) => {
                    const statusA = a.currentStatus ? a.currentStatus.state : 'pendente';
                    const statusB = b.currentStatus ? b.currentStatus.state : 'pendente';
                    const orderA = a.transferInfo ? 0 : 1;
                    const orderB = b.transferInfo ? 0 : 1;
                    if (orderA !== orderB) return orderA - orderB;
                    const statusOrder = { 'ativo': 1, 'pendente': 2, 'feito': 3 };
                    return (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
                });
                renderCards(cards);
            }, error => {
                console.error("Erro ao carregar Kanban:", error);
                boardContainer.innerHTML = `<p class="placeholder-text error">Ocorreu um erro. Verifique a console (F12) para um link de criação de índice.</p>`;
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
            const statusState = card.currentStatus ? card.currentStatus.state : 'pendente';
            const statusTime = card.currentStatus ? `(em ${formatarDataHoraBR(card.currentStatus.timestamp)})` : '';
            const isDone = statusState === 'feito';
            const isActive = statusState === 'ativo';
            const hasBeenActive = card.foiAtivado === true;
            const isPendingTransfer = card.transferInfo && card.transferInfo.status === 'pending';

            if (isDone) el.classList.add('done');
            if (isActive) el.classList.add('active');
            if (isPendingTransfer) el.classList.add('pending-transfer');
            
            let actionsHTML = '';
            if (isPendingTransfer) {
                actionsHTML = `<button class="btn btn-concluir" data-action="accept-transfer" data-id="${card.id}"><i class="fas fa-check"></i> Aceitar</button><button class="btn btn-delete" data-action="decline-transfer" data-id="${card.id}"><i class="fas fa-times"></i> Recusar</button>`;
            } else if (isDone) {
                actionsHTML = `<button class="btn btn-reabrir" data-id="${card.id}"><i class="fas fa-undo"></i> Reabrir</button><button class="btn btn-copiar" data-id="${card.id}" data-team="${card.time}"><i class="fas fa-copy"></i> Copiar</button>`;
            } else {
                const concluirDisabled = !hasBeenActive ? 'disabled' : '';
                const concluirTitle = !hasBeenActive ? 'title="Marque como Ativo para poder concluir"' : '';
                
                // AQUI ESTÁ A NOVA REGRA PARA O BOTÃO AJUDA/TRANSFERIR
                const ajudaDisabled = isActive ? 'disabled' : '';
                const ajudaTitle = isActive ? 'title="Pause a atividade para pedir ajuda ou transferir"' : '';

                actionsHTML = `<button class="btn btn-concluir" data-id="${card.id}" ${concluirDisabled} ${concluirTitle}><i class="fas fa-check-circle"></i> Concluir</button><button class="btn btn-ajuda" data-id="${card.id}" ${ajudaDisabled} ${ajudaTitle}><i class="fas fa-life-ring"></i> Ajuda</button>`;
                
                if (isActive) {
                    actionsHTML += `<button class="btn btn-pausar" data-id="${card.id}"><i class="fas fa-pause-circle"></i> Pausar</button>`;
                } else {
                    actionsHTML += `<button class="btn btn-ativo" data-id="${card.id}"><i class="fas fa-play-circle"></i> Ativo</button>`;
                }
            }
            el.innerHTML = `
                <button class="card-history-btn" data-card-id="${card.id}" title="Ver Histórico"><i class="fas fa-clock"></i></button>
                <div class="card-content">
                    <h3>${card.time}</h3>
                    ${isPendingTransfer ? `<div class="transfer-info">Transferência de: <strong>${card.transferInfo.fromMonitor}</strong></div>` : ''}
                    <p><strong>Status:</strong> ${statusState} <span class="status-time">${statusTime}</span></p>
                </div>
                <div class="actions">${actionsHTML}</div>`;
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
        boardContainer.querySelectorAll('.btn-copiar').forEach(btn => btn.addEventListener('click', () => copyText(btn.dataset.team)));
        boardContainer.querySelectorAll('.card-history-btn').forEach(btn => btn.addEventListener('click', () => showCardHistory(btn.dataset.cardId)));
        boardContainer.querySelectorAll('[data-action="accept-transfer"]').forEach(btn => btn.addEventListener('click', () => acceptTransfer(btn.dataset.id)));
        boardContainer.querySelectorAll('[data-action="decline-transfer"]').forEach(btn => btn.addEventListener('click', () => declineTransfer(btn.dataset.id)));
    }

    function toggleCardButtons(cardId, disabled) {
        const button = boardContainer.querySelector(`[data-id="${cardId}"], [data-card-id="${cardId}"]`);
        if (button) {
            const cardElement = button.closest('.card');
            if (cardElement) cardElement.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
        }
    }

    async function addLogEntry(id, statusState, logMessage, extraPayload = {}) {
        toggleCardButtons(id, true);
        const logEntry = { timestamp: new Date(), mensagem: logMessage };
        const payload = {
            currentStatus: { state: statusState, timestamp: new Date() },
            historico: firebase.firestore.FieldValue.arrayUnion(logEntry),
            ...extraPayload
        };
        try { await db.collection("cards").doc(id).update(payload); } catch (error) {
            console.error("Erro ao atualizar card:", error);
            showAlert('Erro ao atualizar o card.', 'error');
            toggleCardButtons(id, false);
        }
    }

    function marcarFeito(id) { addLogEntry(id, "feito", "Card concluído"); }
    function marcarAtivo(id) { addLogEntry(id, "ativo", "Marcado como ativo", { foiAtivado: true }); }
    function reabrirCard(id) { addLogEntry(id, "pendente", "Card reaberto"); }
    function pausarCard(id) { addLogEntry(id, "pendente", "Atividade pausada"); }
    
    async function pedirAjuda(id) {
        currentTransferCardId = id;
        const transferModal = document.getElementById('transferModal');
        const transferMonitorSelect = document.getElementById('transferMonitorSelect');
        transferModal.classList.add('visible');
        const currentMonitor = document.getElementById('monitorSelect').value;
        await populateSelect(transferMonitorSelect, 'monitors', 'Selecione um monitor...', [currentMonitor]);
    }
    
    async function confirmTransfer() {
        if (!currentTransferCardId) return;
        const toMonitor = document.getElementById('transferMonitorSelect').value;
        if (!toMonitor) return showAlert('Selecione um monitor.', 'error');
        const cardRef = db.collection('cards').doc(currentTransferCardId);
        const logEntry = { timestamp: new Date(), mensagem: `Transferência iniciada de ${document.getElementById('monitorSelect').value} para ${toMonitor}` };
        try {
            await cardRef.update({
                transferInfo: { fromMonitor: document.getElementById('monitorSelect').value, toMonitor: toMonitor, status: 'pending' },
                historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
            });
            showAlert('Card transferido!', 'success');
            document.getElementById('transferModal').classList.remove('visible');
            currentTransferCardId = null;
        } catch(error) { showAlert('Erro ao transferir.', 'error'); }
    }
    
    // AQUI ESTÁ A MUDANÇA PRINCIPAL
    async function acceptTransfer(id) {
        const cardRef = db.collection('cards').doc(id);
        const cardDoc = await cardRef.get();
        if (!cardDoc.exists) return;
        
        const toMonitor = cardDoc.data().transferInfo.toMonitor;
        const now = new Date();
        const logEntry = { timestamp: now, mensagem: `Transferência aceita por ${toMonitor}` };

        // Reseta o card para o estado "não iniciado"
        await cardRef.update({
            monitor: toMonitor,
            currentStatus: { state: "pendente", timestamp: now },
            foiAtivado: false,
            transferInfo: firebase.firestore.FieldValue.delete(),
            historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
        });
    }

    async function declineTransfer(id) {
        const cardRef = db.collection('cards').doc(id);
        const cardDoc = await cardRef.get();
        if (!cardDoc.exists) return;
        const toMonitor = cardDoc.data().transferInfo.toMonitor;
        const logEntry = { timestamp: new Date(), mensagem: `Transferência recusada por ${toMonitor}` };
        await cardRef.update({
            transferInfo: firebase.firestore.FieldValue.delete(),
            historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
        });
    }

    function copyText(teamName) {
        const textToCopy = `Monitoria do Time ${teamName} atualizada ✅`;
        navigator.clipboard.writeText(textToCopy).then(() => showAlert('Texto copiado!', 'success'), () => showAlert('Falha ao copiar.', 'error'));
    }

    async function showCardHistory(cardId) {
        const titleEl = document.getElementById('cardHistoryTitle');
        const resultsEl = document.getElementById('cardHistoryResults');
        resultsEl.innerHTML = '<p class="placeholder-text">Carregando...</p>';
        cardHistoryModal.classList.add('visible');
        try {
            const doc = await db.collection('cards').doc(cardId).get();
            if (!doc.exists) { resultsEl.innerHTML = '<p>Card não encontrado.</p>'; return; }
            const card = doc.data();
            titleEl.textContent = `Histórico - ${card.time}`;
            let logsHTML = '';
            if (card.historico && card.historico.length > 0) {
                card.historico.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
                card.historico.forEach(log => { logsHTML += `<li><span class="log-time">${formatarDataHoraBR(log.timestamp)}</span><span>${log.mensagem}</span></li>`; });
            } else { logsHTML = '<li>Nenhum histórico detalhado.</li>'; }
            resultsEl.innerHTML = `<ul class="log-list">${logsHTML}</ul>`;
        } catch (error) {
            console.error("Erro ao buscar histórico do card:", error);
            resultsEl.innerHTML = '<p>Ocorreu um erro ao buscar o histórico.</p>';
        }
    }

    async function deleteCard(id) {
        if (confirm('Tem certeza que deseja EXCLUIR este card permanentemente?')) {
            try {
                await db.collection('cards').doc(id).delete();
                showAlert('Card excluído com sucesso.', 'success');
            } catch (error) { showAlert('Erro ao excluir o card.', 'error'); }
        }
    }

    async function fetchHistory() {
        const historyResults = document.getElementById('historyResults');
        const startDateString = document.getElementById('historyDateStart').value;
        const endDateString = document.getElementById('historyDateEnd').value;
        if (!startDateString || !endDateString) return showAlert('Selecione as datas.', 'error');
        const startDate = new Date(startDateString + 'T00:00:00');
        const endDate = new Date(endDateString + 'T23:59:59');
        historyResults.innerHTML = '<p class="placeholder-text">Buscando...</p>';
        try {
            const snapshot = await db.collection('cards').where('data', '>=', startDate).where('data', '<=', endDate).orderBy('data', 'desc').get();
            if (snapshot.empty) {
                historyResults.innerHTML = '<p class="placeholder-text">Nenhuma atividade encontrada.</p>';
                return;
            }
            historyResults.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const card = doc.data();
                const cardEl = document.createElement('div');
                cardEl.className = 'history-item';
                let logsHTML = '';
                if (card.historico && card.historico.length > 0) {
                    card.historico.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
                    card.historico.forEach(log => { logsHTML += `<li><span class="log-time">${formatarDataHoraBR(log.timestamp)}</span><span>${log.mensagem}</span></li>`; });
                } else { logsHTML = '<li>Nenhum log detalhado.</li>'; }
                cardEl.innerHTML = `
                    <div class="history-item-header">
                        <span>${card.time} (${card.monitor}) - ${formatarDataBR(card.data)}</span>
                        <button class="icon-btn btn-delete-card" data-id="${doc.id}" title="Excluir Card"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <ul class="log-list">${logsHTML}</ul>`;
                historyResults.appendChild(cardEl);
            });
        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
            showAlert('Erro ao carregar o histórico.', 'error');
            historyResults.innerHTML = '<p class="placeholder-text">Ocorreu um erro ao buscar.</p>';
        }
    }

    async function renderManagementList(collectionName, listElementId) {
        const listEl = document.getElementById(listElementId);
        listEl.innerHTML = '<li>Carregando...</li>';
        db.collection(collectionName).orderBy('name').onSnapshot(snapshot => {
            if (snapshot.empty) {
                listEl.innerHTML = '<li>Nenhum item cadastrado.</li>';
                return;
            }
            listEl.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const item = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${item.name}</span>
                    <div class="action-buttons">
                        <button class="btn-edit" data-collection="${collectionName}" data-id="${doc.id}" data-name="${item.name}" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-delete-card" data-collection="${collectionName}" data-id="${doc.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                listEl.appendChild(li);
            });
        });
    }
    
    async function addItem(collectionName, inputElementId) {
        const inputEl = document.getElementById(inputElementId);
        const name = inputEl.value.trim();
        if (!name) return showAlert('Por favor, insira um nome.', 'error');
        try {
            await db.collection(collectionName).add({ name: name });
            showAlert(`${collectionName === 'monitors' ? 'Monitor' : 'Time'} adicionado com sucesso!`, 'success');
            inputEl.value = '';
        } catch (error) { showAlert(`Erro ao adicionar item.`, 'error'); }
    }

    async function editItem(collectionName, id, oldName) {
        const newName = prompt(`Editar nome:`, oldName);
        if (newName && newName.trim() !== '' && newName !== oldName) {
            try {
                await db.collection(collectionName).doc(id).update({ name: newName });
                showAlert('Nome atualizado! Aviso: Cards antigos não serão alterados.', 'success');
            } catch (error) { showAlert('Erro ao atualizar.', 'error'); }
        }
    }

    async function deleteItem(collectionName, id) {
        if (confirm(`Tem certeza que deseja excluir este item permanentemente?`)) {
            try {
                await db.collection(collectionName).doc(id).delete();
                showAlert('Item excluído com sucesso!', 'success');
            } catch (error) { showAlert('Erro ao excluir.', 'error'); }
        }
    }

    async function renderDistributionMatrix() {
        const container = document.getElementById('distributionMatrixContainer');
        container.innerHTML = '<p>Carregando...</p>';
        try {
            const monitorsSnapshot = await db.collection('monitors').orderBy('name').get();
            const teamsSnapshot = await db.collection('teams').orderBy('name').get();
            const monitors = monitorsSnapshot.docs.map(doc => doc.data().name);
            const teams = teamsSnapshot.docs.map(doc => doc.data().name);
            if (monitors.length === 0 || teams.length === 0) { container.innerHTML = '<p>Crie monitores e times primeiro.</p>'; return; }
            let tableHTML = '<table><thead><tr><th>Time</th>';
            monitors.forEach(monitor => tableHTML += `<th>${monitor}</th>`);
            tableHTML += '</tr></thead><tbody>';
            teams.forEach(team => {
                tableHTML += `<tr><td>${team}</td>`;
                monitors.forEach(monitor => { tableHTML += `<td><input type="checkbox" data-team="${team}" data-monitor="${monitor}"></td>`; });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            container.innerHTML = tableHTML;
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => checkbox.addEventListener('change', () => updateDistributionSummary(monitors)));
            updateDistributionSummary(monitors);
        } catch (error) { console.error("Erro ao criar matriz:", error); container.innerHTML = '<p>Erro ao carregar dados.</p>'; }
    }

    function updateDistributionSummary(monitors) {
        const summaryContainer = document.getElementById('distribution-summary');
        const summary = monitors.map(monitor => {
            const count = document.querySelectorAll(`#distributionMatrixContainer input[data-monitor="${monitor}"]:checked`).length;
            return count > 0 ? `<strong>${monitor}:</strong> ${count}` : null;
        }).filter(Boolean).join(' | ');
        summaryContainer.innerHTML = summary;
    }

    async function saveAssignments() {
        const distDate = document.getElementById('distDate').value;
        if (!distDate) return showAlert('Selecione uma data.', 'error');
        const checkedBoxes = document.querySelectorAll('#distributionMatrixContainer input:checked');
        if (checkedBoxes.length === 0) return showAlert('Nenhuma atribuição selecionada.', 'error');
        const batch = db.batch();
        const now = new Date();
        checkedBoxes.forEach(box => {
            const newCardRef = db.collection('cards').doc();
            batch.set(newCardRef, {
                monitor: box.dataset.monitor, time: box.dataset.team,
                data: firebase.firestore.Timestamp.fromDate(new Date(distDate + 'T12:00:00')),
                currentStatus: { state: "pendente", timestamp: now },
                precisaAjuda: false, foiAtivado: false,
                historico: [{ timestamp: now, mensagem: "Card criado" }]
            });
        });
        try {
            await batch.commit();
            showAlert('Distribuição salva!', 'success');
            settingsModal.classList.remove('visible');
        } catch (error) { console.error("Erro ao salvar:", error); showAlert('Erro ao salvar a distribuição.', 'error'); }
    }
    
    function formatarDataBR(dataStr) {
        if (!dataStr) return 'Data inválida';
        const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
        return data.toLocaleDateString('pt-BR');
    }

    function formatarDataHoraBR(dataStr) {
        if (!dataStr) return '';
        const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
        return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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
    // 2. CONFIGURAÇÃO DOS EVENT LISTENERS
    // ==========================================================
    kanbanDateSelect.addEventListener('change', updateView);
    monitorSelect.addEventListener('change', updateView);
    
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.id === 'settingsBtn') {
            settingsModal.classList.add('visible');
            renderDistributionMatrix();
            renderManagementList('monitors', 'monitorsList');
            renderManagementList('teams', 'teamsList');
        }
        if (target.id === 'historyBtn') {
            historyModal.classList.add('visible');
            const hoje = new Date(); const umaSemanaAtras = new Date();
            umaSemanaAtras.setDate(hoje.getDate() - 7);
            document.getElementById('historyDateStart').valueAsDate = umaSemanaAtras;
            document.getElementById('historyDateEnd').valueAsDate = hoje;
        }
        if (target.id === 'settingsModalCloseBtn') { settingsModal.classList.remove('visible'); }
        if (target.id === 'historyModalCloseBtn') { historyModal.classList.remove('visible'); }
        if (target.id === 'cardHistoryModalCloseBtn') { cardHistoryModal.classList.remove('visible'); }
        if (target.id === 'transferModalCloseBtn') { transferModal.classList.remove('visible'); }
        if (target.matches('.nav-btn')) {
            settingsModal.querySelectorAll('.nav-btn, .tab-content').forEach(el => el.classList.remove('active'));
            target.classList.add('active');
            document.getElementById(target.dataset.tab).classList.add('active');
        }
        if (target.id === 'addMonitorBtn') { addItem('monitors', 'newMonitorName'); }
        if (target.id === 'addTeamBtn') { addItem('teams', 'newTeamName'); }
        if (target.matches('.btn-edit')) { editItem(target.dataset.collection, target.dataset.id, target.dataset.name); }
        if (target.matches('.btn-delete-card')) { deleteCard(target.dataset.id); }
        if (target.id === 'saveAssignmentsBtn') { saveAssignments(); }
        if (target.id === 'toggleMode') { document.documentElement.classList.toggle('dark'); }
        if (target.id === 'fetchHistoryBtn') { fetchHistory(); }
        if (target.id === 'confirmTransferBtn') { confirmTransfer(); }
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
    });
    
    // ==========================================================
    // 3. INICIALIZAÇÃO DA APLICAÇÃO
    // ==========================================================
    async function initializeApp() {
        kanbanDateSelect.valueAsDate = new Date();
        document.getElementById('distDate').valueAsDate = new Date();
        await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        updateView();
    }

    initializeApp();
});
