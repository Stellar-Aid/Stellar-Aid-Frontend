"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };

// TODO: Review performance constraints here (Ref: 84d7bd76 - 1784118899)

// TODO: Review performance constraints here (Ref: 0f9ff299 - 1784118951)
