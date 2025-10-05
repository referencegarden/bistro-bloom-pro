-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create purchases table (incoming stock)
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Create sales table (outgoing stock)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable Row Level Security (allow public access for now)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies for full access (no auth required for simple version)
CREATE POLICY "Public access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- Function to update product stock after purchase
CREATE OR REPLACE FUNCTION public.update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET current_stock = current_stock + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION public.update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET current_stock = current_stock - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for purchases
CREATE TRIGGER trigger_update_stock_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_purchase();

-- Trigger for sales
CREATE TRIGGER trigger_update_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_sale();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
  ('Beverages', 'All types of drinks'),
  ('Food', 'Food items'),
  ('Supplies', 'Kitchen and restaurant supplies');

-- Insert sample products
INSERT INTO public.products (name, category_id, current_stock, unit_price, low_stock_threshold) VALUES
  ('Coffee', (SELECT id FROM public.categories WHERE name = 'Beverages'), 50, 3.50, 20),
  ('Tea', (SELECT id FROM public.categories WHERE name = 'Beverages'), 30, 2.50, 15),
  ('Burger', (SELECT id FROM public.categories WHERE name = 'Food'), 0, 8.99, 10),
  ('Pizza', (SELECT id FROM public.categories WHERE name = 'Food'), 0, 12.99, 5),
  ('Napkins', (SELECT id FROM public.categories WHERE name = 'Supplies'), 200, 0.50, 50);