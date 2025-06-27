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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          <span className="text-3xl">{product.emoji}</span>
        </div>
        
        <h3 className="mb-1">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{product.description}</p>
        <div className="text-2xl text-blue-600 mb-4">${product.price.toFixed(2)}</div>
        
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleDecrease}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            disabled={quantity === 0}
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          
          <span className="w-8 text-center">{quantity}</span>
          
          <button
            onClick={handleIncrease}
            className="w-10 h-10 rounded-xl border-2 border-blue-200 bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600" />
          </button>
        </div>
        
        {quantity > 0 && (
          <div className="text-sm text-gray-500">
            Total: ${(product.price * quantity).toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
} 