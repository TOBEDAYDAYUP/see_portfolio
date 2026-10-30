"use client";

import type { Preferences } from "../../../hooks/use-preferences";
import type { Page } from "../../../types/app";
import AppearanceSettings from "./appearance-settings";
import NotificationSettings from "./notification-settings";
import RegionalSettings from "./regional-settings";
import BriefSettings from "./brief-settings";
import FollowedCompaniesSettings from "./followed-companies-settings";
import AlpacaConnection from "./alpaca-connection";

type Props={prefs:Preferences;go:(page:Page)=>void;notificationCount:number};
/** Settings layout; each editable preference group is a separate component. */
export default function SettingsPanel({prefs,go,notificationCount}:Props) {
  const {t}=prefs;
  return <>


          <div className="mb-8"><p className="mb-2 text-[11px] font-semibold tracking-[.17em] text-[#8fe7d1]">PREFERENCES</p><h1 className="text-3xl font-semibold sm:text-[38px]">{t("Settings","设置")}</h1><p className="mt-2 text-sm text-slate-400">{t("Choose the information you receive and how you want to view it.","设置消息强度、通知、语言和金额显示方式。")}</p></div>
          <div className="grid gap-5 2xl:grid-cols-2">
            <AlpacaConnection/>
            <AppearanceSettings prefs={prefs}/>
            <NotificationSettings prefs={prefs} notificationCount={notificationCount}/>
            <RegionalSettings prefs={prefs}/>
            <BriefSettings prefs={prefs} go={go}/>
            <FollowedCompaniesSettings prefs={prefs}/>
          </div>
          <p className="mt-6 text-xs leading-6 text-slate-500">{t("Settings are saved in this browser only. Accounts and cross-device sync will be added later.","设置目前仅保存在当前浏览器中，未来再增加登录和跨设备同步。")}</p>


  </>;
}
