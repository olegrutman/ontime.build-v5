ALTER TABLE change_orders DROP CONSTRAINT change_orders_created_by_user_id_fkey;
ALTER TABLE change_orders ADD CONSTRAINT change_orders_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;