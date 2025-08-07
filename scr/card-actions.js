import { db } from './app.js';
import { showAlert, toggleCardButtons, formatarDataHoraBR } from './helpers.js';

export const addLogEntry = async (id, statusState, logMessage, extraPayload = {}) => {
  toggleCardButtons(id, true);
  const logEntry = { timestamp: new Date(), mensagem: logMessage };
  const payload = {
    currentStatus: { state: statusState, timestamp: new Date() },
    historico: firebase.firestore.FieldValue.arrayUnion(logEntry),
    ...extraPayload
  };
  
  try { 
    await db.collection("cards").doc(id).update(payload); 
  } catch (error) {
    console.error("Erro ao atualizar card:", error);
    showAlert('Erro ao atualizar o card.', 'error');
    toggleCardButtons(id, false);
  }
};

export const marcarFeito = (id) => addLogEntry(id, "feito", "Card concluído");

export const marcarAtivo = (id) => {
  const cardRef = db.collection('cards').doc(id);
  cardRef.get().then(doc => {
    if (!doc.exists) return;
    const cardTeam = doc.data().time;
    const alignmentForCard = window.activeAlignments.find(a => a.teamName === cardTeam);
    if (alignmentForCard) {
      window.cardToActivateId = id;
      document.getElementById('alignmentAlertMessage').textContent = alignmentForCard.message;
      document.getElementById('alignmentAlertModal').classList.add('visible');
      document.getElementById('confirmStartTaskBtn').style.display = 'block'; 
    } else {
      addLogEntry(id, "ativo", "Marcado como ativo", { foiAtivado: true });
    }
  });
};

export const confirmStartTask = () => {
  if (window.cardToActivateId) {
    addLogEntry(window.cardToActivateId, "ativo", "Marcado como ativo (ciente do alinhamento)", { foiAtivado: true });
    document.getElementById('alignmentAlertModal').classList.remove('visible');
    window.cardToActivateId = null;
  }
};

export const reabrirCard = (id) => addLogEntry(id, "pendente", "Card reaberto");
export const pausarCard = (id) => addLogEntry(id, "pendente", "Atividade pausada");

export const pedirAjuda = (id) => {
  window.currentTransferCardId = id;
  const transferMonitorSelect = document.getElementById('transferMonitorSelect');
  document.getElementById('transferModal').classList.add('visible');
  const currentMonitor = document.getElementById('monitorSelect').value;
  populateSelect(transferMonitorSelect, 'monitors', 'Selecione um monitor...', [currentMonitor]);
};

export const confirmTransfer = async () => {
  if (!window.currentTransferCardId) return;
  const toMonitor = document.getElementById('transferMonitorSelect').value;
  if (!toMonitor) return showAlert('Selecione um monitor.', 'error');
  
  const cardRef = db.collection('cards').doc(window.currentTransferCardId);
  const logEntry = { 
    timestamp: new Date(), 
    mensagem: `Transferência iniciada de ${document.getElementById('monitorSelect').value} para ${toMonitor}` 
  };
  
  try {
    await cardRef.update({
      transferInfo: { 
        fromMonitor: document.getElementById('monitorSelect').value, 
        toMonitor: toMonitor, 
        status: 'pending' 
      },
      historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
    });
    showAlert('Card transferido!', 'success');
    document.getElementById('transferModal').classList.remove('visible');
    window.currentTransferCardId = null;
  } catch(error) { 
    showAlert('Erro ao transferir.', 'error'); 
  }
};

export const acceptTransfer = async (id) => {
  const cardRef = db.collection('cards').doc(id);
  const cardDoc = await cardRef.get();
  if (!cardDoc.exists) return;
  
  const toMonitor = cardDoc.data().transferInfo.toMonitor;
  const now = new Date();
  const logEntry = { 
    timestamp: now, 
    mensagem: `Transferência aceita por ${toMonitor}` 
  };
  
  await cardRef.update({
    monitor: toMonitor,
    currentStatus: { state: "pendente", timestamp: now },
    foiAtivado: false,
    transferInfo: firebase.firestore.FieldValue.delete(),
    historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
  });
};

export const declineTransfer = async (id) => {
  const cardRef = db.collection('cards').doc(id);
  const cardDoc = await cardRef.get();
  if (!cardDoc.exists) return;
  
  const toMonitor = cardDoc.data().transferInfo.toMonitor;
  const logEntry = { 
    timestamp: new Date(), 
    mensagem: `Transferência recusada por ${toMonitor}` 
  };
  
  await cardRef.update({
    transferInfo: firebase.firestore.FieldValue.delete(),
    historico: firebase.firestore.FieldValue.arrayUnion(logEntry)
  });
};

export const showCardHistory = async (cardId) => {
  const titleEl = document.getElementById('cardHistoryTitle');
  const resultsEl = document.getElementById('cardHistoryResults');
  resultsEl.innerHTML = '<p class="placeholder-text">Carregando...</p>';
  document.getElementById('cardHistoryModal').classList.add('visible');
  
  try {
    const doc = await db.collection('cards').doc(cardId).get();
    if (!doc.exists) { 
      resultsEl.innerHTML = '<p>Card não encontrado.</p>'; 
      return; 
    }
    
    const card = doc.data();
    titleEl.textContent = `Histórico - ${card.time}`;
    let logsHTML = '';
    
    if (card.historico && card.historico.length > 0) {
      card.historico.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
      card.historico.forEach(log => { 
        logsHTML += `<li><span class="log-time">${formatarDataHoraBR(log.timestamp)}</span><span>${log.mensagem}</span></li>`; 
      });
    } else { 
      logsHTML = '<li>Nenhum histórico detalhado.</li>'; 
    }
    
    resultsEl.innerHTML = `<ul class="log-list">${logsHTML}</ul>`;
  } catch (error) {
    console.error("Erro ao buscar histórico do card:", error);
    resultsEl.innerHTML = '<p>Ocorreu um erro ao buscar o histórico.</p>';
  }
};

export const deleteCard = async (id) => {
  if (confirm('Tem certeza que deseja EXCLUIR este card permanentemente?')) {
    try {
      await db.collection('cards').doc(id).delete();
      showAlert('Card excluído com sucesso.', 'success');
    } catch (error) { 
      showAlert('Erro ao excluir o card.', 'error'); 
    }
  }
};