import { db } from './app.js';
import { showAlert } from './helpers.js';

export const populateSelect = async (selectElement, collectionName, defaultOptionText, exclude = []) => {
  selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
  try {
    const snapshot = await db.collection(collectionName).orderBy("name").get();
    snapshot.docs.forEach(doc => {
      const name = doc.data().name;
      if (!exclude.includes(name)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selectElement.appendChild(option);
      }
    });
  } catch (error) { 
    console.error(`Erro ao popular o select ${collectionName}:`, error); 
  }
};

export const renderManagementList = (collectionName, listElementId) => {
  const listEl = document.getElementById(listElementId);
  listEl.innerHTML = '<li>Carregando...</li>';
  
  return db.collection(collectionName).orderBy('name').onSnapshot(snapshot => {
    if (snapshot.empty) {
      listEl.innerHTML = '<li>Nenhum item cadastrado.</li>';
      return;
    }
    
    listEl.innerHTML = '';
    snapshot.docs.forEach(doc => {
      const item = doc.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${item.name}</span>
        <div class="action-buttons">
          <button class="btn-edit" data-collection="${collectionName}" data-id="${doc.id}" data-name="${item.name}" title="Editar">
            <i class="fas fa-pencil-alt"></i>
          </button>
          <button class="btn-delete" data-collection="${collectionName}" data-id="${doc.id}" title="Excluir">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;
      listEl.appendChild(li);
    });
  });
};

export const addItem = async (collectionName, inputElementId) => {
  const inputEl = document.getElementById(inputElementId);
  const name = inputEl.value.trim();
  if (!name) return showAlert('Por favor, insira um nome.', 'error');
  
  try {
    await db.collection(collectionName).add({ name: name });
    showAlert(`${collectionName === 'monitors' ? 'Monitor' : 'Time'} adicionado com sucesso!`, 'success');
    inputEl.value = '';
  } catch (error) { 
    showAlert('Erro ao adicionar item.', 'error'); 
  }
};

export const editItem = async (collectionName, id, oldName) => {
  const newName = prompt('Editar nome:', oldName);
  if (newName && newName.trim() !== '' && newName !== oldName) {
    try {
      await db.collection(collectionName).doc(id).update({ name: newName });
      showAlert('Nome atualizado! Aviso: Cards antigos não serão alterados.', 'success');
    } catch (error) { 
      showAlert('Erro ao atualizar.', 'error'); 
    }
  }
};

export const deleteItem = async (collectionName, id) => {
  if (confirm('Tem certeza que deseja excluir este item permanentemente?')) {
    try {
      await db.collection(collectionName).doc(id).delete();
      showAlert('Item excluído com sucesso!', 'success');
    } catch (error) { 
      showAlert('Erro ao excluir.', 'error'); 
    }
  }
};

export const renderDistributionMatrix = async () => {
  const container = document.getElementById('distributionMatrixContainer');
  container.innerHTML = '<p>Carregando...</p>';
  
  try {
    const monitorsSnapshot = await db.collection('monitors').orderBy('name').get();
    const teamsSnapshot = await db.collection('teams').orderBy('name').get();
    const monitors = monitorsSnapshot.docs.map(doc => doc.data().name);
    const teams = teamsSnapshot.docs.map(doc => doc.data().name);
    
    if (monitors.length === 0 || teams.length === 0) { 
      container.innerHTML = '<p>Crie monitores e times primeiro.</p>'; 
      return; 
    }
    
    let tableHTML = '<table><thead><tr><th>Time</th>';
    monitors.forEach(monitor => tableHTML += `<th>${monitor}</th>`);
    tableHTML += '</tr></thead><tbody>';
    
    teams.forEach(team => {
      tableHTML += `<tr><td>${team}</td>`;
      monitors.forEach(monitor => { 
        tableHTML += `<td><input type="checkbox" data-team="${team}" data-monitor="${monitor}"></td>`; 
      });
      tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
    
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => updateDistributionSummary(monitors));
    });
    
    updateDistributionSummary(monitors);
  } catch (error) { 
    console.error("Erro ao criar matriz:", error); 
    container.innerHTML = '<p>Erro ao carregar dados.</p>'; 
  }
};

const updateDistributionSummary = (monitors) => {
  const summaryContainer = document.getElementById('distribution-summary');
  const summary = monitors.map(monitor => {
    const count = document.querySelectorAll(`#distributionMatrixContainer input[data-monitor="${monitor}"]:checked`).length;
    return count > 0 ? `<strong>${monitor}:</strong> ${count}` : null;
  }).filter(Boolean).join(' | ');
  
  summaryContainer.innerHTML = summary;
};

export const saveAssignments = async () => {
  const distDate = document.getElementById('distDate').value;
  if (!distDate) return showAlert('Selecione uma data.', 'error');
  
  const checkedBoxes = document.querySelectorAll('#distributionMatrixContainer input:checked');
  if (checkedBoxes.length === 0) return showAlert('Nenhuma atribuição selecionada.', 'error');
  
  const batch = db.batch();
  const now = new Date();
  
  checkedBoxes.forEach(box => {
    const newCardRef = db.collection('cards').doc();
    batch.set(newCardRef, {
      monitor: box.dataset.monitor, 
      time: box.dataset.team,
      data: firebase.firestore.Timestamp.fromDate(new Date(distDate + 'T12:00:00')),
      currentStatus: { state: "pendente", timestamp: now },
      precisaAjuda: false, 
      foiAtivado: false,
      historico: [{ timestamp: now, mensagem: "Card criado" }]
    });
  });
  
  try {
    await batch.commit();
    showAlert('Distribuição salva!', 'success');
    document.getElementById('settingsModal').classList.remove('visible');
  } catch (error) { 
    console.error("Erro ao salvar:", error); 
    showAlert('Erro ao salvar a distribuição.', 'error'); 
  }
};

export const publishAlignment = async () => {
  const messageInput = document.getElementById('alignmentMessage');
  const startDateInput = document.getElementById('alignmentStartDate');
  const endDateInput = document.getElementById('alignmentEndDate');
  const authorSelect = document.getElementById('alignmentAuthorSelect');
  
  const message = messageInput.value.trim();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const author = authorSelect.value;
  const selectedTeams = Array.from(document.querySelectorAll('#alignmentTeamsList input:checked')).map(cb => cb.value);

  if (selectedTeams.length === 0 || !message || !startDate || !endDate || !author) {
    return showAlert('Todos os campos são obrigatórios, incluindo ao menos um time.', 'error');
  }

  const batch = db.batch();
  const alignmentData = {
    message, 
    author,
    startDate: firebase.firestore.Timestamp.fromDate(new Date(startDate + 'T00:00:00')),
    endDate: firebase.firestore.Timestamp.fromDate(new Date(endDate + 'T23:59:59')),
    createdAt: new Date()
  };

  selectedTeams.forEach(teamName => {
    const newAlignmentRef = db.collection('alignments').doc();
    batch.set(newAlignmentRef, { ...alignmentData, teamName });
  });

  try {
    await batch.commit();
    showAlert('Alinhamento publicado com sucesso!', 'success');
    messageInput.value = '';
    document.querySelectorAll('#alignmentTeamsList input:checked').forEach(cb => cb.checked = false);
    document.getElementById('settingsModal').classList.remove('visible');
  } catch (error) {
    console.error("Erro ao publicar alinhamento:", error);
    showAlert('Erro ao publicar alinhamento.', 'error');
  }
};