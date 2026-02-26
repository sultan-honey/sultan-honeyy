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
let archiveMode = false;
let editKey = null;

if (currentUser) { showApp(); }

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        localStorage.setItem('loggedUser', user);
        location.reload();
    } else { alert("خطأ في البيانات"); }
}

function logout() { localStorage.clear(); location.reload(); }

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `الموظف: ${currentUser}`;
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;

    const idMatch = text.match(/#(\d+)/) || text.match(/الطلب\s*(\d+)/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    const priceMatch = text.match(/إجمالي الطلب[\s\S]*?(\d+)\s*SAR/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    const customerIdx = lines.indexOf("العميل");
    if (customerIdx !== -1 && lines[customerIdx + 1]) {
        document.getElementById('custName').value = lines[customerIdx + 1];
    }

    const trackMatch = text.match(/برقم شحنة\s*(\d+)/) || text.match(/Tracking Number\s*(\d+)/);
    if (trackMatch) document.getElementById('trackingID').value = trackMatch[1];
    
    document.getElementById('orderType').value = "سلة";
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        snap.forEach(child => {
            const o = child.val();
            
            // شرط العرض: إذا كان وضع الأرشيف مفعل، اعرض الكل، وإلا اعرض اليوم فقط
            if (!archiveMode && o.dateKey !== today) return;

            const card = `
                <div class="order-card" id="${child.key}">
                    <div class="card-tools">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <small style="color:var(--gold)">📅 ${o.dateKey}</small><br>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🔢 طلب: ${o.id}</span> | 💰 ${o.price} ر.س<br>
                        <span>📄 بوليصة: ${o.trackingID || '---'}</span><br>
                        <span>🏷️ الموظف: ${o.emp} | 👨‍🍳 تجهيز: ${o.prepEmp}</span>
                    </div>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });
    });
}

function toggleArchive() {
    archiveMode = !archiveMode;
    const btn = document.getElementById('archiveBtn');
    btn.innerText = archiveMode ? "📂 إخفاء الأرشيف" : "📂 إظهار الأرشيف";
    btn.className = archiveMode ? "btn-gold" : "btn-gray";
    loadData();
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
        time: new Date().toLocaleTimeString('ar-SA')
    };

    if (editKey) {
        db.ref('orders/' + editKey).update(data).then(() => { alert("تم التحديث ✅"); resetForm(); });
    } else {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ ✅"); resetForm(); });
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('trackingID').value = o.trackingID || "";
        document.getElementById('prepEmp').value = o.prepEmp;
        window.scrollTo(0,0);
        document.getElementById('saveBtn').innerText = "تحديث الطلب الآن 🔄";
    });
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        const win = window.open('', '', 'width=800,height=600');
        win.document.write(`
            <body dir="rtl" style="font-family:Tahoma; padding:30px;">
                <div style="border:10px double #b48608; padding:20px; text-align:center; border-radius:15px;">
                    <h2 style="color:#b48608;">سلطان العسل - فاتورة تجهيز</h2>
                    <hr>
                    <p><b>التاريخ:</b> ${o.dateKey}</p>
                    <p><b>العميل:</b> ${o.name}</p>
                    <p><b>رقم الطلب:</b> ${o.id}</p>
                    <p><b>الإجمالي:</b> ${o.price} ر.س</p>
                    <p><b>البوليصة:</b> ${o.trackingID || '---'}</p>
                    <p><b>الموظف:</b> ${o.emp}</p>
                </div>
            </body>`);
        win.document.close(); win.print();
    });
}

function printAllToday() {
    db.ref('orders').once('value', snap => {
        let content = `<h2 style="text-align:center;">كشف طلبات اليوم: ${today}</h2>`;
        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === today) {
                content += `<div style="border-bottom:1px solid #ccc; padding:10px;">
                    <b>الاسم:</b> ${o.name} | <b>الطلب:</b> ${o.id} | <b>السعر:</b> ${o.price} ر.س | <b>البوليصة:</b> ${o.trackingID}
                </div>`;
            }
        });
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<div dir="rtl" style="font-family:Tahoma;">${content}</div>`);
        win.document.close(); win.print();
    });
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(term) ? "block" : "none";
    });
}

function smartDelete(key) { if (confirm("حذف؟")) db.ref('orders/' + key).remove(); }
function resetForm() { editKey = null; location.reload(); }
