// ==========================================
// 0. SUPABASE CONFIGURATION (请填写你的密钥)
// ==========================================
const SUPABASE_URL = 'https://iytxwgyhemetdkmqoxoa.supabase.co'; // 替换这里
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dHh3Z3loZW1ldGRrbXFveG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzI3MDIsImV4cCI6MjA3OTkwODcwMn0.ZsiueMCjwm5FoPlC3IDEgmsPaabkhefw3uHFl6gBm7Q';          // 替换这里
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 全局变量：存聊天记录
let globalChatHistory = [];
// 🟢 [新增] 全局变量：存储当前选中的电池/逆变器品牌名称
let currentSelectedBrandName = "";
// ==========================================
// 1. 全局变量与配置 (Global Config & Variables)
// ==========================================
// --- [NEW] Brand & Tier Configuration ---
// ==========================================
// 1. 全局变量与配置 (Global Config & Variables)
// ==========================================
// --- [UPDATED] Brand & Tier Configuration ---
const brandConfig = {
    entry: {
        title: "Entry Tier (High Capacity Only)",
        brands: [
            // Only allows > 39kWh. Logic: Old Entry Gross * 0.5
            { id: 'felicity', name: 'Felicity', markup: 0, markupPerKwh: 0 }
        ]
    },
    medium: {
        title: "Medium Tier Brands",
        brands: [
            // Medium - Low (Base = Old Entry Price)
            { id: 'fox', name: 'FoxESS', markup: 0, markupPerKwh: 0 },
            { id: 'dyness', name: 'Dyness', markup: 0, markupPerKwh: 0 },
            { id: 'solplanet', name: 'Solplanet', markup: 0, markupPerKwh: 0 },

            // Medium - High (Base + $55/kWh)
            { id: 'goodwe', name: 'GoodWe', markup: 0, markupPerKwh: 55, tag: 'Smart' },
            { id: 'alpha', name: 'AlphaESS', markup: 0, markupPerKwh: 55, tag: 'Design' }
        ]
    },
    premium: {
        title: "Premium Tier Brands",
        brands: [
            // Premium - Low (Base = Old Medium Price ($600/kWh base))
            { id: 'sungrow', name: 'Sungrow', markup: 0, markupPerKwh: 0 },
            { id: 'sigenergy', name: 'Sigenergy', markup: 0, markupPerKwh: 0 },

            // Premium - High (Tesla = Old Premium Price ($900/kWh base))
            // Difference between Old Premium (900) and Old Medium (600) is 300.
            { id: 'tesla', name: 'Tesla', markup: 0, markupPerKwh: 300, tag: 'Tesla' }
        ]
    }
};

// 全局变量：存储 calculate 计算出来的三个档位的“裸价”（不含品牌加价）
let currentBasePrices = { entry: 0, medium: 0, premium: 0 };
let currentSelectedBrandMarkup = 0; // 当前选中的品牌加价

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
        tier_entry: "入门级", tier_medium: "中端级", tier_premium: "高端级/特斯拉",
        lead_title: "获取正式方案", lead_desc: "我们将根据您所在的州发送定制方案。", btn_submit: "提交咨询",
        unlock_title: "解锁完整报价单", unlock_desc: "输入您的联系方式以查看详细价格明细。", btn_unlock: "查看完整价格",
        disclaimer: "* 声明：所有估价均为预估值 (Estimate)，实际报价以销售人员最终报价为准。NSW补贴仅限<28kWh。",
        alert_sent: "已发送！我们会尽快联系您。",
        rec_nt: "您位于北领地 (Zone 1)，太阳能 STC 补贴全澳最高！",
        rec_loan: "提示：该州提供无息贷款，可大大降低首付压力。",
        rec_std: "标准配置，适合您的用电习惯。",
        rec_bat: "建议加装电池！(注意：NSW用户若安装>28kWh将失去州补贴)",
        rec_warn_small_solar: "⚠️ 警告：您的太阳能系统太小，无法充满这台大容量电池，升级您的系统大小。",
        warn_nsw_limit: "⚠️ 注意：电池容量超过28kWh，无法申请NSW州政府补贴。",
        warn_qld_exhausted: "⚠️ 注意：昆州 Battery Booster 补贴目前已耗尽，暂无法申请。",
        roi_title: "预计每年节省电费", payback_label: "预计回本周期：", chart_curr: "当前电费 (年)", chart_new: "安装后电费 (年)", chart_saved: "预计节省金额:", years: "年",
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
        modal_vpp_text: "虚拟电厂 (VPP) 将您的家用电池与其他用户的电池联网。在用电高峰期，网络会自动将您存储的电能以高价卖回给电网。<br><br><strong>核心收益：</strong> 您无需任何操作即可获得被动收入抵扣电费，既帮助了电网稳定，又缩短了您的回本周期。",
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
        tier_entry: "Entry", tier_medium: "Medium", tier_premium: "Premium/Tesla",
        lead_title: "Lock in Quote", lead_desc: "Get a formal consultation based on your location.", btn_submit: "Send Enquiry",
        unlock_title: "UNLOCK FULL QUOTE", unlock_desc: "Enter your details to reveal the net price breakdown.", btn_unlock: "Reveal Price",
        disclaimer: "* Disclaimer: All quotes are estimates only.",
        alert_sent: "Enquiry Sent! We will contact you shortly.",
        rec_nt: "Zone 1 (NT) offers the highest Solar STC rebate in Australia!",
        rec_loan: "Tip: Interest-Free Loans available in this state.",
        rec_std: "Standard setup matches your usage.",
        rec_bat: "Battery Recommended! (Note: NSW State rebate void if >28kWh)",
        rec_warn_small_solar: "⚠️ Warning: Your solar system is too small to fully charge this large battery，upgrade your system size.",
        warn_nsw_limit: "⚠️ Alert: System ≥28kWh is ineligible for NSW VPP Rebate.",
        warn_qld_exhausted: "⚠️ Note: QLD Battery Booster allocation is currently exhausted.",
        roi_title: "Estimated Annual Savings", payback_label: "Est. Payback Period:", chart_curr: "Current Bill", chart_new: "New Bill", chart_saved: "EST. Annual Savings:", years: "Years",
        err_required: "Please fill in all required fields (Name, Email, Phone).", err_email: "Please enter a valid email address.", err_phone: "Please enter a valid Australian phone number.",
        ph_name: "Name*", ph_email: "Email*", ph_phone: "Phone*", ph_address: "Installation Address",
        badge_rec: "🌟 Our Recommendation",
        rec_prefix: "Based on bill", rec_suffix: ", recommended:",
        rec_inv: "kW Inverter", rec_phase3: " (3-Phase Only)",
        rec_not_rec: "Given your low quarterly bill, payback period would be excessive.",
        vpp_title: "Join VPP & Earn Extra!", vpp_desc: "Connect battery to earn an extra up to $800/year.", vpp_what_is: "(What is VPP?)",
        modal_vpp_title: "What is a Virtual Power Plant (VPP)?", modal_vpp_text: "A VPP connects your home battery to a network of other batteries. During times of high electricity demand, the network automatically sells your stored energy back to the grid at premium rates.<br><br><strong>Benefit:</strong> You earn passive income credits without lifting a finger, helping the grid while reducing your own payback period.",
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
let selectedTier = 'medium';
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

// ==========================================
// 2. 交互逻辑 (Interaction) - Updated setMode
// ==========================================
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
        // Solar Only
        groups.solar.style.display = 'block'; groups.exist.style.display = 'none'; groups.shade.style.display = 'block';
        groups.battery.style.display = 'none'; groups.solarPropertyFields.style.display = 'grid'; groups.batteryPropertyFields.style.display = 'none';
    }

    // 1. 检查各州补贴资格 (变灰逻辑)
    checkRebates();

    // 2. 🟢 核心修复：如果结果卡片已经显示出来了，切换模式时必须立即重算！
    // 这样才能刷新 VPP Banner 的显示状态，以及重新计算不同模式下的价格。
    if (document.getElementById('result-card').style.display === 'block') {
        calculate(false);
    }
}

// ==========================================
// [UPDATED] 数值更新逻辑 (修复：拖动滑块时立即检查补贴)
// ==========================================
function updateVal(type) {
    const solarInput = document.getElementById('solar-input');
    const batInput = document.getElementById('bat-input');
    const badgeSolar = document.getElementById('badge-solar');
    const badgeBat = document.getElementById('badge-bat');

    // 1. 更新界面显示的数字
    if (type === 'solar') document.getElementById('solar-val').innerText = solarTiers[parseInt(solarInput.value)];
    if (type === 'exist-solar') document.getElementById('exist-solar-val').innerText = solarTiers[parseInt(document.getElementById('exist-solar-input').value)];

    if (type === 'battery') {
        document.getElementById('bat-val').innerText = batInput.value;
        // 🟢 [核心修复] 拖动电池滑块时，立即检查补贴状态 (是否变灰)
        checkRebates();
    }

    if (type === 'bill') document.getElementById('bill-val').innerText = document.getElementById('bill-input').value;

    // 2. 账单滑块的特殊逻辑 (智能推荐)
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

        // 账单变化也会改变电池大小，所以这里也要检查补贴
        checkRebates();

        if (curMode !== 'battery' && billVal <= 200) {
            badgeSolar.style.display = 'none'; badgeBat.style.display = 'none';
        } else {
            badgeSolar.style.display = 'inline-block'; badgeBat.style.display = 'inline-block';
        }
        if (document.getElementById('result-card').style.display === 'block') calculate(false);
    }

    // 3. 徽章显示逻辑
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

// [MODIFIED] 选择档位：不仅高亮盒子，还要渲染下方的品牌
function selectTier(tier) {
    selectedTier = tier; // 更新全局变量

    // 1. UI 高亮档位盒子
    document.querySelectorAll('.tier-box').forEach(box => box.classList.remove('active'));
    document.getElementById(`box-${tier}`).classList.add('active');

    // 2. 渲染该档位下的品牌列表
    renderBrands(tier);
}

// [NEW] 渲染品牌列表
function renderBrands(tier) {
    const container = document.getElementById('brand-selection-container');
    const list = document.getElementById('brand-list');
    const title = document.getElementById('brand-area-title');

    // Solar Only 模式隐藏逻辑 (保持不变)
    if (curMode === 'solar') {
        if (container) container.style.display = 'none';
        const basePrice = currentBasePrices[tier] || 0;
        const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
        const outNet = document.getElementById('out-net');
        if (outNet) outNet.innerText = fmt.format(basePrice);
        const stickyPrice = document.getElementById('sticky-net-price');
        if (stickyPrice) stickyPrice.innerText = fmt.format(basePrice);
        return;
    }

    if (!container || !list) return;

    const config = brandConfig[tier];
    if (!config) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    if (title) title.innerText = config.title;
    list.innerHTML = '';

    config.brands.forEach((brand, index) => {
        const div = document.createElement('div');
        div.className = 'brand-card';
        div.onclick = () => selectBrand(brand.id, brand.markup, tier);
        div.id = `brand-${brand.id}`;

        // 🟢 [核心修改] 图片 + 文字的组合
        // 逻辑：默认显示图片。
        // onerror="..." 的意思是：如果图片加载失败（比如你还没上传），就自动隐藏图片，并显示下面的文字 span。
        let html = `
            <img 
                src="${brand.id}.png" 
                class="brand-logo-img" 
                alt="${brand.name}" 
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            >
            <span class="brand-name-fallback" style="display:none;">${brand.name}</span>
        `;

        div.innerHTML = html;
        list.appendChild(div);

        if (index === 0) {
            selectBrand(brand.id, brand.markup, tier, true);
        }
    });
}

// [UPDATED] 选择具体品牌 (支持按 kWh 加价)
// ==========================================
// 🟢 [UPDATED] 选择具体品牌 (含动态 ROI 刷新)
// ==========================================
function selectBrand(brandId, markup, tier, isAutoSelect = false) {
    // 1. UI 高亮品牌卡片
    document.querySelectorAll('.brand-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`brand-${brandId}`);
    if (activeCard) activeCard.classList.add('active');

    // 2. 计算加价逻辑 (支持固定加价 + 按kWh加价)
    const batSize = parseFloat(document.getElementById('bat-input').value) || 0;

    let extraCost = markup; // 基础固定加价

    // 查找当前品牌的 perKwh 配置
    const tierConfig = brandConfig[tier];
    if (tierConfig) {
        const brandObj = tierConfig.brands.find(b => b.id === brandId);
        if (brandObj) {
            currentSelectedBrandName = brandObj.name;

            if (brandObj.markupPerKwh) {
                extraCost += (brandObj.markupPerKwh * batSize);
            }
        }
    }

    currentSelectedBrandMarkup = extraCost;

    // 获取当前档位的基准价格 (Base Price)
    const basePrice = currentBasePrices[tier];
    const finalPrice = basePrice + extraCost;

    // 3. 更新大字价格 (#out-net) & 底部悬浮栏
    const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
    document.getElementById('out-net').innerText = fmt.format(finalPrice);

    const stickyPriceEl = document.getElementById('sticky-net-price');
    if (stickyPriceEl) stickyPriceEl.innerText = fmt.format(finalPrice);

    // 4. 🟢 核心新增：动态刷新 ROI 图表
    // 必须重新获取当前的系统参数，才能算出准确的回本周期
    const billAmount = parseFloat(document.getElementById('bill-input').value);

    // 获取当前活跃的太阳能板大小
    const solarNewIndex = parseInt(document.getElementById('solar-input').value);
    const solarNewKw = solarTiers[solarNewIndex];
    const solarExistIndex = parseInt(document.getElementById('exist-solar-input').value);
    const solarExistKw = solarTiers[solarExistIndex];
    let activeSolarKw = (curMode === 'battery') ? solarExistKw : solarNewKw;

    // 调用图表更新函数，传入包含品牌溢价后的 finalPrice
    updateChart(finalPrice, billAmount, curMode !== 'solar', batSize, activeSolarKw);
}
// ==========================================
// [UPDATED] 检查补贴逻辑 (NSW变灰但不改字版)
// ==========================================
// ==========================================
// [UPDATED] 检查补贴逻辑 (checkRebates)
// ==========================================
// ==========================================
// [UPDATED] 检查补贴逻辑 (NSW变灰但不改字版)
// ==========================================
// ==========================================
// [FIXED] 检查补贴逻辑 (修复 QLD 禁用 & 贷款提示)
// ==========================================
function checkRebates() {
    const state = document.getElementById('state-select').value;
    const section = document.getElementById('rebate-section');
    const batSize = parseFloat(document.getElementById('bat-input').value);

    // 获取所有 DOM 元素
    const els = {
        vic: document.getElementById('check-vic-solar'),
        qld: document.getElementById('check-qld-bat'),
        nsw: document.getElementById('check-nsw-prds'),
        act: document.getElementById('check-act-loan'),
        tas: document.getElementById('check-tas-loan'),
        nt: document.getElementById('check-nt-stc'),
        sa: document.getElementById('check-sa-vpp')
    };

    // 1. 先全部隐藏 & 重置状态
    Object.values(els).forEach(el => {
        if (el) {
            el.style.display = 'none';
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            const input = el.querySelector('input');
            if (input) input.disabled = false;
        }
    });

    // 默认隐藏整个板块
    section.style.display = 'none';
    let hasInfo = false;

    // --- 2. 逐个州判断逻辑 ---

    // VIC Logic
    if (state === 'VIC' && curMode !== 'battery') {
        els.vic.style.display = 'flex';
        hasInfo = true;
    }

    // QLD Logic (修复：强制变灰 & 禁用)
    if (state === 'QLD' && curMode !== 'solar') {
        els.qld.style.display = 'flex';
        hasInfo = true;

        // 强制禁用逻辑
        const qldInput = els.qld.querySelector('input');
        if (qldInput) {
            qldInput.checked = false; // 强制不勾选
            qldInput.disabled = true; // 禁止点击
        }
        els.qld.style.opacity = '0.5'; // 变灰
        els.qld.style.pointerEvents = 'none'; // 禁止鼠标交互

        // 可选：修改文字提示用户
        const qldLabel = els.qld.querySelector('label');
        if (qldLabel) qldLabel.innerHTML = curLang === 'cn' ? "昆州电池补贴 (名额已满)" : "QLD Battery Booster (Exhausted)";
    }

    // NSW Logic
    const NSW_CAP = config.subsidy_logic.nsw_vpp_cap_kwh || 28;
    if (state === 'NSW' && curMode !== 'solar') {
        els.nsw.style.display = 'flex';
        hasInfo = true;
        const cb = els.nsw.querySelector('input');
        const lbl = els.nsw.querySelector('label');

        // 重置文字
        if (lbl) lbl.innerText = i18n[curLang].nsw_vpp_label;

        if (batSize >= NSW_CAP) {
            if (cb) { cb.checked = false; cb.disabled = true; }
            els.nsw.style.opacity = '0.5';
            els.nsw.style.pointerEvents = 'none';
        } else {
            if (cb) { cb.disabled = false; if (!cb.checked) cb.checked = true; }
            els.nsw.style.opacity = '1';
            els.nsw.style.pointerEvents = 'auto';
        }
    }

    // ACT Logic (修复：确保显示)
    if (state === 'ACT') {
        els.act.style.display = 'flex';
        hasInfo = true;
    }

    // TAS Logic (修复：确保显示)
    if (state === 'TAS') {
        els.tas.style.display = 'flex';
        hasInfo = true;
    }

    // NT Logic
    if (state === 'NT' && curMode !== 'battery') {
        els.nt.style.display = 'flex';
        hasInfo = true;
    }

    if (state === 'SA' && curMode !== 'solar') {
        if (els.sa) {
            els.sa.style.display = 'flex';
            hasInfo = true;
        }
    }

    // 3. 只要有一条信息，就显示整个板块
    if (hasInfo) {
        section.style.display = 'block';
    }
}
// --- 4. 计算逻辑 (Calculation) ---

function safeSetText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }
function getZoneRating(state) { return (state === 'NT') ? 1.622 : (state === 'VIC' || state === 'TAS' ? 1.185 : 1.382); }
function calculateBatteryGross(batteryKwh, tier) {
    const T = config.base_pricing.battery_tiers;
    let rate = (tier === 'entry') ? T.entry_rate_per_kwh : (tier === 'medium' ? T.medium_rate_per_kwh : T.premium_rate_per_kwh);
    return (batteryKwh * rate) + T.fixed_profit_markup;
}


// [UPDATED] 推荐逻辑 (已移除"系统过小"警告)
// ==========================================
function generateRecommendation(state, billAmount, time, shade, hasBat, batteryKwh, isSolarTooSmall, activeSolarKw) {
    const lang = i18n[curLang];

    // 1. 定义标题
    const titleText = curLang === 'cn' ? "当前选定系统配置" : "SELECTED SYSTEM CONFIGURATION";

    // 2. 计算逆变器大小 & 后缀
    let inverterSize = 5;
    let invSuffix = "";

    if (!hasBat) {
        // --- 场景 A: 只有太阳能 ---
        if (activeSolarKw >= 15) inverterSize = 15;
        else if (activeSolarKw >= 12) inverterSize = 10;
        else if (activeSolarKw >= 8) inverterSize = 8;
        else if (activeSolarKw > 6.6) inverterSize = 6;
        else inverterSize = 5;
    } else {
        // --- 场景 B: 有电池 ---
        if (batteryKwh > 43) {
            inverterSize = 15;
            invSuffix = curLang === 'cn'
                ? "<span style='display:block; font-size:0.6em; font-weight:400; opacity:0.8;'>(需三相电)</span>"
                : "<span style='display:block; font-size:0.6em; font-weight:400; opacity:0.8;'>(3-Phase Only)</span>";
        } else if (batteryKwh >= 33) {
            inverterSize = 10;
        } else {
            inverterSize = 5;
        }
    }

    // 3. 构建网格 HTML
    let gridHtml = `<div class="spec-grid">`;
    const inverterDisplayHtml = `${inverterSize} kW <span style="color:var(--solar-gold); vertical-align: super; font-size: 0.6em;">*</span>${invSuffix}`;

    if (curMode !== 'battery') {
        gridHtml += `
            <div class="spec-item">
                <div class="spec-icon">☀️</div>
                <div class="spec-label">${curLang === 'cn' ? "太阳能板" : "Solar Panels"}</div>
                <div class="spec-value">${activeSolarKw} kW</div>
            </div>
            <div class="spec-item">
                <div class="spec-icon">⚡</div>
                <div class="spec-label">${curLang === 'cn' ? "逆变器" : "Inverter"}</div>
                <div class="spec-value">${inverterDisplayHtml}</div>
            </div>
        `;

        if (hasBat) {
            gridHtml += `
                <div class="spec-item">
                    <div class="spec-icon">🔋</div>
                    <div class="spec-label">${curLang === 'cn' ? "储能电池" : "Battery"}</div>
                    <div class="spec-value">${batteryKwh} kWh</div>
                </div>
            `;
        } else {
            gridHtml += `
                <div class="spec-item" style="opacity:0.3; border-style:dashed;">
                    <div class="spec-icon">🔋</div>
                    <div class="spec-label">${curLang === 'cn' ? "电池 (可选)" : "Battery (Opt)"}</div>
                    <div class="spec-value">-</div>
                </div>
            `;
        }
    } else {
        // Battery Only 模式
        gridHtml += `
            <div class="spec-item" style="opacity:0.5;">
                <div class="spec-icon">🏠</div>
                <div class="spec-label">${curLang === 'cn' ? "现有系统" : "Existing Solar"}</div>
                <div class="spec-value">${activeSolarKw} kW</div>
            </div>
            <div class="spec-item">
                <div class="spec-icon">⚡</div>
                <div class="spec-label">${curLang === 'cn' ? "新逆变器" : "New Inverter"}</div>
                <div class="spec-value">${inverterDisplayHtml}</div>
            </div>
            <div class="spec-item">
                <div class="spec-icon">🔋</div>
                <div class="spec-label">${curLang === 'cn' ? "储能电池" : "Battery"}</div>
                <div class="spec-value">${batteryKwh} kWh</div>
            </div>
        `;
    }
    gridHtml += `</div>`;

    // 4. 构建提示信息
    let tipsHtml = `<div class="spec-warnings">`;
    let hasTips = false;

    // Note
    const invNote = curLang === 'cn'
        ? "* 备注：如需升级逆变器容量，价格可能会有所变动。"
        : "* Note: Price may vary if upgrading inverter capacity.";
    tipsHtml += `<div class="warning-item" style="color:#94a3b8; font-style: italic;">${invNote}</div>`;
    hasTips = true;

    // 🔥 移除 NSW limit 警告
    // 🔥 移除 isSolarTooSmall 警告 (这里删除了相关代码)

    // Upsells
    if (userApplianceProfile.backup) {
        if (hasBat) {
            // 有电池：显示绿色 ✅
            const txt = curLang === 'cn' ? "✅ 含全屋离网备份" : "✅ Includes Full Backup";
            tipsHtml += `<div class="upsell-item">${txt}</div>`;
            hasTips = true;
        } else {
            // 🟢 [核心新增] 仅光伏：显示红色 ⚠️
            const txt = curLang === 'cn'
                ? "⚠️ 仅光伏模式下 Backup 可能无效，详情请咨询专家。"
                : "⚠️ Backup might be ineffective in Solar Only mode. Ask an expert.";
            tipsHtml += `<div class="warning-item" style="color:#ef5350">${txt}</div>`;
            hasTips = true;
        }
    }
    if (userApplianceProfile.gas2elec) {
        const txt = curLang === 'cn' ? "⚡ 已预留电气化容量" : "⚡ Ready for Electrification";
        tipsHtml += `<div class="upsell-item">${txt}</div>`;
        hasTips = true;
    }

    // High Bill Suggestion
    if (curMode === 'solar' && billAmount > 250) {
        const txt = curLang === 'cn'
            ? "💡 建议：您的电费较高，加装电池可大幅提升回报率。"
            : "💡 Tip: High bill detected. Adding a battery can significantly boost your ROI.";
        tipsHtml += `<div class="upsell-item" style="font-weight:600;">${txt}</div>`;
        hasTips = true;
    }

    // Low Bill Warning
    const isSolarOnlyWarn = (curMode === 'solar' && billAmount <= 200);
    const isBothWarn = (curMode === 'both' && billAmount <= 200 && activeSolarKw >= 6.6);

    if (isSolarOnlyWarn || isBothWarn) {
        const txt = curLang === 'cn' ? "💡 提示：电费较低，回本周期较长。" : "💡 Tip: Low bill, longer payback.";
        tipsHtml += `<div class="warning-item" style="color:#fbbf24">${txt}</div>`;
        hasTips = true;
    }
    tipsHtml += `</div>`;

    return `
        <strong class="config-title">${titleText}</strong>
        ${gridHtml}
        ${hasTips ? tipsHtml : ''}
    `;
}

// ==========================================
// 🟢 [UPDATED] 核心计算函数 (Fix: Entry=(Gross-STC)*50%, Fix State Rebate Display)
// ==========================================
// ==========================================
// 🟢 [UPDATED] 核心计算函数 (Fix: 禁止自动弹窗 + 之前所有修复)
// ==========================================
function calculate(forceShow = false) {
    try {
        const card = document.getElementById('result-card');
        const isVisible = card.style.display === 'block';
        const isUnlocked = sessionStorage.getItem('quoteUnlocked') === 'true';

        // 🛑 [修复核心] 防止选下拉框时自动弹窗
        // 如果当前还没显示结果(isVisible=false)，且不是点击按钮触发(forceShow=false)，直接退出
        if (!isVisible && !forceShow) return;

        // --- 1. 默认值拦截逻辑 (点击按钮时才检查) ---
        if (forceShow && !isVisible) {
            const currentBill = parseFloat(document.getElementById('bill-input').value);
            const currentState = document.getElementById('state-select').value;
            const currentSolar = document.getElementById('solar-input').value;
            const hasProfile = Object.values(userApplianceProfile).some(val => val === true);

            if (currentBill <= 100 && currentState === 'NSW' && currentSolar === "0" && !hasProfile) {
                const msg = curLang === 'cn' ? "请先输入基础信息，才能算出准确价格哦~" : "Please provide more details first.";
                showToast(msg);
                const billGroup = document.getElementById('bill-input').parentElement;
                billGroup.classList.add('input-highlight');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => billGroup.classList.remove('input-highlight'), 2000);
                return;
            }
        }

        if (forceShow && !isVisible && !isUnlocked) {
            playAnalysisAnimation();
        }

        // --- 2. 获取基础数据 ---
        const state = document.getElementById('state-select').value;
        const solarNewIndex = parseInt(document.getElementById('solar-input').value);
        const solarNewKw = solarTiers[solarNewIndex];
        const batteryKwh = parseFloat(document.getElementById('bat-input').value);

        // 确定活跃太阳能系统 (Solar Cost)
        const BP = config.base_pricing;
        const P_SOLAR_KW = (BP.solar_per_w || 0.9) * 1000;
        const P_BASE_INSTALL = BP.install_base_fee || 0;
        const costShade = parseFloat(document.getElementById('shade-select').value) === 1500 ? BP.addon_extras.addon_shading : 0;

        // 计算太阳能部分的 Gross Price (不含电池)
        let grossSolarBase = 0;
        if (curMode !== 'battery') {
            grossSolarBase = (solarNewKw * P_SOLAR_KW) + P_BASE_INSTALL + costShade;
        }

        // --- 3. 电池基准价格计算 (Gross Battery Logic) ---
        const OLD_ENTRY_RATE = 350;
        const OLD_MEDIUM_RATE = 600;
        const FIXED_PROFIT = 4000;
        const P_BAT_LABOR = (curMode === 'battery') ? 1500 : 500;

        // 基础造价 (不含GST)
        const baseCostOldEntry = (batteryKwh * OLD_ENTRY_RATE) + FIXED_PROFIT + P_BAT_LABOR;
        const baseCostOldMedium = (batteryKwh * OLD_MEDIUM_RATE) + FIXED_PROFIT + P_BAT_LABOR;

        // --- 4. 新 Tier Gross (含 GST) ---
        let grossBatNewEntry = baseCostOldEntry * 1.1;
        let grossBatNewMedium = baseCostOldEntry * 1.1; // Medium Base = Entry Gross
        let grossBatNewPremium = baseCostOldMedium * 1.1; // Premium Base = Medium Gross

        // --- 5. 补贴计算 (STC & State) ---
        const SL = config.subsidy_logic;

        // A. STC Solar
        let stcSolarValue = 0;
        if (curMode !== 'battery') {
            stcSolarValue = Math.floor(solarNewKw * getZoneRating(state) * SL.stc_deeming_years) * SL.fed_stc_price_net;
        }

        // B. STC Battery
        let stcBatteryValue = 0;
        if (curMode !== 'solar') {
            stcBatteryValue = Math.min(batteryKwh, SL.fed_bat_cap_kwh) * SL.fed_bat_rate_per_kwh;
        }

        const totalSTC = stcSolarValue + stcBatteryValue;

        // C. State Rebates (州政府补贴)
        let stateRebateVal = 0;
        if (state === 'NSW' && curMode !== 'solar') {
            const nswCb = document.getElementById('cb-nsw-prds');
            // 如果电池 >= 28，补贴为0；否则看是否勾选
            if (batteryKwh < SL.nsw_vpp_cap_kwh && nswCb && nswCb.checked) {
                stateRebateVal += (batteryKwh * SL.rebate_nsw_rate);
            }
        }
        if (state === 'VIC' && curMode !== 'battery') {
            const vicCb = document.getElementById('cb-vic-solar');
            if (vicCb && vicCb.checked) stateRebateVal += SL.rebate_vic;
        }
        if (state === 'SA' && curMode !== 'solar') {
            stateRebateVal += SL.rebate_sa;
        }

        // 杂项费用
        const valRoof = parseFloat(document.getElementById('roof-select').value) === 800 ? 800 : 0;
        const valStorey = parseFloat(document.getElementById('storey-select').value);
        let costStorey = (valStorey === 300) ? 300 : (valStorey === 500 ? 500 : 0);
        let costBackup = userApplianceProfile.backup ? 600 : 0;
        const siteExtras = valRoof + costStorey + costBackup;

        // --- 6. 最终净价计算 (Net Prices) ---

        const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

        // >>> ENTRY TIER (Felicity) <<<
        // 逻辑：(Gross - STC) * 50%。不减 State Rebate。
        const grossEntryTotal = grossSolarBase + grossBatNewEntry + siteExtras;
        const netEntryFinal = (grossEntryTotal - totalSTC) * 0.5;

        currentBasePrices['entry'] = netEntryFinal;
        safeSetText('net-entry', fmt.format(netEntryFinal));

        // >>> MEDIUM TIER <<<
        // 标准逻辑：Gross - STC - State Rebate
        const grossMediumTotal = grossSolarBase + grossBatNewMedium + siteExtras;
        const netMediumBase = grossMediumTotal - totalSTC - stateRebateVal;

        currentBasePrices['medium'] = netMediumBase;
        const medHighMarkup = 55 * batteryKwh;
        safeSetText('net-medium', `${fmt.format(netMediumBase)} ~ ${fmt.format(netMediumBase + medHighMarkup)}`);

        // >>> PREMIUM TIER <<<
        const grossPremiumTotal = grossSolarBase + grossBatNewPremium + siteExtras;
        const netPremiumBase = grossPremiumTotal - totalSTC - stateRebateVal;

        currentBasePrices['premium'] = netPremiumBase;
        const premHighMarkup = 300 * batteryKwh;
        safeSetText('net-premium', `${fmt.format(netPremiumBase)} ~ ${fmt.format(netPremiumBase + premHighMarkup)}`);

        // --- 7. Entry Tier 禁用逻辑 (Felicity > 39kWh only) ---
        const entryBox = document.getElementById('box-entry');
        if (curMode !== 'solar' && batteryKwh <= 39) {
            entryBox.classList.add('disabled');
            if (selectedTier === 'entry') {
                selectTier('medium');
            }
        } else {
            entryBox.classList.remove('disabled');
        }

        // --- 8. 界面显示更新 ---

        // 动态修改补贴名字
        let dynamicStateLabel = i18n[curLang].res_state;
        if (state === 'VIC') dynamicStateLabel = curLang === 'cn' ? "维州太阳能补贴 (Solar Homes)" : "VIC Solar Homes Rebate";
        else if (state === 'NSW') dynamicStateLabel = curLang === 'cn' ? "新州电池/VPP 补贴" : "NSW PDRS/VPP Incentive";
        else if (state === 'SA') dynamicStateLabel = curLang === 'cn' ? "南澳 VPP 加入奖励" : "SA VPP Join Bonus";
        else if (state === 'ACT') dynamicStateLabel = curLang === 'cn' ? "ACT 无息贷款权益" : "ACT Loan Benefit";

        const rowStateDiv = document.getElementById('row-state');
        if (rowStateDiv) {
            const labelSpan = rowStateDiv.querySelector('span');
            if (labelSpan) labelSpan.innerText = dynamicStateLabel;
        }

        // 显示选中档位的 Gross 
        let activeGross = 0;
        if (selectedTier === 'entry') activeGross = grossEntryTotal;
        else if (selectedTier === 'medium') activeGross = grossMediumTotal;
        else activeGross = grossPremiumTotal;

        safeSetText('lbl-gross-title', `${i18n[curLang].res_gross} (${i18n[curLang]['tier_' + selectedTier]})`);
        safeSetText('out-gross', fmt.format(activeGross));

        // 更新补贴数值显示
        safeSetText('out-stc-solar', "-" + fmt.format(stcSolarValue));
        safeSetText('out-stc-battery', "-" + fmt.format(stcBatteryValue));
        safeSetText('out-state', "-" + fmt.format(stateRebateVal));

        // Rows visibility
        const rowSolar = document.getElementById('row-stc-solar'); if (rowSolar) rowSolar.style.display = stcSolarValue > 0 ? 'flex' : 'none';
        const rowBat = document.getElementById('row-stc-battery'); if (rowBat) rowBat.style.display = stcBatteryValue > 0 ? 'flex' : 'none';

        if (rowStateDiv) {
            rowStateDiv.style.display = stateRebateVal > 0 ? 'flex' : 'none';
        }

        // Solar Only Logic
        const grid = document.querySelector('.comparison-grid');
        const gridTitle = document.querySelector('.section-title[data-i18n="res_final_comparison"]');
        if (curMode === 'solar') {
            if (grid) grid.style.display = 'none';
            if (gridTitle) gridTitle.style.display = 'none';

            const solarOnlyGross = grossSolarBase + siteExtras;
            safeSetText('out-gross', fmt.format(solarOnlyGross));
            const solarOnlyNet = solarOnlyGross - totalSTC - stateRebateVal;
            safeSetText('out-net', fmt.format(solarOnlyNet));

            currentBasePrices['entry'] = solarOnlyNet;
            currentBasePrices['medium'] = solarOnlyNet;
            currentBasePrices['premium'] = solarOnlyNet;
        } else {
            if (grid) grid.style.display = 'grid';
            if (gridTitle) gridTitle.style.display = 'block';
        }

        // 🔥 找回太阳能板 Logo 逻辑
        const panelBox = document.getElementById('panel-brand-container');
        if (panelBox) {
            panelBox.style.display = (curMode === 'battery') ? 'none' : 'block';
        }

        // --- 9. 推荐与图表更新 ---
        const billAmount = parseFloat(document.getElementById('bill-input').value);
        let activeSolarKw = (curMode === 'battery') ? solarTiers[parseInt(document.getElementById('exist-solar-input').value)] : solarNewKw;
        const recEl = document.getElementById('rec-text');

        // 无警告逻辑
        let isSolarTooSmall = (activeSolarKw * 2.5 < batteryKwh);
        if (recEl) {
            recEl.innerHTML = generateRecommendation(state, billAmount, 'day', 0, curMode !== 'solar', batteryKwh, isSolarTooSmall, activeSolarKw);
        }

        const currentNetPrice = parseFloat(document.getElementById('out-net').innerText.replace(/[^0-9.-]+/g, ""));
        updateChart(currentNetPrice || currentBasePrices['medium'], billAmount, curMode !== 'solar', batteryKwh, activeSolarKw);

        // --- 10. 显示结果 & 刷新 ---
        card.style.display = 'block';
        selectTier(selectedTier);

        if (isUnlocked) {
            document.getElementById('unlock-overlay').classList.add('hidden');
            document.querySelectorAll('.price-number').forEach(el => el.classList.remove('locked'));

            // 🟢 [修复开始]：刷新后，如果检测到已解锁，必须强制把按钮和 VPP Banner 显示出来
            const finalBtn = document.getElementById('btn-final-enquiry');
            if (finalBtn) finalBtn.style.display = 'flex';

            const vppBanner = document.getElementById('vpp-banner');
            // 注意：VPP Banner 只有在非纯光伏模式下才显示
            if (vppBanner && curMode !== 'solar') vppBanner.style.display = 'flex';
            // 🟢 [修复结束]

            setupStickyObserver();
        } else {
            document.getElementById('unlock-overlay').classList.remove('hidden');
            document.querySelectorAll('.price-number').forEach(el => el.classList.add('locked'));

            // 🟢 [建议]：如果是未解锁状态，确保按钮是隐藏的（防止逻辑冲突）
            const finalBtn = document.getElementById('btn-final-enquiry');
            if (finalBtn) finalBtn.style.display = 'none';
        }

        if (forceShow) card.scrollIntoView({ behavior: "smooth" });

    } catch (err) {
        console.error("Calculate Error:", err);
    }
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
    // 1. 【上锁】给 body 加类，CSS 会立刻强制隐藏 FOMO Bar
    document.body.classList.add('hide-fomo');

    // ... (以下是原有逻辑，保持不变) ...
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
    if (!event || event.target === overlay || event.target.classList.contains('close-btn')) {
        overlay.style.display = 'none';

        // 2. 【解锁】移除类，FOMO Bar 恢复显示
        document.body.classList.remove('hide-fomo');
    }
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
            // 🟢 [新增] 记录用户选的品牌
            selected_brand: (curMode === 'solar') ? 'Solar Only (Panels)' : currentSelectedBrandName,
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
    // 在 sendFinalEnquiry 函数底部...
    setTimeout(() => {
        document.getElementById('final-msg').style.color = '#66bb6a';
        document.getElementById('final-msg').innerText = i18n[curLang].alert_final_success;
        btn.innerText = curLang === 'cn' ? "已提交" : "Submitted";

        setTimeout(() => {
            document.getElementById('confirm-modal').style.display = 'none';

            // 【新增】提交成功关闭弹窗后，也记得解锁
            document.body.classList.remove('hide-fomo');

        }, 2000);
    }, 1000);
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
// ==========================================
// [UPDATED] 游戏化加载动画 (修复：动画过程中完全隐藏表单)
// ==========================================
// ==========================================
// [UPDATED] 游戏化加载动画 (强制覆盖 CSS !important)
// ==========================================
function playAnalysisAnimation() {
    const loader = document.getElementById('analysis-loader');
    const formContent = document.getElementById('unlock-form-content');
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');

    // --- 1. 初始状态：强制隐藏表单 (使用 setProperty 覆盖 CSS 的 !important) ---
    if (formContent) {
        // 🟢 [核心修复] 使用 'important' 参数，强制打败 CSS 里的 display: flex !important
        formContent.style.setProperty('display', 'none', 'important');
        formContent.classList.remove('fade-in');
    }

    if (loader) loader.style.display = 'block'; // 显示加载圈
    if (bar) bar.style.width = '0%';
    if (text) text.innerText = i18n[curLang].step_1;

    // --- 2. 动画步骤 ---

    // 0.1秒
    setTimeout(() => {
        if (bar) bar.style.width = '35%';
    }, 100);

    // 1.5秒
    setTimeout(() => {
        if (text) text.innerText = i18n[curLang].step_2;
        if (bar) bar.style.width = '70%';
    }, 1500);

    // 3.0秒
    setTimeout(() => {
        if (text) text.innerText = i18n[curLang].step_3;
        if (bar) bar.style.width = '92%';
    }, 3000);

    // --- 3. 动画完成 (4.2秒)：强制显示表单 ---
    setTimeout(() => {
        // 隐藏加载器
        if (loader) loader.style.display = 'none';

        // 显示表单
        if (formContent) {
            // 🟢 [核心修复] 恢复显示，必须用 flex 才能保持居中，且同样需要 important
            formContent.style.setProperty('display', 'flex', 'important');

            // 加上淡入动画
            formContent.classList.add('fade-in');
        }

        // 更新标题
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

// 兜底回复库 (当不知道怎么回的时候，引导去发邮件)
const fallbackResponses = {
    cn: [
        "这个问题我暂时答不上来 😅。如果您有任何具体需求或疑问，欢迎发送邮件至 <a href='mailto:info@solaryo.com.au' style='color:#0f172a; text-decoration:underline; font-weight:bold;'>info@solaryo.com.au</a>，我们会尽快回复。",
        "抱歉，我可能没完全理解。如有任何业务需求，请直接 Email 联系我们：<a href='mailto:info@solaryo.com.au' style='color:#0f172a; text-decoration:underline; font-weight:bold;'>info@solaryo.com.au</a>"
    ],
    en: [
        "I'm not sure about that one 😅. If you have any specific requirements, please email us at <a href='mailto:info@solaryo.com.au' style='color:#0f172a; text-decoration:underline; font-weight:bold;'>info@solaryo.com.au</a>",
        "Sorry, I missed that. For any specific enquiries, feel free to email us directly: <a href='mailto:info@solaryo.com.au' style='color:#0f172a; text-decoration:underline; font-weight:bold;'>info@solaryo.com.au</a>"
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

// ==========================================
// [MODIFIED] FOMO Bar Logic (Supabase Connected)
// ==========================================

// 1. 定义一个空数组，稍后填入数据
let fomoData = [];
let currentFomoIndex = 0;
let fomoInterval;

// 2. 从 Supabase 获取数据
async function fetchFomoData() {
    try {
        const { data, error } = await supabaseClient
            .from('fomo_news')
            .select('*')
            .eq('is_active', true)         // 只读取激活的新闻
            .order('created_at', { ascending: false }); // 最新的在前面

        if (error) throw error;

        if (data && data.length > 0) {
            fomoData = data;
            // 数据加载完了，启动滚动条
            initFomoBar();
        } else {
            // 如果没数据，隐藏条子
            document.getElementById('fomo-bar').style.display = 'none';
        }

    } catch (err) {
        console.error('Error fetching FOMO news:', err);
        // 出错时也可以显示一条默认的
        document.getElementById('fomo-text').innerText = "Contact us for latest solar deals!";
    }
}

// 3. 初始化滚动逻辑
function initFomoBar() {
    // 安全检查：如果没数据或元素不存在，直接退出
    if (!fomoData || fomoData.length === 0) return;
    if (!document.getElementById('fomo-bar')) return;

    // 先显示第一条
    updateFomoContent();

    // 如果只有一条数据，就不需要滚动了
    if (fomoData.length === 1) return;

    // 清除旧定时器（防止重复运行）
    if (fomoInterval) clearInterval(fomoInterval);

    fomoInterval = setInterval(() => {
        const contentEl = document.querySelector('.fomo-content');
        if (!contentEl) return;

        // 向上滚出
        contentEl.classList.add('scrolling-out');

        setTimeout(() => {
            currentFomoIndex = (currentFomoIndex + 1) % fomoData.length;
            updateFomoContent();

            // 瞬间移到底部
            contentEl.classList.remove('scrolling-out');
            contentEl.classList.add('scrolling-in-ready');

            // 强制重绘
            void contentEl.offsetWidth;

            // 向上滚入
            contentEl.classList.remove('scrolling-in-ready');
        }, 500);

    }, 5000);
}

// 4. 更新内容函数 (保持不变，但为了确保上下文，这里完整列出)
function updateFomoContent() {
    if (!fomoData || fomoData.length === 0) return;

    const item = fomoData[currentFomoIndex];
    const isCN = (typeof curLang !== 'undefined' && curLang === 'cn');

    // 更新图标
    const iconEl = document.getElementById('fomo-icon');
    if (iconEl) iconEl.innerText = item.icon || '🔥';

    // 更新文字
    const textEl = document.getElementById('fomo-text');
    if (textEl) textEl.innerText = isCN ? item.title_cn : item.title_en;

    // 更新标签颜色
    const labelEl = document.querySelector('.fomo-label');
    if (labelEl) {
        labelEl.style.display = "inline-flex";
        labelEl.style.alignItems = "center";
        labelEl.style.justifyContent = "center";
        labelEl.style.height = "16px";
        labelEl.style.padding = "0 6px";
        labelEl.style.borderRadius = "4px";

        if (item.type === 'news') {
            labelEl.innerText = "NEWS";
            labelEl.style.backgroundColor = "#ef4444";
            labelEl.style.color = "#ffffff";
        } else {
            labelEl.innerText = "CASE";
            labelEl.style.backgroundColor = "#10b981";
            labelEl.style.color = "#ffffff";
        }
    }
}

// 5. 确保在页面加载完成后调用
document.addEventListener('DOMContentLoaded', () => {
    // 启动数据拉取
    fetchFomoData();
});

// ==========================================
// [INTERACTION] FOMO Modal Logic
// ==========================================

function openFomoModal() {
    // 安全检查
    if (!fomoData || fomoData.length === 0) return;

    // 1. 获取元素
    const item = fomoData[currentFomoIndex];
    const isCN = (typeof curLang !== 'undefined' && curLang === 'cn');
    const modal = document.getElementById('fomo-detail-modal');
    const card = document.querySelector('.fomo-card'); // 获取卡片元素

    // 2. 填充内容 (保持不变)
    const imgEl = document.getElementById('fomo-modal-img');
    if (item.img_url) {
        imgEl.src = item.img_url;
        imgEl.parentElement.style.display = 'block';
    } else {
        imgEl.parentElement.style.display = 'none';
    }

    const badgeEl = document.getElementById('fomo-modal-badge');
    if (item.type === 'news') {
        badgeEl.innerText = isCN ? "NEWS" : "NEWS";
        badgeEl.style.background = "#ef4444";
    } else {
        badgeEl.innerText = isCN ? "CASE" : "CASE";
        badgeEl.style.background = "#10b981";
    }

    document.getElementById('fomo-modal-title').innerText = isCN ? item.title_cn : item.title_en;
    document.getElementById('fomo-modal-desc').innerHTML = isCN ? item.desc_cn : item.desc_en;
    document.getElementById('fomo-modal-date').innerText = item.date || 'Just Now';

    // ===============================================
    // 🟢 修复核心：调整执行顺序
    // ===============================================

    // 第一步：先让弹窗显示出来！(这一步必须在重排之前)
    // 只有显示了，浏览器才知道这个元素多大，才能进行重排
    modal.style.display = 'flex';

    // 第二步：先移除动画
    card.style.animation = 'none';

    // 第三步：强制浏览器计算高度 (触发重排 Reflow)
    // 此时因为 display 已经是 flex 了，offsetWidth 才有数值，重排才会生效
    void card.offsetWidth;

    // 第四步：手动重新指定动画 (直接把 CSS 里的动画参数写在这里)
    // 这样能确保浏览器认为这是一个新的动画指令
    card.style.animation = 'cardPopUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
}

function closeFomoModal(event) {
    const overlay = document.getElementById('fomo-detail-modal');

    // 点击遮罩层、关闭按钮、或底部按钮时关闭
    // 注意：点击卡片内部(.fomo-card)不应该关闭
    if (!event ||
        event.target === overlay ||
        event.target.closest('.fomo-close-btn') ||
        event.target.closest('.fomo-action-btn')) {

        overlay.style.display = 'none';

        // 可选：如果之前暂停了，这里可以重新启动滚动
        // initFomoBar(); 
    }
}

// 将其挂载到全局初始化
document.addEventListener('DOMContentLoaded', () => {
    initFomoBar();
});

// 为了支持语言切换时即时更新
const originalSetLang = window.setLang; // 劫持原本的 setLang
window.setLang = function (lang) {
    if (originalSetLang) originalSetLang(lang); // 执行原逻辑
    updateFomoContent(); // 执行 FOMO 更新
};