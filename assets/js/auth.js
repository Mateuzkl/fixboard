// auth.js
let authListenerSet = false;

document.addEventListener('DOMContentLoaded', () => {
    checkInitialSession();
    setupAuthListeners();
});

async function checkInitialSession() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Erro ao verificar sessão:', error);
        handleUnauthenticated(isLoginPage);
        return;
    }

    if (session) {
        await handleAuthenticated(session.user, isLoginPage);
    } else {
        handleUnauthenticated(isLoginPage);
    }
}

async function handleAuthenticated(user, isLoginPage) {
    window.appState.user = user;
    
    // Fetch profile
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (error) {
        console.error('Erro ao buscar perfil:', error);
        if (isLoginPage) hideLoading();
        return;
    }
    
    window.appState.profile = profile;

    if (isLoginPage) {
        if (!profile.approved || !profile.active) {
            hideLoading();
            showApprovalNotice();
        } else {
            // Redirect to board
            window.location.replace('index.html');
        }
    } else {
        if (!profile.approved || !profile.active) {
            window.location.replace('login.html');
        } else {
            // We are on index.html and approved, proceed to init board
            hideLoading();
            if (typeof initBoard === 'function') {
                initBoard();
            }
        }
    }
}

function handleUnauthenticated(isLoginPage) {
    window.appState.user = null;
    window.appState.profile = null;
    
    if (!isLoginPage) {
        window.location.replace('login.html');
    } else {
        hideLoading();
    }
}

function setupAuthListeners() {
    // Prevent multiple listeners
    if (authListenerSet) return;
    authListenerSet = true;

    supabase.auth.onAuthStateChange(async (event, session) => {
        const isLoginPage = window.location.pathname.endsWith('login.html');
        
        if (event === 'SIGNED_IN') {
            if (session) await handleAuthenticated(session.user, isLoginPage);
        } else if (event === 'SIGNED_OUT') {
            handleUnauthenticated(isLoginPage);
        }
    });

    const isLoginPage = window.location.pathname.endsWith('login.html');
    
    if (isLoginPage) {
        const loginForm = document.getElementById('login-form');
        const registerBtn = document.getElementById('btn-register');
        const logoutNoticeBtn = document.getElementById('btn-logout-notice');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await doLogin();
            });
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', async () => {
                await doRegister();
            });
        }
        
        if (logoutNoticeBtn) {
            logoutNoticeBtn.addEventListener('click', doLogout);
        }
    } else {
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', doLogout);
        }
    }
}

async function doLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const loadingIcon = document.getElementById('btn-login-loading');
    const btnText = document.getElementById('btn-login-text');
    
    hideError();
    
    if (!email || !password) {
        showError('Preencha e-mail e senha.');
        return;
    }
    
    // UI Loading state
    btn.disabled = true;
    loadingIcon.classList.remove('hidden');
    btnText.textContent = 'Entrando...';
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        showError(error.message);
        btn.disabled = false;
        loadingIcon.classList.add('hidden');
        btnText.textContent = 'Entrar';
    }
    // If successful, onAuthStateChange will handle redirection
}

async function doRegister() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    hideError();
    
    if (!email || !password) {
        showError('Preencha e-mail e senha para criar conta.');
        return;
    }
    
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });
    
    if (error) {
        showError(error.message);
    } else {
        showToast('Conta criada! Aguardando aprovação do admin.', 'success');
        showApprovalNotice();
    }
}

async function doLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Erro ao sair:', error);
    }
}

function showApprovalNotice() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('approval-notice').classList.remove('hidden');
}

function hideLoading() {
    const loader = document.getElementById('session-loading');
    if (loader) loader.classList.add('hidden');
    const authContainer = document.getElementById('auth-container');
    if (authContainer) authContainer.classList.remove('hidden');
    const appWrapper = document.getElementById('app-wrapper');
    if (appWrapper) appWrapper.classList.remove('hidden');
}

function showError(msg) {
    const el = document.getElementById('auth-error-msg');
    if (el) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }
}

function hideError() {
    const el = document.getElementById('auth-error-msg');
    if (el) el.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
