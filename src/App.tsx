import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ShoppingCart, User, LogIn, LogOut, PlusCircle, Settings } from "lucide-react";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useCartStore } from "./store/useCartStore";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import AdminPanel from "./pages/AdminPanel";
import ShopPage from "./pages/ShopPage";
import ContactPage from "./pages/ContactPage";
import { handleFirestoreError, OperationType } from "./lib/firestore-errors";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Check if user exists in Firestore, if not create
        const userRef = doc(db, "users", user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const isFirstAdmin = user.email === "joshuaokibe2@gmail.com";
            await setDoc(userRef, {
              email: user.email,
              role: isFirstAdmin ? "admin" : "user",
              createdAt: new Date().toISOString(),
            });
            setIsAdmin(isFirstAdmin);
          } else {
            setIsAdmin(userSnap.data().role === "admin");
          }
        } catch (error: any) {
          if (error.code === 'permission-denied') {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-blackletter text-3xl tracking-wide text-neutral-900">GUSS HAIRS</span>
            </Link>

            <nav className="flex items-center gap-4 sm:gap-6">
              <Link to="/" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Home
              </Link>
              <Link to="/shop" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Shop
              </Link>
              <Link to="/contact" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Contact Us
              </Link>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900">
                  <Settings className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <Link to="/cart" className="relative flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              {user ? (
                <div className="flex items-center gap-3">
                  <img src={user.photoURL} alt={user.displayName} className="h-8 w-8 rounded-full border border-neutral-200" />
                  <button onClick={handleLogout} className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button onClick={handleLogin} className="flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900">
                  <LogIn className="h-5 w-5" />
                </button>
              )}
            </nav>
          </div>
        </header>

        <main className="py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/admin" element={<AdminPanel isAdmin={isAdmin} />} />
          </Routes>
        </main>

        <footer className="border-t border-neutral-200 bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <p className="text-sm text-neutral-500">© 2026 GUSS HAIRS. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900">Instagram</a>
                <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900">WhatsApp</a>
                <a href="#" className="text-sm text-neutral-500 hover:text-neutral-900">Facebook</a>
              </div>
            </div>
          </div>
        </footer>
        <Toaster position="top-center" />
      </div>
    </Router>
  );
}
