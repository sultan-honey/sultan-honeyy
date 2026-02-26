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
let currentUser = localStorage.getItem('user'); // استعادة المستخدم عند التحديث
let userRole = localStorage.getItem('role');
let archiveMode = false;
let editKey = null;

// فحص الجلسة عند فتح الصفحة
if (currentUser) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appBody').style.display = 'block';
    loadData();
}

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (users[user] && users[user] === pass) {
        currentUser = user;
        userRole = (user === "إبراهيم") ? "admin" : "staff";
        localStorage.setItem('user', currentUser); // حفظ الجلسة
        localStorage.setItem('role', userRole);
        location.reload(); 
    } else { alert("خطأ في البيانات!"); }
}

function logout() {
    localStorage.clear();
    location.reload();
}

function loadData() {
    db.ref('orders').on('value', (snap) => {
        const sList = document.getElementById('sallaList');
        const wList = document.getElementById('whatsappList');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        sList.innerHTML = ""; wList.innerHTML = "";
        let stats = { "عمر": 0, "مريم": 0, "الكل": 0 };

        snap.forEach(child => {
            const o = child.val();
            if (o.dateKey === today) {
                if (stats[o.emp] !== undefined) stats[o.emp]++;
                stats["الكل"]++;
            }

            const isMatch = searchTerm !== "" && (o.name.toLowerCase().includes(searchTerm) || o.id.toString().includes(searchTerm));
            if (isMatch || archiveMode || o.dateKey === today) {
                if (userRole === "staff" && o.emp !== currentUser) return;

                const card = `
                    <div class="order-card" style="${isMatch ? 'border: 2px solid #28a745;' : ''}">
                        <button class="btn-edit" style="position:absolute; left:10px; top:10px;" onclick="editOrder('${child.key}')">📝</button>
                        <strong>👤 ${o.name}</strong>
                        <div class="card-details">
                            <span>🏷️ ${o.emp}</span> | 👨‍🍳 ${o.prepEmp}<br>
                            <span>🔢 ${o.id}</span> | 💰 ${o.price} ر.س
                        </div>
                        <span class="date-badge">📅 ${o.dateKey} ${o.dateKey !== today ? '(أرشيف)' : ''}</span>
                    </div>`;
                if (o.type === "سلة") sList.insertAdjacentHTML('afterbegin', card);
                else wList.insertAdjacentHTML('afterbegin', card);
            }
        });
        updateStatsUI(stats);
    });
}

function updateStatsUI(s) {
    let html = userRole === "admin" ? 
        `<span class="stat-badge">📊 اليوم: ${s.الكل}</span><span class="stat-badge">👨‍💻 عمر: ${s.عمر}</span><span class="stat-badge">👩‍💻 مريم: ${s.مريم}</span>` :
        `<span class="stat-badge">📈 طلباتك اليوم: ${s[currentUser]}</span>`;
    document.getElementById('userWelcome').innerHTML = html;
}

// أضف بقية الدوال (saveOrder, processSmartPaste, toggleArchive) من الكود السابق هنا..
