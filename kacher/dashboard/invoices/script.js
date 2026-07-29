// ============================================
// 📦 FIREBASE IMPORTS
// ============================================
import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  query, 
  getDocs, 
  doc,
  onSnapshot,
  getDoc,
  orderBy,
  limit,
  startAfter,
  where
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvLmzn4rnQrPrIeP40wzgbXqDy5xMhO7o",
  authDomain: "stor-121.firebaseapp.com",
  projectId: "stor-121",
  storageBucket: "stor-121.firebasestorage.app",
  messagingSenderId: "944316047610",
  appId: "1:944316047610:web:8ceeab3664e0e25d0da943",
  measurementId: "G-F4JBRJKR1R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ALLOWED_EMAILS = ['osdesigner5647@gmail.com'];

// ============================================
// 📊 STATE
// ============================================
let allInvoices = [];
let filteredInvoices = [];
let currentPage = 1;
const PER_PAGE = 12;
let chart = null;
let productsMap = new Map();

// ============================================
// 👤 AUTH
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  if (!ALLOWED_EMAILS.includes(user.email)) {
    await signOut(auth);
    window.location.href = 'index.html';
    return;
  }
  document.getElementById('userEmail').textContent = user.email;
  await loadProducts();
  await loadInvoices();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = 'index.html';
});

// ============================================
// 📦 LOAD PRODUCTS (لجلب سعر الشراء)
// ============================================
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    productsMap.clear();
    snap.forEach(doc => {
      const data = doc.data();
      productsMap.set(doc.id, {
        name: data.name || 'منتج',
        price: data.price || 0,
        cost: data.cost || data.purchasePrice || 0, // سعر الشراء
        icon: data.icon || '📱'
      });
    });
    console.log(`✅ تم تحميل ${productsMap.size} منتج`);
  } catch (error) {
    console.error('❌ خطأ في تحميل المنتجات:', error);
  }
}

// ============================================
// 📦 LOAD INVOICES
// ============================================
async function loadInvoices() {
  try {
    // جلب الفواتير من invoices الرئيسية
    const invoicesSnap = await getDocs(collection(db, 'invoices'));
    const invoiceMap = new Map();

    invoicesSnap.forEach(doc => {
      const data = doc.data();
      const key = data.invoiceNumber || doc.id;
      
      // حساب المكسب لكل فاتورة
      let totalProfit = 0;
      let totalCost = 0;
      const items = data.items || [];
      
      items.forEach(item => {
        const productId = item.productId || item.id;
        const product = productsMap.get(productId);
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        
        if (product) {
          const cost = product.cost || 0;
          const profit = (price - cost) * quantity;
          totalProfit += profit;
          totalCost += cost * quantity;
          item.cost = cost;
          item.profit = profit;
          item.productName = product.name;
          item.productIcon = product.icon;
        } else {
          // إذا لم نجد المنتج، نعتبر التكلفة 0
          item.cost = 0;
          item.profit = price * quantity;
          item.productName = item.name || 'منتج';
          item.productIcon = '📱';
        }
      });

      invoiceMap.set(key, {
        id: doc.id,
        ...data,
        items: items,
        totalProfit: totalProfit,
        totalCost: totalCost
      });
    });

    allInvoices = Array.from(invoiceMap.values());
    console.log(`✅ تم تحميل ${allInvoices.length} فاتورة`);

    // تعيين التواريخ الافتراضية (الشهر الحالي)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dateTo').value = lastDay.toISOString().split('T')[0];
    
    // تطبيق الفلترة
    applyFilters();

  } catch (error) {
    console.error('❌ خطأ:', error);
    showToast('❌ حدث خطأ في تحميل البيانات', 'error');
  }
}

// ============================================
// 🔍 FILTERS
// ============================================
function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const paymentFilter = document.getElementById('paymentFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  filteredInvoices = allInvoices.filter(inv => {
    // بحث
    if (search) {
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      const customer = (inv.customerName || '').toLowerCase();
      if (!invNum.includes(search) && !customer.includes(search)) return false;
    }

    // نوع الدفع
    if (paymentFilter !== 'all') {
      const saleType = inv.saleType || inv.type || '';
      if (paymentFilter === 'cash' && saleType !== 'cash') return false;
      if (paymentFilter === 'debt' && saleType !== 'debt') return false;
    }

    // الحالة
    if (statusFilter !== 'all') {
      const status = inv.status || 'completed';
      if (status !== statusFilter) return false;
    }

    // التاريخ
    if (dateFrom || dateTo) {
      let invDate;
      if (inv.createdAt?.toDate) {
        invDate = inv.createdAt.toDate();
      } else if (inv.createdAt?.seconds) {
        invDate = new Date(inv.createdAt.seconds * 1000);
      } else {
        invDate = new Date(inv.createdAt);
      }
      
      if (isNaN(invDate.getTime())) return true;
      
      const dateStr = invDate.toISOString().split('T')[0];
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo && dateStr > dateTo) return false;
    }

    return true;
  });

  // ترتيب حسب التاريخ (الأحدث أولاً)
  filteredInvoices.sort((a, b) => {
    let dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    let dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return dateB - dateA;
  });

  currentPage = 1;
  renderInvoices();
  updateStats();
  updateChart();
}

// ============================================
// 📊 UPDATE STATS
// ============================================
function updateStats() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const month = now.getMonth();
  const year = now.getFullYear();

  let todayCount = 0, todayTotal = 0, todayProfit = 0;
  let monthCount = 0, monthTotal = 0, monthProfit = 0;
  let totalDebt = 0, totalCash = 0;

  filteredInvoices.forEach(inv => {
    let invDate;
    if (inv.createdAt?.toDate) {
      invDate = inv.createdAt.toDate();
    } else if (inv.createdAt?.seconds) {
      invDate = new Date(inv.createdAt.seconds * 1000);
    } else {
      invDate = new Date(inv.createdAt);
    }
    
    if (isNaN(invDate.getTime())) return;
    
    const dateStr = invDate.toISOString().split('T')[0];
    const total = inv.total || 0;
    const profit = inv.totalProfit || 0;
    
    // اليوم
    if (dateStr === today) {
      todayCount++;
      todayTotal += total;
      todayProfit += profit;
    }
    
    // الشهر
    if (invDate.getMonth() === month && invDate.getFullYear() === year) {
      monthCount++;
      monthTotal += total;
      monthProfit += profit;
    }
    
    // الكاش vs أجل
    const saleType = inv.saleType || inv.type || '';
    if (saleType === 'debt' || inv.status === 'debt') {
      totalDebt += inv.remainingAmount || total;
    } else {
      totalCash += total;
    }
  });

  document.getElementById('todayCount').textContent = todayCount;
  document.getElementById('todayTotal').textContent = todayTotal.toFixed(2) + ' ₪';
  document.getElementById('todayProfit').textContent = todayProfit.toFixed(2) + ' ₪';
  document.getElementById('monthCount').textContent = monthCount;
  document.getElementById('monthTotal').textContent = monthTotal.toFixed(2) + ' ₪';
  document.getElementById('monthProfit').textContent = monthProfit.toFixed(2) + ' ₪';
  document.getElementById('totalDebt').textContent = totalDebt.toFixed(2) + ' ₪';
  document.getElementById('totalCash').textContent = totalCash.toFixed(2) + ' ₪';
}

// ============================================
// 📈 CHART
// ============================================
function updateChart() {
  const ctx = document.getElementById('profitChart').getContext('2d');
  
  if (chart) {
    chart.destroy();
  }

  // تجميع المكاسب حسب اليوم
  const dailyMap = new Map();
  
  filteredInvoices.forEach(inv => {
    let date;
    if (inv.createdAt?.toDate) {
      date = inv.createdAt.toDate();
    } else if (inv.createdAt?.seconds) {
      date = new Date(inv.createdAt.seconds * 1000);
    } else {
      date = new Date(inv.createdAt);
    }
    if (isNaN(date.getTime())) return;
    
    const key = date.toISOString().split('T')[0];
    const profit = inv.totalProfit || 0;
    dailyMap.set(key, (dailyMap.get(key) || 0) + profit);
  });

  const sorted = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(([key]) => key);
  const values = sorted.map(([, value]) => value);

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(212, 168, 67, 0.4)');
  gradient.addColorStop(1, 'rgba(212, 168, 67, 0)');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['لا توجد بيانات'],
      datasets: [{
        label: 'صافي الربح',
        data: values.length > 0 ? values : [0],
        borderColor: '#d4a843',
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#d4a843',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { family: 'Cairo' },
          bodyFont: { family: 'Cairo' },
          callbacks: {
            label: function(context) {
              return context.parsed.y.toFixed(2) + ' ₪';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { family: 'Cairo' },
            callback: function(value) {
              return value.toFixed(0) + ' ₪';
            }
          },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          ticks: {
            font: { family: 'Cairo' },
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 15
          },
          grid: { display: false }
        }
      }
    }
  });
}

// ============================================
// 📋 RENDER INVOICES
// ============================================
function renderInvoices() {
  const grid = document.getElementById('invoicesGrid');
  const totalPages = Math.ceil(filteredInvoices.length / PER_PAGE);
  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = filteredInvoices.slice(start, end);

  if (filteredInvoices.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="icon">🧾</span>لا توجد فواتير</div>`;
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  document.getElementById('pagination').style.display = 'flex';
  document.getElementById('pageInfo').textContent = `صفحة ${currentPage} من ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;

  let html = '';
  pageItems.forEach(inv => {
    const invNumber = inv.invoiceNumber || 'INV-' + (inv.id || '').slice(0, 6);
    const customer = inv.customerName || 'عميل';
    const phone = inv.customerPhone || '';
    const total = inv.total || 0;
    const profit = inv.totalProfit || 0;
    const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt);
    const dateStr = !isNaN(date.getTime()) ? date.toLocaleDateString('ar-EG') : 'غير معروف';
    const saleType = inv.saleType || inv.type || 'cash';
    const status = inv.status || 'completed';
    const items = inv.items || [];
    const itemsSummary = items.map(item => `${item.quantity}×${item.productName || item.name}`).join(', ');

    const statusLabels = {
      'completed': '✅ مكتملة',
      'debt': '📝 أجل',
      'pending': '⏳ معلقة',
      'cancelled': '❌ ملغية'
    };

    const paymentLabels = {
      'cash': '💰 كاش',
      'debt': '📝 أجل'
    };

    html += `
      <div class="invoice-card">
        <div class="card-header">
          <span class="inv-number">${invNumber}</span>
          <span class="inv-date">${dateStr}</span>
        </div>
        <div class="card-body">
          <div class="customer">${customer}</div>
          ${phone ? `<div class="phone">📱 ${phone}</div>` : ''}
          <div class="items-summary">📦 ${itemsSummary || 'لا توجد منتجات'}</div>
        </div>
        <div class="card-footer">
          <div>
            <span class="amount">${total.toFixed(2)} ₪</span>
            ${profit !== 0 ? `<span style="font-size:13px;font-weight:700;color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">${profit >= 0 ? '+' : ''}${profit.toFixed(2)} ₪</span>` : ''}
          </div>
          <div class="badge-group">
            <span class="payment-badge ${saleType}">${paymentLabels[saleType] || saleType}</span>
            <span class="status-badge ${status}">${statusLabels[status] || status}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="view-btn" onclick="viewInvoice('${inv.id || inv.invoiceNumber}')">👁️ عرض</button>
          <button class="print-btn" onclick="printInvoice('${inv.id || inv.invoiceNumber}')">🖨️ طباعة</button>
          ${phone ? `<button class="whatsapp-btn" onclick="sendWhatsApp('${inv.id || inv.invoiceNumber}')">📱 واتساب</button>` : ''}
        </div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

// ============================================
// 👁️ VIEW INVOICE
// ============================================
window.viewInvoice = function(id) {
  const inv = allInvoices.find(i => i.id === id || i.invoiceNumber === id);
  if (!inv) {
    showToast('❌ الفاتورة غير موجودة', 'error');
    return;
  }

  const modal = document.getElementById('invoiceModal');
  document.getElementById('modalInvoiceNumber').textContent = `🧾 ${inv.invoiceNumber || 'فاتورة'}`;

  // التفاصيل
  const date = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt);
  const dateStr = !isNaN(date.getTime()) ? date.toLocaleString('ar-EG') : 'غير معروف';
  
  let detailHTML = `
    <div class="detail-row"><span class="label">👤 العميل</span><span>${inv.customerName || 'عميل'}</span></div>
    ${inv.customerPhone ? `<div class="detail-row"><span class="label">📱 الهاتف</span><span>${inv.customerPhone}</span></div>` : ''}
    <div class="detail-row"><span class="label">📅 التاريخ</span><span>${dateStr}</span></div>
    <div class="detail-row"><span class="label">📌 نوع البيع</span><span>${inv.saleType === 'debt' ? '📝 أجل' : '💰 كاش'}</span></div>
    ${inv.remainingAmount && inv.remainingAmount > 0 ? `<div class="detail-row"><span class="label">📝 المتبقي</span><span style="color:var(--danger);font-weight:700;">${inv.remainingAmount.toFixed(2)} ₪</span></div>` : ''}
    ${inv.paidAmount && inv.paidAmount > 0 ? `<div class="detail-row"><span class="label">💳 المدفوع</span><span style="color:var(--success);font-weight:700;">${inv.paidAmount.toFixed(2)} ₪</span></div>` : ''}
  `;
  document.getElementById('modalDetail').innerHTML = detailHTML;

  // المنتجات
  const items = inv.items || [];
  let itemsHTML = `
    <div class="item-row header">
      <span>المنتج</span>
      <span>الكمية</span>
      <span>سعر البيع</span>
      <span>الربح</span>
    </div>
  `;
  
  let totalProfit = 0;
  items.forEach(item => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const cost = item.cost || 0;
    const profit = (price - cost) * qty;
    totalProfit += profit;
    
    itemsHTML += `
      <div class="item-row">
        <span>${item.productIcon || '📱'} ${item.productName || item.name || 'منتج'}</span>
        <span>${qty}</span>
        <span>${price.toFixed(2)} ₪</span>
        <span class="item-profit ${profit < 0 ? 'loss' : ''}" style="color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">${profit >= 0 ? '+' : ''}${profit.toFixed(2)} ₪</span>
      </div>
    `;
  });
  
  document.getElementById('modalItems').innerHTML = itemsHTML;
  
  // الإجمالي
  const total = inv.total || 0;
  document.getElementById('modalTotalValue').textContent = total.toFixed(2) + ' ₪';

  // أزرار
  document.getElementById('printModalBtn').onclick = () => printInvoice(inv.id || inv.invoiceNumber);
  document.getElementById('whatsappModalBtn').onclick = () => sendWhatsApp(inv.id || inv.invoiceNumber);

  modal.classList.add('show');
};

// ============================================
// 🖨️ PRINT INVOICE
// ============================================
window.printInvoice = function(id) {
  const inv = allInvoices.find(i => i.id === id || i.invoiceNumber === id);
  if (!inv) { showToast('❌ الفاتورة غير موجودة', 'error'); return; }

  const printWindow = window.open('', '_blank');
  const items = inv.items || [];
  let itemsHTML = items.map(item => `
    <tr>
      <td>${item.productName || item.name || 'منتج'}</td>
      <td>${item.quantity || 1}</td>
      <td>${(item.price || 0).toFixed(2)} ₪</td>
      <td>${((item.price || 0) * (item.quantity || 1)).toFixed(2)} ₪</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html dir="rtl">
    <head><title>فاتورة ${inv.invoiceNumber}</title>
    <style>
      body { font-family: 'Cairo', sans-serif; padding: 30px; max-width: 500px; margin: auto; }
      .header { text-align: center; border-bottom: 2px solid #d4a843; padding-bottom: 15px; }
      .header h1 { color: #000; margin: 0; }
      .header h1 span { color: #d4a843; }
      .details { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #f0f0f0; padding: 8px; text-align: right; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; }
      .total { font-size: 20px; font-weight: 900; color: #d4a843; text-align: center; padding: 15px; }
      .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
    </head>
    <body>
      <div class="header">
        <h1>براند فون <span>OS</span></h1>
        <div>📍 براند فون | 📞 01144898934</div>
      </div>
      <div class="details">
        <div>📋 رقم: ${inv.invoiceNumber}</div>
        <div>👤 العميل: ${inv.customerName || 'عميل'}</div>
        ${inv.customerPhone ? `<div>📱 ${inv.customerPhone}</div>` : ''}
        <div>📅 ${new Date().toLocaleString('ar-EG')}</div>
      </div>
      <table>
        <tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
        ${itemsHTML}
      </table>
      <div class="total">الإجمالي: ${(inv.total || 0).toFixed(2)} ₪</div>
      ${inv.remainingAmount && inv.remainingAmount > 0 ? `<div style="color:red;text-align:center;font-weight:700;">📝 المتبقي: ${inv.remainingAmount.toFixed(2)} ₪</div>` : ''}
      <div class="footer">✨ براند فون - شكراً لثقتكم ❤️</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

// ============================================
// 📱 SEND WHATSAPP
// ============================================
window.sendWhatsApp = function(id) {
  const inv = allInvoices.find(i => i.id === id || i.invoiceNumber === id);
  if (!inv || !inv.customerPhone) {
    showToast('❌ لا يوجد رقم هاتف للعميل', 'error');
    return;
  }

  let message = `🧾 *فاتورة ${inv.invoiceNumber || ''}*\n`;
  message += `👤 العميل: ${inv.customerName || 'عميل'}\n`;
  message += `📅 ${new Date().toLocaleString('ar-EG')}\n`;
  message += `────────────────────\n`;
  
  (inv.items || []).forEach(item => {
    message += `📦 ${item.productName || item.name || 'منتج'} × ${item.quantity || 1} = ${((item.price || 0) * (item.quantity || 1)).toFixed(2)} ₪\n`;
  });
  
  message += `────────────────────\n`;
  message += `💰 الإجمالي: ${(inv.total || 0).toFixed(2)} ₪\n`;
  if (inv.remainingAmount && inv.remainingAmount > 0) {
    message += `📝 المتبقي: ${inv.remainingAmount.toFixed(2)} ₪\n`;
  }
  message += `✨ براند فون - شكراً لثقتكم ❤️`;

  const phone = inv.customerPhone.replace(/^0/, '20');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

// ============================================
// 🔄 CLOSE MODAL
// ============================================
window.closeInvoiceModal = function() {
  document.getElementById('invoiceModal').classList.remove('show');
};

document.getElementById('closeModalBtn').addEventListener('click', closeInvoiceModal);
document.getElementById('invoiceModal').addEventListener('click', function(e) {
  if (e.target === this) closeInvoiceModal();
});

// ============================================
// 📋 PAGINATION
// ============================================
document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderInvoices(); }
});

document.getElementById('nextPage').addEventListener('click', () => {
  const totalPages = Math.ceil(filteredInvoices.length / PER_PAGE);
  if (currentPage < totalPages) { currentPage++; renderInvoices(); }
});

// ============================================
// 🔍 FILTER EVENTS
// ============================================
document.getElementById('applyFilterBtn').addEventListener('click', applyFilters);

document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') applyFilters();
});

// ============================================
// 🎯 TOAST
// ============================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.className = 'toast';
  if (type === 'error') { toast.classList.add('error'); }
  toast.classList.add('show');
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// 📡 تحديث لحظي
// ============================================
onSnapshot(collection(db, 'invoices'), () => {
  loadInvoices();
});

console.log('✅ Invoice system loaded successfully');