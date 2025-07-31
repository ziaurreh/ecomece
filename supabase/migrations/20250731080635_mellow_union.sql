/*
  # Create hero sections table

  1. New Tables
    - `hero_sections`
      - `id` (uuid, primary key)
      - `title` (text, hero title)
      - `subtitle` (text, hero subtitle)
      - `description` (text, hero description)
      - `cta_text` (text, call-to-action button text)
      - `cta_link` (text, call-to-action button link)
      - `background_image` (text, background image URL)
      - `is_active` (boolean, whether this hero is active)
      - `order_index` (integer, display order)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `hero_sections` table
    - Add policy for public read access
    - Add policy for admin management
*/

CREATE TABLE IF NOT EXISTS public.hero_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cta_text TEXT DEFAULT 'Shop Now',
  cta_link TEXT DEFAULT '/products',
  background_image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_sections ENABLE ROW LEVEL SECURITY;

-- Public can view active hero sections
CREATE POLICY "Everyone can view active hero sections"
  ON public.hero_sections
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all hero sections
CREATE POLICY "Admins can manage hero sections"
  ON public.hero_sections
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_hero_sections_updated_at
  BEFORE UPDATE ON public.hero_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default hero section
INSERT INTO public.hero_sections (title, subtitle, description, cta_text, cta_link, order_index) VALUES
  ('Discover Amazing Products at Unbeatable Prices', '✨ Welcome to the Future of Shopping', 'Shop the latest trends, find unique items, and enjoy a seamless shopping experience with fast delivery and excellent customer service.', 'Shop Now', '/products', 1);