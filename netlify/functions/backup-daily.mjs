import {saveCoreBackup,logBackup,secureConfig} from './_backup.mjs';
export default async()=>{
 try{secureConfig();}catch {return new Response('Backup externo não configurado, sem execução.');}
 try{await saveCoreBackup();}catch(e){console.error('Backup dados:',e.message);await logBackup({tipo:'dados',estado:'erro',informacao:e.message}).catch(()=>{});}
 return new Response('Rotina concluída. Consulte o histórico no painel.');
};
