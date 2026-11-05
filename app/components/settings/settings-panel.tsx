"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import type {Page,SettingsSection} from "../../../types/app";
import AppearanceSettings from "./appearance-settings";
import NotificationSettings from "./notification-settings";
import RegionalSettings from "./regional-settings";
import BriefSettings from "./brief-settings";
import FollowedCompaniesSettings from "./followed-companies-settings";
import AlpacaConnection from "./alpaca-connection";

type Props={prefs:Preferences;go:(page:Page)=>void;notificationCount:number;section:SettingsSection};
/** Settings layout; each editable preference group is a separate component. */
export default function SettingsPanel({prefs,go,notificationCount,section}:Props) {
  const {t}=prefs;
  return <div className="min-w-0">
    <div className="mb-7">
      <p className="mb-2 text-[11px] font-semibold tracking-[.17em] text-[#8fe7d1]">SETTINGS WORKSPACE</p>
      <h1 className="text-3xl font-semibold sm:text-[38px]">{t("Settings","设置")}</h1>
      <p className="mt-2 text-sm text-slate-400">{t("Manage your research preferences and connections.","管理你的研究偏好与数据连接。")}</p>
    </div>
    <div className={section==="overview"?"grid gap-5 2xl:grid-cols-2":"grid max-w-4xl gap-5"}>
      {(section==="overview"||section==="connection")&&<AlpacaConnection/>}
      {(section==="overview"||section==="appearance")&&<AppearanceSettings prefs={prefs}/>}
      {(section==="overview"||section==="notifications")&&<NotificationSettings prefs={prefs} notificationCount={notificationCount}/>}
      {(section==="overview"||section==="regional")&&<RegionalSettings prefs={prefs}/>}
      {(section==="overview"||section==="brief")&&<BriefSettings prefs={prefs} go={go}/>}
      {(section==="overview"||section==="watchlist")&&<FollowedCompaniesSettings prefs={prefs}/>}
    </div>
    <p className="mt-6 text-xs leading-6 text-slate-500">
      {t("Settings are saved in this browser only. Accounts and cross-device sync will be added later.",
         "设置目前仅保存在当前浏览器中，未来再增加登录和跨设备同步。")}
    </p>
  </div>;
}
