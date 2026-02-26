// الإعدادات
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

if (currentUser) { showApp(); }

// تسجيل الدخول والوظائف الأساسية
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
    document.getElementById('userWelcome').innerText = `مرحباً ${currentUser}`;
    loadData();
}

// استخراج البيانات الذكي المطور لنص سلة الجديد
function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;

    // 1. استخراج رقم الطلب
    const idMatch = text.match(/#(\d+)/) || text.match(/طلب رقم\s*(\d+)/);
    if (idMatch) document.getElementById('orderID').value = idMatch[1];

    // 2. استخراج السعر (الرقم قبل SAR)
    const priceMatch = text.match(/(\d+)\s*SAR/);
    if (priceMatch) document.getElementById('orderPrice').value = priceMatch[1];

    // 3. استخراج اسم العميل (النص بين "العميل" و "+966")
    const nameMatch = text.match(/العميل\s*\n\s*([\u0600-\u06FF\s]+)\n\s*\+/);
    if (nameMatch) document.getElementById('custName').value = nameMatch[1].trim();

    // 4. استخراج رقم البوليصة (من سجل الطلب أو Smsa)
    const trackMatch = text.match(/Tracking Number\s*(\d+)/) || text.match(/برقم شحنة\s*(\d+)/);
    if (trackMatch) document.getElementById('trackingID').value = trackMatch[1];

    document.getElementById('orderType').value = "سلة";
    alert("تم الاستخراج! تأكد من البيانات قبل الحفظ ✅");
}

// تحميل البيانات مع ميزة البحث الشامل وعرض التاريخ
function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let count = 0; let total = 0;

        snap.forEach(child => {
            const o = child.val();
            if (o.dateKey === today) { count++; total += parseFloat(o.price || 0); }

            // إنشاء الكرت مع وسم بيانات البحث الشامل
            const card = `
                <div class="order-card" id="${child.key}" data-search="${o.name} ${o.id} ${o.trackingID}">
                    <div class="card-tools" style="position:absolute; left:10px; top:10px;">
                        <button onclick="smartDelete('${child.key}')" style="border:none; background:none; cursor:pointer;">🗑️</button>
                        <button onclick="editOrder('${child.key}')" style="border:none; background:none; cursor:pointer;">📝</button>
                        <button onclick="printSingleOrder('${child.key}')" style="border:none; background:none; cursor:pointer;">⎙</button>
                    </div>
                    <span class="card-date">📅 ${o.dateKey} | 🕒 ${o.time || ''}</span>
                    <strong>👤 ${o.name}</strong>
                    <div class="card-details">
                        <span>🏷️ الموظف: ${o.emp}</span> | 👨‍🍳 تجهيز: ${o.prepEmp}<br>
                        <span>🔢 طلب: ${o.id}</span> | 💰 ${o.price} ر.س<br>
                        <span>📄 بوليصة: ${o.trackingID || '---'}</span>
                    </div>
                </div>`;

            // العرض الافتراضي (اليوم فقط إلا إذا تم تفعيل الأرشيف)
            if (archiveMode || o.dateKey === today) {
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            } else {
                // مخفي للبحث الشامل
                const hiddenCard = card.replace('class="order-card"', 'class="order-card" style="display:none"');
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', hiddenCard) : wList.insertAdjacentHTML('afterbegin', hiddenCard);
            }
        });
        document.getElementById('countToday').innerText = count;
        document.getElementById('sumToday').innerText = total;
    });
}

// ميزة البحث الشامل (تبحث في كل شيء وتكشف المطابق)
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.order-card').forEach(c => {
        const data = c.getAttribute('data-search').toLowerCase();
        if (term === "") {
            // العودة للوضع الافتراضي عند مسح البحث
            loadData(); 
        } else {
            c.style.display = data.includes(term) ? "block" : "none";
        }
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
    if(data.name) {
        db.ref('orders').push(data).then(() => { alert("تم الحفظ ✅"); resetForm(); });
    } else { alert("يرجى إدخال اسم العميل"); }
}

// طباعة كشف اليوم فقط
function printAllToday() {
    const salla = document.getElementById('sallaList').innerHTML;
    const whatsapp = document.getElementById('whatsappList').innerHTML;
    const win = window.open('', '', 'width=900,height=800');
    win.document.write(`
        <html dir="rtl">
        <head><style>
            body { font-family: Tahoma; padding: 20px; }
            .order-card { border: 2px solid #b48608; padding: 10px; margin-bottom: 10px; border-radius: 8px; page-break-inside: avoid; }
            .card-tools { display: none; }
            h1, h2 { text-align: center; color: #b48608; }
        </style></head>
        <body>
            <h1>📦 كشف طلبات يوم: ${today}</h1>
            <h2>🛒 طلبات سلة</h2> ${salla}
            <h2>💬 طلبات واتساب</h2> ${whatsapp}
        </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

function resetForm() {
    document.getElementById('custName').value = "";
    document.getElementById('orderID').value = "";
    document.getElementById('trackingID').value = "";
    document.getElementById('orderPrice').value = "";
}

function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function smartDelete(key) { if(confirm("حذف؟")) db.ref('orders/'+key).remove(); }
