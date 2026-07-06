import { useState, useEffect, useRef } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { publishDistribution, claimAllocation, getMine, latestCampaignId, listCampaigns, revokeRecipients, distributeAll, vestedNow, getVlm, shieldToken, mintUnderlying, tokenMeta, ensName, DIST_TOKENS, FAUCETS, DISTRIBUTOR, VLM, ETHERSCAN } from "./lib/contracts";
import {
  ArrowRight, Check, Plus, Trash2, Users, FileText, Wallet, KeyRound,
  Layers, BadgeCheck, ShieldCheck, Lock, Eye, ChevronRight, Droplet, ArrowUpRight,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  VELLUM — Confidential token distribution on the Zama Protocol
 *  Landing (showpiece) + app (overview · create · claim · registry).
 *  Crypto is SIMULATED for an in-browser preview. Every chain call is
 *  marked  // ⟶ LIVE  with the exact TokenOps / Zama drop-in.
 * ------------------------------------------------------------------ */

const FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');";

const CSS = `
:root{
  --paper:#F4F1E9; --paper-2:#FBF9F3; --paper-3:#EDE8DC;
  --ink:#1B1813; --ink-2:#4A4339; --taupe:#8A7F6E;
  --line:#DED7C7; --line-2:#E8E2D5;
  --gold:#9A7A33; --gold-2:#C7A24E; --gold-3:#7A5E26; --gold-soft:#EBD9A6;
  --slate:#46555E; --slate-2:#74828A;
  --serif:'Fraunces',Georgia,'Times New Roman',serif;
  --sans:'Hanken Grotesk',system-ui,-apple-system,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
}
*{box-sizing:border-box}
.vlm-root{background:var(--paper);color:var(--ink);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5;
  min-height:100%;position:relative;overflow-x:hidden}
.vlm-root::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");}
.wrap{max-width:1140px;margin:0 auto;padding:0 28px;position:relative;z-index:1}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer}

.eyebrow{font-size:11.5px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);
  font-weight:600;display:inline-flex;align-items:center;gap:14px}
.eyebrow::before,.eyebrow::after{content:"";height:1px;width:30px;background:var(--gold);opacity:.45}
.eyebrow.lone::after{display:none}
.serif{font-family:var(--serif)}
.kicker{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--taupe);font-weight:600}

.btn{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--ink);background:var(--ink);
  color:var(--paper-2);padding:13px 22px;border-radius:2px;font-weight:600;font-size:14.5px;
  transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s,background .25s}
.btn:hover{transform:translateY(-2px);box-shadow:0 12px 30px -14px rgba(27,24,19,.5)}
.btn svg{transition:transform .25s}.btn:hover svg{transform:translateX(3px)}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.btn-ghost:hover{border-color:var(--ink);box-shadow:none}
.btn-gold{background:linear-gradient(170deg,#D8B763,#B6913E 55%,#8C6C2C);border:1px solid #9A7A33;
  color:#241a06;box-shadow:0 1px 0 #EBD9A6 inset,0 -1px 0 rgba(0,0,0,.15) inset,0 8px 26px -12px rgba(154,122,51,.6)}
.btn-gold:hover{box-shadow:0 1px 0 #EBD9A6 inset,0 -1px 0 rgba(0,0,0,.15) inset,0 14px 34px -10px rgba(154,122,51,.8)}
.btn-sm{padding:9px 15px;font-size:13px}
.btn[disabled]{opacity:.5;pointer-events:none}

.nav{position:sticky;top:0;z-index:40;background:rgba(244,241,233,.82);
  backdrop-filter:blur(12px) saturate(1.1);border-bottom:1px solid var(--line)}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:66px}
.brand{display:flex;align-items:center;gap:11px;font-weight:600;font-size:18px;letter-spacing:-.01em}
.brand .mk{font-family:var(--serif);font-weight:500;font-size:21px}
.brand-btn{background:transparent;border:0;padding:0;cursor:pointer;color:inherit;transition:opacity .2s,transform .2s}
.brand-btn:hover{opacity:.78;transform:translateY(-1px)}
.nav-links{display:flex;gap:30px;align-items:center}
.nav-links a{font-size:14px;color:var(--ink-2);font-weight:500;position:relative;padding:4px 0}
.nav-links a::after{content:"";position:absolute;left:0;bottom:-1px;height:1px;width:0;background:var(--gold);transition:width .3s}
.nav-links a:hover{color:var(--ink)}.nav-links a:hover::after{width:100%}

/* seal */
.seal{filter:drop-shadow(0 10px 22px rgba(122,94,38,.28));
  transition:opacity .7s ease,transform .7s cubic-bezier(.3,.8,.3,1),filter .7s}
.seal.broken{opacity:0;transform:scale(.86) rotate(-7deg);filter:drop-shadow(0 0 0 transparent)}
.seal-wrap{position:relative;display:inline-grid;place-items:center}
.seal-num{position:absolute;inset:0;display:grid;place-items:center;text-align:center;
  opacity:0;transform:scale(.96);transition:opacity .6s .15s ease,transform .6s .15s cubic-bezier(.2,.7,.2,1)}
.seal-num.show{opacity:1;transform:none}
.seal-num .amt{font-family:var(--serif);font-weight:500;font-size:38px;line-height:1;
  background:linear-gradient(100deg,#7A5E26,#C7A24E 45%,#7A5E26);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.seal-num .tk{font-family:var(--mono);font-size:13px;color:var(--gold);margin-top:9px;letter-spacing:.04em}
.seal-hero{position:relative;display:grid;place-items:center}
.seal-glow{position:absolute;width:210px;height:210px;border-radius:50%;
  background:radial-gradient(circle,rgba(199,162,78,.5),rgba(199,162,78,0) 64%);filter:blur(10px);
  animation:bloom 4.2s ease-in-out infinite}
.seal-shine{position:absolute;width:132px;height:132px;border-radius:50%;overflow:hidden;pointer-events:none;mix-blend-mode:screen}
.seal-shine::before{content:"";position:absolute;top:-40%;left:-70%;width:55%;height:180%;transform:rotate(20deg);
  background:linear-gradient(90deg,transparent,rgba(255,247,220,.9),transparent);animation:shine 4.8s ease-in-out infinite}
@keyframes bloom{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:.95;transform:scale(1.05)}}
@keyframes shine{0%{left:-70%}55%{left:130%}100%{left:130%}}

/* hero */
.hero{padding:74px 0 26px;position:relative}
.hero-rings{position:absolute;inset:-80px 0 0 0;z-index:0;display:grid;place-items:center;pointer-events:none}
.hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:1.06fr .94fr;gap:54px;align-items:center}
h1.hero-h{font-family:var(--serif);font-weight:500;letter-spacing:-.02em;line-height:1.02;
  font-size:clamp(40px,6vw,68px);margin:20px 0 0}
h1.hero-h .l2{font-style:italic;display:block}
.hero-sub{margin-top:22px;font-size:17.5px;color:var(--ink-2);max-width:34em;line-height:1.6}
.hero-cta{display:flex;gap:14px;margin-top:30px;flex-wrap:wrap}
/* motion design */
.rise{display:inline-block;overflow:hidden;vertical-align:top;line-height:1.02}
.rise > i{display:inline-block;font-style:inherit;transform:translateY(115%);animation:riseUp .9s cubic-bezier(.2,.75,.15,1) both}
@keyframes riseUp{to{transform:translateY(0)}}
.rw-gold{background:linear-gradient(96deg,#7A5E26,#B6913E 55%,#7A5E26);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.hero .hero-rings{will-change:transform;transition:transform .35s cubic-bezier(.2,.7,.2,1);
  transform:translate3d(calc(var(--px,0)*14px),calc(var(--py,0)*14px),0)}
.hero-cursor{position:absolute;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(360px 360px at var(--mx,50%) var(--my,38%),rgba(199,162,78,.18),transparent 70%);
  transition:background .1s linear}
.mag{display:inline-flex;transition:transform .2s cubic-bezier(.2,.7,.2,1)}
.scrollbar{position:fixed;top:0;left:0;width:100%;height:2px;z-index:60;transform-origin:0 50%;transform:scaleX(0);
  background:linear-gradient(90deg,#C7A24E,#7A5E26);box-shadow:0 0 12px rgba(199,162,78,.55)}
.hero-meta{display:flex;gap:22px;margin-top:34px;flex-wrap:wrap}
.hero-meta div{font-size:12.5px;color:var(--taupe)}
.hero-meta b{display:block;font-family:var(--serif);font-size:21px;color:var(--ink);font-weight:500;letter-spacing:-.01em}

.lens-card{background:linear-gradient(180deg,var(--paper-2),#F7F4EC);border:1px solid var(--line);
  border-radius:6px;padding:26px;box-shadow:0 30px 60px -40px rgba(27,24,19,.4),0 1px 0 #fff inset}
.lens-tabs{display:flex;gap:6px;padding:4px;background:var(--paper-3);border-radius:3px;border:1px solid var(--line-2)}
.lens-tab{flex:1;border:0;background:transparent;padding:9px 8px;border-radius:2px;font-size:12.5px;font-weight:600;color:var(--taupe);letter-spacing:.02em;transition:.2s}
.lens-tab.on{background:var(--paper-2);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.lens-stage{height:208px;display:grid;place-items:center;margin:20px 0 6px;position:relative}
.handle{font-family:var(--mono);font-size:13px;color:var(--slate);background:#EAEEF0;border:1px solid #DCE3E6;padding:8px 12px;border-radius:3px;word-break:break-all;text-align:center;max-width:300px;line-height:1.7}
.lens-cap{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:var(--ink-2);border-top:1px dashed var(--line);padding-top:16px;margin-top:8px}
.lens-cap .dot{width:6px;height:6px;border-radius:50%}
.op-stat{text-align:center}
.op-stat .big{font-family:var(--serif);font-size:34px;font-weight:500;color:var(--ink)}
.op-stat .sm{font-size:13px;color:var(--taupe);margin-top:6px}

/* manifesto */
.manifesto{padding:92px 0;border-top:1px solid var(--line);text-align:center}
.manifesto p{font-family:var(--serif);font-weight:400;font-size:clamp(23px,3.4vw,37px);line-height:1.3;letter-spacing:-.01em;max-width:17em;margin:0 auto;color:var(--ink)}
.manifesto .g{color:var(--gold-3);font-style:italic}

.section{padding:84px 0;border-top:1px solid var(--line)}
.sec-head{max-width:32em}
.sec-head h2{font-family:var(--serif);font-weight:500;font-size:clamp(28px,3.6vw,40px);letter-spacing:-.02em;line-height:1.08;margin:14px 0 0}
.sec-head p{color:var(--ink-2);font-size:16.5px;margin-top:16px;line-height:1.6}

.tri{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:46px;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--paper-2)}
.tri-cell{padding:30px 26px;border-right:1px solid var(--line)}
.tri-cell:last-child{border-right:0}
.tri-cell .lbl{display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--taupe);font-weight:600}
.tri-cell .val{margin-top:18px;min-height:48px;display:flex;align-items:center}
.tri-cell .desc{font-size:13.5px;color:var(--ink-2);margin-top:16px;line-height:1.55}
.mono-chip{font-family:var(--mono);font-size:12.5px;color:var(--slate);background:#EAEEF0;border:1px solid #DCE3E6;padding:7px 10px;border-radius:3px;word-break:break-all}

.uses{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:46px}
.use{position:relative;isolation:isolate;background:var(--paper-2);border:1px solid var(--line);border-radius:6px;padding:28px;transition:border-color .35s,transform .3s}
.use::after{content:"";position:absolute;inset:0;border-radius:6px;pointer-events:none;opacity:0;transition:opacity .38s;
  box-shadow:0 0 0 1px rgba(199,162,78,.5),0 26px 60px -24px rgba(154,122,51,.58);
  background:radial-gradient(130% 120% at 50% 0%,rgba(199,162,78,.12),transparent 56%)}
.use:hover{border-color:var(--gold-2)}
.use:hover::after{opacity:1}
.use .ic{width:42px;height:42px;border-radius:4px;display:grid;place-items:center;background:linear-gradient(170deg,#F4E6BE,#E3C779);border:1px solid #CDA94F;color:#5d471c;transition:transform .3s,box-shadow .3s}
.use:hover .ic{transform:translateY(-2px);box-shadow:0 10px 22px -10px rgba(154,122,51,.7)}
.use h3{font-family:var(--serif);font-weight:500;font-size:21px;margin:18px 0 8px;letter-spacing:-.01em}
.use p{color:var(--ink-2);font-size:14.5px;line-height:1.55}
.use .tag{margin-top:16px;font-size:12px;color:var(--taupe);font-weight:600;letter-spacing:.04em}

.steps{margin-top:46px;border-top:1px solid var(--line)}
.step{display:grid;grid-template-columns:64px 1fr;gap:28px;padding:30px 0;border-bottom:1px solid var(--line);align-items:start}
.step .no{font-family:var(--serif);font-size:30px;color:var(--gold-3);font-weight:500;line-height:1}
.step h4{font-size:18px;font-weight:600;margin:0 0 6px}
.step p{color:var(--ink-2);font-size:15px;line-height:1.55;margin:0;max-width:46em}
.step code{font-family:var(--mono);font-size:12.5px;background:var(--paper-3);padding:1px 6px;border-radius:3px;color:var(--ink-2)}

.trust{display:flex;flex-wrap:wrap;gap:14px;margin-top:42px}
.trust span{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);background:var(--paper-2);border:1px solid var(--line);padding:9px 14px;border-radius:30px;font-weight:500}
.trust span svg{color:var(--gold-3)}

.section.tint{background:linear-gradient(180deg,#F1ECE1,#F4F1E9)}
.band-dark{position:relative;overflow:hidden;text-align:center;padding:104px 0;border-top:1px solid #2b251c;
  background:radial-gradient(130% 150% at 50% -30%,#2B261D 0%,#1A1610 58%)}
.band-dark .glowdot{position:absolute;left:50%;top:-180px;transform:translateX(-50%);width:560px;height:560px;border-radius:50%;
  background:radial-gradient(circle,rgba(199,162,78,.26),rgba(199,162,78,0) 60%);filter:blur(22px);pointer-events:none;
  animation:bloom 5.5s ease-in-out infinite}
.band-dark .rings{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:.5}
.band-dark .eyebrow{color:var(--gold-2)}
.band-dark .eyebrow::before,.band-dark .eyebrow::after{background:var(--gold-2);opacity:.5}
.band-dark h2{font-family:var(--serif);font-weight:500;font-size:clamp(31px,4.3vw,52px);letter-spacing:-.02em;margin:18px 0 0;line-height:1.04;color:#F4EFE2;position:relative}
.band-dark h2 .g{font-style:italic;background:linear-gradient(96deg,#C7A24E,#EBD9A6 50%,#C7A24E);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.band-dark p{color:#B9AF9B;max-width:33em;margin:18px auto 0;font-size:16.5px;position:relative}
.band-dark .row{display:flex;gap:42px;justify-content:center;flex-wrap:wrap;margin:38px 0 4px;position:relative}
.band-dark .row .n{font-family:var(--serif);font-size:30px;font-weight:500;color:#EBD9A6;letter-spacing:-.01em}
.band-dark .row .c{font-size:12.5px;color:#9b917e;margin-top:4px;letter-spacing:.04em}

.foot{border-top:1px solid var(--line);padding-top:54px;overflow:hidden}
.foot-cols{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:24px;padding-bottom:36px}
.foot-cols h5{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--taupe);font-weight:600;margin:0 0 14px}
.foot-cols a{display:block;color:var(--ink-2);font-size:14px;margin-bottom:9px}
.foot-cols a:hover{color:var(--ink)}
.foot-blurb{color:var(--ink-2);font-size:14px;line-height:1.6;max-width:24em}
.bigmark{font-family:var(--serif);font-weight:500;font-size:clamp(86px,19vw,250px);line-height:.86;letter-spacing:-.03em;text-align:center;padding:8px 0 4px;
  background:linear-gradient(96deg,#7A5E26,#C7A24E 40%,#EBD9A6 50%,#C7A24E 60%,#7A5E26);background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:foil 9s linear infinite;user-select:none}
@keyframes foil{to{background-position:200% center}}
.foot-base{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:22px 0 40px;border-top:1px solid var(--line);margin-top:8px}
.foot-base .small{font-size:12.5px;color:var(--taupe)}

.reveal{opacity:0;transform:translateY(20px) scale(.986);transition:opacity .85s cubic-bezier(.2,.7,.2,1),transform .85s cubic-bezier(.2,.7,.2,1)}
.reveal.in{opacity:1;transform:none}

/* app */
.app-bar{position:sticky;top:0;z-index:30;background:rgba(244,241,233,.86);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.app-bar-in{display:flex;align-items:center;justify-content:space-between;height:64px}
.app-tabs{display:flex;gap:4px;background:var(--paper-3);padding:4px;border-radius:4px;border:1px solid var(--line-2)}
.app-tab{border:0;background:transparent;padding:8px 15px;border-radius:3px;font-size:13.5px;font-weight:600;color:var(--taupe);transition:.2s}
.app-tab.on{background:var(--paper-2);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.07)}
.pill{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12.5px;color:var(--ink-2);background:var(--paper-2);border:1px solid var(--line);padding:7px 12px;border-radius:30px}
.app-main{padding:42px 0 90px}
.app-h{font-family:var(--serif);font-weight:500;font-size:32px;letter-spacing:-.02em;margin:0}
.app-sub{color:var(--ink-2);font-size:15px;margin-top:8px}

.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:30px 0}
.tile{background:var(--paper-2);border:1px solid var(--line);border-radius:6px;padding:22px;transition:transform .25s ease,box-shadow .25s}
.tile:hover{transform:translateY(-3px);box-shadow:0 22px 40px -34px rgba(27,24,19,.45)}
.tile .t{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--taupe);font-weight:600}
.tile .v{font-family:var(--serif);font-size:30px;font-weight:500;margin-top:12px;letter-spacing:-.01em}
.tile .v small{font-size:14px;color:var(--taupe);font-family:var(--sans)}

.panel{background:var(--paper-2);border:1px solid var(--line);border-radius:6px;overflow:hidden}
.panel-h{padding:18px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.panel-h h3{margin:0;font-size:15px;font-weight:600}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--taupe);font-weight:600;padding:13px 22px;border-bottom:1px solid var(--line)}
.tbl td{padding:14px 22px;border-bottom:1px solid var(--line-2);font-size:14px}
.tbl tr:last-child td{border-bottom:0}
.tbl .addr{font-family:var(--mono);font-size:12.5px;color:var(--ink-2)}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:20px}
.badge.sealed{background:#EFEAF0;color:#5a3f63;border:1px solid #E0D2E3}
.badge.live{background:#E7F0EA;color:#2f5d40;border:1px solid #CFE3D5}
.badge.gold{background:linear-gradient(170deg,#F4E6BE,#E3C779);color:#5d471c;border:1px solid #CDA94F}

.seg{display:inline-flex;background:var(--paper-3);padding:4px;border-radius:4px;border:1px solid var(--line-2);gap:4px}
.seg button{border:0;background:transparent;padding:9px 16px;border-radius:3px;font-size:13.5px;font-weight:600;color:var(--taupe);transition:.2s;display:inline-flex;align-items:center;gap:7px}
.seg button.on{background:var(--paper-2);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.07)}

.field{display:block;margin-bottom:6px;font-size:12.5px;font-weight:600;color:var(--ink-2);letter-spacing:.02em}
.inp,select.inp{width:100%;font-family:inherit;font-size:14px;color:var(--ink);background:var(--paper-2);border:1px solid var(--line);border-radius:4px;padding:11px 13px;outline:none;transition:.2s}
.inp:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(199,162,78,.16)}
.inp.mono{font-family:var(--mono);font-size:12.5px}
.recip-row{display:grid;grid-template-columns:1fr 150px 36px;gap:10px;align-items:center;margin-bottom:10px}
.iconbtn{border:1px solid var(--line);background:var(--paper-2);width:36px;height:36px;border-radius:4px;display:grid;place-items:center;color:var(--taupe);transition:.2s}
.iconbtn:hover{color:#9a2b2b;border-color:#e3c4c4}
.claim-stage{display:grid;place-items:center;padding:20px 0 6px}
.note{font-size:12.5px;color:var(--taupe);display:flex;gap:8px;align-items:flex-start;line-height:1.5}
.note code{font-family:var(--mono);font-size:12px}

@media (max-width:920px){
  .hero-grid{grid-template-columns:1fr;gap:36px}
  .tri{grid-template-columns:1fr}.tri-cell{border-right:0;border-bottom:1px solid var(--line)}.tri-cell:last-child{border-bottom:0}
  .uses{grid-template-columns:1fr}.tiles{grid-template-columns:1fr}
  .foot-cols{grid-template-columns:1fr 1fr}
  .nav-links{display:none}.hero-meta{gap:18px}
}
@media (prefers-reduced-motion:reduce){
  *{transition:none!important;animation:none!important}
  .reveal{opacity:1;transform:none}
}
`;

/* helpers */
const HEX = "0123456789abcdef";
function mkHandle(seed = Math.random()) {
  let s = Math.abs(Math.floor(seed * 1e9)) || 1, out = "0x";
  for (let i = 0; i < 60; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; out += HEX[s % 16]; }
  return out;
}
const short = (h) => h.slice(0, 10) + "…" + h.slice(-6);
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function RiseWords({ text, gold = false, base = 0 }) {
  const words = text.split(" ");
  if (reduced()) return <span className={gold ? "rw-gold" : ""}>{text}</span>;
  return (
    <>
      {words.map((w, i) => (
        <span className="rise" key={i} style={{ marginRight: i < words.length - 1 ? "0.26em" : 0 }}>
          <i className={gold ? "rw-gold" : ""} style={{ animationDelay: `${base + i * 95}ms` }}>{w}</i>
        </span>
      ))}
    </>
  );
}

function Magnetic({ children, strength = 6 }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current; if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength;
    const y = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return <span className="mag" ref={ref} onMouseMove={move} onMouseLeave={leave}>{children}</span>;
}

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current; if (!el) return;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      el.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="scrollbar" ref={ref} />;
}

function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.14 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function Tilt({ children, className = "", max = 6, style }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current; if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateY(-4px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return <div ref={ref} className={className} style={{ transition: "transform .3s ease", ...style }} onMouseMove={move} onMouseLeave={leave}>{children}</div>;
}

function CountUp({ value, run, dur = 1100 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) { setN(0); return; }
    if (reduced()) { setN(value); return; }
    let raf, start = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3); setN(Math.round(value * e)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [run, value, dur]);
  return <>{n.toLocaleString()}</>;
}

function Sparkline({ data, h = 88 }) {
  const w = 600;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - ((d - min) / (max - min || 1)) * (h - 14) - 7]);
  const path = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L");
  const area = path + ` L${w},${h} L0,${h} Z`;
  const ref = useRef(null); const [len, setLen] = useState(0);
  useEffect(() => { if (ref.current) setLen(ref.current.getTotalLength()); }, []);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs><linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C7A24E" stopOpacity=".26" /><stop offset="1" stopColor="#C7A24E" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#spk)" />
      <path ref={ref} d={path} fill="none" stroke="#9A7A33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: len, strokeDashoffset: reduced() ? 0 : len, animation: len && !reduced() ? "draw 1.7s ease forwards" : "none" }} />
      <style>{`@keyframes draw{to{stroke-dashoffset:0}}`}</style>
    </svg>
  );
}

function SealDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <radialGradient id="vlmFoil" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#F6E7B8" /><stop offset="42%" stopColor="#D8B763" />
          <stop offset="78%" stopColor="#A9823A" /><stop offset="100%" stopColor="#7A5E26" />
        </radialGradient>
        <radialGradient id="vlmInner" cx="42%" cy="38%" r="70%"><stop offset="0%" stopColor="#E7C977" /><stop offset="100%" stopColor="#9A7A33" /></radialGradient>
        <linearGradient id="vlmEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F4E3AE" /><stop offset="100%" stopColor="#6E5421" /></linearGradient>
      </defs>
    </svg>
  );
}

function Seal({ size = 150, broken = false }) {
  const r = size / 2, teeth = 28;
  const pts = Array.from({ length: teeth }).map((_, i) => { const a = (i / teeth) * Math.PI * 2, rr = r - 3; return `${r + Math.cos(a) * rr},${r + Math.sin(a) * rr}`; });
  return (
    <svg className={`seal ${broken ? "broken" : ""}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={pts.join(" ")} fill="url(#vlmEdge)" opacity="0.9" />
      <circle cx={r} cy={r} r={r - 8} fill="url(#vlmFoil)" />
      <circle cx={r} cy={r} r={r - 14} fill="none" stroke="#6E5421" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx={r} cy={r} r={r - 22} fill="url(#vlmInner)" />
      {Array.from({ length: 60 }).map((_, i) => { const a = (i / 60) * Math.PI * 2, r1 = r - 16, r2 = r - 21; return <line key={i} x1={r + Math.cos(a) * r1} y1={r + Math.sin(a) * r1} x2={r + Math.cos(a) * r2} y2={r + Math.sin(a) * r2} stroke="#6E5421" strokeOpacity="0.4" strokeWidth="0.8" />; })}
      <text x={r} y={r + size * 0.085} textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="600" fontSize={size * 0.34} fill="#5b441b" opacity="0.9">V</text>
      <text x={r - 1} y={r + size * 0.078} textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="600" fontSize={size * 0.34} fill="#F4E3AE" opacity="0.75">V</text>
      <ellipse cx={r * 0.72} cy={r * 0.66} rx={r * 0.42} ry={r * 0.24} fill="#FFF6DC" opacity="0.28" transform={`rotate(-28 ${r * 0.72} ${r * 0.66})`} />
    </svg>
  );
}

function HeroRings() {
  return (
    <svg className="hero-rings" width="760" height="760" viewBox="0 0 760 760" aria-hidden>
      {[120, 200, 280, 360].map((rr, i) => <circle key={i} cx="380" cy="380" r={rr} fill="none" stroke="#D8C9A6" strokeOpacity={0.22 - i * 0.03} strokeWidth="1" />)}
    </svg>
  );
}

const HERO_HANDLE = mkHandle(0.4421);
function LensDemo() {
  const [lens, setLens] = useState("public");
  const [broken, setBroken] = useState(false);
  const [liveHandle, setLiveHandle] = useState(HERO_HANDLE);
  const isRec = lens === "recipient";
  useEffect(() => { if (lens !== "recipient") setBroken(false); }, [lens]);
  useEffect(() => { if (reduced()) return; const id = setInterval(() => setLiveHandle(mkHandle(Math.random())), 3200); return () => clearInterval(id); }, []);
  return (
    <Tilt className="lens-card" max={5}>
      <div className="lens-tabs">
        {[["public", "Public"], ["operator", "Operator"], ["recipient", "Recipient"]].map(([k, l]) => (
          <button key={k} className={`lens-tab ${lens === k ? "on" : ""}`} onClick={() => setLens(k)}>{l}</button>
        ))}
      </div>
      <div className="lens-stage">
        {lens === "public" && (
          <div style={{ textAlign: "center" }}>
            <div className="seal-hero"><div className="seal-glow" /><Seal size={132} /><div className="seal-shine" /></div>
            <div className="handle" style={{ marginTop: 18 }}>{liveHandle}</div>
          </div>
        )}
        {lens === "operator" && (
          <div className="op-stat"><Seal size={66} /><div className="big" style={{ marginTop: 14 }}>1,000,000 <span style={{ fontSize: 16, color: "var(--taupe)" }}>VLM</span></div><div className="sm">distributed across 50 recipients</div></div>
        )}
        {isRec && (
          <div className="seal-wrap" style={{ width: 150, height: 150 }}>
            <Seal size={150} broken={broken} />
            <div className={`seal-num ${broken ? "show" : ""}`}><div><div className="amt"><CountUp value={204512} run={broken} /></div><div className="tk">VLM · your allocation</div></div></div>
          </div>
        )}
      </div>
      {lens === "public" && <div className="lens-cap"><span className="dot" style={{ background: "var(--slate-2)" }} />Anyone on Etherscan — a ciphertext handle, no amount</div>}
      {lens === "operator" && <div className="lens-cap"><span className="dot" style={{ background: "var(--gold-2)" }} />You, the distributor — roster totals, audit-ready</div>}
      {isRec && !broken && <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}><button className="btn btn-gold btn-sm" onClick={() => setBroken(true)}><KeyRound size={15} />Break the seal (decrypt)</button></div>}
      {isRec && broken && <div className="lens-cap"><span className="dot" style={{ background: "var(--gold-3)" }} />Only you — decrypted from the same on-chain handle</div>}
    </Tilt>
  );
}

/* landing */
function Landing({ onOpen }) {
  const heroRef = useRef(null);
  const onHeroMove = (e) => {
    const el = heroRef.current; if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", (nx * 100).toFixed(1) + "%");
    el.style.setProperty("--my", (ny * 100).toFixed(1) + "%");
    el.style.setProperty("--px", (nx - 0.5).toFixed(3));
    el.style.setProperty("--py", (ny - 0.5).toFixed(3));
  };
  return (
    <>
      <nav className="nav"><div className="wrap nav-in">
        <button className="brand brand-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Vellum — back to top"><Seal size={28} /><span className="mk">Vellum</span></button>
        <div className="nav-links">
          <a href="#why">Why it matters</a><a href="#lenses">Three lenses</a><a href="#uses">Use cases</a><a href="#how">How it works</a>
        </div>
        <button className="btn btn-sm" onClick={onOpen}>Open the app <ArrowRight size={15} /></button>
      </div></nav>

      <header className="hero" ref={heroRef} onMouseMove={onHeroMove}><div className="wrap">
        <div className="hero-cursor" />
        <HeroRings />
        <div className="hero-grid">
          <div>
            <Reveal><span className="eyebrow">Confidential distribution · Zama Protocol</span></Reveal>
            <h1 className="hero-h" style={{ marginTop: 20 }}><RiseWords text="Distribute in the open." base={120} /><span className="l2"><RiseWords text="Seal every amount." gold base={430} /></span></h1>
            <Reveal delay={520}><p className="hero-sub">Vellum runs confidential airdrops, vesting, and disperse for token teams. Recipient lists stay public and verifiable — allocation amounts are encrypted on-chain, so each recipient decrypts only their own slice.</p></Reveal>
            <Reveal delay={600}><div className="hero-cta"><Magnetic><button className="btn" onClick={onOpen}>Open the app <ArrowRight size={16} /></button></Magnetic><Magnetic><a className="btn btn-ghost" href="#how">See how it works</a></Magnetic></div></Reveal>
            <Reveal delay={340}><div className="hero-meta"><div><b>0</b>amounts leaked on-chain</div><div><b>ERC-7984</b>confidential standard</div><div><b>FHE</b>encrypted end to end</div></div></Reveal>
          </div>
          <Reveal delay={220}><LensDemo /></Reveal>
        </div>
      </div></header>

      <section className="manifesto" id="why"><div className="wrap"><Reveal>
        <p>Payroll. Grants. Investor rounds. Airdrops. Today each is settled on a public ledger that <span className="g">broadcasts the amount</span> to anyone who looks. Vellum keeps the settlement public — and the number <span className="g">sealed</span>.</p>
      </Reveal></div></section>

      <section className="section" id="lenses"><div className="wrap">
        <Reveal><div className="sec-head"><span className="kicker">One ciphertext, three views</span><h2>The same allocation, seen three ways.</h2><p>FHE protects the value, not the fact of the transfer. Vellum turns that into a clean mental model: one handle on-chain, three lenses on top of it.</p></div></Reveal>
        <Reveal delay={80}><div className="tri">
          <div className="tri-cell"><div className="lbl"><Eye size={15} />Public</div><div className="val"><span className="mono-chip">{short(HERO_HANDLE)}</span></div><div className="desc">Etherscan and indexers see that a transfer happened and to whom — never how much. The amount is a 32-byte ciphertext handle.</div></div>
          <div className="tri-cell"><div className="lbl"><Users size={15} />Operator</div><div className="val"><span className="serif" style={{ fontSize: 26 }}>1,000,000 VLM</span></div><div className="desc">The distributor decrypts roster totals through an operator ACL grant — enough to reconcile and audit, scoped to the campaign.</div></div>
          <div className="tri-cell"><div className="lbl"><Lock size={15} />Recipient</div><div className="val"><span className="serif" style={{ fontSize: 26, color: "var(--gold-3)" }}>204,512 VLM</span></div><div className="desc">Each recipient runs the EIP-712 user-decryption flow and sees only their own number. Nobody can infer a neighbour's slice.</div></div>
        </div></Reveal>
      </div></section>

      <section className="section tint" id="uses"><div className="wrap">
        <Reveal><div className="sec-head"><span className="kicker">Built for real launches</span><h2>Where leaking the amount is the problem.</h2><p>Every one of these runs today on public rails that expose the figures. Vellum keeps the rails and seals the numbers — a primitive every token org needs, not a one-off.</p></div></Reveal>
        <div className="uses">
          {[
            [<Layers size={20} />, "Investor distributions", "Pay SAFT and token-warrant allocations without publishing your cap table. Amounts and terms stay between you and each investor.", "Disperse · vesting"],
            [<Users size={20} />, "Community airdrops", "Reward thousands with cohort-sized campaigns. The recipient list is verifiable; per-wallet amounts stay encrypted — no farm signal, no MEV.", "Airdrop"],
            [<FileText size={20} />, "Team & advisor vesting", "Cliff-and-linear schedules where the grant size is confidential. Each grantee decrypts their own vested and claimable balance.", "Vesting"],
            [<Wallet size={20} />, "Payroll & grants", "Contributor payouts and DAO grants in one batch transaction, with each line item sealed from the rest of the batch.", "Disperse"],
          ].map(([ic, t, d, tag], i) => (
            <Reveal key={i} delay={i * 60}><Tilt className="use" max={4}><div className="ic">{ic}</div><h3>{t}</h3><p>{d}</p><div className="tag">{tag}</div></Tilt></Reveal>
          ))}
        </div>
      </div></section>

      <section className="section" id="how"><div className="wrap">
        <Reveal><div className="sec-head"><span className="kicker">The flow</span><h2>Four steps from spreadsheet to sealed.</h2></div></Reveal>
        <div className="steps">
          {[
            ["01", "Compose the ledger", <>Bring addresses and amounts — paste, upload a CSV, or pull from a snapshot. Vellum validates every row and totals the round client-side, before anything touches the chain.</>],
            ["02", "Encrypt client-side", <>Each amount is encrypted into a <code>euint64</code> handle in the browser via the Zama relayer, with a zero-knowledge proof binding it to your wallet and the campaign contract. Plaintext never leaves the device.</>],
            ["03", "Publish & grant", <>One transaction funds the campaign clone and writes the encrypted handles. ACL grants let the operator reconcile totals and each recipient later decrypt their own line — and only their own.</>],
            ["04", "Recipients decrypt & claim", <>A recipient signs the EIP-712 user-decryption request, reads their sealed allocation, and claims to their wallet as a confidential <code>ERC-7984</code> balance. The public sees a handle the entire way through.</>],
          ].map(([no, h, p], i) => (
            <Reveal key={i} delay={i * 50}><div className="step"><div className="no">{no}</div><div><h4>{h}</h4><p>{p}</p></div></div></Reveal>
          ))}
        </div>
      </div></section>

      <section className="section"><div className="wrap">
        <Reveal><div className="sec-head"><span className="kicker">Infrastructure, not a demo</span><h2>Standards underneath, on purpose.</h2><p>Vellum is a thin, opinionated surface over audited primitives — so it composes with the rest of the confidential-finance stack instead of forking it.</p></div></Reveal>
        <Reveal delay={80}><div className="trust">
          <span><ShieldCheck size={15} />Zama FHE coprocessor</span><span><BadgeCheck size={15} />TokenOps SDK</span><span><Lock size={15} />ERC-7984 confidential tokens</span><span><ShieldCheck size={15} />OpenZeppelin Confidential Contracts</span><span><KeyRound size={15} />EIP-712 user-decryption</span><span><Users size={15} />Per-recipient ACL grants</span>
        </div></Reveal>
        <Reveal delay={140}><p style={{ color: "var(--ink-2)", fontSize: 15, marginTop: 30, maxWidth: "44em", lineHeight: 1.65 }}>The KMS re-encrypts ciphertexts to a recipient's key without ever seeing plaintext — a property of the re-encryption scheme, not a promise. Shield and unshield are the only public boundary; once value is confidential, every amount stays sealed.</p></Reveal>
      </div></section>

      <section className="band-dark">
        <div className="glowdot" />
        <div className="rings"><HeroRings /></div>
        <div className="wrap"><Reveal>
          <span className="eyebrow lone" style={{ justifyContent: "center" }}>Zama Developer Program · Season 3</span>
          <h2>Distribute in the open.<br /><span className="g">Seal every amount.</span></h2>
          <p>Compose a confidential airdrop, vesting round, or disperse in minutes — and let recipients decrypt only what's theirs.</p>
          <div className="row">
            <div><div className="n">0</div><div className="c">amounts exposed</div></div>
            <div><div className="n">3</div><div className="c">distribution types</div></div>
            <div><div className="n">1 tx</div><div className="c">to publish a round</div></div>
          </div>
          <div style={{ marginTop: 32, position: "relative" }}><button className="btn btn-gold" onClick={onOpen}>Open the app <ArrowRight size={16} /></button></div>
        </Reveal></div>
      </section>

      <footer><div className="wrap foot">
        <div className="foot-cols">
          <div><div className="brand" style={{ marginBottom: 14 }}><Seal size={24} /><span className="mk">Vellum</span></div><p className="foot-blurb">Confidential token distribution on the Zama Protocol. Distribute in the open; seal every amount.</p></div>
          <div><h5>Product</h5><a href="#uses">Use cases</a><a href="#how">How it works</a><a onClick={onOpen}>Open the app</a></div>
          <div><h5>Built on</h5><a>Zama FHE</a><a>TokenOps SDK</a><a>ERC-7984</a></div>
          <div><h5>Program</h5><a>Season 3 · Builder</a><a>Special Bounty × TokenOps</a><a>Docs</a></div>
        </div>
        <div className="bigmark">Vellum</div>
        <div className="foot-base"><span className="small">© 2026 Vellum · Confidential distribution</span><span className="small">Built with FHE on Zama</span></div>
      </div></footer>
    </>
  );
}

/* app data */
const TOKENS = [
  { sym: "VLM", name: "Vellum Token (ERC-7984)" },
  { sym: "cUSDCMock", name: "Confidential USDC (Mock)" },
  { sym: "cZAMAMock", name: "Confidential ZAMA (Mock)" },
  { sym: "cUSDTMock", name: "Confidential USDT (Mock)" },
];
const SAMPLE = [
  { addr: "0x37AC010c1c566696326813b840319B58Bb5840E4", amt: "204512" },
  { addr: "0xD9F9298BbcD72843586e7E08DAe577E3a0aC8866", amt: "98000" },
  { addr: "0x3f0CdAe6ebd93F9F776BCBB7da1D42180cC8fcC1", amt: "150250" },
  { addr: "0x8e0bFD7736E9628E2179fB98d44223eF9840fBC7", amt: "60000" },
];
// Persists the composer across tab switches / remounts until the user resets it.
const createStore = {
  rows: null,
  type: "Airdrop",
  tokenIdx: 0,
  stage: "compose",
  campaignId: null,
  publishedRows: [],
  prefilled: false,
};
const REGISTRY = [
  ["cUSDCMock", "0x7c5BF43B…223639", "USDCMock", "0x9b5Cd13b…58aDFfF", 6],
  ["cUSDTMock", "0x4E7B06D7…1554491", "USDTMock", "0xa7dA08Fa…7e8e9b0", 6],
  ["cWETHMock", "0x46208622…1ed83158", "WETHMock", "0xff54739b…b9A5f3F", 18],
  ["cZAMAMock", "0xf2D628d2…78FfbFB", "ZAMAMock", "0x75355a85…e9a0BF57", 18],
  ["ctGBPMock", "0xfCE5c706…0a2F7CC", "tGBPMock", "0x93c93127…5111442", 18],
  ["cBRONMock", "0xaa5612FA…0F9C891", "BRONMock", "0xFf021fB1…cfDEb25E", 18],
];

function Overview({ published, go }) {
  const [camps, setCamps] = useState(null);
  const [loading, setLoading] = useState(false);
  const refresh = () => { setLoading(true); listCampaigns().then(setCamps).catch(() => setCamps([])).finally(() => setLoading(false)); };
  useEffect(() => { refresh(); }, []); // load once; refresh manually after
  const totalRecipients = camps ? camps.reduce((s, c) => s + c.recipientCount, 0) : 0;
  const KINDS = ["Airdrop", "Vesting", "Disperse"];
  return (
    <Reveal>
      <h1 className="app-h">Distributions</h1>
      <p className="app-sub">Operator lens — live from Sepolia. The chain shows only handles; amounts stay sealed.</p>
      <div className="tiles">
        <div className="tile"><div className="t">Campaigns</div><div className="v">{camps ? camps.length : "…"}</div></div>
        <div className="tile"><div className="t">Recipients reached</div><div className="v">{camps ? totalRecipients : "…"}</div></div>
        <div className="tile"><div className="t">Amounts leaked</div><div className="v" style={{ color: "var(--gold-3)" }}>0</div></div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>On-chain campaigns</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={loading} onClick={refresh}>{loading ? "Refreshing…" : "Refresh"}</button>
            <a className="btn btn-ghost btn-sm" href={`${ETHERSCAN}/address/${DISTRIBUTOR}`} target="_blank" rel="noreferrer">Etherscan <ArrowUpRight size={13} /></a>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>#</th><th>Title</th><th>Mode</th><th>Recipients</th><th>Status</th></tr></thead>
          <tbody>
            {!camps && <tr><td colSpan={5} style={{ color: "var(--taupe)" }}>Loading from chain…</td></tr>}
            {camps && camps.length === 0 && <tr><td colSpan={5} style={{ color: "var(--taupe)" }}>No campaigns yet — publish one in Create.</td></tr>}
            {camps && camps.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td style={{ fontWeight: 600 }}>{c.title}</td>
                <td>{KINDS[c.kind] || c.kind}</td>
                <td>{c.recipientCount}</td>
                <td><span className="badge live"><Check size={12} />Live</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => go("create")}><Plus size={16} />New distribution</button>
        <button className="btn btn-ghost" onClick={() => go("claim")}>Recipient experience <ChevronRight size={15} /></button>
      </div>
    </Reveal>
  );
}

function Create({ onPublish }) {
  const { address, isConnected } = useAccount();
  const [type, setType] = useState(createStore.type);
  const [tokenIdx, setTokenIdx] = useState(createStore.tokenIdx);
  const tok = DIST_TOKENS[tokenIdx];
  const [rows, setRows] = useState(createStore.rows || SAMPLE.map((r) => ({ ...r })));
  const [stage, setStage] = useState(createStore.stage);
  const [stepMsg, setStepMsg] = useState("");
  const [err, setErr] = useState("");
  const [campaignId, setCampaignId] = useState(createStore.campaignId);
  const [publishedRows, setPublishedRows] = useState(createStore.publishedRows);
  const [revoked, setRevoked] = useState({});
  const [ens, setEns] = useState({});
  const [busy, setBusy] = useState("");
  const total = rows.reduce((s, r) => s + (parseInt(r.amt) || 0), 0);
  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const add = () => setRows((rs) => [...rs, { addr: "", amt: "" }]);
  const del = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const resetForm = () => { setRows(SAMPLE.map((r) => ({ ...r }))); setType("Airdrop"); setTokenIdx(0); setStage("compose"); setCampaignId(null); setPublishedRows([]); createStore.prefilled = false; };
  // persist everything back to the store on any change
  useEffect(() => {
    createStore.rows = rows; createStore.type = type; createStore.tokenIdx = tokenIdx;
    createStore.stage = stage; createStore.campaignId = campaignId; createStore.publishedRows = publishedRows;
  }, [rows, type, tokenIdx, stage, campaignId, publishedRows]);
  // prefill row 0 with the connected wallet ONCE (never overwrites your edits afterwards)
  useEffect(() => {
    if (address && !createStore.prefilled) {
      createStore.prefilled = true;
      setRows((rs) => rs.map((r, i) => (i === 0 ? { ...r, addr: address } : r)));
    }
  }, [address]);
  useEffect(() => {
    rows.forEach((r) => {
      const a = r.addr;
      if (/^0x[a-fA-F0-9]{40}$/.test(a) && ens[a] === undefined) {
        setEns((m) => ({ ...m, [a]: null }));
        ensName(a).then((n) => n && setEns((m) => ({ ...m, [a]: n })));
      }
    });
  }, [rows]); // eslint-disable-line
  const getFaucet = async () => {
    setErr("");
    if (!isConnected) { setErr("Connect your wallet first (top right)."); return; }
    setBusy("faucet");
    try { tok.native ? await getVlm(address) : await shieldToken(tok.address, address, 1_000_000n); }
    catch (e) { setErr(e?.shortMessage || e?.message || "Faucet failed."); }
    setBusy("");
  };
  const seal = async () => {
    setErr("");
    if (!isConnected) { setErr("Connect your wallet first (top right)."); return; }
    const valid = rows.filter((r) => r.addr && r.amt);
    if (!valid.length) { setErr("Add at least one recipient with an amount."); return; }
    setStage("sealing");
    try {
      const { id } = await publishDistribution({ kind: type, title: `${type} · ${tok.sym}`, rows: valid, operator: address, tokenAddress: tok.address, native: tok.native, onStep: setStepMsg });
      setCampaignId(id);
      setPublishedRows(valid);
      setStage("done");
      onPublish({ type, token: tok.sym, rows: valid, total, id, operator: address });
    } catch (e) {
      console.error(e);
      setErr(e?.shortMessage || e?.message || "Transaction failed or was rejected.");
      setStage("compose");
    }
  };
  const doRevoke = async (addr) => {
    setErr("");
    setBusy(addr);
    try { await revokeRecipients(campaignId, [addr]); setRevoked((m) => ({ ...m, [addr]: true })); }
    catch (e) { setErr(e?.shortMessage || e?.message || "Revoke failed."); }
    setBusy("");
  };
  const [dispersed, setDispersed] = useState(false);
  const doDisperse = async () => {
    setErr(""); setBusy("disperse");
    try { await distributeAll(campaignId, publishedRows.map((r) => r.addr)); setDispersed(true); }
    catch (e) { setErr(e?.shortMessage || e?.message || "Disperse failed."); }
    setBusy("");
  };

  if (stage === "done") {
    return (
      <Reveal>
        <span className="badge gold" style={{ marginBottom: 14 }}><Check size={13} />Published to Sepolia</span>
        <h1 className="app-h">{type} sealed.</h1>
        <p className="app-sub">{publishedRows.length} encrypted allocations · {total.toLocaleString()} {tok.sym} · visible to no one but each recipient.</p>
        <div className="tri" style={{ marginTop: 28 }}>
          <div className="tri-cell"><div className="lbl"><Eye size={14} />Public sees</div><div className="val"><span className="serif" style={{ fontSize: 22 }}>a ciphertext</span></div><div className="desc">A transfer to each address — never an amount.</div></div>
          <div className="tri-cell"><div className="lbl"><Users size={14} />You see</div><div className="val"><span className="serif" style={{ fontSize: 24 }}>{total.toLocaleString()} {tok.sym}</span></div><div className="desc">Reconcile the full round, scoped to this campaign.</div></div>
          <div className="tri-cell"><div className="lbl"><Lock size={14} />They see</div><div className="val"><span className="serif" style={{ fontSize: 22, color: "var(--gold-3)" }}>only their line</span></div><div className="desc">Each recipient decrypts one number — their own.</div></div>
        </div>
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel-h"><h3>Recipients · campaign #{campaignId}</h3><a className="btn btn-ghost btn-sm" href={`${ETHERSCAN}/address/${DISTRIBUTOR}`} target="_blank" rel="noreferrer">View on Etherscan <ArrowUpRight size={13} /></a></div>
          <table className="tbl">
            <tbody>
              {publishedRows.map((r, i) => (
                <tr key={i}>
                  <td className="addr">{ens[r.addr] ? <b style={{ fontFamily: "var(--sans)" }}>{ens[r.addr]}</b> : `${r.addr.slice(0, 12)}…${r.addr.slice(-6)}`}</td>
                  <td><span className="badge sealed"><Lock size={12} />sealed</span></td>
                  <td style={{ textAlign: "right" }}>
                    {revoked[r.addr]
                      ? <span className="badge" style={{ background: "#f0e5e5", color: "#9a2b2b" }}>revoked</span>
                      : <button className="btn btn-ghost btn-sm" disabled={busy === r.addr} onClick={() => doRevoke(r.addr)}>{busy === r.addr ? "…" : "Revoke"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {type === "Disperse" && (
          <div style={{ marginTop: 18 }}>
            {dispersed
              ? <span className="badge gold" style={{ padding: "10px 16px", fontSize: 13 }}><Check size={14} />Sent to all wallets</span>
              : <button className="btn btn-gold" disabled={busy === "disperse"} onClick={doDisperse}><ArrowRight size={16} />{busy === "disperse" ? "Sending to all…" : "Send to all wallets now"}</button>}
            <div className="note" style={{ marginTop: 10 }}><ShieldCheck size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />Disperse pushes each sealed amount straight to its recipient — no claim needed.</div>
          </div>
        )}
        <div style={{ marginTop: 18 }}><button className="btn btn-ghost btn-sm" onClick={resetForm}><Plus size={14} />Compose another distribution</button></div>
        <div className="note" style={{ marginTop: 18 }}><ShieldCheck size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />Campaign #{campaignId} live on Sepolia — amounts encrypted client-side via the Zama relayer. Revoke cancels an unclaimed allocation.</div>
        {err && <div className="note" style={{ marginTop: 10, color: "#9a2b2b" }}>{err}</div>}
      </Reveal>
    );
  }
  return (
    <Reveal>
      <h1 className="app-h">New distribution</h1>
      <p className="app-sub">Compose the ledger. Amounts are encrypted in your browser before they're published.</p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "26px 0 14px", alignItems: "center" }}>
        <div className="seg">{["Airdrop", "Vesting", "Disperse"].map((t) => <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t}</button>)}</div>
        <div style={{ minWidth: 240 }}><select className="inp" value={tokenIdx} onChange={(e) => setTokenIdx(Number(e.target.value))}>{DIST_TOKENS.map((t, i) => <option key={t.sym} value={i}>{t.name} ({t.sym})</option>)}</select></div>
        <button className="btn btn-ghost btn-sm" disabled={busy === "faucet"} onClick={getFaucet}><Droplet size={14} />{busy === "faucet" ? (tok.native ? "Minting…" : "Shielding…") : (tok.native ? "Get 1M VLM" : `Shield 1M → ${tok.sym}`)}</button>
        <button className="btn btn-ghost btn-sm" onClick={resetForm}>Reset</button>
      </div>
      {!tok.native && <div className="note" style={{ marginBottom: 16 }}><ShieldCheck size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />{tok.sym} is an ERC-7984 wrapper. Click <b>Shield 1M → {tok.sym}</b> once (mint underlying → approve → wrap, 3 txs) and the round funds from your shielded balance.</div>}
      <div className="panel">
        <div className="panel-h"><h3>Recipients · {rows.length}</h3><span style={{ fontSize: 13, color: "var(--taupe)" }}>Round total <b style={{ color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 16 }}>{total.toLocaleString()} {tok.sym}</b></span></div>
        <div style={{ padding: 22 }}>
          <div className="recip-row" style={{ marginBottom: 12 }}><span className="field" style={{ margin: 0 }}>Wallet address</span><span className="field" style={{ margin: 0 }}>Amount</span><span /></div>
          {rows.map((r, i) => (
            <div className="recip-row" key={i}>
              <div>
                <input className="inp mono" placeholder="0x…" value={r.addr} onChange={(e) => setRow(i, "addr", e.target.value)} />
                {ens[r.addr] && <div style={{ fontSize: 12, color: "var(--gold-3)", marginTop: 4, fontWeight: 600 }}>{ens[r.addr]}</div>}
              </div>
              <input className="inp" placeholder="0" value={r.amt} onChange={(e) => setRow(i, "amt", e.target.value.replace(/[^0-9]/g, ""))} />
              <button className="iconbtn" onClick={() => del(i)} aria-label="Remove"><Trash2 size={15} /></button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={add} style={{ marginTop: 6 }}><Plus size={14} />Add recipient</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        <button className="btn btn-gold" onClick={seal} disabled={stage === "sealing" || total === 0}><Lock size={16} />{stage === "sealing" ? (stepMsg || "Publishing…") : "Seal & publish"}</button>
        <div className="note"><ShieldCheck size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />Each amount becomes a <code>euint64</code> handle with a ZK proof. Plaintext never leaves this device.</div>
      </div>
      {err && <div className="note" style={{ marginTop: 12, color: "#9a2b2b" }}>{err}</div>}
    </Reveal>
  );
}

function Claim({ published }) {
  const { address, isConnected } = useAccount();
  const token = published ? published.token : "VLM";
  const [campaignId, setCampaignId] = useState(published?.id ?? null);
  const [phase, setPhase] = useState("waiting"); // waiting | decrypting | revealed | claiming
  const [data, setData] = useState(null); // { allocation, claimed, camp }
  const [err, setErr] = useState("");
  const [nowSec, setNowSec] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (published?.id) { setCampaignId(published.id); return; }
    latestCampaignId().then((n) => n && setCampaignId(n)).catch(() => {});
  }, [published]);

  useEffect(() => {
    if (!data || !data.camp || data.camp.duration === 0) return;
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [data]);

  const load = async () => {
    setErr("");
    if (!isConnected) { setErr("Connect your wallet first (top right)."); return; }
    if (!campaignId) { setErr("No campaign found yet — publish one in Create."); return; }
    setPhase("decrypting");
    try {
      const m = await getMine(campaignId, address);
      setData(m); setNowSec(Math.floor(Date.now() / 1000)); setPhase("revealed");
    } catch (e) {
      console.error(e); setErr(e?.shortMessage || e?.message || "Decryption failed or was rejected."); setPhase("waiting");
    }
  };

  const doClaim = async () => {
    setErr(""); setPhase("claiming");
    try {
      await claimAllocation(campaignId);
      const m = await getMine(campaignId, address);
      setData(m); setNowSec(Math.floor(Date.now() / 1000)); setPhase("revealed");
    } catch (e) {
      console.error(e); setErr(e?.shortMessage || e?.message || "Claim failed or was rejected."); setPhase("revealed");
    }
  };

  const revealed = (phase === "revealed" || phase === "claiming") && data;
  const alloc = data ? data.allocation : 0n;
  const claimed = data ? data.claimed : 0n;
  const camp = data ? data.camp : null;
  const isVesting = camp && camp.duration > 0;
  const isDisperse = camp && camp.kind === 2;
  const vested = data ? vestedNow(alloc, camp, nowSec) : 0n;
  const claimable = vested > claimed ? vested - claimed : 0n;
  const pctVested = alloc > 0n ? Math.min(100, Number((vested * 10000n) / alloc) / 100) : 0;
  const nothing = revealed && alloc === 0n;
  const delivered = revealed && alloc > 0n && claimed >= alloc;
  const secsLeft = isVesting ? Math.max(0, camp.start + camp.duration - nowSec) : 0;
  const fmt = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  const shortAddr = address ? `${address.slice(0, 10)}…${address.slice(-4)}` : "not connected";
  const bigNum = revealed ? Number(claimable > 0n ? claimable : alloc) : 0;

  return (
    <Reveal>
      <h1 className="app-h">Your allocation</h1>
      <p className="app-sub">Recipient lens — {isConnected ? <>connected as <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{shortAddr}</span>{campaignId ? ` · campaign #${campaignId}` : ""}</> : "connect your wallet to decrypt your line."}</p>
      <div className="panel" style={{ marginTop: 26, maxWidth: 560 }}>
        <div className="panel-h">
          <h3>{camp ? ["Airdrop", "Vesting", "Disperse"][camp.kind] : (published ? published.type : "Distribution")} · {token}</h3>
          <a className="btn btn-ghost btn-sm" href={`${ETHERSCAN}/address/${DISTRIBUTOR}`} target="_blank" rel="noreferrer">Public view <ArrowUpRight size={13} /></a>
        </div>
        <div style={{ padding: "30px 22px" }}>
          <div className="claim-stage">
            <div className="seal-wrap" style={{ width: 160, height: 160 }}>
              <Seal size={160} broken={revealed} />
              <div className={`seal-num ${revealed ? "show" : ""}`}><div><div className="amt"><CountUp value={bigNum} run={revealed} /></div><div className="tk">{token} · {delivered ? "received" : claimable > 0n ? "claimable now" : "allocation"}</div></div></div>
            </div>
          </div>

          {revealed && alloc > 0n && (
            <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 6, fontSize: 13, color: "var(--ink-2)", flexWrap: "wrap" }}>
              <span>Allocation <b className="serif">{Number(alloc).toLocaleString()}</b></span>
              {isVesting && <span>Vested <b className="serif">{pctVested.toFixed(1)}%</b></span>}
              <span>Claimed <b className="serif">{Number(claimed).toLocaleString()}</b></span>
              <span>Claimable <b className="serif" style={{ color: "var(--gold-3)" }}>{Number(claimable).toLocaleString()}</b></span>
            </div>
          )}
          {revealed && isVesting && !delivered && secsLeft > 0 && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12.5, color: "var(--taupe)" }}>Unlocks linearly · fully vested in {fmt(secsLeft)}</div>
          )}

          <div style={{ textAlign: "center", marginTop: 18 }}>
            {phase === "waiting" && <button className="btn btn-gold" onClick={load}><KeyRound size={16} />Decrypt my allocation</button>}
            {phase === "decrypting" && <button className="btn btn-gold" disabled><KeyRound size={16} />Signing EIP-712 · decrypting…</button>}
            {phase === "revealed" && nothing && <span className="badge sealed" style={{ padding: "10px 16px", fontSize: 13 }}>No allocation for this address in campaign #{campaignId}</span>}
            {phase === "revealed" && delivered && <span className="badge gold" style={{ padding: "10px 16px", fontSize: 13 }}><Check size={14} />{isDisperse ? "Delivered to your wallet" : "Fully claimed"}</span>}
            {phase === "revealed" && !nothing && !delivered && isDisperse && <span className="badge sealed" style={{ padding: "10px 16px", fontSize: 13 }}>Awaiting delivery from the sender</span>}
            {phase === "revealed" && !nothing && !delivered && !isDisperse && claimable > 0n && <button className="btn" onClick={doClaim}><Wallet size={16} />Claim {Number(claimable).toLocaleString()} {token}</button>}
            {phase === "revealed" && !nothing && !delivered && !isDisperse && claimable === 0n && <span className="badge sealed" style={{ padding: "10px 16px", fontSize: 13 }}>Nothing claimable yet — vesting</span>}
            {phase === "claiming" && <button className="btn" disabled><Wallet size={16} />Claiming…</button>}
          </div>
          {err && <div className="note" style={{ marginTop: 14, justifyContent: "center", color: "#9a2b2b" }}>{err}</div>}
        </div>
      </div>
      <div className="note" style={{ marginTop: 18, maxWidth: 560 }}><ShieldCheck size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />Decryption happens only for the holder of this address. No other recipient — or observer — can read this number.</div>
    </Reveal>
  );
}

function Registry() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState({}); // key -> 'busy' | 'done' | error string
  const [err, setErr] = useState("");

  const run = async (key, fn) => {
    setErr("");
    if (!isConnected) { setErr("Connect your wallet first (top right)."); return; }
    setState((s) => ({ ...s, [key]: "busy" }));
    try { await fn(); setState((s) => ({ ...s, [key]: "done" })); }
    catch (e) { setState((s) => ({ ...s, [key]: "idle" })); setErr(e?.shortMessage || e?.message || "Faucet failed."); }
  };

  return (
    <Reveal>
      <h1 className="app-h">Token faucets</h1>
      <p className="app-sub">Mint test tokens to fund a distribution. VLM mints the confidential token directly; the ecosystem mocks mint the underlying ERC-20 (shield to distribute).</p>

      <div className="panel" style={{ marginTop: 26, marginBottom: 20 }}>
        <div className="panel-h"><h3>Vellum Token (VLM) · confidential, distributable now</h3><a className="btn btn-ghost btn-sm" href={`${ETHERSCAN}/address/${VLM}`} target="_blank" rel="noreferrer">Etherscan <ArrowUpRight size={13} /></a></div>
        <div style={{ padding: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div className="note" style={{ margin: 0 }}><ShieldCheck size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />Get 1,000,000 confidential VLM — ready to airdrop, vest, or disperse.</div>
          {state.vlm === "done"
            ? <span className="badge live"><Check size={12} />Minted 1M VLM</span>
            : <button className="btn btn-gold btn-sm" disabled={state.vlm === "busy"} onClick={() => run("vlm", () => getVlm(address))}><Droplet size={14} />{state.vlm === "busy" ? "Minting…" : "Get 1M VLM"}</button>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><h3>Ecosystem mocks · Sepolia registry</h3><span className="badge live"><BadgeCheck size={12} />Live faucet</span></div>
        <table className="tbl">
          <thead><tr><th>Underlying ERC-20</th><th>Confidential</th><th>Dec.</th><th style={{ textAlign: "right" }}>Faucet</th></tr></thead>
          <tbody>
            {FAUCETS.map(([u, ua, c, dec], i) => (
              <tr key={i}>
                <td><div style={{ fontWeight: 600 }}>{u}</div><a className="addr" href={`${ETHERSCAN}/address/${ua}`} target="_blank" rel="noreferrer" style={{ color: "var(--slate)" }}>{ua.slice(0, 12)}…{ua.slice(-6)}</a></td>
                <td>{c}</td>
                <td>{dec}</td>
                <td style={{ textAlign: "right" }}>
                  {state[i] === "done"
                    ? <span className="badge live"><Check size={12} />Minted</span>
                    : <button className="btn btn-ghost btn-sm" disabled={state[i] === "busy"} onClick={() => run(i, () => mintUnderlying(ua, address, dec))}><Droplet size={13} />{state[i] === "busy" ? "…" : "Mint 1M"}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && <div className="note" style={{ marginTop: 14, color: "#9a2b2b" }}>{err}</div>}
      <div className="note" style={{ marginTop: 18 }}><ArrowUpRight size={14} style={{ marginTop: 1, color: "var(--gold-3)" }} />Mocks mint the underlying ERC-20 (1M per call); shield them into the confidential wrapper to distribute. VLM needs no shielding.</div>
    </Reveal>
  );
}

function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  if (isConnected && address) {
    return (
      <button className="pill" style={{ cursor: "pointer" }} onClick={() => open({ view: "Account" })}>
        <Wallet size={13} />{address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }
  return (
    <button className="btn btn-gold btn-sm" onClick={() => open()}>
      <Wallet size={15} />Connect wallet
    </button>
  );
}

function Dashboard({ onExit }) {
  const [tab, setTab] = useState("overview");
  const [published, setPublished] = useState(null);
  return (
    <>
      <div className="app-bar"><div className="wrap app-bar-in">
        <button className="brand brand-btn" onClick={onExit} aria-label="Vellum — back to home"><Seal size={26} /><span className="mk">Vellum</span></button>
        <div className="app-tabs">{[["overview", "Overview"], ["create", "Create"], ["claim", "Claim"], ["registry", "Registry"]].map(([k, l]) => <button key={k} className={`app-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><WalletButton /><button className="btn btn-ghost btn-sm" onClick={onExit}>Exit</button></div>
      </div></div>
      <main className="app-main"><div className="wrap">
        <div style={{ display: tab === "overview" ? "block" : "none" }}><Overview published={published} go={setTab} /></div>
        <div style={{ display: tab === "create" ? "block" : "none" }}><Create onPublish={(p) => setPublished(p)} /></div>
        <div style={{ display: tab === "claim" ? "block" : "none" }}><Claim published={published} /></div>
        <div style={{ display: tab === "registry" ? "block" : "none" }}><Registry /></div>
      </div></main>
    </>
  );
}

export default function App() {
  const [view, setView] = useState("landing");
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  return (
    <div className="vlm-root">
      <style>{FONTS + CSS}</style>
      <SealDefs />
      <ScrollProgress />
      {view === "landing" ? <Landing onOpen={() => setView("app")} /> : <Dashboard onExit={() => setView("landing")} />}
    </div>
  );
}