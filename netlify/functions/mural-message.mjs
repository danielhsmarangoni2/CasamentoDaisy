import {db,json,captchaValid} from './_shared.mjs';
// Recebe recados do mural. A verificação anti-robô é feita no servidor, não só no navegador.
const limpar=(s,max)=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,max);
export default async request=>{
 if(request.method!=='POST')return json({error:'Método não permitido'},405);
 try{
  const p=await request.json();
  if(p.website)return json({ok:true}); // campo armadilha preenchido por robô: finge sucesso
  if(!await captchaValid(p.captchaToken,request))return json({error:'Verificação anti-robô inválida. Tente de novo.'},400);
  const nome=limpar(p.nome,70);
  const mensagem=limpar(p.mensagem,700);
  if(nome.length<2)return json({error:'Escreva seu nome (de 2 a 70 caracteres).'},400);
  if(!mensagem)return json({error:'Escreva uma mensagem para os noivos.'},400);
  await db('mural_de_recados',{method:'POST',prefer:'return=minimal',body:{nome,mensagem,foto_path:null,aprovado:false}});
  return json({ok:true});
 }catch(e){console.error('Mural mensagem',e.message);return json({error:'Não foi possível salvar sua lembrança agora. Tente de novo em instantes.'},500);}
};
