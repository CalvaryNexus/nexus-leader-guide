// Verbatim from the Abide Week 3 reference index.html <style> block (unused sign-up, roles and map rules removed).
// Do not edit by eye: this is the brand system. Additions for app-only pages live in guide.ts.
export const REFERENCE_CSS = `
/* ==========================================================
   BRAND TOKENS
   Sampled from the Prayer Week Leader's Guide page.
   Edit here only; everything below inherits.
   ========================================================== */
:root{
  --navy:        #1C326A;   /* hero, footer, bands */
  --navy-text:   #152864;   /* headings */
  --navy-stripe: #3154BE;   /* diagonal accent stripes */
  --card:        #E7F2FE;   /* light blue panel */
  --card-line:   #B2CDEB;   /* dividers inside panel */
  --ink:         #121625;   /* body text */
  --ink-soft:    #55607A;   /* secondary text */
  --paper:       #FFFFFF;
  --paper-2:     #F6F9FD;
  --rule:        #DDE5F0;

  --ok:   #2F7D4F;
  --warn: #B8801E;
  --need: #B8341F;

  --f-display: "Archivo Black", Impact, sans-serif;
  --f-head:    "Poppins", Helvetica, sans-serif;
  --f-body:    "Poppins", Helvetica, sans-serif;

  --radius: 12px;
  --maxw: 1140px;
  --pad: clamp(20px, 5vw, 40px);
}

*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{
  margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--f-body);font-size:17px;line-height:1.62;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
img{max-width:100%;height:auto;display:block}
::selection{background:var(--navy);color:#fff}

.wrap{max-width:var(--maxw);margin:0 auto;padding-inline:var(--pad)}
h1,h2,h3,h4{font-family:var(--f-head);font-weight:700;line-height:1.18;margin:0;color:var(--navy-text)}

section{padding:clamp(46px,6.5vw,76px) 0}
section.tint{background:var(--paper-2)}
.sec-h{font-size:clamp(28px,4.4vw,40px);text-align:center;margin-bottom:12px}
.sec-sub{
  text-align:center;color:var(--ink-soft);max-width:60ch;margin:0 auto clamp(28px,4vw,42px);
  font-size:16.5px;
}

/* --------- HERO --------- */
.hero-outer{padding:clamp(20px,3vw,34px) 0 0}
.hero{
  position:relative;overflow:hidden;background:var(--navy);color:#fff;
  border-radius:var(--radius);
  padding:clamp(38px,5.5vw,64px) clamp(24px,4vw,56px);
}
.hero .stripe{position:absolute;background:var(--navy-stripe);opacity:.95;pointer-events:none}
.hero .stripe.a{width:640px;height:34px;top:34px;left:-300px;transform:rotate(-45deg)}
.hero .stripe.b{width:640px;height:34px;bottom:34px;right:-300px;transform:rotate(-45deg)}
.hero-in{
  position:relative;z-index:2;display:grid;gap:clamp(26px,4vw,40px);
  grid-template-columns:1fr;align-items:center;text-align:center;
}
@media(min-width:860px){.hero-in{grid-template-columns:1fr 1fr}}

.logo-lockup{display:block}
.logo-nexus{width:min(340px,76vw);height:auto;margin:0 auto}
.logo-lockup .sub{
  font-family:var(--f-head);font-size:clamp(12px,2vw,15px);font-weight:600;letter-spacing:.3em;
  text-transform:uppercase;color:rgba(255,255,255,.75);margin-top:16px;display:block;
}
.foot-logo{width:150px;height:auto;margin-bottom:16px;opacity:.9}

.hero h1{
  font-family:var(--f-display);color:#fff;font-weight:400;
  font-size:clamp(46px,9.5vw,92px);line-height:.94;letter-spacing:-.015em;text-transform:uppercase;
}
.hero .when{
  font-family:var(--f-head);font-weight:600;font-size:clamp(14px,2.2vw,19px);
  margin:18px 0 0;color:#fff;
}
.hero .when em{font-style:normal;opacity:.55;padding:0 10px}

/* --------- WELCOME + GLANCE --------- */
.top-grid{display:grid;gap:clamp(30px,4vw,52px);grid-template-columns:1fr;align-items:start}
@media(min-width:900px){.top-grid{grid-template-columns:1fr .82fr}}

.welcome{text-align:center;max-width:560px;margin-inline:auto}
.welcome h2{font-size:clamp(25px,3.4vw,32px);margin-bottom:14px}
.welcome h2 + p{margin-top:0}
.welcome p{color:var(--ink);margin:0 0 30px}
.welcome p:last-child{margin-bottom:0}
.welcome strong{font-weight:600;color:var(--navy-text)}
.welcome .gap{height:34px}

.glance{background:var(--card);border-radius:var(--radius);padding:clamp(24px,3.4vw,34px)}
.glance h2{text-align:center;font-size:clamp(23px,3vw,29px);margin-bottom:6px}
.glance dl{margin:0}
.glance .row{padding:17px 4px;border-bottom:1px solid var(--card-line);text-align:center}
.glance .row:last-child{border-bottom:none;padding-bottom:2px}
.glance dt{
  font-family:var(--f-head);font-size:12px;font-weight:600;letter-spacing:.13em;
  text-transform:uppercase;color:var(--navy-text);margin-bottom:5px;
}
.glance dd{margin:0;font-size:16.5px;color:var(--ink);line-height:1.45}
.glance dd b{font-weight:600;color:var(--navy-text)}

/* --------- VERSE BAND --------- */
.verse{
  background:var(--navy);color:#fff;text-align:center;position:relative;overflow:hidden;
  padding:clamp(52px,7vw,84px) 0;
}
.verse .stripe{position:absolute;background:var(--navy-stripe);opacity:.9;pointer-events:none}
.verse .stripe.a{width:700px;height:30px;top:20px;left:-340px;transform:rotate(-45deg)}
.verse .stripe.b{width:700px;height:30px;bottom:20px;right:-340px;transform:rotate(-45deg)}
.verse .inner{position:relative;z-index:2;max-width:820px;margin:0 auto;padding-inline:var(--pad)}
.verse .label{
  font-family:var(--f-head);font-size:11.5px;font-weight:600;letter-spacing:.26em;
  text-transform:uppercase;color:rgba(255,255,255,.6);margin:0 0 20px;
}
.verse blockquote{
  margin:0;font-family:var(--f-display);font-weight:400;text-transform:uppercase;
  font-size:clamp(34px,6.6vw,64px);line-height:.98;letter-spacing:-.015em;color:#fff;
}
.verse cite{
  display:block;font-style:normal;font-family:var(--f-head);font-weight:600;
  font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62);margin-top:20px;
}
.verse p{
  margin:26px auto 0;max-width:56ch;color:rgba(255,255,255,.84);font-size:16.5px;
}

/* --------- SCHEDULE --------- */
.table-wrap{border:1px solid var(--rule);border-radius:var(--radius);overflow:hidden;background:var(--paper)}
table{width:100%;border-collapse:collapse;font-size:15.5px}
thead th{
  background:var(--navy);color:#fff;text-align:left;padding:14px 18px;
  font-family:var(--f-head);font-size:11.5px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;
}
tbody td{padding:15px 18px;border-top:1px solid var(--rule);vertical-align:top}
tbody tr:nth-child(even){background:var(--paper-2)}
tbody tr.hl{background:var(--card)}
.band td{
  background:var(--navy-text);color:#fff;font-family:var(--f-head);font-size:11px;font-weight:600;
  letter-spacing:.2em;text-transform:uppercase;padding:9px 18px;
}
td.time{font-family:var(--f-head);font-weight:700;white-space:nowrap;color:var(--navy-text);width:1%}
td.item b{font-family:var(--f-head);font-weight:600;font-size:16.5px;display:block;color:var(--navy-text)}
td.item span{font-size:13px;color:var(--ink-soft);display:block;margin-top:3px}
td.det{color:var(--ink-soft);font-size:15px}
.tbd{
  display:inline-block;font-family:var(--f-head);font-size:10.5px;font-weight:600;letter-spacing:.1em;
  text-transform:uppercase;color:#8A6114;background:#FDF5E4;border:1px solid #EDDCB4;
  padding:2px 8px;border-radius:99px;
}
@media(max-width:759px){
  thead{display:none}
  tbody td{display:block;border-top:none;padding:3px 18px}
  tbody tr{display:block;border-top:1px solid var(--rule);padding:14px 0}
  td.time{padding-top:14px;font-size:14px}
  td.det{padding-bottom:16px}
  .band td{display:block;padding:9px 18px}
}

/* --------- FORM (access page) --------- */
.field label{
  display:block;font-family:var(--f-head);font-size:11.5px;font-weight:600;letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink-soft);margin-bottom:6px;
}
input[type=text]{
  width:100%;background:var(--paper);border:1.5px solid var(--rule);color:var(--ink);
  font-family:var(--f-body);font-size:16px;padding:13px 15px;border-radius:8px;outline:none;transition:.16s;
}
input[type=text]:focus{border-color:var(--navy);box-shadow:0 0 0 3px var(--card)}
.btn{
  font-family:var(--f-head);font-size:14px;font-weight:600;
  background:var(--navy);color:#fff;border:1.5px solid var(--navy);padding:12px 18px;
  border-radius:8px;cursor:pointer;transition:.16s;width:100%;
}
.btn:hover:not(:disabled){background:var(--navy-stripe);border-color:var(--navy-stripe)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn.ghost{background:transparent;color:var(--ink-soft);border-color:var(--rule)}
.btn.ghost:hover:not(:disabled){background:var(--card);color:var(--navy-text);border-color:var(--navy)}
.btn.warn{background:var(--warn);border-color:var(--warn)}

/* --------- GAME --------- */
.cards{display:grid;gap:16px;grid-template-columns:1fr}
@media(min-width:680px){.cards{grid-template-columns:1fr 1fr}}
@media(min-width:1000px){.cards.three{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);padding:24px}
.card.blue{background:var(--card);border-color:transparent}
.card h3{font-size:20px;margin-bottom:10px}
.card .n{
  font-family:var(--f-head);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:var(--navy-stripe);display:block;margin-bottom:7px;
}
.card p{margin:0 0 10px;font-size:15px;color:var(--ink-soft)}
.card p:last-child{margin-bottom:0}
.card p b{color:var(--ink);font-weight:600}
.card .meta{font-family:var(--f-head);font-size:12.5px;font-weight:600;color:var(--navy-text);margin-top:12px;display:block}

.rules{counter-reset:r;list-style:none;padding:0;margin:0 0 clamp(28px,4vw,40px);display:grid;gap:10px}
@media(min-width:820px){.rules{grid-template-columns:1fr 1fr}}
.rules li{
  counter-increment:r;background:var(--paper);border:1px solid var(--rule);border-radius:10px;
  padding:15px 18px 15px 54px;position:relative;font-size:15px;color:var(--ink-soft);
}
.rules li::before{
  content:counter(r,decimal-leading-zero);position:absolute;left:18px;top:15px;
  font-family:var(--f-head);font-size:13px;font-weight:700;color:var(--navy-stripe);
}
.rules li b{color:var(--ink);font-weight:600}

/* --------- FOOTER --------- */
footer{background:var(--navy-text);color:rgba(255,255,255,.72);padding:54px 0 36px;font-size:15px}
.foot-grid{display:grid;gap:32px;grid-template-columns:1fr}
@media(min-width:740px){.foot-grid{grid-template-columns:1fr 1fr}}
footer h4{
  font-family:var(--f-head);font-size:11.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
  color:#fff;margin-bottom:14px;
}
footer a{color:rgba(255,255,255,.72);text-decoration:none;display:block;margin-bottom:7px;transition:.16s}
footer a:hover{color:#fff}
footer p{margin:0 0 7px;line-height:1.6}
.foot-bottom{
  border-top:1px solid rgba(255,255,255,.14);margin-top:38px;padding-top:22px;
  display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;
  font-size:13px;color:rgba(255,255,255,.45);
}

.reveal{opacity:0;transform:translateY(14px);transition:opacity .55s ease,transform .55s cubic-bezier(.2,.8,.2,1)}
.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){
  *{animation-duration:.001ms !important;transition-duration:.001ms !important}
  .reveal{opacity:1;transform:none}html{scroll-behavior:auto}
}
`;
