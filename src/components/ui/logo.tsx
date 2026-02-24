import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface LogoProps {
  variant?: "full" | "icon" | "text" | "login";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  const { resolvedTheme } = useTheme();

  const sizeClasses = {
    sm: {
      image: "h-16 w-auto",
      login: "h-32 w-auto"
    },
    md: {
      image: "h-24 w-auto",
      login: "h-40 w-auto"
    },
    lg: {
      image: "h-32 w-auto",
      login: "h-48 w-auto"
    }
  };

  // Use theme-aware logo: white version for dark mode, dark version for light mode
  const logoSrc = resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  if (variant === "login") {
    return (
      <img
        src={logoSrc}
        alt="Lost in Time"
        className={cn("login-logo", className)}
        loading="eager"
      />
    );
  }

  if (variant === "icon") {
    return (
      <img
        src={logoSrc}
        alt="Lost in Time"
        className={cn(sizeClasses[size].image, className)}
      />
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <img
          src={logoSrc}
          alt="Lost in Time"
          className={sizeClasses[size].image}
        />
      </div>
    );
  }

  // Default "full" variant
  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <img
        src={logoSrc}
        alt="Lost in Time"
        className={sizeClasses[size].image}
      />
    </div>
  );
}