const $=s=>document.querySelector(s);
const C={temp:'#2f8cff',ph:'#14c8a8',do:'#a45cf0',tu:'#ff9f1a'};
const rnd=(a,b)=>a+Math.random()*(b-a);
const S={temp:26.8,ph:7.2,do:6.8,tu:4.2,nh3:0.1};
const series=(n,base,j)=>Array.from({length:n},()=>+(base+rnd(-j,j)).toFixed(2));
let day24={temp:series(25,24.5,1),ph:series(25,7.2,.25),do:series(25,6.8,.3)};

function chart(cv,lines,labels,max,grid){
  const d=devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;cv.width=w*d;cv.height=h*d;
  const x=cv.getContext('2d');x.scale(d,d);x.clearRect(0,0,w,h);
  const L=34,B=22,T=8,R=10,iw=w-L-R,ih=h-B-T;
  x.font='11px system-ui';x.fillStyle='#9fb4dc';x.strokeStyle='#17356f';x.textAlign='right';
  for(let i=0;i<=grid;i++){const y=T+ih-ih*i/grid;x.beginPath();x.moveTo(L,y);x.lineTo(w-R,y);x.stroke();x.fillText(Math.round(max*i/grid),L-6,y+4)}
  x.textAlign='center';const n=lines[0].length;
  labels.forEach((t,i)=>{const px=L+iw*i/(labels.length-1);x.fillText(t,px,h-6)});
  lines.forEach(l=>{x.strokeStyle=l.c;x.fillStyle=l.c;x.lineWidth=2;x.beginPath();
    l.d.forEach((v,i)=>{const px=L+iw*i/(n-1),py=T+ih-ih*v/max;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
    l.d.forEach((v,i)=>{x.beginPath();x.arc(L+iw*i/(n-1),T+ih-ih*v/max,2.5,0,7);x.fill()})});
}
const hrs=['12 AM','3 AM','6 AM','9 AM','12 PM','3 PM','6 PM','9 PM','12 AM'];
function drawTrend(){chart($('#trend'),[{d:day24.temp,c:C.temp},{d:day24.ph.map(v=>v*1.8),c:C.ph},{d:day24.do.map(v=>v*1.25),c:C.do}],hrs,35,5)}
let hist=null;
function drawHist(){const n=+$('#range').value;
  if(!hist||hist.n!==n)hist={n,temp:series(n,26,.8),ph:series(n,7.2,.15),do:series(n,6.8,.3),tu:series(n,4.2,.4)};
  const lab=Array.from({length:n},(_,i)=>{const d=new Date(Date.now()-(n-1-i)*864e5);return (i%(n>7?3:1)===0)?d.getDate()+' '+d.toLocaleString('en',{month:'short'}):''});
  chart($('#hist'),[['temp'],['ph'],['do'],['tu']].map(([k])=>({d:hist[k],c:C[k]})),lab,35,5)}

const sensors=[['Temperature','🌡','#1b5fd1','temp',v=>v.toFixed(1)+' °C',[20,32]],['pH','💧','#12a39a','ph',v=>v.toFixed(1),[6.5,8.5]],
['Dissolved Oxygen (DO)','✦','#3b6be0','do',v=>v.toFixed(1)+' mg/L',[5,12]],['Turbidity','≋','#ee7d2a','tu',v=>v.toFixed(1)+' NTU',[0,10]],['Ammonia (NH₃)','⚗','#2e9e5a','nh3',v=>v.toFixed(1)+' mg/L',[0,0.5]]];
$('#sensors').innerHTML=sensors.map(s=>`<li><span class="si" style="background:${s[2]}">${s[1]}</span><div>${s[0]}<b id="s-${s[3]}"></b></div><span class="pill" id="p-${s[3]}">Normal</span></li>`).join('');
let esp32Connected = false;

// Dashboard par connection status dikhane ke liye
function showESP32Status(connected) {
  let status = document.getElementById("esp32Status");

  if (!status) {
    status = document.createElement("div");
    status.id = "esp32Status";
    status.style.cssText =
      "position:fixed;top:12px;right:12px;z-index:9999;padding:8px 14px;border-radius:20px;font-size:13px;font-weight:bold;box-shadow:0 2px 8px #0002;";
    document.body.appendChild(status);
  }

  status.textContent = connected
    ? "● ESP32 Connected"
    : "● ESP32 Disconnected";

  status.style.background = connected ? "#d1fae5" : "#fee2e2";
  status.style.color = connected ? "#065f46" : "#991b1b";
}

async function fetchESP32Data() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      "http://10.235.80.204/data",
      { signal: controller.signal, cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }

    const data = await response.json();

    // Check that all received readings are valid numbers
    const temperature = Number(data.temperature);
    const ph = Number(data.ph);
    const turbidity = Number(data.turbidity);

    if (![temperature, ph, turbidity].every(Number.isFinite)) {
      throw new Error("Invalid sensor data");
    }

    S.temp = temperature;
    S.ph = ph;
    S.tu = turbidity;

    esp32Connected = true;
    showESP32Status(true);
    render();

    console.log("ESP32 Live Data:", data);

  } catch (error) {
    esp32Connected = false;
    showESP32Status(false);
    console.warn("ESP32 connection issue:", error.message);

  } finally {
    clearTimeout(timeout);
  }
}
function render(){
  $('#c-temp').textContent=S.temp.toFixed(1);$('#c-ph').textContent=S.ph.toFixed(1);$('#c-do').textContent=S.do.toFixed(1);$('#c-tu').textContent=S.tu.toFixed(1);
  let bad=0;sensors.forEach(s=>{const v=S[s[3]],ok=v>=s[5][0]&&v<=s[5][1];if(!ok)bad++;
    $('#s-'+s[3]).textContent=s[4](v);const p=$('#p-'+s[3]);p.textContent=ok?'Normal':'Check';p.className='pill'+(ok?'':' bad')});
  const score=Math.max(60,Math.round(92-bad*12+rnd(-1,1)));
  $('#score').textContent=score+'%';$('#ring').style.setProperty('--v',score);
  $('#aitext').textContent=bad?'Some readings are outside the safe range. Check aeration and water exchange.':'No risk detected. Water quality is good for fish growth.';
}
function tick(){
  S.temp=Math.min(30,Math.max(23,S.temp+rnd(-.15,.15)));S.ph=Math.min(7.9,Math.max(6.8,S.ph+rnd(-.05,.05)));
  S.do=Math.min(9,Math.max(5.5,S.do+rnd(-.1,.1)));S.tu=Math.min(8,Math.max(2,S.tu+rnd(-.15,.15)));S.nh3=Math.min(.3,Math.max(.02,S.nh3+rnd(-.01,.01)));
  render();
}
const alerts=[['ok','✓','Water quality normal','All parameters are within safe range.','10:15 AM'],['warn','!','pH level slightly higher','Current pH: 7.8 (Recommended: 6.5 – 7.5)','08:42 AM'],['ok','✓','DO level stable','Current DO: 6.8 mg/L','06:30 AM'],['info','i','Feeding time','Automatic feeder activated.','05:00 AM']];
const today=()=>new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
function drawAlerts(n){$('#alertlist').innerHTML=alerts.slice(0,n).map(a=>`<li><span class="ai-ic ${a[0]}">${a[1]}</span><div><b>${a[2]}</b><p>${a[3]}</p><small>${today()}, ${a[4]}</small></div></li>`).join('')}
drawAlerts(4);
$('#viewall').onclick=e=>{e.preventDefault();alerts.unshift(['ok','✓','Sensors calibrated','All sensors responded within tolerance.','Yesterday']);drawAlerts(alerts.length);toast('Showing all alerts')};

function clock(){$('#clock').textContent=new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).replace(',','  ')}
let feedH=5;
function countdown(){const n=new Date(),t=new Date(n);t.setHours(feedH,0,0,0);if(t<=n)t.setDate(t.getDate()+1);
  const m=Math.round((t-n)/6e4);$('#countdown').textContent=`In ${Math.floor(m/60)}h ${m%60}m`;
  $('#ftime').textContent=`${String(feedH%12||12).padStart(2,'0')}:00 ${feedH<12?'AM':'PM'}`}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2200)}

let fi=0;const times=[[5,'2 times/day','2.5 kg'],[6,'3 times/day','2.0 kg'],[7,'2 times/day','3.0 kg']];
$('#upd').onclick=()=>{fi=(fi+1)%times.length;[feedH,,]=times[fi];$('#freq').textContent=times[fi][1];$('#qty').textContent=times[fi][2];countdown();toast('Feeding schedule updated')};
let am=['Auto','On','Off'],ai=0;$('#aer').onclick=()=>{ai=(ai+1)%3;$('#aerst').textContent=am[ai];toast('Aeration set to '+am[ai])};
$('#feedbtn').onclick=()=>toast('Live camera is not connected in demo mode');
$('#setbtn').onclick=()=>toast('Settings saved');
$('#dl').onclick=()=>{const r=['Metric,Value',...sensors.map(s=>`${s[0]},${s[4](S[s[3]])}`)].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([r],{type:'text/csv'}));a.download='water-quality-report.csv';a.click();toast('Report downloaded')};
$('#range').onchange=drawHist;
document.querySelectorAll('.side a').forEach(a=>a.onclick=()=>{document.querySelectorAll('.side a').forEach(x=>x.classList.remove('active'));a.classList.add('active')});
const redraw=()=>{drawTrend();drawHist()};
addEventListener('resize',redraw);
render();clock();countdown();redraw();
fetchESP32Data();
setInterval(fetchESP32Data, 3000);
setInterval(()=>{clock();countdown()},30000);
setInterval(()=>{['temp','ph','do'].forEach(k=>{day24[k].push(S[k]);day24[k].shift()});drawTrend()},15000);
