import {json,captchaValid} from './_shared.mjs';
import {storageCall} from './_album.mjs';
import {randomUUID} from 'node:crypto';
export default async request=>{
 if(request.method!=='POST')return json({error:'Método inválido'},405);
 if(!process.env.TURNSTILE_SECRET_KEY)return json({error:'Para proteger as fotos, configure a verificação anti-robô no Netlify.'},503);
 try {
  const p=await request.json();
  if(p.website || !await captchaValid(p.captchaToken,request))return json({error:'Verificação anti-robô inválida'},400);
  const path=`convidados/${randomUUID()}.jpg`;
  const result=await storageCall(`object/upload/sign/casamento-fotos/${path}`,{});
  const token=new URL(result.url,'https://token.local').searchParams.get('token');
  if(!token)throw new Error('Token de upload ausente');
  return json({path,token});
 }catch(e){console.error('Token album',e);return json({error:'Não foi possível preparar o envio.'},503);}
};
