import { IconGrano } from "@/components/icons/pencil-icons";

// The app's loading indicator everywhere: a spinning coffee bean from the
// pencil-sketch icon set. See the bean-spin keyframes in globals.css.
export function BeanSpinner({ className = "size-5" }: { className?: string }) {
  return <IconGrano aria-hidden className={`${className} animate-bean-spin`} />;
}
