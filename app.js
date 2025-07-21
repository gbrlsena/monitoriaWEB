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

    // --- DEFINIÇÃO DE TODAS AS FUNÇÕES ---
    // (Todas as funções auxiliares como showAlert, populateSelect, etc. ficam aqui)
    // ...

    // --- FUNÇÃO DE INICIALIZAÇÃO ---
    async function initializeApp() {
        kanbanDateSelect.valueAsDate = new Date();
        await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
        updateView();
    }
    
    // --- FUNÇÃO CENTRAL DE CONTROLE ---
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
    // CONFIGURAÇÃO DOS EVENT LISTENERS - AQUI ESTÁ A CORREÇÃO
    // ==========================================================
    
    // Listeners principais
    kanbanDateSelect.addEventListener('change', updateView);
    monitorSelect.addEventListener('change', updateView);
    
    // Listeners para abrir os modais
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('visible');
        distDateInput.valueAsDate = new Date();
        populateSelect(distMonitorSelect, 'monitors', 'Selecione...');
        populateSelect(distTeamSelect, 'teams', 'Selecione...');
    });
    historyBtn.addEventListener('click', () => {
        historyModal.classList.add('visible');
        const hoje = new Date();
        const umaSemanaAtras = new Date();
        umaSemanaAtras.setDate(hoje.getDate() - 7);
        historyDateStart.valueAsDate = umaSemanaAtras;
        historyDateEnd.valueAsDate = hoje;
    });
    
    // Listeners para fechar os modais
    settingsModalCloseBtn.addEventListener('click', () => settingsModal.classList.remove('visible'));
    historyModalCloseBtn.addEventListener('click', () => historyModal.classList.remove('visible'));
    
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.classList.remove('visible');
        }
    });
    historyModal.addEventListener('click', (event) => {
        if (event.target === historyModal) {
            historyModal.classList.remove('visible');
        }
    });

    // Listeners para os botões dentro dos modais
    toggleMode.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
    addMonitorBtn.addEventListener('click', createMonitor);
    addTeamBtn.addEventListener('click', createTeam);
    addAssignmentBtn.addEventListener('click', addAssignmentToList);
    saveAssignmentsBtn.addEventListener('click', saveAssignments);
    fetchHistoryBtn.addEventListener('click', fetchHistory);


    // ==========================================================
    // TODAS AS OUTRAS FUNÇÕES (sem alterações)
    // ==========================================================
    function showAlert(message, type = 'success') { /* ... */ }
    async function populateSelect(selectElement, collectionName, defaultOptionText) { /* ... */ }
    function renderDashboardView(dateString) { /* ... */ }
    function renderKanbanView(monitor, dateString) { /* ... */ }
    function renderCards(cards) { /* ... */ }
    function addCardButtonListeners() { /* ... */ }
    function toggleCardButtons(cardId, disabled) { /* ... */ }
    async function addLogEntry(id, payload, logMessage) { /* ... */ }
    function marcarFeito(id) { addLogEntry(id, { status: "feito" }, "Card concluído"); }
    function pedirAjuda(id) { addLogEntry(id, { status: "pendente", precisaAjuda: true }, "Pedido de ajuda solicitado"); }
    function marcarAtivo(id) { addLogEntry(id, { status: "ativo", precisaAjuda: false }, "Marcado como ativo"); }
    function reabrirCard(id) { addLogEntry(id, { status: "pendente" }, "Card reaberto"); }
    function pausarCard(id) { addLogEntry(id, { status: "pendente" }, "Atividade pausada"); }
    async function fetchHistory() { /* ... */ }
    async function createMonitor() { /* ... */ }
    async function createTeam() { /* ... */ }
    function addAssignmentToList() { /* ... */ }
    function renderPendingAssignments() { /* ... */ }
    async function saveAssignments() { /* ... */ }
    function formatarDataBR(dataStr) { /* ... */ }
    function formatarDataHoraBR(dataStr) { /* ... */ }


    // --- CHAMA A INICIALIZAÇÃO DA APLICAÇÃO ---
    initializeApp();

});
