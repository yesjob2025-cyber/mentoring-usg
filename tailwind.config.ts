import type { Config } from "tailwindcss";

/**
 * YESJOB 브랜드 토큰 — 제안서 표지 기준
 *  - 크림 배경 / 옐로우 포인트 / 차콜 텍스트 ("사원증" 컨셉)
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#F7F2E9",
          50: "#FDFBF6",
          100: "#F7F2E9",
          200: "#EFE7D6",
          300: "#E4D8BE",
        },
        brand: {
          // 옐로우 포인트
          DEFAULT: "#F6CE51",
          50: "#FEF9E7",
          100: "#FCEFBF",
          200: "#FAE28C",
          300: "#F6CE51",
          400: "#F2B705",
          500: "#D69E00",
        },
        ink: {
          // 차콜 텍스트/버튼
          DEFAULT: "#2E2A25",
          soft: "#4A443C",
          muted: "#867D6E",
          line: "#E7DECB",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "'Helvetica Neue'",
          "'Segoe UI'",
          "'Apple SD Gothic Neo'",
          "'Noto Sans KR'",
          "'Malgun Gothic'",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 18px -8px rgba(46, 42, 37, 0.18)",
        pop: "0 12px 40px -12px rgba(46, 42, 37, 0.30)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
