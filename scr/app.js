import { firebaseConfig, initializeFirebase } from './firebase-config.js';
import { showAlert, formatarDataBR, formatarDataHoraBR } from './helpers.js';
import { renderCards } from './cards-render.js';
import { renderKanbanView, fetchActiveAlignments, activeAlignments } from './kanban-view.js';
import { renderDashboardView } from './dashboard-view.js';
import { 
  marcarFeito, marcarAtivo, reabrirCard, pausarCard, pedirAjuda, 
  confirmTransfer, acceptTransfer, declineTransfer, showCardHistory, deleteCard,
  confirmStartTask
} from './card-actions.js';
import { 
  populateSelect, renderManagementList, addItem, editItem, deleteItem,
  renderDistributionMatrix, saveAssignments, publishAlignment
} from './management.js';
import { fetchHistory } from './history.js';

// Inicialização do Firebase
const db = initializeFirebase();
export { db };
// Variáveis globais
let unsubscribeFromData = null;
window.cardToActivateId = null;
window.currentTransferCardId = null;
window.activeAlignments = activeAlignments;

// Seletores do DOM
const kanbanDateSelect = document.getElementById('kanbanDateSelect');
const monitorSelect = document.getElementById('monitorSelect');
const boardContainer = document.getElementById('boardContainer');

// Função principal de atualização
function updateView() {
  if (unsubscribeFromData) unsubscribeFromData();
  const selectedMonitor = monitorSelect.value;
  const selectedDateStr = kanbanDateSelect.value;
  
  if (!selectedDateStr) return;
  
  if (selectedMonitor) {
    unsubscribeFromData = renderKanbanView(selectedMonitor, selectedDateStr);
  } else {
    unsubscribeFromData = renderDashboardView(selectedDateStr);
  }
}

// Configuração dos event listeners
function setupEventListeners() {
  kanbanDateSelect.addEventListener('change', updateView);
  monitorSelect.addEventListener('change', updateView);
  
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    // Modais
    if (target.id === 'settingsBtn') {
      document.getElementById('settingsModal').classList.add('visible');
      renderDistributionMatrix();
      renderManagementList('monitors', 'monitorsList');
      renderManagementList('teams', 'teamsList');
      populateSelect(document.getElementById('alignmentAuthorSelect'), 'monitors', 'Selecione seu nome...');
      
      // Popula a lista de checkboxes de times
      const teamsListContainer = document.getElementById('alignmentTeamsList');
      teamsListContainer.innerHTML = 'Carregando times...';
      db.collection('teams').orderBy('name').get().then(snapshot => {
        teamsListContainer.innerHTML = '';
        snapshot.docs.forEach(doc => {
          const teamName = doc.data().name;
          const id = `team-cb-${doc.id}`;
          teamsListContainer.innerHTML += `
            <div class="team-checkbox-item">
              <input type="checkbox" id="${id}" value="${teamName}">
              <label for="${id}">${teamName}</label>
            </div>`;
        });
      });
    }
    
    if (target.id === 'historyBtn') {
      document.getElementById('historyModal').classList.add('visible');
      const hoje = new Date(); 
      const umaSemanaAtras = new Date();
      umaSemanaAtras.setDate(hoje.getDate() - 7);
      document.getElementById('historyDateStart').valueAsDate = umaSemanaAtras;
      document.getElementById('historyDateEnd').valueAsDate = hoje;
    }
    
    if (target.id === 'settingsModalCloseBtn') { 
      document.getElementById('settingsModal').classList.remove('visible'); 
    }
    
    if (target.id === 'historyModalCloseBtn') { 
      document.getElementById('historyModal').classList.remove('visible'); 
    }
    
    if (target.id === 'cardHistoryModalCloseBtn') { 
      document.getElementById('cardHistoryModal').classList.remove('visible'); 
    }
    
    if (target.id === 'transferModalCloseBtn') { 
      document.getElementById('transferModal').classList.remove('visible'); 
    }
    
    if (target.id === 'alignmentAlertModalCloseBtn') { 
      document.getElementById('alignmentAlertModal').classList.remove('visible'); 
    }
    
    // Navegação entre abas
    if (target.matches('.nav-btn')) {
      document.querySelectorAll('.nav-btn, .tab-content').forEach(el => el.classList.remove('active'));
      target.classList.add('active');
      document.getElementById(target.dataset.tab).classList.add('active');
    }
    
    // Botões de informação
    if (target.matches('.card-info-btn')) {
      document.getElementById('alignmentAlertMessage').textContent = target.dataset.message;
      document.getElementById('alignmentAlertModal').classList.add('visible');
      document.getElementById('confirmStartTaskBtn').style.display = 'none'; 
    }
    
    // Gerenciamento
    if (target.id === 'addMonitorBtn') { addItem('monitors', 'newMonitorName'); }
    if (target.id === 'addTeamBtn') { addItem('teams', 'newTeamName'); }
    if (target.matches('.btn-edit')) { editItem(target.dataset.collection, target.dataset.id, target.dataset.name); }
    if (target.matches('.btn-delete-card')) { deleteCard(target.dataset.id); }
    if (target.matches('[data-collection="monitors"].btn-delete')) { deleteItem('monitors', target.dataset.id); }
    if (target.matches('[data-collection="teams"].btn-delete')) { deleteItem('teams', target.dataset.id); }
    
    // Outros botões
    if (target.id === 'saveAssignmentsBtn') { saveAssignments(); }
    if (target.id === 'toggleMode') { document.documentElement.classList.toggle('dark'); }
    if (target.id === 'fetchHistoryBtn') { fetchHistory(); }
    if (target.id === 'confirmTransferBtn') { confirmTransfer(); }
    if (target.id === 'publishAlignmentBtn') { publishAlignment(); }
    if (target.id === 'confirmStartTaskBtn') { confirmStartTask(); }
    if (target.id === 'selectAllTeamsBtn') { 
      document.querySelectorAll('#alignmentTeamsList input[type="checkbox"]').forEach(cb => cb.checked = true); 
    }
    if (target.id === 'deselectAllTeamsBtn') { 
      document.querySelectorAll('#alignmentTeamsList input[type="checkbox"]').forEach(cb => cb.checked = false); 
    }
  });

  // Fechar modais ao clicar fora
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => { 
      if (e.target === modal) modal.classList.remove('visible'); 
    });
  });
}

// Inicialização da aplicação
async function initializeApp() {
  kanbanDateSelect.valueAsDate = new Date();
  document.getElementById('distDate').valueAsDate = new Date();
  document.getElementById('alignmentStartDate').valueAsDate = new Date();
  document.getElementById('alignmentEndDate').valueAsDate = new Date();
  
  await populateSelect(monitorSelect, 'monitors', '-- Visão Geral --');
  setupEventListeners();
  updateView();
}

// Inicia a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initializeApp);
