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

let currentUser = null;
let userRole = null; 
let archiveMode = false;
let editKey = null;

const users = {
    "عمر": "111",
    "مريم": "222",
    "إبراهيم": "6410"
};

// --- نظام الاستخراج الذكي ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة! الصق نص الطلب أولاً.");

    const idMatch = text.match(/(?:#|طلب رقم|الطلب)\s*(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    const priceMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:SAR|ريال|ر\.س)/g);
    if (priceMatches) {
        const lastPrice = priceMatches[priceMatches.length - 1].match(/(\d+(?:\.\d+)?)/);
        document.getElementById('orderPrice').value = lastPrice[0];
    }

    const customerMatch = text.match(/(.+)\n\+966/) || text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) document.getElementById('custName').value = customerMatch[1].trim();

    const trackingMatch = text.match(/(?:رقم شحنة|شحنة برقم|بوليصة|شحن|تتبع)\s*[:#]?\s*(\d{10,15})/);
    if (trackingMatch) document.getElementById('trackingID').value = trackingMatch[1];

    document.getElementById('orderType').value = "سلة";
    if (text.includes("شحن") || text.includes("أوتو") || text.includes("سمسا")) {
        document.getElementById('deliveryType').value = "شحن سمسا";
    }

    alert("تم الاستخراج بنجاح! ✅");
    document.getElementById('smartInput').value = ""; 
}

// --- تسجيل الدخول ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] && users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appBody').style.display = 'block';
        loadData();
    } else { alert("اسم المستخدم أو كلمة السر غير صحيحة!"); }
}

function logout() { location.reload(); }

// --- حفظ البيانات ---
function saveOrder() {
    const name = document.getElementById('custName').value;
    if (!name) return alert("يرجى إدخال اسم العميل");
    const orderData = {
        name, emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "لم يحدد",
        id: document.getElementById('orderID').value || "---",
        trackingID: document.getElementById('trackingID').value || "",
        price: document.getElementById('orderPrice').value || "",
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: today,
        time: new Date().toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})
    };
    if (editKey) {
        db.ref('orders/' + editKey).update(orderData).then(() => { alert("تم التحديث ✅"); resetForm(); });
    } else {
        db.ref('orders').push(orderData).then(() => { alert("تم الحفظ ✅"); resetForm(); });
    }
}

function resetForm() {
    editKey = null;
    document.querySelector('.btn-primary').innerText = "إضافة وحفظ الطلب ✅";
    ["custName", "prepEmp", "orderID", "trackingID", "orderPrice"].forEach(id => document.getElementById(id).value = "");
}

// --- عرض البيانات والبحث والعدادات (التحديث المطلوب) ---
function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";

        let stats = { "عمر": 0, "مريم": 0, "إبراهيم": 0, "إجمالي_اليوم": 0 };
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        snap.forEach(child => {
            const o = child.val();
            
            // 1. تحديث العدادات لطلبات اليوم فقط
            if (o.dateKey === today) {
                if (stats[o.emp] !== undefined) stats[o.emp]++;
                stats["إجمالي_اليوم"]++;
            }

            // 2. منطق البحث الشامل
            const isMatch = searchTerm !== "" && (
                o.name.toLowerCase().includes(searchTerm) || 
                o.id.toString().includes(searchTerm) || 
                o.trackingID.toString().includes(searchTerm)
            );

            // 3. تحديد شروط العرض
            const isToday = (o.dateKey === today);
            const isStaffView = (userRole === "staff" && o.emp === currentUser);
            const isAdminView = (userRole === "admin");

            // يظهر الطلب إذا: (طابق البحث) أو (في الأرشيف والوضع مفعل) أو (طلب اليوم)
            if (isMatch || archiveMode || isToday) {
                // تصفية إضافية للموظفين لخصوصية الطلبات
                if (userRole === "staff" && o.emp !== currentUser) return;

                const card = `
                    <div class="order-card" style="${isMatch ? 'border: 2px solid #28a745;' : ''}">
                        ${(isAdminView || isStaffView) ? `<button class="btn-delete" onclick="smartDelete('${child.key}')">✕</button>` : ""}
                        <button class="btn-print-single" style="left:75px" onclick="printSingleOrder(this)">⎙</button>
                        <button class="btn-edit" style="position:absolute; left:40px; top:12px; border:none; background:none; color:#007bff; cursor:pointer;" onclick="editOrder('${child.key}')">📝</button>
                        <strong>👤 ${o.name}</strong>
                        <div class="card-details">
                            <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                            <span>🔢 طلب: ${o.id}</span> | 📄 بوليصة: ${o.trackingID}<br>
                            <span>📍 ${o.branch}</span> | 💰 ${o.price} ريال<br>
                            <span>📦 ${o.delivery}</span> | 📑 ${o.type}
                        </div>
                        <span class="date-badge">🕒 ${o.time} | 📅 ${o.dateKey} ${!isToday ? '<b style="color:red"> (أرشيف)</b>' : ''}</span>
                    </div>`;
                
                if (o.type === "سلة") sList.insertAdjacentHTML('afterbegin', card);
                else wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(stats) {
    let html = `مرحباً ${currentUser} <br> <div style="display:flex; gap:10px; justify-content:center; margin-top:10px; flex-wrap:wrap;">`;
    if (userRole === "admin") {
        html += `<span class="stat-badge">📊 اليوم: ${stats["إجمالي_اليوم"]}</span>`;
        html += `<span class="stat-badge">👨‍💻 عمر: ${stats["عمر"]}</span>`;
        html += `<span class="stat-badge">👩‍💻 مريم: ${stats["مريم"]}</span>`;
    } else {
        html += `<span class="stat-badge">📈 طلباتك اليوم: ${stats[currentUser]}</span>`;
    }
    html += `</div>`;
    document.getElementById('userWelcome').innerHTML = html;
}

function smartDelete(key) {
    const pass = prompt("أدخل كلمة السر للحذف:");
    if (pass === users[currentUser]) {
        if(confirm("حذف نهائي؟")) db.ref('orders/' + key).remove();
    } else { alert("كلمة سر خاطئة!"); }
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
        document.querySelector('.btn-primary').innerText = "تحديث البيانات الآن 📝";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// --- نظام الطباعة ---
const logoUrl = "1000031072.png";
function formatInvoice(name, details, dateTime) {
    return `<div style="border: 2px solid #b48608; padding: 20px; margin-bottom: 20px; border-radius: 10px; direction: rtl; font-family: Tahoma;">
            <div style="text-align: center;"><img src="${logoUrl}" style="width: 80px;"><h3>سلطان العسل</h3></div>
            <b>العميل: ${name}</b><br>${details}<br><small>${dateTime}</small></div>`;
}

function printSingleOrder(btn) {
    const card = btn.closest('.order-card');
    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><body dir="rtl">' + formatInvoice(card.querySelector('strong').innerText, card.querySelector('.card-details').innerHTML, card.querySelector('.date-badge').innerText) + '</body></html>');
    win.document.close(); win.print();
}

function printMyOrders() { startPrint(currentUser); }
function printAllToday() { startPrint(null); }
function startPrint(filter) {
    const cards = document.querySelectorAll('.order-card');
    let html = "";
    cards.forEach(c => {
        if (c.style.display !== "none" && (!filter || c.querySelector('.card-details').innerText.includes(filter))) {
            html += formatInvoice(c.querySelector('strong').innerText, c.querySelector('.card-details').innerHTML, c.querySelector('.date-badge').innerText);
        }
    });
    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><body dir="rtl">' + html + '</body></html>');
    win.document.close(); win.print();
}

function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function filterOrders() { loadData(); } // استدعاء loadData عند البحث لضمان البحث في الأرشيف
