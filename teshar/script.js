








document.getElementById('send-order-btn').onmouseover = function() {
        this.style.background = '#0056b3';
    };
    document.getElementById('send-order-btn').onmouseout = function() {
        this.style.background = '#007bff';
    };
// متغير السلة
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// دالة إضافة المنتج مع الملاحظات
function addToCart(id, name, price, image, notes = '') {
    const displayName = notes ? `${name} (${notes})` : name;
    
    // البحث عن منتج مطابق (نفس الاسم، السعر، الصورة، الملاحظات)
    const existingItem = cart.find(item => 
        item.name === name && 
        item.price === Number(price) && 
        item.image === image &&
        item.notes === notes
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: id + Date.now(), // إنشاء معرف فريد
            name,
            displayName,
            price: Number(price),
            image,
            quantity: 1,
            notes
        });
    }
    
    updateCart();
    alert(`تم إضافة ${displayName} إلى السلة`);
}

// دالة إضافة المنتج المحدد مع الملاحظات
function addSelectedProductWithNotes(selectId, notesId) {
    const select = document.getElementById(selectId);
    const notesInput = document.getElementById(notesId);
    const selectedValue = select.value;
    const notes = notesInput.value.trim();
    
    if (!selectedValue) {
        alert("الرجاء اختيار منتج أولاً");
        return;
    }
    
    const [id, name, price, image] = selectedValue.split('|');
    addToCart(id, name, price, image, notes);
    
    // إفراغ حقل الملاحظات بعد الإضافة
    notesInput.value = '';
}

// دالة حذف المنتج
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
}

// دالة تحديث الكمية
function updateQuantity(id, newQuantity) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity = Math.max(1, newQuantity);
        updateCart();
    }
}

// دالة عرض/إخفاء السلة
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('active');
    document.getElementById('cart-overlay').style.display = 
        sidebar.classList.contains('active') ? 'block' : 'none';
}

function updateCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
    
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    let total = 0;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align:center; color:#888;">السلة فارغة</p>';
    } else {
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" 
                     onerror="this.src='https://via.placeholder.com/100'">
                <div style="flex:1;">
                    <h4>${item.name}</h4>
                    ${item.notes ? `<p class="notes">${item.notes}</p>` : ''}
                    <p>${item.price} جنيه</p>
                    <div class="cart-controls">
                        <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})" style="border:none;border-radius:50%;width:28px;height:28px;font-size:18px;color:#000;cursor:pointer;margin:0 5px;">-</button>
                            <span style="display:inline-block;min-width:24px;text-align:center;font-weight:bold;font-size:16px;color:#222;background:#f7f7f7;border-radius:6px;padding:3px 8px;margin:0 2px;">${item.quantity}</span>
                            <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})" style=";border:none;border-radius:50%;width:28px;height:28px;font-size:18px;color:#000;cursor:pointer;margin:0 5px;">+</button>
                         <button onclick="removeFromCart('${item.id}')" style="background:none;border:none;cursor:pointer;color:red;font-size:18px; padding: 0 5px;" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>   
                    </div>
                </div>
            `;
            cartItems.appendChild(itemElement);
            total += item.price * item.quantity;
        });
    }
    
    totalElement.textContent = total;
    localStorage.setItem('cart', JSON.stringify(cart));
}

// تحميل السلة عند بدء الصفحة
window.onload = function() {
    updateCart();
    
    // إضافة حدث لإدخال الملاحظات
    document.getElementById('notes').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSelectedProductWithNotes('iphone-options', 'notes');
        }
    });
};