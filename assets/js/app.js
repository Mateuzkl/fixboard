// app.js - Principal Application Logic for Dynamic FixBoard

// State Management
let issues = [];
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

// Initial setup from database.js calls initBoard which then calls setupAppListeners
// Theme is loaded on DOMContentLoaded inside index.html but we can do it here too
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
});

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
    updateUIForRole();
}

function createCard(issue) {
    const card = document.createElement('div');
    card.className = 'bug-card';
    card.draggable = true;
    card.dataset.id = issue.id; // UUID from DB
    card.dataset.status = issue.status;

    const tagsHtml = (issue.tags || []).map(tag => `<span class="badge">${escapeHTML(tag)}</span>`).join('');
    const priorityClass = issue.priority.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Only Devs and Admins can edit/resolve directly on card
    const canEdit = window.appState.profile && ['admin', 'developer'].includes(window.appState.profile.role);

    let actionsHtml = '';
    if (canEdit) {
        actionsHtml = `
            <div class="card-actions">
                <button class="card-action-btn edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                ${issue.status !== 'Corrigido' && issue.status !== 'Fechado' ? `<button class="card-action-btn resolve-btn" title="Marcar como Corrigido"><i class="fas fa-check"></i></button>` : ''}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="card-header">
            <span class="bug-id">${escapeHTML(issue.ui_id)}</span>
            ${actionsHtml}
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

    if (canEdit) {
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
                updateStatusInDB(issue.id, 'Corrigido', issue.status);
                showToast('Marcado como corrigido!', 'success');
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
    } else {
        card.draggable = false;
    }

    return card;
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

function updateUIForRole() {
    const profile = window.appState.profile;
    if (!profile) return;

    document.getElementById('user-display-name').textContent = `Olá, ${profile.display_name}`;
    
    const isViewer = profile.role === 'viewer';
    const isAdmin = profile.role === 'admin';

    // Viewer cant create bugs
    const newBugBtn = document.getElementById('btn-new-bug');
    if (isViewer) newBugBtn.classList.add('hidden');
    else newBugBtn.classList.remove('hidden');

    // Admin panel
    const adminBtn = document.getElementById('btn-admin-panel');
    if (isAdmin) adminBtn.classList.remove('hidden');
    else adminBtn.classList.add('hidden');
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
            issue.ui_id,
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

// Setup listeners (Called from database.js after init)
function setupAppListeners() {
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

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.add('hidden');
        });
    });

    // Form submit
    document.getElementById('btn-save-bug').addEventListener('click', saveBugForm);

    // Detail actions
    document.getElementById('btn-copy-info').addEventListener('click', copyBugInfo);
    document.getElementById('btn-copy-md').addEventListener('click', copyBugMarkdown);
    
    document.getElementById('btn-mark-fixed').addEventListener('click', () => {
        const dbId = document.getElementById('modal-details').dataset.dbId;
        const issue = issues.find(i => i.id === dbId);
        if (issue) {
            updateStatusInDB(dbId, 'Corrigido', issue.status);
            document.getElementById('modal-details').classList.add('hidden');
            showToast('Bug marcado como corrigido!', 'success');
        }
    });

    document.getElementById('btn-reopen').addEventListener('click', () => {
        const dbId = document.getElementById('modal-details').dataset.dbId;
        const issue = issues.find(i => i.id === dbId);
        if (issue) {
            // Reopen usually means going back to Reportado or Em Analise
            updateStatusInDB(dbId, 'Reportado', issue.status);
            document.getElementById('modal-details').classList.add('hidden');
            showToast('Bug reaberto!', 'warning');
        }
    });

    document.getElementById('btn-edit-from-detail').addEventListener('click', () => {
        const dbId = document.getElementById('modal-details').dataset.dbId;
        const issue = issues.find(i => i.id === dbId);
        if (issue) {
            document.getElementById('modal-details').classList.add('hidden');
            openFormModal(issue);
        }
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetId = e.target.dataset.target;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Comment
    document.getElementById('btn-add-comment').addEventListener('click', async () => {
        const dbId = document.getElementById('modal-details').dataset.dbId;
        const input = document.getElementById('new-comment');
        const text = input.value.trim();
        if(!text) return;
        
        const ok = await addComment(dbId, text);
        if(ok) {
            input.value = '';
            loadCommentsIntoModal(dbId);
        }
    });

    // Assign to me
    document.getElementById('btn-assign-me').addEventListener('click', async () => {
        const dbId = document.getElementById('modal-details').dataset.dbId;
        const issue = issues.find(i => i.id === dbId);
        if(issue) {
            const { error } = await supabaseClient.from('issues').update({ assignee_id: window.appState.profile.id }).eq('id', dbId);
            if(!error) {
                await logHistory(dbId, 'assigned', 'assignee_id', null, window.appState.profile.id);
                loadDatabaseIssues();
                document.getElementById('modal-details').classList.add('hidden');
                showToast('Você assumiu este bug.', 'success');
            } else {
                showToast('Erro ao assumir bug.', 'error');
            }
        }
    });

    setupDragAndDrop();
}

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
            const issueId = card.dataset.id; // DB ID
            const prevStatus = card.dataset.status;
            
            if (prevStatus !== newStatus) {
                // Optimistic UI could be here, but we just call DB
                updateStatusInDB(issueId, newStatus, prevStatus);
            }
        });
    });
}

// Modals Logic
function openDetailModal(issue) {
    // Reset tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-target="tab-details"]').classList.add('active');
    document.getElementById('tab-details').classList.add('active');

    document.getElementById('modal-details').dataset.dbId = issue.id;

    document.getElementById('detail-id').textContent = issue.ui_id;
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

    if (issue.resolvedAt) {
        document.getElementById('detail-resolved-container').classList.remove('hidden');
        document.getElementById('detail-resolved').textContent = formatDateLong(issue.resolvedAt);
    } else {
        document.getElementById('detail-resolved-container').classList.add('hidden');
    }

    // Role specific buttons
    const canEdit = window.appState.profile && ['admin', 'developer'].includes(window.appState.profile.role);
    const markFixedBtn = document.getElementById('btn-mark-fixed');
    const reopenBtn = document.getElementById('btn-reopen');
    const editBtn = document.getElementById('btn-edit-from-detail');
    const assignMeBtn = document.getElementById('btn-assign-me');
    const commentForm = document.getElementById('comment-form-container');

    if (canEdit) {
        editBtn.classList.remove('hidden');
        commentForm.classList.remove('hidden');
        
        if (issue.status === 'Corrigido' || issue.status === 'Fechado') {
            markFixedBtn.classList.add('hidden');
            reopenBtn.classList.remove('hidden');
        } else {
            markFixedBtn.classList.remove('hidden');
            reopenBtn.classList.add('hidden');
        }

        if (issue.assignee_id !== window.appState.profile.id) {
            assignMeBtn.classList.remove('hidden');
        } else {
            assignMeBtn.classList.add('hidden');
        }
    } else {
        editBtn.classList.add('hidden');
        markFixedBtn.classList.add('hidden');
        reopenBtn.classList.add('hidden');
        assignMeBtn.classList.add('hidden');
        commentForm.classList.add('hidden');
    }

    // Load extra data
    loadCommentsIntoModal(issue.id);
    loadHistoryIntoModal(issue.id);

    document.getElementById('modal-details').classList.remove('hidden');
}

async function loadCommentsIntoModal(issueId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<p>Carregando...</p>';
    const comments = await fetchComments(issueId);
    
    if (comments.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Nenhum comentário.</p>';
        return;
    }

    list.innerHTML = comments.map(c => `
        <div class="comment-card">
            <div class="comment-header">
                <span class="comment-author"><i class="fas fa-user-circle"></i> ${escapeHTML(c.author?.display_name || 'Desconhecido')}</span>
                <span class="comment-date">${formatDateLong(c.created_at)}</span>
            </div>
            <div class="comment-body">${escapeHTML(c.content)}</div>
        </div>
    `).join('');
}

async function loadHistoryIntoModal(issueId) {
    const list = document.getElementById('history-list');
    list.innerHTML = '<li>Carregando...</li>';
    const history = await fetchHistory(issueId);
    
    if (history.length === 0) {
        list.innerHTML = '<li class="history-item">Nenhum histórico encontrado.</li>';
        return;
    }

    list.innerHTML = history.map(h => {
        let text = '';
        const user = escapeHTML(h.user?.display_name || 'Sistema');
        
        if (h.action === 'created') text = `Bug reportado.`;
        else if (h.action === 'updated') text = `Bug editado.`;
        else if (h.action === 'commented') text = `Adicionou um comentário.`;
        else if (h.action === 'status_changed') text = `Alterou o status de <b>${escapeHTML(h.old_value)}</b> para <b>${escapeHTML(h.new_value)}</b>.`;
        else if (h.action === 'assigned') text = `Assumiu a responsabilidade.`;
        else text = h.action;

        return `
        <li class="history-item">
            <span class="history-date">${formatDateLong(h.created_at)}</span>
            <strong>${user}</strong> ${text}
        </li>
        `;
    }).join('');
}

function openFormModal(issue = null) {
    const form = document.getElementById('bug-form');
    form.reset();

    if (issue) {
        document.getElementById('form-modal-title').textContent = `Editar ${issue.ui_id}`;
        document.getElementById('form-id').value = issue.id;
        document.getElementById('form-title').value = issue.title || '';
        document.getElementById('form-status').value = issue.status || 'Reportado';
        document.getElementById('form-description').value = issue.description || '';
        document.getElementById('form-current').value = issue.currentBehavior || '';
        document.getElementById('form-expected').value = issue.expectedBehavior || '';
        document.getElementById('form-steps').value = issue.stepsToReproduce || '';
        document.getElementById('form-priority').value = issue.priority || 'Média';
        document.getElementById('form-category').value = issue.category || 'Geral';
        document.getElementById('form-client').value = issue.client || 'Nenhum';
        document.getElementById('form-tags').value = (issue.tags || []).join(', ');
        document.getElementById('form-solution').value = issue.solution || '';
    } else {
        document.getElementById('form-modal-title').textContent = 'Novo Bug';
        document.getElementById('form-id').value = '';
        document.getElementById('form-status').value = 'Reportado';
        document.getElementById('form-priority').value = 'Média';
        document.getElementById('form-category').value = 'Geral';
    }

    document.getElementById('modal-form').classList.remove('hidden');
}

async function saveBugForm() {
    const title = document.getElementById('form-title').value.trim();
    if (!title) {
        showToast('Título é obrigatório.', 'error');
        return;
    }

    const id = document.getElementById('form-id').value;
    const tagsInput = document.getElementById('form-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const issueData = {
        title: title,
        status: document.getElementById('form-status').value,
        description: document.getElementById('form-description').value.trim(),
        currentBehavior: document.getElementById('form-current').value.trim(),
        expectedBehavior: document.getElementById('form-expected').value.trim(),
        stepsToReproduce: document.getElementById('form-steps').value.trim(),
        priority: document.getElementById('form-priority').value,
        category: document.getElementById('form-category').value,
        client: document.getElementById('form-client').value,
        tags: tags,
        solution: document.getElementById('form-solution').value.trim()
    };
    
    // If we are editing, preserve assignee_id if it exists, since the form doesn't let us edit it manually except "assign to me"
    if (id) {
        const existing = issues.find(i => i.id === id);
        if (existing) issueData.assignee_id = existing.assignee_id;
    }

    const ok = await saveIssueToDB(issueData, id || null);
    if (ok) {
        showToast('Bug salvo com sucesso!', 'success');
        document.getElementById('modal-form').classList.add('hidden');
    }
}

// Copy & Export functions
function copyBugInfo() {
    const dbId = document.getElementById('modal-details').dataset.dbId;
    const issue = issues.find(i => i.id === dbId);
    if (!issue) return;

    const info = `
ID: ${issue.ui_id}
Título: ${issue.title}
Status: ${issue.status}
Prioridade: ${issue.priority}
Categoria: ${issue.category}
Cliente: ${issue.client || '-'}
Descrição:
${issue.description}
    `.trim();

    navigator.clipboard.writeText(info).then(() => {
        showToast('Informações copiadas!', 'success');
    });
}

function copyBugMarkdown() {
    const dbId = document.getElementById('modal-details').dataset.dbId;
    const issue = issues.find(i => i.id === dbId);
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
        showToast('Markdown copiado!', 'success');
    });
}

// Theme Handling
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        const icon = document.querySelector('#btn-theme-toggle i');
        if(icon) icon.className = 'fas fa-sun';
    }
}

function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'dark');
        document.querySelector('#btn-theme-toggle i').className = 'fas fa-moon';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
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
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
