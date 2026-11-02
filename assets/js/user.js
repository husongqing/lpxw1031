/* 龙牌湘味 · 用户端 交互逻辑 */
(function(){
  const TABS = ['home','orders','msg','mine'];
  const cycleData = {
    1:{price:8000,  name:'一年期', title:'一年期酱缸认领', finish:'2027-10', bottles:200, per:40},
    2:{price:17000, name:'二年期', title:'二年期酱缸认领', finish:'2028-10', bottles:200, per:85},
    3:{price:26000, name:'三年期', title:'三年期酱缸认领', finish:'2029-10', bottles:200, per:130}
  };
  const MIN_TRANSFER_BOTTLE = 100;   // 转期门槛：剩余瓶数 ≥ 100

  /* 演示用：当前持有周期与剩余瓶数 */
  let curPlan = 1;
  let curRemain = 160;
  let curTab = 'home';
  let curCycle = 1;
  let curTcycle = 2;

  function $(s,r){return (r||document).querySelector(s);}
  function $all(s,r){return Array.from((r||document).querySelectorAll(s));}

  /* ---------- 屏幕切换 ---------- */
  const HIST = [];              // 页面访问历史（用于返回）
  let CUR = null;
  const NO_BACK = ['splash','home','orders','msg','mine']; // 根页面 / Tab 页不加返回

  /* ---------- 登录态（游客可先浏览，需要身份时再引导登录） ---------- */
  let isLogged = false;
  let pendingTarget = null;     // 登录成功后要去的页面
  // 需要登录才能访问的页面：认领购买、个人数据
  const NEED_AUTH = ['pay','myjars','jardetail','family','familyreg',
                     'orders','orderdetail','refund','pickup','pickuplog','shipdetail','addaddr','addrlist','transfer','msg','vip','myreg'];

  function show(pid, fromBack){
    const el = document.getElementById('pg_'+pid);
    if(!el) return;
    // 未登录访问受保护页面 → 弹微信授权引导，登录后再跳
    if(!isLogged && NEED_AUTH.includes(pid)){ requireLogin(pid); return; }
    $all('.lp-screen').forEach(s=>s.classList.remove('on'));
    el.classList.add('on');
    if(pid !== CUR){
      if(!fromBack && CUR) HIST.push(CUR);
      CUR = pid;
    }
    const sb=document.querySelector('.lp-statusbar');
    if(sb){
      sb.classList.toggle('dark', ['home','vip','mine','splash'].includes(pid));
      // 我的：状态栏与身份卡同色，形成一整块连续顶栏
      sb.classList.toggle('mine-top', pid === 'mine');
    }
    const body = el.querySelector('.lp-body');
    if(body) body.scrollTop = 0;
    // tabbar 显隐
    const isTab = TABS.includes(pid);
    const bar = document.getElementById('tabbar');
    bar.style.display = isTab ? 'flex' : 'none';
    if(isTab){
      curTab = pid;
      $all('.lp-tab').forEach(t=>t.classList.toggle('on', t.dataset.tab===pid));
    }
    ensureBack(pid);
    if(pid === 'transfer') renderTransfer();
    if(pid === 'pay') syncWay();   // 回到认领页时恢复上一次的认领方式
    if(pid === 'mine') renderMine();
    if(pid === 'pickup') renderPickAddr();
    if(pid === 'myreg') renderMyReg();
    if(pid === 'addrlist') renderAddrManage();
    if(pid === 'orderdetail') renderOrder();
    if(pid === 'chat') setTimeout(chatScrollBottom, 80);
    closeNav();
  }

  /* ---------- 二级页统一返回按钮 ---------- */
  function back(current, fallback){
    let target = HIST.length ? HIST.pop() : (fallback || 'home');
    // 跳过异常目标
    if(!document.getElementById('pg_'+target)) target = 'home';
    show(target, true);
  }

  function ensureBack(pid){
    const el = document.getElementById('pg_'+pid);
    if(!el) return;
    const nav = el.querySelector('.lp-navbar');
    if(!nav) return;
    const old = nav.querySelector('.nb-back-auto');
    if(old) old.remove();
    if(NO_BACK.includes(pid)) return;
    if(nav.querySelector('.nb-btn')) return;   // 已有手写返回按钮，保留原有跳转
    const btn = document.createElement('button');
    btn.className = 'nb-btn nb-back-auto';
    btn.setAttribute('aria-label','返回');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
    btn.addEventListener('click', ()=> back(pid));
    nav.insertBefore(btn, nav.firstChild);
  }

  /* ---------- 演示导航抽屉 ---------- */
  function buildNav(){
    const list = document.getElementById('navList');
    const pages = [
      ['splash','加载页'],['home','首页'],['cycle','认领选周期'],
      ['pay','确认认领/支付'],['myjars','我的酱缸'],['jardetail','酿造进度'],
      ['family','家庭日列表'],['familyreg','家庭日报名'],
      ['orders','订单列表'],['orderdetail','订单详情'],['refund','退款申请'],
      ['pickup','提货申请'],['pickuplog','提货记录'],['shipdetail','发货详情'],
      ['addaddr','新增/编辑收货地址'],['addrlist','收货地址管理'],['transfer','转期申请'],['msg','消息中心'],
      ['vip','会员中心'],['myreg','我的报名'],['service','客服中心'],['chat','在线客服会话'],['mine','我的']
    ];
    list.innerHTML = pages.map(([id,n])=>`<div onclick="LP.show('${id}')" style="padding:9px 10px;border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:4px;background:rgba(255,255,255,.04)">${n}</div>`).join('');
  }
  function toggleNav(){
    const d=document.getElementById('navDrawer'), m=document.getElementById('navMask');
    if(d.style.transform==='translateX(0%)'){d.style.transform='translateX(-100%)';m.style.display='none';}
    else{d.style.transform='translateX(0%)';m.style.display='block';}
  }
  function closeNav(){const d=document.getElementById('navDrawer'),m=document.getElementById('navMask');d.style.transform='translateX(-100%)';m.style.display='none';}

  /* ---------- Toast ---------- */
  function toast(msg){
    const t=document.createElement('div');
    t.className='lp-toast';t.textContent=msg;
    document.getElementById('app').appendChild(t);
    setTimeout(()=>t.remove(),1600);
  }

  /* ---------- 选周期 ---------- */
  function selCycle(el){
    $all('#pg_cycle .lp-plan').forEach(p=>p.classList.remove('sel'));
    el.classList.add('sel');
    curCycle = +el.dataset.cycle;
    const d = cycleData[curCycle];
    document.getElementById('cyclePrice').textContent = d.price;
    document.getElementById('payTitle').textContent = d.title;
    document.getElementById('payPrice').textContent = d.price;
    document.getElementById('payBtnPrice').textContent = d.price;
    document.getElementById('payFinish').textContent = d.finish;
  }

  /* ---------- 提货方式 ---------- */
  function selPType(el){
    $all('#pg_pickup .lp-plan').forEach(p=>p.classList.remove('sel'));
    el.classList.add('sel');
  }

  /* ---------- 转期：按「单瓶差价 × 剩余瓶数」补差 ---------- */
  function money(n){ return Number(n).toLocaleString('zh-CN'); }

  /** 单瓶差价 */
  function unitDiff(targetCycle){
    return cycleData[targetCycle].per - cycleData[curPlan].per;
  }
  /** 需补差价 */
  function diffAmount(targetCycle){
    return unitDiff(targetCycle) * curRemain;
  }

  function selTcycle(el){
    $all('#pg_transfer .lp-plan').forEach(p=>p.classList.remove('sel'));
    el.classList.add('sel');
    curTcycle = +el.dataset.tcycle;
    renderTransfer();
  }

  function renderTransfer(){
    const from = cycleData[curPlan];
    // 1. 当前持有信息
    const info = document.getElementById('transferInfo');
    if(info){
      info.innerHTML = '当前：' + from.name + ' · 单瓶 ¥' + from.per
        + ' · <b style="color:var(--lp-red)">剩余 ' + curRemain + ' 瓶</b>';
    }

    // 2. 两个目标档位
    [2,3].forEach(y=>{
      const t = cycleData[y], u = unitDiff(y), pay = diffAmount(y);
      const el = document.querySelector('#pg_transfer .lp-plan[data-tcycle="'+y+'"]');
      if(!el) return;
      const big = el.querySelector('.big'), meta = el.querySelector('.meta');
      if(big) big.innerHTML = '<span class="cur">补差 ¥</span>' + money(pay);
      if(meta){
        meta.innerHTML = '单瓶差价 ' + u + ' 元（' + t.per + ' − ' + from.per + '）× 剩余 '
          + curRemain + ' 瓶<br>=' + money(u) + ' × ' + curRemain + ' = <b style="color:var(--lp-red)">¥' + money(pay) + '</b>';
      }
    });

    // 3. 底部应付
    const price = document.getElementById('transferPrice');
    if(price) price.textContent = money(diffAmount(curTcycle));
    const detail = document.getElementById('transferDetail');
    if(detail){
      const u = unitDiff(curTcycle);
      detail.textContent = '(' + cycleData[curTcycle].per + ' − ' + from.per + ') × ' + curRemain + ' 瓶 = ¥' + money(diffAmount(curTcycle));
    }

    // 4. 门槛校验：剩余 ≥ 100 瓶才可提交
    const ok = curRemain >= MIN_TRANSFER_BOTTLE;
    const btn = document.getElementById('transferSubmitBtn');
    const tip = document.getElementById('transferTip');
    if(btn){
      btn.disabled = !ok;
      btn.style.opacity = ok ? '1' : '.45';
      btn.style.pointerEvents = ok ? 'auto' : 'none';
      btn.textContent = ok ? '确认补差并转期' : '剩余不足 ' + MIN_TRANSFER_BOTTLE + ' 瓶，无法转期';
    }
    if(tip) tip.style.display = ok ? 'none' : 'block';
  }

  /* ---------- 登录引导：微信授权 → 绑定手机号 ---------- */
  function stepLogin(n){
    const s1=document.getElementById('lgStep1'), s2=document.getElementById('lgStep2');
    if(s1) s1.classList.toggle('on', n===1);
    if(s2) s2.classList.toggle('on', n===2);
  }
  function requireLogin(target){
    pendingTarget = target || null;
    stepLogin(1);
    const m = document.getElementById('loginMask');
    if(m) m.classList.add('on');
  }
  function closeLogin(){
    const m = document.getElementById('loginMask');
    if(m) m.classList.remove('on');
    pendingTarget = null;
  }
  function wxLogin(btn){
    const agree = document.getElementById('lgAgree');
    if(agree && !agree.checked){ toast('请先阅读并同意用户协议与隐私政策'); return; }
    if(btn){ btn.dataset.txt = btn.innerHTML; btn.innerHTML = '正在唤起微信…'; btn.disabled = true; }
    setTimeout(()=>{
      if(btn){ btn.innerHTML = btn.dataset.txt; btn.disabled = false; }
      stepLogin(2);          // 第二步：绑定手机号（登录态在完成绑定后才刷新界面）
    }, 700);
  }
  function bindPhone(btn){
    if(btn){ btn.dataset.txt = btn.innerHTML; btn.innerHTML = '正在校验手机号…'; btn.disabled = true; }
    setTimeout(()=>{
      if(btn){ btn.innerHTML = btn.dataset.txt; btn.disabled = false; }
      finishLogin('登录成功，手机号已绑定');
    }, 800);
  }
  function skipPhone(){ finishLogin('已登录，可稍后在「我的」绑定手机号'); }
  function finishLogin(msg){
    const target = pendingTarget;
    pendingTarget = null;
    isLogged = true;
    const m = document.getElementById('loginMask');
    if(m) m.classList.remove('on');
    renderMine();
    toast(msg);
    if(target) show(target);
  }
  function logout(){
    isLogged = false;
    renderMine();
    toast('已退出登录');
    show('mine');
  }
  function doc(name){ toast('《' + name + '》（演示）'); }
  /* 未接入的功能先给轻提示，不做跳转 */
  function soon(name){ toast(name + '功能建设中，敬请期待'); }
  function renderMine(){
    const u = document.getElementById('mineUser'), g = document.getElementById('mineGuest');
    if(u) u.style.display = isLogged ? '' : 'none';
    if(g) g.style.display = isLogged ? 'none' : '';
    const lo = document.getElementById('logoutRow');
    if(lo) lo.style.display = isLogged ? '' : 'none';
    // 游客态不显示未读角标（消息需登录后才可读）
    const bar = document.getElementById('tabbar');
    if(bar) bar.classList.toggle('guest', !isLogged);
  }

  /* ---------- 订单：待支付 / 待酿造 / 酿造中 / 已完成 / 已取消 ---------- */
  const ORDERS = {
    unpaid: {
      state:'unpaid', stateText:'待支付', tag:'',
      title:'二年期酱缸认领', price:17000, priceText:'17,000', bottles:200,
      no:'LP20261031001', man:'张酱友', timer:'张府家酿 · 丙午年',
      payLabel:'下单时间', payTime:'2026-10-31 11:40', startTime:'支付后 7 日内排缸',
      keepTime:'2026-10-31 23:40',
      note:'尚未完成支付，酱园不会排缸开工。请在 2026-10-31 23:40 前完成付款，逾期系统自动取消；支付后订单进入「待酿造」，我们将在 7 日内安排开工。',
      jarEmptySub:'支付完成后，酱园排缸开工并同步酿造进度'
    },
    pending: {
      state:'pending', stateText:'待酿造', tag:'warn',
      title:'一年期酱缸认领', price:8000, priceText:'8,000', bottles:200,
      no:'LP20261028003', man:'张酱友', timer:'张府家酿 · 丙午年',
      payTime:'2026-10-28 16:05', startTime:'预计 2026-11-05 排缸',
      note:'已支付成功，酱园尚未排缸开工。开工后匠人开始上传酿造记录，届时可在「我的酱缸 - 酿造进度」中查看。',
      jarEmptySub:'酱园排缸开工后，匠人会在此同步每月酿造进度'
    },
    brewing: {
      state:'brewing', stateText:'酿造中', tag:'ok',
      title:'三年期酱缸认领', price:26000, priceText:'26,000', bottles:200,
      no:'LP20250810007', man:'张酱友', timer:'张府家酿 · 乙巳年',
      payTime:'2025-08-10 09:15', startTime:'2025-09-02 已开工',
      note:'匠人正在按节点上传酿造记录，可随时查看酿造历程与月度反馈。',
      jarSub:'已上传 6 个月度反馈，可回看'
    },
    done: {
      state:'done', stateText:'已完成', tag:'',
      title:'一年期酱缸认领', price:8000, priceText:'8,000', bottles:200,
      no:'LP20260420001', man:'张酱友', timer:'张府家酿 · 甲辰年',
      payTime:'2026-04-20 10:32', startTime:'2026-04-20 已完成制醅',
      certNo:'LP-CERT-2026-0401', certDate:'2026-04-20',
      note:'本订单已完成提货，感谢您的认领。可继续查看酿造记录与提货历史。',
      jarSub:'12 月色满缸，记录已归档'
    },
    canceled: {
      state:'canceled', stateText:'已取消', tag:'gray',
      title:'一年期酱缸认领', price:8000, priceText:'8,000', bottles:200,
      no:'LP20260915002', man:'张酱友', timer:'张府家酿 · 乙巳年',
      payLabel:'下单时间', payTime:'2026-09-15 14:20', startTime:'未开工',
      cancelTime:'2026-09-16 10:05',
      note:'订单已取消，缸位与缸上题字已释放。如需认领，可重新下单。'
    }
  };
  let curOrder = 'pending';

  function openOrder(id){
    curOrder = id || 'pending';
    show('orderdetail');
  }

  function renderOrder(){
    const o = ORDERS[curOrder] || ORDERS.pending;
    const body = document.getElementById('odBody');
    const foot = document.getElementById('odFoot');
    if(!body || !foot) return;

    const tagHtml = '<span class="lp-tag ' + o.tag + '">认领订单 · ' + o.stateText + '</span>';
    const NOTE_TITLE = {
      unpaid:'待支付 · 酱园尚未排缸',
      pending:'等待酱园排缸开工',
      brewing:'正在古法晒露酿造中',
      done:'订单已完成',
      canceled:'订单已取消'
    };
    const noteCls = {unpaid:'unpaid', pending:'pending', brewing:'brew', done:'done', canceled:'cancel'}[o.state] || 'pending';

    // 酿造进度区块：酿造中/已完成 → 可点击入口；未开工（待支付/待酿造）→ 暂无记录占位；已取消 → 不展示
    const jarBlock = (o.state==='pending' || o.state==='unpaid')
      ? '<div class="od-jar-none">'
        + '<div class="ic"><svg viewBox="0 0 24 24"><path d="M8.5 3.5h7M9.5 3.5v1.9c0 .8-.3 1.5-.9 2.1l-1 1.2c-.6.7-.9 1.5-.9 2.4v8c0 .9.7 1.6 1.6 1.6h5.4c.9 0 1.6-.7 1.6-1.6v-8c0-.9-.3-1.7-.9-2.4l-1-1.2c-.6-.6-.9-1.3-.9-2.1V3.5"/><path d="M6.7 14.5h10.6"/></svg></div>'
        + '<div class="t">目前暂无酿造进度记录</div>'
        + '<div class="s">' + (o.jarEmptySub || '酱园排缸开工后，匠人会在此同步每月酿造进度<br>与图文反馈，敬请耐心等待') + '</div>'
        + '</div>'
      : (o.state==='canceled' ? '' :
        '<div class="od-jar" onclick="LP.show(\'jardetail\')">'
        + '<div class="ic"><svg viewBox="0 0 24 24"><path d="M4 6h.01M4 12h.01M4 18h.01M8.5 6H20M8.5 12H18M8.5 18h6"/></svg></div>'
        + '<div class="main"><div class="t">查看酿造进度</div><div class="s">' + o.jarSub + '</div></div>'
        + '<div class="arr">进入<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div>'
        + '</div>');

    // 转期入口：待酿造（开工前可延长期）与酿造中（可升级更长周期）均提供
    const transferBlock = (o.state==='pending' || o.state==='brewing')
      ? '<div class="od-jar tr" onclick="LP.show(\'transfer\')">'
        + '<div class="ic"><svg viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 0114.6-5.9M20.5 12a8.5 8.5 0 01-14.6 5.9"/>'
        + '<path d="M18 2.5v4h-4M6 21.5v-4h4"/></svg></div>'
        + '<div class="main"><div class="t">酱缸转期</div>'
        + '<div class="s">' + (o.state==='pending' ? '开工前可延长认领周期，按单瓶差价补差' : '可升级更长周期，按单瓶差价补差') + '</div></div>'
        + '<div class="arr">去转期<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div>'
        + '</div>'
      : '';

    // 认领证书：仅已完成订单可见，支持长按/按钮保存
    const certBlock = o.state!=='done' ? '' :
        '<div class="od-cert" onclick="LP.openCert()">'
        + '<div class="ct"><img src="assets/img/cert.jpg" alt="认领证书"></div>'
        + '<div class="main"><div class="t">酱缸认领证书</div>'
        + '<div class="s">编号 ' + (o.certNo || 'LP-CERT-2026-0401') + ' · 颁发于 ' + (o.certDate || '2026-04-20') + '</div></div>'
        + '<div class="arr">查看<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div>'
        + '</div>';

    body.innerHTML = ''
      + '<div class="lp-card lp-card-pad" style="text-align:center;margin-bottom:14px">'
      +   tagHtml
      +   '<div style="font-family:var(--lp-kai);font-size:20px;font-weight:800;color:var(--lp-brown);margin:10px 0 4px">' + o.title + '</div>'
      +   '<div class="lp-price" style="font-size:24px"><span class="cur">¥</span>' + o.priceText + ' <span class="u">/ ' + o.bottles + '瓶</span></div>'
      + '</div>'
      + '<div class="od-note ' + noteCls + '">'
      +   '<div class="t">' + (NOTE_TITLE[o.state] || '订单已完成') + '</div>'
      +   '<div class="s">' + o.note + '</div>'
      + '</div>'
      + jarBlock
      + transferBlock
      + certBlock
      + '<div class="lp-card lp-card-pad" style="font-size:12.5px;line-height:2;color:var(--lp-ink-2)">'
      +   '<div style="display:flex;justify-content:space-between"><span>订单编号</span><span>' + o.no + '</span></div>'
      +   '<div style="display:flex;justify-content:space-between"><span>认领人</span><span>' + o.man + '</span></div>'
      +   '<div style="display:flex;justify-content:space-between"><span>缸上题字</span><span>' + o.timer + '</span></div>'
      +   '<div style="display:flex;justify-content:space-between"><span>' + (o.payLabel || '支付时间') + '</span><span>' + o.payTime + '</span></div>'
      +   (o.keepTime ? '<div style="display:flex;justify-content:space-between"><span>支付截止</span><span style="color:var(--lp-red);font-weight:700">' + o.keepTime + '</span></div>' : '')
      +   (o.cancelTime ? '<div style="display:flex;justify-content:space-between"><span>取消时间</span><span>' + o.cancelTime + '</span></div>' : '')
      +   '<div style="display:flex;justify-content:space-between"><span>酿造状态</span><span style="color:' + (o.state==='pending' ? '#A2632B' : (o.state==='brewing' || o.state==='done' ? 'var(--lp-ok)' : 'var(--lp-ink-3)')) + '">' + o.startTime + '</span></div>'
      + '</div>'
      + (o.state==='pending'
        ? '<div class="ad-note" style="margin-top:14px"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>'
          + '<span>酿造开始前可在线申请全额退款，款项原路退回；酿造开始后线上退款入口关闭，需联系客服线下沟通。</span></div>'
        : '');

    const FOOT = {
      unpaid: '<button class="lp-btn lp-btn-ghost lp-btn-block" onclick="LP.cancelOrder()">取消订单</button>'
        + '<button class="lp-btn lp-btn-primary lp-btn-block" onclick="LP.payNow()">立即支付</button>',
      pending: '<button class="lp-btn lp-btn-ghost lp-btn-block" data-go="service">联系客服</button>'
        + '<button class="lp-btn lp-btn-primary lp-btn-block" onclick="LP.openRefund()">申请退款</button>',
      canceled: '<button class="lp-btn lp-btn-ghost lp-btn-block" data-go="service">联系客服</button>'
        + '<button class="lp-btn lp-btn-primary lp-btn-block" data-go="cycle">再次认领</button>',
      // 酿造中：底部不放按钮，转期与提货入口以卡片形式放在正文
      brewing: ''
    };
    const footHtml = FOOT.hasOwnProperty(o.state)
      ? FOOT[o.state]
      : ('<button class="lp-btn lp-btn-ghost lp-btn-block" data-go="transfer">申请转期</button>'
        + '<button class="lp-btn lp-btn-primary lp-btn-block" data-go="pickup">申请提货</button>');
    foot.innerHTML = footHtml;
    foot.style.display = footHtml ? 'flex' : 'none';
  }

  /* ---------- 待支付：立即支付 / 取消订单 ---------- */
  function payNow(){
    const o = ORDERS.unpaid;
    if(!o || o.state !== 'unpaid'){ return; }
    toast('正在唤起微信支付…');
    setTimeout(()=>{
      Object.assign(o, {
        state:'pending', stateText:'待酿造', tag:'warn',
        payLabel:'支付时间', payTime:'2026-10-31 11:45',
        startTime:'预计 2026-11-08 排缸',
        note:'已支付成功，酱园尚未排缸开工。开工后匠人开始上传酿造记录，届时可在「我的酱缸 - 酿造进度」中查看。',
        jarEmptySub:'酱园排缸开工后，匠人会在此同步每月酿造进度'
      });
      delete o.keepTime;
      const row = document.getElementById('rowUnpaid');
      if(row){
        const rt = row.querySelector('.rt');
        if(rt) rt.innerHTML = '<span class="lp-tag warn">待酿造</span>';
        const s = row.querySelector('.main .s');
        if(s) s.textContent = '2026-10-31 · 实付 ¥17,000';
        const av = row.querySelector('.av');
        if(av){ av.textContent = '待'; av.style.background = 'rgba(184,120,40,.14)'; av.style.color = '#A2632B'; }
      }
      toast('支付成功，酱园将尽快排缸开工');
      show('orders');
    }, 1200);
  }
  function cancelOrder(){
    const o = ORDERS.unpaid;
    if(!o || o.state === 'canceled'){ return; }
    toast('订单已取消，缸位与题字已释放');
    setTimeout(()=>{
      const keep = {no:o.no, title:o.title, priceText:o.priceText, timer:o.timer, payTime:o.payTime, bottles:o.bottles, man:o.man};
      Object.assign(o, ORDERS.canceled, keep, {cancelTime:'2026-10-31 11:45'});
      const row = document.getElementById('rowUnpaid');
      if(row){
        const rt = row.querySelector('.rt');
        if(rt) rt.innerHTML = '<span class="lp-tag gray">已取消</span>';
        const av = row.querySelector('.av');
        if(av){ av.textContent = '取'; av.style.background = 'rgba(90,74,58,.1)'; av.style.color = 'var(--lp-ink-3)'; }
        const s = row.querySelector('.main .s');
        if(s) s.textContent = '2026-10-31 下单 · 2026-10-31 11:45 取消';
      }
      show('orders');
    }, 900);
  }

  /* ---------- 退款申请 ---------- */
  function openRefund(){ show('refund'); }
  function pickReason(el){
    $all('#rfReasons .ad-chip').forEach(c=>c.classList.remove('on'));
    el.classList.add('on');
  }
  function refundSubmit(){
    toast('退款申请已提交，1–3 个工作日原路退回');
    setTimeout(()=>{
      const row = document.getElementById('rowPending');
      if(row){
        const tag = row.querySelector('.lp-tag');
        if(tag){ tag.textContent = '已退款'; tag.className = 'lp-tag gray'; }
        const sub = row.querySelector('.s');
        if(sub) sub.textContent = '2026-10-28 · ¥8000 已受理退款';
      }
      show('orders');
    }, 1100);
  }

  /* ---------- 我的报名（家庭日） ----------
     规则：每个周期含固定次数家庭日（1 年 3 次 / 2 年 5 次 / 3 年 7 次），
     同一自然年内每口酱缸仅参加 1 次；该年度存在「已确认参加」或「待跟进」记录时，
     系统不再推送该年度的报名消息与表单。 */
  const REGS = [
    { jar:'二号酱缸', cycle:'三年期', timer:'张府家酿 · 乙巳年', year:'2026',
      act:'翻缸体验日', date:'2026-11-08（周日）09:30', place:'湘潭 · 龙牌晒场',
      num:3, members:'李梅（妻）、张小满（子）', submit:'2026-10-25',
      status:'confirmed', note:'酱园已确认名额，届时凭报名短信入场。' },
    { jar:'二号酱缸', cycle:'三年期', timer:'张府家酿 · 乙巳年', year:'2025',
      act:'制醅开缸日', date:'2025-09-20（周六）09:30', place:'湘潭 · 龙牌晒场',
      num:2, members:'李梅（妻）', submit:'2025-09-02',
      status:'finished', note:'已完成现场体验，酿造记录已同步至酿造进度。' },
    { jar:'一号酱缸', cycle:'一年期', timer:'张府家酿 · 甲辰年', year:'2026',
      act:'抽油出缸日', date:'待酱园通知（预计 2026-12）', place:'湘潭 · 龙牌晒场',
      num:2, members:'张小满（子）', submit:'2026-10-28',
      status:'follow', note:'酱园排期确认后将短信通知具体时间，请留意消息中心。' }
  ];
  const REG_STATUS = {
    confirmed:{ t:'已确认参加', tag:'ok',   cls:'ok'   },
    follow   :{ t:'待跟进',     tag:'warn', cls:'warn' },
    finished :{ t:'已参加',     tag:'gray', cls:'gray' }
  };

  function renderMyReg(){
    const box = document.getElementById('regGroups');
    if(!box) return;
    // 按酱缸分组
    const groups = [];
    REGS.forEach(r=>{
      let g = groups.find(x=>x.jar === r.jar);
      if(!g){ g = {jar:r.jar, cycle:r.cycle, timer:r.timer, items:[]}; groups.push(g); }
      g.items.push(r);
    });
    box.innerHTML = groups.map(g=>{
      const items = g.items.slice().sort((a,b)=> b.year.localeCompare(a.year));
      return '<div class="reg-grp">'
        + '<div class="rgh"><div class="rgh-l"><span class="rgh-t">' + g.jar + '</span>'
        + '<span class="jc-period">' + g.cycle + '</span></div>'
        + '<div class="rgh-s">' + g.timer + '</div></div>'
        + items.map(r=>{
            const st = REG_STATUS[r.status] || REG_STATUS.follow;
            const noPush = (r.status === 'confirmed' || r.status === 'follow');
            return '<div class="reg-card ' + st.cls + '" onclick="LP.regDetail(this)">'
              + '<div class="rc-hd"><span class="rc-yr">' + r.year + ' 年度</span>'
              + '<span class="lp-tag ' + st.tag + '">' + st.t + '</span></div>'
              + '<div class="rc-t">' + r.act + '</div>'
              + '<div class="rc-m">' + r.date + ' · ' + r.place + '</div>'
              + '<div class="rc-n">' + r.note + '</div>'
              + '<div class="rc-f"><span>报名 ' + r.num + ' 人 · 提交于 ' + r.submit + '</span>'
              + '<span class="rc-more">详情<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></div>'
              + (noPush ? '<div class="rc-flag"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
                  + '该年度已有报名记录，系统不再推送报名消息与表单</div>' : '')
              + '</div>';
          }).join('')
        + '</div>';
    }).join('');
  }
  function regDetail(el){
    const t = el ? el.querySelector('.rc-t') : null;
    toast('《' + (t ? t.textContent : '家庭日') + '》报名详情（演示）');
  }

  /* ---------- 发货详情：复制单号 / 去官网 ---------- */
  function copyCode(){
    const el = document.getElementById('shipCode');
    const code = el ? el.textContent.replace(/\s/g,'') : '';
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(code).then(()=>toast('运单号已复制：' + code)).catch(()=>toast('运单号：' + code));
    } else { toast('运单号：' + code); }
  }
  function goExpress(){
    toast('单号已复制，正在打开顺丰官网');
    copyCode();
    try{ window.open('https://www.sf-express.com/chn/sc', '_blank'); }catch(e){}
  }

  /* ---------- 认领方式：本人认领 / 转赠他人 ---------- */
  let claimWay = 'self';        // self | gift
  let giftInfo = null;          // {tel, name, word}

  function fmtTel(t){ return String(t).replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3'); }

  function selWay(el){
    const w = el.dataset.way;
    if(w === 'gift' && !giftInfo){ openGift(); return; }   // 未填过 → 先弹转赠表单
    setWay(w);
  }
  function setWay(w){
    claimWay = w;
    $all('#pg_pay .way-opt').forEach(o=>o.classList.toggle('on', o.dataset.way === w));
    syncWay();
  }
  function syncWay(){
    const box = document.getElementById('wayChosen');
    const tel = document.getElementById('wayChosenTel');
    const lbl = document.getElementById('payBtnLabel');
    if(box) box.style.display = claimWay === 'gift' ? 'flex' : 'none';
    if(tel && giftInfo) tel.textContent = fmtTel(giftInfo.tel) + (giftInfo.name ? '（' + giftInfo.name + '）' : '');
    if(lbl) lbl.textContent = claimWay === 'gift' ? '确认转赠并支付' : '确认支付';
  }

  function openGift(){
    const t = document.getElementById('giftTel');
    const n = document.getElementById('giftName');
    const w = document.getElementById('giftWord');
    if(t && giftInfo) t.value = giftInfo.tel;
    if(n && giftInfo) n.value = giftInfo.name || '';
    if(w && giftInfo) w.value = giftInfo.word || '';
    document.getElementById('giftMask').classList.add('on');
  }
  function closeGift(){
    document.getElementById('giftMask').classList.remove('on');
    if(!giftInfo) setWay('self');     // 未提交过转赠信息 → 回退到本人认领
  }

  function giftSubmit(){
    const tel   = (document.getElementById('giftTel').value || '').replace(/\s/g,'');
    const name  = (document.getElementById('giftName').value || '').trim();
    const word  = (document.getElementById('giftWord').value || '').trim();
    if(!/^1\d{10}$/.test(tel)){ toast('请填写对方正确的 11 位手机号'); return; }

    giftInfo = { tel, name, word };
    document.getElementById('giftMask').classList.remove('on');
    setWay('gift');

    // 转赠成功：预览对方收到的系统弹窗与短信
    const d = cycleData[curCycle] || cycleData[1];
    const who = name || '您';
    const sub = document.getElementById('giftOkSub');
    if(sub) sub.textContent = '已通知 ' + fmtTel(tel) + (name ? '（' + name + '）' : '') + '，酱缸权益将在对方绑定手机号后自动归属';
    const sms = document.getElementById('giftOkSms');
    if(sms){
      sms.textContent = '【龙牌湘味】' + who + '您好，张酱友 向您转赠了一口' + d.name + '酱缸（' + d.bottles
        + ' 瓶）。请使用微信登录「龙牌湘味」小程序并绑定本机号码即可查看。'
        + '恭喜您，收到一口酱缸，快来查看酱缸制作工艺流程吧！';
    }
    document.getElementById('giftOkMask').classList.add('on');
  }
  function closeGiftOk(){ document.getElementById('giftOkMask').classList.remove('on'); }

  /* ---------- 各类提交 ---------- */
  function pay(){
    if(claimWay === 'gift' && giftInfo){
      toast('转赠成功，已通知 ' + fmtTel(giftInfo.tel));
      setTimeout(()=>{ giftInfo = null; setWay('self'); show('myjars'); }, 1000);
      return;
    }
    toast('支付成功，认领生效 🎉');
    setTimeout(()=>show('myjars'), 900);
  }
  function playVideo(){ toast('正在播放《晒场实录》第 6 月（演示）'); }
  function familySubmit(){ toast('报名成功，届时凭短信到场'); setTimeout(()=>show('family'),900); }
  function pickupSubmit(){ toast('提货申请已提交，等待发货'); setTimeout(()=>show('pickuplog'),900); }
  function transferSubmit(){ toast('补差支付成功，转期生效'); setTimeout(()=>show('myjars'),900); }

  /* ---------- 月度反馈：展开 / 图片放大 ---------- */
  function toggleFb(hd){
    const card = hd.parentElement;
    if(card) card.classList.toggle('is-open');
  }
  function viewImg(img){
    const big = document.getElementById('imgBig');
    if(!big || !img) return;
    big.src = img.getAttribute('src');
    document.getElementById('imgMask').classList.add('on');
  }
  function closeImg(){ document.getElementById('imgMask').classList.remove('on'); }

  /* ---------- 认领证书：查看 / 保存 ---------- */
  function openCert(){
    const m = document.getElementById('certMask');
    if(m) m.classList.add('on');
  }
  function closeCert(){
    const m = document.getElementById('certMask');
    if(m) m.classList.remove('on');
  }
  function saveCert(){
    const proto = location.protocol;
    // https 环境下触发真实下载；本地 file:// 打开时仅提示，避免浏览器跳走到图片本身
    const canDownload = (proto === 'http:' || proto === 'https:');
    let ok = false;
    if(canDownload){
      try{
        const a = document.createElement('a');
        a.href = 'assets/img/cert.jpg';
        a.download = '龙牌湘味-酱缸认领证书.jpg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        ok = true;
      }catch(e){ ok = false; }
    }
    toast(ok ? '证书已保存到相册' : '证书已保存到相册（演示）');
  }

  /** 从消息跳到酿造进度后，定位并高亮对应月份 */
  function focusFb(month){
    const card = document.getElementById('fb'+month);
    if(!card) return;
    card.classList.add('is-open','flash');
    try{ card.scrollIntoView({block:'center', behavior:'smooth'}); }catch(e){}
    setTimeout(()=>card.classList.remove('flash'), 1800);
  }

  /* ---------- 收货地址 ---------- */
  const ADDRS = [
    { id:1, name:'张酱友', tel:'138 0000 8888', prov:'湖南省', city:'湘潭市', dist:'雨湖区',
      detail:'窑湾街道龙牌里 8 栋 1 单元 302', tag:'家', def:true },
    { id:2, name:'张小满', tel:'139 0000 2233', prov:'湖南省', city:'长沙市', dist:'岳麓区',
      detail:'麓谷街道芯城科技园 B 座 1201', tag:'公司', def:false }
  ];
  let curAddr = 1;   // 当前选中的收货地址

  function addrById(id){ return ADDRS.find(a=>a.id===id) || ADDRS[0]; }
  function addrFull(a){ return a.prov + ' ' + a.city + ' ' + a.dist + ' ' + a.detail; }

  function renderPickAddr(){
    const box = document.getElementById('pickAddr');
    if(!box) return;
    const a = addrById(curAddr);
    box.innerHTML =
      '<div class="addr-card" onclick="LP.openAddr()">'
      + '<div class="pin"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zM12 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/></svg></div>'
      + '<div class="main"><div class="t">' + a.name
      + '<span class="tel">' + a.tel + '</span>'
      + (a.def ? '<span class="addr-def">默认</span>' : '')
      + '<span class="addr-tag">' + a.tag + '</span></div>'
      + '<div class="s">' + addrFull(a) + '</div></div>'
      + '<div class="arw">›</div></div>';
  }

  function renderAddrList(){
    const box = document.getElementById('addrList');
    if(!box) return;
    const tick = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    box.innerHTML = ADDRS.map(a =>
      '<div class="addr-li' + (a.id===curAddr ? ' on' : '') + '" onclick="LP.chooseAddr(' + a.id + ')">'
      + '<div class="ok">' + tick + '</div>'
      + '<div class="main"><div class="t">' + a.name
      + '<span class="tel">' + a.tel + '</span>'
      + (a.def ? '<span class="addr-def">默认</span>' : '')
      + '<span class="addr-tag">' + a.tag + '</span></div>'
      + '<div class="s">' + addrFull(a) + '</div></div></div>'
    ).join('');
  }

  function openAddr(){
    renderAddrList();
    document.getElementById('addrMask').classList.add('on');
  }
  function closeAddr(){ document.getElementById('addrMask').classList.remove('on'); }
  function chooseAddr(id){
    curAddr = id;
    renderPickAddr();
    closeAddr();
    toast('已使用该收货地址');
  }

  /** 进入新增地址页时重置表单 */
  function resetAddrForm(){
    ['adName','adTel','adDetail'].forEach(id=>{
      const el = document.getElementById(id); if(el) el.value = '';
    });
    rg = { p:'', c:'', d:'' }; rgLevel = 0;
    const region = document.getElementById('adRegion');
    if(region){ region.classList.remove('filled'); region.querySelector('.rg-text').textContent = '请选择省 / 市 / 区'; }
    const def = document.getElementById('adDefault'); if(def) def.checked = true;
    const chips = $all('#adTags .ad-chip');
    chips.forEach((c,i)=>c.classList.toggle('on', i === 0));
  }

  function pickTag(el){
    $all('#adTags .ad-chip').forEach(c=>c.classList.remove('on'));
    el.classList.add('on');
  }

  /** 新增/编辑完成后回到哪个页面 */
  let addrFrom = 'pickup';
  let editingAddr = 0;     // 0 = 新增；>0 = 编辑该 id

  function renderAddrManage(){
    const box = document.getElementById('addrManage');
    const sum = document.getElementById('addrSum');
    if(!box) return;
    if(sum){
      const d = ADDRS.find(a=>a.def);
      sum.innerHTML = '共 <b>' + ADDRS.length + '</b> 个收货地址'
        + (d ? ' · 默认「<b>' + d.tag + '</b>」' : ' · 暂未设置默认');
    }
    box.innerHTML = ADDRS.map(a =>
      '<div class="am-li' + (a.def ? ' def' : '') + '">'
      + '<div class="main"><div class="t">' + a.name + '<span class="tel">' + a.tel + '</span>'
      + (a.def ? '<span class="addr-def">默认</span>' : '')
      + '<span class="addr-tag">' + a.tag + '</span></div>'
      + '<div class="s">' + addrFull(a) + '</div></div>'
      + '<div class="am-ops">'
      +   (a.def ? '' : '<button class="am-op" onclick="LP.setDefAddr(' + a.id + ')">设为默认</button>')
      +   '<button class="am-op" onclick="LP.editAddr(' + a.id + ')">编辑</button>'
      +   '<button class="am-op del" onclick="LP.delAddr(' + a.id + ')">删除</button>'
      + '</div></div>'
    ).join('');
  }

  /** 进入新增/编辑地址页；id 为 0 表示新增 */
  function editAddr(id){
    addrFrom = (CUR === 'addrlist') ? 'addrlist' : 'pickup';
    editingAddr = id || 0;
    resetAddrForm();
    if(id){
      const a = addrById(id);
      document.getElementById('adName').value = a.name;
      document.getElementById('adTel').value = a.tel.replace(/\s/g,'');
      document.getElementById('adDetail').value = a.detail;
      rg = { p:a.prov, c:a.city, d:a.dist }; rgLevel = 2;
      const region = document.getElementById('adRegion');
      if(region){
        region.classList.add('filled');
        region.querySelector('.rg-text').textContent = a.prov + ' ' + a.city + ' ' + a.dist;
      }
      const def = document.getElementById('adDefault');
      if(def) def.checked = !!a.def;
      $all('#adTags .ad-chip').forEach(c=>c.classList.toggle('on', c.textContent.trim() === a.tag));
    }
    const t = document.getElementById('addAddrTitle');
    if(t) t.textContent = id ? '编辑收货地址' : '新增收货地址';
    show('addaddr');
  }

  function delAddr(id){
    const i = ADDRS.findIndex(a=>a.id === id);
    if(i < 0) return;
    if(ADDRS.length <= 1){ toast('至少保留一个收货地址'); return; }
    const wasDef = ADDRS[i].def;
    ADDRS.splice(i, 1);
    if(wasDef && !ADDRS.some(a=>a.def)) ADDRS[0].def = true;
    if(curAddr === id) curAddr = ADDRS[0].id;
    renderAddrManage();
    renderPickAddr();
    toast('收货地址已删除');
  }

  function setDefAddr(id){
    ADDRS.forEach(a=>{ a.def = (a.id === id); });
    renderAddrManage();
    renderPickAddr();
    toast('已设为默认地址');
  }

  function saveAddr(){
    const name = (document.getElementById('adName').value || '').trim();
    const tel  = (document.getElementById('adTel').value || '').replace(/\s/g,'');
    const detail = (document.getElementById('adDetail').value || '').trim();
    if(!name){ toast('请填写收货人姓名'); return; }
    if(!/^1\d{10}$/.test(tel)){ toast('请填写正确的 11 位手机号'); return; }
    if(!rg.d){ toast('请选择所在地区'); return; }
    if(detail.length < 4){ toast('请填写详细地址'); return; }

    const isDef = document.getElementById('adDefault').checked;
    const tagEl = document.querySelector('#adTags .ad-chip.on');
    const item = {
      id: Date.now(), name,
      tel: tel.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3'),
      prov: rg.p, city: rg.c, dist: rg.d, detail,
      tag: tagEl ? tagEl.textContent.trim() : '家',
      def: isDef
    };
    if(editingAddr){
      const a = addrById(editingAddr);
      Object.assign(a, {name, tel:item.tel, prov:rg.p, city:rg.c, dist:rg.d, detail, tag:item.tag});
      if(isDef){ ADDRS.forEach(x=>x.def=false); a.def = true; }
      else if(a.def && !isDef){
        a.def = false;
        if(!ADDRS.some(x=>x.def)) ADDRS[0].def = true;
      }
      curAddr = a.id;
    } else {
      if(isDef) ADDRS.forEach(a=>a.def=false);
      ADDRS.push(item);
      curAddr = item.id;
    }
    renderPickAddr();
    renderAddrManage();
    toast(editingAddr ? '地址已更新' : '地址已保存并选用');
    editingAddr = 0;
    setTimeout(()=>show(addrFrom === 'addrlist' ? 'addrlist' : 'pickup'), 500);
  }

  /* ---------- 省市区选择 ---------- */
  const REGION = {
    '湖南省': {
      '湘潭市': ['雨湖区','岳塘区','湘潭县','湘乡市'],
      '长沙市': ['岳麓区','芙蓉区','天心区','开福区','雨花区']
    },
    '江西省': {
      '南昌市': ['东湖区','西湖区','青山湖区','新建区'],
      '九江市': ['浔阳区','濂溪区','瑞昌市']
    },
    '广东省': {
      '广州市': ['天河区','越秀区','海珠区','番禺区'],
      '深圳市': ['南山区','福田区','罗湖区','宝安区']
    }
  };
  let rg = { p:'', c:'', d:'' };
  let rgLevel = 0;

  function pickRegion(){
    rg = { p:'', c:'', d:'' }; rgLevel = 0;
    renderRegion();
    document.getElementById('regionMask').classList.add('on');
  }
  function closeRegion(){ document.getElementById('regionMask').classList.remove('on'); }

  function renderRegion(){
    const crumb = document.getElementById('rgCrumb');
    const list  = document.getElementById('rgList');
    if(!crumb || !list) return;
    const arrow = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
    const back = '<span style="float:right;color:var(--lp-red);font-weight:800" onclick="LP.rgBack()">‹ 上一步</span>';
    if(rgLevel === 0){
      crumb.innerHTML = '请选择省份';
      list.innerHTML = Object.keys(REGION).map(p=>
        '<div class="rg-item" onclick="LP.rgPick(\'' + p + '\')">' + p + arrow + '</div>').join('');
    } else if(rgLevel === 1){
      crumb.innerHTML = '<b>' + rg.p + '</b> · 请选择城市' + back;
      list.innerHTML = Object.keys(REGION[rg.p]).map(c=>
        '<div class="rg-item" onclick="LP.rgPick(\'' + c + '\')">' + c + arrow + '</div>').join('');
    } else {
      crumb.innerHTML = '<b>' + rg.p + '</b> · <b>' + rg.c + '</b> · 请选择区县' + back;
      list.innerHTML = REGION[rg.p][rg.c].map(d=>
        '<div class="rg-item" onclick="LP.rgPick(\'' + d + '\')">' + d + '</div>').join('');
    }
  }

  function rgPick(name){
    if(rgLevel === 0){ rg.p = name; rgLevel = 1; }
    else if(rgLevel === 1){ rg.c = name; rgLevel = 2; }
    else {
      rg.d = name;
      const el = document.getElementById('adRegion');
      el.classList.add('filled');
      el.querySelector('.rg-text').textContent = rg.p + ' ' + rg.c + ' ' + rg.d;
      closeRegion();
      return;
    }
    renderRegion();
  }
  function rgBack(){
    if(rgLevel === 2){ rgLevel = 1; rg.d = ''; }
    else if(rgLevel === 1){ rgLevel = 0; rg.c = ''; rg.p = ''; }
    renderRegion();
  }

  /* ---------- 客服中心 ---------- */
  const SERVICE_TEL = '4008881740';

  function callService(){
    const m = document.getElementById('telMask');
    if(m) m.classList.add('on');
  }
  function closeTel(){
    const m = document.getElementById('telMask');
    if(m) m.classList.remove('on');
  }
  function doCall(){
    closeTel();
    toast('正在呼叫 400-888-1740');
    // 真机才真正拉起拨号；桌面演示只提示，避免误开系统通话
    if(document.documentElement.classList.contains('is-mobile')){
      setTimeout(()=>{ try{ window.location.href = 'tel:' + SERVICE_TEL; }catch(e){} }, 300);
    }
  }
  function openQr(){
    const m = document.getElementById('qrMask');
    if(m) m.classList.add('on');
  }
  function closeQr(){
    const m = document.getElementById('qrMask');
    if(m) m.classList.remove('on');
  }
  function saveQr(){ toast('二维码已保存到相册（演示）'); }
  function faq(el){ if(el) el.classList.toggle('on'); }

  /* ---------- 在线客服会话 ---------- */
  const CHAT_RULES = [
    {k:['提货','发货','物流','进度'], a:'帮您查了：第 2 次提货（40 瓶）当前是待发货，48 小时内发出，顺丰冷链。发出后可在「订单 → 提货记录」看单号。'},
    {k:['转期','升级','补差'], a:'转期需剩余 ≥ 100 瓶、且未转过期。一年期可转二年期（单瓶补 45 元）或三年期（单瓶补 90 元），按「单瓶差价 × 剩余瓶数」在线补差，支付后即时生效。'},
    {k:['家庭日','报名','参观'], a:'家庭日按酿造节点开放：一年期 3 次、二年期 5 次、三年期 7 次。活动前 7 天会推送订阅消息和站内消息，点开就能报名，名额不限。'},
    {k:['发票','开票'], a:'可以开电子普票。把订单号、抬头、税号发我，3 个工作日内开好发到您邮箱。'},
    {k:['退','退钱','退款'], a:'酿造开始前可以在小程序里申请退款，原路退回；开始之后不支持线上退，需要线下沟通处理，我这边可以帮您登记。'}
  ];

  function chatReply(text){
    for(const r of CHAT_RULES){ if(r.k.some(k=>text.indexOf(k)>=0)) return r.a; }
    return '收到，我先帮您登记下。如果是订单相关的问题，把订单号发我，我这边直接查到具体进度回您。';
  }
  function chatScrollBottom(){
    const w = document.getElementById('chatScroll');
    if(w) w.scrollTop = w.scrollHeight;
  }
  function chatPush(html){
    const list = document.getElementById('chatList');
    if(!list) return;
    const d = document.createElement('div');
    d.className = 'msg me';
    d.innerHTML = '<div class="bub">' + html + '</div>';
    list.appendChild(d);
  }
  function chatSay(text){
    const list = document.getElementById('chatList');
    if(!list) return;
    const d = document.createElement('div');
    d.className = 'msg sv';
    d.innerHTML = '<div class="av">酱</div><div class="bub">' + text + '</div>';
    list.appendChild(d);
    chatScrollBottom();
  }
  function chatSend(text){
    const inp = document.getElementById('chatInput');
    const msg = (typeof text === 'string' ? text : (inp ? inp.value : '')).trim();
    if(!msg){ toast('说点什么再发送吧'); return; }
    chatPush(msg.replace(/</g,'&lt;'));
    if(inp && typeof text !== 'string') inp.value = '';
    chatScrollBottom();
    const list = document.getElementById('chatList');
    const typing = document.createElement('div');
    typing.className = 'msg sv';
    typing.innerHTML = '<div class="av">酱</div><div class="bub" style="color:var(--lp-ink-3)">小酱正在输入…</div>';
    if(list){ list.appendChild(typing); chatScrollBottom(); }
    setTimeout(()=>{
      if(typing.parentNode) typing.parentNode.removeChild(typing);
      chatSay(chatReply(msg));
    }, 800);
  }
  function chatQuick(el){ if(el) chatSend(el.textContent.trim()); }

  /* ---------- 事件委托 ---------- */
  document.getElementById('screens').addEventListener('click', e=>{
    const go = e.target.closest('[data-go]');
    if(go){
      e.preventDefault();
      // 导航栏返回按钮：优先回上一页，无历史时用原跳转目标兜底
      if(go.classList.contains('nb-btn')) { back(CUR, go.dataset.go); return; }
      show(go.dataset.go);
      if(go.dataset.month) setTimeout(()=>focusFb(go.dataset.month), 160);
      return;
    }
  });
  document.getElementById('tabbar').addEventListener('click', e=>{
    const t = e.target.closest('.lp-tab'); if(t){ HIST.length = 0; show(t.dataset.tab); }
  });

  /* ---------- 桌面端手机外壳自适应缩放：始终完整可见、不变形 ---------- */
  function fitDevice(){
    const stage=document.querySelector('.lp-stage');
    const fit=document.querySelector('.lp-fit');
    const dev=document.querySelector('.lp-device');
    if(!stage||!fit||!dev) return;
    if(document.documentElement.classList.contains('is-mobile')){fit.style.width=fit.style.height='';dev.style.transform='';return;}
    const W=390,H=844;
    const cs=getComputedStyle(stage);
    const padX=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight);
    const padY=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
    const availW=Math.max(240, stage.clientWidth-padX);
    const availH=Math.max(320, window.innerHeight-padY-64); // 64 ≈ 顶部提示条留白
    const s=Math.min(1, availW/W, availH/H);
    fit.style.width=(W*s)+'px';
    fit.style.height=(H*s)+'px';
    dev.style.transform='scale('+s+')';
  }

  /* ---------- 启动：加载进度 ---------- */
  /* ---------- 首页 Banner 轮播 ---------- */
  let heroTimer = null, heroIdx = 0;
  function heroGo(n){
    const slides = $all('#heroBanner .bn-slide');
    const dots = $all('#heroDots i');
    if(!slides.length) return;
    heroIdx = (n + slides.length) % slides.length;
    slides.forEach((s,i)=>s.classList.toggle('is-on', i===heroIdx));
    dots.forEach((d,i)=>d.classList.toggle('on', i===heroIdx));
    const cur = document.getElementById('heroCur');
    if(cur) cur.textContent = String(heroIdx+1).padStart(2,'0');
  }
  function heroPlay(){
    clearInterval(heroTimer);
    heroTimer = setInterval(()=>heroGo(heroIdx+1), 4200);
  }
  function initHero(){
    const wrap = document.getElementById('heroBanner');
    if(!wrap) return;
    const dots = document.getElementById('heroDots');
    if(dots){
      dots.addEventListener('click', e=>{
        const d = e.target.closest('i'); if(!d) return;
        heroGo(+d.dataset.i); heroPlay();
      });
    }
    // 触摸 / 鼠标拖拽切换
    let sx=0, dragging=false, moved=false;
    wrap.addEventListener('pointerdown', e=>{ sx=e.clientX; dragging=true; moved=false; });
    wrap.addEventListener('pointermove', e=>{
      if(!dragging) return;
      if(Math.abs(e.clientX-sx)>36){ moved=true; }
    });
    wrap.addEventListener('pointerup', e=>{
      if(!dragging) return; dragging=false;
      const dx = e.clientX - sx;
      if(dx < -36){ heroGo(heroIdx+1); heroPlay(); }
      else if(dx > 36){ heroGo(heroIdx-1); heroPlay(); }
      else if(moved){ /* 微小位移忽略 */ }
    });
    wrap.addEventListener('pointercancel', ()=>{ dragging=false; });
    // 鼠标悬停暂停（桌面演示时更从容）
    wrap.addEventListener('mouseenter', ()=>clearInterval(heroTimer));
    wrap.addEventListener('mouseleave', heroPlay);
    // 页面不可见时暂停
    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden) clearInterval(heroTimer); else heroPlay();
    });
    heroGo(0); heroPlay();
  }

  function boot(){
    fitDevice();
    initHero();
    window.addEventListener('resize', fitDevice);
    window.addEventListener('orientationchange', fitDevice);
    buildNav();
    renderMine();
    document.querySelector('.lp-statusbar').classList.add('dark');
    document.getElementById('navToggle').addEventListener('click', toggleNav);
    const bar=document.getElementById('splashBar');
    let p=0; const t=setInterval(()=>{p+=Math.random()*14+6; if(p>=100){p=100;clearInterval(t); setTimeout(()=>show('home'),420);} bar.style.width=p+'%';},180);
    document.querySelector('.lp-splash').addEventListener('click',()=>{clearInterval(t);show('home');});
    // 时钟
    const clk=document.getElementById('clk');
    function tick(){const d=new Date();clk.textContent=d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');}
    tick(); setInterval(tick,10000);
  }
  window.LP = {show,back,selCycle,selPType,selTcycle,pay,playVideo,familySubmit,pickupSubmit,transferSubmit,toggleNav,closeNav,renderTransfer,heroGo,
    toggleFb,viewImg,closeImg,focusFb,
    openAddr,closeAddr,chooseAddr,saveAddr,pickTag,pickRegion,closeRegion,rgPick,rgBack,renderPickAddr,
    renderAddrManage,editAddr,delAddr,setDefAddr,
    selWay,setWay,openGift,closeGift,giftSubmit,closeGiftOk,
    renderMyReg,regDetail,
    openOrder,renderOrder,openRefund,pickReason,refundSubmit,copyCode,goExpress,
    payNow,cancelOrder,
    callService,closeTel,doCall,openQr,closeQr,saveQr,faq,openCert,closeCert,saveCert,chatSend,chatQuick,
    requireLogin,closeLogin,wxLogin,bindPhone,skipPhone,logout,doc,soon,renderMine};
  window.addEventListener('DOMContentLoaded', boot);
})();
