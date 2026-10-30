"use client";

import type { Preferences } from "../../../hooks/use-preferences";

/** Independently maintained Settings section. */
export default function AppearanceSettings({prefs}:{prefs:Preferences}) {
  const { theme,setTheme,t }=prefs;
  return (
    <section className="surface-panel  rounded-2xl border border-white/10 bg-[#172338] p-5 sm:p-6 2xl:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t("Appearance","外观主题")}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{t("Choose the look that suits your workspace. Changes apply immediately and are saved in this browser.","选择适合你的界面风格。切换立即生效，并自动保存在当前浏览器中。")}</p>
                </div>
                <span className="surface-pill rounded-full px-3 py-1.5 text-[11px] font-semibold">{theme==="light"?t("Light","浅色主题"):t("Dark","深色主题")}</span>
              </div>
              <div role="group" aria-label={t("Color theme","颜色主题")} className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={()=>setTheme("light")} aria-pressed={theme==="light"} className={"theme-choice rounded-2xl p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 "+(theme==="light"?"theme-choice-active":"")}>
                  <div className="theme-miniature theme-miniature-light" aria-hidden="true">
                    <div className="miniature-topbar"><span className="miniature-dot"/> SEE</div>
                    <div className="miniature-layout"><div className="miniature-sidebar"><span/><span/><span/></div><div className="miniature-content"><div className="miniature-chart"><span/><span/><span/><span/><span/></div><div className="miniature-cards"><span/><span/><span/></div></div></div>
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span><span className="block text-sm font-semibold">{t("☀ Light","☀ 浅色主题")}</span><span className="mt-1 block text-xs text-slate-400">{t("Bright, airy, clear","明亮、通透、清晰")}</span></span>
                    <span className="theme-choice-indicator" aria-hidden="true">{theme==="light"?"✓":""}</span>
                  </span>
                </button>
                <button type="button" onClick={()=>setTheme("dark")} aria-pressed={theme==="dark"} className={"theme-choice rounded-2xl p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 "+(theme==="dark"?"theme-choice-active":"")}>
                  <div className="theme-miniature theme-miniature-dark" aria-hidden="true">
                    <div className="miniature-topbar"><span className="miniature-dot"/> SEE</div>
                    <div className="miniature-layout"><div className="miniature-sidebar"><span/><span/><span/></div><div className="miniature-content"><div className="miniature-chart"><span/><span/><span/><span/><span/></div><div className="miniature-cards"><span/><span/><span/></div></div></div>
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <span><span className="block text-sm font-semibold">{t("☾ Dark","☾ 深色主题")}</span><span className="mt-1 block text-xs text-slate-400">{t("Focused, calm, immersive","专注、沉稳、沉浸")}</span></span>
                    <span className="theme-choice-indicator" aria-hidden="true">{theme==="dark"?"✓":""}</span>
                  </span>
                </button>
              </div>
            </section>
  );
}
