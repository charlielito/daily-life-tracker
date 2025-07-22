"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

interface SelectTriggerProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

// Context for managing select state
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

// Main Select component
const Select = React.forwardRef<
  HTMLSelectElement,
  {
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
    value?: string;
    defaultValue?: string;
  }
>(({ onValueChange, children, value, defaultValue, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange }}>
      <select
        ref={ref}
        value={currentValue}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        {children}
      </select>
    </SelectContext.Provider>
  );
});
Select.displayName = "Select";

// SelectTrigger (for compatibility, but we use native select)
const SelectTrigger = React.forwardRef<HTMLSelectElement, SelectTriggerProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

// SelectContent (wrapper for options)
const SelectContent = ({ children }: SelectContentProps) => {
  return <>{children}</>;
};

// SelectItem (option element)
const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ children, value, ...props }, ref) => {
    return (
      <option ref={ref} value={value} {...props}>
        {children}
      </option>
    );
  }
);
SelectItem.displayName = "SelectItem";

// SelectValue (placeholder functionality)
const SelectValue = ({ placeholder }: SelectValueProps) => {
  return (
    <option value="" disabled>
      {placeholder}
    </option>
  );
};

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }; 