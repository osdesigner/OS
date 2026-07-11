// ==================== تكوين Firebase ====================
const firebaseConfig = {
    apiKey: "AIzaSyAvLmzn4rnQrPrIeP40wzgbXqDy5xMhO7o",
    authDomain: "stor-121.firebaseapp.com",
    projectId: "stor-121",
    storageBucket: "stor-121.firebasestorage.app",
    messagingSenderId: "944316047610",
    appId: "1:944316047610:web:8ceeab3664e0e25d0da943"
};

// ثوابت التخزين
const STORAGE_KEYS = {
    PRODUCTS: 'products',
    INVOICES: 'offline_invoices'
};

let allProducts = [];
let selectedProducts = [];
let cart = [];
let selectedPayment = 'cash';
let discount = 0;
let currentSaleData = null;
let isOnline = navigator.onLine;

// ==================== دوال التخزين المحلي ====================
function saveProductsToLocal() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(allProducts));
}

function updateDate(){

    const now = new Date();
    document.getElementById("dateNow").innerHTML =
    now.toLocaleString('ar-EG', {
        weekday:'long',
        year:'numeric',
        month:'long',
        day:'numeric',
        hour:'2-digit',
        minute:'2-digit',
        second:'2-digit',
        hour12:true
    });
}
updateDate();
setInterval(updateDate,1000);

function loadProductsFromLocal() {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved && JSON.parse(saved).length > 0) {
        allProducts = JSON.parse(saved);
        console.log("📦 تم تحميل المنتجات من localStorage:", allProducts.length);
        return true;
    }
    return false;
}

function saveInvoiceToLocal(invoiceData) {
    const savedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    invoices.push(invoiceData);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    console.log("💾 تم حفظ الفاتورة محلياً:", invoiceData.invoiceNumber);
}

function getLocalInvoices() {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return saved ? JSON.parse(saved) : [];
}

function clearLocalInvoices() {
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    console.log("🗑️ تم مسح الفواتير المحلية");
}

// ==================== دوال المزامنة مع Firebase ====================

// جلب المنتجات من Firebase
async function fetchProductsFromFirebase() {
    if (!isOnline) return false;
    
    try {
        const url = 'https://firestore.googleapis.com/v1/projects/stor-121/databases/(default)/documents/products';
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            const firebaseProducts = [];
            
            if (data.documents) {
                for (const doc of data.documents) {
                    const fields = doc.fields;
                    const docId = doc.name.split('/').pop();
                    
                    let quantity = 0;
                    if (fields.quantity) {
                        if (fields.quantity.integerValue !== undefined) {
                            quantity = parseInt(fields.quantity.integerValue);
                        }
                    }
                    
                    let bayprice = 0;
                    if (fields.Bayprice) {
                        if (fields.Bayprice.integerValue !== undefined) {
                            bayprice = parseInt(fields.Bayprice.integerValue);
                        }
                    }
                    
                    const product = {
                        id: docId,
                        name: fields.name?.stringValue || "منتج بدون اسم",
                        barcode: fields.barcode?.stringValue || "",
                        Bayprice: bayprice,
                        quantity: quantity,
                        description: fields.description?.stringValue || "",
                        imageUrl: fields.imageUrl?.stringValue || "",
                        Purchaseprice: fields.Purchaseprice?.integerValue || 0
                    };
                    
                    if (product.name && product.name.trim() !== "") {
                        firebaseProducts.push(product);
                    }
                }
            }
            
            if (firebaseProducts.length > 0) {
                // دمج مع المنتجات المحلية
                const localMap = new Map();
                allProducts.forEach(p => localMap.set(p.id, p));
                
                for (const fbProduct of firebaseProducts) {
                    if (localMap.has(fbProduct.id)) {
                        fbProduct.quantity = localMap.get(fbProduct.id).quantity;
                    }
                    localMap.set(fbProduct.id, fbProduct);
                }
                
                allProducts = Array.from(localMap.values());
                saveProductsToLocal();
                updateProductsCount();
                console.log("✅ تم جلب المنتجات من Firebase:", allProducts.length);
                return true;
            }
        }
    } catch (error) {
        console.error("❌ خطأ في جلب المنتجات:", error);
    }
    return false;
}

// تحديث كمية منتج واحد في Firebase (PATCH - تعديل فقط)
async function updateProductQuantityInFirebase(productId, newQuantity) {
    if (!isOnline) return false;
    
    try {
        const url = `https://firestore.googleapis.com/v1/projects/stor-121/databases/(default)/documents/products/${productId}?updateMask.fieldPaths=quantity`;
        
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    quantity: { integerValue: newQuantity }
                }
            })
        });
        
        if (response.ok) {
            console.log(`✅ تم تحديث كمية المنتج ${productId} إلى ${newQuantity}`);
            return true;
        } else {
            console.error(`❌ فشل تحديث المنتج ${productId}:`, await response.text());
            return false;
        }
    } catch (err) {
        console.error(`❌ خطأ في تحديث المنتج ${productId}:`, err);
        return false;
    }
}

// رفع الفاتورة وتحديث المخزون (للفاتورة الواحدة)
async function syncSingleInvoice(invoice) {
    if (!isOnline) return false;
    
    try {
        // 1. رفع الفاتورة إلى Firebase (ك document جديد)
        const invoiceResponse = await fetch(
            "https://firestore.googleapis.com/v1/projects/stor-121/databases/(default)/documents/sales",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fields: {
                        invoiceNumber: { stringValue: invoice.invoiceNumber },
                        date: { stringValue: invoice.date },
                        subtotal: { integerValue: invoice.subtotal },
                        discount: { integerValue: invoice.discount },
                        total: { integerValue: invoice.total },
                        paymentMethod: { stringValue: invoice.paymentMethod },
                        items: { stringValue: JSON.stringify(invoice.items) },
                        timestamp: { integerValue: invoice.timestamp || Date.now() }
                    }
                })
            }
        );
        
        if (!invoiceResponse.ok) {
            console.error(`❌ فشل رفع الفاتورة ${invoice.invoiceNumber}`);
            return false;
        }
        
        // 2. تحديث كميات المنتجات في Firebase (لكل منتج في الفاتورة)
        for (const item of invoice.items) {
            // نحتاج للحصول على الكمية الجديدة للمنتج
            // المنتج الموجود في allProducts له الكمية المحدثة
            const product = allProducts.find(p => p.id === item.id);
            if (product) {
                await updateProductQuantityInFirebase(item.id, product.quantity);
            }
        }
        
        console.log(`✅ تمت مزامنة الفاتورة ${invoice.invoiceNumber}`);
        return true;
        
    } catch (error) {
        console.error(`❌ خطأ في مزامنة الفاتورة ${invoice.invoiceNumber}:`, error);
        return false;
    }
}

// رفع جميع الفواتير المخزنة محلياً
async function uploadOfflineInvoices() {
    if (!isOnline) {
        console.log("📡 غير متصل، تأجيل رفع الفواتير");
        return;
    }
    
    const invoices = getLocalInvoices();
    if (invoices.length === 0) {
        console.log("📭 لا توجد فواتير مخزنة محلياً");
        return;
    }
    
    const progressDiv = document.getElementById('syncProgress');
    progressDiv.style.display = 'flex';
    
    try {
        console.log(`🔄 جاري مزامنة ${invoices.length} فاتورة...`);
        let successCount = 0;
        
        // مزامنة كل فاتورة على حدة
        for (const invoice of invoices) {
            const success = await syncSingleInvoice(invoice);
            if (success) {
                successCount++;
            }
        }
        
        if (successCount > 0) {
            // بعد نجاح المزامنة، امسح الفواتير المحلية
            clearLocalInvoices();
            showToast(`✅ تمت مزامنة ${successCount} فاتورة بنجاح`);
            
            // تحديث المنتجات من Firebase للتأكد
            await fetchProductsFromFirebase();
            await updatePendingUI();
        }
        
    } catch (error) {
        console.error("❌ خطأ في رفع الفواتير:", error);
        showToast("❌ فشل رفع بعض الفواتير", true);
    } finally {
        progressDiv.style.display = 'none';
    }
}

// المزامنة الكاملة
async function fullSync() {
    if (!isOnline) {
        showToast("⚠️ لا يوجد اتصال بالإنترنت للمزامنة", true);
        return;
    }
    
    showToast("🔄 جاري المزامنة مع Firebase...");
    
    // 1. رفع الفواتير المخزنة وتحديث المخزون
    await uploadOfflineInvoices();
    
    // 2. جلب أحدث المنتجات من Firebase
    await fetchProductsFromFirebase();
    
    // 3. تحديث الواجهة
    updateProductsCount();
    await updatePendingUI();
    
    showToast("✅ تمت المزامنة بنجاح");
}

async function manualSync() {
    await fullSync();
}

// ==================== تحديث واجهة الفواتير المعلقة ====================
async function updatePendingUI() {
    const invoices = getLocalInvoices();
    const pendingCount = invoices.length;
    const pendingSpan = document.getElementById('pendingCount');
    const pendingList = document.getElementById('pendingInvoicesList');
    const pendingListContent = document.getElementById('pendingInvoicesListContent');
    
    if (pendingCount > 0) {
        pendingSpan.style.display = 'inline-block';
        pendingSpan.textContent = pendingCount;
        pendingList.classList.add('active');
        
        pendingListContent.innerHTML = invoices.map(inv => `
            <div style="font-size: 0.8rem; padding: 5px; border-bottom: 1px solid #eee;">
                <i class="fas fa-receipt"></i> ${inv.invoiceNumber}<br>
                <small>${new Date(inv.timestamp).toLocaleString()}</small>
            </div>
        `).join('');
        
        setTimeout(() => {
            pendingList.classList.remove('active');
        }, 5000);
    } else {
        pendingSpan.style.display = 'none';
        pendingList.classList.remove('active');
    }
}

// ==================== حالة الاتصال ====================
function updateConnectionStatus() {
    isOnline = navigator.onLine;
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const offlineBanner = document.getElementById('offlineBanner');
    
    if (isOnline) {
        statusDot.className = 'online-status';
        statusText.innerHTML = 'متصل';
        offlineBanner.style.display = 'none';
        fullSync();
    } else {
        statusDot.className = 'offline-status';
        statusText.innerHTML = 'غير متصل';
        offlineBanner.style.display = 'flex';
    }
}

// ==================== البحث والاقتراحات ====================
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestionsBox');

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    if (searchTerm.length === 0) {
        suggestionsBox.classList.remove('active');
        return;
    }

    const suggestions = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm))
    ).slice(0, 8);

    if (suggestions.length === 0) {
        suggestionsBox.classList.remove('active');
        return;
    }

    suggestionsBox.innerHTML = suggestions.map(p => `
        <div class="suggestion-item" onclick="addSelectedProduct('${p.id}')">
            ${p.imageUrl ? `<img src="${p.imageUrl}" class="suggestion-image" onerror="this.style.display='none'">` : ''}
            <div class="suggestion-info">
                <div class="suggestion-name">${p.name}</div>
                <div class="suggestion-barcode"><i class="fas fa-barcode"></i> ${p.barcode || 'بدون باركود'}</div>
                <div class="product-stock ${p.quantity <= 5 ? 'low' : 'normal'}">
                    <i class="fas fa-boxes"></i> المتبقي: ${p.quantity}
                </div>
            </div>
            <div class="suggestion-price">${Number(p.Bayprice).toLocaleString()} ج.م</div>
        </div>
    `).join('');
    suggestionsBox.classList.add('active');
});

function addSelectedProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showToast("المنتج غير موجود!", true);
        return;
    }

    if (product.quantity <= 0) {
        showToast(`⚠️ المنتج "${product.name}" غير متوفر بالمخزون!`, true);
        return;
    }

    const existing = selectedProducts.find(p => p.id === productId);
    if (existing) {
        if (existing.quantity + 1 > product.quantity) {
            showToast(`المتوفر من "${product.name}" هو ${product.quantity} فقط`, true);
            return;
        }
        existing.quantity++;
    } else {
        selectedProducts.push({
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            description: product.description,
            imageUrl: product.imageUrl,
            price: Number(product.Bayprice),
            quantity: 1,
            maxQuantity: product.quantity
        });
    }

    updateSelectedProductsUI();
    updateCart();
    searchInput.value = '';
    suggestionsBox.classList.remove('active');
    showToast(`✅ تم إضافة ${product.name}`);
}

function updateSelectedProductsUI() {
    const container = document.getElementById('selectedProducts');
    if (selectedProducts.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>لم يتم إضافة أي منتج</p></div>';
        return;
    }

    container.innerHTML = selectedProducts.map(p => `
        <div class="selected-product-item">
            <div class="selected-product-info">
                <div class="selected-product-name">${p.name}</div>
                <div class="selected-product-price">${Number(p.price).toLocaleString()} ج.م</div>
                ${p.barcode ? `<div style="font-size: 0.7rem; color: #6c757d;">باركود: ${p.barcode}</div>` : ''}
            </div>
            <div class="selected-product-controls">
                <button class="btn-qty" onclick="updateSelectedQty('${p.id}', -1)">-</button>
                <span style="min-width: 35px; text-align: center; font-weight: 800;">${p.quantity}</span>
                <button class="btn-qty" onclick="updateSelectedQty('${p.id}', 1)">+</button>
                <button class="btn-remove-selected" onclick="removeSelectedProduct('${p.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function updateSelectedQty(productId, delta) {
    const product = selectedProducts.find(p => p.id === productId);
    if (!product) return;
    
    const originalProduct = allProducts.find(p => p.id === productId);
    const newQty = product.quantity + delta;
    
    if (newQty < 1) {
        removeSelectedProduct(productId);
        return;
    }
    if (newQty > originalProduct.quantity) {
        showToast(`المتوفر من "${originalProduct.name}" هو ${originalProduct.quantity} فقط`, true);
        return;
    }
    
    product.quantity = newQty;
    updateSelectedProductsUI();
    updateCart();
}

function removeSelectedProduct(productId) {
    selectedProducts = selectedProducts.filter(p => p.id !== productId);
    updateSelectedProductsUI();
    updateCart();
}

function updateCart() {
    cart = [...selectedProducts];
    updateCartUI();
    updateTotals();
}

function updateCartUI() {
    const cartItemsDiv = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-basket"></i><p>السلة فارغة</p></div>';
        return;
    }

    cartItemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <div style="font-weight: 800;">${item.name}</div>
                <div style="font-size: 0.8rem; color: #ff6b6b;">${Number(item.price).toLocaleString()} ج.م</div>
                ${item.barcode ? `<div style="font-size: 0.7rem; color: #6c757d;">${item.barcode}</div>` : ''}
            </div>
            <div><i class="fas fa-times"></i> ${item.quantity}</div>
            <div style="font-weight: 800;">${(item.price * item.quantity).toLocaleString()} ج.م</div>
        </div>
    `).join('');
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    discount = parseFloat(document.getElementById('discount').value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    document.getElementById('subtotal').textContent = subtotal.toLocaleString() + " ج.م";
    document.getElementById('totalAmount').textContent = total.toLocaleString() + " ج.م";
    
    if (selectedPayment === 'mixed') {
        updateMixedPayment();
    }
}

function selectPayment(payment) {
    selectedPayment = payment;
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`.payment-option[data-payment="${payment}"]`).classList.add('selected');
    
    const mixedDetails = document.getElementById('mixedPaymentDetails');
    mixedDetails.classList.toggle('active', payment === 'mixed');
}

function updateMixedPayment() {
    const totalText = document.getElementById('totalAmount').textContent;
    const total = parseFloat(totalText.replace(/[^\d]/g, '')) || 0;
    const cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
    const vodafoneAmount = parseFloat(document.getElementById('vodafoneAmount').value) || 0;
    const totalPaid = cashAmount + vodafoneAmount;
    const errorDiv = document.getElementById('mixedError');
    
    if (totalPaid !== total) {
        errorDiv.innerHTML = `⚠️ يجب أن يساوي المبلغ ${total.toLocaleString()} ج.م`;
        return false;
    }
    errorDiv.innerHTML = '✓ المبلغ صحيح';
    errorDiv.style.color = '#28a745';
    return true;
}

function generateInvoiceNumber() {
    return 'INV-' + Date.now().toString().slice(-8) + '-' + Math.floor(100 + Math.random() * 900);
}

function getCurrentDateTime() {
    return new Date().toLocaleString('ar-EG', { hour12: true });
}

// ==================== عملية البيع ====================
async function processSale() {
    if (cart.length === 0) {
        showToast("⚠️ أضف منتجات أولاً!", true);
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = Math.max(0, subtotal - discount);
    
    let paymentDetails = { method: selectedPayment };
    
    if (selectedPayment === 'mixed') {
        const cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
        const vodafoneAmount = parseFloat(document.getElementById('vodafoneAmount').value) || 0;
        if (cashAmount + vodafoneAmount !== total) {
            showToast("⚠️ مجموع المدفوعات لا يساوي الإجمالي", true);
            return;
        }
        paymentDetails = { cash: cashAmount, vodafone: vodafoneAmount };
    }
    
    // تحديث المخزون المحلي (تخصم الكمية)
    for (const item of cart) {
        const product = allProducts.find(p => p.id === item.id);
        if (product) {
            product.quantity -= item.quantity;
            console.log(`📦 ${product.name}: ${product.quantity + item.quantity} → ${product.quantity}`);
        }
    }
    saveProductsToLocal();
    
    const invoiceNumber = generateInvoiceNumber();
    const saleData = {
        invoiceNumber: invoiceNumber,
        date: getCurrentDateTime(),
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            barcode: item.barcode || "",
            description: item.description || "",
            price: item.price,
            quantity: item.quantity
        })),
        subtotal: subtotal,
        discount: discount,
        total: total,
        paymentMethod: selectedPayment,
        paymentDetails: paymentDetails,
        timestamp: Date.now()
    };
    
    // حفظ الفاتورة محلياً
    saveInvoiceToLocal(saleData);
    
    if (isOnline) {
        // إذا كان متصل، حاول المزامنة فوراً
        await fullSync();
        showToast(`✅ تمت عملية البيع - ${invoiceNumber}`);
    } else {
        showToast(`⚠️ تمت عملية البيع (وضع الأوفلاين - سيتم المزامنة عند عودة النت) - ${invoiceNumber}`);
    }
    
    currentSaleData = saleData;
    showInvoiceModal(saleData);
    
    await updatePendingUI();
    
    // تنظيف السلة
    selectedProducts = [];
    cart = [];
    document.getElementById('discount').value = 0;
    document.getElementById('cashAmount').value = 0;
    document.getElementById('vodafoneAmount').value = 0;
    updateSelectedProductsUI();
    updateCartUI();
    updateTotals();
    updateProductsCount();
}

function generateInvoiceHTML(saleData) {
    let paymentText = '';
    if (saleData.paymentMethod === 'cash') {
        paymentText = `<div style="background: #d4edda; padding: 12px; border-radius: 15px; margin: 15px 0; text-align: center;">
            <strong>دفع نقدي:</strong> ${Number(saleData.total).toLocaleString()} ج.م
        </div>`;
    } else if (saleData.paymentMethod === 'vodafone') {
        paymentText = `<div style="background: #d1ecf1; padding: 12px; border-radius: 15px; margin: 15px 0; text-align: center;">
            <strong>فودافون كاش:</strong> ${Number(saleData.total).toLocaleString()} ج.م
        </div>`;
    } else {
        paymentText = `<div style="background: #fff3cd; padding: 12px; border-radius: 15px; margin: 15px 0;">
            <strong>دفع مختلط</strong><br>
            كاش: ${Number(saleData.paymentDetails.cash).toLocaleString()} ج.م<br>
            فودافون كاش: ${Number(saleData.paymentDetails.vodafone).toLocaleString()} ج.م
        </div>`;
    }

    return `
        <div style="text-align: center; margin-bottom: 25px;">
            <i class="fas fa-store" style="font-size: 3rem; color: #ff6b6b;"></i>
            <h3>براند فون</h3>
            <p style="font-size: 0.8rem;">شكراً لتسوقكم معنا</p>
        </div>
        <div style="border-bottom: 1px dashed #dee2e6; margin-bottom: 20px;">
            <p><strong>التاريخ:</strong> ${saleData.date}</p>
            <p><strong>رقم الفاتورة:</strong> <span style="color: #ff6b6b; font-weight: 800;">${saleData.invoiceNumber}</span></p>
        </div>
        <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8f9fa;">
                    <th style="padding: 10px;">المنتج</th>
                    <th style="padding: 10px;">الباركود</th>
                    <th style="padding: 10px;">الكمية</th>
                    <th style="padding: 10px;">السعر</th>
                    <th style="padding: 10px;">الإجمالي</th>
                  </tr>
            </thead>
            <tbody>
                ${saleData.items.map(item => `
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 8px;">
                            ${item.name}
                            ${item.description ? `<br><small style="color:#666;">${item.description}</small>` : ''}
                        </td>
                        <td style="padding: 8px;">${item.barcode || '-'}</td>
                        <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                        <td style="padding: 8px;">${Number(item.price).toLocaleString()}</td>
                        <td style="padding: 8px;">${(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                `).join('')}
            </tbody>
        </table>
        ${paymentText}
        <div style="border-top: 2px solid #dee2e6; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between;">
                <span>المجموع:</span>
                <span>${Number(saleData.subtotal).toLocaleString()} ج.م</span>
            </div>
            ${saleData.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #dc3545;">
                <span>الخصم:</span>
                <span>- ${Number(saleData.discount).toLocaleString()} ج.م</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 800; margin-top: 10px;">
                <span>الإجمالي:</span>
                <span>${Number(saleData.total).toLocaleString()} ج.م</span>
            </div>
        </div>
        <div style="text-align: center; margin-top: 25px; font-size: 0.8rem; color: #6c757d;">
            <i class="fas fa-star"></i>للاتصال : 01144898934<i class="fas fa-star"></i>
        </div>
    `;
}

function showInvoiceModal(saleData) {
    document.getElementById('invoiceHTML').innerHTML = generateInvoiceHTML(saleData);
    document.getElementById('invoiceModal').classList.add('active');
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').classList.remove('active');
}

function printInvoiceModal() {
    const printContent = document.getElementById('invoiceHTML').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>فاتورة البيع</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Tajawal', sans-serif; padding: 30px; direction: rtl; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 10px; text-align: right; }
            </style>
        </head>
        <body>${printContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function printInvoice() {
    if (currentSaleData) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html dir="rtl">
            <head>
                <title>فاتورة البيع</title>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Tajawal', sans-serif; padding: 30px; direction: rtl; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: right; }
                </style>
            </head>
            <body>${generateInvoiceHTML(currentSaleData)}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    } else {
        showToast("⚠️ لا توجد فاتورة للطباعة", true);
    }
}

function sendWhatsApp() {

    if (cart.length === 0) {
        showToast("⚠️ أضف منتجات أولاً!", true);
        return;
    }

    const customerName =
    document.getElementById("customerName").value.trim();

    let customerPhone =
    document.getElementById("customerPhone").value.trim();

    if (!customerName) {
        showToast("اكتب اسم العميل", true);
        return;
    }

    if (!customerPhone) {
        showToast("اكتب رقم العميل", true);
        return;
    }

    customerPhone = customerPhone.replace(/\D/g, '');

    const subtotal = cart.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
    );

    const total = Math.max(0, subtotal - discount);

    const invoiceNumber = generateInvoiceNumber();

let message = `╭━━━〔 📱 براند فون - os 〕━━━╮\n\n`;

message += `✨ أهلاً ${customerName}\n`;
message += `شكراً لثقتك وتعاملـك مع براند فون - os ❤️\n\n`;

message += `🧾 رقم الفاتورة : ${invoiceNumber}\n`;
message += `📅 التاريخ : ${getCurrentDateTime()}\n\n`;

message += `━━━━━━━━━━━━━━━━━━\n`;
message += `📦 تفاصيل الطلب\n`;
message += `━━━━━━━━━━━━━━━━━━\n\n`;

cart.forEach(item => {

    message += `📱 ${item.name}\n`;

    if(item.barcode){
        message += `🔖 الباركود : ${item.barcode}\n`;
    }

    message += `🔢 الكمية : ${item.quantity}\n`;

    message += `💵 السعر : ${Number(item.price).toLocaleString()} ج.م\n`;

    message += `💰 الإجمالي : ${(item.price * item.quantity).toLocaleString()} ج.م\n`;

    message += `────────────────\n`;

});

message += `\n💳 المجموع : ${subtotal.toLocaleString()} ج.م\n`;

if(discount > 0){

    message += `🎁 الخصم : ${discount.toLocaleString()} ج.م\n`;

}

message += `✅ الإجمالي النهائي : ${total.toLocaleString()} ج.م\n`;

message += `\n━━━━━━━━━━━━━━━━━━\n`;

message += `🏪 براند فون - os\n\n`;

message += `📍 العنوان:\n`;
message += `مركز بدر - البحيرة\n`;
message += `بجانب كشري نجمة بدر القديمة\n\n`;

message += `📞 رقم التواصل:\n`;
message += `01144898934\n\n`;

message += `🗺️ لوكيشن المحل:\n`;
message += `https://maps.app.goo.gl/Cis2ZhdHxoC3KwEr5\n\n`;

message += `🌐 الموقع الرسمي:\n`;
message += `https://os-br.pages.dev/\n\n`;

message += `🖼️ شعار Brand Phone:\n`;
message += `https://os-br.pages.dev/icone.png\n\n`;

message += `🌟 نتشرف بزيارتكم دائماً 🌟\n`;

message += `╰━━━〔 براند فون - os ❤️ 〕━━━╯`;

    const whatsappURL =
    `https://wa.me/2${customerPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, '_blank');
}

function updateProductsCount() {
    const countSpan = document.getElementById('productsCount');
    if (countSpan) countSpan.textContent = allProducts.length + ' منتج';
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = isError ? '#dc3545' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== ربط الدوال العامة ====================
window.addSelectedProduct = addSelectedProduct;
window.updateSelectedQty = updateSelectedQty;
window.removeSelectedProduct = removeSelectedProduct;
window.selectPayment = selectPayment;
window.updateMixedPayment = updateMixedPayment;
window.processSale = processSale;
window.closeInvoiceModal = closeInvoiceModal;
window.printInvoiceModal = printInvoiceModal;
window.printInvoice = printInvoice;
window.sendWhatsApp = sendWhatsApp;
window.manualSync = manualSync;

// ==================== مراقبة حالة الاتصال ====================
window.addEventListener('online', () => {
    updateConnectionStatus();
    showToast("✅ تم استعادة الاتصال - جاري المزامنة التلقائية");
});

window.addEventListener('offline', () => {
    updateConnectionStatus();
    showToast("⚠️ تم فقدان الاتصال - سيتم تخزين الفواتير محلياً", true);
});

document.getElementById('discount')?.addEventListener('input', updateTotals);

document.addEventListener('click', (e) => {
    if (searchInput && !searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.remove('active');
    }
});

// ==================== تهيئة التطبيق ====================
async function init() {
    // تحميل المنتجات من localStorage أولاً
    const hasLocalProducts = loadProductsFromLocal();
    
    // إذا كان هناك اتصال، جلب المنتجات من Firebase
    if (isOnline) {
        await fetchProductsFromFirebase();
        // محاولة مزامنة أي فواتير مخزنة
        await uploadOfflineInvoices();
    } else if (!hasLocalProducts) {
        // إذا لم توجد منتجات ولا اتصال، نعرض رسالة
        showToast("⚠️ لا توجد منتجات محلية ولا اتصال بالإنترنت", true);
        allProducts = [];
        saveProductsToLocal();
    }
    
    updateConnectionStatus();
    await updatePendingUI();
    selectPayment('cash');
    updateProductsCount();
    
    console.log("🚀 التطبيق جاهز، عدد المنتجات:", allProducts.length);
}

init();