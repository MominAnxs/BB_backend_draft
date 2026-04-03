/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./adminland/**/*.{ts,tsx}",
    "./workspace/**/*.{ts,tsx}",
    "./*.{ts,tsx}",
  ],
  theme: {
    extend: {
      /* ── Typography ── */
      fontFamily: {
        sans: ["'Manrope'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
      },
      fontSize: {
        h1:      ["24px", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.3px" }],
        h2:      ["20px", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.2px" }],
        h3:      ["16px", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "-0.1px" }],
        body:    ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        micro:   ["10.5px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.04em" }],
      },

      /* ── Colour tokens ── */
      colors: {
        background:   "var(--background)",
        card:         "var(--card)",
        "card-border":"var(--card-border)",
        border:       "var(--border)",
        muted:        { DEFAULT: "var(--muted)", fg: "var(--muted-fg)" },
        foreground:   "var(--foreground)",
        primary:      "var(--primary)",
        "secondary-fg": "var(--secondary-fg)",
        accent:       { DEFAULT: "var(--accent)", subtle: "var(--accent-subtle)" },
        destructive:  { DEFAULT: "var(--destructive)", subtle: "var(--dest-subtle)" },
        warning:      { DEFAULT: "var(--warning)", subtle: "var(--warn-subtle)" },
        success:      { DEFAULT: "var(--success)", subtle: "var(--succ-subtle)" },
      },

      /* ── Spacing (8px grid) ── */
      spacing: {
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "12px",
        "sp-4": "16px",
        "sp-5": "20px",
        "sp-6": "24px",
        "sp-7": "32px",
        "sp-8": "40px",
      },

      /* ── Radius ── */
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        full: "999px",
      },

      /* ── Shadows ── */
      boxShadow: {
        xs:  "0 1px 2px rgba(0, 0, 0, 0.04)",
        sm:  "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        md:  "0 4px 12px rgba(0, 0, 0, 0.07)",
        lg:  "0 8px 24px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
