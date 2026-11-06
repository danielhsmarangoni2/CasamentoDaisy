import {savePendingPhotos,logBackup,secureConfig} from './_backup.mjs';
export default async()=>{
 try{secureConfig();}catch {return new Response('Backup externo não configurado, sem execução.');}
 try{await savePendingPhotos();}catch(e){console.error('Backup fotos:',e.message);await logBackup({tipo:'fotos',estado:'erro',informacao:e.message}).catch(()=>{});}
 return new Response('Rotina concluída. Consulte o histórico no painel.');
};
