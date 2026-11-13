"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { CircleAlert, CircleCheck, RotateCcw } from "lucide-react";
import { resetBranding, saveBranding } from "@/app/(app)/admin/branding/actions";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { contrast, DEFAULT_ACCENT, DEFAULT_PANEL, HEX, MIN_ACCENT_CONTRAST, themeVars, type Mode } from "@/lib/color";
import { cn } from "@/lib/utils";

type Initial = {
  name: string;
  defaultName: string;
  accent: string;
  panel: string;
  logoUrl: string | null;
  lightTile: boolean;
  showName: boolean;
};

// The preview sets its own page colours so it looks right whatever mode the admin's device is in.
const PAGE: Record<Mode, Record<string, string>> = {
  light: {
    "--background": "#f3f5f7",
    "--foreground": "#17222b",
    "--card": "#ffffff",
    "--border": "#dce2e7",
    "--muted-foreground": "#586571",
  },
  dark: {
    "--background": "#0d1418",
    "--foreground": "#e5ebee",
    "--card": "#151e24",
    "--border": "#26333c",
    "--muted-foreground": "#97a5ae",
  },
};

function ColorField({
  id,
  label,
  name,
  value,
  onChange,
  help,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  help: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}: pick a colour`}
          value={HEX.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1"
        />
        <Input
          id={id}
          name={name}
          value={value}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value.trim())}
          onBlur={() => /^[0-9a-f]{6}$/i.test(value) && onChange(`#${value}`)}
          className="w-32 font-mono"
          aria-describedby={`${id}-help`}
        />
      </div>
      <p id={`${id}-help`} className="text-[0.8125rem] text-muted-foreground" aria-live="polite">
        {help}
      </p>
    </div>
  );
}

export function BrandingForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState(saveBranding, undefined);
  const [name, setName] = useState(initial.name);
  const [accent, setAccent] = useState(initial.accent);
  const [panel, setPanel] = useState(initial.panel);
  const [lightTile, setLightTile] = useState(initial.lightTile);
  const [showName, setShowName] = useState(initial.showName);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [newLogo, setNewLogo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => () => void (newLogo && URL.revokeObjectURL(newLogo)), [newLogo]);

  const accentOk = HEX.test(accent);
  const ratio = accentOk ? contrast(accent, "#ffffff") : 0;
  const tooLight = accentOk && ratio < MIN_ACCENT_CONTRAST;
  const logoUrl = newLogo ?? (removeLogo ? null : initial.logoUrl);

  const vars = themeVars(accentOk ? accent : DEFAULT_ACCENT, HEX.test(panel) ? panel : DEFAULT_PANEL, mode);
  const previewStyle = { ...PAGE[mode], ...vars } as CSSProperties;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid gap-6">
        <form action={action} className="grid gap-6">
          {state?.error && (
            <p role="alert" className="flex gap-2 rounded-md bg-danger-bg px-3 py-2.5 text-sm text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Name and logo</CardTitle>
              <CardDescription>Shown at the top of the menu, on the sign-in page, in emails and in browser tabs.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  maxLength={60}
                  placeholder={initial.defaultName}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-[0.8125rem] text-muted-foreground">Leave empty to use “{initial.defaultName}”.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logo">Logo</Label>
                <Input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setNewLogo(file ? URL.createObjectURL(file) : null);
                    if (file) setRemoveLogo(false);
                  }}
                />
                <p className="text-[0.8125rem] text-muted-foreground">
                  PNG, JPEG, GIF, WebP or SVG, up to 1 MB. It is shown about 2 rem (32 px) tall, so a wide logo with a
                  transparent background works best.
                </p>
                {initial.logoUrl && !newLogo && (
                  <Label className="font-normal">
                    <input
                      type="checkbox"
                      name="removeLogo"
                      checked={removeLogo}
                      onChange={(e) => setRemoveLogo(e.target.checked)}
                      className="size-4 accent-(--primary)"
                    />
                    Remove the current logo
                  </Label>
                )}
              </div>

              <Label className="font-normal">
                <Switch name="lightTile" checked={lightTile} onCheckedChange={setLightTile} />
                Put the logo on a white tile (for logos drawn for light backgrounds)
              </Label>
              <Label className="font-normal">
                <Switch name="showName" checked={showName} onCheckedChange={setShowName} />
                Show the name next to the logo
              </Label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colours</CardTitle>
              <CardDescription>
                Text colours, dark mode and hover states are worked out for you so everything stays readable.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <ColorField
                id="accent"
                label="Accent colour"
                name="accent"
                value={accent}
                onChange={setAccent}
                help={
                  !accentOk ? (
                    "Enter a hex code like #0b5a6b."
                  ) : tooLight ? (
                    <span className="text-danger">
                      Too light for buttons and links ({ratio.toFixed(1)}:1 with white; needs {MIN_ACCENT_CONTRAST}:1).
                      Pick a darker shade.
                    </span>
                  ) : (
                    `Buttons, links and highlights. Contrast with white: ${ratio.toFixed(1)}:1, which is fine.`
                  )
                }
              />
              <ColorField
                id="panel"
                label="Menu and sign-in panel"
                name="panel"
                value={panel}
                onChange={setPanel}
                help="The side menu and the left side of the sign-in page. Light or dark both work."
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !accentOk || tooLight || !HEX.test(panel)}>
              {pending ? "Saving…" : "Save branding"}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost">
                  <RotateCcw /> Reset to defaults
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset branding?</DialogTitle>
                  <DialogDescription>
                    The logo is deleted, and the name and colours go back to the defaults for everyone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Keep my branding</Button>
                  </DialogClose>
                  <form action={resetBranding}>
                    <Button type="submit" variant="destructive" className="w-full">
                      Reset to defaults
                    </Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </form>
      </div>

      <aside className="grid gap-3 lg:sticky lg:top-6" aria-label="Preview">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Preview</h2>
          <div className="flex rounded-md border bg-card p-0.5" role="group" aria-label="Preview mode">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded px-2.5 py-1 text-[0.8125rem] font-medium capitalize",
                  mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={previewStyle} className="overflow-hidden rounded-lg border bg-background text-foreground">
          <div className="flex min-h-72">
            <div className="flex w-40 shrink-0 flex-col gap-4 bg-sidebar p-3 text-sidebar-foreground">
              <BrandMark
                name={name || initial.defaultName}
                logoUrl={logoUrl}
                lightTile={lightTile}
                showName={showName}
                className="text-sm"
              />
              <div className="grid gap-0.5 text-[0.8125rem] font-medium">
                <span className="rounded-md bg-sidebar-accent px-2 py-1.5 text-sidebar-accent-foreground">Tickets</span>
                <span className="px-2 py-1.5">Knowledge base</span>
                <span className="px-2 py-1.5">Reports</span>
              </div>
              <span className="mt-auto text-xs text-sidebar-muted">Alex Agent · Agent</span>
            </div>
            <div className="grid flex-1 content-start gap-3 p-4">
              <h3 className="font-semibold">Projector in room 204</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">In progress</Badge>
                <span className="text-[0.8125rem] text-muted-foreground">opened 2h ago</span>
              </div>
              <p className="text-sm">
                We&apos;ll bring a spare lamp.{" "}
                <span className="font-medium text-primary underline underline-offset-2">View the guide</span>
              </p>
              <div className="flex gap-2">
                <span className="rounded-md bg-primary px-3 py-1.5 text-[0.8125rem] font-medium text-primary-foreground">
                  Send reply
                </span>
                <span className="rounded-md border border-input px-3 py-1.5 text-[0.8125rem] font-medium">Cancel</span>
              </div>
            </div>
          </div>
        </div>
        <p className="flex gap-2 text-[0.8125rem] text-muted-foreground">
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          Nothing changes for anyone until you save.
        </p>
      </aside>
    </div>
  );
}
