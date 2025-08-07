import { db } from './app.js';
import { showAlert } from './helpers.js';
import { renderCards } from './cards-render.js';

export let activeAlignments = [];

export const fetchActiveAlignments = async (dateString) => {
  const selectedDate = new Date(dateString + 'T12:00:00');
  activeAlignments = [];

  try {
    const snapshot = await db.collection('alignments')
      .where('startDate', '<=', selectedDate)
      .get();

    activeAlignments = snapshot.docs
      .map(doc => doc.data())
      .filter(alignment => {
        const endDate = alignment.endDate.toDate ? alignment.endDate.toDate() : new Date(alignment.endDate);
        return endDate >= selectedDate;
      });

  } catch (error) {
    console.error("Erro ao buscar alinhamentos:", error);
    if (error.code === 'failed-precondition') {
      console.error("--> Possível falta de índice no Firestore. Verifique a mensagem de erro completa para o link de criação.");
      showAlert("Erro ao buscar alinhamentos. Verifique a console (F12).", "error");
    }
  }
};

export const renderKanbanView = (monitor, dateString) => {
  return fetchActiveAlignments(dateString).then(() => {
    const startOfDay = new Date(dateString + 'T00:00:00');
    const endOfDay = new Date(dateString + 'T23:59:59');
    const boardContainer = document.getElementById('boardContainer');
    boardContainer.innerHTML = '<p class="placeholder-text">Carregando...</p>';
    boardContainer.className = 'kanban-grid';

    return db.collection("cards")
      .where("monitor", "==", monitor)
      .where("data", "<=", endOfDay)
      .onSnapshot(snapshot => {
        let allCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let unfinishedCards = allCards
          .filter(card => (card.currentStatus ? card.currentStatus.state : 'pendente') !== 'feito')
          .map(card => ({
            ...card,
            isOverdue: card.data.toDate() < startOfDay
          }));

        let cardsForView = unfinishedCards.filter(card => {
          return card.isOverdue ||
                 (card.transferInfo && card.transferInfo.toMonitor === monitor) ||
                 (!card.transferInfo && card.monitor === monitor);
        });

        cardsForView.sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          const orderA = a.transferInfo ? 0 : 1;
          const orderB = b.transferInfo ? 0 : 1;
          if (orderA !== orderB) return orderA - orderB;
          const statusA = a.currentStatus ? a.currentStatus.state : 'pendente';
          const statusB = b.currentStatus ? b.currentStatus.state : 'pendente';
          const statusOrder = { 'ativo': 1, 'pendente': 2, 'feito': 3 };
          return (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
        });

        renderCards(cardsForView, activeAlignments);
      }, error => {
        console.error("Erro ao carregar Kanban:", error);
        boardContainer.innerHTML = '<p class="placeholder-text error">Ocorreu um erro. Verifique a console (F12) para um link de criação de índice.</p>';
      });
  });
};