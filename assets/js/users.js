// users.js
// Logica de gerenciamento de equipe (Apenas Admins)

document.addEventListener('DOMContentLoaded', () => {
    const btnAdminPanel = document.getElementById('btn-admin-panel');
    if (btnAdminPanel) {
        btnAdminPanel.addEventListener('click', openUsersModal);
    }
});

async function openUsersModal() {
    if (!window.appState.profile || window.appState.profile.role !== 'admin') {
        showToast('Acesso negado. Apenas administradores.', 'error');
        return;
    }

    document.getElementById('modal-users').classList.remove('hidden');
    await loadUsersTable();
}

async function loadUsersTable() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '<tr><td colspan="6">Carregando usuários...</td></tr>';

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar usuários:', error);
        tbody.innerHTML = '<tr><td colspan="6">Erro ao carregar dados.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    data.forEach(user => {
        const tr = document.createElement('tr');
        
        // Status indicator
        const activeIndicator = `<span class="status-indicator ${user.active ? 'yes' : 'no'}" title="${user.active ? 'Ativo' : 'Desativado'}"></span>`;
        const approvedBadge = user.approved ? `<span style="color:var(--status-fixed)"><i class="fas fa-check"></i> Sim</span>` : `<span style="color:var(--status-analysis)"><i class="fas fa-clock"></i> Pendente</span>`;
        
        const isMe = user.id === window.appState.profile.id;

        // Role Badge
        let roleBadge = '';
        if (user.role === 'admin') roleBadge = '<span class="role-badge role-admin">Admin</span>';
        else if (user.role === 'developer') roleBadge = '<span class="role-badge role-developer">Dev</span>';
        else roleBadge = '<span class="role-badge role-viewer">Viewer</span>';

        tr.innerHTML = `
            <td>${activeIndicator} ${escapeHTML(user.display_name)} ${isMe ? '(Você)' : ''}</td>
            <td>${escapeHTML(user.email)}</td>
            <td>${roleBadge}</td>
            <td>${approvedBadge}</td>
            <td>${user.active ? 'Ativo' : 'Desativado'}</td>
            <td>
                <div class="user-actions">
                    ${!user.approved ? `<button onclick="approveUser('${user.id}')" class="success-btn" title="Aprovar Acesso"><i class="fas fa-check"></i></button>` : ''}
                    
                    ${user.active && !isMe ? `<button onclick="toggleActive('${user.id}', false)" class="warning-btn" title="Desativar"><i class="fas fa-ban"></i></button>` : ''}
                    ${!user.active ? `<button onclick="toggleActive('${user.id}', true)" class="success-btn" title="Ativar"><i class="fas fa-user-check"></i></button>` : ''}
                    
                    ${!isMe && user.role !== 'developer' ? `<button onclick="changeRole('${user.id}', 'developer')" class="primary-btn" title="Tornar Dev">Dev</button>` : ''}
                    ${!isMe && user.role !== 'viewer' ? `<button onclick="changeRole('${user.id}', 'viewer')" class="secondary-btn" title="Tornar Viewer">View</button>` : ''}
                    ${!isMe && user.role !== 'admin' ? `<button onclick="changeRole('${user.id}', 'admin')" class="warning-btn" title="Tornar Admin">Admin</button>` : ''}
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

async function approveUser(id) {
    if(!confirm('Tem certeza que deseja aprovar este usuário?')) return;
    const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', id);
    if (error) showToast('Erro ao aprovar.', 'error');
    else { showToast('Usuário aprovado!', 'success'); loadUsersTable(); }
}

async function toggleActive(id, isActive) {
    const action = isActive ? 'ativar' : 'desativar';
    if(!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;
    const { error } = await supabase.from('profiles').update({ active: isActive }).eq('id', id);
    if (error) showToast('Erro ao atualizar status ativo.', 'error');
    else { showToast('Status atualizado!', 'success'); loadUsersTable(); }
}

async function changeRole(id, newRole) {
    if(!confirm(`Mudar função deste usuário para ${newRole}?`)) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) showToast('Erro ao mudar função.', 'error');
    else { showToast('Função atualizada!', 'success'); loadUsersTable(); }
}
