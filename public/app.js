/* Site Daisy e Vinícius - comportamento e integração opcional com Supabase */
(() => {
  'use strict';
  const cfg = window.WEDDING_CONFIG || {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const esc = (v) => String(v || '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  let db = null;
  let posts = [];
  let activeFilter = 'todos';
  let photoObjectUrl = null;
  let submitting = false;
  let toastTimer;

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('show'), 4200);
  }
  function setStatus(selector, message, ok=false) {
    const el = $(selector);
    el.textContent = message;
    el.className = 'form-status ' + (ok ? 'success' : 'error');
  }

  const first = (cfg.noivos?.primeiro || 'Daisy').trim();
  const second = (cfg.noivos?.segundo || 'Vinícius').trim();
  $('#nome-primeiro').textContent = first;
  $('#nome-segundo').textContent = second;
  $('#monograma').innerHTML = '<img class="seal-logo" src="assets/orquideas-dv.png" alt="D&amp;V" width="506" height="399" />';
  $('.footer-monogram').innerHTML = `${esc(first[0])} <i>&amp;</i> ${esc(second[0])}`;
  $('title').textContent = `${first} & ${second} | Casamento`;
  $('#guest-message').placeholder = `Escreva algo especial para ${first} e ${second}...`;
  const nav = $('#nav-list');
  $('#menu-toggle').addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
  });
  $$('#nav-list a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
  }));

  let weddingDate = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cfg.data || '')) {
    const hasTime = /^\d{2}:\d{2}$/.test(cfg.hora || '');
    const clock = hasTime ? cfg.hora : '00:00'; // Sem horário: conta até o início do dia, sem inventar horário da cerimônia.
    const date = new Date(`${cfg.data}T${clock}:00-03:00`); // Fuso de Brasília/São Paulo; ajustar caso o evento seja em outro fuso.
    if (!isNaN(date.getTime())) {
      weddingDate = date;
      const display = new Intl.DateTimeFormat('pt-BR', {day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(date);
      $('#hero-data').textContent = display.toLocaleUpperCase('pt-BR');
      $('#detail-date').textContent = display;
      $('#footer-date').textContent = display;
      const arrival = /^\d{2}:\d{2}$/.test(cfg.horaEntrada || '') ? cfg.horaEntrada.replace(':','h') : 'a confirmar';
      const ceremony = hasTime ? cfg.hora.replace(':','h') : 'a confirmar';
      $('#countdown-caption').textContent = hasTime
        ? `Contagem regressiva para a cerimônia às ${ceremony}. Entrada dos convidados às ${arrival}.`
        : `Contagem para o dia ${display}. Horário da cerimônia a confirmar.`;
    }
  }
  if (/^\d{2}:\d{2}$/.test(cfg.hora || '')) {
    $('#detail-ceremony').textContent = cfg.hora.replace(':','h');
    $('#hero-ceremony').textContent = cfg.hora.replace(':','h');
  }
  if (/^\d{2}:\d{2}$/.test(cfg.horaEntrada || '')) {
    $('#detail-entry').textContent = cfg.horaEntrada.replace(':','h');
    $('#hero-entry').textContent = cfg.horaEntrada.replace(':','h');
  }
  if (cfg.local?.trim()) $('#detail-location').textContent = cfg.local.trim();
  if (cfg.endereco?.trim()) $('#detail-address').textContent = cfg.endereco.trim();
  if (/^https:\/\//.test(cfg.mapaUrl || '')) {
    $('#map-link').href = cfg.mapaUrl;
    $('#map-link').classList.remove('hidden');
  }
  function countdown() {
    if (!weddingDate) return;
    const remaining = weddingDate.getTime() - Date.now();
    if (remaining <= 0) {
      $('#countdown-caption').textContent = 'O nosso grande dia chegou! Obrigado por fazer parte dele.';
      ['days','hours','minutes','seconds'].forEach(p => $(`#cd-${p}`).textContent = '00');
      return;
    }
    const seconds = Math.floor(remaining / 1000);
    const values = [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
    ['days','hours','minutes','seconds'].forEach((key, i) => $(`#cd-${key}`).textContent=String(values[i]).padStart(2,'0'));
  }
  countdown();
  if (weddingDate) window.setInterval(countdown, 1000);

  // Presentes: integração por links PUBLICOS de pagamento; NUNCA inclua tokens secretos neste site.
  // Ao escolher cartão, o checkout abre na mesma aba para funcionar melhor no Safari/iPhone.
  const giftDialog = $('#gift-dialog');
  const giftAmountInput = $('#gift-custom-amount');
  const giftPixGuide = $('#gift-pix-guide');
  const giftPixButton = $('#gift-pix');
  // Chave Pix administrada no painel; nunca tentar cobrar com dados locais desatualizados.
  const pixSettings={pixChave:'',pixTitular:'',pixCidade:''};
  let pixReady=false;
  async function fetchPixSettings(){
   pixReady=false;
   try {
    const response=await fetch('/.netlify/functions/public-settings',{cache:'no-store'});
    if(!response.ok)throw new Error('Pix indisponível');
    const saved=await response.json();
    for(const field of ['pixChave','pixTitular','pixCidade']) pixSettings[field]=typeof saved[field]==='string'?saved[field]:'';
    pixReady=true;
   }catch(e){console.warn('Não foi possível consultar os dados do Pix.');
     for(const field of ['pixChave','pixTitular','pixCidade'])pixSettings[field]='';}
   updateGiftDialog();
  }

  let selectedGiftAmount = null;
  let selectedGiftTitle = '';
  const formatBRL = n => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(n);
  function parseBRL(value) {
    const text = String(value || '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
    if (!text || !/^[0-9.,]+$/.test(text)) return NaN;
    // Aceita 150,50; 150.50; 1.500,50, sem arredondar silenciosamente.
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
  }
  function currentGiftAmount() {
    return selectedGiftAmount === 'outro' ? parseBRL(giftAmountInput.value) : Number(selectedGiftAmount);
  }
  function validGiftAmount() {
    const amount = currentGiftAmount();
    return Number.isFinite(amount) && amount >= 5 && amount <= 10000 && Math.abs(Math.round(amount * 100) - amount * 100) < 0.00001;
  }
  function giftStatus(message, ok=false) {
    const el = $('#gift-payment-status');
    el.textContent = message;
    el.classList.toggle('is-ok', ok);
  }
  // Links oficiais de cobrança podem ter formatos diferentes; só são abertos domínios permitidos.
  function safeMercadoPagoUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      const hostname = url.hostname.toLowerCase();
      const permitted = hostname === 'mpago.la' || hostname === 'mercadopago.com.br' ||
        hostname.endsWith('.mercadopago.com.br') || hostname === 'mercadopago.com' || hostname.endsWith('.mercadopago.com');
      if (url.protocol === 'https:' && permitted && !url.username && !url.password) return url.href;
    } catch (_) { /* sem link válido */ }
    return null;
  }
  function selectedMercadoPagoUrl() {
    return safeMercadoPagoUrl(selectedGiftAmount === 'outro'
      ? cfg.mercadoPagoValorLivre
      : cfg.mercadoPagoLinks?.[String(currentGiftAmount())]);
  }
  // Código Pix BR Code estático, com VALOR escolhido e CRC16 conforme Banco Central.
  // Esse QR não consulta o banco nem confirma pagamento automaticamente.
  function pixField(id, value) {
    const val = String(value);
    if (val.length > 99) throw new Error('Campo Pix muito grande.');
    return `${id}${String(val.length).padStart(2, '0')}${val}`;
  }
  function pixCRC(payload) {
    let crc = 0xffff;
    for (let i=0;i<payload.length;i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for(let bit=0;bit<8;bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4,'0');
  }
  function normalizePixText(text) {
    return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 .-]/g,' ').replace(/\s+/g,' ').trim();
  }
  function isValidPixConfig() {
    const key=String(pixSettings.pixChave||'').trim();
    const name=normalizePixText(pixSettings.pixTitular);
    const city=normalizePixText(pixSettings.pixCidade);
    // Chaves EVP (aleatórias) têm formato UUID. Aceita também telefone, email ou CPF/CNPJ,
    // mas cabe ao titular testar a chave com o banco antes de publicar.
    return pixReady && key.length>0 && key.length<=77 && /^[\x21-\x7e]+$/.test(key) &&
      name.length>=2 && name.length<=25 && city.length>=2 && city.length<=15 && Boolean(window.WeddingQR);
  }
  function makePixBRCode(amount) {
    if (!isValidPixConfig()) throw new Error('Configure a chave Pix no painel dos noivos.');
    if (!validGiftAmount()) throw new Error('Escolha um valor válido.');
    const key=String(pixSettings.pixChave).trim();
    const name=normalizePixText(pixSettings.pixTitular);
    const city=normalizePixText(pixSettings.pixCidade);
    const merchant=pixField('00','br.gov.bcb.pix')+pixField('01',key);
    const info=pixField('05','***');
    const payload= pixField('00','01')+pixField('26',merchant)+pixField('52','0000')+
      pixField('53','986')+pixField('54',amount.toFixed(2))+pixField('58','BR')+
      pixField('59',name)+pixField('60',city)+pixField('62',info)+'6304';
    return payload+pixCRC(payload);
  }
  let currentPixCode='';
  function resetPixGuide() {
    giftPixGuide.hidden = true;
    $('#gift-card-identity').hidden = true;
    $('#gift-custom-area').hidden = selectedGiftAmount !== 'outro';
    $('#gift-payment-selection').hidden = false;
    giftPixButton.setAttribute('aria-expanded', 'false');
    currentPixCode='';
    $('#gift-pix-qr').replaceChildren();
    $('#gift-pix-code').textContent='';
  }
  function updateGiftDialog() {
    const custom = selectedGiftAmount === 'outro';
    const amount = currentGiftAmount();
    const hasAmount = validGiftAmount();
    $('#gift-dialog-description').textContent = custom
      ? (hasAmount ? `${formatBRL(amount)} para Daisy e Vinícius` : 'Um carinho especial para os noivos')
      : `${selectedGiftTitle} · ${formatBRL(amount)}`;
    const canPix = isValidPixConfig() && hasAmount;
    const canCard = (Boolean(cfg.notificacoesAtivas) || Boolean(selectedMercadoPagoUrl())) && hasAmount;
    giftPixButton.disabled = !canPix;
    $('#gift-mercadopago').disabled = !canCard;
    giftPixButton.title = canPix ? 'Gerar QR Code Pix com o valor escolhido' : 'Pix ainda não disponível: configure no painel dos noivos';
    $('#gift-mercadopago').title = canCard ? 'Abrir pagamento no Mercado Pago' : 'Link de cartão ainda não configurado';
    if (!hasAmount && custom) giftStatus('Digite um valor entre R$ 5,00 e R$ 10.000,00.');
    else if (!canPix && !canCard) giftStatus('Os noivos ainda não ativaram as formas de pagamento.');
    else giftStatus('');
    $('#gift-pix-message').hidden = !custom || !canCard;
    if (custom && canCard) {
      $('#gift-pix-message').textContent = 'Para cartão, informe este mesmo valor novamente na página do Mercado Pago antes de confirmar.';
    }
  }
  $$('[data-gift-amount]').forEach(button => button.addEventListener('click', () => {
    selectedGiftAmount = button.dataset.giftAmount;
    selectedGiftTitle = button.dataset.giftTitle || 'Presente especial';
    const custom = selectedGiftAmount === 'outro';
    $('#gift-custom-area').hidden = !custom;
    giftAmountInput.value = '';
    $('#gift-donor-name').value = '';
    resetPixGuide();
    updateGiftDialog();
    giftDialog.showModal();
    window.WeddingAntiBot?.setupGift();
    if (custom) giftAmountInput.focus();
  }));
  giftAmountInput.addEventListener('input', () => { resetPixGuide(); updateGiftDialog(); });
  fetchPixSettings();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)fetchPixSettings()});
  $('#close-gift').addEventListener('click', () => giftDialog.close());
  giftDialog.addEventListener('click', event => { if (event.target === giftDialog) giftDialog.close(); });
  giftDialog.addEventListener('close', resetPixGuide);
  async function copyPixCode() {
    if (!currentPixCode) return;
    try {
      await navigator.clipboard.writeText(currentPixCode);
      $('#gift-pix-copy').textContent='CÓDIGO PIX COPIADO ✓';
      giftStatus('Código Pix copiado! Abra seu banco em Pix Copia e Cola e confira destinatário e valor.',true);
    } catch {
      $('#gift-pix-code').focus();
      giftStatus('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.');
    }
  }
  giftPixButton.addEventListener('click', () => {
    if (!validGiftAmount() || !isValidPixConfig()) return;
    try {
      currentPixCode=makePixBRCode(currentGiftAmount());
      $('#gift-pix-code').textContent=currentPixCode;
      window.WeddingQR.render($('#gift-pix-qr'),currentPixCode);
      $('#gift-pix-instruction').textContent=`Contribuição de ${formatBRL(currentGiftAmount())}. Escaneie o QR Code ou copie o código abaixo para pagar pelo seu banco.`;
      $('#gift-pix-recipient').textContent=`Titular: ${normalizePixText(pixSettings.pixTitular)}`;
      $('#gift-pix-copy').textContent='COPIAR CÓDIGO PIX';
      $('#gift-payment-selection').hidden=true;
      $('#gift-custom-area').hidden=true;
      giftPixGuide.hidden=false;
      giftPixButton.setAttribute('aria-expanded','true');
      giftStatus('');
      giftDialog.scrollTo({top:0,behavior:'instant'});
    } catch (error) { giftStatus('Não foi possível gerar o Pix. Verifique a configuração.'); }
  });
  $('#gift-pix-copy').addEventListener('click', copyPixCode);
  $('#gift-pix-back').addEventListener('click', () => {
    resetPixGuide();
    updateGiftDialog();
    giftDialog.scrollTo({top:0,behavior:'instant'});
  });
  $('#gift-mercadopago').addEventListener('click', () => {
    if (!validGiftAmount()) return;
    // Nome só é pedido para o checkout integrado de cartão; nunca para o Pix direto.
    $('#gift-payment-selection').hidden = true;
    $('#gift-custom-area').hidden = true;
    $('#gift-card-identity').hidden = false;
    $('#gift-card-name-fields').hidden = !cfg.notificacoesAtivas;
    $('#gift-manual-warning').hidden = Boolean(cfg.notificacoesAtivas);
    giftStatus('');
    if (cfg.notificacoesAtivas) $('#gift-donor-name').focus();
  });
  $('#gift-card-back').addEventListener('click', () => {
    resetPixGuide();
    updateGiftDialog();
  });
  $('#gift-card-confirm').addEventListener('click', async () => {
    if (!validGiftAmount()) return;
    const nome = $('#gift-donor-name').value.trim().replace(/\s+/g,' ');
    if (cfg.notificacoesAtivas && (nome.length < 2 || nome.length > 80)) {
      giftStatus('Informe o nome de quem está presenteando (mínimo de 2 caracteres).');
      $('#gift-donor-name').focus();
      return;
    }
    const button=$('#gift-card-confirm');
    if (cfg.notificacoesAtivas) {
      if(cfg.turnstileSiteKey && !window.WeddingAntiBot?.token('gift')){giftStatus('Conclua a verificação anti-robô para continuar.');return;}
      button.disabled=true;
      const old=button.innerHTML;
      giftStatus('Preparando seu pagamento seguro...');
      try {
        const res=await fetch('/.netlify/functions/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          valor:currentGiftAmount(),nome,captchaToken:window.WeddingAntiBot?.token('gift')||''
        })});
        const data=await res.json();
        if(!res.ok || !data.url || !safeMercadoPagoUrl(data.url))throw new Error(data.error||'Falha ao iniciar o pagamento.');
        giftDialog.close();window.location.assign(data.url);
      }catch(err){giftStatus(err.message||'Não foi possível iniciar o pagamento.');}
      finally{button.innerHTML=old;button.disabled=false;window.WeddingAntiBot?.reset('gift');}
      return;
    }
    const href=selectedMercadoPagoUrl();
    if(!href){giftStatus('Adicione um link oficial do Mercado Pago no arquivo config.js.');return;}
    giftDialog.close();window.location.assign(href);
    // Os links manuais não permitem atribuir automaticamente um pagamento ao convite.
  });

  // V4 · Convites individuais. O frontend só apresenta os nomes; o servidor valida
  // novamente o token, as pessoas e os limites dentro de transação no banco.
  let currentInvite = null;
  const inviteQuery=new URLSearchParams(location.search).get('convite')||'';
  const inviteEntry=$('#invite-entry'),inviteForm=$('#rsvp-form');
  const inviteStatus=$('#invite-entry-text');
  function inviteDemo(){return !!window.WEDDING_INVITE_DEMO;}
  function visibleInviteForm(value){inviteForm.hidden=!value;inviteEntry.classList.toggle('invite-ready',value);}
  function renderInvite(i){
    currentInvite=i;
    inviteEntry.querySelector('strong').textContent='Convite de '+(i.nomePrincipal?(i.nomePrincipal+( /\be fam[ií]lia$/i.test(i.nomePrincipal)?'':' e família')):i.familia);
    inviteStatus.textContent='Convidados incluídos: '+i.pessoas.length+' · '+i.maxAdultos+' adulto(s) · '+i.maxCriancas+' criança(s). Selecione quem vai comparecer.';
    $('#rsvp-name').value=i.pessoas.find(p=>p.tipo==='adulto')?.nome||i.pessoas[0].nome;
    $('#rsvp-name').readOnly=true;
    $('#rsvp-name').closest('.rsvp-field').hidden=true;
    $('#rsvp-count-grid').hidden=true;
    $('#rsvp-companions-field').hidden=true;
    const box=$('#invite-members');box.replaceChildren();
    const title=document.createElement('p');title.className='rsvp-form-subtitle';title.textContent='Quem irá comparecer?';box.append(title);
    const previous=new Set(i.rsvp?.ids_selecionados||i.pessoas.map(p=>p.id));
    for(const person of i.pessoas){
      const label=document.createElement('label');label.className='invite-person';
      const cb=document.createElement('input');cb.type='checkbox';cb.value=person.id;cb.checked=previous.has(person.id);
      const text=document.createElement('span');text.textContent=person.nome;
      const small=document.createElement('small');small.textContent=person.tipo==='adulto'?'Adulto':'Criança';
      label.append(cb,text,small);box.append(label);
    }
    if(i.rsvp){
      const choice=$(`input[name="rsvp-resposta"][value="${i.rsvp.resposta}"]`);
      if(choice)choice.checked=true;
      $('#rsvp-contact').value=i.rsvp.contato||'';
      setStatus('#rsvp-status','Você já respondeu. Pode atualizar sua confirmação pelo mesmo link.',true);
    }
    updateRsvpGuests();visibleInviteForm(true);
  }
  async function openInvite(token){
    visibleInviteForm(false);
    if(!/^[A-Za-z0-9_-]{32}$/.test(token)&&!(inviteDemo()&&token==='demonstracao')){
      inviteStatus.textContent='Código inválido. Confira o link enviado pelos noivos.';return;
    }
    inviteStatus.textContent='Consultando seu convite...';
    if(inviteDemo()){
      renderInvite({familia:'Família Silva (exemplo)',nomePrincipal:'Maria',maxAdultos:2,maxCriancas:1,
       pessoas:[{id:'e11a1111-1111-4111-8111-111111111111',nome:'Maria Silva',tipo:'adulto'},
        {id:'e11a1111-1111-4111-8111-222222222222',nome:'João Silva',tipo:'adulto'},
        {id:'e11a1111-1111-4111-8111-333333333333',nome:'Laura Silva',tipo:'crianca'}],rsvp:null});return;
    }
    try{
     const res=await fetch('/.netlify/functions/invite?token='+encodeURIComponent(token),{cache:'no-store'});
     const info=await res.json();if(!res.ok)throw Error(info.error||'Convite não encontrado.');
     renderInvite(info);
    }catch(e){inviteStatus.textContent=e.message||'Não foi possível consultar seu convite.';}
  }
  $('#invite-open').addEventListener('click',()=>{
    const code=$('#invite-code').value.trim();const url=new URL(location.href);url.searchParams.set('convite',code);
    location.href=url.pathname+url.search+url.hash;
  });
  if(cfg.convitesAtivos){
    visibleInviteForm(false);
    if(inviteQuery || inviteDemo())openInvite(inviteQuery||'demonstracao');
  }else{inviteEntry.hidden=true;visibleInviteForm(true);}
  async function submitInvite(e){
    e.preventDefault();
    if(rsvpSubmitting||!currentInvite)return;
    const response=rsvpAttendance();
    const selected=response==='sim'?[...$('#invite-members').querySelectorAll('input:checked')].map(x=>x.value):[];
    if(response==='sim'&&!selected.length)return setStatus('#rsvp-status','Selecione quem irá comparecer.');
    if(response==='sim'&&!selected.some(id=>currentInvite.pessoas.some(p=>p.id===id&&p.tipo==='adulto')))
     return setStatus('#rsvp-status','É necessário selecionar ao menos um adulto.');
    const contact=$('#rsvp-contact').value.trim();
    if(contact&&!/^[0-9()+\s-]{8,20}$/.test(contact))return setStatus('#rsvp-status','Confira o WhatsApp.');
    if(!inviteDemo()&&cfg.turnstileSiteKey&&!window.WeddingAntiBot?.token('rsvp'))
      return setStatus('#rsvp-status','Conclua a verificação anti-robô.');
    rsvpSubmitting=true;rsvpButton.disabled=true;rsvpButton.textContent='Salvando confirmação...';
    try{
      if(inviteDemo()){
        currentInvite.rsvp={resposta:response,ids_selecionados:selected,contato:contact};
        setStatus('#rsvp-status','Demonstração: resposta atualizada apenas na prévia. 💗',true);return;
      }
      const res=await fetch('/.netlify/functions/invite-rsvp',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:inviteQuery,resposta:response,ids:selected,contato:contact,
          website:$('#rsvp-company').value,captchaToken:window.WeddingAntiBot?.token('rsvp')||''})
      });const result=await res.json();if(!res.ok||!result.salvo)throw Error(result.error||'Não foi possível salvar.');
      setStatus('#rsvp-status',result.alterado?'Sua confirmação foi registrada. Obrigado! 💗':'Sua confirmação já estava registrada. 💗',true);
      toast('Confirmação registrada!');
    }catch(error){setStatus('#rsvp-status',error.message||'Erro ao salvar.');}
    finally{rsvpSubmitting=false;rsvpButton.disabled=false;rsvpButton.innerHTML=rsvpInitialButton;window.WeddingAntiBot?.reset('rsvp');}
  }

  // Confirmações: grava no Supabase (somente INSERT anônimo, sem leitura pública).
  // Se o banco não estiver configurado, permite enviar uma mensagem detalhada ao WhatsApp dos noivos.
  let rsvpSubmitting = false;
  function rsvpAttendance() { return $('input[name="rsvp-resposta"]:checked')?.value || 'sim'; }
  function updateRsvpGuests() {
    const yes = rsvpAttendance() === 'sim';
    $('#rsvp-guests').hidden = !yes;
    if(cfg.convitesAtivos){$('#rsvp-companions-field').hidden=true;}
    const additional = Number($('#rsvp-adults').value) + Number($('#rsvp-children').value) > 1;
    if(!cfg.convitesAtivos)$('#rsvp-companions-field').hidden = !yes || !additional;
    $$('.rsvp-choice').forEach(label => label.classList.toggle('selected', label.querySelector('input').checked));
  }
  $$('input[name="rsvp-resposta"], #rsvp-adults, #rsvp-children').forEach(el => el.addEventListener('change',updateRsvpGuests));
  updateRsvpGuests();
  const rsvpButton = $('#rsvp-submit');
  const rsvpInitialButton = rsvpButton.innerHTML;
  $('#rsvp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(cfg.convitesAtivos){await submitInvite(e);return;}
    if (rsvpSubmitting || $('#rsvp-company').value) return;
    const name = $('#rsvp-name').value.trim();
    const response = rsvpAttendance();
    const attending = response === 'sim';
    const adults = attending ? Number($('#rsvp-adults').value) : 0;
    const children = attending ? Number($('#rsvp-children').value) : 0;
    const others = attending && adults + children > 1 ? $('#rsvp-others').value.trim() : '';
    const contact = $('#rsvp-contact').value.trim();
    if (name.length < 2 || name.length > 90 || !name.includes(' ')) {
      return setStatus('#rsvp-status','Informe seu nome e sobrenome.');
    }
    if (!['sim','nao'].includes(response) || !Number.isInteger(adults) || !Number.isInteger(children) || adults < 0 || adults > 6 || children < 0 || children > 6 || (attending && adults < 1)) {
      return setStatus('#rsvp-status','Confira a quantidade de adultos e crianças.');
    }
    if (attending && adults + children > 1 && (others.length < 3 || others.length > 450)) {
      return setStatus('#rsvp-status','Informe os nomes dos acompanhantes incluídos no convite.');
    }
    if (contact && (contact.length > 20 || !/^[0-9()+\s-]{8,20}$/.test(contact))) {
      return setStatus('#rsvp-status','Digite um WhatsApp válido ou deixe o campo em branco.');
    }
    const payload = {
      nome: name, resposta: response, adultos: adults, criancas: children,
      acompanhantes: others, contato: contact || null
    };
    if (cfg.notificacoesAtivas) {
      if(cfg.turnstileSiteKey && !window.WeddingAntiBot?.token('rsvp'))return setStatus('#rsvp-status','Conclua a verificação anti-robô.');
      rsvpSubmitting=true; rsvpButton.disabled=true;rsvpButton.textContent='Enviando confirmação...';
      try {
        const response=await fetch('/.netlify/functions/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...payload,website:$('#rsvp-company').value,captchaToken:window.WeddingAntiBot?.token('rsvp')||''})});
        const result=await response.json();
        if(!response.ok || !result.salvo)throw new Error(result.error||'Não foi possível salvar.');
        $('#rsvp-form').reset();updateRsvpGuests();
        setStatus('#rsvp-status',`Obrigado, ${name.split(' ')[0]}! Sua resposta foi salva com sucesso. 💗`,true);
        toast('Confirmação registrada!');
      }catch(error){setStatus('#rsvp-status',error.message||'Falha na confirmação. Tente novamente.');}
      finally{rsvpSubmitting=false;rsvpButton.disabled=false;rsvpButton.innerHTML=rsvpInitialButton;window.WeddingAntiBot?.reset('rsvp');}
      return;
    }
    // Não simular envio no site publicado: sem canal conectado a confirmação não é salva.
    if (!db) {
      const phone = String(cfg.whatsapp || '').replace(/\D/g,'');
      if (phone.length < 12 || phone.length > 15) {
        return setStatus('#rsvp-status','A confirmação ainda não está ativada. Os noivos precisam configurar o Supabase ou WhatsApp.');
      }
      const answer = attending ? `Sim! Vou com ${adults} adulto(s) e ${children} criança(s).` : 'Não poderei comparecer.';
      const msg = `Olá! Confirmação de presença no casamento de ${first} e ${second} (23/05/2027).\nNome: ${name}\nResposta: ${answer}${others?'\nAcompanhantes: '+others:''}${contact?'\nContato: '+contact:''}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
      return setStatus('#rsvp-status','O WhatsApp foi aberto. Envie a mensagem para concluir sua resposta.',true);
    }
    rsvpSubmitting = true;
    rsvpButton.disabled = true;
    rsvpButton.textContent = 'Enviando confirmação...';
    setStatus('#rsvp-status','Enviando sua resposta...');
    try {
      const {error} = await db.from('confirmacoes_casamento').insert(payload);
      if (error) throw error;
      $('#rsvp-form').reset();
      updateRsvpGuests();
      setStatus('#rsvp-status',attending ? `Obrigado, ${name.split(' ')[0]}! Sua presença foi registrada com sucesso. 💗` : `Obrigado por avisar, ${name.split(' ')[0]}. Sua resposta foi registrada. ♡`,true);
      toast('Confirmação recebida!');
    } catch (error) {
      console.error('Erro ao salvar RSVP:', error);
      setStatus('#rsvp-status','Não foi possível registrar a confirmação. Tente novamente; se persistir, avise os noivos.');
    } finally {
      rsvpSubmitting = false;
      rsvpButton.disabled = false;
      rsvpButton.innerHTML = rsvpInitialButton;
    }
  });

  const photoInput = $('#guest-photo');
  const preview = $('#photo-preview');
  function clearPreview() {
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    photoObjectUrl = null;
    photoInput.value = '';
    preview.classList.add('hidden');
    $('#preview-image').removeAttribute('src');
    $('#file-label').innerHTML = '<b>Clique para escolher uma foto</b><small>JPG, PNG ou imagem do celular • até 15 MB antes da otimização</small>';
  }
  photoInput.addEventListener('change', () => {
    if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl);
    const file=photoInput.files?.[0];
    if (!file) {clearPreview();return;}
    if (!file.type.startsWith('image/') || file.size > 15*1024*1024) {
      clearPreview();toast('Escolha uma imagem com até 15 MB.');return;
    }
    photoObjectUrl = URL.createObjectURL(file);
    $('#preview-image').src = photoObjectUrl;
    preview.classList.remove('hidden');
    $('#file-label').textContent = file.name;
  });
  $('#remove-photo').addEventListener('click', clearPreview);
  $('#guest-message').addEventListener('input', () => $('#letter-count').textContent = $('#guest-message').value.length);

  async function optimizePhoto(file) {
    // Converte imagens de celulares para JPEG, remove metadados e reduz consumo de armazenamento.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      const bound = 1600;
      const scale = Math.min(1,bound/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(img.naturalWidth*scale));
      canvas.height = Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      let quality=.78;
      let blob=null;
      for (let n=0;n<3;n++) {
        blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
        if (!blob) throw new Error('Não foi possível preparar esta imagem.');
        if (blob.size <= 4*1024*1024) break;
        quality-=.15;
      }
      if (blob.size > 4*1024*1024) throw new Error('A imagem ficou grande demais. Escolha outra foto.');
      return blob;
    } catch(error) {
      throw new Error('Não conseguimos processar esta foto. Tente enviar uma imagem JPG ou PNG.');
    } finally { URL.revokeObjectURL(url); }
  }

  function photoUrl(post) {
    // URL temporária gerada no servidor APENAS depois da aprovação.
    try {const u=new URL(post.foto_url);return u.protocol==='https:' && u.hostname.endsWith('.supabase.co') ? u.href : null;}
    catch {return null;}
  }
  function dateLabel(value) {
    try { return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); }
    catch { return ''; }
  }
  function renderWall() {
    const selection=posts.filter(post=>activeFilter==='todos'||(activeFilter==='fotos'?!!post.foto_path:!!post.mensagem));
    $('#wall-count').textContent=`${posts.length} ${posts.length === 1?'lembrança':'lembranças'}`;
    const wrap=$('#wall-posts');wrap.replaceChildren();
    if (!selection.length) {
      const box=document.createElement('div');box.className='empty-wall';
      const symbol=document.createElement('span');symbol.className='empty-icon';symbol.textContent='✳';
      const heading=document.createElement('h4');heading.textContent=posts.length?'Sem publicações nesta categoria.':'As primeiras lembranças começam aqui.';
      const msg=document.createElement('p');msg.textContent=posts.length?'Escolha outro filtro para ver as lembranças.':'Deixe uma foto ou recado para os noivos. Eles serão exibidos após aprovação.';
      box.append(symbol,heading,msg);wrap.append(box);return;
    }
    for (const post of selection) {
      const card=document.createElement('article');card.className='post-card';
      if (post.foto_path) {
        const url=photoUrl(post);
        if(url) {
          const img=document.createElement('img');img.className='post-photo';img.src=url;img.alt=`Foto enviada por ${post.nome}`;img.loading='lazy';img.tabIndex=0;
          img.addEventListener('click',()=>showImage(url,post.nome));img.addEventListener('keydown',ev=>{if(ev.key==='Enter')showImage(url,post.nome)});
          card.append(img);
        }
      } else {
        const initial=document.createElement('div');initial.className='post-initial';initial.textContent=(post.nome || 'C')[0].toUpperCase();card.append(initial);
      }
      const caption=document.createElement('div');caption.className='post-caption';
      if(post.mensagem){const p=document.createElement('p');p.textContent=post.mensagem;caption.append(p)}
      const strong=document.createElement('strong');strong.textContent=post.nome;caption.append(strong);
      const time=document.createElement('time');time.textContent=dateLabel(post.criado_em);caption.append(time);card.append(caption);wrap.append(card);
    }
  }
  function showImage(src,name) {$('#dialog-image').src=src;$('#dialog-image').alt=`Foto enviada por ${name}`;$('#image-dialog').showModal();}
  $('#close-image').addEventListener('click',()=>$('#image-dialog').close());
  $('#image-dialog').addEventListener('click',(event)=>{if(event.target===$('#image-dialog'))$('#image-dialog').close()});
  $$('.filter').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter;
    $$('.filter').forEach(other=>{other.classList.toggle('active',other===btn);other.setAttribute('aria-pressed',String(other===btn));});
    renderWall();
  }));

  async function loadWall() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
    try {
      const response=await fetch('/.netlify/functions/gallery',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Não foi possível buscar o mural.');
      posts=data.posts||[];renderWall();
    }catch(error){console.error(error);$('#mural-info').textContent='Não foi possível carregar as lembranças. Tente novamente mais tarde.';}
  }
  async function connectMural() {
    if (!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl || '') || !cfg.supabaseAnonKey?.trim()) {
      $('#mural-info').textContent = 'Mural em modo demonstração. Para receber postagens, siga o GUIA-DE-HOSPEDAGEM.md.';
      return;
    }
    try {
      // Biblioteca carregada apenas após inserir os dados do Supabase.
      const sdk = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      db=sdk.createClient(cfg.supabaseUrl.replace(/\/$/,''),cfg.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      $('#mural-info').textContent='As fotos e mensagens são revisadas pelos noivos antes da publicação.';
      await loadWall();
    } catch(error) {
      console.error(error);
      $('#mural-info').textContent='Erro na conexão. Confira sua internet e as chaves do Supabase.';
    }
  }
  $('#mural-form').addEventListener('submit',async e=>{
    e.preventDefault();
    if(submitting)return;
    const name=$('#guest-name').value.trim();
    const message=$('#guest-message').value.trim();
    const file=photoInput.files?.[0];
    if(name.length<2 || name.length>70)return setStatus('#mural-form-status','Escreva seu nome (de 2 a 70 caracteres).');
    if(!message && !file)return setStatus('#mural-form-status','Escreva uma mensagem ou selecione uma foto.');
    if(!$('#guest-consent').checked)return setStatus('#mural-form-status','Marque a autorização de publicação antes de continuar.');
    if($('#guest-site').value) return;
    if(!db)return setStatus('#mural-form-status','O mural ainda não está conectado. Os noivos precisam seguir o guia de configuração.');
    if(file && (!file.type.startsWith('image/')||file.size>15*1024*1024))return setStatus('#mural-form-status','Envie apenas uma imagem de até 15 MB.');
    submitting=true;$('#submit-post').disabled=true;$('#submit-post').textContent='Enviando lembrança...';
    try{
      let foto_path=null;
      if(file){
        const blob=await optimizePhoto(file);
        if(!cfg.turnstileSiteKey || !window.WeddingAntiBot?.token('mural')) throw new Error('Conclua a verificação anti-robô para enviar uma foto.');
        const response=await fetch('/.netlify/functions/gallery-upload-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({captchaToken:window.WeddingAntiBot.token('mural')})});
        const signed=await response.json();
        if(!response.ok||!signed.path||!signed.token)throw new Error(signed.error||'Não foi possível iniciar o envio.');
        const {error:uploadError}=await db.storage.from('casamento-fotos').uploadToSignedUrl(signed.path,signed.token,blob,{contentType:'image/jpeg',cacheControl:'300'});
        if(uploadError)throw new Error('Não foi possível enviar a foto: '+uploadError.message);
        foto_path=signed.path;
      }
      const {error}=await db.from('mural_de_recados').insert({nome:name,mensagem:message,foto_path,aprovado:false});
      if(error)throw new Error('Erro ao salvar a lembrança: '+error.message);
      $('#mural-form').reset();clearPreview();$('#letter-count').textContent='0';
      setStatus('#mural-form-status','Sua lembrança foi recebida! Ela aparecerá após os noivos aprovarem. 💗',true);
      toast('Lembrança enviada com sucesso!');
      window.WeddingAntiBot?.reset('mural');
    }catch(error){console.error(error);setStatus('#mural-form-status',error.message || 'Falha no envio. Tente de novo.');}
    finally{submitting=false;$('#submit-post').disabled=false;$('#submit-post').innerHTML='Enviar minha lembrança <span>↗</span>';}
  });
  connectMural();
  // Recarrega URLs assinadas ao retornar ao site (elas expiram por segurança).
  window.addEventListener('focus',()=>{if(db)loadWall()});
})();
