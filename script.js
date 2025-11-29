// ==========================================
// 0. SUPABASE CONFIGURATION (请填写你的密钥)
// ==========================================
const SUPABASE_URL = 'https://iytxwgyhemetdkmqoxoa.supabase.co'; // 替换这里
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dHh3Z3loZW1ldGRrbXFveG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzI3MDIsImV4cCI6MjA3OTkwODcwMn0.ZsiueMCjwm5FoPlC3IDEgmsPaabkhefw3uHFl6gBm7Q';          // 替换这里
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 全局变量：存聊天记录
let globalChatHistory = [];
// ==========================================
// 1. 全局变量与配置 (Global Config & Variables)
// ==========================================

// Google Places & Roof Preview Variables
let autocomplete;
let extractedPostcode = "";
let extractedState = "";
const GOOGLE_API_KEY = "AIzaSyDPGUUSb3VX0CGsUgwENW0djTyl6morWTY";

// 用户用电画像状态
let userApplianceProfile = {
    wfh: false,       // 居家办公
    pool: false,      // 泳池
    ac: false,        // 空调
    general: false,   // 大型家电
    ev_now: false,    // 现有电动车
    ev_plan: false,   // 计划电动车
    hws: false,       // 电热水器
    gas2elec: false,  // 煤气改电
    backup: false,    // 停电备份
    others: false,
};

let config = {
    base_pricing: {
        solar_per_w: 0.9,
        install_base_fee: 0,
        battery_tiers: {
            entry_rate_per_kwh: 350,
            medium_rate_per_kwh: 600,
            premium_rate_per_kwh: 900,
            fixed_profit_markup: 4000
        },
        install_labor_adder: { mixed_install: 500, battery_only: 1500 },
        addon_extras: { addon_roof_terra: 800, addon_storey_double: 300, addon_storey_triple: 500, addon_shading: 1500 }
    },
    subsidy_logic: {
        fed_stc_price_net: 37.5,
        stc_deeming_years: 6,
        fed_bat_rate_per_kwh: 340,
        fed_bat_cap_kwh: 50,
        nsw_vpp_cap_kwh: 28,
        rebate_vic: 1400,
        rebate_qld: 3000,
        rebate_nsw_rate: 55,
        rebate_sa: 350
    },
    roi_logic: {
        annual_tariff_escalation_percent: 0.04,
        battery_lifespan_years: 15,
        battery_savings_penalty_threshold: 2.5
    }
};

const solarTiers = [6.6, 8, 10, 13, 15, 20];

// [智能联动推荐表]
const recommendationMap = [
    { bill: 0, solarIdx: 0, solarKw: 6.6, bat: 20, validBats: [20, 30], inverter: 5 },
    { bill: 301, solarIdx: 1, solarKw: 8, bat: 30, validBats: [30], inverter: 5 },
    { bill: 501, solarIdx: 2, solarKw: 10, bat: 40, validBats: [40], inverter: 10 },
    { bill: 1001, solarIdx: 3, solarKw: 13, bat: 40, validBats: [40], inverter: 10 },
    { bill: 1501, solarIdx: 5, solarKw: 20, bat: 50, validBats: [50], inverter: 15, is3Phase: true }
];

const i18n = {
    cn: {
        lbl_notes: "备注 / 特殊需求 (选填)",
        ph_notes: "温馨提示：如果您方便上传电费单或电表箱照片，将有助于工程师为您提供最精准的最终报价。",
        lbl_file: "上传电费单或照片 (选填)",
        title: "澳洲光伏储能智能报价器",
        subtitle: "Solaryo 官方认证引擎",
        lbl_mode: "安装模式", mode_solar: "仅太阳能", mode_bat: "加装电池", mode_both: "太阳能+电池",
        lbl_state: "所在州/领地", sec_house: "房屋详情",
        lbl_storeys: "房屋层数", storey_1: "单层", storey_2: "双层", storey_3: "三层",
        lbl_roof: "屋顶材质", roof_tin: "铁皮顶", roof_tile: "水泥瓦", roof_terra: "陶土瓦/石板",
        lbl_property_type: "房产类型", property_house: "独立屋 (House)", property_duplex: "双拼屋 (Duplex)", property_townhouse: "联排别墅 (Townhouse)", property_villa: "别墅 (Villa)", property_land: "空地 (Land)", property_unknown: "不清楚 (Unknown)",
        lbl_phase: "电相", phase_single: "单相", phase_three: "三相", phase_unknown: "不清楚",
        lbl_shade: "是否有阴影?", shade_no: "无阴影", shade_yes: "有部分遮挡",
        sec_usage: "用电情况", lbl_bill: "季度电费",
        lbl_solar_size: "新装系统大小", lbl_exist_solar: "现有太阳能系统", lbl_bat_size: "电池容量",
        note_exist_solar: "* 用于计算电池充电效率。",
        lbl_eligible: "可用补贴政策",
        reb_vic: "维州 Solar Homes 补贴 ($1,400)", reb_qld: "昆州 Battery Booster 补贴 (名额已满)",
        nsw_vpp_label: "NSW VPP 连接奖励 (BESS2)", nsw_vpp_disabled: "不可申请 (电池容量 ≥ 28kWh)",
        reb_act: "可申请 ACT $15k 无息贷款", reb_tas: "可申请 TAS 节能贷款", reb_nt: "符合 Zone 1 最高 STC 补贴标准！",
        btn_calc: "计算报价", rec_title: "专家建议：",
        res_gross: "总造价",
        res_stc_solar: "联邦 STC (太阳能)", res_stc_battery: "联邦 STC (电池 50kWh封顶)",
        res_state: "州政府 VPP 补贴",
        res_net: "预计自付 (含GST)",
        res_final_comparison: "最终净价对比 (三档方案)",
        tier_entry: "入门级", tier_medium: "中端级", tier_premium: "高端级",
        lead_title: "获取正式方案", lead_desc: "我们将根据您所在的州发送定制方案。", btn_submit: "提交咨询",
        unlock_title: "解锁完整报价单", unlock_desc: "输入您的联系方式以查看详细价格明细。", btn_unlock: "查看完整价格",
        disclaimer: "* 声明：所有估价均为预估值 (Estimate)，实际报价以销售人员最终报价为准。NSW补贴仅限<28kWh。",
        alert_sent: "已发送！我们会尽快联系您。",
        rec_nt: "您位于北领地 (Zone 1)，太阳能 STC 补贴全澳最高！",
        rec_loan: "提示：该州提供无息贷款，可大大降低首付压力。",
        rec_std: "标准配置，适合您的用电习惯。",
        rec_bat: "建议加装电池！(注意：NSW用户若安装>28kWh将失去州补贴)",
        rec_warn_small_solar: "⚠️ 警告：您的太阳能系统太小，无法充满这台大容量电池 (>20kWh)。",
        warn_nsw_limit: "⚠️ 注意：电池容量超过28kWh，无法申请NSW州政府补贴。",
        warn_qld_exhausted: "⚠️ 注意：昆州 Battery Booster 补贴目前已耗尽，暂无法申请。",
        roi_title: "预计每年节省电费", payback_label: "预计回本周期：", chart_curr: "当前电费 (年)", chart_new: "安装后电费 (年)", chart_saved: "节省金额", years: "年",
        err_required: "请填写所有必填字段（姓名、邮箱、电话）。", err_email: "请输入有效的邮箱地址。", err_phone: "请输入有效的澳洲电话号码（例如 04xx xxx xxx）。",
        ph_name: "姓名 (Name)*", ph_email: "电子邮箱 (Email)*", ph_phone: "电话 (Phone)*", ph_address: "安装地址 (Address)",
        badge_rec: "🌟 我们的建议",
        rec_prefix: "基于电费", rec_suffix: "，推荐配置：",
        rec_inv: "kW 逆变器", rec_phase3: "(仅限三相)",
        rec_not_rec: "由于您的季度电费较低，加装太阳能系统的回本周期会过长。从投资回报角度考量，建议您暂时无需安装。",
        vpp_title: "加入 VPP 还能再省钱！",
        vpp_desc: "连接电池到虚拟电厂，每年额外躺赚最高至 $800。",
        vpp_what_is: "(什么是 VPP?)",
        modal_vpp_title: "什么是虚拟电厂 (VPP)?",
        modal_vpp_text: "虚拟电厂 (VPP) 将您的家用电池与其他用户的电池联网。...",
        btn_final_enquiry: "预约专家咨询 & 敲定报价",
        modal_conf_title: "确认联系方式",
        modal_conf_desc: "请核对您的信息。我们的工程师将尽快联系您以制定最终方案。",
        btn_confirm_send: "确认并发送正式询盘",
        alert_final_success: "收到！我们会优先处理您的咨询。",
        ph_postcode: "邮编 (Postcode)*",
        err_postcode: "请输入有效的澳洲4位邮编。",
        lbl_contact_method: "偏好联系方式", contact_phone: "电话", contact_email: "邮件", contact_sms: "短信",
        lbl_timeframe: "期望安装时间", tf_imm: "越快越好", tf_4w: "未来 4 周内", tf_3m: "未来 3 个月内", tf_later: "3个月以后 / 仅询价",
        social_proof: "已有 <span class='proof-number'>{num}+</span> 澳洲家庭获取了报价",
        roof_found: "已定位屋顶",
        lbl_appliance_trigger: "家庭能耗画像 & 需求",
        modal_profile_title: "选择您的用电设施",
        modal_profile_desc: "请选择符合您情况的选项，这将帮助我们精准计算自用率。",
        btn_done: "选好了",
        use_wfh: "居家办公", use_pool: "泳池/Spa", use_ac: "中央空调", use_general: "大型家电/烘干机",
        use_ev_now: "已有电动车", use_ev_plan: "计划买电动车",
        use_hws: "电热水器", use_gas2elec: "煤气改电", use_backup: "需要停电备份", use_others: "其他设备",
        selected_count: "已选择 {n} 项",

        // [新增] 底部悬浮栏 & 假加载
        sticky_net: "预估净价",
        btn_book_now: "立即预约",
        step_1: "正在分析用电量和系统配置...",
        step_2: "正在计算联邦与州政府补贴...",
        step_3: "正在比对售商报价...",
        quote_ready: "报价已生成！",

        chat_agent: "Solaryo 智能客服",
        chat_online: "在线",
        chat_welcome: "👋 您好！我是您的太阳能助手。<br>关于报价、电池或补贴有什么可以帮您的吗？",
        chat_placeholder: "请输入您的问题...",
        chat_just_now: "刚刚"
    },
    en: {
        lbl_notes: "Notes / Special Requirements (Optional)",
        ph_notes: "Tip: Uploading your electricity bill or a photo of your switchboard helps us provide the most accurate quote possible.",
        lbl_file: "Upload Bill or Photo (Optional)",
        title: "Smart Solar & Battery Quote",
        subtitle: "Official Solaryo Engine",
        lbl_mode: "Installation Mode", mode_solar: "Solar Only", mode_bat: "Battery Only", mode_both: "Solar + Battery",
        lbl_state: "State / Territory", sec_house: "Property Details",
        lbl_storeys: "Storeys", storey_1: "Single Storey", storey_2: "Double Storey", storey_3: "Triple Storey",
        lbl_roof: "Roof Type", roof_tin: "Tin/Metal", roof_tile: "Tile", roof_terra: "Terracotta / Slate",
        lbl_property_type: "Property Type", property_house: "House", property_duplex: "Duplex", property_townhouse: "Townhouse", property_villa: "Villa", property_land: "Land", property_unknown: "Unknown",
        lbl_phase: "Phase Type", phase_single: "Single Phase", phase_three: "Three Phase", phase_unknown: "Unknown",
        lbl_shade: "Shading?", shade_no: "No Shade", shade_yes: "Partial Shade",
        sec_usage: "Usage Profile", lbl_bill: "Quarterly Bill",
        lbl_solar_size: "New System Size", lbl_exist_solar: "Existing Solar System", lbl_bat_size: "Battery Storage",
        note_exist_solar: "* Needed for charging calculation.",
        lbl_eligible: "Incentives & Rebates",
        reb_vic: "VIC Solar Homes Rebate ($1,400)", reb_qld: "QLD Battery Booster (Allocation Exhausted)",
        nsw_vpp_label: "NSW VPP Connection Incentive", nsw_vpp_disabled: "Ineligible (Capacity ≥ 28kWh)",
        reb_act: "Eligible for ACT $15k Interest-Free Loan", reb_tas: "Eligible for TAS Energy Saver Loan", reb_nt: "Eligible for Zone 1 High Subsidy!",
        btn_calc: "Get Quote", rec_title: "Our Recommendation:",
        res_gross: "Gross Price",
        res_stc_solar: "Federal Solar STC", res_stc_battery: "Federal Battery STC (50kWh Cap)",
        res_state: "State VPP Incentive (<28kWh)",
        res_net: "Total Net Price (Inc. GST)",
        res_final_comparison: "Final Net Price Comparison",
        tier_entry: "Entry", tier_medium: "Medium", tier_premium: "Premium",
        lead_title: "Lock in Quote", lead_desc: "Get a formal consultation based on your location.", btn_submit: "Send Enquiry",
        unlock_title: "UNLOCK FULL QUOTE", unlock_desc: "Enter your details to reveal the net price breakdown.", btn_unlock: "Reveal Price",
        disclaimer: "* Disclaimer: All quotes are estimates only.",
        alert_sent: "Enquiry Sent! We will contact you shortly.",
        rec_nt: "Zone 1 (NT) offers the highest Solar STC rebate in Australia!",
        rec_loan: "Tip: Interest-Free Loans available in this state.",
        rec_std: "Standard setup matches your usage.",
        rec_bat: "Battery Recommended! (Note: NSW State rebate void if >28kWh)",
        rec_warn_small_solar: "⚠️ Warning: Your solar system is too small to fully charge this large battery (>20kWh).",
        warn_nsw_limit: "⚠️ Alert: System ≥28kWh is ineligible for NSW VPP Rebate.",
        warn_qld_exhausted: "⚠️ Note: QLD Battery Booster allocation is currently exhausted.",
        roi_title: "Estimated Annual Savings", payback_label: "Est. Payback Period:", chart_curr: "Current Bill", chart_new: "New Bill", chart_saved: "Savings", years: "Years",
        err_required: "Please fill in all required fields (Name, Email, Phone).", err_email: "Please enter a valid email address.", err_phone: "Please enter a valid Australian phone number.",
        ph_name: "Name*", ph_email: "Email*", ph_phone: "Phone*", ph_address: "Installation Address",
        badge_rec: "🌟 Our Recommendation",
        rec_prefix: "Based on bill", rec_suffix: ", recommended:",
        rec_inv: "kW Inverter", rec_phase3: " (3-Phase Only)",
        rec_not_rec: "Given your low quarterly bill, payback period would be excessive.",
        vpp_title: "Join VPP & Earn Extra!", vpp_desc: "Connect battery to earn an extra up to $800/year.", vpp_what_is: "(What is VPP?)",
        modal_vpp_title: "What is a Virtual Power Plant (VPP)?", modal_vpp_text: "A VPP connects your home battery...",
        btn_final_enquiry: "Book Consultation & Finalise Quote",
        modal_conf_title: "Final Confirmation", modal_conf_desc: "Please verify your details.",
        btn_confirm_send: "Confirm & Send Enquiry",
        alert_final_success: "Received! We will prioritize your enquiry.",
        ph_postcode: "Postcode*", err_postcode: "Please enter a valid 4-digit Postcode.",
        lbl_contact_method: "Preferred Contact Method", contact_phone: "Phone", contact_email: "Email", contact_sms: "SMS",
        lbl_timeframe: "Preferred Installation Time", tf_imm: "Immediately", tf_4w: "In the next 4 weeks", tf_3m: "In the next 3 months", tf_later: "Over 3 months / Ballpark price",
        social_proof: "Already <span class='proof-number'>{num}+</span> Aussie families requested quotes",
        roof_found: "Roof Detected",
        lbl_appliance_trigger: "Energy Profile & Needs",
        modal_profile_title: "Select Energy Profile",
        modal_profile_desc: "Select all that apply for accurate ROI calculation.",
        btn_done: "Done",
        use_wfh: "Home Office", use_pool: "Pool / Spa", use_ac: "Central A/C", use_general: "Large Appliances",
        use_ev_now: "EV (Existing)", use_ev_plan: "EV (Planned)",
        use_hws: "Elec Hot Water", use_gas2elec: "Gas to Electric", use_backup: "Need Backup", use_others: "Others",
        selected_count: "{n} items selected",

        // [New] Sticky Footer & Fake Loader
        sticky_net: "Total Net Price",
        btn_book_now: "Book Now",
        step_1: "Analyzing usage profile and system configuration...",
        step_2: "Calculating Federal & State Rebates...",
        step_3: "Comparing pricing across retailers...",
        quote_ready: "Quote Ready!",

        chat_agent: "Solaryo Expert",
        chat_online: "Online",
        chat_welcome: "👋 Hi there! I'm your virtual solar assistant. <br>Need help with the quote, battery advice, or pricing?",
        chat_placeholder: "Type a message...",
        chat_just_now: "Just now"
    }
};

// --- 2. 交互逻辑 (Interaction) ---

let curLang = 'en';
let curMode = 'solar';
let selectedTier = 'entry';
let currentRecValues = { solarIdx: -1, validBats: [] };

function setLang(lang) {
    curLang = lang;
    document.body.className = 'lang-' + lang;
    document.querySelectorAll('.lang-switch button').forEach(b => b.classList.remove('active'));
    const target = event ? event.target : null;
    if (target) target.classList.add('active');
    else if (lang === 'en') document.querySelectorAll('.lang-switch button')[1].classList.add('active');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) { } else {
                el.innerHTML = i18n[lang][key];
            }
        }
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (i18n[lang][key]) el.placeholder = i18n[lang][key];
    });

    updateSocialProof();
    updateTriggerText();
    checkRebates();
    if (document.getElementById('result-card').style.display === 'block') calculate(false);
}

function setMode(mode) {
    curMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + mode).classList.add('active');

    const groups = {
        solar: document.getElementById('group-solar'),
        exist: document.getElementById('group-exist-solar'),
        shade: document.getElementById('group-shade'),
        battery: document.getElementById('group-battery'),
        solarPropertyFields: document.getElementById('solar-property-fields'),
        batteryPropertyFields: document.getElementById('battery-property-fields')
    };

    if (mode === 'battery') {
        groups.solar.style.display = 'none'; groups.exist.style.display = 'block'; groups.shade.style.display = 'none';
        groups.battery.style.display = 'block'; groups.solarPropertyFields.style.display = 'none'; groups.batteryPropertyFields.style.display = 'grid';
    } else if (mode === 'both') {
        groups.solar.style.display = 'block'; groups.exist.style.display = 'none'; groups.shade.style.display = 'block';
        groups.battery.style.display = 'block'; groups.solarPropertyFields.style.display = 'grid'; groups.batteryPropertyFields.style.display = 'grid';
    } else {
        groups.solar.style.display = 'block'; groups.exist.style.display = 'none'; groups.shade.style.display = 'block';
        groups.battery.style.display = 'none'; groups.solarPropertyFields.style.display = 'grid'; groups.batteryPropertyFields.style.display = 'none';
    }
    checkRebates();
}

function updateVal(type) {
    const solarInput = document.getElementById('solar-input');
    const batInput = document.getElementById('bat-input');
    const badgeSolar = document.getElementById('badge-solar');
    const badgeBat = document.getElementById('badge-bat');

    if (type === 'solar') document.getElementById('solar-val').innerText = solarTiers[parseInt(solarInput.value)];
    if (type === 'exist-solar') document.getElementById('exist-solar-val').innerText = solarTiers[parseInt(document.getElementById('exist-solar-input').value)];
    if (type === 'battery') document.getElementById('bat-val').innerText = batInput.value;
    if (type === 'bill') document.getElementById('bill-val').innerText = document.getElementById('bill-input').value;

    if (type === 'bill') {
        const billVal = parseFloat(document.getElementById('bill-input').value);
        let rec = recommendationMap[0];
        for (let i = 0; i < recommendationMap.length; i++) {
            if (billVal >= recommendationMap[i].bill) rec = recommendationMap[i];
        }
        currentRecValues.solarIdx = rec.solarIdx;
        currentRecValues.validBats = rec.validBats;

        solarInput.value = rec.solarIdx;
        document.getElementById('solar-val').innerText = solarTiers[rec.solarIdx];
        batInput.value = rec.bat;
        document.getElementById('bat-val').innerText = rec.bat;

        if (curMode !== 'battery' && billVal <= 200) {
            badgeSolar.style.display = 'none'; badgeBat.style.display = 'none';
        } else {
            badgeSolar.style.display = 'inline-block'; badgeBat.style.display = 'inline-block';
        }
        if (document.getElementById('result-card').style.display === 'block') calculate(false);
    }
    if (type === 'solar') {
        if (parseInt(solarInput.value) !== currentRecValues.solarIdx) badgeSolar.style.display = 'none';
        else if (currentRecValues.solarIdx !== -1) badgeSolar.style.display = 'inline-block';
    }
    if (type === 'battery') {
        const curBat = parseInt(batInput.value);
        if (!currentRecValues.validBats.includes(curBat)) badgeBat.style.display = 'none';
        else if (currentRecValues.validBats.length > 0) badgeBat.style.display = 'inline-block';
    }
}

function selectTier(tier) {
    selectedTier = tier;
    document.querySelectorAll('.tier-box').forEach(box => box.classList.remove('active'));
    document.getElementById(`box-${tier}`).classList.add('active');
    calculate(false);
}

function checkRebates() {
    const state = document.getElementById('state-select').value;
    const section = document.getElementById('rebate-section');
    const batSize = parseFloat(document.getElementById('bat-input').value);
    const els = { vic: document.getElementById('check-vic-solar'), qld: document.getElementById('check-qld-bat'), nsw: document.getElementById('check-nsw-prds'), act: document.getElementById('check-act-loan'), tas: document.getElementById('check-tas-loan'), nt: document.getElementById('check-nt-stc') };
    const NSW_CAP = config.subsidy_logic.nsw_vpp_cap_kwh || 28;

    Object.values(els).forEach(el => el.style.display = 'none');
    section.style.display = 'none';
    let hasInfo = false;

    if (state === 'VIC' && curMode !== 'battery') { els.vic.style.display = 'flex'; hasInfo = true; }
    if (state === 'QLD' && curMode !== 'solar') { els.qld.style.display = 'flex'; hasInfo = true; }
    if (state === 'NSW' && curMode !== 'solar') {
        els.nsw.style.display = 'flex'; hasInfo = true;
        const cb = els.nsw.querySelector('input');
        if (batSize >= NSW_CAP) { cb.checked = false; cb.disabled = true; els.nsw.style.opacity = '0.5'; }
        else { cb.disabled = false; els.nsw.style.opacity = '1'; }
    }
    if (state === 'ACT') { els.act.style.display = 'flex'; hasInfo = true; }
    if (state === 'TAS') { els.tas.style.display = 'flex'; hasInfo = true; }
    if (state === 'NT' && curMode !== 'battery') { els.nt.style.display = 'flex'; hasInfo = true; }
    if (hasInfo) section.style.display = 'block';
}

// --- 4. 计算逻辑 (Calculation) ---

function safeSetText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }
function getZoneRating(state) { return (state === 'NT') ? 1.622 : (state === 'VIC' || state === 'TAS' ? 1.185 : 1.382); }
function calculateBatteryGross(batteryKwh, tier) {
    const T = config.base_pricing.battery_tiers;
    let rate = (tier === 'entry') ? T.entry_rate_per_kwh : (tier === 'medium' ? T.medium_rate_per_kwh : T.premium_rate_per_kwh);
    return (batteryKwh * rate) + T.fixed_profit_markup;
}

function generateRecommendation(state, billAmount, time, shade, hasBat, batteryKwh, isSolarTooSmall) {
    const lang = i18n[curLang];
    const NSW_CAP = config.subsidy_logic.nsw_vpp_cap_kwh || 28;

    if (curMode !== 'battery' && billAmount <= 200) {
        return `<span style="color: #fcd34d; font-weight: bold;">💡 ${lang.rec_not_rec}</span>`;
    }

    let rec = recommendationMap[0];
    for (let i = 0; i < recommendationMap.length; i++) {
        if (billAmount >= recommendationMap[i].bill) rec = recommendationMap[i];
    }

    let msg = "";
    let invText = `${rec.inverter}${lang.rec_inv}`;
    if (rec.is3Phase) invText += lang.rec_phase3;

    if ((userApplianceProfile.ev_now || userApplianceProfile.ev_plan || userApplianceProfile.pool) && !hasBat) {
        msg += curLang === 'cn' ? " (检测到高耗能设备，强烈建议加配电池) " : " (High usage detected, Battery highly recommended) ";
    }

    if (curLang === 'cn') {
        msg = `${lang.rec_prefix} ($${billAmount})${lang.rec_suffix} ${rec.solarKw}kW 太阳能 + ${invText}`;
        if (hasBat) {
            const batText = rec.validBats.join('kWh 或 ');
            msg += ` + ${batText}kWh 电池。`;
        } else { msg += `。`; }
    } else {
        msg = `${lang.rec_prefix} ($${billAmount})${lang.rec_suffix} ${rec.solarKw}kW Solar + ${invText}`;
        if (hasBat) {
            const batText = rec.validBats.join('kWh or ');
            msg += ` + ${batText}kWh Battery.`;
        } else { msg += `.`; }
    }

    let upsellTips = [];
    if (userApplianceProfile.backup && hasBat) {
        const txt = curLang === 'cn' ? "✅ 已为您匹配带<b>全屋离网备份 (Blackout Protection)</b> 的电池系统。" : "✅ Quote includes battery with <b>Full Backup Protection</b>.";
        upsellTips.push(txt);
    }
    if (userApplianceProfile.gas2elec) {
        const txt = curLang === 'cn' ? "⚡ 检测到电气化需求，建议将逆变器升级至 <b>10kW</b> 以预留容量。" : "⚡ Upgrade inverter to <b>10kW</b> for future electrification.";
        upsellTips.push(txt);
    }
    if (userApplianceProfile.hws) {
        const txt = curLang === 'cn' ? "💡 建议加装 <b>Catch Power 继电器</b>，利用多余太阳能免费烧水。" : "💡 Add <b>Hot Water Timer</b> to heat water for free.";
        upsellTips.push(txt);
    }

    let warn = "";
    if (state === 'NSW' && hasBat && batteryKwh >= NSW_CAP) warn = lang.warn_nsw_limit;
    else if (state === 'QLD' && hasBat) warn = lang.warn_qld_exhausted;
    else if (hasBat && state === 'NSW') warn = lang.rec_bat;
    else if ((state === 'ACT' || state === 'TAS') && !hasBat) warn = lang.rec_loan;
    else if (state === 'NT') warn = lang.rec_nt;

    let finalHtml = `<span style="color: #f1f5f9;">${msg}</span>`;

    if (upsellTips.length > 0) {
        finalHtml += `<div style="margin-top:12px; font-size:0.9rem; background:rgba(255,255,255,0.1); padding:10px; border-radius:8px;">`;
        upsellTips.forEach(tip => finalHtml += `<div style="margin-bottom:4px;">${tip}</div>`);
        finalHtml += `</div>`;
    }
    if (warn) {
        finalHtml += `<br><br><span style="color: #ff5252; font-weight: bold;">${warn}</span>`;
    }
    return finalHtml;
}

function calculate(forceShow = false) {
    try {
        const card = document.getElementById('result-card');
        const isVisible = card.style.display === 'block';

        // 🟢 1. 变量定义移到最上面，防止重复声明错误
        const isUnlocked = sessionStorage.getItem('quoteUnlocked') === 'true';

        // 如果是自动计算(滑块拖动)且卡片没显示，直接退出
        if (forceShow && !isVisible) {
            // 获取当前界面上的值
            const currentBill = parseFloat(document.getElementById('bill-input').value);
            const currentState = document.getElementById('state-select').value;
            const currentStorey = document.getElementById('storey-select').value;
            const currentRoof = document.getElementById('roof-select').value;
            const currentShade = document.getElementById('shade-select').value;
            const currentSolar = document.getElementById('solar-input').value;
            const currentBat = document.getElementById('bat-input').value;

            // 检查有没有选家电
            const hasProfile = Object.values(userApplianceProfile).some(val => val === true);

            // 定义什么是“默认没改过”的状态
            const isBillDefault = currentBill <= 100;    // 默认 $100
            const isStateDefault = currentState === 'NSW'; // 默认 NSW
            const isStoreyDefault = currentStorey === "0"; // 默认 Single Storey
            const isRoofDefault = currentRoof === "0";     // 默认 Tin/Tile
            const isShadeDefault = currentShade === "0";   // 默认 No Shade
            const isSolarDefault = currentSolar === "0";   // 默认 6.6kW
            const isBatDefault = currentBat === "10";      // 默认 10kWh

            // 🔥 关键点：我们这里故意【不检查】安装模式 (curMode)
            // 意思就是：就算客户改了安装模式，但如果没填电费、没改州，依然会被拦截。

            // 判定：是否所有关键信息都是默认值？
            const isInfoEmpty = isBillDefault && isStateDefault && isStoreyDefault &&
                isRoofDefault && isShadeDefault && isSolarDefault &&
                isBatDefault && !hasProfile;

            if (isInfoEmpty) {
                // ⛔️ 触发阻断 (温柔提示版)
                const msg = curLang === 'cn'
                    ? "请先输入基础信息，才能算出准确价格哦~"
                    : "Please provide more details first.";
                // 调用我们在外面定义的提示框函数
                showToast(msg);

                // 视觉引导：高亮“季度电费”
                const billGroup = document.getElementById('bill-input').parentElement;
                billGroup.classList.add('input-highlight');

                // 滚动回顶部，让用户看到
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // 2秒后移除高亮
                setTimeout(() => billGroup.classList.remove('input-highlight'), 2000);

                return; // 🛑 停止往下执行，不显示结果
            }
        }

        // [Gamified Animation Logic]
        // 如果是点击了按钮(forceShow=true) 且 之前没显示 且 没解锁 -> 播放动画
        if (forceShow && !isVisible && !isUnlocked) {
            playAnalysisAnimation();
        }

        const state = document.getElementById('state-select').value;
        const solarNewIndex = parseInt(document.getElementById('solar-input').value);
        const solarNewKw = solarTiers[solarNewIndex];
        const solarExistIndex = parseInt(document.getElementById('exist-solar-input').value);
        const solarExistKw = solarTiers[solarExistIndex];
        let activeSolarKw = (curMode === 'battery') ? solarExistKw : solarNewKw;
        const batteryKwh = parseFloat(document.getElementById('bat-input').value);

        const BP = config.base_pricing;
        const SL = config.subsidy_logic;
        const extras = BP.addon_extras;

        const P_SOLAR_W = BP.solar_per_w || 0.9;
        const P_SOLAR_KW = P_SOLAR_W * 1000;
        const P_BASE_INSTALL = BP.install_base_fee || 0;
        const P_BAT_ADDON = BP.install_labor_adder.mixed_install || 500;
        const P_BAT_ONLY = BP.install_labor_adder.battery_only || 1500;
        const STC_PRICE = SL.fed_stc_price_net || 37.5;
        const DEEMING_YEARS = SL.stc_deeming_years || 6;
        const FED_BAT_RATE = SL.fed_bat_rate_per_kwh || 340;
        const FED_BAT_CAP = SL.fed_bat_cap_kwh || 50;
        const NSW_CAP = SL.nsw_vpp_cap_kwh || 28;
        const REBATE_NSW_RATE = SL.rebate_nsw_rate || 55;
        const REBATE_VIC = SL.rebate_vic || 1400;
        const REBATE_SA = SL.rebate_sa || 350;

        const costRoof = parseFloat(document.getElementById('roof-select').value) === 800 ? extras.addon_roof_terra : 0;
        const valStorey = parseFloat(document.getElementById('storey-select').value);
        let costStorey = (valStorey === 300) ? extras.addon_storey_double : (valStorey === 500 ? extras.addon_storey_triple : 0);
        const costShade = parseFloat(document.getElementById('shade-select').value) === 1500 ? extras.addon_shading : 0;

        // [新增] 如果选择了 Backup，增加 $600 费用
        let costBackup = 0;
        if (userApplianceProfile.backup) {
            costBackup = 600;
        }

        let grossSolarBase = 0;
        if (curMode !== 'battery') {
            grossSolarBase = (solarNewKw * P_SOLAR_KW) + P_BASE_INSTALL + costShade;
        }

        let stcSolarValue = 0;
        if (curMode !== 'battery') {
            stcSolarValue = Math.floor(solarNewKw * getZoneRating(state) * DEEMING_YEARS) * STC_PRICE;
        }

        let stcBatteryValue = 0;
        let stateRebateVal = 0;

        if (curMode !== 'solar') {
            stcBatteryValue = Math.min(batteryKwh, FED_BAT_CAP) * FED_BAT_RATE;
            if (state === 'NSW' && document.getElementById('cb-nsw-prds').checked) {
                if (batteryKwh < NSW_CAP) { stateRebateVal += (batteryKwh * REBATE_NSW_RATE); }
            }
            if (state === 'VIC' && document.getElementById('cb-vic-solar').checked) { stateRebateVal += REBATE_VIC; }
            if (state === 'SA') { stateRebateVal += REBATE_SA; }
        }

        const fixedDeductions = stcSolarValue + stcBatteryValue + stateRebateVal;
        const siteExtras = costStorey + costRoof + costBackup;

        const TIERS = ['entry', 'medium', 'premium'];
        const netPricesRaw = {};
        const netPricesFmt = {};
        const grossPricesFmt = {};
        const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

        TIERS.forEach(tier => {
            let grossBattery = 0;
            if (curMode !== 'solar') {
                let labor = (curMode === 'battery') ? P_BAT_ONLY : P_BAT_ADDON;
                let base = calculateBatteryGross(batteryKwh, tier);
                grossBattery = (base + labor) * 1.1;
            }
            const totalGross = grossSolarBase + grossBattery + siteExtras;
            const finalNet = totalGross - fixedDeductions;
            grossPricesFmt[tier] = fmt.format(totalGross);
            netPricesRaw[tier] = finalNet;
            netPricesFmt[tier] = fmt.format(finalNet);
        });

        safeSetText('lbl-gross-title', `${i18n[curLang].res_gross} (${i18n[curLang]['tier_' + selectedTier]})`);
        safeSetText('out-gross', grossPricesFmt[selectedTier]);
        safeSetText('out-stc-solar', "-" + fmt.format(stcSolarValue));
        safeSetText('out-stc-battery', "-" + fmt.format(stcBatteryValue));
        safeSetText('out-state', "-" + fmt.format(stateRebateVal));
        safeSetText('net-entry', netPricesFmt['entry']);
        safeSetText('net-medium', netPricesFmt['medium']);
        safeSetText('net-premium', netPricesFmt['premium']);
        safeSetText('out-net', netPricesFmt[selectedTier]);

        // 🟢 [Sticky Footer] 同步价格
        const stickyPriceEl = document.getElementById('sticky-net-price');
        if (stickyPriceEl) stickyPriceEl.innerText = netPricesFmt[selectedTier];

        const rowSolar = document.getElementById('row-stc-solar'); if (rowSolar) rowSolar.style.display = stcSolarValue > 0 ? 'flex' : 'none';
        const rowBat = document.getElementById('row-stc-battery'); if (rowBat) rowBat.style.display = stcBatteryValue > 0 ? 'flex' : 'none';
        const rowState = document.getElementById('row-state'); if (rowState) rowState.style.display = stateRebateVal > 0 ? 'flex' : 'none';

        const grid = document.querySelector('.comparison-grid');
        const gridTitle = document.querySelector('.section-title[data-i18n="res_final_comparison"]');
        if (curMode === 'solar') { if (grid) grid.style.display = 'none'; if (gridTitle) gridTitle.style.display = 'none'; safeSetText('lbl-gross-title', i18n[curLang].res_gross); }
        else { if (grid) grid.style.display = 'grid'; if (gridTitle) gridTitle.style.display = 'block'; }

        const billAmount = parseFloat(document.getElementById('bill-input').value);
        const shadeCostRaw = parseFloat(document.getElementById('shade-select').value);
        const hasBat = curMode !== 'solar';

        let rec = recommendationMap[0];
        for (let i = 0; i < recommendationMap.length; i++) {
            if (billAmount >= recommendationMap[i].bill) rec = recommendationMap[i];
        }
        let maxRecBat = (rec.validBats && rec.validBats.length > 0) ? Math.max(...rec.validBats) : rec.bat;
        const isSolarTooSmall = hasBat && (batteryKwh > maxRecBat) && (activeSolarKw * config.roi_logic.battery_savings_penalty_threshold < batteryKwh);

        const recEl = document.getElementById('rec-text');
        if (recEl) {
            recEl.innerHTML = generateRecommendation(state, billAmount, 'day', shadeCostRaw, hasBat, batteryKwh, isSolarTooSmall);
        }

        const netPremiumVal = parseFloat(netPricesRaw[selectedTier]);
        updateChart(netPremiumVal, billAmount, hasBat, batteryKwh, activeSolarKw);

        card.style.display = 'block';

        // Handle Unlock/Lock UI
        // 🟢 注意：此处不应再定义 const isUnlocked，直接使用顶部的变量
        const overlay = document.getElementById('unlock-overlay');
        const blurSpans = document.querySelectorAll('.price-number');
        const vppBanner = document.getElementById('vpp-banner');
        const finalBtn = document.getElementById('btn-final-enquiry');

        if (isUnlocked) {
            overlay.classList.add('hidden');
            blurSpans.forEach(el => el.classList.remove('locked'));
            if (vppBanner) vppBanner.style.display = (curMode !== 'solar') ? 'flex' : 'none';
            if (finalBtn) finalBtn.style.display = 'flex';

            // 🟢 [Sticky Footer] 刷新页面时如果已解锁，也要启动监听
            setupStickyObserver();
        } else {
            overlay.classList.remove('hidden');
            blurSpans.forEach(el => el.classList.add('locked'));
            document.getElementById('submit-msg').innerText = "";
            document.getElementById('btn-submit').disabled = false;
            document.getElementById('btn-submit').innerText = i18n[curLang].btn_unlock;
            if (vppBanner) vppBanner.style.display = 'none';
            if (finalBtn) finalBtn.style.display = 'none';
        }
        if (forceShow) card.scrollIntoView({ behavior: "smooth" });

    } catch (err) { console.error(err); }
}

let myChart = null;
function updateChart(netPrice, quarterlyBill, hasBattery, batterySize, solarSizeKw) {
    const annualBill = quarterlyBill * 4;

    // --- [Smart ROI Algorithm] ---
    let selfConsumptionRate = 0.30;

    // 根据 Profile 调整系数
    if (userApplianceProfile.wfh) selfConsumptionRate += 0.15;
    if (userApplianceProfile.pool) selfConsumptionRate += 0.15;
    if (userApplianceProfile.ac) selfConsumptionRate += 0.10;
    if (userApplianceProfile.hws) selfConsumptionRate += 0.12;
    if (userApplianceProfile.general) selfConsumptionRate += 0.05;
    if (userApplianceProfile.others) selfConsumptionRate += 0.05;

    if (userApplianceProfile.ev_now) {
        selfConsumptionRate += hasBattery ? 0.15 : 0.05;
    }
    if (userApplianceProfile.ev_plan) {
        selfConsumptionRate += 0.02;
    }
    if (userApplianceProfile.gas2elec) {
        selfConsumptionRate += 0.05; // 假设用电量增大，浪费减少
    }

    if (selfConsumptionRate > 0.75) selfConsumptionRate = 0.75;

    let savingsRate = 0;
    if (!hasBattery) {
        // Solar Only: 自用率 + 余电上网(假设值)
        savingsRate = selfConsumptionRate + 0.15;
    } else {
        // Battery: 基础自用 + 电池提升
        let batteryBoost = 0.40;
        if (solarSizeKw * 4 < batterySize) batteryBoost *= 0.6; // 板子太小充不满
        savingsRate = selfConsumptionRate + batteryBoost;
    }
    if (savingsRate > 0.95) savingsRate = 0.95;

    const newAnnualBill = annualBill * (1 - savingsRate);
    const annualSavings = annualBill - newAnnualBill;
    const escalation = config.roi_logic.annual_tariff_escalation_percent;
    let paybackYears = 0; let cumulativeSavings = 0;
    while (cumulativeSavings < netPrice && paybackYears < 30) {
        paybackYears++; cumulativeSavings += annualSavings * Math.pow(1 + escalation, paybackYears - 1);
    }
    const labelYear = curLang === 'cn' ? " 年" : " Years";
    document.getElementById('payback-years').innerText = paybackYears < 30 ? paybackYears + labelYear : "30+ Years";
    const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
    document.getElementById('savings-val').innerText = fmt.format(annualSavings);

    const ctx = document.getElementById('roiChart').getContext('2d');
    const labels = [i18n[curLang].chart_curr, i18n[curLang].chart_new];
    const dataVals = [annualBill, newAnnualBill];
    if (myChart) { myChart.destroy(); }
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: i18n[curLang].chart_saved, data: dataVals, backgroundColor: ['#ef5350', '#66bb6a'], borderRadius: 4, barPercentage: 0.6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => '$' + c.raw.toFixed(0) } } }, scales: { y: { beginAtZero: true, ticks: { callback: function (val) { return '$' + val; }, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#fff', font: { size: 11 } }, grid: { display: false } } } }
    });
}

// --- Modals & Submission ---

function openApplianceModal() {
    document.getElementById('appliance-modal').style.display = 'flex';
}

function closeApplianceModal(event) {
    const overlay = document.getElementById('appliance-modal');
    if (!event || event.target === overlay || event.target.classList.contains('close-btn') || event.target.classList.contains('btn-modal-ok')) {
        overlay.style.display = 'none';
        updateTriggerText();
        if (document.getElementById('result-card').style.display === 'block') calculate(false);
    }
}

function toggleUsage(type) {
    userApplianceProfile[type] = !userApplianceProfile[type];
    const btn = document.getElementById('btn-use-' + type);
    if (btn) {
        if (userApplianceProfile[type]) btn.classList.add('active');
        else btn.classList.remove('active');
    }
}

function updateTriggerText() {
    const triggerText = document.getElementById('appliance-summary');
    const triggerDiv = document.querySelector('.custom-select-trigger');
    if (!triggerText || !triggerDiv) return;

    let activeKeys = Object.keys(userApplianceProfile).filter(k => userApplianceProfile[k]);
    let count = activeKeys.length;

    if (count === 0) {
        triggerText.innerText = curLang === 'cn' ? "点击选择用电设备..." : "Select appliances...";
        triggerDiv.classList.remove('has-value');
    } else {
        const template = i18n[curLang].selected_count || "{n} items selected";
        triggerText.innerText = template.replace('{n}', count);
        triggerDiv.classList.add('has-value');
    }
}

function openVPPModal() { document.getElementById('vpp-modal').style.display = 'flex'; }
function closeVPPModal(event) {
    const overlay = document.getElementById('vpp-modal');
    if (!event || event.target === overlay || event.target.classList.contains('close-btn') || event.target.classList.contains('btn-modal-ok')) {
        overlay.style.display = 'none';
    }
}

function openConfirmModal() {
    document.getElementById('conf-name').value = document.getElementById('lead-name').value;
    document.getElementById('conf-phone').value = document.getElementById('lead-phone').value;
    document.getElementById('conf-email').value = document.getElementById('lead-email').value;
    if (extractedPostcode) {
        document.getElementById('conf-postcode').value = extractedPostcode;
    } else {
        const rawAddress = document.getElementById('lead-address').value || "";
        const pcMatches = rawAddress.match(/\b\d{4}\b/g);
        if (pcMatches && pcMatches.length > 0) document.getElementById('conf-postcode').value = pcMatches[pcMatches.length - 1];
    }
    document.getElementById('confirm-modal').style.display = 'flex';
    document.getElementById('final-msg').innerText = '';
    document.getElementById('btn-final-submit').disabled = false;
    document.getElementById('btn-final-submit').innerText = i18n[curLang].btn_confirm_send;
}
function closeConfirmModal(event) {
    const overlay = document.getElementById('confirm-modal');
    if (!event || event.target === overlay || event.target.classList.contains('close-btn')) { overlay.style.display = 'none'; }
}

function isValidAustralianPhone(p) { return /^(?:04|\+?614)\d{8}$|^(?:02|03|07|08)\d{8}$/.test(p.replace(/[\s()-]/g, '')); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidPostcode(p) { return /^\d{4}$/.test(p); }

function submitLead() {
    const name = document.getElementById('lead-name').value.trim();
    const email = document.getElementById('lead-email').value.trim();
    const phone = document.getElementById('lead-phone').value.trim();
    const msgEl = document.getElementById('submit-msg');
    msgEl.innerText = '';

    if (!name || !email || !phone) { msgEl.style.color = '#ef5350'; msgEl.innerText = i18n[curLang].err_required; return; }
    if (!isValidEmail(email)) { msgEl.style.color = '#ef5350'; msgEl.innerText = i18n[curLang].err_email; return; }
    if (!isValidAustralianPhone(phone)) { msgEl.style.color = '#ef5350'; msgEl.innerText = i18n[curLang].err_phone; return; }

    const btn = document.getElementById('btn-submit');
    btn.innerText = curLang === 'cn' ? "发送中..." : "Processing...";
    btn.disabled = true;

    setTimeout(() => {
        sessionStorage.setItem('quoteUnlocked', 'true');
        document.getElementById('unlock-overlay').classList.add('hidden');
        document.querySelectorAll('.price-number').forEach(el => el.classList.remove('locked'));
        const vppBanner = document.getElementById('vpp-banner');
        if (vppBanner && curMode !== 'solar') vppBanner.style.display = 'flex';
        const finalBtn = document.getElementById('btn-final-enquiry');
        if (finalBtn) finalBtn.style.display = 'flex';

        // 🟢 [Sticky Footer] 解锁成功后，立即启动底部栏监听
        setupStickyObserver();

        msgEl.style.color = '#66bb6a';
        msgEl.innerText = i18n[curLang].alert_sent;
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#f59e0b', '#0f172a'] });
        btn.innerText = curLang === 'cn' ? "已发送" : "Sent";
    }, 1000);
}
// 辅助函数：获取 Select 选中的文本
function getSelectedText(elementId) {
    const el = document.getElementById(elementId);
    if (el && el.selectedIndex !== -1) return el.options[el.selectedIndex].text;
    return "";
}
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// 辅助函数：获取 Select 选中的文本
function getSelectedText(elementId) {
    const el = document.getElementById(elementId);
    if (el && el.selectedIndex !== -1) return el.options[el.selectedIndex].text;
    return "";
}
// 🔥 终极提交函数 (修复版)
async function sendFinalEnquiry() {
    // 1. 获取 DOM 元素
    const nameEl = document.getElementById('conf-name');
    const phoneEl = document.getElementById('conf-phone');
    const emailEl = document.getElementById('conf-email');
    const postcodeEl = document.getElementById('conf-postcode');
    const addressEl = document.getElementById('lead-address');
    const notesEl = document.getElementById('conf-notes');
    const stateEl = document.getElementById('state-select');
    const billInput = document.getElementById('bill-input');
    const contactMethodEl = document.querySelector('input[name="contact-method"]:checked');
    const fileInput = document.getElementById('conf-file');

    // 2. 验证
    if (!nameEl.value || !phoneEl.value || !postcodeEl.value) {
        document.getElementById('final-msg').style.color = 'red';
        document.getElementById('final-msg').innerText = curLang === 'cn' ? "请完善联系信息 (含邮编)" : "Please complete contact details (inc. Postcode)";
        return;
    }

    const btn = document.getElementById('btn-final-submit');
    btn.disabled = true;
    btn.innerText = curLang === 'cn' ? "提交中..." : "Sending...";

    try {
        // 3. 文件上传 (使用 supabaseClient)
        let fileUrl = null;
        let fileName = null;

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            // 限制 10MB
            if (file.size > 10 * 1024 * 1024) {
                throw new Error(curLang === 'cn' ? "文件过大 (需小于10MB)" : "File too large (Max 10MB)");
            }

            // 唯一文件名
            const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            // 🔥 注意：这里用了 supabaseClient
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('uploads')
                .upload(uniqueName, file);

            if (uploadError) throw uploadError;

            // 获取公开链接
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('uploads')
                .getPublicUrl(uploadData.path);

            fileUrl = publicUrlData.publicUrl;
            fileName = file.name;
        }

        // 4. 构建数据包
        const payload = {
            created_at: new Date().toISOString(),
            language: curLang,
            installation_mode: curMode,
            state: stateEl.value,

            // 联系人
            name: nameEl.value,
            phone: phoneEl.value,
            email: emailEl.value,
            postcode: postcodeEl.value,
            address: addressEl ? addressEl.value : "",
            contact_method: contactMethodEl ? contactMethodEl.value : 'phone',
            install_timeframe: getSelectedText('conf-timeframe'),

            // 房屋与系统
            property_storeys: getSelectedText('storey-select'),
            property_roof: getSelectedText('roof-select'),
            property_shade: getSelectedText('shade-select'),
            property_phase: getSelectedText('phase-select'),
            property_type: getSelectedText('property-type-select'),
            bill_amount: billInput.value,
            solar_size: document.getElementById('solar-val').innerText,
            battery_size: document.getElementById('bat-val').innerText,
            existing_solar_size: document.getElementById('exist-solar-val').innerText,
            quote_tier: selectedTier,
            estimated_price: document.getElementById('out-net').innerText,
            notes: notesEl.value,

            // 高级数据
            user_profile: userApplianceProfile,
            chat_history: globalChatHistory, // 聊天记录

            // 文件链接
            file_name: fileName,
            file_url: fileUrl
        };

        // 5. 写入数据库 (🔥 注意：这里也用了 supabaseClient)
        const { error } = await supabaseClient.from('leads').insert([payload]);

        if (error) throw error;

        // 6. 成功反馈
        setTimeout(() => {
            document.getElementById('final-msg').style.color = '#66bb6a';
            document.getElementById('final-msg').innerText = i18n[curLang].alert_final_success;
            btn.innerText = curLang === 'cn' ? "已提交" : "Submitted";
            setTimeout(() => { document.getElementById('confirm-modal').style.display = 'none'; }, 2000);
        }, 1000);

    } catch (error) {
        console.error("Error:", error);
        let errMsg = "System Error.";
        if (error.message) errMsg = error.message;
        document.getElementById('final-msg').style.color = 'red';
        document.getElementById('final-msg').innerText = errMsg;
        btn.disabled = false;
        btn.innerText = i18n[curLang].btn_confirm_send;
    }
}
// --- Inline Validation ---
const phoneInput = document.getElementById('lead-phone');
if (phoneInput) phoneInput.addEventListener('input', function (e) { let x = e.target.value.replace(/\D/g, '').match(/(\d{0,4})(\d{0,3})(\d{0,3})/); e.target.value = !x[2] ? x[1] : x[1] + ' ' + x[2] + (x[3] ? ' ' + x[3] : ''); });
const confPhoneInput = document.getElementById('conf-phone');
if (confPhoneInput) confPhoneInput.addEventListener('input', function (e) { let x = e.target.value.replace(/\D/g, '').match(/(\d{0,4})(\d{0,3})(\d{0,3})/); e.target.value = !x[2] ? x[1] : x[1] + ' ' + x[2] + (x[3] ? ' ' + x[3] : ''); });

function setupInlineValidation(inputId, errorMsgId, validateFn, errorTextObj) {
    const inputEl = document.getElementById(inputId);
    const msgEl = document.getElementById(errorMsgId);
    if (!inputEl || !msgEl) return;
    inputEl.addEventListener('blur', () => {
        const val = inputEl.value.trim();
        if (val === "") return;
        if (!validateFn(val)) {
            inputEl.classList.add('input-error');
            msgEl.style.display = 'block';
            msgEl.innerText = curLang === 'cn' ? errorTextObj.cn : errorTextObj.en;
        }
    });
    inputEl.addEventListener('input', () => {
        if (inputEl.classList.contains('input-error')) {
            inputEl.classList.remove('input-error');
            msgEl.style.display = 'none';
        }
    });
}
setTimeout(() => {
    setupInlineValidation('lead-email', 'err-lead-email', isValidEmail, { cn: "请输入有效的邮箱地址", en: "Please enter a valid email address." });
    setupInlineValidation('lead-phone', 'err-lead-phone', isValidAustralianPhone, { cn: "请输入有效的澳洲电话号码 (04xx 或 02/03...)", en: "Invalid AU phone number (04xx or Landline)" });
}, 500);

// ==========================================
// [NEW] Google Maps & Roof Preview Logic
// ==========================================
function initAutocomplete() {
    console.log("🟢 initAutocomplete starting...");
    const addressInput = document.getElementById('lead-address');
    if (!addressInput) return;
    const options = {
        componentRestrictions: { country: "au" },
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["address"],
    };
    autocomplete = new google.maps.places.Autocomplete(addressInput, options);
    autocomplete.addListener("place_changed", fillInAddress);
}

function fillInAddress() {
    const place = autocomplete.getPlace();
    extractedPostcode = "";
    extractedState = "";

    // 1. Postcode & State
    if (place.address_components) {
        for (const component of place.address_components) {
            const componentType = component.types[0];
            if (componentType === "postal_code") extractedPostcode = component.long_name;
            if (componentType === "administrative_area_level_1") extractedState = component.short_name;
        }
    }

    // 2. Satellite Image Generation (只处理一个图)
    if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // 生成 URL
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=600x400&maptype=satellite&scale=2&key=${GOOGLE_API_KEY}`;
        console.log("🚀 Sat Map URL:", mapUrl);

        // ✅ 只更新 Unlock 弹窗里的那张图
        const img = document.getElementById('sat-image');
        const box = document.getElementById('roof-preview-box');

        if (img && box) {
            img.onload = () => {
                box.classList.remove('hidden');
                box.style.display = 'block';
            };
            img.onerror = () => {
                // 如果加载失败，隐藏盒子
                box.style.display = 'none';
            };
            img.src = mapUrl;
        }
    }

    // 3. Auto-select State
    if (extractedState) {
        const stateSelect = document.getElementById('state-select');
        const targetVal = extractedState.toUpperCase();
        let found = false;
        for (let i = 0; i < stateSelect.options.length; i++) {
            if (stateSelect.options[i].value === targetVal) {
                stateSelect.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (found) stateSelect.dispatchEvent(new Event('change'));
    }
}
window.initAutocomplete = initAutocomplete;

// ==========================================
// [NEW] Modal & Appliance Logic
// ==========================================

// Attach to window
window.openApplianceModal = openApplianceModal;
window.closeApplianceModal = closeApplianceModal;
window.toggleUsage = toggleUsage;

// 显示顶部提示
function showToast(message) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        toast.className = "toast-msg";
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>☝️</span> ${message}`;
    toast.classList.add("show");

    // 3秒后消失
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// ==========================================
// Social Proof Logic
// ==========================================
function updateSocialProof() {
    const baseCount = 1240;
    const startDate = new Date('2025-01-01').getTime();
    const now = new Date().getTime();
    const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const randomBuffer = Math.floor(Math.random() * 3);
    const currentCount = baseCount + (daysPassed * 4) + randomBuffer;
    const formattedNum = currentCount.toLocaleString();

    let template = (i18n[curLang] && i18n[curLang].social_proof) ? i18n[curLang].social_proof : "Already <span class='proof-number'>{num}+</span> families requested quotes";
    const finalHtml = template.replace('{num}', formattedNum);

    const elMain = document.getElementById('proof-content');
    if (elMain) elMain.innerHTML = finalHtml;
    const elModal = document.getElementById('conf-proof-content');
    if (elModal) elModal.innerHTML = finalHtml;
}


// ==========================================
// [NEW] Helper Functions (Sticky Footer & Animation)
// ==========================================

// 1. 游戏化加载动画 (Gamified Analysis Animation)
function playAnalysisAnimation() {
    const loader = document.getElementById('analysis-loader');
    const formContent = document.getElementById('unlock-form-content');
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');

    // 初始化状态
    if (formContent) formContent.style.display = 'none';
    if (loader) loader.style.display = 'block';
    if (bar) bar.style.width = '0%';
    if (text) text.innerText = i18n[curLang].step_1;

    // 动画序列
    setTimeout(() => { if (bar) bar.style.width = '35%'; }, 100);

    setTimeout(() => {
        if (text) text.innerText = i18n[curLang].step_2;
        if (bar) bar.style.width = '70%';
    }, 1500);

    setTimeout(() => {
        if (text) text.innerText = i18n[curLang].step_3;
        if (bar) bar.style.width = '92%';
    }, 3000);

    // 完成
    setTimeout(() => {
        if (loader) loader.style.display = 'none';
        if (formContent) {
            formContent.style.display = 'block';
            formContent.classList.add('fade-in');
        }
        const titleEl = document.querySelector('.unlock-title');
        if (titleEl) titleEl.innerText = i18n[curLang].quote_ready;
    }, 4200);
}

// 2. 底部悬浮栏监听 (Sticky Footer Logic)
function setupStickyObserver() {
    const mainBtn = document.getElementById('btn-final-enquiry');
    const footer = document.getElementById('sticky-footer');

    if (!mainBtn || !footer) return;

    // 先清除旧的，防止重复绑定 (可选优化)

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const isUnlocked = sessionStorage.getItem('quoteUnlocked') === 'true';
            // 只有在已解锁 且 结果卡片显示时 才生效
            const resultCard = document.getElementById('result-card');
            if (!resultCard || resultCard.style.display === 'none') return;

            if (!entry.isIntersecting && isUnlocked) {
                footer.classList.add('visible');
            } else {
                footer.classList.remove('visible');
            }
        });
    }, { threshold: 0 });

    observer.observe(mainBtn);
}

// ==========================================
// Initialization
// ==========================================
setMode('solar');
setLang('en');
currentRecValues.solarIdx = -1;
currentRecValues.validBats = [];
document.getElementById('badge-solar').style.display = 'none';
document.getElementById('badge-bat').style.display = 'none';
document.getElementById('bill-val').innerText = "100";
document.getElementById('solar-val').innerText = solarTiers[0];
document.getElementById('bat-val').innerText = "20";
updateTriggerText();
// ==========================================
// [NEW] Chat Widget Logic
// ==========================================

// ==========================================
// [NEW] Smart Chat Widget Logic (完整功能版)
// ==========================================

let isChatOpen = false;

// 1. 切换聊天窗口开关
function toggleChat() {
    isChatOpen = !isChatOpen;
    const win = document.getElementById('chat-window');
    const badge = document.querySelector('.chat-badge');

    if (isChatOpen) {
        win.classList.add('open');
        if (badge) badge.style.display = 'none'; // 打开后隐藏小红点
        setTimeout(() => document.getElementById('chat-input').focus(), 300);
    } else {
        win.classList.remove('open');
    }
}

// 2. 监听回车键
function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

// 3. 发送消息核心逻辑
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if (!txt) return;

    // 显示用户消息
    addMessage(txt, 'user');
    input.value = '';

    // 模拟机器人思考和打字延迟
    setTimeout(() => {
        const reply = generateSmartBotReply(txt);
        addMessage(reply, 'bot');
    }, 1000 + Math.random() * 500); // 随机延迟 1~1.5秒
}

// 4. 在界面添加气泡
function addMessage(text, sender) {
    const body = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.classList.add('message', sender);

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div class="msg-content">${text}</div>
        <div class="msg-time">${timeString}</div>
    `;

    body.appendChild(div);
    body.scrollTop = body.scrollHeight;

    // 记录到全局变量
    globalChatHistory.push({
        sender: sender === 'user' ? 'Client' : 'AI Bot',
        text: text,
        time: new Date().toISOString()
    });
}

// ==========================================
// [SMART BRAIN] 升级版知识库逻辑
// ==========================================

// 规则库：包含关键词和对应的中英文回复
const chatRules = [
    {
        id: 'price',
        keywords: ['多少钱', '价格', '报价', '贵', 'price', 'cost', 'quote', 'expensive', 'how much'],
        text_cn: "最终价格取决于您的屋顶难度和选配（如黑科技板或微逆）。建议您先使用左侧计算器得到一个【预估范围】，如果您对价格满意，点击最后一步的“预约咨询”，我们的销售总监可以给您申请特批折扣。",
        text_en: "Final pricing depends on roof complexity and hardware choice. I recommend using the calculator on the left to get a baseline range first. If the ROI looks good, book a consultation at the end—our director might approve a special discount."
    },
    {
        id: 'battery_advice',
        keywords: ['电池', '储能', 'battery', 'storage', 'batteries'],
        text_cn: "现在的电池价格已经比几年前降了很多！如果您家里有泳池、电动车或者晚上用电多，加装电池（10kWh+）绝对划算，回本周期通常能控制在 6-7 年内。",
        text_en: "Battery prices have dropped significantly! If you have a pool, EV, or high night usage, a 10kWh+ battery is a no-brainer. Payback periods are now often under 7 years."
    },
    {
        id: 'brands_panels',
        keywords: ['板子', '组件', '品牌', 'jinko', 'longi', 'trina', 'panels', 'brand', 'tier 1'],
        text_cn: "Solaryo 只选用 CEC 认证的 Tier 1 一线品牌（如 Jinko, Trina, Longi）。这些板子通常带有 25 年性能质保，既能保证澳洲夏天的耐热性，也是银行认可的可融资品牌。",
        text_en: "We only strictly use CEC Accredited Tier 1 panels (e.g., Jinko, Trina, Longi). They come with 25-year performance warranties and are bankable brands proven to withstand the harsh Aussie sun."
    },
    {
        id: 'inverter',
        keywords: ['逆变器', '华为', '锦浪', '固德威', 'sungrow', 'goodwe', 'inverter', 'fronius', 'enphase'],
        text_cn: "逆变器是系统的心脏。默认配置我们推荐 Sungrow 或 Goodwe（性价比之王），如果您预算充足且有阴影遮挡问题，我们也可以升级为 Enphase 微型逆变器。",
        text_en: "The inverter is the heart of the system. We recommend Sungrow or Goodwe for the best bang-for-buck. If you have shading issues, we can upgrade you to Enphase Micro-inverters."
    },
    {
        id: 'warranty',
        keywords: ['保修', '质保', '坏了', '维修', 'warranty', 'guarantee', 'broken', 'repair'],
        text_cn: "放心，我们提供【10年安装工艺质保】+【厂家25年性能质保】。如果在保修期内出现非人为故障，我们会免费上门更换，不让您操心。",
        text_en: "Peace of mind is key. We offer a 10-Year Workmanship Warranty + 25-Year Manufacturer Performance Warranty. If anything fails, we handle the replacement for free."
    },
    {
        id: 'tesla',
        keywords: ['特斯拉', 'tesla', 'powerwall'],
        text_cn: "Tesla Powerwall 确实是好产品，但价格较高（约 $16k+）。从投资回报率(ROI)角度看，我们更推荐同等容量但价格只要一半的 Tier 1 储能品牌（如 Sungrow 或 Goodwe），省下的钱都够交好几年电费了！",
        text_en: "The Tesla Powerwall is a premium product, but pricey ($16k+). For better ROI, we recommend Tier 1 alternatives (like Sungrow/Goodwe) that offer similar capacity for half the price. The savings alone cover years of bills!"
    },
    {
        id: 'rebate',
        keywords: ['补贴', '政府', 'rebate', 'subsidy', 'gov', 'incentive'],
        text_cn: "澳洲的补贴政策一直在变（比如 STC 每年递减）。好消息是，我们的计算器是实时更新的！只要您在上方的下拉菜单选择正确的【州/领地】，系统会自动扣除您能拿到的所有补贴。",
        text_en: "Rebates change often (STC drops every year). The good news is our calculator is live-updated! Just select your correct State from the dropdown above, and we'll automatically deduct all eligible incentives."
    },
    {
        id: 'human',
        keywords: ['人工', '人', '电话', 'human', 'person', 'call', 'speak', 'support'],
        text_cn: "想直接和专家聊聊？没问题！请在计算器最后一步输入您的电话，我们会有高级工程师（不是销售客服）在 24 小时内回访您，为您做定制方案。",
        text_en: "Want to speak to a human? Sure! Just verify your phone number at the final step of the quote. A senior engineer (not just a sales rep) will call you within 24 hours."
    },

    // --- [新增] 1. 热情打招呼 ---
    {
        id: 'greeting',
        keywords: ['你好', '您好', '哈喽', '嗨', 'hello', 'hi', 'hey', 'morning', 'afternoon', 'evening', 'gday'],
        text_cn: "您好！很高兴为您服务。我是 Solaryo 的智能助手 🤖。您是想了解今天的最新报价，还是想咨询电池方案？",
        text_en: "Hi there! Great to see you. I'm Solaryo's virtual assistant 🤖. Are you looking for a quick quote or some advice on batteries?"
    },

    // --- [新增] 2. 感谢与肯定 (引导留资) ---
    {
        id: 'thanks',
        keywords: ['谢谢', '感谢', '好的', 'ok', 'thx', 'thanks', 'thank', 'cool', 'great', 'awesome'],
        text_cn: "不客气！能帮到您是我的荣幸。🌟 如果您对目前的方案还满意，记得在计算器最后一步输入联系方式，我可以为您锁定今天的优惠价格！",
        text_en: "You're very welcome! Happy to help. 🌟 If you like what you see, don't forget to enter your details at the final step to lock in today's special pricing!"
    },

    // --- [新增] 3. 抱怨与负面情绪 (安抚 + 转人工) ---
    {
        id: 'complaint',
        keywords: ['甚至', '蠢', '傻', '笨', '垃圾', '滚', '太贵', '慢', '没用', 'stupid', 'dumb', 'bad', 'shit', 'fuck', 'useless', 'slow', 'expensive', 'hate'],
        text_cn: "非常抱歉给您带来不好的体验 😔。我只是一个 AI 程序，可能没能完全理解您的需求。强烈建议您在页面底部留下电话，我们的【高级客户经理】会亲自致电向您赔礼道歉，并解决您的问题。",
        text_en: "I'm really sorry to hear you're frustrated 😔. As an AI, I might have missed the mark. I strongly suggest leaving your number at the bottom—our 【Senior Manager】 will call you personally to sort this out for you."
    },
];

// 兜底回复库 (当不知道怎么回的时候)
const fallbackResponses = {
    cn: [
        "这个问题比较专业，建议您先把上面的【房屋详情】填一下，我们的工程师稍后会根据您的具体情况来解答。",
        "收到。不过为了给您最准确的建议，我建议您先点击“计算报价”看看大概的预算范围。",
        "这得看您的屋顶具体朝向。您方便上传一张电费单或者屋顶照片吗？（在最后一步可以上传）",
        "我记下了。关于这点，您可以稍后在电话里跟我们的工程师详细确认。现在您可以先看看预估价格。"
    ],
    en: [
        "That's a specific technical detail. I'd suggest filling out the property details above first so our engineer can give you a tailored answer.",
        "Noted. To give you the best advice, I recommend running the calculator first to see your budget range.",
        "It depends on your roof orientation. Would you be able to upload a bill or roof photo at the final step?",
        "Good question. Our engineer can explain that better over the phone. For now, try checking the estimated price above."
    ]
};

// 匹配引擎
function generateSmartBotReply(input) {
    const lowerInput = input.toLowerCase();
    const isCN = (typeof curLang !== 'undefined' && curLang === 'cn');

    // 1. 遍历规则库
    for (const rule of chatRules) {
        for (const key of rule.keywords) {
            if (lowerInput.includes(key)) {
                return isCN ? rule.text_cn : rule.text_en;
            }
        }
    }

    // 2. 随机兜底
    const fallbackList = isCN ? fallbackResponses.cn : fallbackResponses.en;
    const randomIdx = Math.floor(Math.random() * fallbackList.length);
    return fallbackList[randomIdx];
}