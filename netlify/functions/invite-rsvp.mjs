import {db,json,alertWhatsApp,captchaValid} from './_shared.mjs';
import {validInviteToken,inviteHash} from './invite.mjs';
export default async request=>{
 if(request.method!=='POST')return json({error:'Método não permitido'},405);
 try{
  const p=await request.json();
  if(!validInviteToken(p.token))return json({error:'Abra o link individual do seu convite.'},403);
  if(p.website||!await captchaValid(p.captchaToken,request))return json({error:'Verificação inválida.'},400);
  if(!['sim','nao'].includes(p.resposta)||!Array.isArray(p.ids)||p.ids.length>12||
      !p.ids.every(x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)))
   return json({error:'Confira as pessoas selecionadas.'},400);
  const contato=String(p.contato||'').trim();
  if(contato && !/^[0-9()+\s-]{8,20}$/.test(contato))return json({error:'Contato inválido.'},400);
  let result;
  try{result=await db('rpc/registrar_rsvp_convite_v4',{method:'POST',body:{p_hash:inviteHash(p.token),p_resposta:p.resposta,p_ids:p.ids,p_contato:contato||null}});}
  catch(e){return json({error:'Convite inválido, cancelado ou excedendo o limite de pessoas.'},400);}
  if(!result?.ok)return json({error:'Não foi possível registrar.'},500);
  let avisoEnviado=false;
  if(result.alterado){
   const resumo=`${result.nome} | ${result.resposta==='sim'?'CONFIRMOU':'NÃO VAI'} | ${result.adultos} adulto(s), ${result.criancas} criança(s) | ${result.acompanhantes||'sem acompanhantes'}`;
   try{await alertWhatsApp('RSVP convite',resumo);avisoEnviado=true;}catch(e){console.warn('RSVP salvo sem WhatsApp',e.message);}
   await db(`confirmacoes_casamento?id=eq.${result.id}`,{method:'PATCH',body:{aviso_whatsapp_em:avisoEnviado?new Date().toISOString():null,aviso_whatsapp_erro:!avisoEnviado},prefer:'return=minimal'}).catch(()=>{});
  }
  return json({ok:true,salvo:true,alterado:result.alterado,avisoEnviado});
 }catch(e){console.error('RSVP convite',e.message);return json({error:'Não foi possível salvar a confirmação.'},500);}
};
