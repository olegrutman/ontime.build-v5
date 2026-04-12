ALTER TABLE project_scope_details DROP CONSTRAINT IF EXISTS project_scope_details_home_type_check;
ALTER TABLE project_scope_details ADD CONSTRAINT project_scope_details_home_type_check
  CHECK (home_type = ANY (ARRAY[
    'custom_home', 'track_home', 'townhomes',
    'apartments_mf', 'hotel_hospitality', 'senior_living'
  ]));