// supabase-config.js
// ATENÇÃO: Substitua as variáveis abaixo com os dados reais do seu projeto Supabase.
// Essas chaves são PÚBLICAS (anon key), não coloque sua service_role ou secret key aqui!

const SUPABASE_URL = 'https://nbmeyglqkuxmqryvoezq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibWV5Z2xxa3V4bXFyeXZvZXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTk4NTksImV4cCI6MjEwMDQ5NTg1OX0.swVyzNxOF3d0JD8XLEwBexYF0tiNggc69vdob-vuQ8A';

// Initialize Supabase client - garantir que window.supabase existe
let supabaseClient;

if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} else {
    console.error('❌ Supabase JS library not loaded! Make sure the CDN script is loaded before this file.');
}

// Helper state
window.appState = {
    user: null,
    profile: null
};
