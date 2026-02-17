CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _full_name text;
  _first_name text;
  _last_name text;
  _parts text[];
BEGIN
  _full_name := NEW.raw_user_meta_data->>'full_name';
  IF _full_name IS NOT NULL AND _full_name != '' THEN
    _parts := string_to_array(trim(_full_name), ' ');
    _first_name := _parts[1];
    _last_name := CASE WHEN array_length(_parts, 1) > 1 
                       THEN array_to_string(_parts[2:], ' ') 
                       ELSE NULL END;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, first_name, last_name)
  VALUES (NEW.id, NEW.email, _full_name, _first_name, _last_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;