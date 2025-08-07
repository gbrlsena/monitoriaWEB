import { db } from './app.js';
import { showAlert, formatarDataBR, formatarDataHoraBR } from './helpers.js';

export const fetchHistory = async () => {
  const historyResults = document.getElementById('historyResults');
  const startDateString = document.getElementById('historyDateStart').value;
  const endDateString = document.getElementById('historyDateEnd').value;
  
  if (!startDateString || !endDateString) return showAlert('Selecione as datas.', 'error');
  
  const startDate = new Date(startDateString + 'T00:00:00');
  const endDate = new Date(endDateString + 'T23:59:59');
  historyResults.innerHTML = '<p class="placeholder-text">Buscando...</p>';
  
  try {
    const snapshot = await db.collection('cards')
      .where('data', '>=', startDate)
      .where('data', '<=', endDate)
      .orderBy('data', 'desc')
      .get();
    
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
        card.historico.forEach(log => { 
          logsHTML += `<li><span class="log-time">${formatarDataHoraBR(log.timestamp)}</span><span>${log.mensagem}</span></li>`; 
        });
      } else { 
        logsHTML = '<li>Nenhum log detalhado.</li>'; 
      }
      
      cardEl.innerHTML = `
        <div class="history-item-header">
          <span>${card.time} (${card.monitor}) - ${formatarDataBR(card.data)}</span>
          <button class="icon-btn btn-delete-card" data-id="${doc.id}" title="Excluir Card">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <ul class="log-list">${logsHTML}</ul>`;
      
      historyResults.appendChild(cardEl);
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    showAlert('Erro ao carregar o histórico.', 'error');
    historyResults.innerHTML = '<p class="placeholder-text">Ocorreu um erro ao buscar.</p>';
  }
};