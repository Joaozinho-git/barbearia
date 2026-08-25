export const NEGOCIO = {
  nome: "Santos Dumont Barbearia",
  desde: "2016",
  cidade: "Vacaria/RS",
  endereco: "Rua Santos Dumont, 150 — Centro · Vacaria/RS",
  telefoneExibicao: "(54) 98139-3131",
  instagramExibicao: "@lael_barbearia_santosdumont",
  cnpj: "66.584.685/0001-79",
  // Sem anoCopyright: o ano do rodape sai de new Date() no Contato.tsx. Uma
  // constante fixa aqui era so uma data esperando para envelhecer sozinha.
} as const;

export const LINKS = {
  agendamento: "https://sites.appbarber.com.br/santosdumont?service=1220227",
  whatsapp: "https://wa.me/5554981393131",
  maps: "https://maps.app.goo.gl/icst8QdAFv8DEuNN7",
} as const;

export const HORARIOS = [
  { dia: "Segunda a sexta", horas: "09:00 – 12:00 · 14:00 – 19:30" },
  { dia: "Sábado", horas: "06:30 – 12:00 · 13:30 – 19:00" },
  { dia: "Domingo", horas: "Fechado" },
] as const;

export const CURSOS = [
  {
    nivel: "Básico",
    horas: "10 h",
    conteudo: "Técnicas fundamentais de corte",
    aulas: "5 módulos de 2h",
    cartao: "12x sem juros",
    boleto: "4x",
    aVista: "10% de desconto",
    investimento: "R$ 1.000",
  },
  {
    nivel: "Intermediário",
    horas: "20 h",
    conteudo: "Corte, barba e sobrancelha",
    aulas: "10 módulos de 2h",
    cartao: "12x sem juros",
    boleto: "6x",
    aVista: "15% de desconto",
    investimento: "R$ 1.500",
  },
  {
    nivel: "Avançado",
    horas: "50 h",
    conteudo: "Corte, barba, sobrancelha, platinado e luzes",
    aulas: "25 módulos de 2h",
    cartao: "12x sem juros",
    boleto: "6x",
    aVista: "15% de desconto",
    investimento: "R$ 2.000",
  },
] as const;

export const SECOES = [
  { id: "s0", num: "00", titulo: "Abertura" },
  { id: "s1", num: "01", titulo: "Equipe" },
  { id: "s2", num: "02", titulo: "Formação" },
  { id: "s3", num: "03", titulo: "Localização" },
  { id: "s4", num: "04", titulo: "Contato" },
] as const;

export const ENDERECO = {
  rua: "Rua Santos Dumont, 150",
  bairro: "Centro",
  cidade: "Vacaria",
  estado: "RS",
  cep: "95201-056",
  pais: "BR",
} as const;

export const TELEFONE_E164 = "+5554981393131";
export const INSTAGRAM_URL =
  "https://instagram.com/lael_barbearia_santosdumont";
