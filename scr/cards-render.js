import { formatarDataBR, formatarDataHoraBR, copyText } from './helpers.js';

export const renderCards = (cards, activeAlignments) => {
  const boardContainer = document.getElementById('boardContainer');
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
    const alignmentForCard = activeAlignments.find(a => a.teamName === card.time);

    if (isDone) el.classList.add('done');
    if (isActive) el.classList.add('active');
    if (isPendingTransfer) el.classList.add('pending-transfer');
    if (card.isOverdue) el.classList.add('overdue');

    let actionsHTML = '';
    if (isPendingTransfer) {
      actionsHTML = `
        <button class="btn btn-concluir" data-action="accept-transfer" data-id="${card.id}">
          <i class="fas fa-check"></i> Aceitar
        </button>
        <button class="btn btn-delete" data-action="decline-transfer" data-id="${card.id}">
          <i class="fas fa-times"></i> Recusar
        </button>`;
    } else if (isDone) {
      actionsHTML = `
        <button class="btn btn-reabrir" data-id="${card.id}">
          <i class="fas fa-undo"></i> Reabrir
        </button>
        <button class="btn btn-copiar" data-id="${card.id}" data-team="${card.time}">
          <i class="fas fa-copy"></i> Copiar
        </button>`;
    } else {
      const concluirDisabled = !hasBeenActive ? 'disabled' : '';
      const concluirTitle = !hasBeenActive ? 'title="Marque como Ativo para poder concluir"' : '';
      const ajudaDisabled = isActive ? 'disabled' : '';
      const ajudaTitle = isActive ? 'title="Pause a atividade para pedir ajuda ou transferir"' : '';
      
      actionsHTML = `
        <button class="btn btn-concluir" data-id="${card.id}" ${concluirDisabled} ${concluirTitle}>
          <i class="fas fa-check-circle"></i> Concluir
        </button>
        <button class="btn btn-ajuda" data-id="${card.id}" ${ajudaDisabled} ${ajudaTitle}>
          <i class="fas fa-life-ring"></i> Ajuda
        </button>`;
      
      if (isActive) {
        actionsHTML += `
          <button class="btn btn-pausar" data-id="${card.id}">
            <i class="fas fa-pause-circle"></i> Pausar
          </button>`;
      } else {
        actionsHTML += `
          <button class="btn btn-ativo" data-id="${card.id}">
            <i class="fas fa-play-circle"></i> Ativo
          </button>`;
      }
    }

    el.innerHTML = `
      <div class="card-header-icons">
        ${alignmentForCard ? `
          <button class="card-info-btn" data-message="${alignmentForCard.message}" title="Ver Alinhamento">
            <i class="fas fa-info-circle"></i>
          </button>` : ''}
        <button class="card-history-btn" data-card-id="${card.id}" title="Ver Histórico">
          <i class="fas fa-clock"></i>
        </button>
      </div>
      <div class="card-content">
        <h3>
          ${card.time}
          ${card.isOverdue ? '<span class="status-badge overdue">Atrasado</span>' : ''}
        </h3>
        ${isPendingTransfer ? `
          <div class="transfer-info">
            Transferência de: <strong>${card.transferInfo.fromMonitor}</strong>
          </div>` : ''}
        <p><strong>Status:</strong> ${statusState} <span class="status-time">${statusTime}</span></p>
        ${card.isOverdue ? `
          <p style="font-weight: 500;">
            <strong>Data Original:</strong> ${formatarDataBR(card.data)}
          </p>` : ''}
      </div>
      <div class="actions">${actionsHTML}</div>`;

    boardContainer.appendChild(el);
  });

  addCardButtonListeners();
};

const addCardButtonListeners = () => {
  const boardContainer = document.getElementById('boardContainer');
  
  boardContainer.querySelectorAll('.btn-concluir').forEach(btn => {
    if (!btn.dataset.action) {
      btn.addEventListener('click', () => marcarFeito(btn.dataset.id));
    }
  });
  
  boardContainer.querySelectorAll('.btn-ajuda').forEach(btn => {
    btn.addEventListener('click', () => pedirAjuda(btn.dataset.id));
  });
  
  boardContainer.querySelectorAll('.btn-ativo').forEach(btn => {
    btn.addEventListener('click', () => marcarAtivo(btn.dataset.id));
  });
  
  boardContainer.querySelectorAll('.btn-reabrir').forEach(btn => {
    btn.addEventListener('click', () => reabrirCard(btn.dataset.id));
  });
  
  boardContainer.querySelectorAll('.btn-pausar').forEach(btn => {
    btn.addEventListener('click', () => pausarCard(btn.dataset.id));
  });
  
  boardContainer.querySelectorAll('.btn-copiar').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.team));
  });
  
  boardContainer.querySelectorAll('.card-history-btn').forEach(btn => {
    btn.addEventListener('click', () => showCardHistory(btn.dataset.cardId));
  });
  
  boardContainer.querySelectorAll('[data-action="accept-transfer"]').forEach(btn => {
    btn.addEventListener('click', () => acceptTransfer(btn.dataset.id));
  });
  
  boardContainer.querySelectorAll('[data-action="decline-transfer"]').forEach(btn => {
    btn.addEventListener('click', () => declineTransfer(btn.dataset.id));
  });
};