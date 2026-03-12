import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const SYL = ["AH", "RA", "PA", "TSA", "NA", "DHI"];
const TIB = ["ཨ", "ར", "པ", "ཙ", "ན", "དྷཱི"];
const P = {
  deepBlue: "#1B2B5A", royalBlue: "#2744A0", gold: "#D4A017", bGold: "#F0C040",
  red: "#E8302A", dRed: "#8B1A1A", saffron: "#E67E22", green: "#00875A",
  teal: "#008B8B", cream: "#F5ECD7", parchment: "#EDE0C8", wWhite: "#FBF5E6",
  dBrown: "#2C1810", maroon: "#5B1A30", orange: "#ED6C1B", lotus: "#E8A0B0",
  navy: "#0D1B3E", yellow: "#F5B800",
  t1: "#F2E8D0", t2: "#D6C9AB", tM: "#A89878",
};
const SC = [P.bGold, P.red, P.green, P.saffron, P.royalBlue, P.teal];
const FC = [P.royalBlue, P.wWhite, P.red, P.green, P.yellow];

const MO = {
  "AH-AH":{name:"The Stainless Sky",nature:"excellent",element:"space-space",desc:"Like a clear sky free of clouds, all activities proceed without obstacle. Your path is unobstructed.",advice:"All intentions are free of obstacles. Peaceful activities are especially favored."},
  "AH-RA":{name:"The Flaming Rays of the Sun",nature:"good",element:"space-fire",desc:"The sun's power illuminates all things. Great energy and clarity combine to burn away confusion.",advice:"Actions requiring courage are strongly supported. Be mindful of excess force."},
  "AH-PA":{name:"The Nectar Rays of the Moon",nature:"excellent",element:"space-water",desc:"The moon's nectar rays illumine the sky. Peaceful and increasing activities are assured.",advice:"Gentle, peaceful activities are strongly favored. Health improves."},
  "AH-TSA":{name:"The Bright Star",nature:"good",element:"space-wind",desc:"A bright star guides travelers through darkness. Messages bring fortunate news.",advice:"Good news is on its way. Your wishes have the brightness of a guiding star."},
  "AH-NA":{name:"The Ground of Gold",nature:"excellent",element:"space-earth",desc:"Solid as golden ground beneath your feet. Material prosperity and stable foundations are indicated.",advice:"Earthly matters—property, wealth, home—are all strongly favored."},
  "AH-DHI":{name:"The Tone of Vajras",nature:"excellent",element:"space-wisdom",desc:"The indestructible sound of wisdom resonates through space. Spiritual insight arises naturally.",advice:"Wisdom pervades your situation. Study and spiritual activities are profoundly supported."},
  "RA-AH":{name:"The Bright Lamp",nature:"good",element:"fire-space",desc:"A lamp illuminates the darkness, revealing what was hidden. Clarity emerges from confusion.",advice:"Confusion gives way to clarity. Situations that were unclear will be illuminated."},
  "RA-RA":{name:"Adding Butter to Burning Flames",nature:"mixed",element:"fire-fire",desc:"Double fire creates tremendous power but risks burning out of control.",advice:"Great energy must be channeled wisely. Excessive force will create problems."},
  "RA-PA":{name:"The Demon of Death",nature:"unfavorable",element:"fire-water",desc:"Fire and water clash, creating steam and confusion. Obstacles arise from conflicting forces.",advice:"Caution is strongly advised. Postpone important decisions if possible."},
  "RA-TSA":{name:"The King of Power",nature:"good",element:"fire-wind",desc:"Wind feeds fire into a blazing force. Power and influence expand rapidly.",advice:"Authority and power grow. Use this power responsibly and with compassion."},
  "RA-NA":{name:"The Dried-up Tree",nature:"unfavorable",element:"fire-earth",desc:"Fire has scorched the earth, leaving a dried tree. Vitality is depleted.",advice:"Rest and replenishment are needed. This is not the time for ambitious undertakings."},
  "RA-DHI":{name:"The Door of Auspicious Visions",nature:"excellent",element:"fire-wisdom",desc:"The fire of wisdom opens doors of perception. Auspicious visions arise.",advice:"Spiritual insight and worldly success align. Walk through the door that opens."},
  "PA-AH":{name:"The Vase of Nectar",nature:"excellent",element:"water-space",desc:"A precious vase overflows with healing nectar. Abundance pours forth endlessly.",advice:"Abundance flows freely. Health, wealth, and happiness increase."},
  "PA-RA":{name:"The Pool Without Water",nature:"unfavorable",element:"water-fire",desc:"A pool with no water source will dry up. Resources deplete without replenishment.",advice:"Seek new sources of support before proceeding."},
  "PA-PA":{name:"The Ocean of Nectar",nature:"excellent",element:"water-water",desc:"An infinite ocean of healing nectar. Boundless abundance and profound satisfaction.",advice:"Everything flows in your favor. Immerse yourself fully in this fortunate time."},
  "PA-TSA":{name:"The Demon of Afflictions",nature:"unfavorable",element:"water-wind",desc:"Disturbing emotions stir like wind upon water. Worry and anxiety create turbulence.",advice:"Guard your mind. Meditation and wise counsel are your allies."},
  "PA-NA":{name:"The Golden Lotus",nature:"excellent",element:"water-earth",desc:"A golden lotus blooms from the earth. Beauty emerges from humble conditions.",advice:"Creative endeavors and relationships blossom. Trust the natural unfolding."},
  "PA-DHI":{name:"The Nectar-like Medicine",nature:"excellent",element:"water-wisdom",desc:"Wisdom becomes healing medicine. Understanding brings the cure for what ails you.",advice:"Healing of body and mind is strongly indicated."},
  "TSA-AH":{name:"The White Umbrella of Good Fortune",nature:"excellent",element:"wind-space",desc:"A great white umbrella shelters you from all harm. Good fortune showers down.",advice:"You are protected and blessed. Proceed with confidence."},
  "TSA-RA":{name:"The Great Fiery Weapon",nature:"mixed",element:"wind-fire",desc:"Wind and fire combine into a formidable weapon. Great power that can protect or destroy.",advice:"Victory is possible but demands wisdom and restraint."},
  "TSA-PA":{name:"Empty of Intelligence",nature:"unfavorable",element:"wind-water",desc:"Wind scatters water into mist. Confusion and poor judgment threaten.",advice:"This is not the time for important decisions. Wait for the mist to clear."},
  "TSA-TSA":{name:"The Streamer of Fame",nature:"good",element:"wind-wind",desc:"Two winds carry your banner far and wide. Reputation spreads in all directions.",advice:"Public endeavors and social activities are favored."},
  "TSA-NA":{name:"The Mara Demon of the Aggregates",nature:"unfavorable",element:"wind-earth",desc:"Disturbing forces work upon the body. Physical and mental obstacles gather.",advice:"Be mindful of your health. Self-care is essential."},
  "TSA-DHI":{name:"The House of Good Tidings",nature:"excellent",element:"wind-wisdom",desc:"Wisdom arrives on the wind like welcome news. Good tidings fill your dwelling.",advice:"Excellent news and fortunate developments arrive."},
  "NA-AH":{name:"The Golden Mountain",nature:"excellent",element:"earth-space",desc:"An immovable golden mountain, majestic and eternal. Unshakeable stability.",advice:"You stand upon an unshakeable foundation. You are solid as gold."},
  "NA-RA":{name:"The Demon of the Heavenly Son",nature:"mixed",element:"earth-fire",desc:"Pride and worldly attachment create subtle obstacles. Spiritual materialism lurks.",advice:"Beware of pride. Maintain humility even amid success."},
  "NA-PA":{name:"The Overflowing Jeweled Vessel",nature:"excellent",element:"earth-water",desc:"A jeweled vessel overflows with precious water. Material and spiritual abundance combine.",advice:"Both material wealth and inner richness increase abundantly."},
  "NA-TSA":{name:"The Scattered Mountain of Sand",nature:"unfavorable",element:"earth-wind",desc:"Wind erodes a mountain of sand. What seemed solid proves unstable.",advice:"Reinforce your foundations. What is built on sand cannot endure."},
  "NA-NA":{name:"The Mansion of Gold",nature:"excellent",element:"earth-earth",desc:"A dwelling of pure gold. The ultimate stability, wealth, and protection.",advice:"The most auspicious sign for all material matters."},
  "NA-DHI":{name:"The Treasury of Jewels",nature:"excellent",element:"earth-wisdom",desc:"A vast treasury of wisdom. Knowledge becomes wealth, and wealth serves wisdom.",advice:"All investments yield precious returns."},
  "DHI-AH":{name:"Manjushri Appears",nature:"excellent",element:"wisdom-space",desc:"The Bodhisattva of Wisdom himself manifests. Direct blessing of awakened wisdom.",advice:"The most auspicious of all signs. All activities succeed through clear understanding."},
  "DHI-RA":{name:"The Endless Auspicious Knot",nature:"excellent",element:"wisdom-fire",desc:"The endless knot of interdependence. All things connect in mutual support and beauty.",advice:"Long-term commitments are strongly favored."},
  "DHI-PA":{name:"The Golden Female Fish",nature:"good",element:"wisdom-water",desc:"Golden fish swim freely through the waters of wisdom. Freedom and playful abundance.",advice:"Move through your element with joy and ease."},
  "DHI-TSA":{name:"The White Conch",nature:"excellent",element:"wisdom-wind",desc:"The great white conch sounds in all directions. Truth and wisdom spread far.",advice:"Your voice carries authority and truth."},
  "DHI-NA":{name:"The Golden Wheel",nature:"excellent",element:"wisdom-earth",desc:"The golden wheel of dharma turns upon the earth. Wisdom takes form in the world.",advice:"Plans set in motion now carry unstoppable momentum."},
  "DHI-DHI":{name:"The Jeweled Banner of Victory",nature:"excellent",element:"wisdom-wisdom",desc:"Wisdom conquering all ignorance. Complete and total auspiciousness.",advice:"The highest possible result. All obstacles dissolve."}
};
const NS = {
  excellent:{color:P.bGold,bg:"#D4A01722",label:"Highly Auspicious"},
  good:{color:"#5BDE8E",bg:"#1D7A4E22",label:"Auspicious"},
  mixed:{color:P.saffron,bg:"#E67E2222",label:"Mixed Forces"},
  unfavorable:{color:"#EF6B6B",bg:"#C0392B22",label:"Obstacles Present"}
};

/* ===== COMPONENTS ===== */

function Manj({ size=140, glow=false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" style={{filter:glow?`drop-shadow(0 0 30px ${P.gold}33)`:"none",transition:"all 1s"}}>
      <ellipse cx="100" cy="105" rx="65" ry="75" fill="url(#aur)" opacity="0.5"/>
      <ellipse cx="100" cy="105" rx="55" ry="65" stroke={P.bGold} strokeWidth="0.8" fill="none" opacity={glow?0.5:0.2} style={{transition:"opacity 1s"}}/>
      <ellipse cx="100" cy="170" rx="44" ry="11" fill={P.dRed} opacity="0.5"/>
      {[0,1,2,3,4,5,6].map(i=><ellipse key={i} cx={100+Math.cos((i/7)*Math.PI)*38} cy={170-Math.sin((i/7)*Math.PI)*7} rx="9" ry="5.5" fill={P.lotus} opacity="0.6" stroke={P.dRed} strokeWidth="0.4"/>)}
      <ellipse cx="100" cy="130" rx="22" ry="32" fill={P.gold} opacity="0.15"/>
      <circle cx="100" cy="82" r="16" fill={P.bGold} opacity="0.2" stroke={P.gold} strokeWidth="0.8"/>
      <path d="M93 71 L100 58 L107 71" fill={P.gold} opacity="0.4"/>
      <ellipse cx="95" cy="82" rx="2" ry="0.8" fill={P.dBrown} opacity="0.5"/>
      <ellipse cx="105" cy="82" rx="2" ry="0.8" fill={P.dBrown} opacity="0.5"/>
      <line x1="132" y1="72" x2="140" y2="44" stroke={P.gold} strokeWidth="1.5"/>
      <path d="M137 46 L140 34 L143 46Z" fill={P.saffron} opacity="0.7"/>
      <path d="M113 108 Q128 90 132 72" stroke={P.gold} strokeWidth="1.2" fill="none" opacity="0.35"/>
      <line x1="68" y1="74" x2="62" y2="54" stroke={P.green} strokeWidth="1.2" opacity="0.4"/>
      {[0,1,2,3,4].map(i=><ellipse key={i} cx={62+Math.cos((i/5)*Math.PI+0.3)*7} cy={51-Math.sin((i/5)*Math.PI+0.3)*3.5} rx="4.5" ry="7" fill={P.royalBlue} opacity="0.3" transform={`rotate(${-25+i*13} ${62+Math.cos((i/5)*Math.PI+0.3)*7} ${51-Math.sin((i/5)*Math.PI+0.3)*3.5})`}/>)}
      <rect x="56" y="43" width="12" height="8" rx="1" fill={P.cream} opacity="0.4" stroke={P.gold} strokeWidth="0.4"/>
      <path d="M87 108 Q72 90 68 74" stroke={P.gold} strokeWidth="1.2" fill="none" opacity="0.35"/>
      <defs><radialGradient id="aur" cx="0.5" cy="0.45"><stop offset="0%" stopColor={P.bGold} stopOpacity="0.12"/><stop offset="100%" stopColor={P.bGold} stopOpacity="0"/></radialGradient></defs>
    </svg>
  );
}

function Cld({x,y,s=1,color=P.cream,opacity=0.06,flip=false}){
  return <g transform={`translate(${x},${y}) scale(${flip?-s:s},${s})`}><path d="M0 22C2 16 6 12 12 14C14 8 20 4 28 8C32 2 40 0 46 6C50 2 56 4 58 10C62 8 66 12 64 18C68 22 66 28 60 30C58 34 52 36 46 33C42 36 34 38 28 34C22 38 14 36 10 32C4 34 0 28 0 22Z" fill={color} opacity={opacity}/></g>;
}

function Particles(){
  const ps=useMemo(()=>Array.from({length:16},()=>({l:Math.random()*100,t:Math.random()*100,sz:1.5+Math.random()*2.5,d:7+Math.random()*10,dl:Math.random()*8,c:[P.bGold,P.gold,P.saffron,P.cream][Math.floor(Math.random()*4)]})),[]);
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,overflow:"hidden"}}>{ps.map((p,i)=><div key={i} style={{position:"absolute",left:`${p.l}%`,top:`${p.t}%`,width:p.sz,height:p.sz,borderRadius:"50%",background:p.c,opacity:0,animation:`particle ${p.d}s ease-in-out ${p.dl}s infinite`}}/>)}</div>;
}

function SceneBG({phase}){
  const [sY,setSY]=useState(0);
  useEffect(()=>{const h=()=>setSY(window.scrollY);window.addEventListener("scroll",h,{passive:true});return()=>window.removeEventListener("scroll",h);},[]);
  const w=phase==="result"||phase==="interpreting"||phase==="interpreted";
  const fc=28;
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {/* Base — brighter */}
      <div style={{position:"absolute",inset:0,background:w?"#222A55":"#1C2248",transition:"background 2s"}}/>
      {/* Dawn glow */}
      <div style={{position:"absolute",top:"5%",left:"50%",transform:"translateX(-50%)",width:"200%",height:"90%",
        background:`radial-gradient(ellipse at 50% 55%, ${w?"#403860":"#302850"}66 0%, transparent 55%)`,transition:"background 2s"}}/>
      {/* Horizon warm */}
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:"160%",height:"60%",
        background:`radial-gradient(ellipse at 50% 65%, ${w?P.maroon+"55":P.maroon+"30"} 0%, transparent 55%)`,transition:"background 2s"}}/>
      {/* Gold ambient */}
      <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:"120%",height:"50%",
        background:`radial-gradient(ellipse at 50% 60%, ${w?P.gold+"1C":P.gold+"10"} 0%, transparent 50%)`,transition:"background 2s"}}/>
      {/* Dawn rim */}
      <div style={{position:"absolute",bottom:"20%",left:"50%",transform:"translateX(-50%)",width:"180%",height:"35%",
        background:`radial-gradient(ellipse at 50% 80%, ${w?"#D4A01730":"#D4A01718"} 0%, transparent 50%)`,transition:"background 2s"}}/>
      {/* Lower fill */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"45%",
        background:`linear-gradient(to top, ${w?"#261E42":"#1E1835"} 0%, transparent 100%)`,transition:"background 2s"}}/>
      {/* Wide bloom */}
      <div style={{position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",width:"220%",height:"70%",
        background:`radial-gradient(ellipse at 50% 45%, ${w?"#40356840":"#30284828"} 0%, transparent 45%)`,transition:"background 2s"}}/>

      {/* L1: Mountains back — barely moves */}
      <svg style={{position:"absolute",bottom:0,left:0,width:"100%",height:"55%",transform:`translateY(${sY*0.01}px)`}} viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice">
        <path d="M0 400L0 230C60 160 140 200 220 180C300 160 360 130 440 190C520 150 600 170 680 150C730 140 760 160 800 200L800 400Z" fill={w?"#222C52":"#1A2242"} opacity={w?0.9:0.75} style={{transition:"fill 2s,opacity 2s"}}/>
      </svg>
      {/* L2: Mountains front */}
      <svg style={{position:"absolute",bottom:0,left:0,width:"100%",height:"45%",transform:`translateY(${sY*0.05}px)`}} viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice">
        <path d="M0 400L0 280C100 230 200 260 300 250C400 240 480 220 560 245C640 230 720 240 800 250L800 400Z" fill={P.maroon} opacity={w?0.32:0.18} style={{transition:"opacity 2s"}}/>
      </svg>

      {/* L3: Prayer flags */}
      <div style={{position:"absolute",bottom:"36%",left:"-3%",right:"-3%",transform:`translateY(${sY*0.08}px)`,height:20,display:"flex",alignItems:"flex-start",opacity:w?0.22:0.13,transition:"opacity 2s"}}>
        <svg style={{position:"absolute",top:0,left:0,width:"100%",height:10,overflow:"visible"}} preserveAspectRatio="none" viewBox="0 0 1000 10">
          <path d={`M0 3${Array.from({length:20},(_,i)=>`Q${i*50+25} ${i%2===0?8:1} ${(i+1)*50} ${i%2===0?4:5}`).join(" ")}`} stroke={P.tM} strokeWidth="0.5" fill="none" opacity="0.3"/>
        </svg>
        <div style={{display:"flex",width:"100%",paddingTop:2}}>{Array.from({length:fc},(_,i)=><div key={i} style={{flex:1,height:12,marginTop:Math.sin(i*0.5)*2.5,background:FC[i%5],clipPath:"polygon(0 0,100% 0,100% 80%,50% 100%,0 80%)",animation:`flagW 4s ease-in-out ${i*0.12}s infinite`}}/>)}</div>
      </div>

      {/* L4: Clouds — noticeable movement */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",transform:`translateY(${sY*0.15}px)`}} viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
        <Cld x={-30} y={40} s={4} opacity={w?0.1:0.07}/><Cld x={500} y={80} s={3.5} flip opacity={w?0.09:0.06}/>
        <Cld x={60} y={350} s={3.2} opacity={w?0.07:0.045}/><Cld x={420} y={450} s={3.8} flip opacity={w?0.06:0.04}/>
        <Cld x={-40} y={600} s={3} opacity={w?0.05:0.035}/><Cld x={550} y={700} s={2.5} flip opacity={w?0.045:0.03}/>
      </svg>
      {/* L5: Gold wisps — fastest, very noticeable */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",transform:`translateY(${sY*0.35}px)`}} viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
        <Cld x={150} y={120} s={2} color={P.gold} opacity={w?0.04:0.02}/><Cld x={450} y={350} s={1.8} color={P.gold} flip opacity={w?0.035:0.018}/>
        <Cld x={250} y={600} s={1.5} color={P.saffron} opacity={w?0.03:0.012}/>
      </svg>
      {/* Dots */}
      <svg style={{position:"absolute",inset:0,opacity:0.03}} width="100%" height="100%"><defs><pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="0.6" fill={P.gold}/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
      {/* Scanlines — no vignette anymore */}
      <div style={{position:"absolute",inset:0,opacity:0.012,background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.03) 2px,rgba(255,255,255,0.03) 4px)"}}/>
    </div>
  );
}

function Die({idx,rolling,size=92}){
  const c=SC[idx];
  return(
    <div style={{width:size,height:size,background:`radial-gradient(ellipse at 38% 32%,${P.parchment},${P.cream}dd)`,border:`2px solid ${P.gold}`,borderRadius:6,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",boxShadow:`0 4px 18px ${P.dBrown}44,inset 0 1px 0 ${P.wWhite}88`,animation:rolling?"shake 0.12s ease infinite":"none"}}>
      <div style={{position:"absolute",inset:4,border:`1px solid ${P.gold}28`,borderRadius:3}}/>
      <span style={{fontSize:size*0.48,color:rolling?P.dBrown+"44":c,lineHeight:1,transition:"color 0.2s",textShadow:rolling?"none":`0 2px 6px ${c}44`}}>{TIB[idx]}</span>
      <span style={{fontSize:9,color:rolling?P.dBrown+"33":P.dBrown+"99",letterSpacing:2,marginTop:4,fontFamily:"'Space Mono',monospace"}}>{SYL[idx]}</span>
    </div>
  );
}

function Incense(){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:10}}>
      <div style={{position:"relative",width:16,height:45}}>
        {[0,1,2].map(i=><div key={i} style={{position:"absolute",bottom:18,left:"50%",width:1+i,height:25+i*10,background:`linear-gradient(to top,${P.gold}20,transparent)`,filter:"blur(2px)",animation:`smoke ${3.5+i*0.8}s ease-in-out infinite`,animationDelay:`${i*0.4}s`,transformOrigin:"bottom center"}}/>)}
        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:2,height:20,background:`linear-gradient(to top,${P.saffron}66,${P.dBrown}33)`,borderRadius:1}}/>
      </div>
      <div style={{width:14,height:5,background:P.dBrown,borderRadius:"50%",opacity:0.3}}/>
    </div>
  );
}

function EK({size=22}){return <svg width={size} height={size} viewBox="0 0 50 50" opacity="0.25"><path d="M15 10L35 10Q42 10 42 17L42 20Q42 25 37 25L13 25Q8 25 8 30L8 33Q8 40 15 40L35 40Q42 40 42 33L42 30Q42 25 37 25" stroke={P.gold} strokeWidth="2" fill="none"/><path d="M15 10Q8 10 8 17L8 20Q8 25 13 25L37 25Q42 25 42 30L42 33Q42 40 35 40L15 40Q8 40 8 33L8 30Q8 25 13 25" stroke={P.gold} strokeWidth="2" fill="none"/></svg>;}

/* ===== CARD GENERATOR ===== */
function wrapT(ctx,text,mw){const w=text.split(" "),ls=[];let l="";w.forEach(v=>{const t=l+(l?" ":"")+v;if(ctx.measureText(t).width>mw&&l){ls.push(l);l=v;}else l=t;});if(l)ls.push(l);return ls;}

function drawManjCard(x,cx,cy,sz){
  const s=sz/100;x.save();x.translate(cx,cy);
  const ag=x.createRadialGradient(0,-10*s,5*s,0,-10*s,45*s);ag.addColorStop(0,"#F0C04015");ag.addColorStop(1,"#F0C04000");
  x.fillStyle=ag;x.beginPath();x.ellipse(0,-10*s,45*s,52*s,0,0,Math.PI*2);x.fill();
  x.fillStyle="#8B1A1A88";x.beginPath();x.ellipse(0,32*s,30*s,7*s,0,0,Math.PI*2);x.fill();
  for(let i=0;i<6;i++){const a=(i/6)*Math.PI;x.fillStyle="#E8A0B0aa";x.beginPath();x.ellipse(Math.cos(a)*25*s,32*s-Math.sin(a)*4*s,6*s,4*s,0,0,Math.PI*2);x.fill();}
  x.fillStyle="#D4A01720";x.beginPath();x.ellipse(0,8*s,14*s,22*s,0,0,Math.PI*2);x.fill();
  x.fillStyle="#F0C04025";x.beginPath();x.arc(0,-22*s,10*s,0,Math.PI*2);x.fill();
  x.strokeStyle="#D4A01766";x.lineWidth=0.6*s;x.stroke();
  x.fillStyle="#D4A01755";x.beginPath();x.moveTo(-5*s,-30*s);x.lineTo(0,-38*s);x.lineTo(5*s,-30*s);x.fill();
  x.strokeStyle="#D4A01788";x.lineWidth=1.2*s;x.beginPath();x.moveTo(22*s,-12*s);x.lineTo(28*s,-32*s);x.stroke();
  x.fillStyle="#E67E2288";x.beginPath();x.moveTo(26*s,-30*s);x.lineTo(28*s,-40*s);x.lineTo(30*s,-30*s);x.fill();
  x.strokeStyle="#00875A66";x.lineWidth=1*s;x.beginPath();x.moveTo(-22*s,-12*s);x.lineTo(-26*s,-30*s);x.stroke();
  x.fillStyle="#2744A044";for(let i=0;i<4;i++){x.beginPath();x.ellipse(-26*s+Math.cos(i*0.8)*4*s,-33*s,3*s,5*s,i*0.4,0,Math.PI*2);x.fill();}
  x.restore();
}

function genCard(c,interp,q,ns){
  const W=640,H=1000,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#1A2248");bg.addColorStop(0.3,"#232852");bg.addColorStop(0.6,"#2C1E42");bg.addColorStop(1,"#1A2248");
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const bars=["#2744A0","#FBF5E6","#E8302A","#00875A","#F5B800"];
  bars.forEach((cl,i)=>{x.fillStyle=cl;x.fillRect(i*(W/5),0,W/5,8);});
  x.strokeStyle="#F0C04020";x.lineWidth=1;x.strokeRect(16,16,W-32,H-32);
  drawManjCard(x,W/2,90,80);
  x.fillStyle="#A8987877";x.font="bold 11px monospace";x.textAlign="center";
  x.fillText("TCCT \u00B7 MO DIVINATION",W/2,158);
  const dS=120,dGap=24,d1x=W/2-dS-dGap/2,d2x=W/2+dGap/2,dY=175;
  [c.i1,c.i2].forEach((idx,di)=>{
    const dx=di===0?d1x:d2x;
    x.fillStyle="#EDE0C8";x.beginPath();x.roundRect(dx,dY,dS,dS,6);x.fill();
    x.strokeStyle="#D4A017";x.lineWidth=2.5;x.beginPath();x.roundRect(dx,dY,dS,dS,6);x.stroke();
    x.strokeStyle="#D4A01730";x.lineWidth=1;x.beginPath();x.roundRect(dx+7,dY+7,dS-14,dS-14,3);x.stroke();
    x.fillStyle=SC[idx];x.font="60px serif";x.textAlign="center";
    x.fillText(TIB[idx],dx+dS/2,dY+dS/2+20);
    x.fillStyle="#2C181099";x.font="bold 12px monospace";
    x.fillText(SYL[idx],dx+dS/2,dY+dS-12);
  });
  let y=dY+dS+30;x.fillStyle="#A8987888";x.font="bold 16px monospace";x.textAlign="center";
  x.fillText(c.s1+" \u00B7 "+c.s2,W/2,y);
  y+=14;x.strokeStyle="#F0C04022";x.lineWidth=1;x.beginPath();x.moveTo(70,y);x.lineTo(W-70,y);x.stroke();
  y+=38;x.fillStyle="#F0C040";x.font="34px Georgia,serif";
  wrapT(x,c.name,W-60).forEach(l=>{x.fillText(l,W/2,y);y+=40;});
  y+=4;x.fillStyle=ns.color;x.font="bold 13px monospace";x.fillText(ns.label.toUpperCase(),W/2,y);
  y+=34;x.fillStyle="#D6C9ABdd";x.font="italic 18px Georgia,serif";
  wrapT(x,"\u201C"+q+"\u201D",W-70).slice(0,3).forEach(l=>{x.fillText(l,W/2,y);y+=24;});
  y+=10;x.strokeStyle="#F0C04015";x.beginPath();x.moveTo(70,y);x.lineTo(W-70,y);x.stroke();
  y+=26;x.fillStyle="#F2E8D0ee";x.font="italic 19px Georgia,serif";
  wrapT(x,c.desc,W-60).slice(0,6).forEach(l=>{x.fillText(l,W/2,y);y+=26;});
  y+=10;x.fillStyle="#D6C9ABdd";x.font="17px Georgia,serif";
  wrapT(x,c.advice,W-60).slice(0,5).forEach(l=>{x.fillText(l,W/2,y);y+=24;});
  if(interp&&interp.length>5){
    y+=18;const iS=y;x.fillStyle="#F2E8D0aa";x.font="14px Georgia,serif";x.textAlign="left";
    const iL=wrapT(x,interp.replace(/\n+/g," "),W-100),av=Math.floor((H-70-y)/19),mL=Math.min(iL.length,Math.max(av,3));
    iL.slice(0,mL).forEach(l=>{x.fillText(l,56,y);y+=19;});
    x.strokeStyle="#008B8B55";x.lineWidth=2;x.beginPath();x.moveTo(42,iS-4);x.lineTo(42,y+2);x.stroke();x.textAlign="center";
  }
  bars.forEach((cl,i)=>{x.fillStyle=cl;x.fillRect(i*(W/5),H-8,W/5,8);});
  x.fillStyle="#A8987855";x.font="11px monospace";x.textAlign="center";
  x.fillText("Tibetan Crypto Calendar",W/2,H-36);x.fillText("mo-tcct.vercel.app \u00B7 @tcct_tcct",W/2,H-20);
  return cv;
}


/* ===== MAIN ===== */
export default function App(){
  const [phase,setPhase]=useState("question");
  const [question,setQ]=useState("");
  const [r1,sR1]=useState(null),[r2,sR2]=useState(null);
  const [d1,sD1]=useState(0),[d2,sD2]=useState(0);
  const [combo,sCombo]=useState(null);
  const [interp,sInterp]=useState("");
  const [streaming,sSt]=useState(false);
  const [apiSt,sApiSt]=useState(null);
  const [showInfo,sShowInfo]=useState(false);
  const [showCard,sShowCard]=useState(false);
  const [cardUrl,sCardUrl]=useState(null);
  const [mantraIdx,sMantraIdx]=useState(-1); // karaoke index
  const rollRef=useRef(null),resRef=useRef(null);
  const hr=phase==="result"||phase==="interpreting"||phase==="interpreted";
  const ns=combo?NS[combo.nature]:NS.excellent;

  // Karaoke mantra during roll
  const runMantra=useCallback(()=>{
    let idx=0,round=0;
    const iv=setInterval(()=>{
      sMantraIdx(idx%6);idx++;
      if(idx%6===0)round++;
      if(round>=2){clearInterval(iv);sMantraIdx(-1);}
    },180);
  },[]);

  const cast=useCallback(()=>{
    if(!question.trim())return;
    setPhase("rolling");sR1(null);sR2(null);sCombo(null);sInterp("");sApiSt(null);sShowCard(false);sCardUrl(null);
    runMantra();
    let c=0;
    rollRef.current=setInterval(()=>{sD1(Math.floor(Math.random()*6));sD2(Math.floor(Math.random()*6));c++;
      if(c>20){const a=Math.floor(Math.random()*6);sR1(a);sD1(a);let c2=0;
        const i2=setInterval(()=>{sD2(Math.floor(Math.random()*6));c2++;
          if(c2>12){const b=Math.floor(Math.random()*6);sR2(b);sD2(b);clearInterval(i2);
            const key=`${SYL[a]}-${SYL[b]}`;sCombo({...MO[key],key,s1:SYL[a],s2:SYL[b],i1:a,i2:b});setPhase("result");}
        },120);clearInterval(rollRef.current);}
    },70);
  },[question,runMantra]);

  const genLocal=useCallback(c=>{
    const e=c.element.split("-"),eW={space:"openness",fire:"clarity",water:"depth",wind:"energy",earth:"stability",wisdom:"knowing"};
    const o={excellent:`The dice reveal ${c.name}—deeply auspicious. ${eW[e[0]]} meets ${eW[e[1]]}.`,good:`${c.name}—auspicious. ${eW[e[0]]} meets ${eW[e[1]]}.`,mixed:`${c.name}—dual forces. ${eW[e[0]]} and ${eW[e[1]]} ask discernment.`,unfavorable:`${c.name}—obstacles. ${eW[e[0]]} and ${eW[e[1]]} signal patience.`};
    return`${o[c.nature]}\n\n${c.desc}\n\n${c.advice}`;
  },[]);

  const seek=useCallback(async()=>{
    if(!combo||!question.trim())return;setPhase("interpreting");sSt(true);sInterp("");sApiSt("loading");
    const doS=(text,src)=>{sApiSt(src);let i=0;const si=setInterval(()=>{i+=2+Math.floor(Math.random()*3);if(i>=text.length){sInterp(text);sSt(false);setPhase("interpreted");clearInterval(si);}else sInterp(text.slice(0,i));},20);};
    try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),15000);
      const res=await fetch("/api/interpret",{method:"POST",headers:{"Content-Type":"application/json"},signal:ac.signal,body:JSON.stringify({question,combination:combo})});
      clearTimeout(to);if(!res.ok)throw 0;const d=await res.json();if(!d.text||d.text.length<20)throw 0;doS(d.text,"api");
    }catch{doS(genLocal(combo),"local");}
  },[combo,question,genLocal]);

  const getCard=useCallback(()=>{
    if(!combo)return;
    const cv=genCard(combo,interp,question,ns);
    sCardUrl(cv.toDataURL("image/png"));sShowCard(true);
  },[combo,interp,question,ns]);

  const dlCard=useCallback(()=>{if(!cardUrl)return;const a=document.createElement("a");a.download=`mo-${combo.s1}-${combo.s2}.png`;a.href=cardUrl;a.click();},[cardUrl,combo]);

  useEffect(()=>{if(phase==="result"&&resRef.current)setTimeout(()=>resRef.current?.scrollIntoView({behavior:"smooth",block:"center"}),500);},[phase]);
  const reset=()=>{setPhase("question");setQ("");sR1(null);sR2(null);sCombo(null);sInterp("");sSt(false);sApiSt(null);sShowCard(false);sCardUrl(null);sMantraIdx(-1);};

  return(
    <div style={{minHeight:"100vh",color:P.t1,fontFamily:"'Cormorant Garamond',Georgia,serif",position:"relative",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
        @keyframes shake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-2px,1px) rotate(-3deg)}50%{transform:translate(1px,-1px) rotate(2deg)}75%{transform:translate(-1px,-1px) rotate(-2deg)}}
        @keyframes smoke{0%{transform:translateX(-50%) scaleX(1) translateY(0);opacity:0.2}50%{transform:translateX(calc(-50% + 5px)) scaleX(1.6) translateY(-25px);opacity:0.1}100%{transform:translateX(calc(-50% - 4px)) scaleX(2) translateY(-45px);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes syllF{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes particle{0%,100%{opacity:0;transform:translate(0,0)}20%{opacity:0.5}50%{opacity:0.1;transform:translate(10px,-22px)}80%{opacity:0.35}}
        @keyframes flagW{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(2px) rotate(1deg)}}
        @keyframes glowP{0%,100%{box-shadow:0 0 20px ${P.bGold}06}50%{box-shadow:0 0 45px ${P.bGold}12}}
        @keyframes mantraGlow{0%{transform:scale(1);opacity:0.6}50%{transform:scale(1.5);opacity:1}100%{transform:scale(1);opacity:0.6}}
        textarea:focus{outline:none} textarea::placeholder{color:${P.tM}88}
        .cb{background:${P.yellow};color:${P.navy};border:none;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:15px 40px;cursor:pointer;transition:all 0.2s}
        .cb:hover{background:${P.orange};transform:translateY(-1px);box-shadow:0 4px 20px ${P.orange}44}
        .cb:disabled{opacity:0.15;cursor:default;transform:none;box-shadow:none}.cb:disabled:hover{background:${P.yellow}}
        .sb{background:transparent;color:${P.teal};border:2px solid ${P.teal};font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:12px 32px;cursor:pointer;transition:all 0.2s}
        .sb:hover{background:${P.teal}15}
        .nb{background:transparent;color:${P.t2};border:1px solid ${P.tM}33;font-family:'Space Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;cursor:pointer;transition:all 0.2s}
        .nb:hover{border-color:${P.t2};color:${P.t1}}
        .gb{background:${P.gold}18;color:${P.bGold};border:1px solid ${P.gold}55;font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:12px 28px;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center}
        .gb:hover{border-color:${P.gold};background:${P.gold}25}
        .ib{background:transparent;color:${P.tM}88;border:1px solid ${P.tM}33;font-family:'Space Mono',monospace;font-size:9px;letter-spacing:1px;padding:6px 14px;cursor:pointer;transition:all 0.2s}
        .ib:hover{color:${P.t2};border-color:${P.tM}66}
      `}</style>

      <SceneBG phase={phase}/>
      <Particles/>
      <div style={{position:"fixed",inset:10,border:`1px solid ${P.gold}10`,pointerEvents:"none",zIndex:2}}/>
      {/* Color bar */}
      <div style={{position:"relative",zIndex:5,display:"flex",height:5}}>{FC.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}</div>

      {/* CONTENT */}
      <div style={{position:"relative",zIndex:3,maxWidth:560,margin:"0 auto",padding:"12px 16px 70px"}}>

        {/* MANJUSHRI — big when idle, small+corner when result */}
        <div style={{
          textAlign:hr?"left":"center",
          display:"flex",flexDirection:hr?"row":"column",alignItems:"center",
          gap:hr?12:0,
          transition:"all 0.8s cubic-bezier(0.4,0,0.2,1)",
          marginBottom:hr?12:0,paddingTop:hr?0:8
        }}>
          <div style={{transition:"all 0.8s cubic-bezier(0.4,0,0.2,1)"}}>
            <Manj size={hr?70:150} glow={hr}/>
          </div>
          <div style={{textAlign:hr?"left":"center",transition:"all 0.8s"}}>
            <div style={{fontSize:9,letterSpacing:6,color:P.tM+"77",fontFamily:"'Space Mono',monospace"}}>TCCT</div>
            <h1 style={{fontSize:hr?28:48,fontWeight:700,color:P.bGold,textShadow:`0 0 40px ${P.gold}33`,lineHeight:1,margin:"2px 0",letterSpacing:-1,fontFamily:"'Space Mono',monospace",transition:"font-size 0.8s"}}>MO</h1>
            {!hr&&<p style={{fontSize:9,letterSpacing:5,color:P.tM,textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>Tibetan Dice Oracle</p>}
          </div>
        </div>

        {/* Divider */}
        {!hr&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,margin:"10px 0"}}>
          <div style={{width:24,height:2,background:P.red+"66"}}/><div style={{width:24,height:2,background:P.royalBlue+"66"}}/>
          <EK/><div style={{width:24,height:2,background:P.green+"66"}}/><div style={{width:24,height:2,background:P.orange+"66"}}/>
        </div>}

        {/* MANTRA SYLLABLES — with karaoke glow during roll */}
        <div style={{display:"flex",justifyContent:"center",gap:2,margin:`0 0 ${hr?16:20}px`}}>
          {SYL.map((s,i)=>{
            const active=mantraIdx===i;
            return(
              <div key={i} style={{
                textAlign:"center",padding:"5px 6px 4px",flex:"0 1 auto",
                background:active?SC[i]+"20":SC[i]+"0A",borderTop:`3px solid ${SC[i]}`,
                animation:active?"none":`syllF ${3+i*0.3}s ease-in-out infinite`,
                animationDelay:`${i*0.15}s`,
                transform:active?"scale(1.35)":"scale(1)",
                transition:"transform 0.15s,background 0.15s",zIndex:active?10:1,position:"relative"
              }}>
                <span style={{fontSize:active?38:30,color:SC[i],display:"block",lineHeight:1.15,
                  textShadow:active?`0 0 20px ${SC[i]}88,0 0 40px ${SC[i]}44`:`0 0 12px ${SC[i]}30`,
                  transition:"font-size 0.15s,text-shadow 0.15s"
                }}>{TIB[i]}</span>
                <span style={{fontSize:8,color:SC[i],letterSpacing:1,fontFamily:"'Space Mono',monospace",fontWeight:700,display:"block",opacity:active?1:0.6,marginTop:2,transition:"opacity 0.15s"}}>{s}</span>
              </div>
            );
          })}
        </div>

        {/* What is Mo? */}
        {!hr&&<div style={{textAlign:"center",marginBottom:16}}><button className="ib" onClick={()=>sShowInfo(true)}>What is Mo?</button></div>}

        {/* QUESTION */}
        <section style={{animation:"fadeIn 0.5s ease",marginBottom:20}}>
          <label style={{display:"block",fontSize:9,letterSpacing:3,color:P.tM,marginBottom:6,textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>
            {phase==="question"?"What do you seek?":"Your question"}
          </label>
          <textarea value={question} onChange={e=>setQ(e.target.value)} placeholder="Speak your question to Manjushri..."
            disabled={phase==="rolling"} rows={phase==="question"?3:2}
            style={{width:"100%",background:P.navy+"cc",border:`1px solid ${P.royalBlue}33`,color:P.t1,fontFamily:"'Space Mono',monospace",fontSize:16,padding:"12px 14px",resize:"none",lineHeight:1.7,transition:"border-color 0.3s",WebkitTextSizeAdjust:"100%"}}
            onFocus={e=>e.target.style.borderColor=P.yellow} onBlur={e=>e.target.style.borderColor=P.royalBlue+"33"}/>
          {phase==="question"&&<p style={{fontSize:9,color:P.tM+"66",marginTop:6,textAlign:"center",letterSpacing:4,fontFamily:"'Space Mono',monospace"}}>OM AH RA PA TSA NA DHI</p>}
        </section>

        {/* CAST */}
        {(phase==="question"||phase==="interpreted")&&<div style={{textAlign:"center",marginBottom:24,animation:"fadeIn 0.4s ease"}}>
          <button className="cb" onClick={cast} disabled={!question.trim()}>{phase==="interpreted"?"Cast Again":"Cast the Dice"}</button>
        </div>}

        {/* DICE */}
        {phase!=="question"&&<div style={{animation:"fadeUp 0.6s ease"}}>
          <Incense/>
          <div style={{background:`linear-gradient(135deg,${P.dRed}28,${P.maroon}35)`,border:`1px solid ${P.gold}22`,padding:"20px 12px",display:"flex",justifyContent:"center",alignItems:"center",gap:16,marginBottom:24,position:"relative"}}>
            {[{top:-1,left:-1},{top:-1,right:-1},{bottom:-1,left:-1},{bottom:-1,right:-1}].map((pos,i)=><div key={i} style={{position:"absolute",...pos,width:8,height:8,background:P.gold,opacity:0.1}}/>)}
            <Die idx={r1!==null?r1:d1} rolling={r1===null&&phase==="rolling"}/>
            <div style={{width:1,height:50,background:`linear-gradient(to bottom,transparent,${P.gold}15,transparent)`}}/>
            <Die idx={r2!==null?r2:d2} rolling={r2===null&&phase==="rolling"}/>
          </div>
        </div>}

        {/* RESULT */}
        {combo&&phase!=="rolling"&&<div ref={resRef} style={{animation:"fadeUp 0.8s ease"}}>
          <div style={{background:"linear-gradient(180deg,#1A2242cc,#1A2242aa)",border:`1px solid ${P.gold}22`,overflow:"hidden",marginBottom:20,animation:"glowP 4s ease infinite"}}>
            <div style={{background:`linear-gradient(90deg,transparent,${ns.color}40,transparent)`,height:3}}/>
            <div style={{textAlign:"center",padding:"16px 14px 12px"}}>
              <div style={{fontSize:10,letterSpacing:6,color:P.tM,fontFamily:"'Space Mono',monospace",marginBottom:4}}>{combo.s1} · {combo.s2}</div>
              <h2 style={{fontSize:20,fontWeight:400,color:P.bGold,textShadow:`0 0 20px ${P.gold}22`,lineHeight:1.3,marginBottom:10}}>{combo.name}</h2>
              <span style={{display:"inline-block",fontSize:8,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:ns.color,background:ns.bg,padding:"3px 10px",border:`1px solid ${ns.color}33`,fontFamily:"'Space Mono',monospace"}}>{ns.label}</span>
            </div>
            <div style={{height:1,background:`linear-gradient(90deg,transparent,${P.gold}15,transparent)`,margin:"0 14px"}}/>
            <div style={{padding:"12px 14px 16px"}}>
              <p style={{fontSize:14,lineHeight:1.85,color:P.t1,marginBottom:10,fontStyle:"italic",wordBreak:"break-word"}}>{combo.desc}</p>
              <p style={{fontSize:13,lineHeight:1.85,color:P.t2,wordBreak:"break-word"}}>{combo.advice}</p>
            </div>
          </div>

          {phase==="result"&&<div style={{textAlign:"center",marginBottom:24,animation:"fadeIn 0.5s ease"}}><button className="sb" onClick={seek}>Seek Guidance</button></div>}

          {(phase==="interpreting"||phase==="interpreted")&&<div style={{animation:"fadeUp 0.6s ease",marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:14,height:3,background:P.teal}}/><span style={{fontSize:8,letterSpacing:3,textTransform:"uppercase",color:P.teal,fontFamily:"'Space Mono',monospace"}}>Interpretation</span>
              <div style={{flex:1,height:1,background:`linear-gradient(90deg,${P.teal}25,transparent)`}}/>
            </div>
            {apiSt==="loading"&&!interp&&<div style={{textAlign:"center",padding:"24px 12px"}}><div style={{display:"inline-block",width:18,height:18,border:`2px solid ${P.tM}18`,borderTopColor:P.teal,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{fontSize:11,color:P.tM,marginTop:10,fontStyle:"italic"}}>Consulting Manjushri...</p></div>}
            {interp&&<div style={{background:P.teal+"08",borderLeft:`3px solid ${P.teal}`,padding:"12px 12px"}}><p style={{fontSize:13,lineHeight:1.9,color:P.t1,whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"break-word"}}>
              {interp}{streaming&&<span style={{display:"inline-block",width:6,height:2,background:P.teal,marginLeft:2,verticalAlign:"middle",animation:"pulse 0.8s ease infinite"}}/>}
            </p></div>}
          </div>}

          {(phase==="result"||phase==="interpreted")&&<div style={{textAlign:"center",marginTop:24,animation:"fadeIn 0.4s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            {phase==="interpreted"&&<button className="gb" onClick={getCard}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6,verticalAlign:"-2px"}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              Get Card
            </button>}
            <button className="nb" onClick={reset}>Begin Again</button>
          </div>}
        </div>}

        {/* FOOTER */}
        <footer style={{textAlign:"center",marginTop:44}}>
          <div style={{display:"flex",height:3}}>{FC.map((c,i)=><div key={i} style={{flex:1,background:c}}/>)}</div>
          <p style={{fontSize:8,color:P.tM+"55",letterSpacing:1,fontFamily:"'Space Mono',monospace",marginTop:10}}>Mo · Jamgon Mipham Rinpoche</p>
          <p style={{fontSize:9,color:P.tM+"44",letterSpacing:2,marginTop:4,fontFamily:"'Space Mono',monospace"}}>Tibetan Crypto Calendar</p>
          <a href="https://x.com/tcct_tcct" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:9,color:P.gold+"55",letterSpacing:2,marginTop:6,fontFamily:"'Space Mono',monospace",textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.color=P.gold} onMouseLeave={e=>e.currentTarget.style.color=P.gold+"55"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            @tcct_tcct
          </a>
        </footer>
      </div>

      {/* ===== CARD PREVIEW MODAL ===== */}
      {showCard&&cardUrl&&<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>sShowCard(false)}>
        <div style={{position:"absolute",inset:0,background:"#0A0E1Add"}}/>
        <div style={{position:"relative",maxWidth:340,width:"100%",animation:"fadeUp 0.3s ease"}} onClick={e=>e.stopPropagation()}>
          <img src={cardUrl} alt="Mo Result Card" style={{width:"100%",height:"auto",display:"block",border:`1px solid ${P.gold}22`}}/>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:14}}>
            <button className="gb" onClick={dlCard}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginRight:6}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Save
            </button>
            <button className="nb" onClick={()=>sShowCard(false)}>Close</button>
          </div>
        </div>
      </div>}

      {/* ===== INFO MODAL ===== */}
      {showInfo&&<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>sShowInfo(false)}>
        <div style={{position:"absolute",inset:0,background:"#0A0E1Add"}}/>
        <div style={{position:"relative",maxWidth:500,maxHeight:"85vh",overflow:"auto",background:"#161E3A",border:`1px solid ${P.gold}22`,padding:"24px 18px",width:"100%",animation:"fadeUp 0.3s ease"}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>sShowInfo(false)} style={{position:"absolute",top:12,right:14,background:"none",border:"none",color:P.tM,fontSize:20,cursor:"pointer",padding:4,lineHeight:1}}>×</button>
          <h3 style={{fontSize:18,color:P.bGold,marginBottom:12,fontWeight:400}}>What is Mo?</h3>
          <p style={{fontSize:13,lineHeight:1.8,color:P.t2,marginBottom:14}}>Mo is an ancient Tibetan system of divination based on Buddhist philosophy. A die inscribed with six syllables of the Manjushri mantra — AH, RA, PA, TSA, NA, DHI — is cast twice, producing one of 36 combinations. Each carries guidance rooted in the wisdom of Manjushri, the Bodhisattva of Wisdom.</p>
          <p style={{fontSize:13,lineHeight:1.8,color:P.t2,marginBottom:20}}>Based on the divination manual of Jamgon Mipham Rinpoche (1846–1912). Before casting, one visualizes Manjushri and recites: OM AH RA PA TSA NA DHI.</p>
          <h4 style={{fontSize:10,letterSpacing:3,color:P.tM,fontFamily:"'Space Mono',monospace",textTransform:"uppercase",marginBottom:12}}>The 36 Combinations</h4>
          {SYL.map((s,si)=>(
            <div key={si} style={{marginBottom:18}}>
              {/* Big syllable section header */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,paddingBottom:6,borderBottom:`2px solid ${SC[si]}33`}}>
                <span style={{fontSize:36,color:SC[si],lineHeight:1,textShadow:`0 0 10px ${SC[si]}30`}}>{TIB[si]}</span>
                <span style={{fontSize:11,color:SC[si],letterSpacing:3,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{s}</span>
              </div>
              {SYL.map((s2,si2)=>{const k=`${s}-${s2}`;const c=MO[k];return(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"4px 0 4px 8px",borderBottom:`1px solid ${P.tM}0A`}}>
                  <span style={{fontSize:10,color:P.tM,fontFamily:"'Space Mono',monospace",minWidth:50}}>{s}·{s2}</span>
                  <span style={{fontSize:12,color:P.t2,textAlign:"right"}}>{c.name}</span>
                </div>
              );})}
            </div>
          ))}
          <div style={{textAlign:"center",marginTop:16}}><button className="ib" onClick={()=>sShowInfo(false)}>Close</button></div>
        </div>
      </div>}
    </div>
  );
}
