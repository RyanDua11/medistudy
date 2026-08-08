import { supabase } from "./supabaseClient.js";

export async function registrar(email, senha) {
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error) throw new Error(error.message);
    return data;
}

export async function entrar(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
    });
    if (error) throw new Error(error.message);
    return data;
}

export async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
}

export async function obterSessao() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session ? data.session : null;
}
