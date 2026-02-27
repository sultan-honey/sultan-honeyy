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
    } else { alert("عذراً، كلمة المرور أو الاسم خطأ"); }
}

function logout() { localStorage.clear(); location.reload(); }
function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    loadData(); 
}

// --- استخراج السعر والبيانات بدقة ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة!");

    // استخراج السعر الإجمالي (يبحث عن الرقم بعد إجمالي الطلب)
    const priceMatch = text.match(/إجمالي الطلب\s*[\n\r]*\s*.*?\s*(\d+(?:\.\d+)?)/);
    if (priceMatch) {
        document.getElementById('orderPrice').value = priceMatch[1];
    } else {
        // محاولة بديلة إذا لم يجد كلمة إجمالي الطلب
        const prices = text.match(/(\d+(?:\.\d+)?)\s*(?:SAR|ريال|ر\.س)/g);
        if (prices) {
            const lastPrice = prices[prices.length - 1].match(/\d+/);
            document.getElementById('orderPrice').value = lastPrice;
        }
    }

    const idMatch = text.match(/(?:#|طلب رقم|الطلب)\s*(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    const customerMatch = text.match(/(?:العميل)\s*[\n\r]*\s*.*?\s*([\u0600-\u06FF\s]+)/);
    if (customerMatch) document.getElementById('custName').value = customerMatch[1].trim();

    document.getElementById('orderType').value = "سلة";
    alert("تم الاستخراج ✅ الإجمالي: " + document.getElementById('orderPrice').value);
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

            const isMatch = searchTerm !== "" && (o.name.toLowerCase().includes(searchTerm) || o.id.toString().includes(searchTerm));
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
                            <span>🏷️ الموظف: ${o.emp}</span> <span>👨‍🍳 تجهيز: ${o.prepEmp}</span>
                            <span>🔢 طلب: ${o.id}</span> <span>💰 ${o.price} ر.س</span>
                            <span style="grid-column: span 2">📄 بوليصة: ${o.trackingID || '---'}</span>
                        </div>
                    </div>`;
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    let html = userRole === "admin" ? 
        `<span class="st-badge">اليوم: ${s.الكل}</span> <span class="st-badge">عمر: ${s.عمر}</span> <span class="st-badge">مريم: ${s.مريم}</span>` :
        `<span class="st-badge">طلباتك اليوم: ${s[currentUser] || 0}</span>`;
    document.getElementById('userWelcome').innerHTML = `<div class="stats-row">${html}</div>`;
}

function deleteOrder(key) {
    const pass = prompt("أدخل كلمة مرورك للحذف:");
    if (pass === users[currentUser]) {
        if(confirm("حذف الطلب؟")) db.ref('orders/' + key).remove();
    } else { alert("كلمة المرور خطأ!"); }
}

function printSingle(key) {
    db.ref('orders/' + key).once('value', (snap) => {
        const o = snap.val();
        const win = window.open('', '', 'height=700,width=800');
        win.document.write(`<html><head><style>
            body { direction: rtl; font-family: 'Tahoma', sans-serif; padding: 40px; display: flex; justify-content: center; }
            .frame { width: 500px; border: 15px double #b48608; padding: 30px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #eee; margin-bottom: 20px; }
            .header img { width: 80px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 18px; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
        </style></head><body>
            <div class="frame">
                <div class="header"><img src="1000031072.png"><h2>سلطان العسل</h2><p>${o.dateKey}</p></div>
                <div class="row"><span>رقم الطلب:</span> <b>${o.id}</b></div>
                <div class="row"><span>العميل:</span> <b>${o.name}</b></div>
                <div class="row"><span>إجمالي المبلغ:</span> <b>${o.price} ر.س</b></div>
                <div class="row"><span>الموظف:</span> <b>${o.emp}</b></div>
                <div style="margin-top:20px; text-align:center; color:#b48608; font-weight:bold;">تجهيز: ${o.prepEmp}</div>
            </div>
        </body></html>`);
        win.document.close(); win.print();
    });
}

function printAllToday() {
    const sCards = document.getElementById('sallaList').innerHTML;
    const wCards = document.getElementById('whatsappList').innerHTML;
    const win = window.open('', '', 'height=800,width=1000');
    win.document.write(`<html><head><style>
        body { direction: rtl; font-family: Tahoma; padding: 20px; }
        .order-card { border: 4px double #b48608; padding: 10px; margin: 10px; width: 45%; display: inline-block; vertical-align: top; border-radius: 10px; }
        .card-tools { display: none; } /* إخفاء الأزرار في الطباعة */
    </style></head><body>
        <h1 style="text-align:center;">كشف طلبات سلطان العسل - ${today}</h1>
        ${sCards} ${wCards}
    </body></html>`);
    win.document.close(); win.print();
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
        db.ref('orders/' + editKey).update(data).then(() => { alert("تم التحديث"); resetForm(); });
    } else {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ ✅"); resetForm(); });
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', snap => {
        const o = snap.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('mainBtn').innerText = "تحديث البيانات 📝";
        window.scrollTo(0,0);
    });
}
function resetForm() { editKey = null; location.reload(); }
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
