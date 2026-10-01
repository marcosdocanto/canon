"use client"

import * as React from "react"
import { DirectionProvider as RadixDirectionProvider, useDirection as useRadixDirection } from "@radix-ui/react-direction"

function DirectionProvider({
  dir,
  children,
}: React.ComponentProps<typeof RadixDirectionProvider>) {
  return <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>
}

const useDirection = useRadixDirection

export { DirectionProvider, useDirection }
