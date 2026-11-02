import React, { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * items: [{ label, icon, onClick, className }]
 * trigger: React element (wrapped with asChild)
 */
export default function ActionSheet({ items, trigger, align = "end" }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleClick = (onClick) => {
    setOpen(false);
    onClick?.();
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">Actions</DrawerTitle>
          </DrawerHeader>
          <div
            className="px-2 overflow-y-auto"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => handleClick(item.onClick)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium select-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                  item.className
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, i) => (
          <DropdownMenuItem key={i} onClick={item.onClick} className={item.className}>
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * options: [{ value, label }]
 */
export function MobileSelect({ value, onValueChange, placeholder, options, triggerClassName }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background select-none",
              triggerClassName
            )}
          >
            <span className="truncate">{label}</span>
            <svg className="h-4 w-4 opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">{placeholder}</DrawerTitle>
          </DrawerHeader>
          <div
            className="px-2 overflow-y-auto"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-sm font-medium select-none transition-colors",
                  opt.value === value ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {opt.label}
                {opt.value === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}