import { Minus, Plus } from 'lucide-react';

function getPriceForQuantity(price_ranges, quantity) {
  if (!Array.isArray(price_ranges)) return 0;
  const found = price_ranges.find(r => quantity >= r.min && quantity <= r.max);
  return found ? found.price : 0;
}

export function ProductCard({ product, quantity, onQuantityChange, hideQuantityControls }) {
  const handleDecrease = () => {
    if (quantity > 0) {
      onQuantityChange(product.id, quantity - 1);
    }
  };

  const handleIncrease = () => {
    onQuantityChange(product.id, quantity + 1);
  };

  // Calculate price for current quantity
  const price = getPriceForQuantity(product.price_ranges, quantity || 1);
  const total = price * quantity;

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
        <div className="text-xl text-blue-600 mb-1">€{getPriceForQuantity(product.price_ranges, 1).toFixed(2)}</div>
        <div className="text-xs text-gray-500 mb-2">
          {Array.isArray(product.price_ranges) && product.price_ranges.length > 0 && (
            product.price_ranges.map((r, idx) => (
              <span key={idx}>
                {r.min === r.max
                  ? `${r.min} vnt: €${r.price.toFixed(2)}`
                  : `${r.min}-${r.max} vnt: €${r.price.toFixed(2)}`
                }{idx < product.price_ranges.length - 1 ? ', ' : ''}
              </span>
            ))
          )}
        </div>
        {!hideQuantityControls && (
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
        )}
        {quantity > 0 && !hideQuantityControls && (
          <div className="text-xs text-gray-500">
            Iš viso: €{total.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
} 