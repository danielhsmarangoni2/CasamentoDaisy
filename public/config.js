/*
  PERSONALIZE AQUI. Edite somente os textos entre aspas.
  NAO coloque senhas ou a chave service_role do Supabase neste arquivo.
*/
window.WEDDING_CONFIG = {
  noivos: { primeiro: 'Daisy', segundo: 'Vinícius' },
  data: '2027-05-23',      // Domingo, 23 de maio de 2027 (AAAA-MM-DD)
  hora: '11:00',           // Início da cerimônia, horário de São Paulo
  horaEntrada: '10:00',    // Chegada dos convidados, horário de São Paulo
  local: 'Mansão Victória', // Local da cerimônia e festa
  endereco: 'Rua Orfanato, 440 - Vila Prudente, São Paulo - SP, 03131-010',  // Endereço do local
  mapaUrl: 'https://www.google.com/maps/dir/?api=1&destination=Mans%C3%A3o%20Vict%C3%B3ria%2C%20Rua%20Orfanato%2C%20440%2C%20Vila%20Prudente%2C%20S%C3%A3o%20Paulo%2C%20SP%2C%2003131-010',  // Abre rota no Google Maps
  convitesAtivos: true,    // RSVP somente por link personalizado e seguro, requer migração V4.
  notificacoesAtivas: false, // Troque para true DEPOIS de configurar Netlify Functions, Supabase, Mercado Pago e Meta.
  turnstileSiteKey: '', // Opcional: chave pública do Cloudflare Turnstile (se usar proteção anti-bot).
  whatsapp: '',            // So numeros com DDI e DDD. Exemplo: '5511999999999'
  // Pix agora é gerenciado exclusivamente no painel /admin.html.
  // Cole aqui os enderecos REAIS dos links criados na sua conta Mercado Pago.
  // Nao cole senhas, API tokens, credenciais privadas ou cartoes.
  mercadoPagoLinks: {
    '150': '',
    '250': '',
    '350': '',
    '500': '',
    '750': '',
    '1000': ''
  },
  mercadoPagoValorLivre: '', // Link 'Seu link' do Mercado Pago: o convidado informa o valor no checkout.
  supabaseUrl: '',         // Project URL no painel Supabase
  supabaseAnonKey: ''      // Publishable Key ou anon public. NUNCA service_role/secret.
};
