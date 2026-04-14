import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  description?: string;
  body?: string;
};

export function ComingSoon({ title, description, body }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">In costruzione</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {body ??
            "Questa sezione verrà abilitata nei prossimi moduli di implementazione."}
        </CardContent>
      </Card>
    </div>
  );
}
