import { createHmac, timingSafeEqual } from 'node:crypto';

export const cors = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export const json = (obj,status=200)=> new Response(JSON.stringify(obj),{status,headers:cors});
export const missing = (...keys)=>keys.filter(k=>!process.env[k]);
export function money(n){return Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
export function textSafe(s,max=400){return String(s ?? '').replace(/[\r\n\t]+/g,' ').trim().slice(0,max);}
export async function db(path,options={}){
 const base=process.env.SUPABASE_URL?.replace(/\/$/,'');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base || !key) throw new Error('Servidor sem configuração do banco');
 const {method='GET',body,prefer,headers={}}=options;
 const response=await fetch(`${base}/rest/v1/${path}`,{
   method,headers:{'apikey':key,...(key.startsWith('eyJ')?{'Authorization':`Bearer ${key}`} : {}),'Content-Type':'application/json',...(prefer?{'Prefer':prefer}:{}),...headers},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(9000)
 });
 const raw=await response.text();
 if(!response.ok){console.error('Erro Supabase',response.status,raw.slice(0,300));throw new Error('Falha ao acessar armazenamento');}
 return raw ? JSON.parse(raw):null;
}
export async function alertWhatsApp(tipo,detalhes){
 const required=missing('META_WA_ACCESS_TOKEN','META_WA_PHONE_NUMBER_ID','META_WA_TEMPLATE');
 if(required.length) throw new Error('WhatsApp não configurado: '+required.join(', '));
 const version=process.env.META_GRAPH_VERSION||'v24.0';
 if(!/^v\d+\.0$/.test(version)) throw new Error('Versão da API WhatsApp inválida');
 // O telefone é alterável no painel. A variável antiga é fallback para migração.
 let configured=null;
 try{const records=await db('configuracoes_casamento?id=eq.1&select=telefone_notificacoes&limit=1');
  if(records?.length)configured=records[0].telefone_notificacoes;
 }catch(err){console.warn('Preferência do WhatsApp indisponível:',err.message);}
 const to=String(configured===null?process.env.META_WA_DESTINO||'':configured).replace(/\D/g,'');
 if(!/^55\d{10,11}$/.test(to)) throw new Error('Configure o WhatsApp destinatário no painel dos noivos');
 const payload={messaging_product:'whatsapp',to,type:'template',template:{
   name:process.env.META_WA_TEMPLATE,language:{code:process.env.META_WA_LANG||'pt_BR'},
   components:[{type:'body',parameters:[{type:'text',text:textSafe(tipo,100)},{type:'text',text:textSafe(detalhes,850)}]}]
 }};
 const r=await fetch(`https://graph.facebook.com/${version}/${process.env.META_WA_PHONE_NUMBER_ID}/messages`,{
   method:'POST',headers:{Authorization:`Bearer ${process.env.META_WA_ACCESS_TOKEN}`,'Content-Type':'application/json'},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(8500)
 });
 if(!r.ok){console.error('Falha Meta WhatsApp',r.status,(await r.text()).slice(0,320));throw new Error('WhatsApp não aceitou o envio');}
 return r.json();
}
export async function captchaValid(token,request){
 if(!process.env.TURNSTILE_SECRET_KEY){
   // Sem segredo, a verificação fica desligada. TURNSTILE_REQUIRED=true bloqueia em vez de liberar.
   if(process.env.TURNSTILE_REQUIRED==='true'){console.error('Turnstile obrigatório, mas TURNSTILE_SECRET_KEY ausente');return false;}
   console.warn('Anti-bot desligado: TURNSTILE_SECRET_KEY não configurada');
   return true;
 }
 if(!token || typeof token!=='string')return false;
 const params=new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token});
 const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
  method:'POST',body:params,signal:AbortSignal.timeout(8000)});
 return r.ok && (await r.json()).success===true;
}
// Validação da assinatura do Mercado Pago (a requisição também é conferida na API oficial).
export function validMPSignature(req,paymentId){
 const secret=process.env.MP_WEBHOOK_SECRET;
 const header=req.headers.get('x-signature')||'';
 const reqId=req.headers.get('x-request-id')||'';
 if(!secret || !header || !reqId || !paymentId)return false;
 const pairs=Object.fromEntries(header.split(',').map(v=>v.trim().split('=')).filter(v=>v.length===2));
 if(!/^\d+$/.test(pairs.ts||'')||!/^[a-f0-9]{64}$/i.test(pairs.v1||''))return false;
 const msg=`id:${String(paymentId).toLowerCase()};request-id:${reqId};ts:${pairs.ts};`;
 const actual=createHmac('sha256',secret).update(msg).digest();
 const received=Buffer.from(pairs.v1,'hex');
 return actual.length===received.length&&timingSafeEqual(actual,received);
}
