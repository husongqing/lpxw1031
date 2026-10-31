/* 龙牌湘味 · 后台管理端 交互逻辑 */
(function(){
  const T = {
    users:[
      ['U10086','张酱友','138****8888','酿香会员','2','¥34,000','2026-04-20'],
      ['U10087','李慕白','139****2231','酿香会员','1','¥8,000','2026-05-02'],
      ['U10092','王一品','137****6655','藏酿会员','3','¥51,000','2026-03-11'],
      ['U10103','赵小满','135****9012','酿香会员','1','¥26,000','2026-06-18'],
      ['U10120','陈古法','136****7788','藏酿会员','2','¥34,000','2026-02-09']
    ],
    jars:[
      ['LP-J001','张酱友','一年期','200','60','48%','酿造中'],
      ['LP-J002','王一品','三年期','200','20','70%','酿造中'],
      ['LP-J003','赵小满','二年期','200','0','100%','已完成待提货'],
      ['LP-J004','李慕白','一年期','200','200','100%','已提清'],
      ['LP-J005','陈古法','三年期','200','0','40%','酿造中']
    ],
    brews:[
      ['LP-J001','第6月','日晒夜露','图文+视频','王师傅','2026-10-15'],
      ['LP-J001','第5月','翻缸','图文','王师傅','2026-09-14'],
      ['LP-J002','第14月','抽油','图文+视频','刘师傅','2026-10-10'],
      ['LP-J003','第22月','日晒夜露','图文','刘师傅','2026-10-08'],
      ['LP-J004','第3月','翻缸','图文','王师傅','2026-07-20']
    ],
    family:[
      ['翻缸体验日','翻缸','2026-11-08','湘潭·龙牌晒场','36','报名中'],
      ['抽油封坛日','抽油','2027-02-14','湘潭·龙牌酱园','18','报名中'],
      ['制醅开工日','制醅','2027-04-20','湘潭·酱园','0','未开放']
    ],
    family_sign:[
      ['张酱友','138****8888','3','李梅(妻)、张小满(子)','2026-10-22','已确认'],
      ['王一品','139****2231','2','王夫人','2026-10-21','已确认'],
      ['赵小满','137****6655','4','赵父、赵母、赵女','2026-10-20','已确认']
    ],
    orders:[
      ['LP20261028003','认领订单','张酱友','¥8,000','200','—','待酿造','2026-10-28','refund'],
      ['LP20250810002','认领订单','王一品','¥26,000','200','—','酿造中','2025-08-10','detail'],
      ['LP20260420001','认领订单','张酱友','¥8,000','200','—','已完成','2026-04-20','detail'],
      ['TH20261012001','提货单','张酱友','—','60','顺丰 SF1234 5678 9012','已发货','2026-10-12','detail'],
      ['TH20261020002','提货单','张酱友','—','40','—','待发货','2026-10-20','ship'],
      ['TR20260901001','转期订单','赵小满','¥7,200','—','—','已生效','2026-09-01','detail']
    ],
    transfer:[
      ['TR20260901001','赵小满','一年期','二年期','160','¥7,200','已支付','2026-09-01'],
      ['TR20260712002','陈古法','一年期','三年期','100','¥9,000','已支付','2026-07-12'],
      ['TR20260520003','孙酿造','一年期','二年期','120','¥5,400','已支付','2026-05-20']
    ],
    tasting:[
      ['王一品','三年期','20','20','邮寄','SF1023','已签收'],
      ['赵小满','二年期','10','10','邮寄','SF0981','已签收'],
      ['张酱友','二年期','10','10','邮寄','SF1107','已签收']
    ],
    messages:[
      ['翻缸体验日·报名提醒','订阅消息','家庭日提醒','1,286','2026-10-25','已发送'],
      ['第6月酿造反馈已上传','站内消息','酿造反馈','2,043','2026-10-15','已发送'],
      ['二年期尝鲜装已寄出','短信','尝鲜装发货','612','2026-09-30','已发送'],
      ['提货单已发货','短信','提货发货','37','2026-10-12','已发送']
    ]
  };
  const STATUS = {
    '酿造中':['red'],'已完成待提货':['gold'],'已提清':['gray'],'报名中':['green'],
    '未开放':['gray'],'已完成':['green'],'已发货':['blue'],'待发货':['gold'],
    '已生效':['green'],'已确认':['green'],'已签收':['green'],'已支付':['green'],'已发送':['green'],
    '待酿造':['amber'],'退款中':['red'],'已退款':['gray']
  };
  function tag(s){const c=STATUS[s]||['gray'];return `<span class="ad-tag ${c[0]}">${s}</span>`;}

  function renderTables(){
    const map={
      tb_users:T.users.map(r=>`<tr>${cells(r)}<td><span class="ad-link" onclick="AD.detail('用户','${r[1]}')">查看</span></td></tr>`),
      tb_jars:T.jars.map(r=>`<tr>${cells(r.slice(0,6))}<td>${tag(r[6])}</td><td><span class="ad-link" onclick="AD.detail('酱缸','${r[0]}')">详情</span></td></tr>`),
      tb_brews:T.brews.map(r=>`<tr>${cells(r)}<td><span class="ad-link">查看</span></td></tr>`),
      tb_family:T.family.map(r=>`<tr>${cells(r.slice(0,5))}<td>${tag(r[5])}</td><td><span class="ad-link" onclick="AD.detail('活动','${r[0]}')">名单</span></td></tr>`),
      tb_family_sign:T.family_sign.map(r=>`<tr>${cells(r)}</tr>`),
      tb_orders:T.orders.map(r=>{
        const act = r[8]==='ship' ? `<span class="ad-link" onclick="AD.ship('${r[0]}')">录入单号发货</span>`
          : r[8]==='refund' ? `<span class="ad-link" onclick="AD.refund('${r[0]}')">退款审核</span>`
          : `<span class="ad-link" onclick="AD.detail('订单','${r[0]}')">详情</span>`;
        return `<tr>${cells(r.slice(0,6))}<td>${tag(r[6])}</td><td>${r[7]}</td><td>${act}</td></tr>`;
      }),
      tb_transfer:T.transfer.map(r=>`<tr>${cells(r)}<td><span class="ad-link">详情</span></td></tr>`),
      tb_tasting:T.tasting.map(r=>`<tr>${cells(r.slice(0,5))}<td>${tag(r[5])}</td></tr>`),
      tb_messages:T.messages.map(r=>`<tr>${cells(r.slice(0,5))}<td>${tag(r[5])}</td><td><span class="ad-link">重发</span></td></tr>`)
    };
    for(const id in map){const el=document.getElementById(id);if(el)el.innerHTML=map[id].join('');}
  }
  function cells(arr){return arr.map(c=>`<td>${c}</td>`).join('');}

  /* ---------- 图表：趋势（双折线） ---------- */
  function drawTrend(){
    const el=document.getElementById('chartTrend');if(!el)return;
    const W=600,H=240,pad=34;
    const x=['1','2','3','4','5','6','7','8','9','10','11','12'];
    const visit=[12,15,14,18,22,20,25,28,26,30,33,36];
    const sales=[8,10,9,14,16,15,20,24,22,28,30,34];
    const maxV=40,maxS=40;
    const xAt=i=>pad+i*((W-2*pad)/(x.length-1));
    const yAt=v=>H-pad-(v/maxV)*(H-2*pad);
    const line=(arr,max)=>arr.map((v,i)=>`${i?'L':'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
    let grid='';
    for(let g=0;g<=4;g++){const y=pad+g*((H-2*pad)/4);grid+=`<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="#E9DEc6" stroke-width="1"/>`;}
    let xl='';x.forEach((m,i)=>{xl+=`<text x="${xAt(i)}" y="${H-12}" font-size="10" fill="#8A7860" text-anchor="middle">${m}月</text>`;});
    const area=`M${xAt(0)},${yAt(visit[0])} `+visit.map((v,i)=>`L${xAt(i)},${yAt(v)}`).join(' ')+` L${xAt(11)},${H-pad} L${xAt(0)},${H-pad} Z`;
    el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none">
      ${grid}
      <path d="${area}" fill="rgba(158,42,30,.08)"/>
      <path d="${line(visit,maxV)}" fill="none" stroke="var(--lp-red)" stroke-width="2.4"/>
      <path d="${line(sales,maxS)}" fill="none" stroke="var(--lp-gold)" stroke-width="2.4"/>
      ${visit.map((v,i)=>`<circle cx="${xAt(i)}" cy="${yAt(v)}" r="2.6" fill="var(--lp-red)"/>`).join('')}
      ${sales.map((v,i)=>`<circle cx="${xAt(i)}" cy="${yAt(v)}" r="2.6" fill="var(--lp-gold)"/>`).join('')}
      ${xl}
    </svg>`;
  }
  /* ---------- 图表：周期占比（环形） ---------- */
  function drawCycle(){
    const el=document.getElementById('chartCycle');if(!el)return;
    const data=[['一年期',746,'var(--lp-red)'],['二年期',347,'var(--lp-gold)'],['三年期',193,'var(--lp-brown-2)']];
    const total=data.reduce((s,d)=>s+d[1],0),cx=110,cy=100,r=78;
    let ang=-Math.PI/2,paths='';
    data.forEach(d=>{const a2=ang+d[1]/total*Math.PI*2;
      const x1=cx+r*Math.cos(ang),y1=cy+r*Math.sin(ang),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
      const large=(a2-ang)>Math.PI?1:0;
      paths+=`<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${d[2]}"/>`;
      ang=a2;});
    const hole=`<circle cx="${cx}" cy="${cy}" r="48" fill="#FFFDF7"/>`;
    const lab=`<text x="${cx}" y="98" text-anchor="middle" font-size="24" font-weight="800" fill="var(--lp-brown)" font-family="serif">${total.toLocaleString()}</text><text x="${cx}" y="116" text-anchor="middle" font-size="11" fill="#8A7860">缸</text>`;
    const leg=data.map(d=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:8px"><i style="width:10px;height:10px;border-radius:3px;background:${d[2]}"></i>${d[0]} <b style="margin-left:2px">${Math.round(d[1]/total*100)}%</b><span style="color:#8A7860;margin-left:4px">${d[1]}缸</span></div>`).join('');
    el.innerHTML=`<div style="display:flex;align-items:center;gap:18px"><svg viewBox="0 0 220 200" width="180" height="180">${paths}${hole}${lab}</svg><div>${leg}</div></div>`;
  }

  /* ---------- 主题色 ---------- */
  function setTheme(color,el){
    document.documentElement.style.setProperty('--lp-red',color);
    document.documentElement.style.setProperty('--lp-red-soft',color);
    document.querySelectorAll('#m_settings .ad-row > div').forEach(d=>d.style.fontWeight='');
    if(el) el.style.fontWeight='800';
    toast('主题色已切换（演示）');
  }

  /* ---------- 弹窗 ---------- */
  function detail(type,name){openDlg(type+'详情',`<p style="font-size:13px;color:var(--lp-ink-2);line-height:1.9">这是 <b>${name}</b> 的${type}详情演示页面。实际系统中将展示完整字段、关联订单与操作日志。</p>`);}
  function openDlg(title,body,onOk,okText){
    document.getElementById('dlgTitle').textContent=title;
    document.getElementById('dlgBody').innerHTML=body;
    const ok=document.getElementById('dlgOk');
    if(ok){ ok.onclick = onOk || closeDlg; ok.textContent = okText || '确定'; }
    document.getElementById('adMask').classList.add('on');
  }
  function closeDlg(){document.getElementById('adMask').classList.remove('on');}
  /* 轻提示 */
  function toast(msg){
    const old=document.querySelector('.ad-toast'); if(old) old.remove();
    const d=document.createElement('div'); d.className='ad-toast'; d.textContent=msg;
    document.body.appendChild(d);
    setTimeout(()=>{d.style.opacity='0';d.style.transform='translate(-50%,-8px)';},1400);
    setTimeout(()=>d.remove(),1800);
  }

  /* 发货录入快递单号 */
  function ship(no){
    const body = '<div style="font-size:12.5px;color:var(--lp-ink-2);line-height:1.9;margin-bottom:14px">'
      + '发货后用户可在「提货记录」中查看快递公司与运单号，点开即可复制单号去快递官网查询（平台不提供实时轨迹）。</div>'
      + '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<label style="font-size:12.5px;color:var(--lp-ink-2)">快递公司'
      + '<select class="ad-select" id="shExp" style="width:100%;margin-top:6px"><option>顺丰速运</option><option>京东物流</option><option>中通快递</option><option>邮政 EMS</option></select></label>'
      + '<label style="font-size:12.5px;color:var(--lp-ink-2)">运单号'
      + '<input class="ad-input" id="shNo" style="width:100%;margin-top:6px" placeholder="如 SF1234567890123"></label>'
      + '<div style="font-size:11.5px;color:var(--lp-ink-3);line-height:1.7">收货人：张酱友 138****8888<br>湖南省湘潭市雨湖区窑湾街道龙牌里 8 栋 1 单元 302</div>'
      + '</div>';
    openDlg('录入快递单号 · ' + no, body, function(){ doShip(no); }, '确认发货');
  }
  function doShip(no){
    const expEl = document.getElementById('shExp');
    const codeEl = document.getElementById('shNo');
    const exp = (expEl && expEl.value) || '顺丰速运';
    const code = ((codeEl && codeEl.value) || '').trim() || 'SF1234567890123';
    const row = T.orders.find(r=>r[0]===no);
    if(row){ row[5]=exp+' '+code; row[6]='已发货'; row[8]='detail'; }
    closeDlg(); renderTables();
    toast('已录入 '+exp+' '+code+'，状态更新为已发货');
  }

  /* 退款审核 */
  function refund(no){
    const row = T.orders.find(r=>r[0]===no);
    const amt = row ? row[3] : '¥8,000';
    const body = '<div style="font-size:12.5px;color:var(--lp-ink-2);line-height:2.1">'
      + '<div>订单号：<b>'+no+'</b></div>'
      + '<div>订单状态：<b style="color:#A2632B">待酿造</b>（后台尚未上传任何酿造记录）</div>'
      + '<div>退款金额：<b style="color:var(--lp-red)">'+amt+' · 全额</b></div>'
      + '<div>退款原因：想改选其他周期，重新下单</div>'
      + '<div>申请时间：2026-10-31 09:12</div>'
      + '</div>'
      + '<div style="margin-top:14px;font-size:11.5px;color:var(--lp-ink-3);line-height:1.75">'
      + '酿造尚未开始，符合全额退款条件。同意后调用微信退款接口原路退回，缸号与「缸上题字」同步释放。'
      + '</div>';
    openDlg('退款审核 · ' + no, body, function(){ doRefund(no); }, '同意退款');
  }
  function doRefund(no){
    const row = T.orders.find(r=>r[0]===no);
    if(row){ row[6]='已退款'; row[8]='detail'; }
    closeDlg(); renderTables();
    toast('已同意退款，款项原路退回（1–3 个工作日到账）');
  }

  /* ---------- 模块切换 ---------- */
  function switchMod(mod){
    document.querySelectorAll('.ad-mi').forEach(m=>m.classList.toggle('on',m.dataset.mod===mod));
    document.querySelectorAll('.ad-mod').forEach(s=>s.classList.remove('on'));
    const el=document.getElementById('m_'+mod);if(el)el.classList.add('on');
    const names={dashboard:'工作台',users:'用户管理',jars:'酱缸/认领订单',packages:'套餐配置',brews:'酿造记录',family:'家庭日活动',orders:'订单与提货',transfer:'转期管理',tasting:'尝鲜装管理',messages:'消息管理',content:'内容管理',settings:'系统设置'};
    document.getElementById('crumb').textContent=names[mod]||'';
    if(mod==='dashboard'){drawTrend();drawCycle();}
  }

  function enter(){
    document.getElementById('loginPage').style.display='none';
    document.getElementById('adminRoot').style.display='flex';
    renderTables();switchMod('dashboard');
  }

  function init(){
    document.getElementById('menu').addEventListener('click',e=>{const mi=e.target.closest('.ad-mi');if(mi)switchMod(mi.dataset.mod);});
    document.getElementById('adMask').addEventListener('click',e=>{if(e.target.id==='adMask')closeDlg();});
    window.addEventListener('resize',()=>{if(document.getElementById('m_dashboard').classList.contains('on')){drawTrend();drawCycle();}});
  }
  window.AD={enter,switchMod,detail,openDlg,closeDlg,setTheme,ship,doShip,refund,doRefund};
  window.addEventListener('DOMContentLoaded',init);
})();
