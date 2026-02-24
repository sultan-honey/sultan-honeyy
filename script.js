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

// تحديث أسماء الحسابات: تم تغيير سلطان إلى إبراهيم
const users = {
    "عمر": "111",
    "مريم": "222",
    "إبراهيم": "6410" 
};

// --- نظام تسجيل الدخول ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] && users[user] === pass) {
        currentUser = user;
        // التحقق من صلاحية المسؤول للاسم الجديد "إبراهيم"
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appBody').style.display = 'block';
        document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
        
        if (userRole === "staff") {
            document.getElementById('printAllBtn').style.display = 'none';
            document.getElementById('archiveBtn').style.display = 'none';
        }
        loadData();
    } else {
        alert("اسم المستخدم أو كلمة السر غير صحيحة!");
    }
}

function logout() { location.reload(); }

// --- حفظ وتعديل الطلبات ---
function saveOrder() {
    const name = document.getElementById('custName').value;
    if (!name) return alert("فضلاً أدخل اسم العميل");
    const orderData = {
        name, 
        emp: currentUser,
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
        db.ref('orders/' + editKey).update(orderData).then(() => {
            alert("تم التحديث بنجاح ✅");
            resetForm();
        });
    } else {
        db.ref('orders').push(orderData).then(() => {
            alert("تم الحفظ بنجاح ✅");
            resetForm();
        });
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

            const priceHtml = o.price ? ` | 💰 ${o.price} ريال` : "";
            const trackingHtml = o.trackingID ? ` | 📄 بوليصة: ${o.trackingID}` : "";
            const canDelete = (userRole === "admin" || o.emp === currentUser);

            const card = `
                <div class="order-card" data-emp="${o.emp}">
                    ${canDelete ? `<button class="btn-delete" onclick="smartDelete('${child.key}', '${o.emp}')">✕</button>` : ""}
                    <button class="btn-print-single" style="left:75px" onclick="printSingleOrder(this)">⎙</button>
                    <button class="btn-edit" style="position:absolute; left:40px; top:12px; border:none; background:none; color:#007bff; font-size:20px; cursor:pointer;" onclick="editOrder('${child.key}')">📝</button>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | <span>👨‍🍳 تجهيز: ${o.prepEmp}</span><br>
                        <span>🔢 طلب: ${o.id}</span>${trackingHtml}<br>
                        <span>📍 ${o.branch}</span>${priceHtml}<br>
                        <span>📦 ${o.delivery}</span> | <span class="order-type-label">📑 النوع: ${o.type}</span>
                    </div>
                    <span class="date-badge">🕒 ${o.time} | 📅 ${o.dateKey}</span>
                </div>`;
            if (o.type === "سلة") sList.insertAdjacentHTML('afterbegin', card);
            else wList.insertAdjacentHTML('afterbegin', card);
        });
    });
}

// --- نظام الحذف بكلمة سر لكل موظف ---
function smartDelete(key, owner) {
    const userPass = users[currentUser]; 
    const promptMsg = (userRole === "admin") ? "أدخل كلمة سر المسؤول إبراهيم (6410):" : "أدخل كلمة السر الخاصة بك للحذف:";
    
    const inputPass = prompt(promptMsg);
    
    if (inputPass === userPass) {
        if(confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) {
            db.ref('orders/' + key).remove();
        }
    } else if (inputPass !== null) {
        alert("كلمة السر خاطئة!");
    }
}

// --- بقية الدوال (التعديل والطباعة) ---
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

const logoUrl = "1000031072.png";
function formatInvoice(name, details, dateTime) {
    const prepMatch = details.match(/تجهيز: (.*?)<\/span>/);
    const prepName = prepMatch ? prepMatch[1] : "غير محدد";
    return `<div style="border: 2px solid #b48608; padding: 25px; margin-bottom: 30px; border-radius: 15px; position: relative; min-height: 320px; page-break-inside: avoid; direction: rtl; font-family: Tahoma, sans-serif;">
            <div style="text-align: center; border-bottom: 2px solid #f1f1f1; margin-bottom: 15px; padding-bottom: 10px;">
                <img src="${logoUrl}" style="width: 100px;"><br>
                <h2 style="margin:5px 0; color: #b48608;">سلطان العسل</h2>
                <p style="font-size: 14px; margin: 0; color: #666;">نظام إدارة الطلبات - ${dateTime}</p>
            </div>
            <div style="font-size: 18px; line-height: 1.8; margin-bottom: 50px;">
                <b style="font-size: 22px; color: #333;">${name}</b><br>${details} 
            </div>
            <div style="position: absolute; bottom: 20px; right: 25px; font-weight: bold; border-top: 1px solid #eee; width: 90%; padding-top: 10px; font-size: 16px;">
                👨‍🍳 مسؤول التجهيز: <span style="color: #b48608;">${prepName}</span>
            </div></div>`;
}

function printSingleOrder(btn) {
    const card = btn.closest('.order-card');
    const name = card.querySelector('strong').innerText;
    const details = card.querySelector('.card-details').innerHTML;
    const dateTime = card.querySelector('.date-badge').innerText;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>طباعة فاتورة</title></head><body dir="rtl">');
    printWindow.document.write(formatInvoice(name, details, dateTime));
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function printMyOrders() { startPrint(currentUser); }
function printAllToday() { startPrint(null); }

function startPrint(filterEmp = null) {
    const cards = document.querySelectorAll('.order-card');
    let allInvoices = "";
    cards.forEach(card => {
        if (!filterEmp || card.getAttribute('data-emp') === filterEmp) {
            allInvoices += formatInvoice(card.querySelector('strong').innerText, card.querySelector('.card-details').innerHTML, card.querySelector('.date-badge').innerText);
        }
    });
    if (!allInvoices) return alert("لا توجد طلبات لطباعتها");
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>طباعة الفواتير</title></head><body dir="rtl" style="padding:20px;">');
    printWindow.document.write(allInvoices);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function toggleArchive() { archiveMode = !archiveMode; loadData(); }
