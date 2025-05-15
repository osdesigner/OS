function toggleNav() {
    const nav = document.getElementById("nav");
    const header2 = document.querySelector(".header2");

    nav.classList.toggle("active");

    if (nav.classList.contains("active")) {
        header2.style.marginTop = "100vh"; // اجعل `header2` ينزل أسفل القائمة
    } else {
        header2.style.marginTop = "0px"; // أعد `header2` لمكانه الطبيعي عند إغلاق القائمة
    }
}





 // تهيئة Firebase
 const firebaseConfig = {
    apiKey: "AIzaSyAIL9B-CijJ_1jQelALW0hdXV2bzqBhjnw",
    authDomain: "storehub-manager.firebaseapp.com",
    projectId: "storehub-manager",
    storageBucket: "storehub-manager.appspot.com",
    messagingSenderId: "584686051923",
    appId: "1:584686051923:web:3aad37de33ccc43dfa1ca6"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// عناصر DOM
const registerForm = document.getElementById('registerForm');
const successMessage = document.getElementById('successMessage');
const loginLink = document.getElementById('loginLink');

// تسجيل مستخدم جديد
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // إخفاء جميع رسائل الخطأ
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
    });
    
    // جمع بيانات النموذج
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const birthdate = document.getElementById('birthdate').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // التحقق من الصحة (متوافق مع قواعد Firestore)
    let isValid = true;
    
    if (fullName.length < 2) {
        document.getElementById('nameError').textContent = 'الاسم يجب أن يكون على الأقل حرفين';
        document.getElementById('nameError').style.display = 'block';
        isValid = false;
    }
    
    const emailInput = document.getElementById('email').value.trim();

if (emailInput) {
  // لو فيه قيمة، نتحقق من صحة الإيميل
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
    document.getElementById('emailError').textContent = 'البريد الإلكتروني غير صالح';
    document.getElementById('emailError').style.display = 'block';
    isValid = false;
  } else {
    // الإيميل صحيح، نخفي رسالة الخطأ
    document.getElementById('emailError').style.display = 'none';
  }
} else {
  // الإيميل فاضي، نخفي رسالة الخطأ (اختياري)
  document.getElementById('emailError').style.display = 'none';
}

    
    if (!/^[0-9+]{8,15}$/.test(phone)) {
        document.getElementById('phoneError').textContent = 'رقم الهاتف يجب أن يحتوي على 8-15 رقم';
        document.getElementById('phoneError').style.display = 'block';
        isValid = false;
    }
    
    if (address && typeof address !== 'string') {
        document.getElementById('addressError').textContent = 'العنوان غير صالح';
        document.getElementById('addressError').style.display = 'block';
        isValid = false;
    }
    
   
    
    if (password.length < 6) {
        document.getElementById('passwordError').textContent = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
        document.getElementById('passwordError').style.display = 'block';
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'كلمتا المرور غير متطابقتين';
        document.getElementById('confirmPasswordError').style.display = 'block';
        isValid = false;
    }
    
    if (!isValid) return;
    
    try {
        // إنشاء المستخدم في Firebase Authentication
        const emailToUse = email || `${phone}@phone.com`; // استخدام بريد افتراضي إذا لم يتم إدخال بريد
        const userCredential = await auth.createUserWithEmailAndPassword(emailToUse, password);
        const user = userCredential.user;
        
        // تحضير بيانات العميل (متوافقة مع قواعد Firestore)
        const customerData = {
            name: fullName,
            phone: phone,
            email: email || null,
            address: address || null,
            birthdate: birthdate || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // حفظ بيانات العميل في Firestore
        await db.collection('customers').doc(user.uid).set(customerData);
        
        // إظهار رسالة النجاح
        successMessage.style.display = 'block';
        registerForm.reset();
        

        
    } catch (error) {
        console.error('Error registering user:', error);
        
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب. الرجاء المحاولة لاحقاً';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
            document.getElementById('emailError').textContent = errorMessage;
            document.getElementById('emailError').style.display = 'block';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'كلمة المرور ضعيفة جداً';
            document.getElementById('passwordError').textContent = errorMessage;
            document.getElementById('passwordError').style.display = 'block';
        } else {
            alert(errorMessage);
        }
    }
});

// الانتقال إلى صفحة تسجيل الدخول
loginLink.addEventListener('click', () => {
    window.location.href = 'login.html';
});