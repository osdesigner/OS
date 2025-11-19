// Firebase imports
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAvLmzn4rnQrPrIeP40wzgbXqDy5xMhO7o",
  authDomain: "stor-121.firebaseapp.com",
  projectId: "stor-121",
  storageBucket: "stor-121.firebasestorage.app",
  messagingSenderId: "944316047610",
  appId: "1:944316047610:web:8ceeab3664e0e25d0da943",
  measurementId: "G-F4JBRJKR1R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch products
async function loadProducts() {
  const slider = document.getElementById("products-slider");
  slider.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "products"));

  querySnapshot.forEach((doc) => {
    const data = doc.data();

    slider.innerHTML += `
      <div class="product-card">
        <img src="${data.images[0]}" />
        <h3>${data.title}</h3>
        <p>${data.description}</p>
        <div class="price">${data.price} جنيه</div>
      </div>
    `;
  });
}

loadProducts();
