-- Fix RLS policy for order_items to allow inserts
DROP POLICY IF EXISTS "Users can insert their own order items" ON order_items;

CREATE POLICY "Users can insert order items for their orders"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);