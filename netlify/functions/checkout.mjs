import {json,db,captchaValid,money,textSafe} from './_shared.mjs';
import {randomUUID} from 'node:crypto';
const gifts=new Map([[150,'Primeiros passos'],[250,'Nosso novo lar'],[350,'Lua de mel'],[500,'Construindo nossa casa'],[750,'Presente especial'],[1000,'Presente especial aos noivos']]);
const safeCheckoutUrl=(raw)=>{try{const u=new URL(raw);return u.protocol==='https:'&&(u.hostname==='mercadopago.com.br'||u.hostname.endsWith('.mercadopago.com.br')||u.hostname==='mercadopago.com'||u.hostname.endsWith('.mercadopago.com'))?u.href:null}catch{return null}};
export default async (request)=>{
 if(request.method!=='POST')return json({error:'Método não permitido'},405);
 if(!process.env.MP_ACCESS_TOKEN||!process.env.SUPABASE_SERVICE_ROLE_KEY)return json({error:'Pagamentos automáticos ainda não configurados.'},503);
 try{
  const p=await request.json();
  if(p.website || !await captchaValid(p.captchaToken,request))return json({error:'Verificação inválida'},400);
  const valor=Number(p.valor);
  if(!Number.isFinite(valor)||valor<5||valor>10000||Math.round(valor*100)!==valor*100&&Math.abs(Math.round(valor*100)-valor*100)>.00001)return json({error:'Valor inválido.'},400);
  const nome=textSafe(p.nome,85).replace(/\s+/g,' ');
  if(nome.length<2 || nome.length>80)return json({error:'Informe o nome de quem está presenteando (2 a 80 caracteres).'},400);
  const titulo=gifts.get(valor)||'Contribuição livre ao casal';
  const id=randomUUID(),amount=Number(valor.toFixed(2));
  const origin=new URL(request.url).origin;
  // URLs de retorno apenas informativas; a aprovação oficial vem do webhook.
  const payload={items:[{id:'presente',title:`${titulo} - Daisy e Vinícius`,quantity:1,currency_id:'BRL',unit_price:amount}],
   external_reference:id,back_urls:{success:`${origin}/obrigado.html?status=retorno`,pending:`${origin}/obrigado.html?status=pendente`,failure:`${origin}/obrigado.html?status=falha`},
   notification_url:`${origin}/.netlify/functions/mp-webhook`,metadata:{site:'casamento-daisy-e-vinicius'},auto_return:'approved'};
  await db('contribuicoes_casamento',{method:'POST',prefer:'return=minimal',body:{id,nome:nome||null,valor:amount,titulo,status:'iniciado'}});
  const r=await fetch('https://api.mercadopago.com/checkout/preferences',{
   method:'POST',headers:{'Authorization':`Bearer ${process.env.MP_ACCESS_TOKEN}`,'Content-Type':'application/json','X-Idempotency-Key':id},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(11000)});
  const response=await r.json().catch(()=>({}));
  if(!r.ok){console.error('Erro criação MP',r.status,JSON.stringify(response).slice(0,300));return json({error:'Não foi possível iniciar o pagamento agora.'},502);}
  const url=safeCheckoutUrl(response.init_point);
  if(!url)return json({error:'Checkout não retornou um link válido.'},502);
  await db(`contribuicoes_casamento?id=eq.${id}`,{method:'PATCH',prefer:'return=minimal',body:{checkout_id:String(response.id||'').slice(0,100)}});
  return json({ok:true,url});
 }catch(e){console.error('Erro checkout',e);return json({error:'Falha ao iniciar o pagamento.'},500);}
};
