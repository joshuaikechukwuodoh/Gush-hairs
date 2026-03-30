import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import { Plus, Edit2, Trash2, Image as ImageIcon, Sparkles, X, Save, ArrowLeft, Upload, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description: string;
}

interface Advertisement {
  id: string;
  sectionId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  link: string;
  order: number;
}

interface AdSection {
  id: string;
  title: string;
  type: 'slider' | 'banner' | 'grid';
  order: number;
  active: boolean;
}

import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

export default function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'products' | 'ads' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [sections, setSections] = useState<AdSection[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("07013339219");
  const [email, setEmail] = useState("info@gusshairs.com");
  const [phone, setPhone] = useState("+234 800 123 4567");
  const [address, setAddress] = useState("123 Hair Avenue, Victoria Island, Lagos, Nigeria");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAd, setIsEditingAd] = useState(false);
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    imageUrl: "",
    category: "Wigs",
    description: "",
  });

  const [currentAd, setCurrentAd] = useState<Partial<Advertisement>>({
    title: "",
    subtitle: "",
    imageUrl: "",
    buttonText: "Shop Now",
    link: "/",
    order: 0,
    sectionId: "",
  });

  const [currentSection, setCurrentSection] = useState<Partial<AdSection>>({
    title: "",
    type: "slider",
    order: 0,
    active: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    
    const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const adsQuery = query(collection(db, "advertisements"), orderBy("order", "asc"));
    const sectionsQuery = query(collection(db, "ad_sections"), orderBy("order", "asc"));

    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productsData);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, "products");
      }
    });

    const unsubscribeAds = onSnapshot(adsQuery, (snapshot) => {
      const adsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Advertisement[];
      setAds(adsData);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, "advertisements");
      }
    });

    const unsubscribeSections = onSnapshot(sectionsQuery, (snapshot) => {
      const sectionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AdSection[];
      setSections(sectionsData);
      if (sectionsData.length > 0 && !selectedSectionId) {
        setSelectedSectionId(sectionsData[0].id);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, "ad_sections");
      }
    });

    const unsubscribeSettings = onSnapshot(doc(db, "settings", "whatsapp"), (snapshot) => {
      if (snapshot.exists()) {
        setWhatsappNumber(snapshot.data().value);
      }
    });

    const unsubscribeContact = onSnapshot(doc(db, "settings", "contact"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setEmail(data.email || "info@gusshairs.com");
        setPhone(data.phone || "+234 800 123 4567");
        setAddress(data.address || "123 Hair Avenue, Victoria Island, Lagos, Nigeria");
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeAds();
      unsubscribeSections();
      unsubscribeSettings();
      unsubscribeContact();
    };
  }, [isAdmin]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "whatsapp"), {
        value: whatsappNumber,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "settings", "contact"), {
        email,
        phone,
        address,
        updatedAt: serverTimestamp(),
      });
      toast.success("Settings updated successfully");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "settings/contact");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleMoveAd = async (ad: Advertisement, direction: 'up' | 'down') => {
    const sectionAds = ads.filter(a => a.sectionId === ad.sectionId);
    const currentIndex = sectionAds.findIndex(a => a.id === ad.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sectionAds.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetAd = sectionAds[targetIndex];

    try {
      const batch = [
        updateDoc(doc(db, "advertisements", ad.id), { order: targetIndex }),
        updateDoc(doc(db, "advertisements", targetAd.id), { order: currentIndex })
      ];
      await Promise.all(batch);
      toast.success("Order updated");
    } catch (error) {
      console.error("Error reordering ads:", error);
      toast.error("Failed to update order");
    }
  };

  const handleMoveSection = async (section: AdSection, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === section.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sections.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetSection = sections[targetIndex];

    try {
      const batch = [
        updateDoc(doc(db, "ad_sections", section.id), { order: targetIndex }),
        updateDoc(doc(db, "ad_sections", targetSection.id), { order: currentIndex })
      ];
      await Promise.all(batch);
      toast.success("Section order updated");
    } catch (error) {
      console.error("Error reordering sections:", error);
      toast.error("Failed to update section order");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.name || !currentProduct.price || !currentProduct.imageUrl) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (currentProduct.id) {
        const productRef = doc(db, "products", currentProduct.id);
        await updateDoc(productRef, {
          ...currentProduct,
          updatedAt: serverTimestamp(),
        });
        toast.success("Product updated successfully");
      } else {
        await addDoc(collection(db, "products"), {
          ...currentProduct,
          createdAt: serverTimestamp(),
        });
        toast.success("Product added successfully");
      }
      setIsEditing(false);
      setCurrentProduct({ name: "", price: 0, imageUrl: "", category: "Wigs", description: "" });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, currentProduct.id ? OperationType.UPDATE : OperationType.CREATE, "products");
      }
      console.error("Error saving product:", error);
      toast.error("Failed to save product: " + error.message);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAd.imageUrl || !currentAd.sectionId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (currentAd.id) {
        const adRef = doc(db, "advertisements", currentAd.id);
        await updateDoc(adRef, {
          ...currentAd,
          updatedAt: serverTimestamp(),
        });
        toast.success("Ad updated successfully");
      } else {
        await addDoc(collection(db, "advertisements"), {
          ...currentAd,
          createdAt: serverTimestamp(),
        });
        toast.success("Ad added successfully");
      }
      setIsEditingAd(false);
      setCurrentAd({ title: "", subtitle: "", imageUrl: "", buttonText: "Shop Now", link: "/", order: 0, sectionId: selectedSectionId || "" });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, currentAd.id ? OperationType.UPDATE : OperationType.CREATE, "advertisements");
      }
      console.error("Error saving ad:", error);
      toast.error("Failed to save ad");
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSection.type) {
      toast.error("Please select a section type");
      return;
    }

    try {
      if (currentSection.id) {
        const sectionRef = doc(db, "ad_sections", currentSection.id);
        await updateDoc(sectionRef, {
          ...currentSection,
          updatedAt: serverTimestamp(),
        });
        toast.success("Section updated successfully");
      } else {
        await addDoc(collection(db, "ad_sections"), {
          ...currentSection,
          createdAt: serverTimestamp(),
        });
        toast.success("Section added successfully");
      }
      setIsEditingSection(false);
      setCurrentSection({ title: "", type: "slider", order: sections.length, active: true });
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, currentSection.id ? OperationType.UPDATE : OperationType.CREATE, "ad_sections");
      }
      console.error("Error saving section:", error);
      toast.error("Failed to save section");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    try {
      await deleteDoc(doc(db, "advertisements", id));
      toast.success("Ad deleted successfully");
    } catch (error) {
      console.error("Error deleting ad:", error);
      toast.error("Failed to delete ad");
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section and all its ads?")) return;
    try {
      // Delete all ads in this section
      const sectionAds = ads.filter(a => a.sectionId === id);
      const deletePromises = sectionAds.map(ad => deleteDoc(doc(db, "advertisements", ad.id)));
      await Promise.all(deletePromises);
      
      await deleteDoc(doc(db, "ad_sections", id));
      toast.success("Section and its ads deleted successfully");
      if (selectedSectionId === id) {
        setSelectedSectionId(sections.find(s => s.id !== id)?.id || null);
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    }
  };

  const generateImage = async (target: 'product' | 'ad') => {
    if (!prompt) {
      toast.error("Please enter a prompt for the AI");
      return;
    }
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: {
          parts: [{ text: `High quality professional product photography of ${prompt}, luxury hair extensions, white background, cinematic lighting` }],
        },
        config: {
          imageConfig: {
            aspectRatio: target === 'ad' ? "16:9" : "1:1",
            imageSize: "1K",
          },
        },
      });

      let imageUrl = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        if (target === 'product') {
          setCurrentProduct({ ...currentProduct, imageUrl });
        } else {
          setCurrentAd({ ...currentAd, imageUrl });
        }
        toast.success("AI Image generated successfully!");
      } else {
        throw new Error("No image data received");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate AI image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'ad') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Firestore base64
        toast.error("Image is too large. Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'product') {
          setCurrentProduct({ ...currentProduct, imageUrl: reader.result as string });
        } else {
          setCurrentAd({ ...currentAd, imageUrl: reader.result as string });
        }
        toast.success("Image uploaded from device");
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
          <h2 className="font-blackletter text-3xl text-neutral-900">Access Denied</h2>
          <p className="text-neutral-500">You must be an admin to view this page.</p>
          <ArrowLeft className="h-6 w-6 text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-blackletter text-4xl uppercase tracking-wide">Admin Dashboard</h1>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View Website
          </Link>
        </div>
        <div className="flex gap-2 rounded-xl bg-neutral-100 p-1">
          <button
            onClick={() => setActiveTab('products')}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${activeTab === 'ads' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            Ad Sections
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-neutral-200 bg-white p-8">
            <h2 className="font-blackletter text-2xl mb-6">Store Settings</h2>
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                  WhatsApp Number (for orders)
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                  placeholder="e.g. 2348123456789"
                />
                <p className="text-xs text-neutral-400">
                  Enter the number with country code, no "+" or spaces.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                  placeholder="info@gusshairs.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Phone Number (Display)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                  placeholder="+234 800 123 4567"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Store Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:bg-white"
                  placeholder="123 Hair Avenue, Victoria Island, Lagos, Nigeria"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setCurrentProduct({ name: "", price: 0, imageUrl: "", category: "Wigs", description: "" });
                setIsEditing(true);
              }}
              className="flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add New Hair
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 text-xs font-bold uppercase tracking-widest text-neutral-400">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => (
                  <tr key={product.id} className="group hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.imageUrl} className="h-12 w-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-neutral-900">{product.name}</p>
                          <p className="text-xs text-neutral-500 line-clamp-1">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">₦{product.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setCurrentProduct(product);
                            setIsEditing(true);
                          }}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-white hover:text-neutral-900 hover:shadow-sm"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="rounded-lg p-2 text-neutral-400 hover:bg-white hover:text-red-500 hover:shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Sections Sidebar/List */}
            <div className="w-full space-y-4 sm:w-64">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Sections</h2>
                <button
                  onClick={() => {
                    setCurrentSection({ title: "", type: "slider", order: sections.length, active: true });
                    setIsEditingSection(true);
                  }}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-xl p-3 transition-all ${selectedSectionId === section.id ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{section.title || `Section ${section.order + 1}`}</span>
                      <span className={`text-[10px] uppercase tracking-widest ${selectedSectionId === section.id ? 'text-neutral-400' : 'text-neutral-400'}`}>{section.type}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(section, 'up');
                        }}
                        disabled={section.order === 0}
                        className={`rounded-lg p-1 ${selectedSectionId === section.id ? 'hover:bg-white/10' : 'hover:bg-neutral-200'}`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSection(section, 'down');
                        }}
                        disabled={section.order === sections.length - 1}
                        className={`rounded-lg p-1 ${selectedSectionId === section.id ? 'hover:bg-white/10' : 'hover:bg-neutral-200'}`}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSection(section);
                          setIsEditingSection(true);
                        }}
                        className={`rounded-lg p-1 ${selectedSectionId === section.id ? 'hover:bg-white/10' : 'hover:bg-neutral-200'}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Section Ads */}
            <div className="flex-1 space-y-6">
              {selectedSectionId ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-blackletter text-2xl">{sections.find(s => s.id === selectedSectionId)?.title || "Section Content"}</h2>
                      <p className="text-sm text-neutral-500">Manage advertisements in this section</p>
                    </div>
                    <button
                      onClick={() => {
                        const sectionAds = ads.filter(a => a.sectionId === selectedSectionId);
                        setCurrentAd({ title: "", subtitle: "", imageUrl: "", buttonText: "Shop Now", link: "/", order: sectionAds.length, sectionId: selectedSectionId });
                        setIsEditingAd(true);
                      }}
                      className="flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2 text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Add Advert
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {ads.filter(ad => ad.sectionId === selectedSectionId).map((ad) => (
                      <div key={ad.id} className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:shadow-md">
                        <div className="aspect-video overflow-hidden bg-neutral-100">
                          <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Order {ad.order + 1}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleMoveAd(ad, 'up')}
                                disabled={ad.order === 0}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveAd(ad, 'down')}
                                disabled={ad.order === ads.filter(a => a.sectionId === selectedSectionId).length - 1}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentAd(ad);
                                  setIsEditingAd(true);
                                }}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAd(ad.id)}
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <h3 className="mt-2 font-bold text-neutral-900">{ad.title || "Untitled Advert"}</h3>
                          <p className="text-xs text-neutral-500 line-clamp-1">{ad.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {ads.filter(ad => ad.sectionId === selectedSectionId).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                      <p className="text-neutral-500">This section is empty. Add your first advert!</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-neutral-500">Create or select a section to manage adverts.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section Modal */}
      <AnimatePresence>
        {isEditingSection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-100 p-6">
                <h2 className="font-blackletter text-2xl">{currentSection.id ? "Edit Section" : "New Section"}</h2>
                <button onClick={() => setIsEditingSection(false)} className="rounded-full p-2 hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSaveSection} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Section Title</label>
                  <input
                    type="text"
                    value={currentSection.title}
                    onChange={(e) => setCurrentSection({ ...currentSection, title: e.target.value })}
                    className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                    placeholder="e.g. Featured Collection"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Layout Type</label>
                  <select
                    value={currentSection.type}
                    onChange={(e) => setCurrentSection({ ...currentSection, type: e.target.value as any })}
                    className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="slider">Slider (Carousel)</option>
                    <option value="banner">Single Banner</option>
                    <option value="grid">Grid (2 columns)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={currentSection.active}
                    onChange={(e) => setCurrentSection({ ...currentSection, active: e.target.checked })}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-neutral-700">Active (Visible on Homepage)</label>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  {currentSection.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(currentSection.id!)}
                      className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditingSection(false)}
                      className="rounded-xl px-6 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3 text-sm font-bold text-white hover:bg-neutral-800"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-100 p-6">
                <h2 className="font-blackletter text-2xl">{currentProduct.id ? "Edit Product" : "New Product"}</h2>
                <button onClick={() => setIsEditing(false)} className="rounded-full p-2 hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Hair Name</label>
                    <input
                      type="text"
                      value={currentProduct.name}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      placeholder="e.g. Brazilian Body Wave"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Price (₦)</label>
                    <input
                      type="number"
                      value={currentProduct.price}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      placeholder="50000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Category</label>
                    <select
                      value={currentProduct.category}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                    >
                      <option value="Wigs">Wigs</option>
                      <option value="Bundles">Bundles</option>
                      <option value="Closures">Closures</option>
                      <option value="Frontals">Frontals</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Description</label>
                    <input
                      type="text"
                      value={currentProduct.description}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      placeholder="Short description..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Product Image</label>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={currentProduct.imageUrl}
                        onChange={(e) => setCurrentProduct({ ...currentProduct, imageUrl: e.target.value })}
                        className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                        placeholder="Image URL or generate with AI"
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 text-xs font-bold text-neutral-900 hover:bg-neutral-200">
                          <Upload className="h-4 w-4" />
                          Upload from Device
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'product')} />
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="flex-1 rounded-xl border border-neutral-200 p-3 text-xs focus:border-neutral-900 focus:outline-none"
                            placeholder="AI Prompt"
                          />
                          <button
                            type="button"
                            onClick={() => generateImage('product')}
                            disabled={isGenerating}
                            className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                          >
                            {isGenerating ? "..." : <Sparkles className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                      {currentProduct.imageUrl ? (
                        <img src={currentProduct.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-300">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl px-6 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3 text-sm font-bold text-white hover:bg-neutral-800"
                  >
                    <Save className="h-4 w-4" />
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Modal */}
      <AnimatePresence>
        {isEditingAd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-100 p-6">
                <h2 className="font-blackletter text-2xl">{currentAd.id ? "Edit Slide" : "New Slide"}</h2>
                <button onClick={() => setIsEditingAd(false)} className="rounded-full p-2 hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSaveAd} className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Title</label>
                    <input
                      type="text"
                      value={currentAd.title}
                      onChange={(e) => setCurrentAd({ ...currentAd, title: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      placeholder="e.g. Summer Sale"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Subtitle</label>
                    <input
                      type="text"
                      value={currentAd.subtitle}
                      onChange={(e) => setCurrentAd({ ...currentAd, subtitle: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      placeholder="e.g. Up to 50% off all wigs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Button Text</label>
                    <input
                      type="text"
                      value={currentAd.buttonText}
                      onChange={(e) => setCurrentAd({ ...currentAd, buttonText: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Link (URL or #id)</label>
                    <input
                      type="text"
                      value={currentAd.link}
                      onChange={(e) => setCurrentAd({ ...currentAd, link: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                      placeholder="e.g. /products or #products-grid"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Order</label>
                    <input
                      type="number"
                      value={currentAd.order}
                      onChange={(e) => setCurrentAd({ ...currentAd, order: Number(e.target.value) })}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Banner Image (16:9)</label>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={currentAd.imageUrl}
                        onChange={(e) => setCurrentAd({ ...currentAd, imageUrl: e.target.value })}
                        className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-neutral-900 focus:outline-none"
                        placeholder="Image URL or generate with AI"
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 text-xs font-bold text-neutral-900 hover:bg-neutral-200">
                          <Upload className="h-4 w-4" />
                          Upload
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'ad')} />
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="flex-1 rounded-xl border border-neutral-200 p-3 text-xs focus:border-neutral-900 focus:outline-none"
                            placeholder="AI Prompt"
                          />
                          <button
                            type="button"
                            onClick={() => generateImage('ad')}
                            disabled={isGenerating}
                            className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
                          >
                            {isGenerating ? "..." : <Sparkles className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="aspect-video w-48 flex-shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                      {currentAd.imageUrl ? (
                        <img src={currentAd.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-300">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingAd(false)}
                    className="rounded-xl px-6 py-3 text-sm font-bold text-neutral-500 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3 text-sm font-bold text-white hover:bg-neutral-800"
                  >
                    <Save className="h-4 w-4" />
                    Save Slide
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
