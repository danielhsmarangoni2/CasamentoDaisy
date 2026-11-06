import {json,db} from './_shared.mjs';
export default async(request)=>{
 if(request.method!=='GET')return json({error:'Método não permitido'},405);
 let banco='não configurado',status='ok';
 if(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY){
  try{await db('confirmacoes_casamento?select=id&limit=1');banco='ok';}
  catch{banco='indisponível';status='degradado'}
 }else{status='configuração pendente'}
 return json({site:'Daisy e Vinícius',status,banco,verificadoEm:new Date().toISOString()},status==='degradado'?503:200);
};
