import { ProductCard } from './ProductCard';

export function ProductCatalog({ products, cart, onQuantityChange, onGoToCart }) {
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  return (
    <div className="p-4 pb-32 relative">
      <div className="mb-6">
        <h1 className="text-center text-gray-800 mb-2">🍔 Food Delivery</h1>
        <p className="text-center text-gray-600 text-sm">Choose your favorite items</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={cart[product.id] || 0}
            onQuantityChange={onQuantityChange}
          />
        ))}
      </div>

      {/* Floating Add to Cart Button */}
      {totalItems > 0 && (
        <button
          className="fixed left-1/2 -translate-x-1/2 bottom-20 z-30 bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg text-lg font-semibold flex items-center gap-2 animate-fade-in"
          onClick={onGoToCart}
        >
          🛒 Add to Cart ({totalItems})
        </button>
      )}
    </div>
  );
} 