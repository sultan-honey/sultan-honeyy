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

// تعريف المستخدمين (المسؤول إبراهيم)
const users = {
    "عمر": "111",
    "مريم": "222",
    "إبراهيم": "6410"
};

// --- نظام الاستخراج الذكي المطور (يدعم رقم الشحنة) ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة! الصق نص الطلب أولاً.");

    // 1. استخراج رقم الطلب
    const idMatch = text.match(/(?:#|طلب رقم|الطلب)\s*(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    // 2. استخراج السعر الإجمالي (آخر سعر يظهر قبل العملة)
    const priceMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:SAR|ريال|ر\.س)/g);
    if (priceMatches) {
        const lastPrice = priceMatches[priceMatches.length - 1].match(/(\d+(?:\.\d+)?)/);
        document.getElementById('orderPrice').value = lastPrice[0];
    }

    // 3. استخراج اسم العميل
    const customerMatch = text.match(/(.+)\n\+966/) || text.match(/العميل\s*\n\s*(.+)/);
    if (customerMatch) {
        document.getElementById('custName').value = customerMatch[1].trim();
    }

    // 4. استخراج رقم البوليصة / الشحنة (تحديث خاص لنصوص سلة المعقدة)
    // يبحث عن "برقم شحنة" أو "رقم الشحنة" أو "بوليصة" ويجلب الرقم الطويل بجانبها
    const trackingMatch = text.match(/(?:رقم شحنة|شحنة برقم|بوليصة|شحن|تتبع)\s*[:#]?\s*(\d{10,15})/);
    if (trackingMatch) {
        document.getElementById('trackingID').value = trackingMatch[1];
    }

    // 5. ضبط النوع تلقائياً
    document.getElementById('orderType').value = "سلة";
    if (text.includes("شحن") || text.includes("أوتو") || text.includes("سمسا")) {
        document.getElementById('deliveryType').value = "شحن سمسا";
    }

    alert("تم الاستخراج بنجاح! ✅\nتأكد من البيانات ثم اضغط حفظ.");
    document.getElementById('smartInput').value = ""; 
}

// --- نظام البحث السريع ---
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.order-card');
    cards.forEach(card => {
        const content = card.innerText.toLowerCase();
        card.style.display = content.includes(term) ? "block" : "none";
    });
}

// --- نظام تسجيل الدخول ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] && users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appBody').style.display = 'block';
        document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
        if (userRole === "staff") {
            document.getElementById('printAllBtn').style.display = 'none';
            document.getElementById('archiveBtn').style.display = 'none';
        }
        loadData();
    } else { alert("اسم المستخدم أو كلمة السر غير صحيحة!"); }
}

function logout() { location.reload(); }

// --- حفظ وتعديل الطلبات ---
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

// --- عرض البيانات من قاعدة البيانات ---
function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        snap.forEach(child => {
            const o = child.val();
            if (userRole === "staff" && o.emp !== currentUser) return;
            if (!archiveMode && o.dateKey !== today) return;

            const canDelete = (userRole === "admin" || o.emp === currentUser);
            const card = `
                <div class="order-card" data-emp="${o.emp}">
                    ${canDelete ? `<button class="btn-delete" onclick="smartDelete('${child.key}', '${o.emp}')">✕</button>` : ""}
                    <button class="btn-print-single" style="left:75px" onclick="printSingleOrder(this)">⎙</button>
                    <button class="btn-edit" style="position:absolute; left:40px; top:12px; border:none; background:none; color:#007bff; cursor:pointer;" onclick="editOrder('${child.key}')">📝</button>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                        <span>🔢 طلب: ${o.id}</span> | 📄 بوليصة: ${o.trackingID}<br>
                        <span>📍 ${o.branch}</span> | 💰 ${o.price} ريال<br>
                        <span>📦 ${o.delivery}</span> | 📑 ${o.type}
                    </div>
                    <span class="date-badge">🕒 ${o.time} | 📅 ${o.dateKey}</span>
                </div>`;
            if (o.type === "سلة") sList.insertAdjacentHTML('afterbegin', card);
            else wList.insertAdjacentHTML('afterbegin', card);
        });
        filterOrders();
    });
}

// --- نظام الحذف بكلمة سر لكل موظف ---
function smartDelete(key, owner) {
    const userPass = users[currentUser];
    const pass = prompt("أدخل كلمة السر الخاصة بك لإتمام الحذف:");
    if (pass === userPass) {
        if(confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) db.ref('orders/' + key).remove();
    } else if (pass !== null) alert("كلمة سر خاطئة! لا يمكنك الحذف.");
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
    const prepMatch = details.match(/تجهيز: (.*?)<\/span>/) || details.match(/تجهيز: (.*?)<br>/);
    const prepName = prepMatch ? prepMatch[1] : "غير محدد";
    return `<div style="border: 2px solid #b48608; padding: 25px; margin-bottom: 30px; border-radius: 15px; direction: rtl; font-family: Tahoma, sans-serif;">
            <div style="text-align: center; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px; padding-bottom: 10px;">
                <img src="${logoUrl}" style="width: 100px;"><br>
                <h2 style="margin:5px 0; color: #b48608;">سلطان العسل</h2>
                <p style="font-size: 14px; margin: 0;">${dateTime}</p>
            </div>
            <div style="font-size: 18px; line-height: 1.8;">
                <b>العميل: ${name}</b><br>${details} 
            </div>
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
                👨‍🍳 مسؤول التجهيز: <b>${prepName}</b>
            </div></div>`;
}

function printSingleOrder(btn) {
    const card = btn.closest('.order-card');
    const name = card.querySelector('strong').innerText;
    const details = card.querySelector('.card-details').innerHTML;
    const dateTime = card.querySelector('.date-badge').innerText;
    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><body dir="rtl">' + formatInvoice(name, details, dateTime) + '</body></html>');
    win.document.close(); win.print();
}

function printMyOrders() { startPrint(currentUser); }
function printAllToday() { startPrint(null); }
function startPrint(filter) {
    const cards = document.querySelectorAll('.order-card');
    let html = "";
    cards.forEach(c => {
        if (c.style.display !== "none" && (!filter || c.getAttribute('data-emp') === filter)) {
            html += formatInvoice(c.querySelector('strong').innerText, c.querySelector('.card-details').innerHTML, c.querySelector('.date-badge').innerText);
        }
    });
    if (!html) return alert("لا يوجد طلبات لطباعتها");
    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><body dir="rtl" style="padding:20px;">' + html + '</body></html>');
    win.document.close(); win.print();
}
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
