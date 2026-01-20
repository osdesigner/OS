import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

const productsRef = collection(db, "products");
const productContainer = document.getElementById("productContainer");
const searchInput = document.getElementById("searchInput");
const suggestions = document.getElementById("suggestions");

let allProducts = [];

/* تحميل المنتجات */
async function loadProducts() {
  const snapshot = await getDocs(productsRef);
  allProducts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  displayProducts(allProducts);
}

/* عرض المنتجات */
function displayProducts(products) {
  productContainer.innerHTML = "";
  products.forEach(p => {
    productContainer.innerHTML += `
      <div class="product">
        <img src="${p.images?.[0] || ''}">
        <div class="info">
          <h3>${p.title}</h3>
          <p>${p.description}</p>
          <div class="price">${p.sellPrice} ج.م</div>
          <button ${p.quantity <= 0 ? "disabled" : ""} onclick="buyProduct('${p.id}')">
            ${p.quantity > 0 ? "شراء" : "غير متوفر"}
          </button>
        </div>
      </div>
    `;
  });
}

/* البحث بالاقتراح */
searchInput.addEventListener("input", () => {
  const value = searchInput.value.trim().toLowerCase();
  suggestions.innerHTML = "";

  if (!value) {
    suggestions.style.display = "none";
    displayProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter(p =>
    p.title.toLowerCase().includes(value) ||
    p.serial?.includes(value)
  );

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.textContent = p.title;
    div.onclick = () => {
      searchInput.value = p.title;
      suggestions.style.display = "none";
      displayProducts([p]);
    };
    suggestions.appendChild(div);
  });

  suggestions.style.display = filtered.length ? "block" : "none";
});

/* شراء المنتج + خصم الكمية */
window.buyProduct = async (id) => {
  const product = allProducts.find(p => p.id === id);
  if (!product || product.quantity <= 0) return;

  const ref = doc(db, "products", id);
  await updateDoc(ref, {
    quantity: increment(-1)
  });

  alert("✅ تم الشراء بنجاح");
  loadProducts();
};

loadProducts();
