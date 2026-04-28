import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";

export default function SquareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex gap-2 items-center">
            <ImageIcon className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Image Square</span>
          </div>
          <nav>
            <Button asChild variant="ghost">
              <Link href="/admin">Admin Login</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-8">
        {children}
      </main>
    </div>
  );
}