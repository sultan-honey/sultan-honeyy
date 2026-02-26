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
let archiveMode = false;
let editKey = null;

const users = { "عمر": "111", "مريم": "222", "إبراهيم": "6410" };

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
    } else { alert("خطأ في بيانات الدخول"); }
}

function logout() { localStorage.clear(); location.reload(); }

function showApp() { 
    document.getElementById('loginScreen').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
    loadData(); 
}

// --- نظام الاستخراج الذكي المحدث ---
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return alert("الخانة فارغة!");

    // 1. استخراج السعر الإجمالي (يبحث عن الرقم بعد كلمة إجمالي الطلب)
    const priceMatch = text.match(/إجمالي الطلب\s*[\n\r]*\s*.*?\s*(\d+(?:\.\d+)?)/);
    if (priceMatch) {
        document.getElementById('orderPrice').value = priceMatch[1];
    } else {
        const prices = text.match(/(\d+(?:\.\d+)?)\s*(?:SAR|ريال|ر\.س)/g);
        if (prices) {
            const lastPrice = prices[prices.length - 1].match(/\d+/);
            document.getElementById('orderPrice').value = lastPrice;
        }
    }

    // 2. استخراج اسم العميل بدقة وتجاهل الكلمات المتصلة (الرئيسية/المنتجات)
    const nameMatch = text.match(/منذ \d+ ساعات?\s*([\u0600-\u06FF\s]+)/) || 
                     text.match(/(?:العميل)\s*[\n\r]*\s*.*?\s*([\u0600-\u06FF\s]+)/) ||
                     text.match(/(.+)\n\+966/);
    if (nameMatch) {
        let cleanName = nameMatch[1].replace(/الرئيسية|المنتجات|الطلبات|العملاء|سلة/g, "").trim();
        document.getElementById('custName').value = cleanName;
    }

    // 3. استخراج رقم الطلب
    const idMatch = text.match(/(?:#|طلب رقم|الطلب)\s*(\d{7,15})/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    // 4. استخراج رقم البوليصة
    const trackingMatch = text.match(/(?:رقم شحنة|بوليصة|تتبع|KGAC)\s*[:#]?\s*([A-Z0-9]+)/);
    if (trackingMatch) document.getElementById('trackingID').value = trackingMatch[1];

    document.getElementById('orderType').value = "سلة";
    alert("تم الاستخراج ✅");
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
                <div class="order-card" data-emp="${o.emp}">
                    <div class="card-tools" style="position:absolute; left:10px; top:10px; display:flex; gap:5px;">
                        <button onclick="smartDelete('${child.key}')" style="border:none; background:none; cursor:pointer;">🗑️</button>
                        <button onclick="editOrder('${child.key}')" style="border:none; background:none; cursor:pointer;">📝</button>
                        <button onclick="printSingleOrder(this)" style="border:none; background:none; cursor:pointer;">⎙</button>
                    </div>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                        <span>🔢 طلب: ${o.id}</span> | 💰 ${o.price} ريال<br>
                        <span>📄 بوليصة: ${o.trackingID || '---'}</span><br>
                        <span>📦 ${o.delivery}</span> | <span class="order-type-label">📑 ${o.type}</span>
                    </div>
                    <span class="date-badge" style="font-size:10px; color:#999;">🕒 ${o.time} | 📅 ${o.dateKey}</span>
                </div>`;
            o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
        });
    });
}

// --- تحسين نظام الطباعة لإظهار النوع ---
const logoUrl = "1000031072.png";
function formatInvoice(name, details, dateTime) {
    // جلب نوع الطلب من التفاصيل الممررة
    const typeMatch = details.match(/📑 (.*?)<\/span>/) || details.match(/📑 (.*?)$/);
    const orderType = typeMatch ? typeMatch[1] : "غير محدد";

    return `<div style="border: 10px double #b48608; padding: 25px; margin-bottom: 20px; border-radius: 15px; direction: rtl; font-family: Tahoma, sans-serif;">
            <div style="text-align: center; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px; padding-bottom: 10px;">
                <img src="${logoUrl}" style="width: 100px;"><br>
                <h2 style="margin:5px 0; color: #b48608;">سلطان العسل</h2>
                <p style="font-size: 14px; margin: 0;">${dateTime}</p>
            </div>
            <div style="font-size: 19px; line-height: 2;">
                <b>العميل: ${name}</b><br>
                <div style="background:#fff9e6; padding:5px; border-radius:5px; display:inline-block; color:#b48608; font-weight:bold;">نوع الطلب: ${orderType}</div><br>
                ${details.replace(/<button.*?<\/button>/g, '')} 
            </div>
            </div>`;
}

function printSingleOrder(btn) {
    const card = btn.closest('.order-card');
    const name = card.querySelector('strong').innerText;
    const details = card.querySelector('.card-details').innerHTML;
    const dateTime = card.querySelector('.date-badge').innerText;
    const win = window.open('', '', 'height=700,width=800');
    win.document.write('<html><body dir="rtl">' + formatInvoice(name, details, dateTime) + '</body></html>');
    win.document.close(); win.print();
}

function printAllToday() {
    const cards = document.querySelectorAll('.order-card');
    let html = "";
    cards.forEach(c => {
        if (c.style.display !== "none") {
            html += formatInvoice(c.querySelector('strong').innerText, c.querySelector('.card-details').innerHTML, c.querySelector('.date-badge').innerText);
        }
    });
    const win = window.open('', '', 'height=800,width=1000');
    win.document.write('<html><body dir="rtl" style="padding:20px;">' + html + '</body></html>');
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

function smartDelete(key) {
    if (confirm("حذف الطلب نهائياً؟")) db.ref('orders/' + key).remove();
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', snap => {
        const o = snap.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.querySelector('.btn-primary').innerText = "تحديث البيانات 📝";
        window.scrollTo(0,0);
    });
}

function resetForm() { editKey = null; location.reload(); }
function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.order-card');
    cards.forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(term) ? "block" : "none";
    });
}
