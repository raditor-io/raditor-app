import Link from "next/link";

import { VeniceProvider } from "@/ai/providers/venice";
import { ROUTING_DEFAULTS } from "@/ai/routing-defaults";
import type { AiFunctionality } from "@/ai/types";
import { ActionForm } from "@/components/shared/action-form";
import { FormField } from "@/components/shared/form-field";
import { INPUT_CLASSES } from "@/components/shared/form-styles";
import { serverEnv } from "@/lib/env";
import {
  DATE_FORMAT_IDS,
  TIME_FORMAT_IDS,
  dateTimeSettingsOf,
  formatDate,
  formatTime,
  type DateFormatId,
  type TimeFormatId,
} from "@/lib/format-date";
import { requireOrgContext } from "@/services/org";

import {
  updateDateTimeSettingsAction,
  updateModelRoutingAction,
} from "./actions";

export const metadata = { title: "Settings | Raditor" };

const MODEL_SETTINGS: Array<{
  functionality: AiFunctionality;
  label: string;
  description: string;
}> = [
  {
    functionality: "scan_summary",
    label: "Scan summary",
    description: "Summarizes scanned material (diffs, release notes) into signals.",
  },
  {
    functionality: "scan_briefing",
    label: "Scan briefing",
    description:
      "AI-briefing web hunts (grok models add real-time web and X search).",
  },
];

// Fixed sample instant (24 Jun 2026, 15:30 UTC) for the option examples.
const SAMPLE_INSTANT = new Date("2026-06-24T15:30:00Z");

const DATE_FORMAT_LABELS: Record<DateFormatId, string> = {
  mdy_slash: "MM/DD/YYYY",
  dmy_slash: "DD/MM/YYYY",
  dmy_dot: "DD.MM.YYYY",
  ymd_dash: "YYYY-MM-DD",
  long: "Long",
};

const TIME_FORMAT_LABELS: Record<TimeFormatId, string> = {
  "12h": "12-hour",
  "24h": "24-hour",
  none: "No time",
};

function listTimezones(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

export default async function SettingsPage() {
  const ctx = await requireOrgContext();
  const dateTimeSettings = dateTimeSettingsOf(ctx.organization);
  const routing = (ctx.organization.model_routing ?? {}) as Record<
    string,
    string
  >;

  let availableModels: string[] = [];
  const veniceKey = serverEnv().VENICE_API_KEY;
  if (ctx.isAdmin && veniceKey) {
    try {
      const models = await new VeniceProvider({ apiKey: veniceKey }).listModels();
      availableModels = models.map((m) => m.id).sort();
    } catch (err) {
      console.error("[settings] failed listing Venice models:", err);
    }
  }

  return (
    <div>
      <div className="max-w-2xl space-y-4">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-foreground">Organization</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-faint">Name:</dt>
              <dd className="text-foreground">
                {ctx.organization.display_name}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-faint">Slug:</dt>
              <dd className="text-foreground">{ctx.organization.slug}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-faint">Your role:</dt>
              <dd className="capitalize text-foreground">
                {ctx.membership.member_role}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Date & time
            </h2>
            <p className="mt-1 text-sm text-muted">
              How dates and times are displayed across the dashboard for
              everyone in this organization.
            </p>
          </div>
          <div className="mt-4">
            {ctx.isAdmin ? (
              <ActionForm action={updateDateTimeSettingsAction} requireDirty>
                <FormField
                  label="Timezone"
                  description="All dates and times are shown in this timezone."
                >
                  <select
                    name="timezone"
                    defaultValue={dateTimeSettings.timezone}
                    className={INPUT_CLASSES}
                  >
                    {listTimezones().map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Date format">
                  <select
                    name="date_format"
                    defaultValue={dateTimeSettings.dateFormat}
                    className={INPUT_CLASSES}
                  >
                    {DATE_FORMAT_IDS.map((id) => (
                      <option key={id} value={id}>
                        {DATE_FORMAT_LABELS[id]} (
                        {formatDate(SAMPLE_INSTANT, {
                          ...dateTimeSettings,
                          dateFormat: id,
                        })}
                        )
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Time format">
                  <select
                    name="time_format"
                    defaultValue={dateTimeSettings.timeFormat}
                    className={INPUT_CLASSES}
                  >
                    {TIME_FORMAT_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id === "none"
                          ? TIME_FORMAT_LABELS[id]
                          : `${TIME_FORMAT_LABELS[id]} (${formatTime(
                              SAMPLE_INSTANT,
                              { ...dateTimeSettings, timeFormat: id },
                            )})`}
                      </option>
                    ))}
                  </select>
                </FormField>
              </ActionForm>
            ) : (
              <dl className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-faint">Timezone:</dt>
                  <dd className="text-foreground">
                    {dateTimeSettings.timezone}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-faint">Date format:</dt>
                  <dd className="text-foreground">
                    {DATE_FORMAT_LABELS[dateTimeSettings.dateFormat]}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-faint">Time format:</dt>
                  <dd className="text-foreground">
                    {TIME_FORMAT_LABELS[dateTimeSettings.timeFormat]}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">AI models</h2>
            <p className="mt-1 text-sm text-muted">
              Which model runs each functionality. Editors can override these
              per agent; empty means the Raditor default.
            </p>
          </div>
          <div className="mt-4">
            {ctx.isAdmin ? (
              <ActionForm action={updateModelRoutingAction} requireDirty>
                {MODEL_SETTINGS.map(({ functionality, label, description }) => (
                  <FormField
                    key={functionality}
                    label={label}
                    description={description}
                  >
                    {availableModels.length > 0 ? (
                      <select
                        name={`model_${functionality}`}
                        defaultValue={routing[functionality] ?? ""}
                        className={INPUT_CLASSES}
                      >
                        <option value="">
                          Raditor default ({ROUTING_DEFAULTS[functionality]})
                        </option>
                        {availableModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={`model_${functionality}`}
                        defaultValue={routing[functionality] ?? ""}
                        placeholder={`Raditor default (${ROUTING_DEFAULTS[functionality]})`}
                        className={INPUT_CLASSES}
                      />
                    )}
                  </FormField>
                ))}
              </ActionForm>
            ) : (
              <dl className="space-y-1 text-sm">
                {MODEL_SETTINGS.map(({ functionality, label }) => (
                  <div key={functionality} className="flex gap-2">
                    <dt className="text-faint">{label}:</dt>
                    <dd className="text-foreground">
                      {routing[functionality] ??
                        `default (${ROUTING_DEFAULTS[functionality]})`}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-foreground">Members</h2>
          <p className="mt-2 text-sm text-muted">
            Invite teammates and manage roles. Admins configure projects,
            sources, and editors; users review and approve content.
          </p>
          <Link
            href="/settings/members"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            Manage members
          </Link>
        </section>
      </div>
    </div>
  );
}
