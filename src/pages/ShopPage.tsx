import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useCartStore } from "../store/useCartStore";
import { Plus, Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));

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

    return () => unsubscribeProducts();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-blackletter text-5xl uppercase tracking-wide">All Products</h1>
          <p className="text-neutral-500">Browse our complete collection of premium hair</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <button className="flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:shadow-xl"
          >
            <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">{product.category || "Hair"}</p>
                  <h3 className="mt-1 text-lg font-bold text-neutral-900">{product.name}</h3>
                </div>
                <p className="text-lg font-black text-neutral-900">₦{product.price.toLocaleString()}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{product.description}</p>
              <button
                onClick={() => {
                  addItem(product);
                  toast.success(`${product.name} added to cart`);
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition-colors hover:bg-neutral-800 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Add to Cart
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-medium text-neutral-500">No products found matching your search.</p>
        </div>
      )}
    </div>
  );
}
