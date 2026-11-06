import {adminUser} from './admin-panel.mjs';
import {db,json} from './_shared.mjs';
import {allRows} from './_backup.mjs';
export default async request=>{
 if(request.method!=='GET')return json({error:'Método não permitido'},405);
 try{
  const user=await adminUser(request);
  if(!user)return json({error:'Sem autorização'},403);
  const tables=['convites_casamento','confirmacoes_casamento','contribuicoes_casamento','mural_de_recados','configuracoes_casamento','auditoria_casamento','backups_casamento','backups_fotos_casamento'];
  const backup={version:4,exportado_em:new Date().toISOString(),tipo:'Exportação privada de dados (NÃO inclui bytes das fotos)',tables:{}};
  for(const table of tables)backup.tables[table]=await allRows(table);
  await db('auditoria_casamento',{method:'POST',prefer:'return=minimal',body:{ator_tipo:'administrador',ator_id:user.id,acao:'exportacao_manual',entidade:'dados',detalhes:{tabelas:tables.length}}});
  const filename='daisy-e-vinicius-dados-'+new Date().toISOString().slice(0,10)+'.json';
  return new Response(JSON.stringify(backup,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){console.error('Exportação privada falhou',e.message);return json({error:'Não foi possível exportar os dados.'},500);}
};
