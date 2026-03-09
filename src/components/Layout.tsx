import { AppSidebar } from "./Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, User } from "lucide-react";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { dir } = useLanguage();

  // Force light theme for restaurant pages + handle RTL
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.dir = dir;
  }, [dir]);

  const { data: employeeData } = useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("employees")
        .select("name, position")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching employee data:", error);
        return null;
      }
      return data;
    },
  });

  const initials = employeeData?.name
    ? employeeData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b px-4 sm:px-6 bg-card">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </button>
              {employeeData && (
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-foreground">{employeeData.name}</span>
                    <span className="text-xs text-muted-foreground">{employeeData.position}</span>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
