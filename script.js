// بيانات الربط المصححة لتناسب مشروع sultan-honey
const firebaseConfig = {
  apiKey: "AIzaSyCcgQj8bk5Me1g80EHLY7heukjUvH_GSKs",
  authDomain: "sultan-honey.firebaseapp.com",
  databaseURL: "https://sultan-honey-default-rtdb.firebaseio.com",
  projectId: "sultan-honey",
  storageBucket: "sultan-honey.firebasestorage.app",
  messagingSenderId: "701835618498",
  appId: "1:701835618498:web:701e310cf1c2c0dad6b35b"
};

// بدء تشغيل Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
let isArchiveMode = false;

// وظيفة حفظ الطلب وإرساله إلى Firebase
function saveOrder() {
    const name = document.getElementById('custName').value;
    const emp = document.getElementById('empName').value;
    if (!name || !emp) return alert("يرجى إدخال اسم العميل واختيار الموظف");

    const now = new Date();
    db.ref('orders').push({
        name, emp,
        id: document.getElementById('orderID').value,
        price: document.getElementById('orderPrice').value,
        branch: document.getElementById('branchName').value,
        delivery: document.getElementById('deliveryType').value,
        type: document.getElementById('orderType').value,
        dateKey: todayStr,
        fullDate: now.toLocaleDateString('ar-SA'),
        time: now.toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}),
        timestamp: Date.now()
    }).then(() => {
        // تفريغ الخانات بعد النجاح
        document.getElementById('custName').value = "";
        document.getElementById('orderID').value = "";
        document.getElementById('orderPrice').value = "";
        alert("تمت إضافة الطلب بنجاح ✅");
    }).catch((error) => {
        alert("خطأ في الربط: " + error.message);
    });
}

// وظيفة عرض البيانات من Firebase
function loadData() {
    let query = db.ref('orders');
    if (!isArchiveMode) {
        query = query.orderByChild('dateKey').equalTo(todayStr);
    }

    query.on('value', (snapshot) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        if(!sList || !wList) return;
        
        sList.innerHTML = ""; wList.innerHTML = "";
        
        let data = [];
        snapshot.forEach(child => {
            data.push({key: child.key, ...child.val()});
        });

        data.reverse().forEach((o) => {
            const card = `
                <div class="order-card" data-emp="${o.emp}">
                    <button class="btn-delete" onclick="confirmDelete('${o.key}')">✕</button>
                    <button class="btn-print-single" onclick="printSingle(this)">⎙</button>
                    <strong>${o.name}</strong> <span class="emp-tag">${o.emp}</span><br>
                    <span>${o.branch} | السعر: ${o.price} ريال</span><br>
                    <small>التوصيل: ${o.delivery || '---'}</small>
                    <span class="date-badge">${o.time} | ${o.fullDate}</span>
                </div>`;
            if (o.type === "سلة") sList.insertAdjacentHTML('beforeend', card);
            else wList.insertAdjacentHTML('beforeend', card);
        });
    });
}

// تبديل بين الأرشيف وطلبات اليوم
function toggleArchive() {
    isArchiveMode = !isArchiveMode;
    const btn = document.getElementById('archiveBtn');
    const archiveTitle = document.getElementById('archiveTitle');
    const pageTitle = document.getElementById('pageTitle');

    if (isArchiveMode) {
        btn.innerText = "🔙 العودة لطلبات اليوم";
        btn.style.background = "#6c757d";
        if(archiveTitle) archiveTitle.style.display = "block";
        if(pageTitle) pageTitle.style.display = "none";
    } else {
        btn.innerText = "📂 فتح الأرشيف الكامل";
        btn.style.background = "#007bff";
        if(archiveTitle) archiveTitle.style.display = "none";
        if(pageTitle) pageTitle.style.display = "block";
    }
    loadData();
}

// حذف طلب
function confirmDelete(key) {
    if (confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) {
        db.ref('orders/' + key).remove();
    }
}

// طباعة طلب واحد
function printSingle(btn) {
    const cardContent = btn.parentElement.innerHTML;
    const win = window.open('', '', 'width=400,height=400');
    win.document.write('<html><head><style>body{direction:rtl;font-family:sans-serif;text-align:center;padding:20px;}.btn-delete,.btn-print-single{display:none;}.order-card{border:1px solid #000;padding:15px;}</style></head><body>');
    win.document.write('<h2>سلطان العسل</h2>' + cardContent + '</body></html>');
    win.document.close();
    win.print();
}

// تشغيل جلب البيانات عند فتح الصفحة
loadData();

