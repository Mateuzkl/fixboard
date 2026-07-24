// State Management
let issues = [];
const STORAGE_KEY = 'fixboard_issues';
const THEME_KEY = 'fixboard_theme';

// DOM Elements
const columns = {
    'Reportado': document.getElementById('col-reportado'),
    'Em análise': document.getElementById('col-em-analise'),
    'Em correção': document.getElementById('col-em-correcao'),
    'Aguardando teste': document.getElementById('col-aguardando-teste'),
    'Corrigido': document.getElementById('col-corrigido'),
    'Fechado': document.getElementById('col-fechado')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadData();
    setupEventListeners();
    setupDragAndDrop();
});

// Load Data (LocalStorage or JSON)
async function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            issues = JSON.parse(stored);
            renderBoard();
        } else {
            const response = await fetch('./data/issues.json');
            if (!response.ok) throw new Error('Falha ao carregar issues.json');
            issues = await response.json();
            saveData();
            renderBoard();
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar os bugs. Verifique o console.', 'error');
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

// Render Board
function renderBoard() {
    // Clear columns
    Object.values(columns).forEach(col => {
        if(col) col.innerHTML = '';
    });

    const filters = getFilters();
    let filteredIssues = issues.filter(issue => applyFilters(issue, filters));

    // Sort by Priority (Critical -> High -> Medium -> Low)
    const priorityOrder = { 'Crítica': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
    filteredIssues.sort((a, b) => {
        const pA = priorityOrder[a.priority] || 0;
        const pB = priorityOrder[b.priority] || 0;
        return pB - pA;
    });

    // Count variables for stats
    const stats = {
        total: issues.length,
        'Reportado': 0,
        'Em análise': 0,
        'Em correção': 0,
        'Aguardando teste': 0,
        'Corrigido': 0,
        'Fechado': 0
    };

    // Calculate stats on all issues, not just filtered
    issues.forEach(issue => {
        if (stats[issue.status] !== undefined) {
            stats[issue.status]++;
        }
    });

    // Render filtered issues
    filteredIssues.forEach(issue => {
        const col = columns[issue.status];
        if (col) {
            col.appendChild(createCard(issue));
        }
    });

    updateStats(stats);
    updateColumnCounts();
}

function createCard(issue) {
    const card = document.createElement('div');
    card.className = 'bug-card';
    card.draggable = true;
    card.dataset.id = issue.id;
    card.dataset.status = issue.status;

    const tagsHtml = (issue.tags || []).map(tag => `<span class="badge">${escapeHTML(tag)}</span>`).join('');
    
    // Convert priority to lowercase without accents for CSS class
    const priorityClass = issue.priority.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    card.innerHTML = `
        <div class="card-header">
            <span class="bug-id">${escapeHTML(issue.id)}</span>
            <div class="card-actions">
                <button class="card-action-btn edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                ${issue.status !== 'Corrigido' ? `<button class="card-action-btn resolve-btn" title="Marcar como Corrigido"><i class="fas fa-check"></i></button>` : ''}
            </div>
        </div>
        <div class="card-title">${escapeHTML(issue.title)}</div>
        <div class="card-meta">
            <span class="priority-badge ${priorityClass}">${escapeHTML(issue.priority)}</span>
            <span class="badge"><i class="fas fa-folder"></i> ${escapeHTML(issue.category)}</span>
            ${tagsHtml}
        </div>
        <div class="card-footer">
            <div class="card-assignee">
                <i class="fas fa-user-circle"></i>
                <span>${escapeHTML(issue.assignee || 'Não atribuído')}</span>
            </div>
            <span title="Última atualização"><i class="far fa-clock"></i> ${formatDateShort(issue.updatedAt)}</span>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-actions')) {
            openDetailModal(issue);
        }
    });

    const editBtn = card.querySelector('.edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openFormModal(issue);
        });
    }

    const resolveBtn = card.querySelector('.resolve-btn');
    if (resolveBtn) {
        resolveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateIssueStatus(issue.id, 'Corrigido');
        });
    }

    // Drag events
    card.addEventListener('dragstart', () => {
        card.classList.add('is-dragging');
    });
    
    card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        document.querySelectorAll('.column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
    });

    return card;
}

// Drag and Drop Logic
function setupDragAndDrop() {
    const contents = document.querySelectorAll('.column-content');
    
    contents.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', e => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            
            const card = document.querySelector('.is-dragging');
            if (!card) return;
            
            const newStatus = col.parentElement.dataset.status;
            const issueId = card.dataset.id;
            
            if (card.dataset.status !== newStatus) {
                updateIssueStatus(issueId, newStatus);
                showToast(`${issueId} movido para ${newStatus}.`, 'success');
            }
        });
    });
}

function updateIssueStatus(id, newStatus) {
    const issue = issues.find(i => i.id === id);
    if (issue) {
        issue.status = newStatus;
        issue.updatedAt = new Date().toISOString();
        saveData();
        renderBoard();
    }
}

// Stats & UI Updates
function updateStats(stats) {
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-reported').textContent = stats['Reportado'];
    document.getElementById('stat-fixing').textContent = stats['Em correção'];
    document.getElementById('stat-testing').textContent = stats['Aguardando teste'];
    document.getElementById('stat-fixed').textContent = stats['Corrigido'];

    const totalFixed = stats['Corrigido'] + stats['Fechado'];
    const percentage = stats.total > 0 ? Math.round((totalFixed / stats.total) * 100) : 0;
    
    document.getElementById('stat-progress').style.width = percentage + '%';
    document.getElementById('stat-progress-text').textContent = `${totalFixed} de ${stats.total} bugs resolvidos — ${percentage}%`;
}

function updateColumnCounts() {
    document.querySelectorAll('.column').forEach(col => {
        const status = col.dataset.status;
        const count = col.querySelectorAll('.bug-card').length;
        col.querySelector('.card-count').textContent = count;
    });
}

// Filters
function getFilters() {
    return {
        search: document.getElementById('search-input').value.toLowerCase(),
        status: document.getElementById('filter-status').value,
        priority: document.getElementById('filter-priority').value,
        category: document.getElementById('filter-category').value,
        client: document.getElementById('filter-client').value
    };
}

function applyFilters(issue, filters) {
    if (filters.status !== 'all' && issue.status !== filters.status) return false;
    if (filters.priority !== 'all' && issue.priority !== filters.priority) return false;
    if (filters.category !== 'all' && issue.category !== filters.category) return false;
    if (filters.client !== 'all' && issue.client !== filters.client) return false;
    
    if (filters.search) {
        const searchStr = filters.search;
        const searchable = [
            issue.title,
            issue.id,
            issue.description,
            issue.category,
            issue.client,
            issue.assignee || '',
            ...(issue.tags || [])
        ].join(' ').toLowerCase();
        
        if (!searchable.includes(searchStr)) return false;
    }
    
    return true;
}

// Event Listeners setup
function setupEventListeners() {
    // Theme toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
    
    // Filters
    const filterInputs = ['search-input', 'filter-status', 'filter-priority', 'filter-category', 'filter-client'];
    filterInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', renderBoard);
        document.getElementById(id).addEventListener('change', renderBoard);
    });
    
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('filter-status').value = 'all';
        document.getElementById('filter-priority').value = 'all';
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-client').value = 'all';
        renderBoard();
    });

    // Modals
    document.getElementById('btn-new-bug').addEventListener('click', () => openFormModal());
    document.getElementById('btn-settings').addEventListener('click', () => {
        document.getElementById('modal-settings').classList.remove('hidden');
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.add('hidden');
        });
    });

    // Form submit
    document.getElementById('btn-save-bug').addEventListener('click', saveBugForm);

    // Settings actions
    document.getElementById('btn-restore-data').addEventListener('click', restoreData);
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);

    // Details modal actions
    document.getElementById('btn-mark-fixed').addEventListener('click', () => {
        const id = document.getElementById('detail-id').textContent;
        updateIssueStatus(id, 'Corrigido');
        document.getElementById('modal-details').classList.add('hidden');
        showToast('Bug marcado como corrigido!', 'success');
    });

    document.getElementById('btn-edit-from-detail').addEventListener('click', () => {
        const id = document.getElementById('detail-id').textContent;
        const issue = issues.find(i => i.id === id);
        if (issue) {
            document.getElementById('modal-details').classList.add('hidden');
            openFormModal(issue);
        }
    });
    
    document.getElementById('btn-copy-info').addEventListener('click', copyBugInfo);
    document.getElementById('btn-copy-md').addEventListener('click', copyBugMarkdown);
}

// Modals Logic
function openDetailModal(issue) {
    document.getElementById('detail-id').textContent = issue.id;
    document.getElementById('detail-title').textContent = issue.title;
    document.getElementById('detail-description').textContent = issue.description || '-';
    document.getElementById('detail-current').textContent = issue.currentBehavior || '-';
    document.getElementById('detail-expected').textContent = issue.expectedBehavior || '-';
    document.getElementById('detail-steps').textContent = issue.stepsToReproduce || '-';
    document.getElementById('detail-solution').textContent = issue.solution || '-';
    
    document.getElementById('detail-status').textContent = issue.status;
    document.getElementById('detail-status').className = `status-badge ${issue.status.replace(/\s+/g, '.')}`;
    
    document.getElementById('detail-priority').textContent = issue.priority;
    const priorityClass = issue.priority.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    document.getElementById('detail-priority').className = `priority-badge ${priorityClass}`;
    
    document.getElementById('detail-client').textContent = issue.client || '-';
    document.getElementById('detail-category').textContent = issue.category || '-';
    document.getElementById('detail-assignee').textContent = issue.assignee || 'Não atribuído';
    
    const tagsContainer = document.getElementById('detail-tags');
    tagsContainer.innerHTML = (issue.tags || []).map(tag => `<span class="badge">${escapeHTML(tag)}</span>`).join('');
    
    document.getElementById('detail-created').textContent = formatDateLong(issue.createdAt);
    document.getElementById('detail-updated').textContent = formatDateLong(issue.updatedAt);

    // Hide/Show Mark as Fixed button
    const markFixedBtn = document.getElementById('btn-mark-fixed');
    if (issue.status === 'Corrigido' || issue.status === 'Fechado') {
        markFixedBtn.style.display = 'none';
    } else {
        markFixedBtn.style.display = 'inline-flex';
    }

    document.getElementById('modal-details').classList.remove('hidden');
}

function openFormModal(issue = null) {
    const form = document.getElementById('bug-form');
    form.reset();

    if (issue) {
        document.getElementById('form-modal-title').textContent = 'Editar Bug';
        document.getElementById('form-id').value = issue.id;
        document.getElementById('form-title').value = issue.title || '';
        document.getElementById('form-status').value = issue.status || 'Reportado';
        document.getElementById('form-description').value = issue.description || '';
        document.getElementById('form-current').value = issue.currentBehavior || '';
        document.getElementById('form-expected').value = issue.expectedBehavior || '';
        document.getElementById('form-steps').value = issue.stepsToReproduce || '';
        document.getElementById('form-priority').value = issue.priority || 'Média';
        document.getElementById('form-category').value = issue.category || 'Interface';
        document.getElementById('form-client').value = issue.client || '';
        document.getElementById('form-assignee').value = issue.assignee || '';
        document.getElementById('form-tags').value = (issue.tags || []).join(', ');
        document.getElementById('form-solution').value = issue.solution || '';
    } else {
        document.getElementById('form-modal-title').textContent = 'Novo Bug';
        document.getElementById('form-id').value = '';
        document.getElementById('form-status').value = 'Reportado';
        document.getElementById('form-priority').value = 'Média';
        document.getElementById('form-category').value = 'Cliente';
    }

    document.getElementById('modal-form').classList.remove('hidden');
}

function saveBugForm() {
    const title = document.getElementById('form-title').value.trim();
    const description = document.getElementById('form-description').value.trim();
    
    if (!title || !description) {
        showToast('Título e Descrição são obrigatórios.', 'error');
        return;
    }

    const id = document.getElementById('form-id').value;
    const now = new Date().toISOString();
    
    const tagsInput = document.getElementById('form-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const bugData = {
        title: title,
        status: document.getElementById('form-status').value,
        description: description,
        currentBehavior: document.getElementById('form-current').value.trim(),
        expectedBehavior: document.getElementById('form-expected').value.trim(),
        stepsToReproduce: document.getElementById('form-steps').value.trim(),
        priority: document.getElementById('form-priority').value,
        category: document.getElementById('form-category').value,
        client: document.getElementById('form-client').value,
        assignee: document.getElementById('form-assignee').value.trim(),
        tags: tags,
        solution: document.getElementById('form-solution').value.trim(),
        updatedAt: now
    };

    if (id) {
        // Edit
        const index = issues.findIndex(i => i.id === id);
        if (index !== -1) {
            issues[index] = { ...issues[index], ...bugData };
            showToast('Bug atualizado com sucesso!', 'success');
        }
    } else {
        // Create
        bugData.id = generateBugId();
        bugData.createdAt = now;
        issues.push(bugData);
        showToast('Bug criado com sucesso!', 'success');
    }

    saveData();
    renderBoard();
    document.getElementById('modal-form').classList.add('hidden');
}

function generateBugId() {
    const maxId = issues.reduce((max, issue) => {
        const num = parseInt(issue.id.replace('BUG-', ''));
        return num > max && !isNaN(num) ? num : max;
    }, 0);
    return `BUG-${String(maxId + 1).padStart(3, '0')}`;
}

// Copy & Export functions
function copyBugInfo() {
    const id = document.getElementById('detail-id').textContent;
    const issue = issues.find(i => i.id === id);
    if (!issue) return;

    const info = `
ID: ${issue.id}
Título: ${issue.title}
Status: ${issue.status}
Prioridade: ${issue.priority}
Categoria: ${issue.category}
Cliente: ${issue.client || '-'}
Descrição:
${issue.description}
    `.trim();

    navigator.clipboard.writeText(info).then(() => {
        showToast('Informações copiadas para a área de transferência!', 'success');
    });
}

function copyBugMarkdown() {
    const id = document.getElementById('detail-id').textContent;
    const issue = issues.find(i => i.id === id);
    if (!issue) return;

    const md = `
## ${issue.title}

**Status:** ${issue.status} | **Prioridade:** ${issue.priority} | **Categoria:** ${issue.category}
**Cliente:** ${issue.client || 'N/A'} | **Tags:** ${(issue.tags || []).join(', ')}

### Descrição
${issue.description || 'N/A'}

### Comportamento Atual
${issue.currentBehavior || 'N/A'}

### Comportamento Esperado
${issue.expectedBehavior || 'N/A'}

### Passos para Reproduzir
${issue.stepsToReproduce || 'N/A'}

---
*Reportado via FixBoard*
    `.trim();

    navigator.clipboard.writeText(md).then(() => {
        showToast('Markdown copiado! Pronto para colar no GitHub.', 'success');
    });
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(issues, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "fixboard_issues.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function restoreData() {
    if (confirm("Tem certeza que deseja apagar suas alterações locais e restaurar os dados originais?")) {
        localStorage.removeItem(STORAGE_KEY);
        await loadData();
        document.getElementById('modal-settings').classList.add('hidden');
        showToast('Dados restaurados com sucesso.', 'success');
    }
}

// Theme Handling
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        document.querySelector('#btn-theme-toggle i').className = 'fas fa-sun';
    }
}

function toggleTheme() {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'dark');
        document.querySelector('#btn-theme-toggle i').className = 'fas fa-moon';
    } else {
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_KEY, 'light');
        document.querySelector('#btn-theme-toggle i').className = 'fas fa-sun';
    }
}

// Utils
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

function formatDateShort(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateLong(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
