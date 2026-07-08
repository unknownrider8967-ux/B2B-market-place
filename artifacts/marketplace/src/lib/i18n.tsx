import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar";

export const translations = {
  en: {
    // Site
    "site.name": "MedSupplyExchange",
    // Nav labels
    "nav.browse": "Browse",
    "nav.cart": "Cart",
    "nav.orders": "Orders",
    "nav.rfqs": "RFQs",
    "nav.wishlist": "Wishlist",
    "nav.dashboard": "Dashboard",
    "nav.myOffers": "My Offers",
    "nav.companies": "Companies",
    "nav.products": "Products",
    "nav.logout": "Logout",
    // Common buttons
    "btn.save": "Save",
    "btn.cancel": "Cancel",
    "btn.submit": "Submit",
    "btn.add": "Add",
    "btn.delete": "Delete",
    "btn.edit": "Edit",
    // Landing page
    "landing.hero.headline": "Clinical procurement,\u00a0engineered for precision.",
    "landing.hero.subheadline":
      "A serious, trustworthy B2B marketplace for hospitals and distributors. Compare tiered pricing, handle MOQs, and streamline your supply chain.",
    "landing.hero.cta": "Access Marketplace",
    "landing.hero.goToApp": "Go to App",
    "landing.hero.login": "Login / Register",
    "landing.features.verified.title": "Verified Vendors",
    "landing.features.verified.desc":
      "Every distributor and manufacturer goes through strict admin approval before listing products.",
    "landing.features.realtime.title": "Real-time Data",
    "landing.features.realtime.desc":
      "Compare stock levels, delivery days, and tiered pricing side-by-side in high-density tables.",
    "landing.features.rfq.title": "Streamlined RFQs",
    "landing.features.rfq.desc":
      "Can't find exactly what you need? Submit an RFQ and let the vendors come to you.",
    "landing.footer.copy": "© {year} MedSupply Exchange. All rights reserved.",
  },
  ar: {
    // Site
    "site.name": "ميدسبلاي إكسشينج",
    // Nav labels
    "nav.browse": "تصفح",
    "nav.cart": "السلة",
    "nav.orders": "الطلبات",
    "nav.rfqs": "طلبات العروض",
    "nav.wishlist": "قائمة الأمنيات",
    "nav.dashboard": "لوحة التحكم",
    "nav.myOffers": "عروضي",
    "nav.companies": "الشركات",
    "nav.products": "المنتجات",
    "nav.logout": "تسجيل الخروج",
    // Common buttons
    "btn.save": "حفظ",
    "btn.cancel": "إلغاء",
    "btn.submit": "إرسال",
    "btn.add": "إضافة",
    "btn.delete": "حذف",
    "btn.edit": "تعديل",
    // Landing page
    "landing.hero.headline": "المشتريات السريرية،\u00a0مُصمَّمة للدقة.",
    "landing.hero.subheadline":
      "سوق B2B موثوق وجاد للمستشفيات والموزعين. قارن الأسعار المتدرجة، وتعامل مع الحد الأدنى للطلب، وبسّط سلسلة التوريد الخاصة بك.",
    "landing.hero.cta": "الدخول إلى السوق",
    "landing.hero.goToApp": "الذهاب إلى التطبيق",
    "landing.hero.login": "تسجيل الدخول / التسجيل",
    "landing.features.verified.title": "موردون موثّقون",
    "landing.features.verified.desc":
      "يمر كل موزع وشركة مصنعة بعملية موافقة إدارية صارمة قبل إدراج منتجاتهم.",
    "landing.features.realtime.title": "بيانات فورية",
    "landing.features.realtime.desc":
      "قارن مستويات المخزون وأيام التسليم والأسعار المتدرجة جنبًا إلى جنب في جداول عالية الكثافة.",
    "landing.features.rfq.title": "طلبات عروض مبسّطة",
    "landing.features.rfq.desc":
      "لم تجد ما تحتاجه بالضبط؟ أرسل طلب عرض سعر ودع الموردين يأتون إليك.",
    "landing.footer.copy": "© {year} ميدسبلاي إكسشينج. جميع الحقوق محفوظة.",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
});

const STORAGE_KEY = "medsupply_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "ar" ? "ar" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  function setLanguage(lang: Language) {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const { language, setLanguage } = useContext(LanguageContext);

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const dict = translations[language] as Record<string, string>;
    let text = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  const isRtl = language === "ar";

  return { t, language, setLanguage, isRtl };
}
