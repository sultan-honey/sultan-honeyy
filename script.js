const firebaseConfig = {
    apiKey: "AIzaSyCcgQj8bk5Me1g80EHLY7heukjUvH_GSKs",
    authDomain: "sultan-honey.firebaseapp.com",
    databaseURL: "https://sultan-honey-default-rtdb.firebaseio.com",
    projectId: "sultan-honey",
    storageBucket: "sultan-honey.firebasestorage.app",
    messagingSenderId: "701835618498",
    appId: "1:701835618498:web:701e310cf1c2c0dad6b35b"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

let currentUser = localStorage.getItem('loggedUser');
let userRole = localStorage.getItem('userRole');
let editKey = null;

function getLocalTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

window.onload = function() { 
    if (currentUser) showApp(); 
};

function login() {
    const users = { "عمر": "111", "مريم": "222", "سلطان": "64100" };
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] === pass) {
        currentUser = user;
        userRole = (user === "سلطان") ? "admin" : "staff";
        localStorage.setItem('loggedUser', user);
        localStorage.setItem('userRole', userRole);
        showApp();
    } else { alert("البيانات غير صحيحة ❌"); }
}

function showApp() { 
    document.getElementById('loginPage').style.display = 'none'; 
    document.getElementById('appBody').style.display = 'block'; 
    document.getElementById('displayName').innerText = currentUser;
    
    const todayLocal = getLocalTodayDate();
    if (document.getElementById('calendarFilter')) document.getElementById('calendarFilter').value = todayLocal;
    
    // ضبط تواريخ التقارير الافتراضية لليوم
    if (document.getElementById('startDate')) document.getElementById('startDate').value = todayLocal;
    if (document.getElementById('endDate')) document.getElementById('endDate').value = todayLocal;
    
    loadData(); 
}

function processSmartPaste() {
    const text = document.getElementById('smartInput').value;
    if (!text) return;
    const n = text.match(/العميل\s*\n\s*(.+)/); if (n) document.getElementById('custName').value = n[1].trim();
    const id = text.match(/طلب\s*#(\d+)/); if (id) document.getElementById('orderID').value = id[1];
    const totalMatch = text.match(/إجمالي الطلب\s*[\n\r]*.*?\s*([\d,]+(?:\.\d+)?)\s*SAR/);
    if (totalMatch) {
        let cleanPrice = totalMatch[1].replace(/,/g, '');
        document.getElementById('orderPrice').value = cleanPrice;
    }
    const t = text.match(/(?:شحنة برقم|بوليصة)\s*(\d{10,15})/); if (t) document.getElementById('trackingID').value = t[1];
    document.getElementById('orderType').value = "سلة";
}

// الدالة السحرية للتقارير (من تاريخ - إلى تاريخ)
function generateCustomReport() {
    const branch = document.getElementById('reportBranch').value;
    const startRaw = document.getElementById('startDate').value; // YYYY-MM-DD
    const endRaw = document.getElementById('endDate').value; // YYYY-MM-DD
    
    if(!startRaw || !endRaw) return alert("يرجى تحديد تاريخ البداية والنهاية!");

    // تحويل التواريخ ليتمكن النظام من مقارنتها رياضياً
    const startDateObj = new Date(startRaw);
    startDateObj.setHours(0,0,0,0);
    const endDateObj = new Date(endRaw);
    endDateObj.setHours(23,59,59,999);

    if(startDateObj > endDateObj) return alert("❌ خطأ: تاريخ البداية يجب أن يكون قبل تاريخ النهاية!");

    const displayStart = startRaw.split('-').reverse().join('-');
    const displayEnd = endRaw.split('-').reverse().join('-');

    db.ref('orders').once('value', (snap) => {
        let reportHTML = `
        <div dir="rtl" style="font-family:Tahoma; padding:30px; border:2px solid #b48608;">
            <div style="text-align:center; margin-bottom:20px;">
                <h1 style="color:#b48608; margin:0;">سلطان العسل 🍯</h1>
                <h3 style="margin-top:10px;">تقرير المبيعات المخصص - ${branch}</h3>
                <p style="background:#eee; display:inline-block; padding:5px 15px; border-radius:50px;">من (${displayStart}) ⬅️ إلى (${displayEnd})</p>
            </div>
            <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="padding:10px;">التاريخ</th><th>العميل</th><th>رقم الطلب</th><th>الفرع</th><th>المبلغ</th>
                    </tr>
                </thead>
                <tbody>`;

        let total = 0; let count = 0;

        snap.forEach(child => {
            const o = child.val();
            if(!o.dateKey) return;

            // تحويل تاريخ الطلب الموجود في القاعدة إلى صيغة يمكن مقارنتها
            const orderDateParts = o.dateKey.split('-'); // DD-MM-YYYY
            const orderDateObj = new Date(`${orderDateParts[2]}-${orderDateParts[1]}-${orderDateParts[0]}`);
            orderDateObj.setHours(12,0,0,0);

            const matchesBranch = (branch === "الكل" || o.branch === branch);
            const isWithinDateRange = (orderDateObj >= startDateObj && orderDateObj <= endDateObj);

            if (matchesBranch && isWithinDateRange) {
                const price = parseFloat(String(o.price || "0").replace(/[^\d.-]/g, '')) || 0;
                reportHTML += `<tr><td style="padding:8px;">${o.dateKey}</td><td>${o.name}</td><td>${o.id}</td><td>${o.branch}</td><td style="color:#28a745; font-weight:bold;">${price.toLocaleString()} ر.س</td></tr>`;
                total += price; count++;
            }
        });

        reportHTML += `</tbody></table>
            <div style="margin-top:20px; font-weight:bold; font-size:18px; border-top:2px dashed #b48608; padding-top:15px; display:flex; justify-content:space-between;">
                <span>إجمالي عدد الطلبات: <span style="color:#007bff;">${count} طلب</span></span>
                <span>إجمالي المبالغ: <span style="color:#28a745;">${total.toLocaleString()} ريال</span></span>
            </div>
            <div style="margin-top:40px; text-align:left; font-size:12px; color:#777;">تم الاستخراج بواسطة: ${currentUser} | ${new Date().toLocaleString('ar-SA')}</div>
        </div>`;

        if (count === 0) return alert("لا توجد مبيعات في هذه الفترة للفرع المحدد!");

        const win = window.open('', '_blank');
        win.document.write(reportHTML);
        win.document.close();
        setTimeout(() => win.print(), 500);
    });
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        if (!sList || !wList) return;
        
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let stats = { 
            totalO: 0, totalS: 0, omarO: 0, omarS: 0, maryamO: 0, maryamS: 0, 
            smsaCount: 0, deliveryCount: 0, branchCount: 0 
        };
        
        const rawFilterDate = document.getElementById('calendarFilter').value;
        if (!rawFilterDate) return;
        
        const dateParts = rawFilterDate.split('-');
        const selectedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; 
        const searchKeyword = document.getElementById('searchInput').value.toLowerCase();

        snap.forEach(child => {
            const o = child.val();
            const isDateMatch = o.dateKey === selectedDate;
            const isSearchMatch = searchKeyword !== "" && (
                (o.name && o.name.toLowerCase().includes(searchKeyword)) || 
                (o.id && String(o.id).includes(searchKeyword)) ||
                (o.trackingID && String(o.trackingID).includes(searchKeyword))
            );

            let priceValue = parseFloat(String(o.price || "0").replace(/[^\d.-]/g, '')) || 0;

            if (isDateMatch) {
                stats.totalO++; stats.totalS += priceValue;
                if (o.emp === "عمر") { stats.omarO++; stats.omarS += priceValue; }
                if (o.emp === "مريم") { stats.maryamO++; stats.maryamS += priceValue; }
                
                if (o.delivery === "شحن سمسا") stats.smsaCount++;
                else if (o.delivery === "توصيل مندوب") stats.deliveryCount++;
                else if (o.delivery === "استلام من الفرع") stats.branchCount++;
            }

            let shouldShow = (searchKeyword !== "") ? isSearchMatch : isDateMatch;
            if (userRole === "staff" && o.emp !== currentUser) shouldShow = false;

            if (shouldShow) {
                const card = `
                <div class="order-card" data-user="${o.emp}">
                    <div class="card-tools">
                        <button onclick="smartDelete('${child.key}')">🗑️</button>
                        <button onclick="editOrder('${child.key}')">📝</button>
                        <button onclick="printSingleOrder('${child.key}')">⎙</button>
                    </div>
                    <strong>👤 ${o.name}</strong><br>
                    <span>🔢 طلب: ${o.id} | 💰 ${priceValue} ر.س</span><br>
                    <span>🏢 ${o.branch} | 🏷️ الموظف: ${o.emp}</span><br>
                    <span>👨‍🍳 المجهز: ${o.prepEmp || "---"}</span><br>
                    <span>📦 ${o.delivery} ${o.delivery !== 'توصيل مندوب' && o.delivery !== 'استلام من الفرع' ? `| 📄 بوليصة: ${o.trackingID || '---'}` : ''}</span>
                    <div style="font-size:10px; color:#999; margin-top:5px;">📅 التاريخ: ${o.dateKey}</div>
                </div>`;
                o.type === "سلة" ? sList.insertAdjacentHTML('afterbegin', card) : wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    if(document.getElementById('statTotalOrders')) document.getElementById('statTotalOrders').innerText = s.totalO;
    if(document.getElementById('statTotalSales')) document.getElementById('statTotalSales').innerText = s.totalS.toLocaleString() + " ريال";
    if(document.getElementById('statOmar')) document.getElementById('statOmar').innerText = `${s.omarO} طلب | ${s.omarS.toLocaleString()} ريال`;
    if(document.getElementById('statMaryam')) document.getElementById('statMaryam').innerText = `${s.maryamO} طلب | ${s.maryamS.toLocaleString()} ريال`;
    if(document.getElementById('statSmsaCount')) document.getElementById('statSmsaCount').innerText = s.smsaCount + " شحنة";
    if(document.getElementById('statDeliveryCount')) document.getElementById('statDeliveryCount').innerText = s.deliveryCount + " طلب";
    if(document.getElementById('statBranchCount')) document.getElementById('statBranchCount').innerText = s.branchCount + " استلام";

    const adminOnly = document.querySelectorAll('.admin-only');
    adminOnly.forEach(el => el.style.display = (userRole === 'admin') ? 'block' : 'none');
}

function saveOrder() {
    const data = {
        name: document.getElementById('custName').value,
        emp: currentUser,
        id: document.getElementById('orderID').value || "---",
        trackingID: document.getElementById('trackingID').value || "",
        price: document.getElementById('orderPrice').value || "0",
        prepEmp: document.getElementById('prepEmp').value || "---",
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: editKey ? null : getLocalTodayDate().split('-').reverse().join('-'), 
        time: new Date().toLocaleTimeString('ar-SA')
    };
    
    if (!data.name) return alert("يرجى إدخال اسم العميل");

    if (editKey) {
        db.ref('orders/' + editKey).once('value', snap => {
            data.dateKey = snap.val().dateKey;
            db.ref('orders/' + editKey).update(data).then(() => { 
                editKey = null; location.reload(); 
            });
        });
    } else { 
        db.ref('orders').push(data).then(() => location.reload()); 
    }
}

function editOrder(key) {
    db.ref('orders/' + key).once('value', s => {
        const o = s.val(); editKey = key;
        document.getElementById('custName').value = o.name;
        document.getElementById('orderID').value = o.id;
        document.getElementById('orderPrice').value = o.price;
        document.getElementById('trackingID').value = o.trackingID || "";
        document.getElementById('prepEmp').value = o.prepEmp || ""; 
        document.getElementById('saveBtn').innerText = "تحديث البيانات 🔄";
        window.scrollTo(0,0);
    });
}

function getPrintDecor(o) {
    const color = o.emp === "عمر" ? "#007bff" : (o.emp === "مريم" ? "#e83e8c" : "#000");
    return `<div style="width:350px; height:350px; border:10px double #b48608; padding:20px; border-radius:15px; direction:rtl; font-family:Tahoma; position:relative; box-sizing:border-box; margin:10px; background:white; float:right;">
        <h2 style="text-align:center; color:#b48608;">سلطان العسل</h2>
        <div style="font-size:17px; line-height:1.7; color:${color}; font-weight:bold;">
            👤 العميل: ${o.name}<br>🔢 الطلب: ${o.id}<br>💰 المبلغ: ${o.price} ريال<br>
            📦 التوصيل: ${o.delivery}<br>📍 الفرع: ${o.branch}<br>
            👨‍🍳 المجهز: ${o.prepEmp || "---"}<br>
            ${o.trackingID ? `📄 البوليصة: ${o.trackingID}<br>` : ""}🏷️ الموظف: ${o.emp}
        </div><div style="position:absolute; bottom:15px; left:15px; font-size:11px; color:#666;">📅 ${o.dateKey}</div></div>`;
}

function printAllToday() {
    const rawFilterDate = document.getElementById('calendarFilter').value;
    const dateParts = rawFilterDate.split('-');
    const selectedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    db.ref('orders').once('value', snap => {
        let content = "";
        snap.forEach(c => { if (c.val().dateKey === selectedDate) content += getPrintDecor(c.val()); });
        if(content === "") return alert("لا توجد طلبات لهذا اليوم");
        const win = window.open('', ''); win.document.write(content); win.document.close(); win.print();
    });
}

function smartDelete(k) { if(prompt("باسورد الحذف:") === "64100") db.ref('orders/'+k).remove(); }
function logout() { localStorage.clear(); location.reload(); }
