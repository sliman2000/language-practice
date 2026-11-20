import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/client/components/AppShell";
import { ChoiceSelect } from "@/client/components/ChoiceSelect";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/client/components/ui/field";
import { Label } from "@/client/components/ui/label";
import { useAction } from "@/client/hooks/useAction";
import { LANGUAGES } from "@/lib/learning";
import { getProfile, saveProfile } from "@/serverFunctions/learning";

export const Route = createFileRoute("/profile")({
  loader: () => getProfile(),
  component: ProfilePage,
});

type Language = (typeof LANGUAGES)[number];

function ProfilePage() {
  const profile = Route.useLoaderData();
  const { run, pending } = useAction();
  const [native, setNative] = useState<string | null>(profile.nativeLanguage);
  const [known, setKnown] = useState<string[]>(profile.knownLanguages);

  return (
    <AppShell>
      <PageHeader title="Profile" description={profile.email} />
      <Card>
        <CardContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const saved = await run(async () => {
                await saveProfile({
                  data: {
                    nativeLanguage: (native as Language | null) ?? null,
                    knownLanguages: known as Language[],
                  },
                });
                return true;
              });
              if (saved) toast.success("Saved");
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="profile-native">Native language</FieldLabel>
                <ChoiceSelect
                  id="profile-native"
                  testId="profile-native"
                  className="w-full sm:w-64"
                  value={native}
                  onChange={setNative}
                  placeholder="Choose a language"
                  options={LANGUAGES.map((l) => ({ value: l, label: l }))}
                />
              </Field>
              <FieldSet>
                <FieldLegend variant="label">Other languages you know</FieldLegend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LANGUAGES.filter((l) => l !== native).map((language) => (
                    <Label
                      key={language}
                      data-testid="known-language"
                      className="flex cursor-pointer items-center gap-2 font-normal"
                    >
                      <Checkbox
                        checked={known.includes(language)}
                        onCheckedChange={(checked) =>
                          setKnown((prev) =>
                            checked ? [...prev, language] : prev.filter((l) => l !== language),
                          )
                        }
                      />
                      {language}
                    </Label>
                  ))}
                </div>
              </FieldSet>
              <div>
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
