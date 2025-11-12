import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

const schema = z.object({
  extensionDays: z.coerce.number().min(1, "Must be at least 1 day"),
  status: z.enum(["trial", "active", "expired", "suspended"]),
  autoRenew: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface SubscriptionExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: {
    id: string;
    end_date: string;
    status: string;
    auto_renew: boolean;
    tenants: { name: string } | null;
  };
  onSuccess: () => void;
}

export function SubscriptionExtendDialog({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: SubscriptionExtendDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newEndDate, setNewEndDate] = useState<Date>(new Date(subscription.end_date));

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      extensionDays: 30,
      status: subscription.status as any,
      autoRenew: subscription.auto_renew,
    },
  });

  const extensionDays = form.watch("extensionDays");

  useEffect(() => {
    if (extensionDays && extensionDays > 0) {
      const currentEndDate = new Date(subscription.end_date);
      const calculatedDate = addDays(currentEndDate, extensionDays);
      setNewEndDate(calculatedDate);
    }
  }, [extensionDays, subscription.end_date]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          end_date: newEndDate.toISOString(),
          status: data.status,
          auto_renew: data.autoRenew,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (error) throw error;

      toast.success("Subscription updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Failed to update subscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {subscription.tenants?.name}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current End Date:</span>
                <span className="font-medium">
                  {format(new Date(subscription.end_date), "PPP")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New End Date:</span>
                <span className="font-medium text-primary">
                  {format(newEndDate, "PPP")}
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="extensionDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extension Days *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      placeholder="30"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoRenew"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto Renew</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Automatically renew when subscription expires
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                Update Subscription
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
