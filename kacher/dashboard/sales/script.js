import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection,
    query,
    getDocs,
    onSnapshot,
    doc,
    updateDoc,
    increment,
    addDoc,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let cart = [];
let products = [];
let discount = 0;
let currentUser = null;
let saleType = 'cash'; // cash or debt
let paymentMethod = 'cash'; // cash, wallet, mixed
let selectedCustomer = null;
let customers = [];

const ALLOWED_EMAILS = ['osdesigner5647@gmail.com'];

// ============================================
// 👤 التحقق من المستخدم
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    if (!ALLOWED_EMAILS.includes(user.email)) {
        await signOut(auth);
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    document.getElementById('userEmail').textContent = user.email;
    loadProducts();
    loadCustomers();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = 'index.html';
});

// ============================================
// 📦 تحميل المنتجات والعملاء
// ============================================
function loadProducts() {
    const q = query(collection(db, 'products'));
    onSnapshot(q, (snapshot) => {
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        renderProducts(products);
    });
}

function loadCustomers() {
    const q = query(collection(db, 'customers'));
    onSnapshot(q, (snapshot) => {
        customers = [];
        snapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
    });
}

// ============================================
// 🎨 عرض المنتجات
// ============================================
function renderProducts(productsList) {
    const grid = document.getElementById('productsGrid');
    if (productsList.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999; grid-column: 1/-1;">
                <div style="font-size:30px;">📦</div>
                لا توجد منتجات
            </div>
        `;
        return;
    }
    grid.innerHTML = productsList.map(product => `
        <div class="product-card" onclick="window.addToCart('${product.id}')">
            <div class="product-icon">${product.icon || '📱'}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price.toFixed(2)} ₪</div>
            <div class="product-stock ${product.quantity < 5 ? 'low' : ''}">
                ${product.quantity > 0 ? `المتبقي: ${product.quantity}` : '⚠️ نفذ المخزون'}
            </div>
        </div>
    `).join('');
}

// ============================================
// 🔍 البحث
// ============================================
document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    if (!searchTerm) {
        renderProducts(products);
        return;
    }
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );
    renderProducts(filtered);
});

// ============================================
// 🛒 إضافة للسلة
// ============================================
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showToast('❌ المنتج غير موجود', 'error');
        return;
    }
    if (product.quantity <= 0) {
        showToast('⚠️ المنتج نفذ من المخزون', 'error');
        return;
    }
    
    let serial = '';
    if (product.needSerial) {
        serial = prompt('🔢 أدخل السيريال الخاص بالمنتج:');
        if (!serial) {
            showToast('⚠️ السيريال مطلوب لهذا المنتج', 'error');
            return;
        }
    }
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity >= product.quantity) {
            showToast('⚠️ الكمية المطلوبة غير متوفرة', 'error');
            return;
        }
        existing.quantity++;
        if (serial) {
            existing.serial = serial;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            icon: product.icon || '📱',
            serial: serial || ''
        });
    }
    updateCart();
    showToast(`✅ تم إضافة ${product.name}`, 'success');
};

// ============================================
// 🛒 تحديث السلة
// ============================================
function updateCart() {
    const container = document.getElementById('cartItems');
    const count = document.getElementById('cartCount');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('totalDisplay');
    const checkoutBtn = document.getElementById('checkoutBtn');

    count.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <span class="icon">🛒</span>
                السلة فارغة
            </div>
        `;
        checkoutBtn.disabled = true;
        subtotalEl.textContent = '0.00 ₪';
        totalEl.textContent = '0.00 ₪';
        document.getElementById('discountDisplay').textContent = '0.00 ₪';
        
        document.getElementById('paidRow').style.display = 'none';
        document.getElementById('remainingRow').style.display = 'none';
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal - discount;

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="item-info">
                <div class="item-name">${item.icon} ${item.name}</div>
                ${item.serial ? `<div class="item-price">🔢 ${item.serial}</div>` : ''}
                <div class="item-price">${item.price.toFixed(2)} ₪</div>
            </div>
            <div class="item-quantity">
                <button onclick="window.updateQuantity(${index}, -1)">−</button>
                <span class="qty">${item.quantity}</span>
                <button onclick="window.updateQuantity(${index}, 1)">+</button>
            </div>
            <div class="item-total">${(item.price * item.quantity).toFixed(2)} ₪</div>
            <button class="remove-btn" onclick="window.removeFromCart(${index})">✕</button>
        </div>
    `).join('');

    subtotalEl.textContent = subtotal.toFixed(2) + ' ₪';
    document.getElementById('discountDisplay').textContent = discount.toFixed(2) + ' ₪';
    totalEl.textContent = total.toFixed(2) + ' ₪';
    checkoutBtn.disabled = false;

    document.getElementById('paidRow').style.display = 'flex';
    document.getElementById('remainingRow').style.display = 'flex';
    
    updateDebtDisplay(total);
    updatePaymentSummary(total);
}

// ============================================
// 📌 عرض المدفوع والمتبقي/المستحق
// ============================================
function updateDebtDisplay(total) {
    const paidRow = document.getElementById('paidRow');
    const remainingRow = document.getElementById('remainingRow');
    const paidDisplay = document.getElementById('paidDisplay');
    const remainingDisplay = document.getElementById('remainingDisplay');
    const remainingLabel = document.getElementById('remainingLabel');
    
    const paidCash = parseFloat(document.getElementById('paidCash').value) || 0;
    const paidWallet = parseFloat(document.getElementById('paidWallet').value) || 0;
    const totalPaid = paidCash + paidWallet;
    const remaining = total - totalPaid;

    if (saleType === 'debt') {
        paidRow.style.display = 'flex';
        paidDisplay.textContent = totalPaid.toFixed(2) + ' ₪';
        paidDisplay.style.color = totalPaid > 0 ? 'var(--success)' : '#999';
        
        remainingRow.style.display = 'flex';
        if (remaining > 0) {
            remainingLabel.textContent = '📝 مستحق عليه';
            remainingDisplay.textContent = remaining.toFixed(2) + ' ₪';
            remainingDisplay.style.color = 'var(--danger)';
            remainingDisplay.style.fontWeight = '700';
        } else {
            remainingLabel.textContent = '✅ تم السداد';
            remainingDisplay.textContent = '0.00 ₪';
            remainingDisplay.style.color = 'var(--success)';
        }
    } else {
        paidRow.style.display = 'flex';
        paidDisplay.textContent = totalPaid.toFixed(2) + ' ₪';
        paidDisplay.style.color = totalPaid > 0 ? 'var(--success)' : '#999';
        
        remainingRow.style.display = 'flex';
        if (remaining > 0) {
            remainingLabel.textContent = '📌 المتبقي';
            remainingDisplay.textContent = remaining.toFixed(2) + ' ₪';
            remainingDisplay.style.color = 'var(--danger)';
        } else {
            remainingLabel.textContent = '✅ تم الدفع';
            remainingDisplay.textContent = '0.00 ₪';
            remainingDisplay.style.color = 'var(--success)';
        }
    }
}

function updatePaymentSummary(total) {
    const paidCash = parseFloat(document.getElementById('paidCash').value) || 0;
    const paidWallet = parseFloat(document.getElementById('paidWallet').value) || 0;
    const totalPaid = paidCash + paidWallet;
    const remaining = total - totalPaid;

    const paidRow = document.getElementById('paidRow');
    const remainingRow = document.getElementById('remainingRow');
    const paidDisplay = document.getElementById('paidDisplay');
    const remainingDisplay = document.getElementById('remainingDisplay');
    const remainingLabel = document.getElementById('remainingLabel');

    if (saleType === 'debt') {
        paidRow.style.display = 'flex';
        paidDisplay.textContent = totalPaid.toFixed(2) + ' ₪';
        paidDisplay.style.color = totalPaid > 0 ? 'var(--success)' : '#999';
        
        remainingRow.style.display = 'flex';
        if (remaining > 0) {
            remainingLabel.textContent = '📝 مستحق عليه';
            remainingDisplay.textContent = remaining.toFixed(2) + ' ₪';
            remainingDisplay.style.color = 'var(--danger)';
            remainingDisplay.style.fontWeight = '700';
        } else {
            remainingLabel.textContent = '✅ تم السداد';
            remainingDisplay.textContent = '0.00 ₪';
            remainingDisplay.style.color = 'var(--success)';
        }
        return;
    }

    if (paymentMethod === 'cash' || paymentMethod === 'wallet') {
        const paid = paymentMethod === 'cash' ? paidCash : paidWallet;
        paidRow.style.display = 'flex';
        remainingRow.style.display = 'flex';
        paidDisplay.textContent = paid.toFixed(2) + ' ₪';
        paidDisplay.style.color = paid > 0 ? 'var(--success)' : '#999';
        
        if (remaining > 0) {
            remainingLabel.textContent = '📌 المتبقي';
            remainingDisplay.textContent = remaining.toFixed(2) + ' ₪';
            remainingDisplay.style.color = 'var(--danger)';
        } else {
            remainingLabel.textContent = '✅ تم الدفع';
            remainingDisplay.textContent = '0.00 ₪';
            remainingDisplay.style.color = 'var(--success)';
        }
    } else if (paymentMethod === 'mixed') {
        paidRow.style.display = 'flex';
        remainingRow.style.display = 'flex';
        paidDisplay.textContent = totalPaid.toFixed(2) + ' ₪';
        paidDisplay.style.color = totalPaid > 0 ? 'var(--success)' : '#999';
        
        if (remaining > 0) {
            remainingLabel.textContent = '📌 المتبقي';
            remainingDisplay.textContent = remaining.toFixed(2) + ' ₪';
            remainingDisplay.style.color = 'var(--danger)';
        } else {
            remainingLabel.textContent = '✅ تم الدفع';
            remainingDisplay.textContent = '0.00 ₪';
            remainingDisplay.style.color = 'var(--success)';
        }
    }
}

// ============================================
// 🔄 تحديث الكمية
// ============================================
window.updateQuantity = function(index, change) {
    const item = cart[index];
    if (!item) return;
    const product = products.find(p => p.id === item.id);
    if (!product) return;
    const newQty = item.quantity + change;
    if (newQty < 1) {
        cart.splice(index, 1);
    } else if (newQty > product.quantity) {
        showToast('⚠️ الكمية المطلوبة غير متوفرة', 'error');
        return;
    } else {
        item.quantity = newQty;
    }
    updateCart();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCart();
    showToast('🗑️ تم حذف المنتج من السلة', 'success');
};

document.getElementById('clearCartBtn').addEventListener('click', () => {
    if (cart.length === 0) return;
    if (confirm('هل أنت متأكد من تفريغ السلة؟')) {
        cart = [];
        discount = 0;
        document.getElementById('paidCash').value = '0';
        document.getElementById('paidWallet').value = '0';
        updateCart();
        showToast('🗑️ تم تفريغ السلة', 'success');
    }
});

// ============================================
// 👤 البحث عن العميل مع الاقتراحات
// ============================================
let searchTimeout;
const customerSearch = document.getElementById('customerSearch');
const customerPhoneInput = document.getElementById('customerPhoneInput');
const suggestionsDiv = document.getElementById('customerSuggestions');

customerSearch.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const searchTerm = this.value.trim();
    const statusEl = document.getElementById('customerStatus');

    if (!searchTerm) {
        statusEl.textContent = '🔍';
        statusEl.className = 'customer-status';
        document.getElementById('selectedCustomerId').value = '';
        document.getElementById('selectedCustomerName').value = '';
        document.getElementById('balanceInfo').classList.remove('show');
        selectedCustomer = null;
        suggestionsDiv.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(() => {
        const foundCustomers = customers.filter(c => 
            (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (c.phone && c.phone.includes(searchTerm))
        );

        if (foundCustomers.length > 0) {
            suggestionsDiv.innerHTML = foundCustomers.map(c => {
                const balance = c.balance || 0;
                let balanceClass = 'zero';
                let balanceText = '0.00 ₪';
                if (balance > 0) {
                    balanceClass = 'credit';
                    balanceText = `+${balance.toFixed(2)} ₪`;
                } else if (balance < 0) {
                    balanceClass = 'debt';
                    balanceText = `${balance.toFixed(2)} ₪`;
                }
                
                return `
                    <div class="suggestion-item" onclick="window.selectCustomer('${c.id}')">
                        <div>
                            <div class="suggestion-name">${c.name || 'عميل'}</div>
                            <div class="suggestion-phone">${c.phone || 'لا يوجد رقم'}</div>
                        </div>
                        <span class="suggestion-balance ${balanceClass}">${balanceText}</span>
                    </div>
                `;
            }).join('');
            suggestionsDiv.style.display = 'block';
            
            statusEl.textContent = `✅ ${foundCustomers.length} عميل`;
            statusEl.className = 'customer-status existing';
        } else {
            suggestionsDiv.innerHTML = `
                <div class="suggestion-item" style="justify-content:center; color:#999; font-size:13px;">
                    ➕ لا يوجد عملاء بهذا الاسم - سيتم إنشاء عميل جديد
                </div>
            `;
            suggestionsDiv.style.display = 'block';
            
            statusEl.textContent = '➕ جديد';
            statusEl.className = 'customer-status new';
            document.getElementById('selectedCustomerId').value = '';
            document.getElementById('selectedCustomerName').value = searchTerm;
            document.getElementById('balanceInfo').classList.remove('show');
            selectedCustomer = { name: searchTerm, new: true };
        }
    }, 300);
});

window.selectCustomer = function(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    customerSearch.value = customer.name || '';
    customerPhoneInput.value = customer.phone || '';
    document.getElementById('selectedCustomerId').value = customer.id;
    document.getElementById('selectedCustomerName').value = customer.name || '';
    selectedCustomer = customer;
    
    const balance = customer.balance || 0;
    const balanceDisplay = document.getElementById('balanceDisplay');
    const balanceInfo = document.getElementById('balanceInfo');
    
    if (balance < 0) {
        balanceDisplay.textContent = `${balance.toFixed(2)} ₪ (له عندنا)`;
        balanceDisplay.className = 'credit-text';
    } else if (balance > 0) {
        balanceDisplay.textContent = `${Math.abs(balance).toFixed(2)} ₪ (عليه)`;
        balanceDisplay.className = 'debt-text';
    } else {
        balanceDisplay.textContent = '0.00 ₪ (متوازن)';
        balanceDisplay.className = '';
    }
    balanceInfo.classList.add('show');
    
    document.getElementById('customerStatus').textContent = '✅ موجود';
    document.getElementById('customerStatus').className = 'customer-status existing';
    
    suggestionsDiv.style.display = 'none';
    
    showToast(`✅ تم اختيار العميل ${customer.name}`, 'success');
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.customer-section')) {
        suggestionsDiv.style.display = 'none';
    }
});

customerPhoneInput.addEventListener('blur', function() {
    const phone = this.value.trim();
    if (!phone) {
        document.getElementById('balanceInfo').classList.remove('show');
        return;
    }

    const found = customers.find(c => c.phone === phone);
    if (found) {
        customerSearch.value = found.name || '';
        document.getElementById('selectedCustomerId').value = found.id;
        document.getElementById('selectedCustomerName').value = found.name || '';
        selectedCustomer = found;
        
        const balance = found.balance || 0;
        const balanceDisplay = document.getElementById('balanceDisplay');
        const balanceInfo = document.getElementById('balanceInfo');
        
        if (balance > 0) {
            balanceDisplay.textContent = `${balance.toFixed(2)} ₪ (علينا)`;
            balanceDisplay.className = 'debt-text';
            balanceDisplay.style.color = 'var(--danger)';
        } else if (balance < 0) {
            balanceDisplay.textContent = `${Math.abs(balance).toFixed(2)} ₪ (لنا عنده)`;
            balanceDisplay.className = 'credit-text';
            balanceDisplay.style.color = 'var(--success)';
        } else {
            balanceDisplay.textContent = '0.00 ₪ (متوازن)';
            balanceDisplay.className = '';
            balanceDisplay.style.color = '#999';
        }
        balanceInfo.classList.add('show');
        
        document.getElementById('customerStatus').textContent = '✅ موجود';
        document.getElementById('customerStatus').className = 'customer-status existing';
    }
});

// ============================================
// 📌 تغيير نوع البيع - إظهار/إخفاء العميل
// ============================================
document.querySelectorAll('.sale-type .group-buttons button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sale-type .group-buttons button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        saleType = this.dataset.sale;
        
        const customerSection = document.getElementById('customerSection');
        const balanceInfo = document.getElementById('balanceInfo');
        const customerSearch = document.getElementById('customerSearch');
        const customerPhone = document.getElementById('customerPhoneInput');
        
        if (saleType === 'cash') {
            // 🔹 وضع الكاش: إخفاء العميل ومسح البيانات
            customerSection.classList.add('hidden');
            balanceInfo.classList.add('hidden');
            balanceInfo.classList.remove('show');
            customerSearch.value = '';
            customerPhone.value = '';
            document.getElementById('selectedCustomerId').value = '';
            document.getElementById('selectedCustomerName').value = '';
            document.getElementById('customerStatus').textContent = '🔍';
            document.getElementById('customerStatus').className = 'customer-status';
            selectedCustomer = null;
            
            // 🔹 إعادة تعيين المدفوعات
            document.getElementById('paidCash').value = '0';
            document.getElementById('paidWallet').value = '0';
            
            // 🔹 تغيير طريقة الدفع إلى كاش
            document.querySelectorAll('.payment-method .group-buttons button').forEach(b => b.classList.remove('active'));
            document.querySelector('.payment-method .group-buttons .cash-payment').classList.add('active');
            paymentMethod = 'cash';
            
            document.getElementById('paidCash').disabled = false;
            document.getElementById('paidWallet').disabled = true;
            document.getElementById('paidWallet').value = '0';
            
        } else {
            // 🔹 وضع الأجل: إظهار العميل وإجبارية الإدخال
            customerSection.classList.remove('hidden');
            customerSection.classList.add('debt-mode');
            
            // 🔹 إجبارية إدخال رقم الهاتف
            customerPhone.required = true;
            customerSearch.required = true;
            
            showToast('📝 يرجى إدخال بيانات العميل (الاسم ورقم الهاتف)', 'success');
        }
        
        const total = parseFloat(document.getElementById('totalDisplay').textContent) || 0;
        updateDebtDisplay(total);
        updatePaymentSummary(total);
    });
});

document.querySelectorAll('.payment-method .group-buttons button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.payment-method .group-buttons button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        paymentMethod = this.dataset.payment;

        const paidCash = document.getElementById('paidCash');
        const paidWallet = document.getElementById('paidWallet');

        if (paymentMethod === 'cash') {
            paidCash.disabled = false;
            paidWallet.disabled = true;
            paidWallet.value = '0';
            paidCash.placeholder = 'المبلغ المدفوع نقداً';
        } else if (paymentMethod === 'wallet') {
            paidCash.disabled = true;
            paidCash.value = '0';
            paidWallet.disabled = false;
            paidWallet.placeholder = 'المبلغ المدفوع عبر المحفظة';
        } else if (paymentMethod === 'mixed') {
            paidCash.disabled = false;
            paidWallet.disabled = false;
            paidCash.placeholder = 'المبلغ نقداً';
            paidWallet.placeholder = 'المبلغ محفظة';
        }

        const total = parseFloat(document.getElementById('totalDisplay').textContent) || 0;
        updateCart();
    });
});

document.getElementById('paidCash').addEventListener('input', updateCart);
document.getElementById('paidWallet').addEventListener('input', updateCart);

// ============================================
// 🏷️ DISCOUNT
// ============================================
document.getElementById('discountBtn').addEventListener('click', () => {
    if (cart.length === 0) {
        showToast('⚠️ السلة فارغة', 'error');
        return;
    }
    document.getElementById('discountModal').classList.add('show');
    document.getElementById('discountInput').value = '';
    document.getElementById('discountInput').focus();
});

window.closeDiscountModal = function() {
    document.getElementById('discountModal').classList.remove('show');
};

window.applyDiscount = function() {
    const input = document.getElementById('discountInput');
    const value = parseFloat(input.value);
    if (isNaN(value) || value < 0) {
        showToast('⚠️ يرجى إدخال قيمة صحيحة', 'error');
        return;
    }
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (value > subtotal) {
        showToast('⚠️ الخصم لا يمكن أن يتجاوز المجموع', 'error');
        return;
    }
    discount = value;
    updateCart();
    closeDiscountModal();
    showToast(`🏷️ تم تطبيق خصم ${value.toFixed(2)} ₪`, 'success');
};

// ============================================
// 💳 CHECKOUT
// ============================================
document.getElementById('checkoutBtn').addEventListener('click', async () => {
    if (cart.length === 0) {
        showToast('⚠️ السلة فارغة', 'error');
        return;
    }

    const customerSearch = document.getElementById('customerSearch').value.trim();
    const customerPhoneInput = document.getElementById('customerPhoneInput').value.trim();
    let customerName = document.getElementById('selectedCustomerName').value || customerSearch || 'عميل';

    // 🔹 في حالة الأجل: التحقق من وجود العميل ورقم الهاتف
    if (saleType === 'debt') {
        if (!customerSearch || !customerPhoneInput) {
            showToast('⚠️ يرجى إدخال اسم العميل ورقم الهاتف (البيع أجل)', 'error');
            return;
        }
        
        // التحقق من أن رقم الهاتف صحيح (10 أرقام على الأقل)
        if (customerPhoneInput.length < 10) {
            showToast('⚠️ رقم الهاتف غير صحيح (يجب أن يكون 10 أرقام على الأقل)', 'error');
            return;
        }
    }

    let customerPhone = customerPhoneInput;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal - discount;

    const paidCash = parseFloat(document.getElementById('paidCash').value) || 0;
    const paidWallet = parseFloat(document.getElementById('paidWallet').value) || 0;
    let totalPaid = 0;

    if (paymentMethod === 'cash') {
        totalPaid = paidCash;
    } else if (paymentMethod === 'wallet') {
        totalPaid = paidWallet;
    } else if (paymentMethod === 'mixed') {
        totalPaid = paidCash + paidWallet;
    }

    const remaining = total - totalPaid;

    // 🔹 في حالة الكاش: المدفوع يجب أن يساوي الإجمالي على الأقل
    if (saleType === 'cash') {
        if (totalPaid < total) {
            showToast(`⚠️ المبلغ المدفوع (${totalPaid.toFixed(2)} ₪) أقل من الإجمالي (${total.toFixed(2)} ₪)`, 'error');
            return;
        }
    }

    // 🔹 في حالة الأجل: يقبل دفع جزء أو كامل
    if (saleType === 'debt') {
        if (totalPaid === 0 && remaining > 0) {
            if (!confirm(`⚠️ لم تقم بدفع أي مبلغ. سيتم تسجيل ${total.toFixed(2)} ₪ كدين على العميل. هل تريد المتابعة؟`)) {
                return;
            }
        }
        if (totalPaid > 0 && remaining > 0) {
            if (!confirm(`💰 سيتم تسجيل ${remaining.toFixed(2)} ₪ كدين على العميل. هل تريد المتابعة؟`)) {
                return;
            }
        }
    }

    const saleLabels = {
        'cash': 'كاش',
        'debt': 'أجل (مستحق عليه)'
    };

    const paymentLabels = {
        'cash': 'نقدي',
        'wallet': 'محفظة إلكترونية',
        'mixed': `مختلط (نقدي: ${paidCash.toFixed(2)} ₪ + محفظة: ${paidWallet.toFixed(2)} ₪)`
    };

    let confirmMessage = `💰 تأكيد البيع؟\nالمجموع: ${subtotal.toFixed(2)} ₪\n`;
    if (discount > 0) {
        confirmMessage += `الخصم: -${discount.toFixed(2)} ₪\n`;
    }
    confirmMessage += `الإجمالي: ${total.toFixed(2)} ₪\n`;
    confirmMessage += `💳 المدفوع: ${totalPaid.toFixed(2)} ₪\n`;
    if (remaining > 0) {
        confirmMessage += `📌 المتبقي: ${remaining.toFixed(2)} ₪\n`;
    }
    confirmMessage += `📌 نوع البيع: ${saleLabels[saleType]}\n`;
    confirmMessage += `💳 طريقة الدفع: ${paymentLabels[paymentMethod]}`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const invoiceNumber = 'INV-' + String(Date.now()).slice(-6);
        
        const invoiceData = {
            invoiceNumber: invoiceNumber,
            customerName: saleType === 'cash' ? 'كاش' : customerName,
            customerPhone: saleType === 'cash' ? '' : customerPhone,
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                serial: item.serial || ''
            })),
            subtotal,
            discount,
            total,
            paidAmount: totalPaid,
            remainingAmount: remaining,
            saleType: saleType,
            paymentMethod: paymentMethod,
            paymentDetails: {
                cash: paidCash,
                wallet: paidWallet
            },
            cashier: currentUser.email,
            status: saleType === 'debt' && remaining > 0 ? 'debt' : 'completed',
            createdAt: serverTimestamp()
        };

        // 🔹 حفظ في قواعد مختلفة حسب نوع البيع
        let collectionName = 'invoices_cash';
        if (saleType === 'debt' && remaining > 0) {
            collectionName = 'invoices_debt';
        } else if (saleType === 'cash') {
            collectionName = 'invoices_cash';
        }
        
        // حفظ في collection المخصص
        await addDoc(collection(db, collectionName), invoiceData);
        
        // حفظ نسخة في الـ invoices الرئيسية
        await addDoc(collection(db, 'invoices'), invoiceData);

        // تحديث المخزون
        for (const item of cart) {
            const productRef = doc(db, 'products', item.id);
            await updateDoc(productRef, {
                quantity: increment(-item.quantity),
                sales: increment(item.quantity)
            });
        }

        // 🔹 إضافة/تحديث العميل فقط في حالة الأجل
        if (saleType === 'debt' && customerPhone) {
            const q = query(collection(db, 'customers'));
            const snapshot = await getDocs(q);
            let customerId = null;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.phone === customerPhone) {
                    customerId = doc.id;
                }
            });

            const customerData = {
                name: customerName,
                phone: customerPhone,
                updatedAt: serverTimestamp()
            };

            if (saleType === 'debt' && remaining > 0) {
                customerData.balance = increment(remaining);
            }

            if (customerId) {
                await updateDoc(doc(db, 'customers', customerId), customerData);
            } else {
                customerData.createdAt = serverTimestamp();
                customerData.balance = (saleType === 'debt' && remaining > 0) ? remaining : 0;
                await addDoc(collection(db, 'customers'), customerData);
            }
        }

        // إرسال الفاتورة للعميل (WhatsApp) فقط في حالة الأجل
        if (saleType === 'debt' && customerPhone) {
            const message = createInvoiceMessage(invoiceData);
            const whatsappUrl = `https://wa.me/${customerPhone.replace(/^0/, '20')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }

        // طباعة الفاتورة
        printInvoice(invoiceData);

        // تنظيف السلة
        cart = [];
        discount = 0;
        document.getElementById('paidCash').value = '0';
        document.getElementById('paidWallet').value = '0';
        document.getElementById('customerSearch').value = '';
        document.getElementById('customerPhoneInput').value = '';
        document.getElementById('selectedCustomerId').value = '';
        document.getElementById('selectedCustomerName').value = '';
        document.getElementById('customerStatus').textContent = '🔍';
        document.getElementById('customerStatus').className = 'customer-status';
        document.getElementById('balanceInfo').classList.remove('show');
        document.getElementById('balanceInfo').classList.add('hidden');
        selectedCustomer = null;
        updateCart();

        showToast('✅ تم إتمام البيع بنجاح!', 'success');

    } catch (error) {
        console.error('❌ Checkout error:', error);
        showToast('❌ حدث خطأ في إتمام البيع', 'error');
    }
});

// ============================================
// 📝 رسالة الواتساب - نسخة احترافية
// ============================================
function createInvoiceMessage(invoice) {
    const saleLabels = {
        'cash': 'كاش',
        'debt': 'أجل (مستحق عليه)'
    };

    const paymentLabels = {
        'cash': 'نقدي',
        'wallet': 'محفظة إلكترونية',
        'mixed': `مختلط (نقدي: ${invoice.paymentDetails?.cash?.toFixed(2) || '0'} ₪ + محفظة: ${invoice.paymentDetails?.wallet?.toFixed(2) || '0'} ₪)`
    };

    const line = '═══════════════════════════';
    const dash = '───────────────────────────';

    let message = `- *براند فون OS - فاتورة*\n`;
    message += `${line}\n`;
    message += `- رقم: ${invoice.invoiceNumber}\n`;
    message += `- العميل: ${invoice.customerName}\n`;
    message += `- ${invoice.customerPhone || 'لا يوجد'}\n`;
    message += `${dash}\n`;
    
    invoice.items.forEach((item, index) => {
        message += `- ${item.name} × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} ₪\n`;
        if (item.serial) {
            message += `   - سيريال: ${item.serial}\n`;
        }
        if (item.imei) {
            message += `   - IMEI: ${item.imei}\n`;
        }
    });
    
    message += `${dash}\n`;
    message += `- المجموع: ${invoice.subtotal.toFixed(2)} ₪\n`;
    if (invoice.discount > 0) {
        message += `- الخصم: -${invoice.discount.toFixed(2)} ₪\n`;
    }
    message += `- *الإجمالي: ${invoice.total.toFixed(2)} ₪*\n`;
    message += `- المدفوع: ${invoice.paidAmount.toFixed(2)} ₪\n`;
    if (invoice.remainingAmount > 0) {
        message += `- المتبقي: ${invoice.remainingAmount.toFixed(2)} ₪\n`;
    }
    message += `- نوع البيع: ${saleLabels[invoice.saleType] || invoice.saleType}\n`;
    message += `- طريقة الدفع: ${paymentLabels[invoice.paymentMethod] || invoice.paymentMethod}\n`;
    message += `${line}\n`;
    message += `- براند فون - شكراً لثقتكم -\n`;
    message += `- براند فون | - ${invoice.phone || '01144898934'}\n`;
    message += `- العنوان: ${invoice.address || 'براند فون '}\n`;
    message += `- الموقع: ${invoice.website || 'https://os-br.pages.dev/'}\n`;
    message += `${line}`;
    
    return message;
}

// ============================================
// 🖨️ طباعة الفاتورة
// ============================================
function printInvoice(invoice) {
    const saleLabels = {
        'cash': 'كاش',
        'debt': 'أجل (مستحق عليه)'
    };

    const paymentLabels = {
        'cash': 'نقدي',
        'wallet': 'محفظة إلكترونية',
        'mixed': `مختلط (نقدي: ${invoice.paymentDetails?.cash?.toFixed(2) || '0'} ₪ + محفظة: ${invoice.paymentDetails?.wallet?.toFixed(2) || '0'} ₪)`
    };

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>فاتورة - ${invoice.invoiceNumber}</title>
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 30px; max-width: 400px; margin: auto; }
                .header { text-align: center; border-bottom: 2px solid #d4a843; padding-bottom: 15px; }
                .header h1 { color: #000; margin: 0; }
                .header h1 span { color: #d4a843; }
                .header .store { color: #666; font-size: 14px; }
                .details { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; }
                .items { margin: 15px 0; }
                .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .item .serial { font-size: 11px; color: #999; }
                .total { margin-top: 15px; border-top: 2px solid #d4a843; padding-top: 15px; }
                .total .final { font-size: 22px; font-weight: 900; color: #d4a843; }
                .payment { margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 8px; }
                .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; }
                .debt-text { color: #ef4444; font-weight: 700; }
                .remaining-text { color: #ef4444; font-weight: 700; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>براند فون <span>OS</span></h1>
                <div class="store">📍 براند فون | 📞 01144898934</div>
            </div>
            
            <div class="details">
                <div>📋 رقم الفاتورة: <strong>${invoice.invoiceNumber}</strong></div>
                <div>👤 العميل: <strong>${invoice.customerName}</strong></div>
                ${invoice.customerPhone ? `<div>📱 ${invoice.customerPhone}</div>` : ''}
                <div>📅 ${new Date().toLocaleString('ar-EG')}</div>
            </div>

            <div class="items">
                ${invoice.items.map(item => `
                    <div class="item">
                        <div>
                            <div>${item.name} × ${item.quantity}</div>
                            ${item.serial ? `<div class="serial">🔢 سيريال: ${item.serial}</div>` : ''}
                        </div>
                        <span>${(item.price * item.quantity).toFixed(2)} ₪</span>
                    </div>
                `).join('')}
            </div>

            <div class="total">
                <div style="display:flex; justify-content:space-between;">
                    <span>المجموع</span>
                    <span>${invoice.subtotal.toFixed(2)} ₪</span>
                </div>
                ${invoice.discount > 0 ? `
                    <div style="display:flex; justify-content:space-between; color:#ef4444;">
                        <span>الخصم</span>
                        <span>-${invoice.discount.toFixed(2)} ₪</span>
                    </div>
                ` : ''}
                <div style="display:flex; justify-content:space-between; font-size:22px; font-weight:900; color:#d4a843; margin-top:10px; padding-top:10px; border-top:2px solid #d4a843;">
                    <span>الإجمالي</span>
                    <span>${invoice.total.toFixed(2)} ₪</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                    <span>💳 المدفوع</span>
                    <span>${invoice.paidAmount.toFixed(2)} ₪</span>
                </div>
                ${invoice.remainingAmount > 0 ? `
                    <div style="display:flex; justify-content:space-between; color:#ef4444; font-weight:700;">
                        <span>📌 المتبقي</span>
                        <span>${invoice.remainingAmount.toFixed(2)} ₪</span>
                    </div>
                ` : ''}
            </div>

            <div class="payment">
                <div style="display:flex; justify-content:space-between;">
                    <span>📌 نوع البيع</span>
                    <span>${saleLabels[invoice.saleType] || invoice.saleType}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                    <span>💳 طريقة الدفع</span>
                    <span>${paymentLabels[invoice.paymentMethod] || invoice.paymentMethod}</span>
                </div>
                ${invoice.saleType === 'debt' && invoice.remainingAmount > 0 ? `
                    <div style="display:flex; justify-content:space-between; margin-top:5px; color:#ef4444;">
                        <span>📝 حالة</span>
                        <span>مستحق عليه</span>
                    </div>
                ` : ''}
            </div>

            <div class="footer">
                ✨ براند فون - شكراً لثقتكم ❤️
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ============================================
// 🎯 TOAST
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toastMessage');
    const iconEl = toast.querySelector('.toast-icon');
    
    messageEl.textContent = message;
    toast.className = 'toast';
    
    if (type === 'error') {
        toast.classList.add('error');
        iconEl.textContent = '❌';
    } else {
        iconEl.textContent = '✅';
    }
    
    toast.classList.add('show');
    
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// 📷 الباركود
// ============================================
document.getElementById('barcodeBtn').addEventListener('click', () => {
    showToast('📷 جارٍ فتح الكاميرا لمسح الباركود...', 'success');
    setTimeout(() => {
        const barcode = prompt('📷 أدخل الباركود (محاكاة):');
        if (barcode) {
            const product = products.find(p => p.barcode === barcode);
            if (product) {
                window.addToCart(product.id);
            } else {
                showToast('❌ المنتج غير موجود', 'error');
            }
        }
    }, 500);
});

// ============================================
// ⌨️ اختصارات لوحة المفاتيح
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        document.getElementById('clearCartBtn').click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        document.getElementById('discountBtn').click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        document.getElementById('checkoutBtn').click();
    }
});

document.getElementById('discountModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDiscountModal();
    }
});

console.log('✅ POS loaded successfully');


