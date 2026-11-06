import {db} from './_shared.mjs';

const BASE = () => String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const KEY = () => String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
const validPath = p => /^convidados\/[a-f0-9-]{36}\.jpg$/.test(String(p||''));
function storageHeaders(){
 const key=KEY();
 return {'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':'application/json'};
}
export async function storageCall(endpoint,payload){
 if(!BASE() || !KEY()) throw new Error('Storage ainda não configurado');
 const response=await fetch(`${BASE()}/storage/v1/${endpoint}`,{method:'POST',headers:storageHeaders(),body:JSON.stringify(payload||{}),signal:AbortSignal.timeout(9000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){console.error('Storage',response.status,JSON.stringify(data).slice(0,180));throw new Error('Não foi possível preparar o arquivo');}
 return data;
}
export async function signedPhotos(records,expiresIn=1200){
 const paths=[...new Set(records.map(r=>r.foto_path).filter(validPath))];
 if(!paths.length)return records.map(r=>({...r,foto_url:null}));
 const signed=await storageCall('object/sign/casamento-fotos',{expiresIn,paths});
 const byPath=new Map(signed.map(s=>[s.path,s.signedURL?`${BASE()}/storage/v1${s.signedURL}`:null]));
 return records.map(r=>({...r,foto_url:byPath.get(r.foto_path)||null}));
}
export async function deletePhoto(path){
 if(!validPath(path))return;
 const r=await fetch(`${BASE()}/storage/v1/object/casamento-fotos`,{method:'DELETE',headers:storageHeaders(),body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(9000)});
 if(!r.ok)console.warn('Foto a excluir manualmente',path,r.status);
}
export function isUUID(s){return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(s||''));}
