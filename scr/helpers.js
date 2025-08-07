// Funções auxiliares
export const showAlert = (message, type = 'success') => {
  const customAlert = document.getElementById('customAlert');
  const customAlertMessage = document.getElementById('customAlertMessage');
  if (window.alertTimer) clearTimeout(window.alertTimer);
  
  customAlertMessage.textContent = message;
  customAlert.className = 'custom-alert';
  customAlert.classList.add(type, 'show');
  
  window.alertTimer = setTimeout(() => { 
    customAlert.classList.remove('show'); 
  }, 3000);
};

export const toggleCardButtons = (cardId, disabled) => {
  const button = document.querySelector(`[data-id="${cardId}"], [data-card-id="${cardId}"]`);
  if (button) {
    const cardElement = button.closest('.card');
    if (cardElement) cardElement.querySelectorAll('button').forEach(btn => btn.disabled = disabled);
  }
};

export const formatarDataBR = (dataStr) => {
  if (!dataStr) return 'Data inválida';
  const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
  return data.toLocaleDateString('pt-BR');
};

export const formatarDataHoraBR = (dataStr) => {
  if (!dataStr) return '';
  const data = dataStr.toDate ? dataStr.toDate() : new Date(dataStr);
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const copyText = (teamName) => {
  const textToCopy = `Monitoria do Time ${teamName} atualizada ✅`;
  navigator.clipboard.writeText(textToCopy)
    .then(() => showAlert('Texto copiado!', 'success'))
    .catch(() => showAlert('Falha ao copiar.', 'error'));
};