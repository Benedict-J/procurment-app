import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Firebase Firestore
import { auth, db } from "@/firebase/firebase";  // Konfigurasi Firebase
import { useRouter } from "next/router"; // Router

// Definisikan tipe untuk profil pengguna
interface Profile {
  email: string;
  entity: string;
  role: string;
}

// Definisikan tipe untuk user profile
interface UserProfile {
  namaLengkap: string;
  divisi: string;
  email: string;
  entity: string;
  role: string;
  profile: Profile[]; // Menambahkan array profile
}

interface UserContextType {
  user: any | null;
  userProfile: UserProfile | null;
  selectedProfileIndex: number | null;
  loading: boolean;
  setSelectedProfile: (index: number) => void;
}

// Buat Context untuk user
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider untuk UserContext
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Definisikan mapping role ke path dashboard
  const defaultPathsForRoles: Record<string, string> = {
    "Requester": "/requester/request-form",
    "Checker": "/requester/incoming-request",
    "Approval": "/requester/incoming-request",
    "Releaser": "/requester/incoming-request",
  };

  useEffect(() => {
    // Listener untuk autentikasi Firebase
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        try {
          const docRef = doc(db, "registeredUsers", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            const selectedIndex = userData.selectedProfileIndex || 0;

            if (Array.isArray(userData.profile) && userData.profile.length > 0) {
              const selectedProfile = userData.profile[selectedIndex];
              setUserProfile({
                namaLengkap: userData.namaLengkap,
                divisi: userData.divisi,
                email: selectedProfile.email,
                entity: selectedProfile.entity,
                role: selectedProfile.role,
                profile: userData.profile,
              });
              setSelectedProfileIndex(selectedIndex);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && userProfile && selectedProfileIndex !== null) {
      // Cek apakah pengguna saat ini berada di salah satu path dashboard
      const dashboardPaths = Object.values(defaultPathsForRoles);
      const currentPath = router.pathname;

      if (dashboardPaths.includes(currentPath)) {
        const defaultPath = defaultPathsForRoles[userProfile.profile[selectedProfileIndex].role];
        
        // Redirect jika path tidak sesuai dengan role
        if (currentPath !== defaultPath) {
          router.replace(defaultPath);
        }
      }
    }
  }, [loading, userProfile, selectedProfileIndex, router.pathname]);

  const setSelectedProfile = (index: number) => {
    if (user) {
      const docRef = doc(db, "registeredUsers", user.uid);
      getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (Array.isArray(userData.profile) && userData.profile[index]) {
            const profile = userData.profile[index];
            setSelectedProfileIndex(index);
            setUserProfile((prevState) => ({
              ...prevState!,
              entity: profile.entity,
              role: profile.role,
              email: profile.email,
            }));
          }
        }
      });
    }
  };

  return (
    <UserContext.Provider value={{ user, userProfile, selectedProfileIndex, loading, setSelectedProfile }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook untuk menggunakan context
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};
