
export const metadata = {
  title: "TechLap — دستیار فروش هوشمند",
  description: "نسخه واقعی و قابل هاست‌شدن دستیار فروش هوش مصنوعی",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Tahoma, sans-serif" }}>{children}</body>
    </html>
  );
}
