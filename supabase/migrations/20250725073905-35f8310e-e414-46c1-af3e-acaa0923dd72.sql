-- Fix search path issues for security functions by altering them
ALTER FUNCTION public.has_role(_user_id UUID, _role app_role) SET search_path = public, auth;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;