import {createCipheriv,createHmac,createHash,randomBytes} from 'node:crypto';
import {db} from './_shared.mjs';
const env=()=>{
 const vars=['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET','BACKUP_ENCRYPTION_KEY'];
 const missing=vars.filter(k=>!process.env[k]); if(missing.length)throw new Error('Configurar backup externo: '+missing.join(','));
 const key=Buffer.from(process.env.BACKUP_ENCRYPTION_KEY,'base64');
 if(key.length!==32)throw new Error('BACKUP_ENCRYPTION_KEY deve ser base64 de 32 bytes');
 const account=process.env.R2_ACCOUNT_ID,bucket=process.env.R2_BUCKET;
 if(!/^[a-f0-9]{32}$/.test(account) || !/^[a-z0-9][a-z0-9-.]{1,61}[a-z0-9]$/.test(bucket))throw new Error('Conta e bucket R2 inválidos');
 return {account,bucket,key};
};
export const secureConfig = ()=>env();
export const encryptBackup = (data,key)=>{
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(data),cipher.final()]);
 return Buffer.concat([Buffer.from('DV3\0'),iv,cipher.getAuthTag(),encrypted]);
};
function hmac(key,message){return createHmac('sha256',key).update(message).digest();}
function sha256(b){return createHash('sha256').update(b).digest('hex');}
export async function sendR2(key,content){
 const cfg=env(),host=`${cfg.account}.r2.cloudflarestorage.com`;
 const path='/'+[cfg.bucket,...key.split('/')].map(encodeURIComponent).join('/');
 const now=new Date(),date=now.toISOString().replace(/[-:]|\.\d{3}/g,'');
 const day=date.slice(0,8),hash=sha256(content);
 const headers=`host:${host}\nx-amz-content-sha256:${hash}\nx-amz-date:${date}\n`;
 const request=`PUT\n${path}\n\n${headers}\nhost;x-amz-content-sha256;x-amz-date\n${hash}`;
 const scope=`${day}/auto/s3/aws4_request`;
 const stringToSign=`AWS4-HMAC-SHA256\n${date}\n${scope}\n${sha256(request)}`;
 const signingKey=hmac(hmac(hmac(hmac('AWS4'+process.env.R2_SECRET_ACCESS_KEY,day),'auto'),'s3'),'aws4_request');
 const signature=hmac(signingKey,stringToSign).toString('hex');
 const authorization=`AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;
 const res=await fetch(`https://${host}${path}`,{method:'PUT',headers:{Authorization:authorization,'x-amz-date':date,'x-amz-content-sha256':hash,'Content-Type':'application/octet-stream'},body:content,signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw new Error(`Armazenamento R2 respondeu ${res.status}`);
 return key;
}
export async function allRows(table,select='*',maxRows=20000){
 const result=[];for(let offset=0;offset<maxRows;offset+=1000){
  const order=table==='backups_fotos_casamento'?'foto_path':'id';
  const chunk=await db(`${table}?select=${encodeURIComponent(select)}&order=${order}.asc&limit=1000&offset=${offset}`);
  result.push(...chunk);if(chunk.length<1000)return result;
 }throw new Error('Limite de registros excedido: '+table);
}
export async function logBackup({tipo,estado,arquivos=0,registros=0,referencia=null,informacao=null}){
 await db('backups_casamento',{method:'POST',prefer:'return=minimal',body:{tipo,estado,arquivos,registros,referencia,informacao:String(informacao||'').slice(0,180)||null}});
}
export async function saveCoreBackup(){
 const cfg=env();
 const tables=['convites_casamento','confirmacoes_casamento','contribuicoes_casamento','mural_de_recados','configuracoes_casamento','auditoria_casamento','backups_fotos_casamento'];
 const obj={version:4,created_at:new Date().toISOString(),note:'Exportação lógica criptografada; esquema nos arquivos SQL do site',tables:{}};
 let count=0;for(const table of tables){obj.tables[table]=await allRows(table);count+=obj.tables[table].length;}
 const encoded=encryptBackup(Buffer.from(JSON.stringify(obj)),cfg.key);
 const now=new Date().toISOString().replace(/[:.]/g,'-');
 const key=`daisy-e-vinicius/dados/${now}.dvenc`;
 await sendR2(key,encoded);
 await logBackup({tipo:'dados',estado:'ok',registros:count,arquivos:1,referencia:key});
 return {key,count};
}
export async function savePendingPhotos(){
 const cfg=env();const [posts,saved]=await Promise.all([
  allRows('mural_de_recados','foto_path',10000),allRows('backups_fotos_casamento','foto_path',10000)
 ]);
 const known=new Set(saved.map(x=>x.foto_path));
 const paths=[...new Set(posts.map(x=>x.foto_path).filter(Boolean))].filter(p=>!known.has(p));
 let count=0;const start=Date.now();
 for(const path of paths.slice(0,6)){
  if(Date.now()-start>20000)break;
  if(!/^convidados\/[a-f0-9-]{36}\.jpg$/.test(path))continue;
  const base=process.env.SUPABASE_URL?.replace(/\/$/,'');const token=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response=await fetch(`${base}/storage/v1/object/casamento-fotos/${path}`,{headers:{apikey:token,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error(`Foto não foi lida: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>4194304)throw new Error('Foto ultrapassou limite de segurança');
  const dst=`daisy-e-vinicius/fotos/${path}.dvenc`;
  await sendR2(dst,encryptBackup(bytes,cfg.key));
  await db('backups_fotos_casamento?on_conflict=foto_path',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{foto_path:path,destino:dst,salvo_em:new Date().toISOString()}});
  count++;
 }
 await logBackup({tipo:'fotos',estado:'ok',arquivos:count,registros:paths.length,informacao:paths.length>count?`${paths.length-count} foto(s) ainda aguardam cópia`:null});
 return {count,remaining:Math.max(0,paths.length-count)};
}
