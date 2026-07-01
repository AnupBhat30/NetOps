import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18201d",
        muted: "#65716c",
        line: "#dfe7e2",
        panel: "#ffffff",
        soft: "#f6faf7",
        networkBlue: "#234e46",
        networkCyan: "#6fb7a6",
        moss: "#234e46",
        mint: "#6fb7a6",
        coral: "#3d6f64",
        plum: "#17211f"
      },
      boxShadow: {
        product: "0 18px 60px rgba(17, 17, 20, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
