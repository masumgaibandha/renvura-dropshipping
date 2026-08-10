import Image from "next/image";
import { Button } from "@heroui/react";

import { brand } from "@/config/brand";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-6 py-24 text-center text-foreground">
      <Image
        src={brand.assets.logo.light}
        alt={brand.name}
        width={280}
        height={84}
        priority
        className="dark:hidden"
      />
      <Image
        src={brand.assets.logo.dark}
        alt={brand.name}
        width={280}
        height={84}
        priority
        className="hidden dark:block"
      />
      <p className="max-w-md text-sm text-foreground/70">
        Foundation build in progress. {brand.description}
      </p>
      <Button variant="primary">{brand.tagline}</Button>
    </main>
  );
}
