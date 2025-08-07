import { db } from './app.js';
import { showAlert, formatarDataBR, formatarDataHoraBR } from './helpers.js';
import { activeAlignments, fetchActiveAlignments } from './kanban-view.js';

export const renderDashboardView = (dateString) => {
  return fetchActiveAlignments(dateString).then(() => {
    const startOfDay = new Date(dateString + 'T00:00:00');
    const endOfDay = new Date(dateString + 'T23:59:59');
    const boardContainer = document.getElementById('boardContainer');
    boardContainer.innerHTML = '<p class="placeholder-text">Carregando painel do dia...</p>';
    boardContainer.className = '';

    return db.collection('cards').where('data', '<=', endOfDay)
      .onSnapshot(snapshot => {
        const allCards = snapshot.docs.map(doc => doc.data());
        
        const relevantCards = allCards.filter(card => {
          const cardDate = card.data.toDate();
          const status = card.currentStatus ? card.currentStatus.state : 'pendente';
          const isToday = cardDate >= startOfDay && cardDate <= endOfDay;
          return isToday || status !== 'feito';
        });

        if (relevantCards.length === 0 && activeAlignments.length === 0) {
          boardContainer.innerHTML = '<p class="placeholder-text">Nenhum card ou alinhamento para este dia.</p>';
          return;
        }
        
        const cardsToday = relevantCards.filter(card => {
          const cardDate = card.data.toDate();
          return cardDate >= startOfDay && cardDate <= endOfDay;
        });

        const totalCards = cardsToday.length;
        const completedCards = cardsToday.filter(c => c.currentStatus && c.currentStatus.state === 'feito');
        const activeCards = relevantCards.filter(c => c.currentStatus && c.currentStatus.state === 'ativo');
        const pendingCards = cardsToday.filter(c => (!c.currentStatus || c.currentStatus.state === 'pendente') && !c.transferInfo);
        const percentage = totalCards > 0 ? Math.round((completedCards.length / totalCards) * 100) : 0;
        
        const groupedAlignments = {};
        if (activeAlignments.length > 0) {
          activeAlignments.forEach(a => {
            const groupKey = a.message + a.author;
            if (!groupedAlignments[groupKey]) {
              groupedAlignments[groupKey] = { message: a.message, author: a.author, teams: [] };
            }
            groupedAlignments[groupKey].teams.push(a.teamName);
          });
        }
        
        const alignmentsHTML = Object.keys(groupedAlignments).length > 0 ?
          `<div class="dashboard-panel alignments">
            <h3>Alinhamentos do Dia</h3>
            <ul>
              ${Object.values(groupedAlignments).map(group => 
                `<li class="alignment-item">
                  <span class="team-name">${group.teams.join(', ')}</span>
                  <span class="message">${group.message}</span>
                  <span class="author-info">- ${group.author}</span>
                </li>`).join('')}
            </ul>
          </div>` : '';

        const activeCardsHTML = activeCards.length > 0 ? activeCards.map(c => {
          const cardDate = c.data.toDate();
          const isOverdue = cardDate < startOfDay;
          const overdueBadge = isOverdue ? ' <span class="status-badge overdue">Atrasado</span>' : '';
          return `<li><span class="monitor-name">${c.monitor}</span> em <span class="team-name">${c.time}</span>${overdueBadge}</li>`;
        }).join('') : '<li>Ninguém ativo no momento.</li>';
        
        const dashboardHTML = `
          <div class="progress-container">
            <div class="progress-circle" style="--progress: ${percentage}%">
              <div class="progress-inner">
                <div>
                  <div class="progress-percentage">${percentage}%</div>
                  <div class="progress-label">Concluído</div>
                </div>
              </div>
            </div>
          </div>
          <div class="dashboard-grid">
            ${alignmentsHTML}
            <div class="dashboard-panel"><h3>Ativos no Momento</h3><ul>${activeCardsHTML}</ul></div>
            <div class="dashboard-panel"><h3>Pendentes</h3><ul>${
              pendingCards.length > 0 ? 
                pendingCards.map(c => `<li><span class="team-name">${c.time}</span> (com <span class="monitor-name">${c.monitor}</span>)</li>`).join('') 
                : '<li>Nenhum card pendente.</li>' 
            }</ul></div>
            <div class="dashboard-panel"><h3>Concluídos</h3><ul>${
              completedCards.length > 0 ? 
                completedCards.map(c => `<li><span class="team-name">${c.time}</span> (por <span class="monitor-name">${c.monitor}</span>)</li>`).join('') 
                : '<li>Nenhum card concluído ainda.</li>'
            }</ul></div>
          </div>`;
        
        boardContainer.innerHTML = dashboardHTML;
      }, error => {
        console.error("Erro ao carregar dashboard:", error);
        boardContainer.innerHTML = '<p class="placeholder-text error">Ocorreu um erro. Verifique se o índice do Firestore foi criado.</p>';
      });
  });
};