// إعدادات Firebase
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

// تعريف المستخدمين
const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };

// متغيرات النظام الأساسية
let currentUser = localStorage.getItem('loggedUser'); 
let userRole = localStorage.getItem('userRole');
let archiveMode = false;
let editKey = null;

// التحقق من حالة الدخول عند تحميل الصفحة
window.onload = () => {
    if (currentUser) {
        showApp();
    }
};

// --- وظائف الدخول والخروج ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] && users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('loggedUser', currentUser);
        localStorage.setItem('userRole', userRole);
        showApp();
    } else {
        alert("خطأ في اسم المستخدم أو كلمة المرور!");
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appBody').style.display = 'block';
    loadData();
}

// --- نظام الاستخراج الذكي ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الرجاء لصق النص أولاً");

    const idMatch = text.match(/(?:#|طلب رقم|الطلب)\s*(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:SAR|ريال|ر\.س)/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];

    const customerMatch = text.match(/(.+)\n\+966/) || text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) document.getElementById('custName').value = customerMatch[1].trim();

    const trackingMatch = text.match(/(?:رقم شحنة|بوليصة|تتبع)\s*[:#]?\s*(\d{10,15})/);
    if (trackingMatch) document.getElementById('trackingID').value = trackingMatch[1];

    document.getElementById('orderType').value = "سلة";
    alert("تم استخراج البيانات بنجاح ✅");
}

// --- إدارة البيانات (العرض والبحث) ---
function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        sList.innerHTML = ""; wList.innerHTML = "";
        let stats = { "عمر": 0, "مريم": 0, "إبراهيم": 0, "الكل": 0 };

        snap.forEach(child => {
            const o = child.val();

            // 1. حساب الإحصائيات (لليوم فقط)
            if (o.dateKey === today) {
                if (stats[o.emp] !== undefined) stats[o.emp]++;
                stats["الكل"]++;
            }

            // 2. منطق البحث الشامل (يبحث في الاسم، رقم الطلب، أو البوليصة)
            const isMatch = searchTerm !== "" && (
                o.name.toLowerCase().includes(searchTerm) || 
                o.id.toString().includes(searchTerm) || 
                (o.trackingID && o.trackingID.toString().includes(searchTerm))
            );

            // 3. شروط العرض
            if (isMatch || archiveMode || o.dateKey === today) {
                // الموظف يرى طلباته فقط
                if (userRole === "staff" && o.emp !== currentUser) return;

                const card = `
                    <div class="order-card" style="${isMatch ? 'border: 2px solid #2ed573; background:#f0fff4;' : ''}">
                        <button class="btn-edit" onclick="editOrder('${child.key}')">📝</button>
                        <strong>👤 ${o.name}</strong>
                        <div class="card-details">
                            <span>🏷️ الموظف: ${o.emp}</span>
                            <span>👨‍🍳 تجهيز: ${o.prepEmp}</span>
                            <span>🔢 طلب: ${o.id}</span>
                            <span>💰 ${o.price} ريال</span>
                            <span style="grid-column: span 2">📄 بوليصة: ${o.trackingID || '---'}</span>
                        </div>
                        <p style="font-size:10px; color:#aaa; margin-top:10px;">📅 ${o.dateKey} ${o.dateKey !== today ? '<b style="color:red"> (أرشيف)</b>' : ''}</p>
                    </div>`;

                if (o.type === "سلة") sList.insertAdjacentHTML('afterbegin', card);
                else wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    let html = "";
    if (userRole === "admin") {
        html = `
            <span class="stat-badge">📊 اليوم: ${s.الكل}</span>
            <span class="stat-badge">👨‍💻 عمر: ${s.عمر}</span>
            <span class="stat-badge">👩‍💻 مريم: ${s.مريم}</span>
            <span class="stat-badge">👑 إبراهيم: ${s.إبراهيم}</span>
        `;
    } else {
        html = `<span class="stat-badge">📈 طلباتك اليوم: ${s[currentUser] || 0}</span>`;
    }
    document.getElementById('userWelcome').innerHTML = `مرحباً ${currentUser} <div class="stats-bar">${html}</div>`;
}

// --- الحفظ والتعديل ---
function saveOrder() {
    const name = document.getElementById('custName').value;
    if (!name) return alert("يرجى إدخال اسم العميل");

    const orderData = {
        name,
        emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "لم يحدد",
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
        db.ref('orders/' + editKey).update(orderData).then(() => {
            alert("تم التحديث ✅");
            resetForm();
        });
    } else {
        db.ref('orders').push(orderData).then(() => {
            alert("تم الحفظ بنجاح ✅");
            resetForm();
        });
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', (snap) => {
        const o = snap.val();
        editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('prepEmp').value = o.prepEmp;
        document.getElementById('orderID').value = o.id;
        document.getElementById('trackingID').value = o.trackingID;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('branchName').value = o.branch;
        document.getElementById('deliveryType').value = o.delivery;
        document.getElementById('orderType').value = o.type;
        document.querySelector('.btn-primary').innerText = "تحديث البيانات 📝";
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}

function resetForm() {
    editKey = null;
    document.querySelector('.btn-primary').innerText = "حفظ الطلب ✅";
    const inputs = ["custName", "prepEmp", "orderID", "trackingID", "orderPrice"];
    inputs.forEach(id => document.getElementById(id).value = "");
}

function toggleArchive() {
    archiveMode = !archiveMode;
    document.getElementById('archiveBtn').innerText = archiveMode ? "🔙 العودة لليوم" : "📂 سجل الأرشيف";
    loadData();
}

// --- نظام الطباعة ---
function printMyOrders() { startPrint(currentUser); }
function printAllToday() { startPrint(null); }

function startPrint(filter) {
    const cards = document.querySelectorAll('.order-card');
    let html = `<h2 style="text-align:center">كشف طلبات سلطان العسل - ${today}</h2>`;
    let count = 0;

    cards.forEach(c => {
        // طباعة المظهر حالياً فقط (بناءً على الفلتر)
        if (c.style.display !== "none") {
            if (!filter || c.innerHTML.includes(`🏷️ الموظف: ${filter}`)) {
                html += `<div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; direction:rtl;">${c.innerHTML}</div>`;
                count++;
            }
        }
    });

    if (count === 0) return alert("لا توجد طلبات للطباعة");
    const win = window.open('', '', 'height=600,width=800');
    win.document.write(`<html><body dir="rtl">${html}</body></html>`);
    win.document.close();
    win.print();
}
