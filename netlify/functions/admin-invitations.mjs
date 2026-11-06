import {randomBytes,randomUUID} from 'node:crypto';
import {db,json} from './_shared.mjs';
import {adminUser} from './admin-panel.mjs';
import {inviteHash} from './invite.mjs';
const safe=s=>String(s??'').trim();
const uid=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'');
const audit=async(uid,action,id)=>db('auditoria_casamento',{method:'POST',prefer:'return=minimal',body:{ator_tipo:'administrador',ator_id:uid,acao:action,entidade:'convite',detalhes:{convite_id:id}}}).catch(e=>console.warn('Auditoria convites',e.message));
export default async request=>{
 if(!['GET','POST'].includes(request.method))return json({error:'Método não permitido'},405);
 try{
  const user=await adminUser(request);
  if(!user)return json({error:'Sem autorização'},403);
  if(request.method==='GET'){
   const [inv,rsvp]=await Promise.all([
    db('convites_casamento?select=id,familia,nome_principal,pessoas,max_adultos,max_criancas,ativo,criado_em&order=criado_em.desc&limit=1000'),
    db('confirmacoes_casamento?select=convite_id,resposta,adultos,criancas&convite_id=not.is.null&limit=1000')
   ]);
   const replies=new Map((rsvp||[]).map(x=>[x.convite_id,x]));
   return json({convites:(inv||[]).map(i=>({...i,resposta:replies.get(i.id)||null}))});
  }
  const p=await request.json();const action=p.action;
  if(action==='create'){
   const familia=safe(p.familia), nomePrincipal=safe(p.nomePrincipal), names=p.pessoas;
   if(familia.length<3||familia.length>100||nomePrincipal.length<2||nomePrincipal.length>70||!Array.isArray(names)||names.length<1||names.length>12)
    return json({error:'Preencha família, nome principal e até 12 convidados.'},400);
   const people=names.map(x=>({id:randomUUID(),nome:safe(x.nome),tipo:x.tipo}));
   if(people.some(x=>x.nome.length<3||x.nome.length>70||!x.nome.includes(' ')||!['adulto','crianca'].includes(x.tipo)))
    return json({error:'Cada convidado precisa de nome e sobrenome e tipo adulto/criança.'},400);
   if(new Set(people.map(x=>x.nome.toLowerCase())).size!==people.length)return json({error:'Há nomes duplicados.'},400);
   const adults=people.filter(x=>x.tipo==='adulto').length,children=people.length-adults;
   if(adults<1||adults>6||children>6)return json({error:'Limite de 1–6 adultos e até 6 crianças por convite.'},400);
   const token=randomBytes(24).toString('base64url');
   const rows=await db('convites_casamento?select=id',{method:'POST',prefer:'return=representation',body:{familia,nome_principal:nomePrincipal,pessoas:people,max_adultos:adults,max_criancas:children,token_hash:inviteHash(token)}});
   if(!rows?.[0]?.id)throw new Error('Convite não criado');
   await audit(user.id,'convite_criado',rows[0].id);
   return json({ok:true,id:rows[0].id,token});
  }
  if(action==='bulk_create'){
   const rows=p.rows;
   if(!Array.isArray(rows)||rows.length<1||rows.length>15)return json({error:'Envie de 1 a 15 famílias por lote.'},400);
   const prepared=[];
   for(let i=0;i<rows.length;i++){
    const entry=rows[i]||{},familia=safe(entry.familia),nomePrincipal=safe(entry.nomePrincipal);
    const adultos=Number(entry.adultos),criancas=Number(entry.criancas);
    if(familia.length<3||familia.length>100||nomePrincipal.length<2||nomePrincipal.length>70||!Number.isInteger(adultos)||!Number.isInteger(criancas)||adultos<1||adultos>6||criancas<0||criancas>6){
     return json({error:`Linha ${i+1} inválida: família (3 a 100 caracteres), nome principal (2 a 70), adultos (1 a 6), crianças (0 a 6).`},400);
    }
    prepared.push({familia,nomePrincipal,adultos,criancas});
   }
   const existing=await db('convites_casamento?select=familia&limit=3000');
   const normalize=s=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   const used=new Set((existing||[]).map(x=>normalize(x.familia)));
   const created=[],skipped=[],failed=[];
   for(const entry of prepared){
    if(used.has(normalize(entry.familia))){skipped.push({familia:entry.familia,reason:'Família já cadastrada ou duplicada no arquivo'});continue;}
    const pessoas=[];
    for(let a=1;a<=entry.adultos;a++)pessoas.push({id:randomUUID(),nome:`Adulto ${a}`,tipo:'adulto'});
    for(let c=1;c<=entry.criancas;c++)pessoas.push({id:randomUUID(),nome:`Criança ${c}`,tipo:'crianca'});
    const token=randomBytes(24).toString('base64url');
    try{
     const inserted=await db('convites_casamento?select=id',{method:'POST',prefer:'return=representation',body:{familia:entry.familia,nome_principal:entry.nomePrincipal,pessoas,max_adultos:entry.adultos,max_criancas:entry.criancas,token_hash:inviteHash(token)}});
     if(!inserted?.[0]?.id)throw new Error('Falha ao registrar convite');
     created.push({...entry,token,id:inserted[0].id});
     used.add(normalize(entry.familia));
     await audit(user.id,'convite_criado_por_planilha',inserted[0].id);
    }catch(e){console.error('Importação de convite falhou:',e.message);failed.push({familia:entry.familia,reason:'Não foi possível salvar o convite'});}
   }
   return json({ok:true,created,skipped,failed});
  }
  if(!uid(p.id)||!['rotate','deactivate','activate'].includes(action))return json({error:'Ação inválida.'},400);
  if(action==='rotate'){
   const token=randomBytes(24).toString('base64url');
   const rows=await db(`convites_casamento?id=eq.${p.id}&select=id`,{method:'PATCH',body:{token_hash:inviteHash(token),atualizado_em:new Date().toISOString()},prefer:'return=representation'});
   if(!rows?.length)return json({error:'Convite não encontrado.'},404);
   await audit(user.id,'convite_link_renovado',p.id);
   return json({ok:true,token});
  }
  const rows=await db(`convites_casamento?id=eq.${p.id}&select=id`,{method:'PATCH',body:{ativo:action==='activate',atualizado_em:new Date().toISOString()},prefer:'return=representation'});
  if(!rows?.length)return json({error:'Convite não encontrado.'},404);
  await audit(user.id,action==='activate'?'convite_reativado':'convite_cancelado',p.id);
  return json({ok:true});
 }catch(e){console.error('Admin convites',e.message);return json({error:'Falha ao gerenciar convites.'},500);}
};
