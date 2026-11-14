import Image from "next/image";

/**
 * The logo's cream parts vanish on the cream background, so each theme gets its own file.
 * `inverted`: for surfaces that are the opposite of the page (e.g. the ink footer in the light theme).
 */
export function Logo({ size = 40, priority = false, inverted = false }: { size?: number; priority?: boolean; inverted?: boolean }) {
  const width = Math.round(size * (1534 / 1856));
  const onLight = inverted ? "hidden [[data-theme=dark]_&]:block" : "[[data-theme=dark]_&]:hidden";
  const onDark = inverted ? "[[data-theme=dark]_&]:hidden" : "hidden [[data-theme=dark]_&]:block";
  return (
    <>
      <Image src="/brand/logo-light-bg.png" alt="Kero Amir" width={width} height={size} priority={priority} className={onLight} />
      <Image src="/brand/logo-dark-bg.png" alt="Kero Amir" width={width} height={size} priority={priority} className={onDark} />
    </>
  );
}
