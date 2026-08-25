import { createClient } from "@supabase/supabase-js";

// TODO(admin): isto usa a service role key direto no bundle do cliente,
// que bypassa RLS por completo — aceitável só porque /admin.html é
// protegida por um user_id hardcoded (ver adminPage.js) e o link só
// aparece pra essa conta (ver usuarioMenu.js). Antes de ir pra produção
// de verdade, mover essas queries pra uma Edge Function autenticada e
// remover VITE_SUPABASE_SERVICE_KEY do .env/bundle inteiramente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// storageKey própria e sem persistência de sessão: este client nunca faz
// login, só usa a service key pra consultas administrativas — sem isso
// ele compete pela mesma chave de localStorage do client anônimo
// (supabaseClient.js) e o supabase-js avisa "Multiple GoTrueClient
// instances detected... may produce undefined behavior".
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        storageKey: "medistudy-admin-auth",
        persistSession: false,
        autoRefreshToken: false,
    },
});
