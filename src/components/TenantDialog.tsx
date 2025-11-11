import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const createTenantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  adminEmail: z.string().email("Admin email is required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  planType: z.enum(["basic", "pro", "enterprise"]),
  subscriptionDays: z.coerce.number().min(1, "Must be at least 1 day"),
});

const editTenantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;
type EditTenantFormData = z.infer<typeof editTenantSchema>;

interface TenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  tenant?: {
    id: string;
    name: string;
    slug: string;
    contact_email: string;
    contact_phone?: string;
    address?: string;
  };
  onSuccess: () => void;
}

export function TenantDialog({ open, onOpenChange, mode, tenant, onSuccess }: TenantDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateTenantFormData | EditTenantFormData>({
    resolver: zodResolver(mode === "create" ? createTenantSchema : editTenantSchema),
    defaultValues: mode === "edit" && tenant ? {
      name: tenant.name,
      slug: tenant.slug,
      contactEmail: tenant.contact_email,
      contactPhone: tenant.contact_phone || "",
      address: tenant.address || "",
    } : {
      name: "",
      slug: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      adminEmail: "",
      adminPassword: "",
      planType: "basic",
      subscriptionDays: 30,
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (mode === "create") {
      form.setValue("slug", generateSlug(value));
    }
  };

  const onSubmit = async (data: CreateTenantFormData | EditTenantFormData) => {
    setIsLoading(true);
    try {
      if (mode === "create") {
        const createData = data as CreateTenantFormData;
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tenant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            name: createData.name,
            slug: createData.slug,
            contactEmail: createData.contactEmail,
            contactPhone: createData.contactPhone,
            address: createData.address,
            adminEmail: createData.adminEmail,
            adminPassword: createData.adminPassword,
            planType: createData.planType,
            subscriptionDays: createData.subscriptionDays,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create restaurant");
        }

        toast.success("Restaurant created successfully");
      } else {
        const editData = data as EditTenantFormData;
        const { error } = await supabase
          .from("tenants")
          .update({
            name: editData.name,
            slug: editData.slug,
            contact_email: editData.contactEmail,
            contact_phone: editData.contactPhone || null,
            address: editData.address || null,
          })
          .eq("id", tenant!.id);

        if (error) throw error;
        toast.success("Restaurant updated successfully");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Error saving restaurant:", error);
      toast.error(error.message || "Failed to save restaurant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Restaurant" : "Edit Restaurant"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restaurant Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="My Restaurant"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="my-restaurant" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="contact@restaurant.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+1234567890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St, City, Country" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "create" && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-4">Admin Account</h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="admin@restaurant.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Password *</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Min 8 characters" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-4">Subscription</h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="planType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subscriptionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Days *</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" placeholder="30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Restaurant" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
