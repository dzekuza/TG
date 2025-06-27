import { ProductCard } from './ProductCard';

export function ProductCatalog({ products, cart, onQuantityChange }) {
  return (
    <div className="p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-center text-gray-800 mb-2">🍔 Food Delivery</h1>
        <p className="text-center text-gray-600 text-sm">Choose your favorite items</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={cart[product.id] || 0}
            onQuantityChange={onQuantityChange}
          />
        ))}
      </div>
    </div>
  );
} 