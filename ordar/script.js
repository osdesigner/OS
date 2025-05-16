 const firebaseConfig = {
    apiKey: "AIzaSyAIaEPGGOJcGEGcYD5_pntD6whM9Zk81Ok",
    authDomain: "ordars-578e0.firebaseapp.com",
    projectId: "ordars-578e0",
    storageBucket: "ordars-578e0.firebasestorage.app",
    messagingSenderId: "274691655392",
    appId: "1:274691655392:web:318fc9d4ecffd43e623285",
    measurementId: "G-S59P9T6NT0"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  function generateInvoiceNumber() {
    const date = new Date();
    return `ORD-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const invoiceNumber = generateInvoiceNumber();
  document.getElementById('invoiceNumber').textContent = invoiceNumber;

  const userId = localStorage.getItem("userId");
  const name = localStorage.getItem("userName") || "غير معروف";
  const phone = localStorage.getItem("userPhone") || "غير متوفر";
  const address = localStorage.getItem("userAddress") || "غير متوفر";

  document.getElementById("userName").textContent = name;
  document.getElementById("userPhone").textContent = phone;
  document.getElementById("userAddress").textContent = address;

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const summary = document.getElementById("orderSummary");
  let subtotal = 0;

  if (cart.length === 0) {
    summary.innerHTML = '<p class="empty-cart">لا توجد عناصر في السلة</p>';
  } else {
    cart.forEach(item => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "order-item";
      itemDiv.innerHTML = `
        <img src="${item.image}" class="item-img" alt="${item.name}">
        <div class="item-details">
          <h4>${item.name}</h4>
          <p>الكمية: ${item.quantity} | السعر: ${item.price} جنيه</p>
          ${item.notes ? `<p class="notes">ملاحظات: ${item.notes}</p>` : ''}
        </div>
      `;
      subtotal += item.quantity * item.price;
      summary.appendChild(itemDiv);
    });
  }

  document.getElementById("subtotal").textContent = subtotal + " جنيه";
  document.getElementById("grandTotal").textContent = subtotal + " جنيه";

  document.getElementById("submitBtn").addEventListener("click", async () => {
    if (cart.length === 0) {
      alert("السلة فارغة");
      return;
    }

    if (!userId) {
      alert("يجب تسجيل الدخول أولاً");
      window.location.href = "login.html";
      return;
    }

    try {
      const customerDoc = await db.collection("customers").doc(userId).get();
      const customerData = customerDoc.data();

      const orderData = {
        customerId: userId,
        customer: {
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address || address,
          email: customerData.email || ""
        },
        items: cart,
        subtotal: subtotal,
        grandTotal: subtotal,
        invoiceNumber: invoiceNumber,
        status: "قيد المراجعة",
        paymentMethod: "نقدي",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("orders").add(orderData);

      // حفظ الفاتورة في localStorage لعرضها في صفحة العميل
      localStorage.setItem("lastInvoice", JSON.stringify(orderData));
      localStorage.removeItem("cart");

      alert(`تم إنشاء الفاتورة رقم ${invoiceNumber} بنجاح`);
      window.location.href = "profile.html";

    } catch (error) {
      console.error("Error:", error);
      alert("حدث خطأ أثناء حفظ الفاتورة: " + error.message);
    }
  });