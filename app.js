// ---- Início: Configuração do Firebase ----
const firebaseConfig = {
  apiKey: "AIzaSyArGe8B4_ptptY6EU1B5OWSVKEj_1mUnus",
  authDomain: "monitoriasite-eb2ad.firebaseapp.com",
  projectId: "monitoriasite-eb2ad",
  storageBucket: "monitoriasite-eb2ad.firebasestorage.app",
  messagingSenderId: "992773117560",
  appId: "1:992773117560:web:d10679616fd64fe66c7f8d",
  measurementId: "G-80845BMJMZ"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ---- Fim: Configuração do Firebase ----

// --- Seletores do DOM ---
// Os seletores são movidos para dentro do onload para garantir que os elementos existam.
let monitorSelect, board, settingsBtn, settingsModal, modalCloseBtn, toggleMode,
    newMonitorNameInput, addMonitorBtn, newTeamNameInput, addTeamBtn,
    distDateInput, distMonitorSelect, distTeamSelect, addAssignmentBtn,
    assignmentList, saveAssignmentsBtn, customAlert, customAlertMessage;

// --- Variáveis Globais ---
let unsubscribeFromCards = null;
let pendingAssignments = [];
let alertTimer = null;

// ==========================================================
// A execução principal começa quando a janela inteira é carregada
// ==========================================================
window.onload = () => {
    // --- Atribuição dos Seletores do DOM ---
    // Agora temos certeza que todos os elementos do HTML já foram carregados
    monitorSelect = document.getElementById('monitorSelect');
    board = document.getElementById('kanbanBoard');
    settingsBtn = document.getElementById('settingsBtn');
    settingsModal = document.getElementById('settingsModal');
    modalCloseBtn = document.getElementById('modalCloseBtn');
    toggleMode = document.getElementById('toggleMode');
    newMonitorNameInput = document.getElementById('newMonitorName');
    addMonitorBtn = document.getElementById('addMonitorBtn');
    newTeamNameInput = document.getElementById('newTeamName');
    addTeamBtn = document.getElementById('addTeamBtn');
    distDateInput = document.getElementById('distDate');
    distMonitorSelect = document.getElementById('distMonitorSelect');
    distTeamSelect = document.getElementById('distTeamSelect');
    addAssignmentBtn = document.getElementById('addAssignmentBtn');
    assignmentList = document.getElementById('assignmentList');
    saveAssignmentsBtn = document.getElementById('saveAssignmentsBtn');
    customAlert = document.getElementById('customAlert');
    customAlertMessage = document.getElementById('customAlertMessage');

    // --- Configuração dos Event Listeners ---
    // A lógica dos botões é movida para cá
    monitorSelect.onchange = handleMonitorChange;
    settingsBtn.onclick = openSettingsModal;
    modalCloseBtn.onclick = closeSettingsModal;
    window.onclick = (event) => {
        if (event.target == settingsModal) {
            closeSettingsModal();
        }
    };
    toggleMode.onclick = () => document.documentElement.classList.toggle('dark');
    addMonitorBtn.onclick = createMonitor;
    addTeamBtn.onclick = createTeam;
    addAssignmentBtn.onclick = addAssignmentToList;
    saveAssignmentsBtn.onclick = saveAssignments;

    // --- Inicialização da Página ---
    populateSelect(monitorSelect, 'monitors');
    distDateInput.valueAsDate = new Date();
};


// ==========================================================
// FUNÇÕES
// (O resto do código é organizado em funções)
// ==========================================================

function showAlert(message, type = 'success') {
    if (alertTimer) clearTimeout(alertTimer);
    customAlertMessage.textContent = message;
    customAlert.className = 'custom-alert';
    customAlert.classList.add(type, 'show');
    alertTimer = setTimeout(() => {
        customAlert.classList.remove('show');
    }, 3000);
}

async function populateSelect(selectElement, collectionName) {
    selectElement.innerHTML = `<option value="">Selecione...</option>`;
    const snapshot = await db.collection(collectionName).orderBy("name").get();
    snapshot.docs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().name;
        option.textContent = doc.data().name;
        selectElement.appendChild(option);
    });
}

function handleMonitorChange() {
    if (unsubscribeFromCards) unsubscribeFromCards();
    const monitor = monitorSelect.value;
    if (!monitor) {
        board.innerHTML = '<p>Por favor, selecione seu nome.</p>';
        return;
    }
    unsubscribeFromCards = db.collection("cards").where("monitor", "==", monitor)
        .onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const cards = data.filter(c => {
                if (!c.data || !c.data.toDate) return false;
                const cardDate = c.data.toDate();
                cardDate.setHours(0, 0, 0, 0);
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

function renderCards(cards) {
    board.innerHTML = '';
    if (cards.length === 0) {
        board.innerHTML = '<p>Você não tem cards hoje.</p>';
        return;
    }
    cards.forEach(card => {
        const el = document.createElement('div');
        el.className = `card ${card.status === 'feito' ? 'done' : ''} ${card.status === 'ativo' ? 'active' : ''}`;
        el.innerHTML = `
            <h3>${card.time}</h3>
            <p><strong>Data:</strong> ${formatarDataBR(card.data)}</p>
            <p><strong>Status:</strong> ${card.status}</p>
            ${card.log ? `<p><strong>Log:</strong> ${card.log}</p>` : ''}
            <div class="actions">
                <button class="btn btn-concluir" data-id="${card.id}" ${card.status === 'feito' ? 'disabled' : ''}>✅ Concluir</button>
                <button class="btn btn-ajuda" data-id="${card.id}">🆘 Pedir ajuda</button>
                <button class="btn btn-ativo" data-id="${card.id}" ${card.status === 'feito' ? 'disabled' : ''}>🔵 Ativo</button>
            </div>`;
        board.appendChild(el);
    });
    addCardButtonListeners();
}

function addCardButtonListeners() {
    document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => marcarFeito(btn.dataset.id)));
    document.querySelectorAll('.btn-ajuda').forEach(btn => btn.addEventListener('click', () => pedirAjuda(btn.dataset.id)));
    document.querySelectorAll('.btn-ativo').forEach(btn => btn.addEventListener('click', () => marcarAtivo(btn.dataset.id)));
}

async function atualizarCard(id, payload) {
    try {
        await db.collection("cards").doc(id).update(payload);
    } catch (error) {
        console.error("Erro ao atualizar o card:", error);
        showAlert('Erro ao atualizar o card.', 'error');
    }
}

async function marcarFeito(id) { await atualizarCard(id, { status: "feito", log: `Concluído em ${new Date().toLocaleString('pt-BR')}` }); }
async function pedirAjuda(id) { await atualizarCard(id, { status: "pendente", precisaAjuda: true, log: "Pedido de ajuda solicitado" }); }
async function marcarAtivo(id) { await atualizarCard(id, { status: "ativo", precisaAjuda: false, log: "Marcado como ativo" }); }

function openSettingsModal() {
    settingsModal.style.display = 'flex';
    populateSelect(distMonitorSelect, 'monitors');
    populateSelect(distTeamSelect, 'teams');
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
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
    } catch (error) {
        console.error("Erro ao criar monitor: ", error);
        showAlert('Erro ao criar monitor.', 'error');
    }
}

async function createTeam() {
    const name = newTeamNameInput.value.trim();
    if (!name) return showAlert('Insira um nome para o time.', 'error');
    try {
        await db.collection('teams').add({ name: name });
        showAlert(`Time "${name}" criado!`, 'success');
        newTeamNameInput.value = '';
        populateSelect(distTeamSelect, 'teams');
    } catch (error) {
        console.error("Erro ao criar time: ", error);
        showAlert('Erro ao criar time.', 'error');
    }
}

function addAssignmentToList() {
    const assignment = { monitor: distMonitorSelect.value, team: distTeamSelect.value, date: distDateInput.value };
    if (!assignment.monitor || !assignment.team || !assignment.date) {
        return showAlert('Selecione data, monitor e time.', 'error');
    }
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
    if (pendingAssignments.length === 0) {
        return showAlert('Nenhuma distribuição para salvar.', 'error');
    }
    const batch = db.batch();
    pendingAssignments.forEach(item => {
        const newCardRef = db.collection('cards').doc();
        batch.set(newCardRef, {
            monitor: item.monitor,
            time: item.team,
            data: firebase.firestore.Timestamp.fromDate(new Date(item.date + 'T12:00:00')),
            status: "pendente",
            log: "Card criado",
            precisaAjuda: false,
            transferidoPara: ""
        });
    });
    try {
        await batch.commit();
        showAlert('Distribuição salva com sucesso!', 'success');
        pendingAssignments = [];
        renderPendingAssignments();
    } catch (error) {
        console.error("Erro ao salvar distribuição: ", error);
        showAlert('Erro ao salvar a distribuição.', 'error');
    }
}

function formatarDataBR(dataStr) {
    const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}
