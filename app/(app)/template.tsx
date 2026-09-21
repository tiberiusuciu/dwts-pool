import { ViewTransition } from "react";

export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "fade-slide",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "fade-slide",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
