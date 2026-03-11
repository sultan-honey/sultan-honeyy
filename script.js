// --- إعدادات فايبربيس ---
const firebaseConfig = {
    apiKey: "AIzaSyCcgQj8bk5Me1g80EHLY7heukjUvH_GSKs",
    authDomain: "sultan-honey.firebaseapp.com",
    databaseURL: "https://sultan-honey-default-rtdb.firebaseio.com",
    projectId: "sultan-honey",
    storageBucket: "sultan-honey.firebasestorage.app",
    messagingSenderId: "701835618498",
    appId: "1:701835618498:web:701e310cf1c2c0dad6b35b"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let editKey = null;

function getTodayDateFormatted() {
    return new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
}

window.onload = function() { if (currentUser) { showApp(); } };

function login() {
    const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        showApp();
    } else { alert("عذراً، البيانات غير صحيحة ❌"); }
}

function showApp() { 
    document.getElementById('loginPage').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('displayName').innerText = currentUser;
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    if (document.getElementById('calendarFilter')) document.getElementById('calendarFilter').value = todayISO;
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;
    const n = text.match(/العميل\s*\n\s*(.+)/); if (n) document.getElementById('custName').value = n[1].trim();
    const id = text.match(/طلب\s*#(\d+)/); if (id) document.getElementById('orderID').value = id[1];
    const totalMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*([\d,]+(?:\.\d+)?)\s*SAR/);
    if (totalMatch) {
        let cleanPrice = totalMatch[1].replace(/,/g, '');
        document.getElementById('orderPrice').value = cleanPrice;
    }
    const t = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{10,15})/); if (t) document.getElementById('trackingID').value = t[1];
    document.getElementById('orderType').value = "سلة";
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        if (!sList || !wList) return;
        
        sList.innerHTML = ""; wList.innerHTML = "";
        let stats = { totalO: 0, totalS: 0, omarO: 0, omarS: 0, maryamO: 0, maryamS: 0, smsaCount: 0, deliveryCount: 0, branchCount: 0 };
        
        const selectedDate = document.getElementById('calendarFilter').value.split('-').reverse().join('-');
        const searchKeyword = document.getElementById('searchInput').value.toLowerCase();

        snap.forEach(child => {
            const o = child.val();
            const isDateMatch = o.dateKey === selectedDate;
            
            // تحسين البحث ليشمل الاسم، رقم الطلب، أو رقم البوليصة
            const isSearchMatch = searchKeyword !== "" && (
                (o.name && o.name.toLowerCase().includes(searchKeyword)) || 
                (o.id && String(o.id).includes(searchKeyword)) ||
                (o.trackingID && String(o.trackingID).includes(searchKeyword))
            );

            let rawPrice = String(o.price || "0").replace(/[^\d.-]/g, '');
            let priceValue = parseFloat(rawPrice) || 0;

            // تحديث الإحصائيات (دائماً لليوم المختار فقط)
            if (isDateMatch) {
                stats.totalO++; stats.totalS += priceValue;
                if (o.emp === "عمر") { stats.omarO++; stats.omarS += priceValue; }
                if (o.emp === "مريم") { stats.maryamO++; stats.maryamS += priceValue; }
                if (o.delivery === "شحن سمسا") stats.smsaCount++;
                else if (o.delivery === "توصيل مندوب") stats.deliveryCount++;
                else if (o.delivery === "استلام من الفرع") stats.branchCount++;
            }

            // قانون العرض:
            // 1. إذا كان هناك بحث: اعرض ما يطابق البحث من كل الأرشيف.
            // 2. إذا لم يكن هناك بحث: اعرض طلبات اليوم المختار فقط.
            let shouldShow = false;
            if (searchKeyword !== "") {
                if (isSearchMatch) shouldShow = true;
            } else {
                if (isDateMatch) shouldShow = true;
            }

            // الموظف يرى طلباته فقط حتى في البحث
            if (userRole === "staff" && o.emp !== currentUser) shouldShow = false;

            if (shouldShow) {
                const card = `
                <div class="order-card" data-user="${o.emp}">
                    <div class="card-tools">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <strong>👤 ${o.name}</strong><br>
                    <span>🔢 طلب: ${o.id} | 💰 ${priceValue} ر.س</span><br>
                    <span>🏢 ${o.branch} | 🏷️ الموظف: ${o.emp}</span><br>
                    <span>👨‍🍳 المجهز: ${o.prepEmp || "---"}</span><br>
                    <span>📦 ${o.delivery} ${o.delivery !== 'توصيل مندوب' && o.delivery !== 'استلام من الفرع' ? `| 📄 بوليصة: ${o.trackingID || '---'}` : ''}</span>
                    <div style="font-size:10px; color:#999; margin-top:5px;">📅 التاريخ: ${o.dateKey}</div>
                </div>`;
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    document.getElementById('statTotalOrders').innerText = s.totalO;
    document.getElementById('statTotalSales').innerText = s.totalS.toLocaleString() + " ريال";
    document.getElementById('statOmar').innerText = `${s.omarO} طلب | ${s.omarS.toLocaleString()} ريال`;
    document.getElementById('statMaryam').innerText = `${s.maryamO} طلب | ${s.maryamS.toLocaleString()} ريال`;
    if (document.getElementById('statSmsaCount')) document.getElementById('statSmsaCount').innerText = s.smsaCount + " شحنة";
    if (document.getElementById('statDeliveryCount')) document.getElementById('statDeliveryCount').innerText = s.deliveryCount + " طلب";
    if (document.getElementById('statBranchCount')) document.getElementById('statBranchCount').innerText = s.branchCount + " استلام";
    
    const adminOnly = document.querySelectorAll('.admin-only');
    const omarCard = document.querySelector('.stat-card.omar');
    const maryamCard = document.querySelector('.stat-card.maryam');

    if (userRole === 'admin') {
        adminOnly.forEach(el => el.style.display = 'block');
        if (omarCard) omarCard.style.display = 'block';
        if (maryamCard) maryamCard.style.display = 'block';
    } else {
        adminOnly.forEach(el => el.style.display = 'none');
        if (omarCard) omarCard.style.display = (currentUser === "عمر") ? 'block' : 'none';
        if (maryamCard) maryamCard.style.display = (currentUser === "مريم") ? 'block' : 'none';
    }
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value,
        emp: currentUser,
        id: document.getElementById('orderID').value || "---",
        trackingID: document.getElementById('trackingID').value || "",
        price: document.getElementById('orderPrice').value || "0",
        prepEmp: document.getElementById('prepEmp').value || "---",
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: getTodayDateFormatted(), 
        time: new Date().toLocaleTimeString('ar-SA')
    };
    if (!data.name) return alert("يرجى إدخال اسم العميل");
    if (editKey) {
        db.ref('orders/' + editKey).update(data).then(() => { editKey = null; location.reload(); });
    } else { 
        db.ref('orders').push(data).then(() => location.reload()); 
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('prepEmp').value = o.prepEmp || ""; 
        document.getElementById('saveBtn').innerText = "تحديث البيانات 🔄";
        window.scrollTo(0,0);
    });
}

function getPrintDecor(o) {
    const color = o.emp === "عمر" ? "#007bff" : (o.emp === "مريم" ? "#e83e8c" : "#000");
    return `<div style="width:350px; height:350px; border:10px double #b48608; padding:20px; border-radius:15px; direction:rtl; font-family:Tahoma; position:relative; box-sizing:border-box; margin:10px; background:white; float:right;">
        <h2 style="text-align:center; color:#b48608;">سلطان العسل</h2>
        <div style="font-size:17px; line-height:1.7; color:${color}; font-weight:bold;">
            👤 العميل: ${o.name}<br>🔢 الطلب: ${o.id}<br>💰 المبلغ: ${o.price} ريال<br>
            📦 التوصيل: ${o.delivery}<br>📍 الفرع: ${o.branch}<br>
            👨‍🍳 المجهز: ${o.prepEmp || "---"}<br>
            ${o.trackingID ? `📄 البوليصة: ${o.trackingID}<br>` : ""}🏷️ الموظف: ${o.emp}
        </div><div style="position:absolute; bottom:15px; left:15px; font-size:11px; color:#666;">📅 ${o.dateKey}</div></div>`;
}

function printAllToday() {
    const selectedDate = document.getElementById('calendarFilter').value.split('-').reverse().join('-');
    db.ref('orders').once('value', snap => {
        let content = "";
        snap.forEach(c => { if (c.val().dateKey === selectedDate) content += getPrintDecor(c.val()); });
        const win = window.open('', ''); win.document.write(content); win.document.close(); win.print();
    });
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const win = window.open('', ''); win.document.write(getPrintDecor(s.val())); win.document.close(); win.print();
    });
}

function smartDelete(key) { if (prompt("كلمة السر:") === "6410") db.ref('orders/' + key).remove(); }
function logout() { localStorage.clear(); location.reload(); }
