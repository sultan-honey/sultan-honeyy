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
const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };

let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let archiveMode = false;
let editKey = null;

if (currentUser) { showApp(); }

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', currentUser);
        localStorage.setItem('userRole', userRole);
        location.reload();
    } else { alert("خطأ في الدخول"); }
}

function logout() { localStorage.clear(); location.reload(); }
function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الصق النص أولاً");
    const idMatch = text.match(/(?:#|طلب رقم|الطلب)\s*(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];
    const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:SAR|ريال|ر\.س)/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];
    const customerMatch = text.match(/(.+)\n\+966/) || text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) document.getElementById('custName').value = customerMatch[1].trim();
    const trackingMatch = text.match(/(?:رقم شحنة|بوليصة|تتبع)\s*[:#]?\s*(\d{10,15})/);
    if (trackingMatch) document.getElementById('trackingID').value = trackingMatch[1];
    document.getElementById('orderType').value = "سلة";
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        sList.innerHTML = ""; wList.innerHTML = "";
        let stats = { "عمر": 0, "مريم": 0, "إبراهيم": 0, "الكل": 0 };

        snap.forEach(child => {
            const o = child.val();
            if (o.dateKey === today) {
                if (stats[o.emp] !== undefined) stats[o.emp]++;
                stats["الكل"]++;
            }

            const isMatch = searchTerm !== "" && (o.name.toLowerCase().includes(searchTerm) || o.id.toString().includes(searchTerm) || (o.trackingID && o.trackingID.includes(searchTerm)));
            
            if (isMatch || archiveMode || o.dateKey === today) {
                if (userRole === "staff" && o.emp !== currentUser) return;

                const card = `
                    <div class="order-card">
                        <div class="card-tools">
                            <button onclick="deleteOrder('${child.key}')">🗑️</button>
                            <button onclick="editOrder('${child.key}')">📝</button>
                            <button onclick="printSingle('${child.key}')">⎙</button>
                        </div>
                        <strong>👤 ${o.name}</strong>
                        <div class="card-info">
                            <span>🏷️ ${o.emp}</span> <span>👨‍🍳 ${o.prepEmp}</span>
                            <span>🔢 ${o.id}</span> <span>💰 ${o.price} ر.س</span>
                            <span style="grid-column: span 2">📄 ${o.trackingID || '---'}</span>
                        </div>
                        <p style="font-size:10px; color:#999; margin-top:10px;">📅 ${o.dateKey} ${o.dateKey !== today ? '(أرشيف)' : ''}</p>
                    </div>`;
                if (o.type === "سلة") sList.insertAdjacentHTML('afterbegin', card);
                else wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    let html = userRole === "admin" ? 
        `<span class="st-badge">📊 اليوم: ${s.الكل}</span> <span class="st-badge">عمر: ${s.عمر}</span> <span class="st-badge">مريم: ${s.مريم}</span>` :
        `<span class="st-badge">📈 طلباتك اليوم: ${s[currentUser] || 0}</span>`;
    document.getElementById('userWelcome').innerHTML = `<div class="stats-row">${html}</div>`;
}

function deleteOrder(key) {
    const pass = prompt("أدخل كلمة مرور الموظف للحذف:");
    if (pass === users[currentUser]) {
        if(confirm("هل أنت متأكد؟")) db.ref('orders/' + key).remove();
    } else { alert("كلمة المرور خاطئة!"); }
}

function printSingle(key) {
    db.ref('orders/' + key).once('value', (snap) => {
        const o = snap.val();
        const win = window.open('', '', 'height=700,width=900');
        win.document.write(`<html><head><style>
            body { direction: rtl; font-family: 'Tahoma', sans-serif; display: flex; justify-content: center; padding: 20px; }
            .gold-frame { width: 500px; border: 15px double #b48608; padding: 30px; border-radius: 10px; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #eee; margin-bottom: 20px; }
            .header img { width: 80px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 18px; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
            .footer { margin-top: 30px; text-align: center; font-weight: bold; color: #b48608; border-top: 2px solid #eee; padding-top: 10px; }
        </style></head><body>
            <div class="gold-frame">
                <div class="header"><img src="1000031072.png"><h2>سلطان العسل</h2><p>${o.dateKey}</p></div>
                <div class="row"><span>رقم الطلب:</span> <b>${o.id}</b></div>
                <div class="row"><span>العميل:</span> <b>${o.name}</b></div>
                <div class="row"><span>الموظف:</span> <b>${o.emp}</b></div>
                <div class="row"><span>البوليصة:</span> <b>${o.trackingID}</b></div>
                <div class="row"><span>التوصيل:</span> <b>${o.delivery}</b></div>
                <div class="footer">مسؤول التجهيز: ${o.prepEmp}</div>
            </div>
        </body></html>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    });
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value,
        emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "غير محدد",
        id: document.getElementById('orderID').value || "---",
        trackingID: document.getElementById('trackingID').value || "",
        price: document.getElementById('orderPrice').value || "0",
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: today,
        time: new Date().toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})
    };
    if (editKey) {
        db.ref('orders/' + editKey).update(data).then(() => { alert("تم التحديث"); resetForm(); });
    } else {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ"); resetForm(); });
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', snap => {
        const o = snap.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.querySelector('.main-save').innerText = "تحديث البيانات 📝";
        window.scrollTo(0,0);
    });
}
function resetForm() { editKey = null; location.reload(); }
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
