import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Calendar, DollarSign, Truck } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  merchandise: {
    name: string;
    category: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status: string;
  shipping_address: string | null;
  order_items: OrderItem[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            merchandise (
              name,
              category
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-blue-500';
      case 'pending':
        return 'text-amber-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-text-secondary';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-500';
      case 'pending':
        return 'text-amber-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="chrome-loader" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">ORDER HISTORY</h1>
          <p className="text-text-secondary">View your past orders and their status</p>
        </div>

        {orders.length === 0 ? (
          <ChromeSurface className="p-12 text-center" glow>
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No orders yet</p>
          </ChromeSurface>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <ChromeSurface key={order.id} className="p-6 chrome-sheen" glow>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="chrome-label text-[10px] text-text-tertiary mb-1">
                      ORDER #{order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        R{order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </div>
                    <div className={`text-xs capitalize ${getPaymentStatusColor(order.payment_status)}`}>
                      Payment: {order.payment_status}
                    </div>
                  </div>
                </div>

                {order.shipping_address && (
                  <div className="flex items-start gap-2 text-sm text-text-secondary mb-4 pb-4 border-b border-border/50">
                    <Truck className="w-4 h-4 mt-0.5" />
                    <div>
                      <div className="text-xs text-text-tertiary mb-1">SHIPPING ADDRESS</div>
                      {order.shipping_address}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-xs text-text-tertiary mb-2">ORDER ITEMS</div>
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <div className="text-foreground">{item.merchandise.name}</div>
                        <div className="text-xs text-text-tertiary">{item.merchandise.category}</div>
                      </div>
                      <div className="text-text-secondary mr-4">
                        Qty: {item.quantity}
                      </div>
                      <div className="text-foreground font-light">
                        R{(item.unit_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </ChromeSurface>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
