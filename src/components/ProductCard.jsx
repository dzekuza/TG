import { Minus, Plus } from 'lucide-react';

export function ProductCard({ product, quantity, onQuantityChange }) {
  const handleDecrease = () => {
    if (quantity > 0) {
      onQuantityChange(product.id, quantity - 1);
    }
  };

  const handleIncrease = () => {
    onQuantityChange(product.id, quantity + 1);
  };

  // Use admin-set prices for 1, 2, 3 pieces
  const price1 = typeof product.price_1 === 'number' ? product.price_1 : Number(product.price_1) || 0;
  const price2 = typeof product.price_2 === 'number' ? product.price_2 : Number(product.price_2) || price1 * 2;
  const price3 = typeof product.price_3 === 'number' ? product.price_3 : Number(product.price_3) || price1 * 3;

  // Calculate total based on quantity
  let total = 0;
  if (quantity === 1) total = price1;
  else if (quantity === 2) total = price2;
  else if (quantity === 3) total = price3;
  else if (quantity > 3) total = price1 * quantity;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col items-start text-left">
        <div className="w-16 h-16 mb-3 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span className="text-2xl">{product.emoji}</span>
          )}
        </div>
        <h3 className="mb-1 font-semibold text-base">{product.name}</h3>
        <div className="text-xl text-blue-600 mb-1">€{price1.toFixed(2)}</div>
        <div className="text-xs text-gray-500 mb-2">
          2 vnt: €{price2.toFixed(2)}, 3 vnt: €{price3.toFixed(2)}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={handleDecrease}
            className="w-8 h-8 rounded-lg border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            disabled={quantity === 0}
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <span className="w-8 text-center">{quantity}</span>
          <button
            onClick={handleIncrease}
            className="w-8 h-8 rounded-lg border-2 border-blue-200 bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600" />
          </button>
        </div>
        {quantity > 0 && (
          <div className="text-xs text-gray-500">
            Iš viso: €{total.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
} 