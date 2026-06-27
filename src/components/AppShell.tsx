"use client";

import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface ShellUser {
  name: string;
  role: string;
  allowed: string[];
}

/**
 * App chrome: a FIXED sidebar that never scrolls with the page, plus a sticky
 * top bar with a hide/show toggle. Only the <main> area scrolls.
 *
 *  - Desktop: sidebar can be collapsed to an icon rail (state remembered).
 *  - Mobile (< lg): sidebar is an off-canvas drawer opened from the menu button.
 */
export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false); // desktop icon-rail
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer

  // Remember the desktop collapse preference across visits.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pakgold_sidebar_collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("pakgold_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Close the mobile drawer on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg)]">
      {/* Desktop sidebar — part of the flex row, fixed in place, never scrolls with content. */}
      <div className="hidden lg:block h-full">
        <Sidebar user={user} collapsed={collapsed} />
      </div>

      {/* Mobile drawer + backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
        <div
          className={`absolute inset-y-0 left-0 h-full transition-transform duration-200 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="relative h-full">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute -right-10 top-3 rounded-lg bg-navy-900 text-white p-2"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <Sidebar user={user} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Sticky top bar with the show/hide toggle */}
        <header className="no-print shrink-0 h-14 bg-white/90 backdrop-blur border-b border-black/5 flex items-center gap-2 px-3 sm:px-4">
          {/* Mobile: open drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden rounded-lg p-2 hover:bg-gray-100 text-navy-900"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          {/* Desktop: collapse / expand */}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:inline-flex rounded-lg p-2 hover:bg-gray-100 text-navy-900"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          <div className="font-bold tracking-tight text-navy-900">
            <span className="text-gold-600">Pak</span>Gold
            <span className="text-xs font-normal text-gray-400 ml-1">POS</span>
          </div>
          <div className="ml-auto text-sm text-gray-500 hidden sm:block">
            {user.name} · <span className="capitalize">{user.role}</span>
          </div>
        </header>

        {/* The ONLY scroll container. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
