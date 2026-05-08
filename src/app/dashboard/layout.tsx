import { Providers } from "@/components/providers";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers>
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 flex">
                <AppSidebar />
                <main className="flex-1 overflow-auto lg:ml-72">
                    <div className="p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </Providers>
    );
}
