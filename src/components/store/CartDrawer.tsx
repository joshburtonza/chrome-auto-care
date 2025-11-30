import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/auth/client-login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: cartTotal,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        merchandise_id: item.merchandise_id,
        quantity: item.quantity,
        unit_price: item.merchandise.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create Yoco checkout
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-store-checkout',
        {
          body: {
            orderId: order.id,
            amount: cartTotal,
            currency: 'ZAR',
          },
        }
      );

      if (checkoutError) throw checkoutError;

      // Clear cart
      await clearCart();

      // Redirect to payment
      if (checkoutData.redirectUrl) {
        window.location.href = checkoutData.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error(error.message || 'Failed to process checkout');
      setProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card">
        <SheetHeader>
          <SheetTitle className="chrome-title text-2xl">Shopping Cart</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full py-6">
          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <ShoppingBag className="w-16 h-16 text-text-tertiary mb-4" strokeWidth={1} />
              <p className="text-text-secondary">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {cartItems.map((item) => (
                  <ChromeSurface key={item.id} className="p-4" glow>
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded chrome-surface flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-8 h-8 text-primary/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="chrome-label text-[10px] text-text-tertiary mb-1">
                          {item.merchandise.category}
                        </div>
                        <h4 className="text-sm font-light text-foreground mb-1 truncate">
                          {item.merchandise.name}
                        </h4>
                        <div className="text-primary text-sm mb-2">
                          R{item.merchandise.price.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded flex items-center justify-center border border-border hover:border-primary transition-colors"
                            disabled={processing}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm min-w-[2ch] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded flex items-center justify-center border border-border hover:border-primary transition-colors"
                            disabled={processing || item.quantity >= item.merchandise.stock_quantity}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto text-text-tertiary hover:text-red-500 transition-colors"
                            disabled={processing}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </ChromeSurface>
                ))}
              </div>

              <SheetFooter className="flex-col gap-4">
                <ChromeSurface className="p-4" glow>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Subtotal</span>
                    <span className="text-xl font-light text-foreground">
                      R{cartTotal.toFixed(2)}
                    </span>
                  </div>
                </ChromeSurface>
                <ChromeButton
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={processing || cartItems.length === 0}
                >
                  {processing ? 'Processing...' : 'Proceed to Checkout'}
                </ChromeButton>
              </SheetFooter>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};