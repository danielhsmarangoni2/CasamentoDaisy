import {json} from './_shared.mjs';
// V4: registros de presença precisam do link individual validado no servidor.
export default async()=>json({error:'Use o link personalizado do seu convite para confirmar presença.'},410);
