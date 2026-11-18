import {db,json,cifrarSegredo,decifrarSegredo,chaveSegredosConfigurada} from './_shared.mjs';
import {signedPhotos,deletePhoto,isUUID} from './_album.mjs';
import {allRows} from './_backup.mjs';

async function auditar(user,acao,detalhes){
 try{ await db('auditoria_casamento',{method:'POST',body:{ator_tipo:'administrador',ator_id:user.id,acao,entidade:acao.startsWith('presente')?'presentes':'pagamento',detalhes},prefer:'return=minimal'}); }
 catch(e){ console.error('Auditoria',e.message); }
}
async function statusPagamento(){
 let r={};
 try{ r=(await db('segredos_pagamento_casamento?id=eq.1&select=mp_access_token_cifrado,mp_webhook_secret_cifrado,atualizado_em&limit=1'))?.[0]||{}; }catch(e){ console.error('Status pagamento',e.message); }
 let tokenFinal='';
 if(r.mp_access_token_cifrado){ try{ tokenFinal=decifrarSegredo(r.mp_access_token_cifrado).slice(-4); }catch{ tokenFinal='?'; } }
 const origem=r.mp_access_token_cifrado?'painel':(process.env.MP_ACCESS_TOKEN?'netlify':'nenhuma');
 return {origem,tokenConfigurado:origem!=='nenhuma',tokenFinal,webhookConfigurado:!!(r.mp_webhook_secret_cifrado||process.env.MP_WEBHOOK_SECRET),chaveCriptografiaConfigurada:chaveSegredosConfigurada(),atualizadoEm:r.atualizado_em||null};
}
export async function adminUser(request){
 const match=(request.headers.get('authorization')||'').match(/^Bearer (\S+)$/i);
 if(!match)return null;
 const base=process.env.SUPABASE_URL?.replace(/\/$/,'');
 const apiKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!apiKey)return null;
 const res=await fetch(`${base}/auth/v1/user`,{headers:{apikey:apiKey,Authorization:`Bearer ${match[1]}`},signal:AbortSignal.timeout(8000)});
 if(!res.ok)return null;
 const user=await res.json();
 if(!isUUID(user.id)||!user.email_confirmed_at)return null;
 const allowed=await db(`administradores_casamento?id=eq.${user.id}&select=id&limit=1`);
 return allowed?.length?user:null;
}
export default async request=>{
 if(!['GET','POST'].includes(request.method))return json({error:'Método não permitido'},405);
 try {
  const user=await adminUser(request);
  if(!user)return json({error:'Acesso não autorizado.'},403);
  if(request.method==='GET'){
   const [rsvp,gifts,album,settingsRows,audit,backupRows,photoCopies]=await Promise.all([
    db('confirmacoes_casamento?select=id,nome,resposta,adultos,criancas,acompanhantes,contato,criado_em&order=criado_em.desc&limit=1000'),
    allRows('contribuicoes_casamento','id,nome,valor,titulo,status,mp_payment_id,taxa_mp,liquido_mp,meio_pagamento,detalhe_mp,aprovado_em,sincronizado_em,criado_em'),
    db('mural_de_recados?select=id,nome,mensagem,foto_path,aprovado,criado_em&order=criado_em.desc&limit=200'),
    db('configuracoes_casamento?id=eq.1&select=telefone_notificacoes,pix_chave,pix_titular,pix_cidade&limit=1'),
    db('auditoria_casamento?select=id,ocorrido_em,ator_tipo,ator_id,acao,entidade,detalhes&order=ocorrido_em.desc&limit=200'),
    db('backups_casamento?select=id,criado_em,tipo,estado,arquivos,registros,informacao&order=criado_em.desc&limit=40'),
    db('backups_fotos_casamento?select=foto_path&limit=4000')
   ]);
   let manuais=[];
   try{ manuais=await db('presentes_manuais_casamento?select=id,nome,valor,data_recebimento,observacao,criado_em&order=data_recebimento.desc&limit=1000')||[]; }
   catch(e){ console.error('Presentes manuais',e.message); }
   const manuaisComoPresentes=manuais.map(m=>({id:m.id,nome:m.nome,valor:Number(m.valor),titulo:m.observacao?`Pix direto: ${m.observacao}`:'Pix direto (registro manual)',status:'aprovado',mp_payment_id:null,taxa_mp:0,liquido_mp:Number(m.valor),meio_pagamento:'pix_manual',detalhe_mp:null,aprovado_em:`${m.data_recebimento}T12:00:00-03:00`,criado_em:`${m.data_recebimento}T12:00:00-03:00`,manual:true}));
   const c=settingsRows?.[0]||{};
   const settings={telefone:c.telefone_notificacoes||'',pixChave:c.pix_chave||'',pixTitular:c.pix_titular||'',pixCidade:c.pix_cidade||''};
   return json({user:{email:user.email},rsvp,gifts:[...gifts,...manuaisComoPresentes],album:await signedPhotos(album||[]),settings,pagamento:await statusPagamento(),audit: audit||[],backups: backupRows||[],photosBacked:photoCopies?.length||0,backupConfigured:!!(process.env.R2_ACCOUNT_ID&&process.env.R2_ACCESS_KEY_ID&&process.env.R2_SECRET_ACCESS_KEY&&process.env.R2_BUCKET&&process.env.BACKUP_ENCRYPTION_KEY)});
  }
  const p=await request.json();
  if(p.action==='salvar_configuracoes'){
   const s=p.settings;
   if(!s || typeof s!=='object'||Array.isArray(s))return json({error:'Configuração inválida.'},400);
   const telefone=String(s.telefone||'').replace(/\D/g,'');
   const chave=String(s.pixChave||'').trim().toLowerCase();
   const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 .-]/g,' ').replace(/\s+/g,' ').trim();
   const titular=normalize(s.pixTitular),cidade=normalize(s.pixCidade);
   if((telefone&&!/^55\d{10,11}$/.test(telefone)) ||
      (chave&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(chave)) ||
      (chave&&(titular.length<2||titular.length>25||cidade.length<2||cidade.length>15)))
     return json({error:'Pix não salvo: o nome do titular precisa ter de 2 a 25 caracteres e a cidade de 2 a 15 (sem acentos ou símbolos). Confira também o telefone e a chave.'},400);
   const body={id:1,telefone_notificacoes:telefone,pix_chave:chave,pix_titular:chave?titular:'',pix_cidade:chave?cidade:'',atualizado_em:new Date().toISOString()};
   await db('rpc/admin_salvar_configuracoes_v3',{method:'POST',body:{p_admin:user.id,p_telefone:telefone,p_chave:chave,p_titular:body.pix_titular,p_cidade:body.pix_cidade},prefer:'return=minimal'});
   return json({ok:true,settings:{telefone,pixChave:chave,pixTitular:body.pix_titular,pixCidade:body.pix_cidade}});
  }
  if(p.action==='presente_manual_criar'){
   const nome=String(p.nome||'').trim().replace(/\s+/g,' ');
   const valor=Math.round(Number(p.valor)*100)/100;
   const data=String(p.data||'');
   const obs=String(p.observacao||'').trim();
   if(nome.length<2||nome.length>80)return json({error:'Informe quem presenteou (de 2 a 80 caracteres).'},400);
   if(!Number.isFinite(valor)||valor<5||valor>10000)return json({error:'Valor inválido. Use um valor entre R$ 5,00 e R$ 10.000,00.'},400);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||Number.isNaN(Date.parse(data+'T00:00:00Z')))return json({error:'Informe a data do recebimento.'},400);
   if(obs.length>200)return json({error:'A observação pode ter no máximo 200 caracteres.'},400);
   await db('presentes_manuais_casamento',{method:'POST',body:{nome,valor,data_recebimento:data,observacao:obs||null,criado_por:user.id},prefer:'return=minimal'});
   await auditar(user,'presente_manual_criar',{valor,data});
   return json({ok:true});
  }
  if(p.action==='presente_manual_excluir'){
   if(!isUUID(p.id))return json({error:'Registro inválido.'},400);
   await db(`presentes_manuais_casamento?id=eq.${p.id}`,{method:'DELETE',prefer:'return=minimal'});
   await auditar(user,'presente_manual_excluir',{id:p.id});
   return json({ok:true});
  }
  if(p.action==='remover_credenciais_mp'){
   await db('segredos_pagamento_casamento?id=eq.1',{method:'PATCH',body:{mp_access_token_cifrado:null,mp_webhook_secret_cifrado:null,atualizado_em:new Date().toISOString()},prefer:'return=minimal'});
   await auditar(user,'pagamento_credenciais_remover',{});
   return json({ok:true,pagamento:await statusPagamento()});
  }
  if(p.action==='salvar_credenciais_mp'){
   if(!chaveSegredosConfigurada())return json({error:'Configure SEGREDOS_ENCRYPTION_KEY no Netlify antes de salvar as credenciais.'},503);
   const token=String(p.accessToken||'').trim();
   const webhook=String(p.webhookSecret||'').trim();
   if(!token && !webhook)return json({error:'Informe o Access Token ou a chave secreta do webhook.'},400);
   if(token && !/^(APP_USR|TEST)-[A-Za-z0-9-]{20,200}$/.test(token))return json({error:'Access Token inválido. Copie o valor completo do painel do Mercado Pago (começa com APP_USR- ou TEST-).'},400);
   if(webhook && !/^[\x21-\x7e]{16,200}$/.test(webhook))return json({error:'Chave secreta do webhook inválida (mínimo 16 caracteres, sem espaços).'},400);
   const atual=(await db('segredos_pagamento_casamento?id=eq.1&select=mp_access_token_cifrado,mp_webhook_secret_cifrado&limit=1'))?.[0]||{};
   const body={id:1,
    mp_access_token_cifrado: token?cifrarSegredo(token):(atual.mp_access_token_cifrado||null),
    mp_webhook_secret_cifrado: webhook?cifrarSegredo(webhook):(atual.mp_webhook_secret_cifrado||null),
    atualizado_em:new Date().toISOString()};
   await db('segredos_pagamento_casamento?on_conflict=id',{method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'});
   try{ await db('auditoria_casamento',{method:'POST',body:{ator_tipo:'administrador',ator_id:user.id,acao:'pagamento_credenciais_salvar',entidade:'pagamento',detalhes:{access_token_alterado:!!token,webhook_alterado:!!webhook}},prefer:'return=minimal'}); }
   catch(e){ console.error('Auditoria pagamento',e.message); }
   return json({ok:true,pagamento:await statusPagamento()});
  }
  if(!isUUID(p.id)||!['aprovar','ocultar','excluir'].includes(p.action))return json({error:'Ação inválida.'},400);
  const path=await db('rpc/admin_moderar_mural_v3',{method:'POST',body:{p_admin:user.id,p_id:p.id,p_acao:p.action}});
  if(p.action==='excluir' && path)await deletePhoto(path);
  return json({ok:true});
 }catch(e){console.error('Admin dashboard',e);return json({error:'Falha na operação. Confira a configuração.'},500);}
};
