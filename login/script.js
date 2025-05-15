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








// تعديل التهيئة
const firebaseConfig = {
    apiKey: "AIzaSyAIL9B-CijJ_1jQelALW0hdXV2bzqBhjnw",
    authDomain: "storehub-manager.firebaseapp.com",
    projectId: "storehub-manager",
    storageBucket: "storehub-manager.appspot.com",
    messagingSenderId: "584686051923",
    appId: "1:584686051923:web:3aad37de33ccc43dfa1ca6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

   // تعديل دالة تسجيل الدخول لاستخدام Firebase Authentication
async function login() {
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.style.display = 'none';

    if (!phone || !password) {
        showError('الرجاء إدخال رقم الهاتف وكلمة المرور');
        return;
    }

    try {
        // البحث في Firestore عن المستخدم برقم الهاتف
        const snapshot = await db.collection("customers")
            .where("phone", "==", phone)
            .limit(1)
            .get();

        if (snapshot.empty) {
            showError('رقم الهاتف غير مسجل');
            return;
        }

        const customerDoc = snapshot.docs[0];
        const customerData = customerDoc.data();

        // تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
        await auth.signInWithEmailAndPassword(customerData.email, password);
        
        displayProfile(customerData);
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('profilePage').style.display = 'block';

    } catch (error) {
        console.error("Login error:", error);
        showError('كلمة المرور غير صحيحة أو حدث خطأ أثناء تسجيل الدخول');
    }
}


// عرض نافذة استعادة كلمة المرور
function showForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'flex';
}

// إخفاء النافذة
function hideForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
    document.getElementById('recoveryMsg').textContent = '';
}

// إرسال رابط استعادة كلمة المرور
async function sendPasswordResetEmail() {
    const email = document.getElementById('recoveryEmail').value.trim();
    const recoveryMsg = document.getElementById('recoveryMsg');
    
    if (!email) {
        recoveryMsg.textContent = 'الرجاء إدخال البريد الإلكتروني';
        recoveryMsg.style.color = '#e74a3b';
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        recoveryMsg.textContent = 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني';
        recoveryMsg.style.color = '#1cc88a';
    } catch (error) {
        console.error("Password reset error:", error);
        recoveryMsg.textContent = 'حدث خطأ: ' + (error.message || 'البريد الإلكتروني غير مسجل');
        recoveryMsg.style.color = '#e74a3b';
    }
}



        
        // دالة عرض الملف الشخصي
        function displayProfile(customer) {
            // عرض الاسم ورقم الهاتف
            document.getElementById('userName').textContent = customer.name || 'غير معروف';
            document.getElementById('userPhone').textContent = customer.phone || 'غير معروف';
            
            // إنشاء صورة رمزية من الحرف الأول من الاسم
            const avatar = document.getElementById('userAvatar');
            if (customer.name) {
                avatar.textContent = customer.name.charAt(0).toUpperCase();
                avatar.style.backgroundColor = getRandomColor();
                avatar.style.color = 'white';
            }
            
            // عرض المعلومات الأخرى
            document.getElementById('userEmail').textContent = customer.email || 'غير متوفر';
            document.getElementById('userAddress').textContent = customer.address || 'غير متوفر';
            document.getElementById('userBirthdate').textContent = customer.birthdate || 'غير متوفر';
        }
        
        // دالة تسجيل الخروج
        function logout() {
            document.getElementById('loginPage').style.display = 'flex';
            document.getElementById('profilePage').style.display = 'none';
            document.getElementById('phoneInput').value = '';
        }
        
        // دالة عرض رسالة الخطأ
        function showError(message) {
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
        
        // دالة إنشاء لون عشوائي
        function getRandomColor() {
            const colors = [
                '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', 
                '#e74a3b', '#fd7e14', '#6610f2', '#6f42c1'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }




        async function registerCustomer(email, password, phone, name) {
    try {
        // إنشاء مستخدم في Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // حفظ بيانات إضافية في Firestore
        await db.collection("customers").doc(userCredential.user.uid).set({
            name: name,
            phone: phone,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
}
window.onload = function() {
    auth.onAuthStateChanged(async function(user) {
        if (user) {
            // جلب بيانات العميل من Firestore باستخدام UID
            const doc = await db.collection("customers").doc(user.uid).get();
            if (doc.exists) {
                displayProfile(doc.data());
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('profilePage').style.display = 'block';
            } else {
                // إذا لم توجد بيانات العميل، تسجيل الخروج
                auth.signOut();
                document.getElementById('loginPage').style.display = 'flex';
                document.getElementById('profilePage').style.display = 'none';
            }
        } else {
            document.getElementById('loginPage').style.display = 'flex';
            document.getElementById('profilePage').style.display = 'none';
        }
    });
};

function hideHeadersOnProfile(showProfile) {
    const header = document.querySelector('.header');
    const header2 = document.getElementById('mainHeader');
    if (showProfile) {
        if (header) header.style.display = 'none';
        if (header2) header2.style.display = 'none';
    } else {
        if (header) header.style.display = '';
        if (header2) header2.style.display = '';
    }
}

// عدل دالة عرض الملف الشخصي
function displayProfile(customer) {
    document.getElementById('userName').textContent = customer.name || 'غير معروف';
    document.getElementById('userPhone').textContent = customer.phone || 'غير معروف';
    const avatar = document.getElementById('userAvatar');
    if (customer.name) {
        avatar.textContent = customer.name.charAt(0).toUpperCase();
        avatar.style.backgroundColor = getRandomColor();
        avatar.style.color = 'white';
    }
    document.getElementById('userEmail').textContent = customer.email || 'غير متوفر';
    document.getElementById('userAddress').textContent = customer.address || 'غير متوفر';
    document.getElementById('userBirthdate').textContent = customer.birthdate || 'غير متوفر';
    hideHeadersOnProfile(true);
}

// عدل دالة تسجيل الخروج
function logout() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('profilePage').style.display = 'none';
    document.getElementById('phoneInput').value = '';
    hideHeadersOnProfile(false);
}




