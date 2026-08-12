const REGRAS_TRADUCAO = [
    {
        padrao: /schema cache|could not find the table|relation .* does not exist/i,
        mensagem: "Não foi possível carregar os dados agora. Tente novamente em instantes.",
    },
    {
        padrao: /failed to fetch|network ?error|load failed|net::/i,
        mensagem: "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    },
    {
        padrao: /jwt|token .*(expired|invalid)|not authenticated/i,
        mensagem: "Sua sessão expirou. Faça login novamente.",
    },
];

export function traduzErroSupabase(error) {
    const mensagemOriginal = error?.message ?? "";
    const regra = REGRAS_TRADUCAO.find(({ padrao }) => padrao.test(mensagemOriginal));
    return regra ? regra.mensagem : mensagemOriginal;
}
