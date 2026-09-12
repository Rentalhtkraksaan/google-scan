"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ShieldCheck, Search, Check, ChevronDown, Crown, Briefcase, Users, X } from "lucide-react";

export interface AdminSelectItem {
  id: string;
  fullName: string;
  role?: string;
  isSuperAdminMaster?: boolean;
}

interface AdminSelectSearchableProps {
  value: string;
  onChange: (value: string) => void;
  superAdmins?: { id: string; fullName: string; isSuperAdminMaster?: boolean }[];
  admins?: { id: string; fullName: string }[];
  placeholder?: string;
}

export function AdminSelectSearchable({
  value,
  onChange,
  superAdmins = [],
  admins = [],
  placeholder = "Pilih Admin / Mitra...",
}: AdminSelectSearchableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter items based on search query
  const query = searchQuery.trim().toLowerCase();

  const filteredSuperAdmins = useMemo(() => {
    if (!query) return superAdmins;
    return superAdmins.filter(
      (sa) =>
        sa.fullName.toLowerCase().includes(query) ||
        (sa.isSuperAdminMaster ? "super admin 1 master" : "super admin 2").includes(query)
    );
  }, [superAdmins, query]);

  const filteredAdmins = useMemo(() => {
    if (!query) return admins;
    return admins.filter(
      (adm) => adm.fullName.toLowerCase().includes(query) || "mitra lapangan".includes(query)
    );
  }, [admins, query]);

  const showUnassigned = useMemo(() => {
    if (!query) return true;
    return "kolam umum tanpa admin".includes(query);
  }, [query]);

  // Find currently selected label
  const selectedLabel = useMemo(() => {
    if (!value || value === "unassigned") {
      return {
        title: "-- Kolam Umum (Tanpa Admin) --",
        type: "UNASSIGNED",
        badge: null,
      };
    }
    const foundSA = superAdmins.find((sa) => sa.id === value);
    if (foundSA) {
      return {
        title: foundSA.fullName,
        type: "SUPER_ADMIN",
        badge: foundSA.isSuperAdminMaster ? "Super Admin 1 / Master" : "Super Admin 2",
      };
    }
    const foundAdm = admins.find((adm) => adm.id === value);
    if (foundAdm) {
      return {
        title: foundAdm.fullName,
        type: "ADMIN",
        badge: "Mitra Lapangan",
      };
    }
    return {
      title: placeholder,
      type: "UNKNOWN",
      badge: null,
    };
  }, [value, superAdmins, admins, placeholder]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const totalResults =
    (showUnassigned ? 1 : 0) + filteredSuperAdmins.length + filteredAdmins.length;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 flex items-center justify-between gap-2 text-left hover:border-slate-700 transition-colors focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium truncate text-white">{selectedLabel.title}</span>
          {selectedLabel.badge && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                selectedLabel.type === "SUPER_ADMIN"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {selectedLabel.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-800 bg-slate-950/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama admin / mitra..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Items List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-800/40">
            {/* Option: Kolam Umum */}
            {showUnassigned && (
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => handleSelect("unassigned")}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    !value || value === "unassigned"
                      ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>-- Kolam Umum (Tanpa Admin) --</span>
                  </div>
                  {(!value || value === "unassigned") && (
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </button>
              </div>
            )}

            {/* Category: Super Admin */}
            {filteredSuperAdmins.length > 0 && (
              <div className="pt-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Tim Super Admin</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredSuperAdmins.map((sa) => {
                    const isSelected = value === sa.id;
                    return (
                      <button
                        key={sa.id}
                        type="button"
                        onClick={() => handleSelect(sa.id)}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 text-amber-200 font-semibold border border-amber-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{sa.fullName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/20 shrink-0 font-medium">
                            {sa.isSuperAdminMaster ? "Super Admin 1 / Master" : "Super Admin 2"}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category: Mitra Lapangan (Admin) */}
            {filteredAdmins.length > 0 && (
              <div className="pt-1.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3 text-emerald-400" />
                  <span>Mitra Lapangan (Admin)</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {filteredAdmins.map((adm) => {
                    const isSelected = value === adm.id;
                    return (
                      <button
                        key={adm.id}
                        type="button"
                        onClick={() => handleSelect(adm.id)}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-200 font-semibold border border-emerald-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{adm.fullName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/20 shrink-0 font-medium">
                            Mitra Lapangan
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {totalResults === 0 && (
              <div className="py-6 text-center text-xs text-slate-500">
                Tidak ada admin/mitra yang cocok dengan &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
