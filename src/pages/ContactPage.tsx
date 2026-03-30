import * as React from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    email: "info@gusshairs.com",
    phone: "+234 800 123 4567",
    address: "123 Hair Avenue, Victoria Island, Lagos, Nigeria"
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "contact"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setContactInfo({
          email: data.email || "info@gusshairs.com",
          phone: data.phone || "+234 800 123 4567",
          address: data.address || "123 Hair Avenue, Victoria Island, Lagos, Nigeria"
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    setTimeout(() => {
      setLoading(false);
      toast.success("Message sent successfully! We'll get back to you soon.");
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-blackletter text-5xl text-neutral-900 uppercase sm:text-7xl">
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-neutral-600">
              Have questions about our products or services? We're here to help you find the perfect hair solution.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Email Us</h3>
                <p className="text-neutral-600">{contactInfo.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Call Us</h3>
                <p className="text-neutral-600">{contactInfo.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Visit Us</h3>
                <p className="text-neutral-600">{contactInfo.address}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                Your Message
              </label>
              <textarea
                id="message"
                required
                rows={4}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                placeholder="How can we help you?"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-4 font-bold text-white transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
