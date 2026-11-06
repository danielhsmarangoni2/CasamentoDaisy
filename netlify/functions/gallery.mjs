import {db,json} from './_shared.mjs';
import {signedPhotos} from './_album.mjs';
export default async request=>{
 if(request.method!=='GET')return json({error:'Método inválido'},405);
 try {
  const rows=await db('mural_de_recados?aprovado=eq.true&select=id,nome,mensagem,foto_path,criado_em&order=criado_em.desc&limit=80');
  return json({posts:await signedPhotos(rows||[],1800)});
 }catch(e){console.error('Galeria',e);return json({error:'Mural temporariamente indisponível'},503);}
};
