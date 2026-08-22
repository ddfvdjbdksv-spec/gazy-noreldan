// ============================================================
//  firebase-config.js
//  إعدادات Firebase — مستر غازي نور الدين
//
//  القاعدة النشطة: gazey-noreldan
//    (مزامنة الأجهزة + كل بيانات البرنامج)
//
//  ملاحظة مهمة:
//    - هذا الملف لا يُهيئ Firebase مباشرةً (لأن SDKs تُحمَّل async)
//    - التهيئة الفعلية تتم داخل ensureDeviceSyncFirebaseInitialized()
//      في app.js عند أول استخدام فعلي للشبكة
//    - window.FIREBASE_MAIN_CONFIG: يُخزَّن هنا للرجوع إليه إذا لزم
// ============================================================

window.FIREBASE_MAIN_CONFIG = {
    apiKey: "AIzaSyBMVoFA1hTMIGhQ6BO83fhDfniPcIVsraE",
    authDomain: "gazey-noreldan.firebaseapp.com",
    projectId: "gazey-noreldan",
    storageBucket: "gazey-noreldan.firebasestorage.app",
    messagingSenderId: "438217111789",
    appId: "1:438217111789:web:1ec599209190566920b4e4",
    measurementId: "G-VJVS5MPCD9"
};

// قاعدة المنصة التعليمية — معطّلة (الإعدادات فارغة عمداً)
window.FIREBASE_PLATFORM_CONFIG = null;

console.info('[firebase-config.js] ✅ إعدادات Firebase محمّلة — القاعدة النشطة: gazey-noreldan');
