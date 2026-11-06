// Recuperação local de arquivo .dvenc. Não envie a chave ou o arquivo de backup ao ChatGPT.
// Exemplo: BACKUP_ENCRYPTION_KEY='...' node DECRIPTAR-BACKUP.mjs copia.dvenc dados.json
import {readFileSync,writeFileSync} from 'node:fs';
import {createDecipheriv} from 'node:crypto';
const [input,output]=process.argv.slice(2);const token=process.env.BACKUP_ENCRYPTION_KEY||'';
if(!input||!output||Buffer.from(token,'base64').length!==32){
 console.error('Use: BACKUP_ENCRYPTION_KEY=<base64 de 32 bytes> node DECRIPTAR-BACKUP.mjs arquivo.dvenc resultado.json');process.exit(1);
}
const data=readFileSync(input);
if(data.length<33||data.subarray(0,4).toString()!=='DV3\0'){console.error('Formato desconhecido');process.exit(1)}
const iv=data.subarray(4,16),tag=data.subarray(16,32),encrypted=data.subarray(32);
const decipher=createDecipheriv('aes-256-gcm',Buffer.from(token,'base64'),iv);decipher.setAuthTag(tag);
try{const bytes=Buffer.concat([decipher.update(encrypted),decipher.final()]);writeFileSync(output,bytes,{mode:0o600});console.log('Cópia decifrada:',output);}
catch{console.error('Falha na autenticação: chave incorreta ou arquivo corrompido');process.exit(2)}
