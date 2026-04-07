// ============================================
// Supabase Client Initialization
// Karate TMA DN5SAO
// ============================================

window.SUPABASE_URL = 'https://copkpxudxwetizqzhbsy.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGtweHVkeHdldGl6cXpoYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjcyNzcsImV4cCI6MjA5MTEwMzI3N30.JFI7_Nlrwwei7v2tbADXDl2JMrsz0MOt6ArPGi6hbLw';

try {
    window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    });
    console.log('[Supabase] Client initialized OK');
} catch (e) {
    console.error('[Supabase] Init failed:', e);
    window.sb = null;
}
