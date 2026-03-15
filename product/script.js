  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
        const firebaseConfig = {
            apiKey: "AIzaSyAvLmzn4rnQrPrIeP40wzgbXqDy5xMhO7o",
            authDomain: "stor-121.firebaseapp.com",
            projectId: "stor-121",
            storageBucket: "stor-121.firebasestorage.app"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // تحديث عداد السلة
        function updateCartCount() {
            const cart = JSON.parse(localStorage.getItem("cart")) || [];
            const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
            document.getElementById('cartCount').textContent = totalItems;
        }

          // تحميل المنتجات عند بدء الصفحة
        document.addEventListener('DOMContentLoaded', () => {
            loadProducts();
            updateCartCount();
        });

        

        // جلب ID المنتج
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        async function loadProduct() {
            const loadingState = document.getElementById('loadingState');
            const productContainer = document.getElementById('productContainer');
            
            if (!id) {
                // إذا لم يكن هناك ID
                productContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <h2>لم يتم العثور على المنتج</h2>
                        <p>يرجى التأكد من رابط المنتج</p>
                    </div>
                `;
                return;
            }

            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const product = docSnap.data();
                    
                    // تحديد حالة المخزون
                    let stockStatus = '';
                    let stockClass = '';
                    if (product.quantity > 10) {
                        stockStatus = 'متوفر';
                        stockClass = 'in-stock';
                    } else if (product.quantity > 0) {
                        stockStatus = 'كمية محدودة';
                        stockClass = 'low-stock';
                    } else {
                        stockStatus = 'غير متوفر';
                        stockClass = 'out-stock';
                    }

                    // إضافة إلى السلة
window.addToCart = function(product) {

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    alert("تم إضافة المنتج إلى السلة");
};

                    // تحضير الصور (تأكد من وجود مصفوفة صور)
                    const images = product.images && product.images.length > 0 ? product.images : ['https://placehold.co/600x600/f5f5f7/0071e3?text=No+Image'];
                    
                    // بناء HTML المنتج
                    productContainer.innerHTML = `
                        <div class="product-card-modern">
                            <div class="product-image-section">
                                <div class="main-image" id="mainImageContainer">
                                    <img src="${images[0]}" alt="${product.title}" id="mainImage">
                                </div>
                                <div class="thumbnail-strip" id="thumbnailStrip">
                                    ${images.map((img, index) => `
                                        <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="changeImage('${img}', ${index})">
                                            <img src="${img}" alt="صورة مصغرة ${index + 1}">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="product-details-section">
                                <h1 class="product-title">${product.title || 'بدون عنوان'}</h1>
                                
                                <div class="product-serial">
                                    <i class="fas fa-barcode"></i>
                                    <span>الرقم التسلسلي: ${product.serial || 'غير محدد'}</span>
                                </div>
                                
                                <div class="product-price-section">
                                    <div class="price-label">السعر</div>
                                    <div class="product-price">
                                        ${product.sellPrice || '0'} <span>جنيه</span>
                                    </div>
                                </div>
                                
                                <div class="product-availability">
                                    <div class="stock-status ${stockClass}">
                                        <i class="fas ${product.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                        <span>${stockStatus}</span>
                                    </div>
                                    <div>الكمية المتاحة: ${product.quantity || 0}</div>
                                </div>
                                
                                <div class="product-description">
                                    ${product.description || 'لا يوجد وصف للمنتج'}
                                </div>
                                
                             <div class="product-buttons">
    <button onclick='addToCart({
        id: "${id}",
        title: "${product.title}",
        sellPrice: ${product.sellPrice},
        image: "${images[0]}"
    })'>
        🛒 إضافة إلى السلة
    </button>
</div>
                              </div>
                            </div>
                        </div>
                    `;

                    // إضافة إلى السلة
                   function addToCart(product) {
                       let cart = JSON.parse(localStorage.getItem("cart")) || [];
                   
                       const existing = cart.find(item => item.id === product.id);
                   
                       if (existing) {
                           existing.qty += 1;
                           showNotification(`تم زيادة الكمية لـ ${product.title} في السلة`);
                       } else {
                           cart.push({ ...product, qty: 1 });
                           showNotification(`تم إضافة ${product.title} إلى السلة`);
                       }
                   
                       localStorage.setItem("cart", JSON.stringify(cart));
                       updateCartCount();
                   }

                    // إضافة دوال تغيير الصورة إلى النطاق العام
                    window.changeImage = function(src, index) {
                        document.getElementById('mainImage').src = src;
                        // تحديث الحالة النشطة للصور المصغرة
                        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
                            if (i === index) {
                                thumb.classList.add('active');
                            } else {
                                thumb.classList.remove('active');
                            }
                        });
                    };

                
                } else {
                    productContainer.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-search"></i>
                            <h2>المنتج غير موجود</h2>
                            <p>عذراً، لم نتمكن من العثور على المنتج المطلوب</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error("خطأ في تحميل المنتج:", error);
                productContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h2>حدث خطأ</h2>
                        <p>يرجى المحاولة مرة أخرى لاحقاً</p>
                    </div>
                `;
            }
        }

        // تحميل المنتج
        loadProduct();

        // كود منيو الموبايل
        const menuBtn = document.getElementById('menuBtn');
        const mobileMenu = document.getElementById('mobileMenu');

        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        // إغلاق المنيو عند الضغط على رابط
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });



        async function loadRelatedProducts(){

    const container = document.getElementById("relatedProducts");

    const snapshot = await getDocs(collection(db,"products"));

    let products = [];

    snapshot.forEach(doc=>{
        products.push({
            id:doc.id,
            ...doc.data()
        });
    });

    // خلط المنتجات عشوائي
    products.sort(()=>0.5 - Math.random());

    // عرض 4 منتجات فقط
    products.slice(0,3).forEach(product=>{

        const image = product.images?.[0] || "";

        container.innerHTML += `
        <div class="related-card" onclick="location.href='/product/index.html?id=${product.id}'">

            <img src="${image}">

            <div class="related-title">
                ${product.title}
            </div>

            <div class="related-price">
                ${product.sellPrice} $
            </div>

        </div>
        `;
    });

}

loadRelatedProducts();


