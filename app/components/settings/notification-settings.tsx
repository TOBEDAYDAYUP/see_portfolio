"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import type { Delivery } from "../../../types/app";

/** Independently maintained Settings section. */
export default function NotificationSettings({prefs,notificationCount}:{prefs:Preferences;notificationCount:number}) {
  const { notifications,setNotifications,minimumScore,setMinimumScore,delivery,setDelivery,t }=prefs;
  const fieldClass="surface-field w-full rounded-xl border border-white/15 bg-[#101c2e] px-3 py-3 text-sm text-slate-100 outline-none focus:border-[#88e1ce]";
  const labelClass="mb-2 block text-sm font-medium text-slate-200";
  return (
    <section className="rounded-2xl border border-white/10 bg-[#172338] surface-panel p-5 sm:p-6"><div className="mb-6"><h2 className="text-lg font-semibold">{t("Notifications","通知设置")}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{t("Preferences are saved locally. Notifications are not delivered yet.","偏好保存在本机浏览器中。目前不会实际发送通知。")}</p></div>
              <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#102035] p-4"><div><div className="text-sm font-medium">{t("Enable notifications","启用消息通知")}</div><p className="mt-1 text-xs text-slate-400">{t("Allow alert delivery when supported","待推送服务接入后允许接收提醒")}</p></div><button role="switch" type="button" aria-checked={notifications} aria-label={t("Enable notifications","启用消息通知")} onClick={()=>setNotifications(v=>!v)} className={"relative h-7 w-12 shrink-0 rounded-full transition-colors "+(notifications?"bg-[#65d5b9]":"bg-[#46566b]")}><span className={"absolute top-1 h-5 w-5 rounded-full bg-white transition-all "+(notifications?"left-6":"left-1")}/></button></div>
              <label htmlFor="notification-intensity" className={labelClass}>{t("Importance threshold / intensity","重要性阈值 / 推送强度")}: <span className="text-[#a1ebdc]">{minimumScore}/100</span></label>
              <input id="notification-intensity" type="range" min={40} max={95} step={5} value={minimumScore} onChange={e=>setMinimumScore(Number(e.target.value))} className="w-full cursor-pointer accent-[#83e3cd]"/>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{t("More updates","更多消息")}</span><span>{t("Only high-impact","仅重大消息")}</span></div>
              <div className="mt-6"><label htmlFor="delivery-frequency" className={labelClass}>{t("Notification frequency","通知频率")}</label><select id="delivery-frequency" value={delivery} onChange={e=>setDelivery(e.target.value as Delivery)} className={fieldClass}><option value="all">All qualifying updates / 所有符合条件的消息</option><option value="major">Major updates only / 仅重大消息</option><option value="digest">Daily digest only / 仅每日简报</option></select></div>
              <div aria-live="polite" className="mt-5 rounded-xl bg-[#102035] p-4 text-xs leading-6 text-slate-300">{notifications?t("If delivery were connected, ","如果已接入推送服务，") + notificationCount + t(" sample events would qualify for immediate alerts."," 条演示事件符合即时提醒条件。"):t("Notifications are off. No immediate alerts would be queued.","通知已关闭，不会安排即时提醒。")}</div>
            </section>
  );
}
