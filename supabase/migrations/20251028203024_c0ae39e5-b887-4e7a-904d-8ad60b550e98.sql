-- Create attendance table for employee check-in/check-out tracking
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  wifi_ssid text,
  ip_address text,
  confirmed boolean DEFAULT false,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Employees can view their own attendance
CREATE POLICY "Employees can view own attendance"
ON public.attendance FOR SELECT
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

-- Employees can insert their own attendance
CREATE POLICY "Employees can insert own attendance"
ON public.attendance FOR INSERT
WITH CHECK (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

-- Employees can update their own pending attendance
CREATE POLICY "Employees can update own attendance"
ON public.attendance FOR UPDATE
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance"
ON public.attendance FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
ON public.attendance FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add can_manage_attendance permission to employee_permissions
ALTER TABLE public.employee_permissions 
ADD COLUMN can_manage_attendance boolean NOT NULL DEFAULT false;

-- Create function to calculate work hours
CREATE OR REPLACE FUNCTION public.calculate_work_hours(
  _employee_id uuid,
  _date_from date,
  _date_to date
)
RETURNS TABLE(total_hours numeric, days_present integer) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600), 0), 2) as total_hours,
    COUNT(*)::integer as days_present
  FROM public.attendance
  WHERE employee_id = _employee_id
    AND date BETWEEN _date_from AND _date_to
    AND check_in_time IS NOT NULL
    AND check_out_time IS NOT NULL
    AND status = 'present';
END;
$$;

-- Create function to validate wifi SSID
CREATE OR REPLACE FUNCTION public.validate_wifi_ssid(_ssid text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN _ssid = 'ReferenceGarden';
END;
$$;

-- Create trigger to auto-update attendance status
CREATE OR REPLACE FUNCTION public.update_attendance_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.status = 'present';
  ELSIF NEW.check_in_time IS NOT NULL THEN
    NEW.status = 'pending';
  ELSE
    NEW.status = 'absent';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_attendance_status_trigger
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_attendance_status();

-- Create index for better query performance
CREATE INDEX idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_status ON public.attendance(status);