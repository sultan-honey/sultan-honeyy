const firebaseConfig = {
    apiKey: "AIzaSyCcgQj8bk5Me1g80EHLY7heukjUvH_GSKs",
    authDomain: "sultan-honey.firebaseapp.com",
    databaseURL: "https://sultan-honey-default-rtdb.firebaseio.com",
    projectId: "sultan-honey",
    storageBucket: "sultan-honey.firebasestorage.app",
    messagingSenderId: "701835618498",
    appId: "1:701835618498:web:701e310cf1c2c0dad6b35b"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let editKey = null;

if (currentUser) { showApp(); }

function login() {
    const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        location.reload();
    } else { alert("عذراً، البيانات غير صحيحة"); }
}

function showApp() { 
    document.getElementById('loginPage').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('displayName').innerText = currentUser;
    document.getElementById('calendarFilter').value = new Date().toISOString().split('T')[0];
    loadData(); 
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let stats = { totalO: 0, totalS: 0, omarO: 0, omarS: 0, maryamO: 0, maryamS: 0 };
        const cal = document.getElementById('calendarFilter').value.split('-').reverse().join('-');
        const search = document.getElementById('searchInput').value.toLowerCase();

        snap.forEach(child => {
            const o = child.val();
            
            // الخصوصية: الموظف لا يرى إلا طلباته فقط
            if (userRole === "staff" && o.emp !== currentUser) return;

            const isDate = o.dateKey === cal;
            const isMatch = o.name.toLowerCase().includes(search) || o.id.includes(search);

            if (isDate) {
                stats.totalO++; stats.totalS += parseFloat(o.price || 0);
                if (o.emp === "عمر") { stats.omarO++; stats.omarS += parseFloat(o.price || 0); }
                if (o.emp === "مريم") { stats.maryamO++; stats.maryamS += parseFloat(o.price || 0); }
            }

            if (isDate || (search.length > 0 && isMatch)) {
                const card = `
                <div class="order-card" data-user="${o.emp}">
                    <div class="card-tools">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <strong>👤 ${o.name}</strong><br>
                    <span>🔢 الطلب: ${o.id} | 💰 ${o.price} ريال</span><br>
                    <span>🏢 ${o.branch} | 🏷️ ${o.emp}</span><br>
                    <span>📦 ${o.delivery} ${o.delivery !== 'توصيل مندوب' && o.delivery !== 'استلام من الفرع' ? `| 📄 بوليصة: ${o.trackingID || '---'}` : ''}</span>
                </div>`;
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    const adminOnly = document.querySelectorAll('.admin-only');
    const omarBox = document.querySelector('.stat-card.omar');
    const maryamBox = document.querySelector('.stat-card.maryam');

    if (userRole === 'admin') {
        adminOnly.forEach(el => el.classList.remove('hidden'));
        document.getElementById('statTotalOrders').innerText = s.totalO;
        document.getElementById('statTotalSales').innerText = s.totalS.toFixed(2) + " ريال";
        omarBox.classList.remove('hidden');
        maryamBox.classList.remove('hidden');
    } else {
        adminOnly.forEach(el => el.classList.add('hidden'));
        omarBox.classList.toggle('hidden', currentUser !== "عمر");
        maryamBox.classList.toggle('hidden', currentUser !== "مريم");
    }
    document.getElementById('statOmar').innerText = `${s.omarO} طلب | ${s.omarS.toFixed(2)} ريال`;
    document.getElementById('statMaryam').innerText = `${s.maryamO} طلب | ${s.maryamS.toFixed(2)} ريال`;
}

function getPrintDecor(o) {
    const color = o.emp === "عمر" ? "#007bff" : (o.emp === "مريم" ? "#e83e8c" : "#000");
    const hideTracking = (o.delivery === "توصيل مندوب" || o.delivery === "استلام من الفرع");
    return `
    <div style="width:350px; height:350px; border:10px double #b48608; padding:20px; border-radius:15px; direction:rtl; font-family:Tahoma; position:relative; box-sizing:border-box; margin:10px; background:white; float:right;">
        <h2 style="text-align:center; color:#b48608;">سلطان العسل</h2>
        <div style="font-size:17px; line-height:1.8; color:${color}; font-weight:bold;">
            👤 العميل: ${o.name}<br>🔢 الطلب: ${o.id}<br>💰 المبلغ: ${o.price} ريال<br>
            📦 التوصيل: ${o.delivery}<br>📍 الفرع: ${o.branch}<br>
            ${!hideTracking ? `📄 البوليصة: ${o.trackingID || '---'}<br>` : ""}
            🏷️ الموظف: ${o.emp}
        </div>
        <div style="position:absolute; bottom:15px; left:15px; font-size:11px; color:#666;">📅 ${o.dateKey}</div>
    </div>`;
}

function printAllToday() {
    const cal = document.getElementById('calendarFilter').value.split('-').reverse().join('-');
    db.ref('orders').once('value', snap => {
        let content = "";
        snap.forEach(c => {
            const o = c.val();
            if (userRole === "staff" && o.emp !== currentUser) return;
            if (o.dateKey === cal) content += getPrintDecor(o);
        });
        if (!content) return alert("لا توجد طلبات لهذا التاريخ");
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<html><body style="display:flex; flex-wrap:wrap; justify-content:center;">${content}</body></html>`);
        win.document.close(); win.print();
    });
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const win = window.open('', '', 'width=500,height=500');
        win.document.write(`<html><body style="display:flex; justify-content:center; align-items:center;">${getPrintDecor(s.val())}</body></html>`);
        win.document.close(); win.print();
    });
}

function smartDelete(key) { 
    if (prompt("أدخل كلمة سر الحذف (الخاصة بإبراهيم):") === "6410") { 
        db.ref('orders/' + key).remove(); 
        alert("تم الحذف بنجاح ✅");
    } else { alert("❌ كلمة السر خاطئة!"); }
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;
    const n = text.match(/العميل\s*\n\s*(.+)/); if (n) document.getElementById('custName').value = n[1].trim();
    const id = text.match(/طلب\s*#(\d+)/); if (id) document.getElementById('orderID').value = id[1];
    const p = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*(\d+(?:\.\d+)?)\s*SAR/); if (p) document.getElementById('orderPrice').value = p[1];
    const t = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{10,15})/); if (t) document.getElementById('trackingID').value = t[1];
    document.getElementById('orderType').value = "سلة";
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
        dateKey: today
    };
    if (editKey) { db.ref('orders/' + editKey).update(data).then(() => { editKey = null; location.reload(); }); }
    else { db.ref('orders').push(data).then(() => location.reload()); }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('branchName').value = o.branch || "فرع المحالة";
        document.getElementById('deliveryType').value = o.delivery;
        document.getElementById('saveBtn').innerText = "تحديث الطلب الآن 🔄";
        window.scrollTo(0,0);
    });
}
function logout() { localStorage.clear(); location.reload(); }
