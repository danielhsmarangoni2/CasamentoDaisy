/* Cloudflare Turnstile opcional: sem chave pública, não carrega nada. */
(() => {
  const sitekey = String(window.WEDDING_CONFIG?.turnstileSiteKey || '').trim();
  const ids = {rsvp:null,gift:null,mural:null};
  const tokens = {rsvp:'',gift:'',mural:''};
  let ready = false;
  window.WeddingAntiBot = {
    token: (place) => tokens[place] || '',
    reset: (place) => {
      tokens[place] = '';
      if (ready && ids[place] != null) window.turnstile.reset(ids[place]);
    },
    setupGift: () => {
      if (!sitekey || !ready || ids.gift !== null) return;
      ids.gift = window.turnstile.render('#gift-antibot', {sitekey,
        callback: (token) => {tokens.gift=token},
        'expired-callback': () => {tokens.gift=''},
        'error-callback': () => {tokens.gift=''}
      });
    }
  };
  if (!sitekey) return;
  window.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload = () => {
      ready=true;
      ids.rsvp=window.turnstile.render('#rsvp-antibot',{sitekey,
        callback: (token) => {tokens.rsvp=token},
        'expired-callback': () => {tokens.rsvp=''},
        'error-callback': () => {tokens.rsvp=''}
      });
      if(document.querySelector('#mural-antibot')) ids.mural=window.turnstile.render('#mural-antibot',{sitekey,
        callback:token=>{tokens.mural=token},'expired-callback':()=>{tokens.mural=''},'error-callback':()=>{tokens.mural=''}
      });
      if (document.querySelector('#gift-dialog')?.open) window.WeddingAntiBot.setupGift();
    };
    document.head.appendChild(script);
  });
})();
