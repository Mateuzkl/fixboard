// database.js
// Handles Supabase Database interactions and Realtime

let realtimeChannel = null;

// Initialize board data and subscriptions
async function initBoard() {
    updateOnlineStatus(true);
    await loadDatabaseIssues();
    setupRealtime();
    setupAppListeners(); // Assuming this is defined in app.js
}

async function loadDatabaseIssues() {
    try {
        const { data, error } = await supabaseClient
            .from('issues')
            .select(`
                *,
                assignee:profiles!issues_assignee_id_fkey(display_name),
                creator:profiles!issues_created_by_fkey(display_name),
                issue_tags(tag)
            `)
            .is('deleted_at', null);

        if (error) throw error;
        
        // Transform data to match existing app.js structure
        issues = data.map(issue => ({
            id: issue.id,
            ui_id: `BUG-${String(issue.issue_number).padStart(3, '0')}`,
            title: issue.title,
            description: issue.description,
            currentBehavior: issue.current_behavior,
            expectedBehavior: issue.expected_behavior,
            stepsToReproduce: issue.reproduction_steps,
            status: issue.status,
            priority: issue.priority,
            category: issue.category,
            client: issue.client,
            assignee_id: issue.assignee_id,
            assignee: issue.assignee ? issue.assignee.display_name : null,
            created_by: issue.creator ? issue.creator.display_name : null,
            tags: issue.issue_tags.map(t => t.tag),
            solution: issue.solution,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            resolvedAt: issue.resolved_at
        }));

        renderBoard();
    } catch (error) {
        console.error('Erro ao carregar issues:', error);
        showToast('Erro ao carregar os bugs do banco de dados.', 'error');
    }
}

// Database writes
async function saveIssueToDB(issueData, id = null) {
    const isNew = !id;
    let savedIssue = null;
    const profile = window.appState.profile;

    try {
        const payload = {
            title: issueData.title,
            description: issueData.description,
            current_behavior: issueData.currentBehavior,
            expected_behavior: issueData.expectedBehavior,
            reproduction_steps: issueData.stepsToReproduce,
            status: issueData.status,
            priority: issueData.priority,
            category: issueData.category,
            client: issueData.client,
            assignee_id: issueData.assignee_id || null,
            solution: issueData.solution
        };

        if (isNew) {
            payload.created_by = profile.id;
            const { data, error } = await supabaseClient.from('issues').insert(payload).select().single();
            if (error) throw error;
            savedIssue = data;
            await logHistory(savedIssue.id, 'created', null, null, null);
        } else {
            const { data, error } = await supabaseClient.from('issues').update(payload).eq('id', id).select().single();
            if (error) throw error;
            savedIssue = data;
            await logHistory(savedIssue.id, 'updated', null, null, null);
        }

        // Handle tags
        if (issueData.tags && Array.isArray(issueData.tags)) {
            // Remove old tags
            await supabaseClient.from('issue_tags').delete().eq('issue_id', savedIssue.id);
            // Insert new tags
            if (issueData.tags.length > 0) {
                const tagsPayload = issueData.tags.map(t => ({ issue_id: savedIssue.id, tag: t }));
                await supabaseClient.from('issue_tags').insert(tagsPayload);
            }
        }

        // We do not reload everything, we rely on Realtime to fetch or we manually inject for ourselves
        await loadDatabaseIssues();
        return true;
    } catch (error) {
        console.error('Erro ao salvar issue:', error);
        showToast('Você não tem permissão ou ocorreu um erro.', 'error');
        return false;
    }
}

async function updateStatusInDB(id, newStatus, previousStatus) {
    try {
        const payload = { status: newStatus };
        if (newStatus === 'Corrigido') {
            payload.resolved_at = new Date().toISOString();
        } else {
            payload.resolved_at = null; // Un-resolve if changed back
        }

        const { error } = await supabaseClient.from('issues').update(payload).eq('id', id);
        if (error) throw error;
        
        await logHistory(id, 'status_changed', 'status', previousStatus, newStatus);
        
        // Wait for realtime to broadcast or reload
        // Optionally update local cache immediately for fast UI
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showToast('Erro ao atualizar status. Permissão negada?', 'error');
        // Revert local UI
        await loadDatabaseIssues();
    }
}

async function addComment(issueId, content) {
    try {
        const { error } = await supabaseClient.from('comments').insert({
            issue_id: issueId,
            author_id: window.appState.profile.id,
            content: content
        });
        if (error) throw error;
        await logHistory(issueId, 'commented', null, null, null);
        return true;
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showToast('Erro ao adicionar comentário.', 'error');
        return false;
    }
}

async function fetchComments(issueId) {
    const { data, error } = await supabaseClient
        .from('comments')
        .select('*, author:profiles(display_name)')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });
        
    if (error) {
        console.error('Erro ao buscar comentários:', error);
        return [];
    }
    return data;
}

async function fetchHistory(issueId) {
    const { data, error } = await supabaseClient
        .from('issue_history')
        .select('*, user:profiles(display_name)')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('Erro ao buscar histórico:', error);
        return [];
    }
    return data;
}

async function logHistory(issueId, action, field, oldVal, newVal) {
    const { error } = await supabaseClient.from('issue_history').insert({
        issue_id: issueId,
        user_id: window.appState.profile.id,
        action: action,
        field_name: field,
        old_value: oldVal,
        new_value: newVal
    });
    if (error) console.error('Erro ao registrar histórico:', error);
}

// Realtime
function setupRealtime() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }

    realtimeChannel = supabaseClient.channel('public:issues')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, payload => {
            console.log('Realtime change received!', payload);
            loadDatabaseIssues(); // simple approach: reload on change
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
            // If modal is open for this issue, reload comments
            const openModal = document.getElementById('modal-details');
            if (!openModal.classList.contains('hidden')) {
                const currentId = openModal.dataset.dbId;
                if (payload.new && payload.new.issue_id === currentId) {
                    loadCommentsIntoModal(currentId);
                }
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                updateOnlineStatus(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                updateOnlineStatus(false);
            }
        });
}

function updateOnlineStatus(isOnline) {
    const el = document.getElementById('realtime-status');
    if (!el) return;
    if (isOnline) {
        el.innerHTML = '<i class="fas fa-wifi"></i> Online';
        el.classList.remove('offline');
    } else {
        el.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline / Reconectando...';
        el.classList.add('offline');
    }
}
