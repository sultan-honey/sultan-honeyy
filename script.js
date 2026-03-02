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
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        location.reload();
    } else { alert("خطأ في بيانات الدخول"); }
}

function logout() { localStorage.clear(); location.reload(); }

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
    loadData(); 
}

// --- دالة استخراج البيانات الذكية المطورة ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة! الصق نص الطلب أولاً.");

    // 1. استخراج اسم العميل (أدق محاولة)
    // يبحث عن الاسم الذي يأتي مباشرة بعد كلمة "العميل" في السطر التالي
    const customerMatch = text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) {
        document.getElementById('custName').value = customerMatch[1].trim();
    }

    // 2. استخراج رقم الطلب
    // يبحث عن رقم الطلب بعد كلمة "طلب #"
    const idMatch = text.match(/طلب\s*#(\d{7,15})/);
    if (idMatch) {
        document.getElementById('orderID').value = idMatch[1];
    }

    // 3. استخراج السعر الإجمالي
    // يبحث عن الرقم الذي يسبق كلمة SAR في سطر "إجمالي الطلب"
    const priceMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*(\d+(?:\.\d+)?)\s*SAR/);
    if (priceMatch) {
        document.getElementById('orderPrice').value = priceMatch[1];
    }

    // 4. استخراج رقم البوليصة / الشحنة (من سجل الطلب)
    // يبحث عن الرقم المكون من 12 رقم بعد كلمة "شحنة برقم" أو "بوليصة"
    const trackingMatch = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{12})/);
    if (trackingMatch) {
        document.getElementById('trackingID').value = trackingMatch[1];
    }

    // 5. ضبط النوع والفرع تلقائياً
    document.getElementById('orderType').value = "سلة";
    if (text.includes("سمسا") || text.includes("أوتو")) {
        document.getElementById('deliveryType').value = "شحن سمسا";
    }

    alert("تم استخراج البيانات بنجاح ✅\nالعميل: " + document.getElementById('custName').value);
    document.getElementById('smartInput').value = ""; // تفريغ الخانة
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        snap.forEach(child => {
            const o = child.val();
            if (userRole === "staff" && o.emp !== currentUser) return;
            if (!archiveMode && o.dateKey !== today) return;

            const card = `
                <div class="order-card" id="${child.key}">
                    <div class="card-tools" style="position:absolute; left:10px; top:10px;">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <small>📅 ${o.dateKey}</small><br>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                        <span>🔢 طلب: ${o.id}</span> | 💰 ${o.price} ر.س<br>
                        <span>📄 بوليصة: ${o.trackingID || '---'}</span>
                    </div>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });
    });
}

function printAllToday() {
    db.ref('orders').once('value', snap => {
        let content = `<h2 style="text-align:center;">كشف طلبات اليوم: ${today}</h2>`;
        snap.forEach(child => {
            const o = child.val();
            if(o.dateKey === today) {
                content += `<div style="border-bottom:1px solid #ccc; padding:10px; direction:rtl;">
                    <b>الاسم:</b> ${o.name} | <b>الطلب:</b> ${o.id} | <b>السعر:</b> ${o.price} ر.س | <b>الموظف:</b> ${o.emp}
                </div>`;
            }
        });
        const win = window.open('', '', 'width=900,height=800');
        win.document.write(`<div dir="rtl" style="font-family:Tahoma;">${content}</div>`);
        win.document.close();
        setTimeout(() => { win.print(); win.close(); }, 500);
    });
}

function printSingleOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val();
        const win = window.open('', '', 'width=800,height=700');
        win.document.write(`
            <body dir="rtl" style="font-family:Tahoma; padding:40px; display:flex; justify-content:center;">
                <div style="width:500px; border:12px double #b48608; padding:30px; border-radius:15px; text-align:center;">
                    <h2 style="color:#b48608;">سلطان العسل - فاتورة</h2>
                    <hr>
                    <div style="text-align:right; font-size:18px; line-height:2.2;">
                        <b>العميل:</b> ${o.name}<br>
                        <b>رقم الطلب:</b> ${o.id}<br>
                        <b>الإجمالي:</b> ${o.price} ريال<br>
                        <b>البوليصة:</b> ${o.trackingID || '---'}<br>
                        <b>التاريخ:</b> ${o.dateKey}
                    </div>
                </div>
            </body>`);
        win.document.close(); win.print();
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
        document.getElementById('prepEmp').value = o.prepEmp;
        document.getElementById('trackingID').value = o.trackingID; // حقل البوليصة
        document.getElementById('saveBtn').innerText = "تحديث الطلب الآن 🔄";
        window.scrollTo(0,0);
    });
}

function smartDelete(key) { if (confirm("حذف الطلب؟")) db.ref('orders/' + key).remove(); }
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function resetForm() { editKey = null; location.reload(); }
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(term) ? "block" : "none";
    });
}
