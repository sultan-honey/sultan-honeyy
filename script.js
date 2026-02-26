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

if (currentUser) showApp();

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const users = {"عمر":"111", "مريم":"222", "إبراهيم":"6410"};
    if(users[u] === p) { localStorage.setItem('loggedUser', u); location.reload(); }
    else alert("بيانات خاطئة");
}

function logout() { localStorage.clear(); location.reload(); }

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appBody').style.display = 'block';
    document.getElementById('userWelcome').innerText = "الموظف: " + currentUser;
    loadData();
}

// استخراج البيانات - نسخة مطورة جداً
function processSmartPaste() {
    let raw = document.getElementById('smartInput').value;
    if(!raw) return;

    // تنظيف النص من المسافات الزائدة جداً والأسطر الفارغة
    let cleanText = raw.replace(/\n\s*\n/g, '\n').trim();

    // 1. استخراج اسم العميل (السطر الذي يلي كلمة 'العميل')
    let nameMatch = "";
    let lines = cleanText.split('\n').map(l => l.trim());
    let customerIndex = lines.findIndex(l => l === "العميل");
    if(customerIndex !== -1 && lines[customerIndex+1]) {
        nameMatch = lines[customerIndex+1];
    }
    document.getElementById('custName').value = nameMatch;

    // 2. استخراج رقم الطلب (بعد علامة #)
    let idMatch = cleanText.match(/#(\d+)/);
    if(idMatch) document.getElementById('orderID').value = idMatch[1];

    // 3. استخراج الإجمالي (قبل كلمة SAR)
    let priceMatch = cleanText.match(/إجمالي الطلب[\s\S]*?(\d+)\s*SAR/);
    if(priceMatch) document.getElementById('orderPrice').value = priceMatch[1];

    // 4. استخراج البوليصة (رقم الشحنة)
    let trackMatch = cleanText.match(/رقم شحنة\s*(\d+)/) || cleanText.match(/Number\s*(\d+)/);
    if(trackMatch) document.getElementById('trackingID').value = trackMatch[1];

    document.getElementById('orderType').value = "سلة";
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value,
        id: document.getElementById('orderID').value,
        trackingID: document.getElementById('trackingID').value,
        price: document.getElementById('orderPrice').value,
        emp: currentUser,
        prepEmp: document.getElementById('prepEmp').value || "غير محدد",
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: today,
        timestamp: Date.now()
    };

    if(!data.name) return alert("الاسم مفقود!");
    
    db.ref('orders').push(data).then(() => {
        alert("تم الحفظ ✅");
        document.getElementById('smartInput').value = "";
        clearFields();
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

            const cardHtml = `
                <div class="order-card" data-search="${o.name} ${o.id} ${o.trackingID}">
                    <div class="card-header-info">📅 ${o.dateKey} | 🕒 ${o.type}</div>
                    <strong>${o.name}</strong>
                    <div class="details">
                        رقم الطلب: ${o.id} | البوليصة: ${o.trackingID || 'لا يوجد'}<br>
                        بواسطة: ${o.emp} | التجهيز: ${o.prepEmp}<br>
                        المبلغ: ${o.price} ريال | ${o.branch}
                    </div>
                    <button onclick="deleteOrder('${child.key}')" style="background:none; border:none; color:red; cursor:pointer; float:left;">🗑️</button>
                </div>
            `;

            // في حالة البحث الشامل أو اليوم أو الأرشيف
            if (archiveMode || o.dateKey === today) {
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', cardHtml) : wList.insertAdjacentHTML('afterbegin', cardHtml);
            } else {
                // مخفي للبحث الشامل
                const hidden = cardHtml.replace('order-card"', 'order-card" style="display:none"');
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', hidden) : wList.insertAdjacentHTML('afterbegin', hidden);
            }
        });
        document.getElementById('countToday').innerText = count;
        document.getElementById('sumToday').innerText = total;
    });
}

// البحث الشامل في كل الطلبات (اليوم والأرشيف)
function filterOrders() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.order-card');
    cards.forEach(c => {
        const text = c.getAttribute('data-search').toLowerCase();
        c.style.display = text.includes(term) ? "block" : "none";
    });
}

function clearFields() {
    ["custName","orderID","trackingID","orderPrice","prepEmp"].forEach(id => document.getElementById(id).value = "");
}

function toggleArchive() { archiveMode = !archiveMode; loadData(); }
function deleteOrder(key) { if(confirm("حذف؟")) db.ref('orders/'+key).remove(); }

function printAllToday() {
    window.print(); // سيطبع المعروض حالياً في الصفحة بتنسيق المتصفح
}
