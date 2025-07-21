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
// ... (todos os seletores anteriores)
const monitorSelect = document.getElementById('monitorSelect');
const board = document.getElementById('kanbanBoard');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
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
// NOVO: Seletores para o Alerta
const customAlert = document.getElementById('customAlert');
const customAlertMessage = document.getElementById('customAlertMessage');

// --- Variáveis Globais ---
let unsubscribeFromCards = null;
let pendingAssignments = [];
let alertTimer = null; // Para controlar o tempo de exibição do alerta

// ==========================================================
// NOVO: Função para Alertas em Tela
// ==========================================================
function showAlert(message, type = 'success') {
    // Limpa qualquer alerta que já esteja na tela
    if (alertTimer) {
        clearTimeout(alertTimer);
    }

    customAlertMessage.textContent = message;
    
    // Define a classe para cor (success ou error)
    customAlert.className = 'custom-alert'; // Reseta as classes
    customAlert.classList.add(type);

    // Mostra o alerta
    customAlert.classList.add('show');

    // Esconde o alerta após 3 segundos
    alertTimer = setTimeout(() => {
        customAlert.classList.remove('show');
    }, 3000);
}


// --- Funções de Inicialização ---
async function populateSelect(selectElement, collectionName) { /* ...código sem alteração... */ }
window.onload = () => { /* ...código sem alteração... */ };


// --- Lógica do Kanban ---
monitorSelect.onchange = () => { /* ...código sem alteração... */ };
function renderCards(cards, monitor) { /* ...código sem alteração... */ }
function addCardButtonListeners(monitor) { /* ...código sem alteração... */ }


// --- Funções de Ação dos Cards (Atualizadas) ---
async function atualizarCard(id, payload) {
    try {
        await db.collection("cards").doc(id).update(payload);
    } catch (error) {
        console.error("Erro ao atualizar o card:", error);
        // ANTES: alert('Ocorreu um erro ao atualizar o card.');
        showAlert('Erro ao atualizar o card.', 'error'); // DEPOIS
    }
}
async function marcarFeito(id) { await atualizarCard(id, { status: "feito", log: `Concluído em ${new Date().toLocaleString('pt-BR')}` }); }
async function pedirAjuda(id) { await atualizarCard(id, { status: "pendente", precisaAjuda: true, log: "Pedido de ajuda solicitado" }); }
async function marcarAtivo(id) { await atualizarCard(id, { status: "ativo", precisaAjuda: false, log: "Marcado como ativo" }); }


// --- Lógica do Modal (Atualizada) ---
settingsBtn.onclick = () => { /* ...código sem alteração... */ };
modalCloseBtn.onclick = () => settingsModal.style.display = 'none';
window.onclick = (event) => { /* ...código sem alteração... */ };

toggleMode.onclick = () => document.documentElement.classList.toggle('dark');

addMonitorBtn.onclick = async () => {
    const name = newMonitorNameInput.value.trim();
    if (!name) {
        // ANTES: return alert('Por favor, insira um nome para o monitor.');
        return showAlert('Insira um nome para o monitor.', 'error'); // DEPOIS
    }
    try {
        await db.collection('monitors').add({ name: name });
        // ANTES: alert(`Monitor "${name}" criado com sucesso!`);
        showAlert(`Monitor "${name}" criado!`, 'success'); // DEPOIS
        newMonitorNameInput.value = '';
        populateSelect(monitorSelect, 'monitors');
        populateSelect(distMonitorSelect, 'monitors');
    } catch (error) {
        console.error("Erro ao criar monitor: ", error);
        // ANTES: alert('Erro ao criar monitor.');
        showAlert('Erro ao criar monitor.', 'error'); // DEPOIS
    }
};

addTeamBtn.onclick = async () => {
    const name = newTeamNameInput.value.trim();
    if (!name) {
        // ANTES: return alert('Por favor, insira um nome para o time.');
        return showAlert('Insira um nome para o time.', 'error'); // DEPOIS
    }
    try {
        await db.collection('teams').add({ name: name });
        // ANTES: alert(`Time "${name}" criado com sucesso!`);
        showAlert(`Time "${name}" criado!`, 'success'); // DEPOIS
        newTeamNameInput.value = '';
        populateSelect(distTeamSelect, 'teams');
    } catch (error) {
        console.error("Erro ao criar time: ", error);
        // ANTES: alert('Erro ao criar time.');
        showAlert('Erro ao criar time.', 'error'); // DEPOIS
    }
};

// --- Lógica da Distribuição (Atualizada) ---
addAssignmentBtn.onclick = () => {
    const assignment = { monitor: distMonitorSelect.value, team: distTeamSelect.value, date: distDateInput.value };
    if (!assignment.monitor || !assignment.team || !assignment.date) {
        // ANTES: return alert('Por favor, selecione data, monitor e time.');
        return showAlert('Selecione data, monitor e time.', 'error'); // DEPOIS
    }
    pendingAssignments.push(assignment);
    renderPendingAssignments();
};

function renderPendingAssignments() { /* ...código sem alteração... */ }

saveAssignmentsBtn.onclick = async () => {
    if (pendingAssignments.length === 0) {
        // ANTES: return alert('Nenhuma distribuição para salvar.');
        return showAlert('Nenhuma distribuição para salvar.', 'error'); // DEPOIS
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
        // ANTES: alert('Distribuição salva com sucesso!');
        showAlert('Distribuição salva com sucesso!', 'success'); // DEPOIS
        pendingAssignments = [];
        renderPendingAssignments();
    } catch (error) {
        console.error("Erro ao salvar distribuição: ", error);
        // ANTES: alert('Ocorreu um erro ao salvar a distribuição.');
        showAlert('Erro ao salvar a distribuição.', 'error'); // DEPOIS
    }
};

// --- Funções Utilitárias ---
function formatarDataBR(dataStr) { /* ...código sem alteração... */ }
