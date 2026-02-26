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
let archiveMode = false;

if (currentUser) { showApp(); }

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const users = {"عمر":"111", "مريم":"222", "إبراهيم":"6410"};
    if(users[u] === p) { localStorage.setItem('loggedUser', u); location.reload(); }
    else alert("خطأ في الدخول");
}

function logout() { localStorage.clear(); location.reload(); }

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appBody').style.display = 'block';
    document.getElementById('userWelcome').innerText = "الموظف: " + currentUser;
    loadData();
}

// استخراج البيانات - نسخة محسنة لنص سلة المتداخل
function processSmartPaste() {
    const raw = document.getElementById('smartInput').value;
    if(!raw) return;

    // تنظيف النص وتجزئته
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l !== "");

    // 1. استخراج الاسم (السطر الذي يلي كلمة العميل)
    let customerIndex = lines.indexOf("العميل");
    if(customerIndex !== -1 && lines[customerIndex+1]) {
        document.getElementById('custName').value = lines[customerIndex+1];
    }

    // 2. استخراج رقم الطلب
    const idMatch = raw.match(/#(\d+)/) || raw.match(/(\d{9})/);
    if(idMatch) document.getElementById('orderID').value = idMatch[1];

    // 3. استخراج السعر
    const priceMatch = raw.match(/(\d+)\s*SAR/);
    if(priceMatch) document.getElementById('orderPrice').value = priceMatch[1];

    // 4. استخراج البوليصة (رقم الشحنة)
    const trackMatch = raw.match(/برقم شحنة\s*(\d+)/) || raw.match(/Tracking Number\s*(\d+)/);
    if(trackMatch) document.getElementById('trackingID').value = trackMatch[1];

    alert("تم الاستخراج بنجاح ✅");
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value,
        id: document.getElementById('orderID').value,
        trackingID: document.getElementById('trackingID').value,
        price: document.getElementById('orderPrice').value,
        emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "لم يحدد",
        branch: document.getElementById('branchName').value,
        dateKey: today,
        time: new Date().toLocaleTimeString('ar-SA'),
        type: "سلة" 
    };

    if(!data.name) return alert("يرجى إدخال الاسم!");

    db.ref('orders').push(data).then(() => {
        alert("تم الحفظ ✅");
        ["custName","orderID","trackingID","orderPrice","prepEmp","smartInput"].forEach(id => {
            document.getElementById(id).value = "";
        });
    });
}

function loadData() {
    db.ref('orders').on('value', snap => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let count = 0; let total = 0;

        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === today) { count++; total += parseFloat(o.price || 0); }

            const card = `
                <div class="order-card" data-search="${o.name} ${o.id} ${o.trackingID}">
                    <div class="card-top">📅 التاريخ: ${o.dateKey} | 🕒 ${o.time || ''}</div>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-info">
                        رقم الطلب: ${o.id} <br>
                        البوليصة: ${o.trackingID || 'قيد الانتظار'} <br>
                        المبلغ: ${o.price} ريال | الفرع: ${o.branch}
                    </div>
                    <button onclick="deleteOrder('${child.key}')" style="background:none; border:none; color:red; cursor:pointer; margin-top:10px;">🗑️ حذف</button>
                </div>`;

            // منطق الأرشيف والظهور
            if (archiveMode || o.dateKey === today) {
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        document.getElementById('countToday').innerText = count;
        document.getElementById('sumToday').innerText = total;
    });
}

function toggleArchive() {
    archiveMode = !archiveMode;
    const btn = document.getElementById('archiveBtn');
    btn.innerText = archiveMode ? "📂 إخفاء الأرشيف" : "📂 إظهار الأرشيف";
    btn.style.background = archiveMode ? "#d4af37" : "#1a1a1a";
    loadData();
}

function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.order-card');
    cards.forEach(c => {
        const text = c.getAttribute('data-search').toLowerCase();
        c.style.display = text.includes(term) ? "block" : "none";
    });
}

function deleteOrder(key) {
    if(confirm("هل تريد الحذف؟")) db.ref('orders/'+key).remove();
}
