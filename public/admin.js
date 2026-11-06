/* Painel do casamento. Demonstração isolada do banco real. */
(()=>{'use strict';
 const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
 const demo=!!window.WEDDING_ADMIN_DEMO;
 const brl=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
 const date=d=>{try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(d));}catch{return '—';}};
 const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let sdk=null,api=null,data={rsvp:[],gifts:[],album:[],audit:[],backups:[],photosBacked:0,backupConfigured:false,convites:[]};
 let settings={telefone:'',pixChave:'',pixTitular:'',pixCidade:''};
 const fake={
  rsvp:[{id:'a',nome:'Maria Silva',resposta:'sim',adultos:2,criancas:1,acompanhantes:'João Silva, Laura Silva',criado_em:'2026-10-30T10:00:00-03:00'},
    {id:'b',nome:'Carlos Oliveira',resposta:'sim',adultos:2,criancas:0,acompanhantes:'Ana Oliveira',criado_em:'2026-10-29T12:30:00-03:00'},
    {id:'c',nome:'Beatriz Costa',resposta:'nao',adultos:0,criancas:0,acompanhantes:'',criado_em:'2026-10-28T13:00:00-03:00'},
    {id:'d',nome:'Fernanda Martins',resposta:'sim',adultos:1,criancas:0,acompanhantes:'',criado_em:'2026-10-27T19:05:00-03:00'}],
  gifts:[{id:'e',nome:'João Oliveira',valor:350,taxa_mp:14.20,liquido_mp:335.80,meio_pagamento:'master',titulo:'Lua de mel',status:'aprovado',criado_em:'2026-10-30T13:00:00-03:00'},
    {id:'f',nome:'Mariana Alves',valor:500,taxa_mp:21.50,liquido_mp:478.50,meio_pagamento:'visa',titulo:'Nosso novo lar',status:'aprovado',criado_em:'2026-10-29T20:00:00-03:00'},
    {id:'g',nome:'Rafael Costa',valor:250,titulo:'Primeiros passos',status:'iniciado',criado_em:'2026-10-29T21:00:00-03:00'},
    {id:'k',nome:'Bruna Costa',valor:150,titulo:'Primeiros passos',status:'estornado',taxa_mp:6.80,liquido_mp:143.20,criado_em:'2026-10-20T18:15:00-03:00'}],
  audit:[{id:1,ocorrido_em:'2026-10-30T18:00:00-03:00',ator_tipo:'administrador',ator_id:'demo',acao:'mural_aprovar',entidade:'mural',detalhes:{tinha_foto:true}},{id:2,ocorrido_em:'2026-10-29T14:00:00-03:00',ator_tipo:'mercado_pago',ator_id:'123',acao:'pagamento_aprovado',entidade:'contribuicao',detalhes:{valor:350}}],
  backups:[{id:'b1',criado_em:'2026-10-30T03:00:00Z',tipo:'dados',estado:'ok',arquivos:1,registros:45,informacao:null},{id:'b2',criado_em:'2026-10-30T15:15:00Z',tipo:'fotos',estado:'ok',arquivos:3,registros:3,informacao:null}],
  photosBacked:3,backupConfigured:true,convites:[{id:"demo-convite-1",familia:"Família Silva",nome_principal:"Maria",pessoas:[{id:"1",nome:"Maria Silva",tipo:"adulto"},{id:"2",nome:"João Silva",tipo:"adulto"},{id:"3",nome:"Laura Silva",tipo:"crianca"}],ativo:true,resposta:{resposta:"sim",adultos:2,criancas:1},criado_em:"2026-10-30T10:00:00-03:00"}],
  settings:{telefone:'5511999999999',pixChave:'',pixTitular:'',pixCidade:''},
  album:[{id:'h',nome:'Camila Rocha',mensagem:'Que o amor de vocês floresça todos os dias! 💗',foto_path:null,foto_url:null,aprovado:false,criado_em:'2026-10-30T18:00:00-03:00'},
    {id:'i',nome:'Pedro Souza',mensagem:'Ansioso para comemorar com vocês!',foto_path:null,foto_url:null,aprovado:false,criado_em:'2026-10-30T12:00:00-03:00'},
    {id:'j',nome:'Luiza Lima',mensagem:'Que este seja só o início de uma linda história.',foto_path:null,foto_url:null,aprovado:true,criado_em:'2026-10-29T13:00:00-03:00'}]
 };
 function setInfo(message,bad=false){const el=$('#dashboard-status'); if(el){el.textContent=message;el.style.color=bad?'#a32248':'#7a5369';}}
 function loginStatus(msg){if($('#login-status'))$('#login-status').textContent=msg;}
 async function loadAPI(){
  if(!sdk){const conf=window.WEDDING_CONFIG||{}; if(!conf.supabaseUrl||!conf.supabaseAnonKey)throw new Error('Configure o Supabase no config.js antes de entrar.');
   const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');sdk=mod.createClient(conf.supabaseUrl,conf.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});}
  return sdk;
 }
 async function callAdmin(method='GET',body){
  const client=await loadAPI(), {data:sessionResult}=await client.auth.getSession();
  const token=sessionResult.session?.access_token;
  if(!token)throw new Error('Sessão expirada. Faça login novamente.');
  const res=await fetch('/.netlify/functions/admin-panel',{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const json=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(json.error||`Erro ${res.status}`);
  return json;
 }
 function view(){if($('#login'))$('#login').hidden=true;if($('#dashboard'))$('#dashboard').hidden=false;if($('#logout'))$('#logout').hidden=false;}
 function signedURL(raw){try{const url=new URL(raw);return url.protocol==='https:'&&url.hostname.endsWith('.supabase.co')?url.href:null;}catch{return null;}}
 function showSettings(){
  $('#settings-phone').value=settings.telefone||'';
  $('#settings-pix-key').value=settings.pixChave||'';
  $('#settings-pix-holder').value=settings.pixTitular||'';
  $('#settings-pix-city').value=settings.pixCidade||'';
 }
 function settingsFeedback(msg,isError=false){const el=$('#settings-status');el.textContent=msg;el.style.color=isError?'#ae284b':'#287247';}
 function normalizePix(s,max){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 .-]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
 async function saveSettings(event){
  event.preventDefault();const btn=$('#settings-save');
  const phone=$('#settings-phone').value.replace(/\D/g,'');
  const key=$('#settings-pix-key').value.trim().toLowerCase();
  const holder=normalizePix($('#settings-pix-holder').value,100);
  const city=normalizePix($('#settings-pix-city').value,100);
  if(phone && !/^55\d{10,11}$/.test(phone)){settingsFeedback('Informe um WhatsApp brasileiro com DDI 55 + DDD + celular.',true);return;}
  if(key && !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(key)){
   settingsFeedback('A chave aleatória deve ter o formato UUID válido.',true);return;
  }
  if(key && (holder.length<2||holder.length>25||city.length<2||city.length>15)){
   settingsFeedback('Para ativar o Pix, informe nome do titular (2–25) e cidade (2–15).',true);return;
  }
  const candidate={telefone:phone,pixChave:key,pixTitular:key?holder:'',pixCidade:key?city:''};
  btn.disabled=true;settingsFeedback('Salvando...');
  try{
   if(demo){settings=candidate;settingsFeedback('Prévia atualizada. Nada foi salvo ou enviado.');}
   else {const result=await callAdmin('POST',{action:'salvar_configuracoes',settings:candidate});settings=result.settings;settingsFeedback('Configurações salvas! O Pix já poderá aparecer no site após recarregar.');}
   showSettings();
  }catch(error){settingsFeedback(error.message||'Erro ao salvar.',true);}finally{btn.disabled=false;}
 }
 function draw(){
  const attendees=data.rsvp.filter(x=>x.resposta==='sim').reduce((n,r)=>n+Number(r.adultos||0)+Number(r.criancas||0),0);
  const paid=data.gifts.filter(x=>x.status==='aprovado').reduce((n,r)=>n+Number(r.valor||0),0);
  const pending=data.album.filter(x=>!x.aprovado).length;
  $('#stat-guests').textContent=String(attendees);$('#stat-rsvp').textContent=String(data.rsvp.length);
  $('#stat-gifts').textContent=brl(paid);$('#stat-pending').textContent=String(pending);
  $('#dashboard-updated').textContent=(demo?'Dados fictícios • ':'')+'Atualizado em '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date());
  drawRSVP();drawGifts();drawAlbum();drawSecurity();drawInvites();
 }
 let inviteGenerated=null,inviteInfo=null,cardReady=false;
 function invitationUrl(token){return new URL('convite-interativo.html?convite='+encodeURIComponent(token),location.href).href;}
 function recipient(info){const main=String(info?.nomePrincipal||info?.nome_principal||'').trim();return main?main+(/\be fam[ií]lia$/i.test(main)?'':' e família'):(info?.familia||'Convidados especiais');}
 function inviteMsg(url){return `Olá! 💗 Daisy e Vinícius convidam você para o nosso casamento, no dia 23/05/2027 na Mansão Victória (Rua Orfanato, 440, Vila Prudente). Entrada dos convidados às 10h e cerimônia às 11h. Este é o seu convite personalizado. Confirme por aqui: ${url}`;}
 async function inviteCall(method='GET',body){
   const client=await loadAPI();const session=(await client.auth.getSession()).data.session;
   if(!session)throw new Error('Faça login novamente.');
   const res=await fetch('/.netlify/functions/admin-invitations',{method,headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const bodyResult=await res.json().catch(()=>({}));if(!res.ok)throw new Error(bodyResult.error||'Falha ao consultar convites');return bodyResult;
 }
 async function loadInvites(){
   if(demo)return;
   const result=await inviteCall();data.convites=result.convites||[];
 }
 function drawInvites(){
   const tbody=$('#admin-invites-tbody');if(!tbody)return;
   tbody.replaceChildren();
   for(const inv of data.convites||[]){
     const row=document.createElement('tr');
     const cell=(value)=>{const td=document.createElement('td');td.textContent=String(value);row.append(td);return td;};
     cell(`${recipient(inv)} (${inv.familia})`);cell(inv.pessoas.map(p=>p.nome+(p.tipo==='crianca'?' (criança)':'')).join(', '));
     cell(inv.resposta?inv.resposta.resposta==='sim'?`${inv.resposta.adultos} adulto(s), ${inv.resposta.criancas} criança(s)`:'Não comparecerá':'Aguardando');
     cell(inv.ativo?'Ativo':'Cancelado');
     const td=document.createElement('td'),buttons=document.createElement('div');buttons.className='invite-action-buttons';
     for(const [action,label] of [['rotate','Novo link'],[inv.ativo?'deactivate':'activate',inv.ativo?'Cancelar':'Reativar']]){
       const btn=document.createElement('button');btn.type='button';btn.textContent=label;
       btn.addEventListener('click',()=>changeInvite(inv,action));buttons.append(btn);
     }td.append(buttons);row.append(td);tbody.append(row);
   }
   if(!tbody.childNodes.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='Nenhum convite cadastrado.';tr.append(td);tbody.append(tr);}
 }
 async function showGeneratedInvitation(token,info={}){
   const url=demo?new URL('convite-interativo.html?demo=1&nome='+encodeURIComponent(info.nomePrincipal||info.nome_principal||'Daniel'),location.href).href:invitationUrl(token);inviteGenerated=url;
   const people=info.pessoas||[], adults=Number(info.adultos??people.filter(p=>p.tipo==='adulto').length)||0;
   const kids=Number(info.criancas??people.filter(p=>p.tipo==='crianca').length)||0;
   inviteInfo={familia:info.familia||'Família convidada',nomePrincipal:info.nomePrincipal||info.nome_principal||'',destinatario:recipient(info),adultos:adults,criancas:kids};
   const panel=$('#admin-invite-share');panel.hidden=false;$('#admin-invite-link').value=url;
   $('#admin-invite-card-status').textContent='Gerando a arte do convite...';
   cardReady=false;$('#admin-invite-download').disabled=true;$('#admin-invite-share-image').disabled=true;
   try{
     const svg=window.WeddingQR?.render($('#admin-invite-qr'),url,'QR Code para abrir o convite personalizado');
     if(!svg||!window.WeddingInviteCard)throw new Error('Gerador de convite indisponível.');
     await window.WeddingInviteCard.render($('#admin-invite-card'),svg,inviteInfo);
     cardReady=true;$('#admin-invite-download').disabled=false;$('#admin-invite-share-image').disabled=false;
     $('#admin-invite-card-status').textContent='Arte pronta! Baixe em PNG ou compartilhe com a família.';
   }catch(error){
     $('#admin-invite-card-status').textContent='Não foi possível gerar a imagem: '+error.message+'. O link abaixo está disponível.';
   }
   $('#admin-invite-whatsapp').href='https://wa.me/?text='+encodeURIComponent(`Olá, ${inviteInfo.destinatario}! 💗 ${inviteMsg(url)}`);
   panel.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 function inviteDemoBase(token){return demo?new URL('convite-interativo.html?demo=1&nome='+encodeURIComponent(inviteInfo?.nomePrincipal||'Daniel'),location.href).href:invitationUrl(token);}
 function parseGuests(value){
   const lines=String(value||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
   if(!lines.length||lines.length>12)throw new Error('Informe de 1 a 12 convidados.');
   const people=lines.map(s=>{
     const parts=s.split(';').map(v=>v.trim());if(parts.length!==2)throw new Error('Use o formato Nome Sobrenome; adulto ou criança.');
     const tipo=parts[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
     if(!['adulto','crianca'].includes(tipo)||!parts[0].includes(' ')||parts[0].length<3||parts[0].length>70)throw new Error('Verifique os nomes e os tipos.');
     return {nome:parts[0],tipo};
   });
   const adults=people.filter(p=>p.tipo==='adulto').length;
   if(adults<1||adults>6||people.length-adults>6)throw new Error('Informe de 1 a 6 adultos e até 6 crianças.');
   if(new Set(people.map(p=>p.nome.toLowerCase())).size!==people.length)throw new Error('Há nomes duplicados.');
   return people;
 }
 async function createInvite(e){
   e.preventDefault();const status=$('#admin-invite-status'),button=$('#admin-invite-create');button.disabled=true;
   try{
     const familia=$('#admin-invite-family').value.trim(),nomePrincipal=$('#admin-invite-main-name').value.trim(),pessoas=parseGuests($('#admin-invite-names').value);
     if(familia.length<3||familia.length>100||nomePrincipal.length<2||nomePrincipal.length>70)throw new Error('Informe o grupo e o nome principal.');
     if(demo){data.convites.unshift({id:'demo-'+Date.now(),familia,nome_principal:nomePrincipal,pessoas,ativo:true,resposta:null});await showGeneratedInvitation('demonstracao',{familia,nomePrincipal,pessoas});}
     else{const result=await inviteCall('POST',{action:'create',familia,nomePrincipal,pessoas});await showGeneratedInvitation(result.token,{familia,nomePrincipal,pessoas});await loadInvites();}
     drawInvites();status.textContent='Convite gerado! Compartilhe o link ou QR Code.';status.style.color='#287247';$('#admin-invite-form').reset();
   }catch(error){status.textContent=error.message;status.style.color='#a32248';}
   finally{button.disabled=false;}
 }
 async function changeInvite(inv,action){
   if(!confirm(action==='rotate'?'Gerar novo link? O endereço anterior deixará de funcionar.':action==='deactivate'?'Cancelar este convite e impedir novas confirmações?':'Reativar este convite?'))return;
   try{
     if(demo){if(action==='deactivate')inv.ativo=false;if(action==='activate')inv.ativo=true;if(action==='rotate')await showGeneratedInvitation('demonstracao',inv);}
     else{const result=await inviteCall('POST',{action,id:inv.id});if(result.token)await showGeneratedInvitation(result.token,inv);await loadInvites();}
     drawInvites();setInfo('Convite atualizado.');
   }catch(e){setInfo(e.message,true);}
 }
 function printInvitation(){
   if(!inviteGenerated)return;
   const node=document.createElement('section');node.className='print-invite-only';node.hidden=false;
   const h=document.createElement('h1');h.textContent='Daisy e Vinícius';
   const p=document.createElement('p');p.textContent=`Convite para ${inviteInfo?.destinatario||'convidados especiais'} • 23 de maio de 2027 • 10h / 11h`; 
   const card=$('#admin-invite-card');const img=document.createElement('img');if(cardReady){img.src=card.toDataURL('image/png');img.style.width='100%';img.style.maxWidth='500px';node.append(img);}else{const qr=$('#admin-invite-qr svg')?.cloneNode(true);node.append(h,p);if(qr)node.append(qr);}
   const caption=document.createElement('p');caption.textContent='Acesse seu convite e confirme presença';node.append(caption);
   document.body.append(node);window.print();node.remove();
 }

 let newBulkLinks=[];
 function parseFamilyCSV(text){
  const src=String(text).replace(/^\uFEFF/,'').replace(/^sep=[;,]\r?\n/i,'');
  if(src.length>100000)throw new Error('CSV muito grande (máximo 100 KB).');
  const first=src.split(/\r?\n/,1)[0];
  const separator=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length?';':',';
  const rows=[],row=[];let value='',quote=false;
  for(let i=0;i<src.length;i++){
   const ch=src[i];
   if(quote){if(ch==='"'&&src[i+1]==='"'){value+='"';i++;}else if(ch==='"')quote=false;else value+=ch;}
   else if(ch==='"')quote=true;
   else if(ch===separator){row.push(value.trim());value='';}
   else if(ch==='\n'||ch==='\r'){
    if(ch==='\r'&&src[i+1]==='\n')i++;
    row.push(value.trim());value='';if(row.some(Boolean))rows.push([...row]);row.length=0;
   }else value+=ch;
  }
  if(quote)throw new Error('O arquivo CSV tem aspas não fechadas.');
  row.push(value.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length<2)throw new Error('A planilha não possui famílias para importar.');
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const hdr=rows.shift().map(normalize);
  const find=options=>hdr.findIndex(v=>options.includes(v));
  const fi=find(['familiaougrupo','familia','grupo']),mi=find(['nomeprincipal','nomedoconvidado','responsavel']),ai=find(['adultosautorizados','adultos','qtdadultos']),ci=find(['criancasautorizadas','criancas','qtdcriancas']);
  if([fi,mi,ai,ci].some(n=>n<0))throw new Error('Cabeçalhos esperados: Família ou grupo; Nome principal; Adultos autorizados; Crianças autorizadas.');
  const output=[],names=new Set();
  for(const [i,row] of rows.entries()){
   const familia=String(row[fi]||'').trim(),nomePrincipal=String(row[mi]||'').trim(),a=String(row[ai]||'').trim(),c=String(row[ci]||'').trim()||'0';
   if(!familia&&!nomePrincipal&&!a&&!c)continue;
   const adultos=Number(a),criancas=Number(c);
   if(familia.length<3||familia.length>100||nomePrincipal.length<2||nomePrincipal.length>70||!/^[1-6]$/.test(a)||!/^[0-6]$/.test(c)||!Number.isInteger(adultos)||!Number.isInteger(criancas))
     throw new Error(`Linha ${i+2}: nome da família e nome principal, 1 a 6 adultos e 0 a 6 crianças obrigatórios.`);
   const key=normalize(familia);if(names.has(key))throw new Error(`Família repetida na planilha: ${familia}`);names.add(key);
   output.push({familia,nomePrincipal,adultos,criancas});
  }
  if(!output.length||output.length>200)throw new Error('Preencha entre 1 e 200 famílias.');
  return output;
 }
 function downloadBulkLinks(){
  if(!newBulkLinks.length)return;
  const h=['Família ou grupo','Nome principal','Adultos autorizados','Crianças autorizadas','Link exclusivo'];
  const rows=[h,...newBulkLinks.map(x=>[x.familia,x.nomePrincipal,x.adultos,x.criancas,(demo?new URL('convite-interativo.html?demo=1&nome='+encodeURIComponent(x.nomePrincipal),location.href).href:invitationUrl(x.token))])];
  const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=u;a.download='daisy-e-vinicius-links-convites-privados.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500);
 }
 function drawBulkLinks(){
  const target=$('#admin-import-links');if(!target)return;target.replaceChildren();
  $('#admin-import-results').hidden=!newBulkLinks.length;$('#admin-import-count').textContent=String(newBulkLinks.length);
  for(const inv of newBulkLinks){
   const line=document.createElement('div');line.className='bulk-invite-link-item';
   const name=document.createElement('strong');name.textContent=`${inv.familia} (${inv.adultos+inv.criancas} pessoas)`;
   const go=document.createElement('button');go.className='soft-btn';go.textContent='Ver convite / QR';go.addEventListener('click',()=>showGeneratedInvitation(inv.token,inv));
   const dl=document.createElement('button');dl.className='soft-btn';dl.textContent='Baixar imagem';dl.addEventListener('click',async()=>{await showGeneratedInvitation(inv.token,inv);if(cardReady)window.WeddingInviteCard.download($('#admin-invite-card'),recipient(inv)).catch(e=>setInfo(e.message,true));});
   line.append(name,go,dl);target.append(line);
  }
 }
 async function startBulkImport(){
  const status=$('#admin-import-status'),button=$('#admin-import-start'),file=$('#admin-import-file')?.files?.[0];
  if(!file){status.textContent='Selecione a planilha CSV para importar.';return;}
  if(newBulkLinks.length&&!confirm('Há links importados ainda na tela. Já baixou o CSV? Continuar substitui a lista.'))return;
  button.disabled=true;newBulkLinks=[];drawBulkLinks();
  try{
   const rows=parseFamilyCSV(await file.text());
   const repeat=[],failures=[];
   for(let k=0;k<rows.length;k+=15){
    const batch=rows.slice(k,k+15);status.textContent=`Criando convites... ${Math.min(k+15,rows.length)}/${rows.length}`;
    if(demo){
     for(const x of batch){const token='demonstracao';newBulkLinks.push({...x,token});data.convites.unshift({id:'demo-'+Math.random().toString(36).slice(2),familia:x.familia,nome_principal:x.nomePrincipal,ativo:true,pessoas:[...Array(x.adultos)].map((_,i)=>({nome:`Adulto ${i+1}`,tipo:'adulto'})).concat([...Array(x.criancas)].map((_,i)=>({nome:`Criança ${i+1}`,tipo:'crianca'}))),resposta:null});}
    }else{
     const answer=await inviteCall('POST',{action:'bulk_create',rows:batch});
     newBulkLinks.push(...(answer.created||[]));repeat.push(...(answer.skipped||[]));failures.push(...(answer.failed||[]));
    }
    drawBulkLinks();
   }
   if(!demo)await loadInvites();drawInvites();
   status.textContent=`${newBulkLinks.length} convite(s) criado(s). ${repeat.length} já cadastrado(s), ${failures.length} falha(s). Baixe os links agora.`;
   if(failures.length)status.textContent+=' Com falha: '+failures.slice(0,6).map(x=>x.familia).join(', ');
   if(newBulkLinks.length)downloadBulkLinks();
  }catch(e){status.textContent='Importação interrompida: '+e.message+(newBulkLinks.length?' — baixe os links já criados.':'');drawBulkLinks();}
  finally{button.disabled=false;}
 }
 function drawRSVP(){
  const query=($('#search-rsvp')?.value||'').toLocaleLowerCase('pt-BR');
  const list=data.rsvp.filter(r=>String(r.nome||'').toLocaleLowerCase('pt-BR').includes(query));
  $('#rsvp-tbody').innerHTML=list.map(r=>`<tr><td><strong>${escapeHTML(r.nome)}</strong></td><td><span class="tag ${r.resposta==='sim'?'':'no'}">${r.resposta==='sim'?'Confirmado':'Não vai'}</span></td><td>${Number(r.adultos)||0}</td><td>${Number(r.criancas)||0}</td><td>${escapeHTML(r.acompanhantes)||'—'}</td><td>${escapeHTML(date(r.criado_em))}</td></tr>`).join('')||'<tr><td colspan="6">Nenhuma confirmação encontrada.</td></tr>';
 }
 function giftFilter(){
  let list=data.gifts||[];const period=$('#finance-period')?.value||'all';const status=$('#finance-status')?.value||'all';
  const now=new Date();const firstMonth=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  if(period==='30')list=list.filter(x=>new Date(x.criado_em).getTime()>=Date.now()-30*86400000);
  if(period==='month')list=list.filter(x=>new Date(x.criado_em).getTime()>=firstMonth);
  if(status==='aprovado')list=list.filter(x=>x.status==='aprovado');
  if(status==='pendente')list=list.filter(x=>['pendente','iniciado'].includes(x.status));
  if(status==='estornado')list=list.filter(x=>['estornado','contestado','cancelado'].includes(x.status));
  return list;
 }
 function drawGifts(){
  const list=[...giftFilter()].sort((a,b)=>new Date(b.criado_em)-new Date(a.criado_em)),approved=list.filter(g=>g.status==='aprovado');
  const sum=arr=>arr.reduce((n,v)=>n+Number(v||0),0);
  const gross=sum(approved.map(g=>g.valor));
  const fees=sum(approved.filter(g=>g.taxa_mp!==null&&g.taxa_mp!==undefined).map(g=>g.taxa_mp));
  const net=sum(approved.filter(g=>g.liquido_mp!==null&&g.liquido_mp!==undefined).map(g=>g.liquido_mp));
  $('#fin-gross').textContent=brl(gross);$('#fin-fees').textContent=brl(fees);
  $('#fin-net').textContent=brl(net);$('#fin-pending').textContent=brl(sum(list.filter(g=>['iniciado','pendente'].includes(g.status)).map(g=>g.valor)));
  $('#fin-reversed').textContent=brl(sum(list.filter(g=>['estornado','contestado'].includes(g.status)).map(g=>g.valor)));
  const missing=approved.filter(g=>g.liquido_mp===null||g.liquido_mp===undefined).length;
  $('#fin-net').title=missing?`Líquido indisponível para ${missing} contribuição(ões)`:'Valores líquidos informados pelo Mercado Pago';
  const labels={aprovado:'Aprovado',iniciado:'Iniciado',pendente:'Pendente',cancelado:'Cancelado',contestado:'Contestado',estornado:'Estornado'};
  $('#gifts-tbody').innerHTML=list.map(g=>`<tr><td><strong>${escapeHTML(g.nome||'Não informado')}</strong></td><td>${escapeHTML(g.titulo)}</td><td>${brl(g.valor)}</td><td>${g.taxa_mp===null||g.taxa_mp===undefined?'—':brl(g.taxa_mp)}</td><td>${g.liquido_mp===null||g.liquido_mp===undefined?'—':brl(g.liquido_mp)}</td><td><span class="tag ${g.status==='aprovado'?'': 'pending'}">${escapeHTML(labels[g.status]||g.status)}</span></td><td>${escapeHTML(date(g.aprovado_em||g.criado_em))}</td></tr>`).join('')||'<tr><td colspan="7">Nenhuma contribuição no filtro selecionado.</td></tr>';
  const grouped=new Map();for(const g of approved){const dt=new Date(g.aprovado_em||g.criado_em);if(!Number.isFinite(dt.getTime()))continue;
   const month=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;grouped.set(month,(grouped.get(month)||0)+Number(g.valor||0));}
  const months=[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6),container=$('#finance-chart');container.replaceChildren();
  const max=Math.max(1,...months.map(x=>x[1]));
  for(const [label,total] of months){const bar=document.createElement('div');bar.className='chart-column';
   const value=document.createElement('span');value.className='chart-amount';value.textContent=brl(total);
   const shape=document.createElement('div');shape.className='chart-bar';shape.style.height=`${Math.max(8,total/max*104)}px`;
   const month=document.createElement('small');month.textContent=label.slice(5)+'/'+label.slice(2,4);
   bar.append(value,shape,month);container.append(bar);}
  if(!months.length)container.textContent='Nenhuma contribuição aprovada neste período.';
 }
 function drawSecurity(){
  const logs=data.backups||[],daily=logs.find(b=>b.tipo==='dados'&&b.estado==='ok');
  $('#backup-active').textContent=data.backupConfigured?'Pronto para agendar':'Configuração pendente';
  $('#backup-last-data').textContent=daily?date(daily.criado_em):'Ainda não executado';
  $('#backup-photo-count').textContent=String(data.photosBacked||0);
  $('#backup-data-extra').textContent=daily?`${daily.registros} registros exportados`:'Nenhum backup externo concluído';
  $('#backup-tbody').innerHTML=logs.map(b=>`<tr><td>${escapeHTML(date(b.criado_em))}</td><td>${b.tipo==='dados'?'Dados':'Fotos'}</td><td><span class="tag ${b.estado==='ok'?'':'no'}">${b.estado==='ok'?'Concluído':'Erro'}</span></td><td>${Number(b.registros||0)} / ${Number(b.arquivos||0)}</td><td>${escapeHTML(b.informacao||'—')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum backup registrado.</td></tr>';
  const acts={mural_aprovar:'Foto/recado aprovado',mural_ocultar:'Foto/recado ocultado',mural_excluir:'Foto/recado excluído',configuracoes_alteradas:'Configurações alteradas',pagamento_aprovado:'Pagamento aprovado',pagamento_estornado:'Pagamento estornado',pagamento_contestado:'Pagamento contestado',exportacao_manual:'Exportação manual',convite_criado:'Convite criado',convite_link_renovado:'Link renovado',convite_cancelado:'Convite cancelado',convite_reativado:'Convite reativado',convite_rsvp_atualizado:'Presença pelo convite'};
  $('#audit-tbody').innerHTML=(data.audit||[]).map(a=>`<tr><td>${escapeHTML(date(a.ocorrido_em))}</td><td>${a.ator_tipo==='administrador'?`Admin ${String(a.ator_id||'').slice(0,8)}`:a.ator_tipo==='mercado_pago'?'Mercado Pago':a.ator_tipo==='convidado'?'Convidado':'Sistema'}</td><td>${escapeHTML(acts[a.acao]||a.acao)}</td><td>${escapeHTML(Object.entries(a.detalhes||{}).map(([k,v])=>`${k}: ${v}`).join(' · '))}</td></tr>`).join('')||'<tr><td colspan="4">Nenhuma alteração registrada.</td></tr>';
 }
 function exportFinance(){
  const rows=[['ID','Quem presenteou','Presente','Valor bruto','Taxas informadas','Líquido informado','Status','Método','Aprovado em'],...giftFilter().map(g=>[g.mp_payment_id||g.id,g.nome,g.titulo,g.valor,g.taxa_mp??'',g.liquido_mp??'',g.status,g.meio_pagamento||'',g.aprovado_em||''])];
  saveCSV(rows,'daisy-e-vinicius-relatorio-financeiro.csv');
 }
 function saveCSV(rows,name){
  const content='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function exportPrivate(){
  if(demo){
   const blob=new Blob([JSON.stringify({demonstracao:true,alerta:'Dados fictícios, nenhum backup real',dados:fake},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='demonstracao-daisy-e-vinicius.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return;
  }
  setInfo('Preparando exportação privada...');const client=await loadAPI(),session=(await client.auth.getSession()).data.session;
  if(!session)throw new Error('Faça login novamente.');
  const response=await fetch('/.netlify/functions/admin-export',{headers:{Authorization:`Bearer ${session.access_token}`}});
  if(!response.ok)throw new Error('Falha na exportação privada.');
  const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download='daisy-e-vinicius-dados-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
  setInfo('Exportação concluída. Guarde o arquivo em lugar seguro.');
 }
 function drawAlbum(){
  const filter=$('#filter-album').value;
  const list=data.album.filter(r=>filter==='all'||(filter==='pending'?!r.aprovado:r.aprovado));
  const wrap=$('#album-list');wrap.replaceChildren();
  if(!list.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhuma publicação nesta categoria.';wrap.append(p);return;}
  for(const r of list){
   const card=document.createElement('article');card.className='album-item';
   const image=signedURL(r.foto_url);if(image){const el=document.createElement('img');el.src=image;el.loading='lazy';el.alt='Foto enviada por '+r.nome;card.append(el);}
   const name=document.createElement('strong');name.textContent=r.nome||'Convidado';card.append(name);
   if(r.mensagem){const msg=document.createElement('p');msg.textContent=r.mensagem;card.append(msg);}
   const status=document.createElement('span');status.className='status-line';status.textContent=`${r.aprovado?'Aprovada':'Aguardando aprovação'} • ${date(r.criado_em)}`;card.append(status);
   const btns=document.createElement('div');btns.className='card-actions';
   const actions=r.aprovado?[['ocultar','Ocultar','']]:[['aprovar','Aprovar','approve']];
   actions.push(['excluir','Excluir','danger']);
   for(const [action,label,style] of actions){const b=document.createElement('button');b.type='button';b.className=style;b.textContent=label;b.addEventListener('click',()=>moderate(action,r.id));btns.append(b);}card.append(btns);wrap.append(card);
  }
 }
 async function moderate(action,id){
  if(action==='excluir'&&!confirm('Excluir definitivamente esta publicação e sua foto?'))return;
  setInfo('Atualizando publicação...');
  try{
   if(demo){data.album=data.album.filter(x=>x.id!==id||action!=='excluir');const row=data.album.find(x=>x.id===id);if(row)row.aprovado=action==='aprovar';}
   else {await callAdmin('POST',{id,action});await refresh();}
   draw();setInfo('Publicação atualizada.');
  }catch(e){setInfo(e.message,true);}
 }
 async function refresh(){
  if(demo){data=structuredClone(fake);settings=structuredClone(fake.settings);draw();showSettings();return;}
  setInfo('Carregando informações privadas...');
  const response=await callAdmin();data={rsvp:response.rsvp||[],gifts:response.gifts||[],album:response.album||[],audit:response.audit||[],backups:response.backups||[],photosBacked:response.photosBacked||0,backupConfigured:!!response.backupConfigured,convites:data.convites||[]};settings=response.settings||settings;await loadInvites();draw();showSettings();setInfo('Dados atualizados.');
 }
 function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
 function downloadCSV(){
  const rows=[['Tipo','Nome','Status','Adultos','Crianças','Acompanhantes/Presente','Valor','Data'],
   ...data.rsvp.map(r=>['RSVP',r.nome,r.resposta,r.adultos,r.criancas,r.acompanhantes,'',r.criado_em]),
   ...data.gifts.map(r=>['Cartão',r.nome,r.status,'','',r.titulo,Number(r.valor||0).toFixed(2),r.criado_em])];
  const content='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='daisy-e-vinicius-convidados-contribuicoes.csv';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
 }
 $$('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{
  $$('[data-tab]').forEach(b=>{const active=b===btn;b.classList.toggle('selected',active);b.setAttribute('aria-selected',String(active));});
  $$('.admin-pane').forEach(p=>p.hidden=p.id!=='pane-'+btn.dataset.tab);
 }));
 $('#admin-invite-form')?.addEventListener('submit',createInvite);
 $('#admin-import-start')?.addEventListener('click',startBulkImport);
 $('#admin-import-download')?.addEventListener('click',downloadBulkLinks);
 $('#admin-invite-copy')?.addEventListener('click',async()=>{if(!inviteGenerated)return;try{await navigator.clipboard.writeText(inviteGenerated);setInfo('Link do convite copiado.');}catch{$('#admin-invite-link').select();setInfo('Selecione o link para copiar.');}});
 $('#admin-invite-print')?.addEventListener('click',printInvitation);
 $('#admin-invite-download')?.addEventListener('click',()=>{if(cardReady)window.WeddingInviteCard.download($('#admin-invite-card'),inviteInfo?.destinatario).catch(e=>setInfo(e.message,true));});
 $('#admin-invite-share-image')?.addEventListener('click',async()=>{if(!cardReady)return;try{const ok=await window.WeddingInviteCard.share($('#admin-invite-card'),inviteInfo?.destinatario,inviteGenerated);if(!ok){await window.WeddingInviteCard.download($('#admin-invite-card'),inviteInfo?.destinatario);setInfo('Seu navegador não compartilha arquivos: imagem baixada. Anexe-a no WhatsApp.');}}catch(e){if(e.name!=='AbortError')setInfo(e.message,true);}});

 $('#search-rsvp')?.addEventListener('input',drawRSVP);$('#filter-album')?.addEventListener('change',drawAlbum);
 $('#refresh')?.addEventListener('click',()=>refresh().catch(e=>setInfo(e.message,true)));
 $('#export')?.addEventListener('click',downloadCSV);
 $('#settings-form')?.addEventListener('submit',saveSettings);
 $('#finance-period')?.addEventListener('change',drawGifts);$('#finance-status')?.addEventListener('change',drawGifts);
 $('#finance-export')?.addEventListener('click',exportFinance);
 $('#backup-manual')?.addEventListener('click',()=>exportPrivate().catch(e=>setInfo(e.message,true)));
 $('#logout')?.addEventListener('click',async()=>{await sdk?.auth.signOut();location.reload();});
 if(demo){view();refresh();return;}
 $('#login-form')?.addEventListener('submit',async event=>{
  event.preventDefault();loginStatus('Verificando credenciais...');
  const button=$('#login-form button');button.disabled=true;
  try{
   const client=await loadAPI();const {error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
   if(error)throw error;await refresh();view();loginStatus('');
  }catch(e){loginStatus(/Acesso não autorizado/.test(e.message)?'Esta conta não está autorizada no painel.':(e.message||'Não foi possível entrar.'));}
  finally{button.disabled=false;}
 });
 loadAPI().then(client=>client.auth.getSession()).then(({data:session})=>{
  if(session.session)return refresh().then(view).catch(e=>{loginStatus(e.message);clientCleanup();});
 }).catch(()=>{});
 async function clientCleanup(){await sdk?.auth.signOut();}
})();
