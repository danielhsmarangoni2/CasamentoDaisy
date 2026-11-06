import {db,json} from './_shared.mjs';
import {signedPhotos,deletePhoto,isUUID} from './_album.mjs';
import {allRows} from './_backup.mjs';

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
   const c=settingsRows?.[0]||{};
   const settings={telefone:c.telefone_notificacoes||'',pixChave:c.pix_chave||'',pixTitular:c.pix_titular||'',pixCidade:c.pix_cidade||''};
   return json({user:{email:user.email},rsvp,gifts,album:await signedPhotos(album||[]),settings,audit: audit||[],backups: backupRows||[],photosBacked:photoCopies?.length||0,backupConfigured:!!(process.env.R2_ACCOUNT_ID&&process.env.R2_ACCESS_KEY_ID&&process.env.R2_SECRET_ACCESS_KEY&&process.env.R2_BUCKET&&process.env.BACKUP_ENCRYPTION_KEY)});
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
     return json({error:'Confira telefone, chave Pix aleatória, titular e cidade.'},400);
   const body={id:1,telefone_notificacoes:telefone,pix_chave:chave,pix_titular:chave?titular:'',pix_cidade:chave?cidade:'',atualizado_em:new Date().toISOString()};
   await db('rpc/admin_salvar_configuracoes_v3',{method:'POST',body:{p_admin:user.id,p_telefone:telefone,p_chave:chave,p_titular:body.pix_titular,p_cidade:body.pix_cidade},prefer:'return=minimal'});
   return json({ok:true,settings:{telefone,pixChave:chave,pixTitular:body.pix_titular,pixCidade:body.pix_cidade}});
  }
  if(!isUUID(p.id)||!['aprovar','ocultar','excluir'].includes(p.action))return json({error:'Ação inválida.'},400);
  const path=await db('rpc/admin_moderar_mural_v3',{method:'POST',body:{p_admin:user.id,p_id:p.id,p_acao:p.action}});
  if(p.action==='excluir' && path)await deletePhoto(path);
  return json({ok:true});
 }catch(e){console.error('Admin dashboard',e);return json({error:'Falha na operação. Confira a configuração.'},500);}
};
