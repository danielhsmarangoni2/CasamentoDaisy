import {db,alertWhatsApp} from './_shared.mjs';
export default async()=>{
 const site=process.env.PUBLIC_SITE_URL;
 if(!site || !/^https:\/\//.test(site))return new Response('PUBLIC_SITE_URL ausente');
 let okay=false;
 try{
  const [a,b]=await Promise.all([
   fetch(new URL('/index.html',site),{signal:AbortSignal.timeout(10000),cache:'no-store'}),
   fetch(new URL('/.netlify/functions/health',site),{signal:AbortSignal.timeout(10000),cache:'no-store'})
  ]);
  okay=a.ok&&b.ok;
 }catch(e){console.error('Falha health check',e.message)}
 try{
  const current=await db('site_monitor_estado?id=eq.1&select=status');
  const old=current?.[0]?.status||'desconhecido';
  const next=okay?'online':'fora';
  if(old!==next){
   await db('site_monitor_estado?id=eq.1',{method:'PATCH',body:{status:next,alterado_em:new Date().toISOString()}});
   // Avisos somente na mudança de estado. Não envia 1 mensagem por visitante.
   if(old!=='desconhecido')await alertWhatsApp(next==='online'?'Site recuperado':'Site indisponível',`O monitor de Daisy e Vinícius detectou: ${next.toUpperCase()}. Endereço: ${site}`);
  }
 }catch(e){console.error('Falha monitor/WhatsApp',e.message)}
 return new Response(okay?'online':'fora',{status:200});
};
