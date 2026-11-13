import Image from "next/image";

// The logo's cream parts vanish on the cream background, so each theme gets its own file.
export function Logo({ size = 40, priority = false }: { size?: number; priority?: boolean }) {
  const width = Math.round(size * (1534 / 1856));
  return (
    <>
      <Image src="/brand/logo-light-bg.png" alt="Kero Amir" width={width} height={size} priority={priority}
        className="[[data-theme=dark]_&]:hidden" />
      <Image src="/brand/logo-dark-bg.png" alt="Kero Amir" width={width} height={size} priority={priority}
        className="hidden [[data-theme=dark]_&]:block" />
    </>
  );
}
