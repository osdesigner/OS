// الانتظار حتى تحميل DOM بالكامل
document.addEventListener('DOMContentLoaded', function() {
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

    // العناصر مع التحقق من وجودها
    const registerForm = document.getElementById('registerForm');
    const successMessage = document.getElementById('successMessage');
    const loginLink = document.getElementById('loginLink');

    if (!registerForm) {
        console.error('registerForm not found!');
        return;
    }

    // تسجيل مستخدم جديد
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // جمع البيانات الأساسية
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const email = document.getElementById('email').value.trim() || `${phone}@phone.com`;
            
            // التحقق من وجود الهاتف وكلمة المرور
            if (!phone || !password) {
                throw new Error('الهاتف وكلمة المرور مطلوبان');
            }

            // 1. إنشاء حساب المصادقة
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // 2. حفظ البيانات في Firestore
            await db.collection('customers').doc(userCredential.user.uid).set({
                name: document.getElementById('fullName').value.trim(),
                phone: phone,
                email: email.includes('@phone.com') ? null : email,
                address: document.getElementById('address').value.trim() || null,
                birthdate: document.getElementById('birthdate').value || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // إظهار رسالة النجاح
            if (successMessage) successMessage.style.display = 'block';
            
        } catch (error) {
            console.error('Registration error:', error);
            alert(`حدث خطأ: ${error.message}`);
        }
    });

    // الانتقال إلى صفحة تسجيل الدخول
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            window.location.href = 'https://os-desin.vercel.app/login/login.html';
        });
    }
});