// Supabase Configuration
// Replace with your new Supabase project URL and keys
const SUPABASE_URL = "https://skepwtyqfpbpphozzaeg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrZXB3dHlxZnBicHBob3p6YWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI0MTk0NCwiZXhwIjoyMDc5ODE3OTQ0fQ.pEz95zF7ihn35Fr2bLWD2ADgpVkZLj_ai4q9YOO93fI";

// Create Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseConfig = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    supabaseClient
};