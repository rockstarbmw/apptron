import { forwardRef } from "react";
import { type VariantProps } from "class-variance-authority";
import { LogIn } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button.tsx";

export interface SignInButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showIcon?: boolean;
  signInText?: string;
  asChild?: boolean;
}

export const SignInButton = forwardRef<HTMLButtonElement, SignInButtonProps>(
  (
    {
      onClick,
      disabled,
      showIcon = true,
      signInText = "Sign In",
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        variant={variant}
        size={size}
        className={className}
        asChild={asChild}
        aria-label="Sign in to your account"
        {...props}
      >
        {showIcon && <LogIn className="size-4" />}
        {signInText}
      </Button>
    );
  },
);

SignInButton.displayName = "SignInButton";
