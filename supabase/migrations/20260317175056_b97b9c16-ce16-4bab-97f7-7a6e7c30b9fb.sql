
ALTER TABLE co_activity DROP CONSTRAINT co_activity_actor_user_id_fkey;
ALTER TABLE co_activity ADD CONSTRAINT co_activity_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE co_nte_log DROP CONSTRAINT co_nte_log_requested_by_user_id_fkey;
ALTER TABLE co_nte_log ADD CONSTRAINT co_nte_log_requested_by_user_id_fkey
  FOREIGN KEY (requested_by_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE co_nte_log DROP CONSTRAINT co_nte_log_approved_by_user_id_fkey;
ALTER TABLE co_nte_log ADD CONSTRAINT co_nte_log_approved_by_user_id_fkey
  FOREIGN KEY (approved_by_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
