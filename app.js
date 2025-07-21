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

    // --- Seletores do DOM (Definidos no escopo principal) ---
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
    // (As "receitas" são definidas aqui primeiro)
    // ==========================================================

    function showAlert(message, type = 'success') { /* ...código sem alteração... */ }
    async function populateSelect(selectElement, collectionName, defaultOptionText) { /* ...código sem alteração... */ }
    function renderDashboardView(dateString) { /* ...código sem alteração... */ }
    function renderKanbanView(monitor, dateString) { /* ...código sem alteração... */ }
    function renderCards(cards) { /* ...código sem alteração... */ }
    function addCardButtonListeners() { /* ...código sem alteração... */ }
    function toggleCardButtons(cardId, disabled) { /* ...código sem alteração... */ }
    async function addLogEntry(id, payload, logMessage) { /* ...código sem alteração... */ }
    function marcarFeito(id) { addLogEntry(id, { status: "feito" }, "Card concluído"); }
    function pedirAjuda(id) { addLogEntry(id, { status: "pendente", precisaAjuda: true }, "Pedido de ajuda solicitado"); }
    function marcarAtivo(id) { addLogEntry(id, { status: "ativo", precisaAjuda: false }, "Marcado como ativo"); }
    function reabrirCard(id) { addLogEntry(id, { status: "pendente" }, "Card reaberto"); }
    function pausarCard(id) { addLogEntry(id, { status: "pendente" }, "Atividade pausada"); }

    // (Funções para os modais)
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
    
    async function fetchHistory() { /* ...código sem alteração... */ }
    async function createMonitor() { /* ...código sem alteração... */ }
    async function createTeam() { /* ...código sem alteração... */ }
    function addAssignmentToList() { /* ...código sem alteração... */ }
    function renderPendingAssignments() { /* ...código sem alteração... */ }
    async function saveAssignments() { /* ...código sem alteração... */ }
    
    function formatarDataBR(dataStr) { /* ...código sem alteração... */ }
    function formatarDataHoraBR(dataStr) { /* ...código sem alteração... */ }


    // ==========================================================
    // FUNÇÃO CENTRAL DE CONTROLE
    // ==========================================================
    function updateView() {
        if (unsubscribeFromData) unsubscribeFromData();
        const selectedMonitor = monitorSelect.value;
        const selectedDateStr = kanbanDateSelect.value;
        if (selectedMonitor) {
            renderKanbanView(selectedMonitor, selectedDateStr);
        } else {
            renderDashboardView(selectedDateStr);
        }
    }

    // ==========================================================
    // FUNÇÃO DE INICIALIZAÇÃO E EVENT LISTENERS (CORRIGIDA)
    // ==========================================================
    async function initializeApp() {
        kanbanDateSelect.valueAsDate = new Date();
        await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        
        // --- Adiciona TODOS os event listeners principais aqui ---
        kanbanDateSelect.addEventListener('change', updateView);
        monitorSelect.addEventListener('change', updateView);
        
        // Listeners dos MODAIS (que estavam faltando)
        settingsBtn.addEventListener('click', openSettingsModal);
        historyBtn.addEventListener('click', openHistoryModal);
        
        // Listeners para fechar os modais
        settingsModalCloseBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        historyModalCloseBtn.addEventListener('click', () => historyModal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal || event.target == historyModal) {
                settingsModal.style.display = 'none';
                historyModal.style.display = 'none';
            }
        });

        // Listeners dos botões DENTRO dos modais
        toggleMode.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
        addMonitorBtn.addEventListener('click', createMonitor);
        addTeamBtn.addEventListener('click', createTeam);
        addAssignmentBtn.addEventListener('click', addAssignmentToList);
        saveAssignmentsBtn.addEventListener('click', saveAssignments);
        fetchHistoryBtn.addEventListener('click', fetchHistory);

        // Chama a primeira atualização da tela
        updateView();
    }

    // Finalmente, chama a função de inicialização
    initializeApp();

});
