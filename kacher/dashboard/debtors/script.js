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
            orderBy,
            where,
            deleteDoc
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

        const ALLOWED_EMAILS = ['osdesigner5647@gmail.com'];
        let allCustomers = [];
        let filteredCustomers = [];
        let selectedCustomer = null;
        let currentUser = null;

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
            }
        });

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
            document.getElementById('userEmail').textContent = user.email;
            await loadCustomers();
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await signOut(auth);
            localStorage.clear();
            window.location.href = 'index.html';
        });

        // ============================================
        // 📦 تحميل العملاء (من customers + invoices_debt)
        // ============================================
        async function loadCustomers() {
            const customerMap = new Map();

            try {
                // ✅ 1. جلب العملاء من customers
                const customersSnapshot = await getDocs(collection(db, 'customers'));
                
                customersSnapshot.forEach(doc => {
                    const data = doc.data();
                    const phone = data.phone || data.name;
                    customerMap.set(phone, {
                        id: doc.id,
                        name: data.name || 'عميل',
                        phone: data.phone || '',
                        address: data.address || '',
                        balance: data.balance || 0,
                        reason: data.reason || '',
                        createdAt: data.createdAt,
                        fromInvoice: false,
                        ...data
                    });
                });

                // ✅ 2. جلب فواتير الأجل وحساب الرصيد الفعلي
                const debtSnapshot = await getDocs(collection(db, 'invoices_debt'));
                const invoiceDebtMap = new Map();
                
                debtSnapshot.forEach(doc => {
                    const data = doc.data();
                    const customerPhone = data.customerPhone || '';
                    const customerName = data.customerName || 'عميل';
                    
                    const total = data.total || 0;
                    const paidAmount = data.paidAmount || 0;
                    const remaining = total - paidAmount;
                    
                    if (remaining > 0) {
                        if (!invoiceDebtMap.has(customerPhone)) {
                            invoiceDebtMap.set(customerPhone, {
                                name: customerName,
                                phone: customerPhone,
                                totalDebt: 0,
                                invoices: []
                            });
                        }
                        const customerDebt = invoiceDebtMap.get(customerPhone);
                        customerDebt.totalDebt += remaining;
                        customerDebt.invoices.push({
                            invoiceNumber: data.invoiceNumber || doc.id,
                            remaining: remaining
                        });
                        invoiceDebtMap.set(customerPhone, customerDebt);
                    }
                });

                // ✅ 3. دمج البيانات
                invoiceDebtMap.forEach((debtData, phone) => {
                    if (customerMap.has(phone)) {
                        const existing = customerMap.get(phone);
                        const newBalance = -debtData.totalDebt;
                        existing.balance = newBalance;
                        existing.reason = existing.reason + ' | ديون من فواتير: ' + debtData.invoices.map(i => i.invoiceNumber).join(', ');
                        customerMap.set(phone, existing);
                    } else {
                        customerMap.set(phone, {
                            id: 'debt_' + Date.now() + '_' + phone,
                            name: debtData.name,
                            phone: phone,
                            address: '',
                            balance: -debtData.totalDebt,
                            reason: 'من فواتير: ' + debtData.invoices.map(i => i.invoiceNumber).join(', '),
                            createdAt: new Date(),
                            fromInvoice: true,
                            invoices: debtData.invoices
                        });
                    }
                });

                allCustomers = Array.from(customerMap.values());
                applyFilters();
                updateStats();

            } catch (error) {
                console.error('❌ Error loading customers:', error);
                showToast('❌ حدث خطأ في تحميل البيانات', 'error');
            }
        }

        // ============================================
        // 📊 تحديث الإحصائيات
        // ============================================
        function updateStats() {
            document.getElementById('totalDebtors').textContent = allCustomers.length;
            const total = allCustomers.reduce((sum, c) => sum + Math.abs(c.balance), 0);
            document.getElementById('totalDebtAmount').textContent = total.toFixed(2) + ' ₪';
        }

        // ============================================
        // 🔍 تطبيق الفلاتر
        // ============================================
        function applyFilters() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

            filteredCustomers = allCustomers.filter(customer => {
                if (searchTerm) {
                    const nameMatch = customer.name.toLowerCase().includes(searchTerm);
                    const phoneMatch = customer.phone.includes(searchTerm);
                    if (!nameMatch && !phoneMatch) return false;
                }
                return true;
            });

            filteredCustomers.sort((a, b) => a.balance - b.balance);
            renderCustomers();
        }

        // ============================================
        // 🎨 عرض العملاء
        // ============================================
        function renderCustomers() {
            const tbody = document.getElementById('customersTableBody');

            if (filteredCustomers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="empty-state">
                                <span class="icon">✅</span>
                                لا يوجد مدينون
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filteredCustomers.map((customer, index) => {
                const balance = Math.abs(customer.balance);
                const fromInvoice = customer.fromInvoice || false;

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <strong>${customer.name}</strong>
                            ${fromInvoice ? '<span class="badge-from-invoice">📄 من فاتورة</span>' : ''}
                        </td>
                        <td>${customer.phone || 'لا يوجد'}</td>
                        <td class="amount-debt">${balance.toFixed(2)} ₪</td>
                        <td><span class="badge-debt">📝 عليه</span></td>
                        <td>
                            <div class="actions-cell">
                                <button class="action-btn invoice-btn" onclick="window.viewCustomerDetails('${customer.id}')">
                                    🧾 فواتير
                                </button>
                                <button class="action-btn pay-btn" onclick="window.openSettlementModal('${customer.id}')">
                                    💰 تسوية
                                </button>
                                ${!customer.fromInvoice ? `
                                    <button class="action-btn delete-btn" onclick="window.deleteCustomer('${customer.id}')">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ============================================
        // 🔍 البحث
        // ============================================
        document.getElementById('searchInput').addEventListener('input', applyFilters);

        // ============================================
        // ➕ إضافة مدين جديد
        // ============================================
        document.getElementById('addDebtBtn').addEventListener('click', () => {
            document.getElementById('addDebtModal').classList.add('show');
            document.getElementById('addDebtForm').reset();
        });

        document.getElementById('closeAddModalBtn').addEventListener('click', () => {
            document.getElementById('addDebtModal').classList.remove('show');
        });

        document.getElementById('cancelAddBtn').addEventListener('click', () => {
            document.getElementById('addDebtModal').classList.remove('show');
        });

        document.getElementById('addDebtModal').addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });

        document.getElementById('addDebtForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('debtName').value.trim();
            const phone = document.getElementById('debtPhone').value.trim();
            const address = document.getElementById('debtAddress').value.trim();
            const amount = parseFloat(document.getElementById('debtAmount').value);
            const reason = document.getElementById('debtReason').value.trim();

            if (!name || !phone || isNaN(amount) || amount <= 0) {
                showToast('⚠️ يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }

            try {
                await addDoc(collection(db, 'customers'), {
                    name: name,
                    phone: phone,
                    address: address || '',
                    balance: -amount,
                    reason: reason || '',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                document.getElementById('addDebtModal').classList.remove('show');
                showToast(`✅ تم إضافة المدين ${name} بمبلغ ${amount.toFixed(2)} ₪`, 'success');

            } catch (error) {
                console.error('❌ Error adding debtor:', error);
                showToast('❌ حدث خطأ في إضافة المدين', 'error');
            }
        });

        // ============================================
        // 🧾 عرض تفاصيل العميل والفواتير
        // ============================================
        window.viewCustomerDetails = async function(customerId) {
            const customer = allCustomers.find(c => c.id === customerId);
            if (!customer) {
                showToast('❌ العميل غير موجود', 'error');
                return;
            }

            document.getElementById('detailName').textContent = customer.name;
            document.getElementById('detailPhone').textContent = customer.phone || 'لا يوجد';
            document.getElementById('detailAddress').textContent = customer.address || 'لا يوجد';

            // ✅ حساب الرصيد الفعلي من الفواتير
            let totalDebt = 0;
            const allInvoices = [];
            const seenInvoiceNumbers = new Set();
            
            try {
                const invoiceCollections = ['invoices', 'invoices_cash', 'invoices_debt'];
                
                for (const collectionName of invoiceCollections) {
                    const q = query(
                        collection(db, collectionName),
                        where('customerPhone', '==', customer.phone)
                    );
                    const snapshot = await getDocs(q);
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const invoiceNumber = data.invoiceNumber || doc.id;
                        
                        if (seenInvoiceNumbers.has(invoiceNumber)) return;
                        seenInvoiceNumbers.add(invoiceNumber);
                        
                        const total = data.total || 0;
                        const paid = data.paidAmount || 0;
                        const remaining = total - paid;
                        
                        if (remaining > 0) {
                            totalDebt += remaining;
                        }
                        
                        allInvoices.push({
                            id: doc.id,
                            ...data,
                            collection: collectionName,
                            remaining: remaining
                        });
                    });
                }
            } catch (error) {
                console.error('❌ Error calculating debt:', error);
            }

            // ✅ عرض الرصيد
            const balanceEl = document.getElementById('detailBalance');
            balanceEl.textContent = `${totalDebt.toFixed(2)} ₪ (عليه)`;
            balanceEl.className = 'value debt';

            document.getElementById('detailStatus').textContent = '📝 مدين';
            document.getElementById('detailStatus').style.color = 'var(--danger)';

            const date = customer.createdAt?.toDate?.() || new Date();
            document.getElementById('detailDate').textContent = date.toLocaleDateString('ar-EG');

            // ============================================
            // عرض الفواتير
            // ============================================
            const invoicesContainer = document.getElementById('customerInvoices');
            
            if (allInvoices.length === 0) {
                invoicesContainer.innerHTML = `
                    <div class="empty-state">
                        <span class="icon">🧾</span>
                        لا توجد فواتير لهذا العميل
                    </div>
                `;
            } else {
                allInvoices.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                let html = '';
                allInvoices.forEach((invoice) => {
                    const date = invoice.createdAt?.toDate?.() || new Date();
                    const total = invoice.total || 0;
                    const paid = invoice.paidAmount || 0;
                    const remaining = invoice.remaining || 0;
                    const items = invoice.items || [];
                    const isDebt = invoice.collection === 'invoices_debt' || invoice.saleType === 'debt';

                    html += `
                        <div class="invoice-card">
                            <div class="invoice-header">
                                <div>
                                    <span class="invoice-number">🧾 ${invoice.invoiceNumber || 'INV-' + invoice.id.slice(0,6)}</span>
                                    <span class="invoice-date">${date.toLocaleDateString('ar-EG')}</span>
                                </div>
                                <span class="invoice-type ${isDebt ? 'debt' : 'cash'}">
                                    ${isDebt ? '📝 أجل' : '💰 كاش'}
                                </span>
                            </div>

                            ${items.length > 0 ? `
                                <table class="invoice-items-table">
                                    <thead>
                                        <tr>
                                            <th>المنتج</th>
                                            <th>الكمية</th>
                                            <th>السعر</th>
                                            <th>الإجمالي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map(item => `
                                            <tr>
                                                <td>${item.name || 'منتج'}</td>
                                                <td>${item.quantity || 1}</td>
                                                <td>${(item.price || 0).toFixed(2)} ₪</td>
                                                <td>${((item.price || 0) * (item.quantity || 1)).toFixed(2)} ₪</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<div style="font-size:12px; color:#999; margin:5px 0;">لا توجد منتجات</div>'}

                            <div class="invoice-summary">
                                <div class="summary-item">
                                    <span class="label">💰 الإجمالي</span>
                                    <span class="value">${total.toFixed(2)} ₪</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">💳 المدفوع</span>
                                    <span class="value">${paid.toFixed(2)} ₪</span>
                                </div>
                                <div class="summary-item">
                                    <span class="label">📌 المتبقي</span>
                                    <span class="value ${remaining > 0 ? 'debt' : 'credit'}">${remaining.toFixed(2)} ₪</span>
                                </div>
                            </div>
                        </div>
                    `;
                });

                invoicesContainer.innerHTML = html;
            }

            // ============================================
            // ✅ سجل الدفعات
            // ============================================
            const logContainer = document.getElementById('settlementLogContent');
            logContainer.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    جاري تحميل سجل الدفعات...
                </div>
            `;

            try {
                const settleQ = query(
                    collection(db, 'settlements'),
                    where('customerId', '==', customer.id)
                );
                const settleSnap = await getDocs(settleQ);
                
                const settlementsList = [];
                settleSnap.forEach(doc => {
                    const data = doc.data();
                    settlementsList.push({
                        id: doc.id,
                        ...data
                    });
                });
                
                settlementsList.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                if (settlementsList.length === 0) {
                    logContainer.innerHTML = `
                        <div class="empty-state" style="padding:15px;">
                            <span class="icon">📋</span>
                            لا توجد دفعات مسجلة
                        </div>
                    `;
                } else {
                    let logHtml = '';
                    settlementsList.forEach(item => {
                        const date = item.createdAt?.toDate?.() || new Date();
                        const isDebt = item.type === 'debt_payment';
                        logHtml += `
                            <div class="log-item">
                                <span class="log-date">${date.toLocaleDateString('ar-EG')} ${date.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                <span>${item.notes || 'تسوية'}</span>
                                <span class="log-amount ${isDebt ? 'debt' : 'credit'}">
                                    ${isDebt ? '-' : '+'}${item.amount?.toFixed(2) || '0.00'} ₪
                                </span>
                            </div>
                        `;
                    });
                    logContainer.innerHTML = logHtml;
                }
            } catch (error) {
                console.error('❌ Error loading settlements:', error);
                logContainer.innerHTML = `
                    <div class="empty-state" style="color:var(--danger);">
                        ⚠️ حدث خطأ في تحميل الدفعات
                    </div>
                `;
            }

            document.getElementById('customerDetailsModal').classList.add('show');
        };

        document.getElementById('closeDetailsModalBtn').addEventListener('click', () => {
            document.getElementById('customerDetailsModal').classList.remove('show');
        });

        document.getElementById('closeDetailsBtn').addEventListener('click', () => {
            document.getElementById('customerDetailsModal').classList.remove('show');
        });

        document.getElementById('customerDetailsModal').addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });

        // ============================================
        // 🎯 مودال تسوية الدين
        // ============================================
        window.openSettlementModal = function(customerId) {
            const customer = allCustomers.find(c => c.id === customerId);
            if (!customer) {
                showToast('❌ العميل غير موجود', 'error');
                return;
            }

            selectedCustomer = customer;

            document.getElementById('settleCustomerName').value = customer.name;
            document.getElementById('settleCustomerPhone').value = customer.phone || 'لا يوجد';

            // ✅ حساب الرصيد الفعلي من الفواتير
            let totalDebt = 0;
            try {
                const debtSnapshot = await getDocs(collection(db, 'invoices_debt'));
                debtSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.customerPhone === customer.phone) {
                        const total = data.total || 0;
                        const paid = data.paidAmount || 0;
                        const remaining = total - paid;
                        if (remaining > 0) {
                            totalDebt += remaining;
                        }
                    }
                });
            } catch (error) {
                console.error('❌ Error calculating debt:', error);
            }

            document.getElementById('settleCurrentBalance').value = `${totalDebt.toFixed(2)} ₪ (عليه)`;
            document.getElementById('settleCurrentBalance').style.color = 'var(--danger)';

            document.getElementById('settleAmount').value = '';
            document.getElementById('settleNotes').value = '';

            document.getElementById('settlementModal').classList.add('show');
        };

        function closeSettlementModal() {
            document.getElementById('settlementModal').classList.remove('show');
            selectedCustomer = null;
        }

        document.getElementById('closeSettleModalBtn').addEventListener('click', closeSettlementModal);
        document.getElementById('cancelSettleBtn').addEventListener('click', closeSettlementModal);

        document.getElementById('settlementModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSettlementModal();
            }
        });

        // ============================================
        // 💰 تأكيد التسوية - النسخة النهائية المصححة
        // ============================================
        document.getElementById('confirmSettleBtn').addEventListener('click', async function() {
            if (!selectedCustomer) {
                showToast('❌ لم يتم اختيار عميل', 'error');
                return;
            }

            const amountInput = document.getElementById('settleAmount');
            const amount = parseFloat(amountInput.value);
            const notes = document.getElementById('settleNotes').value.trim();

            if (isNaN(amount) || amount <= 0) {
                showToast('⚠️ يرجى إدخال مبلغ صحيح', 'error');
                return;
            }

            // ✅ حساب الرصيد الفعلي من الفواتير
            let totalDebt = 0;
            try {
                const debtSnapshot = await getDocs(collection(db, 'invoices_debt'));
                debtSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.customerPhone === selectedCustomer.phone) {
                        const total = data.total || 0;
                        const paid = data.paidAmount || 0;
                        const remaining = total - paid;
                        if (remaining > 0) {
                            totalDebt += remaining;
                        }
                    }
                });
            } catch (error) {
                console.error('❌ Error calculating debt:', error);
            }

            if (amount > totalDebt) {
                showToast(`⚠️ المبلغ (${amount.toFixed(2)} ₪) يتجاوز الرصيد (${totalDebt.toFixed(2)} ₪)`, 'error');
                return;
            }

            if (!confirm(`💰 تأكيد تسوية مبلغ ${amount.toFixed(2)} ₪ للعميل "${selectedCustomer.name}"؟`)) {
                return;
            }

            try {
                const userEmail = auth.currentUser?.email || currentUser?.email || 'غير معروف';

                // ✅ تحديث رصيد العميل في customers
                if (selectedCustomer.fromInvoice) {
                    const newBalance = -(totalDebt - amount);
                    await addDoc(collection(db, 'customers'), {
                        name: selectedCustomer.name,
                        phone: selectedCustomer.phone,
                        address: selectedCustomer.address || '',
                        balance: newBalance,
                        reason: selectedCustomer.reason || 'من فواتير أجل',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } else {
                    const customerRef = doc(db, 'customers', selectedCustomer.id);
                    // ✅ صح: نضيف المبلغ لأن الرصيد سالب
                    await updateDoc(customerRef, {
                        balance: increment(amount), // -30 + 10 = -20 ✅
                        updatedAt: serverTimestamp()
                    });
                }

                // ✅ تسجيل الدفعة
                await addDoc(collection(db, 'settlements'), {
                    customerId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    customerPhone: selectedCustomer.phone,
                    amount: amount,
                    type: 'debt_payment',
                    notes: notes || 'تسوية يدوية',
                    cashier: userEmail,
                    createdAt: serverTimestamp()
                });

                // ✅ تحديث الفواتير
                try {
                    const debtSnapshot = await getDocs(collection(db, 'invoices_debt'));
                    let remainingAmount = amount;
                    
                    for (const doc of debtSnapshot.docs) {
                        const data = doc.data();
                        if (data.customerPhone === selectedCustomer.phone) {
                            const total = data.total || 0;
                            const paid = data.paidAmount || 0;
                            const remaining = total - paid;
                            
                            if (remaining > 0 && remainingAmount > 0) {
                                const payAmount = Math.min(remaining, remainingAmount);
                                await updateDoc(doc.ref, {
                                    paidAmount: increment(payAmount),
                                    updatedAt: serverTimestamp()
                                });
                                remainingAmount -= payAmount;
                            }
                            
                            if (remainingAmount <= 0) break;
                        }
                    }
                } catch (error) {
                    console.error('❌ Error updating invoices:', error);
                }

                closeSettlementModal();
                showToast(`✅ تم تسوية مبلغ ${amount.toFixed(2)} ₪ بنجاح`, 'success');
                await loadCustomers();

            } catch (error) {
                console.error('❌ خطأ في التسوية:', error);
                showToast('❌ حدث خطأ في تسوية الدين', 'error');
            }
        });

        // ============================================
        // 🗑️ حذف عميل
        // ============================================
        window.deleteCustomer = async function(customerId) {
            const customer = allCustomers.find(c => c.id === customerId);
            if (!customer) return;

            if (!confirm(`🗑️ هل أنت متأكد من حذف العميل "${customer.name}"؟`)) {
                return;
            }

            try {
                await deleteDoc(doc(db, 'customers', customerId));
                showToast(`🗑️ تم حذف العميل "${customer.name}"`, 'success');
            } catch (error) {
                console.error('❌ Error deleting customer:', error);
                showToast('❌ حدث خطأ في حذف العميل', 'error');
            }
        };

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

        console.log('✅ Debtors page loaded successfully');