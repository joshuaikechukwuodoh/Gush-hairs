import { useCartStore } from "../store/useCartStore";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function CartPage() {
  const { items, addItem, removeItem, clearCart, getTotal } = useCartStore();
  const [whatsappNumber, setWhatsappNumber] = useState("07013339219");
  const total = getTotal();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "whatsapp");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWhatsappNumber(docSnap.data().value);
        }
      } catch (error) {
        console.error("Error fetching whatsapp number:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleWhatsAppOrder = () => {
    if (items.length === 0) return;

    // Remove non-numeric characters for the WhatsApp URL
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    // Ensure it starts with a country code if needed, but usually 234 for Nigeria
    const finalNumber = cleanNumber.startsWith("0") ? "234" + cleanNumber.slice(1) : cleanNumber;

    const itemsList = items
      .map((item) => `- ${item.name} (x${item.quantity}) - ₦${(item.price * item.quantity).toLocaleString()}`)
      .join("\n");
    
    const message = `Hello GUSS HAIRS, I want to order:\n\n${itemsList}\n\nTotal: ₦${total.toLocaleString()}\n\nPlease confirm my order.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${finalNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Redirecting to WhatsApp...");
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100">
            <ShoppingBag className="h-12 w-12 text-neutral-400" />
          </div>
          <div className="space-y-2">
            <h2 className="font-blackletter text-3xl">Your cart is empty</h2>
            <p className="text-neutral-500">Looks like you haven't added any hair to your cart yet.</p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-3 font-bold text-white transition-transform hover:scale-105 active:scale-95"
          >
            Start Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-6">
          <h1 className="font-blackletter text-4xl uppercase tracking-wide">Shopping Cart</h1>
          <button
            onClick={() => {
              clearCart();
              toast.success("Cart cleared");
            }}
            className="text-sm font-medium text-neutral-400 hover:text-red-500"
          >
            Clear all
          </button>
        </div>

        <div className="space-y-6">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4"
            >
              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between py-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-neutral-900">{item.name}</h3>
                  <p className="font-black text-neutral-900">₦{(item.price * item.quantity).toLocaleString()}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 rounded-full border border-neutral-200 px-3 py-1">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => addItem(item)}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      // Custom remove logic if needed
                      removeItem(item.id);
                    }}
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold">Order Summary</h2>
          <div className="space-y-4 border-b border-neutral-100 pb-6">
            <div className="flex justify-between text-sm text-neutral-500">
              <span>Subtotal</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-neutral-500">
              <span>Delivery</span>
              <span className="text-green-600 font-medium">Calculated on WhatsApp</span>
            </div>
          </div>
          <div className="flex justify-between text-lg font-black">
            <span>Total</span>
            <span>₦{total.toLocaleString()}</span>
          </div>
          <button
            onClick={handleWhatsAppOrder}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
          >
            Order via WhatsApp
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-center text-xs text-neutral-400">
            Secure checkout via WhatsApp. You will be redirected to chat with our vendor.
          </p>
        </div>
      </div>
    </div>
  </div>
  );
}
