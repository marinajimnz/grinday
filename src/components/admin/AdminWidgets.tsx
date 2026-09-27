"use client";

import { useState } from "react";
import { inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { ReasonAction } from "./ReasonAction";
import {
  moderateProfileAction,
  reserveHandleAction,
  resolveReportsAction,
  reviewApplicationAction,
  unreserveHandleAction,
} from "@/features/moderation/actions";

export function ReviewButtons({ applicationId }: { applicationId: string }) {
  const t = useDictionary().admin;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ReasonAction
        label={t.approve}
        variant="primary"
        run={(reason) => reviewApplicationAction({ applicationId, approve: true, reason })}
      />
      <ReasonAction
        label={t.reject}
        run={(reason) => reviewApplicationAction({ applicationId, approve: false, reason })}
      />
    </div>
  );
}

export function RoasterButtons({ username, suspended }: { username: string; suspended: boolean }) {
  const t = useDictionary().admin;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ReasonAction
        label={t.revokeRoaster}
        run={(reason) => moderateProfileAction({ username, action: "revoke_roaster", reason })}
      />
      <ReasonAction
        label={suspended ? t.reactivate : t.suspend}
        variant={suspended ? "secondary" : "destructive"}
        run={(reason) => moderateProfileAction({ username, action: suspended ? "reactivate" : "suspend", reason })}
      />
    </div>
  );
}

// Moderate any non-admin profile by its @username.
export function ModerateProfileForm() {
  const t = useDictionary().admin;
  const [username, setUsername] = useState("");
  const target = username.trim().replace(/^@+/, "").toLowerCase();

  return (
    <div className="space-y-3">
      <label htmlFor="admin-moderate-username" className="block text-sm font-medium text-ink">
        {t.usernameLabel}
      </label>
      <input
        id="admin-moderate-username"
        className={inputClassName}
        value={username}
        autoCapitalize="none"
        onChange={(e) => setUsername(e.target.value)}
      />
      {target.length >= 3 && (
        <div className="flex flex-wrap items-start gap-2">
          <ReasonAction
            label={t.suspend}
            variant="destructive"
            run={(reason) => moderateProfileAction({ username: target, action: "suspend", reason })}
          />
          <ReasonAction
            label={t.reactivate}
            run={(reason) => moderateProfileAction({ username: target, action: "reactivate", reason })}
          />
          <ReasonAction
            label={t.reassignUsername}
            run={(reason) => moderateProfileAction({ username: target, action: "reassign_username", reason })}
            successMessage={(fresh) => t.reassignedTo.replace("{username}", fresh ?? "")}
          />
        </div>
      )}
    </div>
  );
}

export function ReserveHandleForm() {
  const t = useDictionary().admin;
  const [handle, setHandle] = useState("");
  const value = handle.trim().replace(/^@+/, "").toLowerCase();

  return (
    <div className="space-y-3">
      <label htmlFor="admin-reserve-handle" className="block text-sm font-medium text-ink">
        {t.handleLabel}
      </label>
      <input
        id="admin-reserve-handle"
        className={inputClassName}
        value={handle}
        autoCapitalize="none"
        onChange={(e) => setHandle(e.target.value)}
      />
      {value.length >= 3 && (
        <ReasonAction label={t.reserve} run={(reason) => reserveHandleAction({ handle: value, reason })} />
      )}
    </div>
  );
}

export function ReleaseHandleButton({ handle }: { handle: string }) {
  const t = useDictionary().admin;
  return <ReasonAction label={t.release} run={(reason) => unreserveHandleAction({ handle, reason })} />;
}

export function ResolveReportButtons({ username }: { username: string }) {
  const t = useDictionary().admin;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ReasonAction
        label={t.dismissReports}
        run={(reason) => resolveReportsAction({ username, action: "dismiss", reason })}
      />
      <ReasonAction
        label={t.suspendFromReports}
        variant="destructive"
        run={(reason) => resolveReportsAction({ username, action: "suspend", reason })}
      />
      <ReasonAction
        label={t.reassignFromReports}
        run={(reason) => resolveReportsAction({ username, action: "reassign_username", reason })}
        successMessage={(fresh) => t.reassignedTo.replace("{username}", fresh ?? "")}
      />
    </div>
  );
}
