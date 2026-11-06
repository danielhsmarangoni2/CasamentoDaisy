import {json,db} from './_shared.mjs';
export default async function(request){
 if(request.method!=='GET')return json({error:'Método não permitido'},405);
 try{
  const rows=await db('configuracoes_casamento?id=eq.1&select=pix_chave,pix_titular,pix_cidade&limit=1');
  const item=rows?.[0]||{};
  return json({pixChave:item.pix_chave||'',pixTitular:item.pix_titular||'',pixCidade:item.pix_cidade||''});
 }catch(e){console.error('Erro configuração pública Pix:',e.message);return json({error:'Pix temporariamente indisponível'},503);}
}
