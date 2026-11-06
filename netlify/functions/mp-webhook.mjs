import {json,db,alertWhatsApp,validMPSignature,money} from './_shared.mjs';
export default async(request)=>{
 if(request.method!=='POST')return json({error:'Método não permitido'},405);
 try{
  const payload=await request.json();
  const query=new URL(request.url).searchParams;
  const id=query.get('data.id')||query.get('data_id')||payload?.data?.id;
  const type=query.get('type')||payload?.type;
  if(type!=='payment')return json({ok:true,ignorado:true});
  if(!/^\d{5,25}$/.test(String(id||''))||!validMPSignature(request,id))return json({error:'Assinatura inválida'},401);
  const r=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`,{
   headers:{Authorization:`Bearer ${process.env.MP_ACCESS_TOKEN}`},signal:AbortSignal.timeout(9000)});
  if(!r.ok){console.error('Erro verificar pagamento',r.status);return json({error:'Não foi possível verificar pagamento'},502)}
  const payment=await r.json();
  const external=String(payment.external_reference||'');
  if(!/^[a-f0-9-]{36}$/.test(external))return json({ok:true,nao_associado:true});
  const records=await db(`contribuicoes_casamento?id=eq.${encodeURIComponent(external)}&select=id,nome,valor,titulo,notificacao_estado`);
  const gift=records?.[0];
  if(!gift)return json({ok:true,nao_associado:true});
  if(payment.currency_id!=='BRL'||Math.abs(Number(payment.transaction_amount)-Number(gift.valor))>0.001){
   console.error('Pagamento divergente',id);return json({error:'Pagamento divergente'},422);
  }
  // Taxa e líquido usam números EFETIVOS reportados pelo Mercado Pago. Não presumimos percentuais.
  const fees=Array.isArray(payment.fee_details)?payment.fee_details:[];
  const totalFee=fees.length&&fees.every(f=>Number.isFinite(Number(f.amount)))
    ?Number(fees.reduce((n,f)=>n+Number(f.amount),0).toFixed(2)):null;
  const net=payment.transaction_details?.net_received_amount;
  const realNet=(net!==null&&net!==undefined&&Number.isFinite(Number(net))&&Number(net)>=0)
    ?Number(net):null;
  const method=String(payment.payment_method_id||payment.payment_type_id||'').slice(0,64);
  const sync=await db('rpc/registrar_pagamento_mp_v3',{method:'POST',body:{
    p_id:external,p_pagamento:String(id),p_valor:Number(payment.transaction_amount),
    p_status:String(payment.status||'pending'),p_taxa:totalFee,p_liquido:realNet,
    p_metodo:method,p_detalhe:String(payment.status_detail||''),
    p_aprovado_em:payment.date_approved||null
  }});
  if(!sync?.valido)return json({error:'Inconsistência do pagamento'},422);
  if(!sync.alertar)return json({ok:true,status:sync.status,duplicado:true});
  try{
   await alertWhatsApp('Contribuição aprovada',`${gift.nome||'Convidado não identificado'} | ${money(gift.valor)} | ${gift.titulo} | Pagamento Mercado Pago #${id}`);
   await db(`contribuicoes_casamento?id=eq.${external}`,{method:'PATCH',body:{notificacao_estado:'enviado',notificado_em:new Date().toISOString()}});
   return json({ok:true,alerta:true});
  }catch(error){
   console.warn('Contribuição aprovada e salva, WhatsApp falhou',error.message);
   await db(`contribuicoes_casamento?id=eq.${external}`,{method:'PATCH',body:{notificacao_estado:'erro'}}).catch(()=>{});
   // Status 500 provoca nova tentativa pelo Mercado Pago, sem duplicar registros.
   return json({error:'Pagamento salvo, falha temporária na notificação'},500);
  }
 }catch(e){console.error('Webhook',e);return json({error:'Falha interna'},500);}
};
