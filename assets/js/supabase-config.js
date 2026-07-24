// supabase-config.js
// ATENÇÃO: Substitua as variáveis abaixo com os dados reais do seu projeto Supabase.
// Essas chaves são PÚBLICAS (anon key), não coloque sua service_role ou secret key aqui!

const SUPABASE_URL = 'https://nbmeyglqkuxmqryvoezq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_blueytj6P4NHsN-9Xrsy7w_2NcKXm-z';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Helper state
window.appState = {
    user: null,
    profile: null
};
