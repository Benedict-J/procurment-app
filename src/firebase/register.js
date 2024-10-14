import { auth } from '@/firebase/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, applyActionCode } from 'firebase/auth';
import { db } from '@/firebase/firebase';
import { doc, query, where, getDocs, getDoc, setDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';

const registerUserWithNik = async (nik) => {
  try {
    const q = query(collection(db, 'registeredUsers'), where('nik', '==', nik));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error('NIK sudah terdaftar!');
    }

    const preRegisteredDocRef = doc(db, 'preRegisteredUsers', nik);
    const preRegisteredDoc = await getDoc(preRegisteredDocRef);

    if (!preRegisteredDoc.exists()) {
      throw new Error('NIK tidak terdaftar! Silahkan Hubungi Super Admin');
    }

    const userData = preRegisteredDoc.data(); 
    const { namaLengkap, divisi, role } = userData;

    if (role !== 'Staff' && role !== 'Head') {
      throw new Error('Hanya Staff dan Head yang dapat melakukan register');
    }

    return { success: true, userData: { namaLengkap, divisi, role } };
  } catch (error) {
    // Kembalikan error jika terjadi masalah
    return { success: false, message: error.message };
  }
};

const registerUser = async (nik, namaLengkap, divisi, role, email, password, company) => {

  const actionCodeSettings = {
    url: 'http://localhost:3000/auth/login',
    handleCodeInApp: false,
  };

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await addDoc(collection(db, 'registeredUsers'), {
      uid: user.uid,
      nik,
      namaLengkap,
      divisi,
      role,
      company,
      email,
      isEmailVerified: false,
    });

    await sendEmailVerification(user, actionCodeSettings);
    return { success: true, message: "Registrasi berhasil, email verifikasi terkirim" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}


export { registerUserWithNik, registerUser};