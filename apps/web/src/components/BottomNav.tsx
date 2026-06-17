"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const createActive = pathname === "/create";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-end justify-around px-8 pb-safe pt-2">
        <NavItem href="/" label="Feed" icon={Home} active={pathname === "/"} />

        <div className="-mt-7 flex flex-col items-center">
          <Link
            href="/create"
            prefetch
            className={cn(
              "flex min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow transition-colors duration-200 active:opacity-90",
              createActive && "ring-4 ring-primary/30 ring-offset-2 ring-offset-background"
            )}
            aria-label="Create task"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </Link>
          <span
            className={cn(
              "mt-1.5 text-[11px] font-bold",
              createActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            Create
          </span>
        </div>

        <NavItem
          href="/my-tasks"
          label="My Tasks"
          icon={ClipboardList}
          active={pathname.startsWith("/my-tasks")}
        />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors duration-200",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200",
          active && "bg-primary/15 text-primary"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
      </span>
      {label}
    </Link>
  );
}
