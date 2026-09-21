import Script from "next/script";

import { THEME_STORAGE_KEY } from "@/lib/theme";

/** Runs before hydration to avoid a theme flash. */
export function ThemeScript() {
  const code = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var r=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;var e=document.documentElement;e.dataset.theme=r;e.style.colorScheme=r;}catch(e){}})();`;

  return (
    <Script id="dwts-theme-boot" strategy="beforeInteractive">
      {code}
    </Script>
  );
}
