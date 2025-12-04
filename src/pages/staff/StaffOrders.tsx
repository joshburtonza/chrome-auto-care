import { StaffNav } from "@/components/staff/StaffNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Calendar, DollarSign, User, Truck, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  user_id: string;
  order_items: OrderItem[];
  customer_name?: string;
  customer_phone?: string;
}

const StaffOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
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

      // Fetch customer details for each order
      const ordersWithCustomers = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', order.user_id)
            .single();

          return {
            ...order,
            customer_name: profile?.full_name,
            customer_phone: profile?.phone,
          };
        })
      );

      setOrders(ordersWithCustomers);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order status updated');
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      default:
        return 'bg-text-secondary/20 text-text-secondary border-text-secondary/30';
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
      <div className="min-h-screen bg-background staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="chrome-loader" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">ORDERS MANAGEMENT</h1>
          <p className="text-text-secondary">View and manage customer orders</p>
        </div>

        {orders.length === 0 ? (
          <ChromeSurface className="p-12 text-center" glow>
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No orders yet</p>
          </ChromeSurface>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Collapsible key={order.id} open={expandedOrders.has(order.id)}>
                <ChromeSurface className="p-6 chrome-sheen" glow>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="chrome-label text-[10px] text-text-tertiary">
                          ORDER #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <div className={`text-xs ${getPaymentStatusColor(order.payment_status)}`}>
                          Payment: {order.payment_status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-text-secondary mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          R{order.total_amount.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {order.customer_name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        <CollapsibleTrigger asChild>
                          <ChromeButton
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpanded(order.id)}
                          >
                            {expandedOrders.has(order.id) ? 'Hide' : 'Show'} Details
                            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedOrders.has(order.id) ? 'rotate-180' : ''}`} />
                          </ChromeButton>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-4 pt-4 border-t border-border/50">
                    <div className="space-y-4">
                      {/* Customer Details */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-text-tertiary mb-2">CUSTOMER DETAILS</div>
                          <div className="text-sm space-y-1">
                            <div className="text-foreground">{order.customer_name || 'N/A'}</div>
                            <div className="text-text-secondary">{order.customer_phone || 'N/A'}</div>
                          </div>
                        </div>

                        {order.shipping_address && (
                          <div>
                            <div className="text-xs text-text-tertiary mb-2 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              SHIPPING ADDRESS
                            </div>
                            <div className="text-sm text-text-secondary">
                              {order.shipping_address}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Order Items */}
                      <div>
                        <div className="text-xs text-text-tertiary mb-3">ORDER ITEMS</div>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm chrome-surface p-3 rounded">
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
                      </div>
                    </div>
                  </CollapsibleContent>
                </ChromeSurface>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffOrders;
