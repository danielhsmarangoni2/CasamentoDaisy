import {createHash} from 'node:crypto';
import {db,json,limitarTentativa} from './_shared.mjs';
export const validInviteToken=t=>typeof t==='string'&&(/^[A-Za-z0-9_-]{32}$/.test(t)||/^[abcdefghjkmnpqrstuvwxyz23456789]{12}$/.test(t)); // 12 caracteres novos; links antigos de 32 continuam válidos
export const inviteHash=t=>createHash('sha256').update(t).digest('hex');
export default async request=>{
 if(request.method!=='GET')return json({error:'Método não permitido'},405);
 const token=new URL(request.url).searchParams.get('token');
 if(!validInviteToken(token))return json({error:'Convite inválido ou não informado.'},404);
 if(!await limitarTentativa('convite',request,120,600))return json({error:'Muitas consultas em pouco tempo. Aguarde alguns minutos.'},429);
 try{
  const inv=await db(`convites_casamento?token_hash=eq.${inviteHash(token)}&ativo=eq.true&select=id,familia,nome_principal,pessoas,max_adultos,max_criancas&limit=1`);
  if(!inv?.length)return json({error:'Convite inválido ou cancelado.'},404);
  const i=inv[0];
  db('aberturas_convite_casamento',{method:'POST',body:{convite_id:i.id},prefer:'return=minimal'}).catch(e=>console.warn('Abertura não registrada',e.message));
  const r=await db(`confirmacoes_casamento?convite_id=eq.${i.id}&select=resposta,adultos,criancas,ids_selecionados,contato&limit=1`);
  const rsvp=r?.[0]||null;
  // Resposta não contém telefone de outros convidados, apenas do próprio grupo do link.
  return json({familia:i.familia,nomePrincipal:i.nome_principal,pessoas:i.pessoas,maxAdultos:i.max_adultos,maxCriancas:i.max_criancas,rsvp});
 }catch(e){console.error('Convite',e.message);return json({error:'Não foi possível consultar o convite.'},503);}
};
