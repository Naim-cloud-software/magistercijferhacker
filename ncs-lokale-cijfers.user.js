// ==UserScript==
// @name         NCS | Lokale cijfers
// @namespace    ncs.local.magister
// @version      1.1.0
// @description  Tijdelijke lokale weergave van cijfers. Geen wijzigingen op de server.
// @author       NCS (Naim Cloud Software)
// @match        https://ogvo.magister.net/magister/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  if (document.getElementById('ncs-local-grades')) return;
  const selector = 'td[data-ng-bind="cijfer.waarde"]';
  const originals = new Map();
  const valid = s => /^(?:[1-9](?:[,.]\d)?|10(?:[,.]0)?)$/.test(s.trim());
  const cells = () => [...document.querySelectorAll(selector)].filter(e => valid(e.textContent));
  const number = s => Number(String(s).replace(',', '.'));
  const format = n => n.toFixed(1).replace('.', ',');
  let panelOpen = false;
  const host = document.createElement('div');
  host.id = 'ncs-local-grades';
  document.body.append(host);
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<style>
  :host{position:fixed;right:18px;bottom:18px;z-index:2147483647;font:14px system-ui;color:#e9efff}
  *{box-sizing:border-box} section{width:min(350px,calc(100vw - 36px));background:#101827;border:1px solid #405274;border-radius:16px;box-shadow:0 12px 50px #0007;padding:18px}
  header{display:flex;justify-content:space-between;align-items:center;gap:8px}strong{font-size:18px}p{font-size:12px;color:#bac9df;line-height:1.5}button,input,select{font:inherit;border:1px solid #52627b;border-radius:8px;padding:9px;background:#1e2b42;color:#fff}button{cursor:pointer}button:hover{background:#324b70}label{display:block;margin:12px 0 6px;font-size:12px}input,select{width:100%}.row{display:flex;gap:6px;margin-top:8px}.row>*{flex:1}#status{min-height:32px;color:#a9d5ff}#collapse{padding:4px 9px}footer{font-size:10px;color:#9aaac3;margin-top:12px}#body[hidden]{display:none}
  </style><section><header><strong>NCS · Lokale cijfers</strong><button id="collapse" aria-label="Paneel inklappen">−</button></header>
  <div id="body"><p>Alt+A: paneel openen of sluiten. Alleen jouw scherm. Echte cijfers blijven gelijk. Vernieuwen wist de wijzigingen. Werkt op de lijst Laatste cijfers; gemiddelden worden niet herberekend.</p>
  <label for="value">Nieuw cijfer (1,0–10,0)</label><input id="value" value="8,0" inputmode="decimal">
  <div class="row"><button id="all">Alles aanpassen</button></div>
  <label for="choose">Eén voor één</label><select id="choose"></select><div class="row"><button id="one">Dit cijfer aanpassen</button></div>
  <div class="row"><button id="pass">Random voldoende</button><button id="fail">Random onvoldoende</button></div>
  <p>Voldoende: 5,5–10,0 · onvoldoende: 1,0–5,4.</p>
  <div class="row"><button id="restore">Alles herstellen</button><button id="scan">Lijst verversen</button></div>
  <p id="status" role="status" aria-live="polite"></p><footer>Gemaakt door NCS (Naim Cloud Software) · lokale demo</footer></div></section>`;
  const $ = id => root.getElementById(id);
  let listed = [];
  const status = text => { $('status').textContent = text; };
  function scan() {
    const selected = listed[Number($('choose').value)];
    listed = cells();
    $('choose').replaceChildren();
    listed.forEach((cell,i) => {
      const row=cell.closest('tr');
      const subject=row?.querySelector('[data-ng-bind="cijfer.vak.omschrijving"]')?.textContent.trim() || 'Cijfer';
      const description=row?.querySelector('[data-ng-bind="cijfer.omschrijving"]')?.textContent.trim() || '';
      const option=document.createElement('option');
      option.value=i; option.textContent=subject+' · '+description+' · '+cell.textContent.trim();
      $('choose').append(option);
    });
    const index=listed.indexOf(selected); if(index>=0) $('choose').value=index;
    status(listed.length+' cijfer(s) gevonden in Laatste cijfers.');
  }
  function change(cell,n) {
    if (!cell?.isConnected) return;
    if (!originals.has(cell)) originals.set(cell,{text:cell.textContent,color:cell.style.color,weight:cell.style.fontWeight});
    cell.textContent=format(n);
  }
  function apply(mode) {
    const n=number($('value').value.trim());
    if ((mode==='all'||mode==='one') && (!Number.isFinite(n)||n<1||n>10||Math.abs(n*10-Math.round(n*10))>1e-8)) {status('Vul een cijfer van 1,0 tot 10,0 in, met maximaal één decimaal.');return;}
    const targets=mode==='one'?[listed[Number($('choose').value)]].filter(Boolean):cells();
    targets.forEach(cell=>change(cell,mode==='pass'?(55+Math.floor(Math.random()*46))/10:mode==='fail'?(10+Math.floor(Math.random()*45))/10:n));
    scan();status(targets.length+' cijfer(s) alleen lokaal aangepast.');
  }
  for(const mode of ['all','one','pass','fail']) $(mode).addEventListener('click',()=>apply(mode));
  $('restore').addEventListener('click',()=>{for(const [cell,old] of originals){if(cell.isConnected){cell.textContent=old.text;cell.style.color=old.color;cell.style.fontWeight=old.weight;}} originals.clear();scan();status('Oorspronkelijke weergave hersteld.');});
  $('scan').addEventListener('click',scan);
  $('collapse').addEventListener('click',()=>{const hidden=!$('body').hidden;$('body').hidden=hidden;$('collapse').textContent=hidden?'+':'−';});
  function route(){host.hidden=!panelOpen || !location.hash.startsWith('#/cijfers');if(!host.hidden)scan();}
  window.addEventListener('keydown', event => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === 'KeyA' && !event.repeat) {
      event.preventDefault(); panelOpen = !panelOpen; route();
    }
  }, true);
  let pending=false;
  const observer=new MutationObserver(records=>{if(records.some(r=>!host.contains(r.target))&&!pending){pending=true;queueMicrotask(()=>{pending=false;if(!host.hidden)scan();});}});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',route);
  route();
})();
