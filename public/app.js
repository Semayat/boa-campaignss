// public/app.js — shared client for all pages
const LOGO='https://www.bankofabyssinia.com/wp-content/uploads/2020/09/Asset-1@4x.png';
const API='/api';

function $(id){return document.getElementById(id);}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function fmt(n){return Number(n||0).toLocaleString();}
function fmtETB(n){n=Number(n||0);if(n>=1e9)return (n/1e9).toFixed(2)+'B';if(n>=1e6)return (n/1e6).toFixed(1)+'M';if(n>=1e3)return (n/1e3).toFixed(0)+'K';return fmt(n);}
function fmtVal(n,unit){return unit==='ETB'?('ETB '+fmtETB(n)):fmt(n);}
function pct(a,b){return b>0?(a/b*100):0;}
function toast(msg,type){var t=$('toast');if(!t){t=el('div');t.id='toast';document.body.appendChild(t);}t.className=(type==='err'?'err':'ok');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},3000);}

// ---- session ----
function saveSession(s){localStorage.setItem('boa_session',JSON.stringify(s));}
function getSession(){try{return JSON.parse(localStorage.getItem('boa_session')||'null');}catch(e){return null;}}
function logout(){localStorage.removeItem('boa_session');location.href='index.html';}
function requireRole(role){var s=getSession();if(!s||(role&&s.role!==role)){location.href='index.html';return null;}return s;}

// ---- api ----
async function api(action,opts){
  opts=opts||{};var s=getSession();
  var headers={'Content-Type':'application/json'};
  if(s&&s.token)headers['Authorization']='Bearer '+s.token;
  var url=API+'/data?action='+action+(opts.qs?('&'+opts.qs):'');
  var res=await fetch(url,{method:opts.method||'GET',headers:headers,body:opts.body?JSON.stringify(opts.body):undefined});
  var data=await res.json();
  if(!res.ok)throw new Error(data.error||('HTTP '+res.status));
  return data;
}
async function login(role,scopeId,password,username){
  var body={role:role,scopeId:scopeId,password:password};
  if(username)body.username=username;
  var res=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  var data=await res.json();
  if(!res.ok)throw new Error(data.error||'Login failed');
  return data;
}

// ---- shared header (with notification bell) ----
function renderHeader(roleLabel,roleIcon){
  var s=getSession();
  setTimeout(loadNotifBell,50);
  return '<header class="hdr"><div class="hdr-l">'
    +'<div class="logo"><img src="'+LOGO+'" alt="BoA" onerror="this.parentNode.innerHTML=\'<span>አ</span>\'"></div>'
    +'<div><div class="bname">BoA <em>Campaigns</em></div><div class="bsub">Campaign Command Center</div></div></div>'
    +'<div class="hdr-r">'
    +'<div class="notifwrap"><button class="btn bo bsm" onclick="toggleNotifPanel()" id="notifBtn"><i class="fas fa-bell"></i><span id="notifCount" class="notifcount hidden">0</span></button>'
    +'<div id="notifPanel" class="notifpanel hidden"></div></div>'
    +'<span class="rolechip"><i class="'+roleIcon+'"></i> '+roleLabel+(s&&s.name?(' · '+s.name):'')+'</span>'
    +'<button class="btn bo bsm" onclick="showChangePw()"><i class="fas fa-key"></i></button>'
    +'<button class="btn bo bsm" onclick="logout()"><i class="fas fa-right-from-bracket"></i> Logout</button></div></header>'
    +'<div id="pwModal" class="modal hidden"><div class="modalcard"><div class="stit"><div class="ico g"><i class="fas fa-key"></i></div>Change Password</div>'
    +'<div style="margin-top:10px"><label>New Password</label><input type="password" id="pwNew1" placeholder="••••••••"></div>'
    +'<div style="margin-top:10px"><label>Confirm</label><input type="password" id="pwNew2" placeholder="••••••••"></div>'
    +'<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn bo bsm" onclick="hideChangePw()">Cancel</button><button class="btn bg bsm" onclick="doChangePw()"><i class="fas fa-check"></i> Save</button></div></div></div>';
}
function showChangePw(){$('pwModal').classList.remove('hidden');}
function hideChangePw(){$('pwModal').classList.add('hidden');$('pwNew1').value='';$('pwNew2').value='';}
async function doChangePw(){
  var p1=$('pwNew1').value,p2=$('pwNew2').value;
  if(!p1||p1.length<4){toast('Password must be at least 4 characters','err');return;}
  if(p1!==p2){toast('Passwords do not match','err');return;}
  try{await api('changeMyPassword',{method:'POST',body:{password:p1}});toast('Password changed ✓');hideChangePw();}catch(e){toast(e.message,'err');}
}
async function loadNotifBell(){
  if(!$('notifCount'))return;
  try{var d=await api('listNotifications');}catch(e){return;}
  var c=$('notifCount');
  if(d.unread>0){c.textContent=d.unread>9?'9+':d.unread;c.classList.remove('hidden');}else{c.classList.add('hidden');}
  window._NOTIFS=d.notifications;
}
function toggleNotifPanel(){
  var p=$('notifPanel');
  if(!p.classList.contains('hidden')){p.classList.add('hidden');return;}
  var items=window._NOTIFS||[];
  p.innerHTML=items.length?items.map(function(n){return '<div class="notifitem'+(n.read?'':' unread')+'" onclick="ackNotif(\''+n.id+'\')"><div class="notifmsg">'+n.message+'</div><div class="notiftime">'+timeAgo(n.createdAt)+'</div></div>';}).join(''):'<div class="notifempty">No notifications yet.</div>';
  p.classList.remove('hidden');
}
async function ackNotif(id){try{await api('markNotificationRead',{method:'POST',body:{notifId:id}});await loadNotifBell();toggleNotifPanel();toggleNotifPanel();}catch(e){}}
function timeAgo(iso){var d=new Date(iso),now=new Date();var s=Math.floor((now-d)/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}

function scoreBadge(s){if(s>=90)return '<span class="bdg bx">Excellent</span>';if(s>=60)return '<span class="bdg bf">On Track</span>';if(s>=30)return '<span class="bdg bf">Building</span>';return '<span class="bdg bl">Needs Push</span>';}
function rankCls(i){return i===0?'r1':i===1?'r2':i===2?'r3':'rn';}
function paceTag(pace){if(pace>=100)return '<span class="bdg bx">ahead</span>';if(pace>=80)return '<span class="bdg bf">on track</span>';return '<span class="bdg bl">behind</span>';}

// KPI percentage color banding: >100 green, 50-100 yellow, <50 red
function kpiPctClass(p){if(p>100)return 'kgood';if(p>=50)return 'kwarn';return 'kbad';}
function kpiChip(name,p){return '<span class="kchip '+kpiPctClass(p)+'">'+name+' <b>'+p.toFixed(0)+'%</b></span>';}
// Full row of color-coded per-KPI pace chips (perKpi = server perKpiPace() output)
function renderKpiChips(perKpi){
  if(!perKpi||!perKpi.length)return '';
  return '<div class="kchiprow">'+perKpi.map(function(k){return kpiChip(k.name,k.pace);}).join('')+'</div>';
}
// Detailed per-KPI table (name, actual, target, pace %, color-coded)
function renderKpiTable(perKpi){
  if(!perKpi||!perKpi.length)return '';
  return '<div class="tw"><table><thead><tr><th>KPI</th><th class="num">Actual</th><th class="num">Target</th><th class="num">Pace %</th></tr></thead><tbody>'
   +perKpi.map(function(k){return '<tr><td><b>'+k.name+'</b></td><td class="num">'+fmtVal(k.actual,k.unit)+'</td><td class="num muted">'+fmtVal(k.target,k.unit)+'</td><td class="num"><span class="kchip '+kpiPctClass(k.pace)+'">'+k.pace.toFixed(0)+'%</span></td></tr>';}).join('')
   +'</tbody></table></div>';
}

// ---- campaign cards (used on every dashboard's campaign picker) ----
function initiatorLabel(c){return c.initiatorLevel==='ho'?'Head Office':(c.initiatorLevel==='district'?'District':'Branch');}
function campaignCardHtml(c){
  var today=new Date().toISOString().slice(0,10);
  var status=today>c.endDate?'Ended':(today<c.startDate?'Upcoming':'Active');
  var statusCls=status==='Active'?'bx':(status==='Upcoming'?'bf':'bn');
  return '<div class="card click campcard" onclick="openCampaign(\''+c.id+'\')">'
    +'<div class="row" style="justify-content:space-between;align-items:flex-start">'
    +'<div><div class="stit" style="margin-bottom:2px"><div class="ico g"><i class="fas fa-flag"></i></div>'+c.name+'</div>'
    +'<div class="muted" style="font-size:.78rem">Started by '+initiatorLabel(c)+' · '+c.startDate+' to '+c.endDate+' · '+c.kpis.length+' KPI'+(c.kpis.length>1?'s':'')+'</div></div>'
    +'<span class="bdg '+statusCls+'">'+status+'</span>'
    +'</div></div>';
}
function campaignListHtml(campaigns){
  if(!campaigns||!campaigns.length)return '<div class="empty"><i class="fas fa-flag"></i><div>No campaigns yet.</div></div>';
  return campaigns.map(campaignCardHtml).join('');
}

// ---- dynamic KPI editor rows (campaign creation forms) ----
var KPI_ROWS=[];
function kpiRowsInit(seed){KPI_ROWS=seed||[{name:'',unit:'ETB',weight:100}];renderKpiRows();}
function kpiRowAdd(){KPI_ROWS.push({name:'',unit:'count',weight:0});renderKpiRows();}
function kpiRowRemove(i){KPI_ROWS.splice(i,1);renderKpiRows();}
function kpiRowUpdate(i,field,val){KPI_ROWS[i][field]=field==='weight'?(parseFloat(val)||0):val;renderWeightTotal();}
function renderKpiRows(){
  var box=$('kpiRows');if(!box)return;
  box.innerHTML=KPI_ROWS.map(function(k,i){
    return '<div class="row kpirow" style="gap:8px;margin-bottom:8px">'
      +'<input placeholder="KPI name e.g. Loans Disbursed" value="'+(k.name||'').replace(/"/g,'&quot;')+'" oninput="kpiRowUpdate('+i+',\'name\',this.value)" style="flex:2">'
      +'<select onchange="kpiRowUpdate('+i+',\'unit\',this.value)" style="max-width:110px"><option value="ETB"'+(k.unit==='ETB'?' selected':'')+'>ETB</option><option value="count"'+(k.unit==='count'?' selected':'')+'>count</option></select>'
      +'<input type="number" min="0" max="100" value="'+k.weight+'" oninput="kpiRowUpdate('+i+',\'weight\',this.value)" style="max-width:90px;text-align:right"><span class="muted">%</span>'
      +'<button type="button" class="btn bo bsm" onclick="kpiRowRemove('+i+')"><i class="fas fa-trash"></i></button>'
    +'</div>';
  }).join('');
  renderWeightTotal();
}
function renderWeightTotal(){
  var w=KPI_ROWS.reduce(function(s,k){return s+(+k.weight||0);},0);
  var el2=$('kpiWeightTotal');if(el2){el2.textContent=w;el2.style.color=w===100?'var(--ok)':'var(--er)';}
}

/* ===== REPORT EXPORT (Excel + PDF) ===== */
function loadScript(src){return new Promise(function(res,rej){if(document.querySelector('script[src="'+src+'"]'))return res();var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('Failed to load '+src));};document.head.appendChild(s);});}
var SHEETJS='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
var JSPDF='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
var JSPDF_AT='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
function reportToRows(r){
  var label=r.period==='weekly'?('Week '+r.week):(r.period==='daily'?('Day '+(r.day||'')):'Whole Campaign');
  var rows=[];
  rows.push([(r.campaignName||'Campaign')+' — '+r.title]);
  rows.push([r.period.charAt(0).toUpperCase()+r.period.slice(1)+' Report · '+label]);
  rows.push(['Generated',new Date().toLocaleString()]);
  rows.push([]);
  rows.push(['KPI','Total']);
  r.kpis.forEach(function(k,i){rows.push([k.name,r.totals['kpi'+i]||0]);});
  rows.push([]);
  if(r.trend&&r.trend.length){
    rows.push(['Date'].concat(r.kpis.map(function(k){return k.name;})));
    r.trend.forEach(function(t){rows.push([t.date].concat(r.kpis.map(function(k,i){return t.totals['kpi'+i]||0;})));});
  }
  return {rows:rows,label:label};
}
function fileBase(r){return ((r.campaignName||'Campaign')+'_'+r.title+'_'+r.period+(r.period==='weekly'?('_W'+r.week):(r.period==='daily'?('_'+(r.day||'')):''))).replace(/[^A-Za-z0-9_]+/g,'_');}
async function exportReportExcel(r){
  try{
    await loadScript(SHEETJS);
    var built=reportToRows(r);
    var ws=XLSX.utils.aoa_to_sheet(built.rows);
    ws['!cols']=[{wch:34}].concat(r.kpis.map(function(){return {wch:16};}));
    var wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Report');
    XLSX.writeFile(wb,fileBase(r)+'.xlsx');
    toast('Excel downloaded ✓');
  }catch(e){toast('Excel export failed: '+e.message,'err');}
}
async function exportReportPDF(r){
  try{
    await loadScript(JSPDF);await loadScript(JSPDF_AT);
    if(!window.jspdf||!window.jspdf.jsPDF)throw new Error('PDF library not loaded (check internet connection)');
    var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF();
    var built=reportToRows(r);var label=built.label;
    var hasAuto=typeof doc.autoTable==='function';
    doc.setFillColor(10,35,66);doc.rect(0,0,210,26,'F');
    doc.setTextColor(245,168,0);doc.setFontSize(15);doc.setFont(undefined,'bold');
    doc.text('BoA Campaigns',14,12);
    doc.setTextColor(255,255,255);doc.setFontSize(10);doc.setFont(undefined,'normal');
    doc.text((r.campaignName||'Campaign')+' — '+r.title,14,19);
    doc.setTextColor(10,35,66);doc.setFontSize(12);doc.setFont(undefined,'bold');
    doc.text(r.period.charAt(0).toUpperCase()+r.period.slice(1)+' Report · '+label,14,36);
    doc.setFontSize(8);doc.setFont(undefined,'normal');doc.setTextColor(110,120,140);
    doc.text('Generated '+new Date().toLocaleString(),14,42);
    if(hasAuto){
      doc.autoTable({startY:48,head:[['KPI','Total']],body:r.kpis.map(function(k,i){var v=r.totals['kpi'+i]||0;return [k.name,fmtVal(v,k.unit)];}),headStyles:{fillColor:[10,35,66]},styles:{fontSize:9}});
      if(r.trend&&r.trend.length){doc.autoTable({startY:doc.lastAutoTable.finalY+8,head:[['Date'].concat(r.kpis.map(function(k){return k.name;}))],body:r.trend.map(function(t){return [t.date].concat(r.kpis.map(function(k,i){return fmt(t.totals['kpi'+i]||0);}));}),headStyles:{fillColor:[27,58,107]},styles:{fontSize:7.5}});}
    } else {
      var y=52;doc.setTextColor(10,35,66);doc.setFontSize(10);doc.setFont(undefined,'bold');doc.text('Summary',14,y);y+=7;doc.setFont(undefined,'normal');doc.setFontSize(9);
      r.kpis.forEach(function(k,i){var v=r.totals['kpi'+i]||0;doc.text(k.name+': '+fmtVal(v,k.unit),14,y);y+=6;});
    }
    doc.save(fileBase(r)+'.pdf');
    toast('PDF downloaded ✓');
  }catch(e){toast('PDF export failed: '+e.message,'err');}
}
