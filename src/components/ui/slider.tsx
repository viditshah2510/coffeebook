"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: SliderPrimitive.Root.Props<number>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-coffee-cream">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-coffee-gold" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-coffee-gold bg-white shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coffee-gold focus-visible:ring-offset-2 active:scale-110" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
