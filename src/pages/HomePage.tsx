import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useCartStore } from "../store/useCartStore";
import { ShoppingCart, Plus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const sectionsQuery = query(collection(db, "ad_sections"), orderBy("order", "asc"));
    const adsQuery = query(collection(db, "advertisements"), orderBy("order", "asc"));

    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, "products");
      }
    });

    const unsubscribeSections = onSnapshot(sectionsQuery, (snapshot) => {
      const sectionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter((s: any) => s.active !== false);
      setSections(sectionsData);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, "ad_sections");
      }
    });

    const unsubscribeAds = onSnapshot(adsQuery, (snapshot) => {
      const adsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAds(adsData);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, "advertisements");
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSections();
      unsubscribeAds();
    };
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {sections.map((section, index) => (
        <div key={section.id} className="space-y-16">
          <div className={index === 0 ? "w-full" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"}>
            <AdSectionRenderer 
              section={section} 
              ads={ads.filter(a => a.sectionId === section.id)} 
              isFullWidth={index === 0}
            />
          </div>
          
          {/* Interleaved Products */}
          {products.length > 0 && (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="font-blackletter text-3xl uppercase tracking-wide">Featured Collection</h2>
                  <Link to="/shop" className="text-sm font-bold text-neutral-900 underline underline-offset-4">View All</Link>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {products.slice(index * 6, (index + 1) * 6).map((product) => (
                    <ProductCard key={product.id} product={product} addItem={addItem} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Remaining Products if any */}
      {products.length > sections.length * 6 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-blackletter text-3xl uppercase tracking-wide">More to Explore</h2>
              <Link to="/shop" className="text-sm font-bold text-neutral-900 underline underline-offset-4">View All</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {products.slice(sections.length * 6).map((product) => (
                <ProductCard key={product.id} product={product} addItem={addItem} />
              ))}
            </div>
          </div>
        </div>
      )}

      {sections.length === 0 && products.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} addItem={addItem} />
            ))}
          </div>
        </div>
      )}

      {sections.length === 0 && products.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="relative h-[200px] w-full overflow-hidden rounded-3xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <p className="font-medium">Welcome to GUSS HAIRS</p>
          </section>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, addItem }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-neutral-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">{product.name}</h3>
        <p className="text-sm font-black text-neutral-900">₦{product.price.toLocaleString()}</p>
        <button
          onClick={() => {
            addItem(product);
            toast.success(`${product.name} added to cart`);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-neutral-900 py-2 text-xs font-bold text-white transition-colors hover:bg-neutral-800"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
    </motion.div>
  );
}

interface AdSectionRendererProps {
  key?: string;
  section: any;
  ads: any[];
  isFullWidth?: boolean;
}

function AdSectionRenderer({ section, ads, isFullWidth }: AdSectionRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (section.type !== 'slider' || ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [section.type, ads.length]);

  const handleAdClick = (link: string) => {
    if (!link) return;
    if (link.startsWith('#')) {
      const element = document.getElementById(link.substring(1));
      element?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = link;
    }
  };

  if (ads.length === 0) return null;

  return (
    <section className="space-y-4">
      {section.title && (
        <h2 className={`font-blackletter text-2xl uppercase tracking-wide ${isFullWidth ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : ''}`}>
          {section.title}
        </h2>
      )}
      
      {section.type === 'slider' && (
        <div className={`group relative h-[400px] w-full overflow-hidden bg-neutral-900 sm:h-[600px] ${isFullWidth ? '' : 'rounded-3xl'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={ads[currentIndex].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img
                src={ads[currentIndex].imageUrl}
                alt={ads[currentIndex].title}
                className="h-full w-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex flex-col justify-center">
                <div className="mx-auto w-full max-w-7xl px-8 sm:px-16">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-2xl space-y-4"
                  >
                    <h2 className="font-blackletter text-5xl text-white sm:text-8xl">
                      {ads[currentIndex].title}
                    </h2>
                    <p className="text-lg text-neutral-300 sm:text-2xl">
                      {ads[currentIndex].subtitle}
                    </p>
                    {ads[currentIndex].buttonText && (
                      <button 
                        onClick={() => handleAdClick(ads[currentIndex].link || '#products-grid')}
                        className="mt-4 rounded-full bg-white px-10 py-4 font-bold text-neutral-900 transition-transform hover:scale-105 active:scale-95"
                      >
                        {ads[currentIndex].buttonText}
                      </button>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {ads.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white opacity-0 backdrop-blur-md transition-all hover:bg-white/20 group-hover:opacity-100"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % ads.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white opacity-0 backdrop-blur-md transition-all hover:bg-white/20 group-hover:opacity-100"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
                {ads.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {section.type === 'banner' && (
        <div className={`relative h-[300px] w-full overflow-hidden bg-neutral-900 ${isFullWidth ? '' : 'rounded-3xl'}`}>
          <img
            src={ads[0].imageUrl}
            alt={ads[0].title}
            className="h-full w-full object-cover opacity-70"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 flex flex-col justify-center">
            <div className="mx-auto w-full max-w-7xl px-8 sm:px-16">
              <div className="max-w-2xl space-y-2">
                <h2 className="font-blackletter text-4xl text-white sm:text-6xl">
                  {ads[0].title}
                </h2>
                <p className="text-neutral-300">
                  {ads[0].subtitle}
                </p>
                {ads[0].buttonText && (
                  <button 
                    onClick={() => handleAdClick(ads[0].link || '#products-grid')}
                    className="mt-4 rounded-full bg-white px-6 py-2 text-sm font-bold text-neutral-900 transition-transform hover:scale-105 active:scale-95"
                  >
                    {ads[0].buttonText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {section.type === 'grid' && (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isFullWidth ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : ''}`}>
          {ads.slice(0, 2).map((ad) => (
            <div key={ad.id} className="relative h-[250px] overflow-hidden rounded-3xl bg-neutral-900">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="h-full w-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="font-blackletter text-2xl text-white">{ad.title}</h3>
                <p className="text-sm text-neutral-300">{ad.subtitle}</p>
                {ad.buttonText && (
                  <button 
                    onClick={() => handleAdClick(ad.link || '#products-grid')}
                    className="mt-2 self-start rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/30"
                  >
                    {ad.buttonText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
