/* Cartão personalizado: tudo é desenhado no navegador, sem enviar links privados a terceiros. */
(function(global){'use strict';
const W=760,H=1120, pink='#AE145C', dark='#571433', pale='#FFF9FC';
function font(ctx,size,style='normal'){ctx.font=`${style} ${size}px Georgia, 'Times New Roman', serif`;}
function center(ctx,s,y,max=640){
 const raw=String(s||''); if(!raw)return;
 const words=raw.split(/\s+/), lines=[]; let row='';
 for(const word of words){const next=row?row+' '+word:word;if(ctx.measureText(next).width>max&&row){lines.push(row);row=word;}else row=next;}
 if(row)lines.push(row);
 for(const [i,line] of lines.slice(0,3).entries())ctx.fillText(line,W/2,y+i*42);
 return lines.length;
}
function line(ctx,x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function ornaments(ctx,y){
 ctx.strokeStyle=pink;ctx.lineWidth=1.5;
 line(ctx,150,y,315,y);line(ctx,445,y,610,y);
 ctx.save();ctx.translate(380,y);ctx.rotate(Math.PI/4);ctx.strokeRect(-10,-10,20,20);ctx.restore();
}
function background(ctx){
 ctx.fillStyle=pale;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#D67EA8';ctx.lineWidth=2;ctx.strokeRect(28,28,W-56,H-56);
 ctx.strokeStyle='#F1CCD9';ctx.lineWidth=1;ctx.strokeRect(42,42,W-84,H-84);
 ctx.strokeStyle=pink;ctx.lineWidth=1.4;
 ctx.beginPath();ctx.arc(380,97,42,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle=pink;font(ctx,30);ctx.textAlign='center';ctx.fillText('D  V',380,108);
 ctx.font='20px Georgia';ctx.fillText('♥',380,153);
}
function qrAsImage(svg){
 return new Promise((resolve,reject)=>{
  if(!svg)return reject(new Error('QR Code não disponível.'));
  const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const source=new XMLSerializer().serializeToString(copy);
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
  const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Falha ao desenhar o QR Code.'));};img.src=url;
 });
}
async function render(canvas,svg,details){
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Seu navegador não suporta gerar imagens.');
 canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);ctx.textAlign='center';background(ctx);
 ctx.fillStyle=dark;font(ctx,40);ctx.fillText('Daisy e Vinícius',380,222);
 ornaments(ctx,310);
 ctx.fillStyle=dark;font(ctx,24);
 ctx.fillText('Com muita alegria, convidamos você',380,374);
 ctx.fillText('para celebrar conosco esse dia tão especial.',380,409);
 ctx.fillStyle=pink;font(ctx,29,'bold');ctx.fillText('DOMINGO • 23 DE MAIO DE 2027',380,495);
 ctx.fillStyle=dark;font(ctx,24);ctx.fillText('Entrada dos convidados  •  10h',380,557);
 ctx.fillText('Início da cerimônia  •  11h',380,601);
 ctx.fillStyle=pink;font(ctx,32,'bold');ctx.fillText('MANSÃO VICTÓRIA',380,679);
 ctx.fillStyle=dark;font(ctx,19);ctx.fillText('Rua Orfanato, 440 • Vila Prudente • São Paulo',380,720);
 ctx.fillStyle=pink;font(ctx,19,'bold');ctx.fillText('CONFIRME SUA PRESENÇA PELO QR CODE',380,777);
 const qr=await qrAsImage(svg);
 ctx.fillStyle='#ffffff';ctx.fillRect(276,809,208,208);ctx.imageSmoothingEnabled=false;ctx.drawImage(qr,282,815,196,196);ctx.imageSmoothingEnabled=true;
 ctx.fillStyle=dark;font(ctx,17);ctx.fillText('Aponte a câmera para confirmar sua presença',380,1044);
 return canvas;
}
function filename(familia){return 'convite-'+String(familia||'familia').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'.png';}
function blob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Não foi possível exportar a imagem.')),'image/png'));}
async function download(canvas,familia){const b=await blob(canvas);const uri=URL.createObjectURL(b);const a=document.createElement('a');a.href=uri;a.download=filename(familia);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1500);}
async function share(canvas,familia,link){const b=await blob(canvas);const file=new File([b],filename(familia),{type:'image/png'});
 if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:`Convite para ${familia}`,text:`Daisy e Vinícius • 23/05/2027 • Acesse o convite: ${link}`});return true;}
 return false;
}
global.WeddingInviteCard={render,download,share,filename};
})(window);