import { createClient } from "@supabase/supabase-js";

// TODO(admin): isto usa a service role key direto no bundle do cliente,
// que bypassa RLS por completo — aceitável só porque /admin.html é uma
// página local, sem link em nenhum lugar do app, protegida por um
// user_id hardcoded (ver adminPage.js). Antes de ir pra produção de
// verdade, mover essas queries pra uma Edge Function autenticada e
// remover VITE_SUPABASE_SERVICE_KEY do .env/bundle inteiramente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
