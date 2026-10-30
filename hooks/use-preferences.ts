"use client";

import { useEffect, useState } from "react";
import { companies } from "../lib/demo/market";
import type { Currency, Delivery, Language, Theme, Tone } from "../types/app";

/** Browser-local UI preferences; safe defaults and backward-compatible storage keys. */
export function usePreferences() {
  const [loaded,setLoaded] = useState(false);
  const [watchlist,setWatchlist] = useState<string[]>(["NVDA","AAPL","MSFT","GOOGL","TSLA"]);
  const [minimumScore,setMinimumScore] = useState(70);
  const [briefTone,setBriefTone] = useState<"All"|Tone>("All");
  const [briefTicker,setBriefTicker] = useState("All");
  const [notifications,setNotifications] = useState(false);
  const [delivery,setDelivery] = useState<Delivery>("major");
  const [language,setLanguage] = useState<Language>("en");
  const [currency,setCurrency] = useState<Currency>("USD");
  const [theme,setTheme] = useState<Theme>("dark");
  const t = (english:string,chinese:string) => language === "zh" ? chinese : english;

  useEffect(() => {
    // Read browser storage after hydration, not during server rendering.
    const frame = requestAnimationFrame(() => {
    try {
      const get = (key:string) => localStorage.getItem(key);
      const savedList = get("see-watchlist-v1");
      if(savedList !== null) {
        const data:unknown = JSON.parse(savedList);
        if(Array.isArray(data)) setWatchlist(data.filter((x):x is string => typeof x==="string" && companies.some(c=>c.ticker===x)));
      }
      const score=Number(get("see-minimum-score-v1"));
      if(get("see-minimum-score-v1")!==null && Number.isFinite(score) && score>=40 && score<=95) setMinimumScore(score);
      const tone=get("see-brief-tone-v1");
      if(tone==="All"||tone==="Positive"||tone==="Mixed"||tone==="Negative") setBriefTone(tone);
      const oldMode=get("see-alert-mode-v1");
      const mode=get("see-delivery-v1") ?? (oldMode==="All updates"?"all":oldMode==="Daily digest only"?"digest":"major");
      if(mode==="all"||mode==="major"||mode==="digest") setDelivery(mode);
      if(get("see-notifications-v1")==="true") setNotifications(true);
      if(get("see-language-v1")==="zh") setLanguage("zh");
      if(get("see-currency-v1")==="CNY") setCurrency("CNY");
      if(get("see-theme-v1")==="light") setTheme("light");
    } catch { /* Use safe defaults when storage is unavailable. */ }
    setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  },[]);
  useEffect(() => {
    if(!loaded) return;
    try {
      localStorage.setItem("see-watchlist-v1",JSON.stringify(watchlist));
      localStorage.setItem("see-minimum-score-v1",String(minimumScore));
      localStorage.setItem("see-brief-tone-v1",briefTone);
      localStorage.setItem("see-delivery-v1",delivery);
      localStorage.setItem("see-notifications-v1",String(notifications));
      localStorage.setItem("see-language-v1",language);
      localStorage.setItem("see-currency-v1",currency);
      localStorage.setItem("see-theme-v1",theme);
    } catch { /* Settings work until the page is refreshed. */ }
  },[loaded,watchlist,minimumScore,briefTone,delivery,notifications,language,currency,theme]);

  return { watchlist,setWatchlist,minimumScore,setMinimumScore,briefTone,setBriefTone,briefTicker,setBriefTicker,notifications,setNotifications,delivery,setDelivery,language,setLanguage,currency,setCurrency,theme,setTheme,t };
}
export type Preferences = ReturnType<typeof usePreferences>;
