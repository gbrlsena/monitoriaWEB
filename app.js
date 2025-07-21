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
    
    // --- Variáveis Globais ---
    let unsubscribeFromData = null;
    let alertTimer = null;

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
                const pendingCards = allCards.filter(c => c.status === 'pendente');
                const percentage = totalCards > 0 ? Math.round((completedCards.length / totalCards) * 100) : 0;
                
                const dashboardHTML = `
                    <div class="progress-container">
                        <div class="progress-circle" style="--progress: ${percentage}%">
                            <div class="progress-inner"><div><div class="progress-percentage">${percentage}%</div><div class="progress-label">Concluído</div></div></div>
                        </div>
                    </div>
                    <div class="dashboard-grid">
                        <div class="dashboard-panel">
                            <h3>Ativos no Momento</h3>
                            <ul>${ activeCards.length > 0 ? activeCards.map(c => `<li><span class="monitor-name">${c.monitor}</span> em <span class="team-name">${c.time}</span></li>`).join('') : '<li>Ninguém ativo no momento.</li>' }</ul>
                        </div>
                        <div class="dashboard-panel">
                            <h3>Pendentes</h3>
                            <ul>${ pendingCards.length > 0 ? pendingCards.map(c => `<li><span class="team-name">${c.time}</span> (com <span class="monitor-name">${c.monitor}</span>)</li>`).join('') : '<li>Nenhum card pendente.</li>' }</ul>
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
                let cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Lógica de ordenação: ativo > pendente > feito
                cards.sort((a, b) => {
                    const statusOrder = { 'ativo': 1, 'pendente': 2, 'feito': 3 };
                    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                });

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
                actionsHTML = `
                    <button class="btn btn-reabrir" data-id="${card.id}">↩️ Reabrir</button>
                    <button class="btn btn-copiar" data-id="${card.id}" data-team="${card.time}">📋 Copiar</button>
                `;
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
        boardContainer.querySelectorAll('.btn-copiar').forEach(btn => btn.addEventListener('click', () => copyText(btn.dataset.team)));
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
        try { await db.collection("cards").doc(id).update(finalPayload); } catch (error) {
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
    function copyText(teamName) {
        const textToCopy = `Monitoria do Time ${teamName} atualizada ✅`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showAlert('Texto copiado com sucesso!', 'success');
        }, () => {
            showAlert('Falha ao copiar o texto.', 'error');
        });
    }

    async function createMonitor() {
        const name = document.getElementById('newMonitorName').value.trim();
        if (!name) return showAlert('Insira um nome para o monitor.', 'error');
        try {
            await db.collection('monitors').add({ name: name });
            showAlert(`Monitor "${name}" criado!`, 'success');
            document.getElementById('newMonitorName').value = '';
            populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        } catch (error) { showAlert('Erro ao criar monitor.', 'error'); }
    }

    async function createTeam() {
        const name = document.getElementById('newTeamName').value.trim();
        if (!name) return showAlert('Insira um nome para o time.', 'error');
        try {
            await db.collection('teams').add({ name: name });
            showAlert(`Time "${name}" criado!`, 'success');
            document.getElementById('newTeamName').value = '';
        } catch (error) { showAlert('Erro ao criar time.', 'error'); }
    }
    
    async function renderDistributionMatrix() {
        const container = document.getElementById('distributionMatrixContainer');
        const summaryContainer = document.getElementById('distribution-summary');
        container.innerHTML = '<p>Carregando...</p>';

        try {
            const monitorsSnapshot = await db.collection('monitors').orderBy('name').get();
            const teamsSnapshot = await db.collection('teams').orderBy('name').get();
            const monitors = monitorsSnapshot.docs.map(doc => doc.data().name);
            const teams = teamsSnapshot.docs.map(doc => doc.data().name);

            if (monitors.length === 0 || teams.length === 0) {
                container.innerHTML = '<p>Crie monitores e times primeiro.</p>';
                return;
            }

            let tableHTML = '<table><thead><tr><th>Time</th>';
            monitors.forEach(monitor => tableHTML += `<th>${monitor}</th>`);
            tableHTML += '</tr></thead><tbody>';

            teams.forEach(team => {
                tableHTML += `<tr><td>${team}</td>`;
                monitors.forEach(monitor => {
                    tableHTML += `<td><input type="checkbox" data-team="${team}" data-monitor="${monitor}"></td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            container.innerHTML = tableHTML;

            // Adiciona listener para atualizar o sumário
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', () => updateDistributionSummary(monitors));
            });
            updateDistributionSummary(monitors);

        } catch (error) {
            console.error("Erro ao criar matriz:", error);
            container.innerHTML = '<p>Erro ao carregar dados.</p>';
        }
    }

    function updateDistributionSummary(monitors) {
        const summaryContainer = document.getElementById('distribution-summary');
        let summary = [];
        monitors.forEach(monitor => {
            const count = document.querySelectorAll(`input[data-monitor="${monitor}"]:checked`).length;
            if (count > 0) {
                summary.push(`<strong>${monitor}:</strong> ${count}`);
            }
        });
        summaryContainer.innerHTML = summary.join(' | ');
    }

    async function saveAssignments() {
        const distDate = document.getElementById('distDate');
        const date = distDate.value;
        if (!date) return showAlert('Por favor, selecione uma data.', 'error');

        const checkedBoxes = document.querySelectorAll('#distributionMatrixContainer input:checked');
        if (checkedBoxes.length === 0) return showAlert('Nenhuma atribuição selecionada.', 'error');

        const batch = db.batch();
        checkedBoxes.forEach(box => {
            const newCardRef = db.collection('cards').doc();
            batch.set(newCardRef, {
                monitor: box.dataset.monitor,
                time: box.dataset.team,
                data: firebase.firestore.Timestamp.fromDate(new Date(date + 'T12:00:00')),
                status: "pendente",
                precisaAjuda: false,
                historico: [{ timestamp: new Date(), mensagem: "Card criado" }]
            });
        });

        try {
            await batch.commit();
            showAlert('Distribuição salva com sucesso!', 'success');
            document.getElementById('settingsModal').classList.remove('visible');
        } catch (error) {
            console.error("Erro ao salvar distribuição:", error);
            showAlert('Erro ao salvar a distribuição.', 'error');
        }
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
        switch (target.id) {
            case 'settingsBtn':
                document.getElementById('settingsModal').classList.add('visible');
                renderDistributionMatrix();
                break;
            case 'historyBtn':
                document.getElementById('historyModal').classList.add('visible');
                break;
            case 'settingsModalCloseBtn':
                document.getElementById('settingsModal').classList.remove('visible');
                break;
            case 'historyModalCloseBtn':
                document.getElementById('historyModal').classList.remove('visible');
                break;
            case 'toggleMode': document.documentElement.classList.toggle('dark'); break;
            case 'addMonitorBtn': createMonitor(); break;
            case 'addTeamBtn': createTeam(); break;
            case 'saveAssignmentsBtn': saveAssignments(); break;
            case 'fetchHistoryBtn': fetchHistory(); break;
        }
    });

    // Listener para fechar modais
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
