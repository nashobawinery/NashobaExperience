import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Beer, Wine, FlaskConical, Loader2, Database, Landmark,
  ChevronRight, Info
} from "lucide-react";

interface FederalTaxRate {
  id: number;
  beverageType: string;
  rateKey: string;
  displayName: string;
  description: string | null;
  ratePerUnit: string;
  rateUnit: string;
  volumeMin: string | null;
  volumeMax: string | null;
  volumeUnit: string | null;
  producerType: string | null;
  creditAmount: string | null;
  effectiveRateAfterCredit: string | null;
  parentRateKey: string | null;
  sortOrder: number;
  isActive: boolean;
  effectiveDate: string | null;
  notes: string | null;
}

const BEVERAGE_CONFIG: Record<string, { label: string; icon: typeof Beer; color: string; bgColor: string; unit: string }> = {
  beer: { label: "Beer", icon: Beer, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30", unit: "per barrel" },
  wine: { label: "Wine", icon: Wine, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-950/30", unit: "per wine gallon" },
  spirits: { label: "Distilled Spirits", icon: FlaskConical, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30", unit: "per proof gallon" },
};

function formatCurrency(value: string | null | undefined): string {
  if (!value) return "-";
  const num = parseFloat(value);
  if (num < 1) return `$${num.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${num.toFixed(2)}`;
}

function formatVolume(min: string | null, max: string | null): string {
  if (!min && !max) return "All";
  const minN = min ? parseInt(min).toLocaleString() : "0";
  const maxN = max ? parseInt(max).toLocaleString() : "No limit";
  return `${minN} - ${maxN}`;
}

export function FederalTaxRates() {
  const { toast } = useToast();

  const { data: rates, isLoading } = useQuery<FederalTaxRate[]>({
    queryKey: ['/api/cellartraks/federal-tax-rates'],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/cellartraks/federal-tax-rates/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cellartraks/federal-tax-rates'] });
      toast({ title: "Federal Tax Rates Loaded", description: "All current TTB tax rates have been loaded." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rates || rates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Landmark className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-no-rates">Federal Tax Rates Not Loaded</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Load the current TTB federal excise tax rates for beer, wine, and distilled spirits. 
            These rates are effective from 2018 to present.
          </p>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-federal-rates"
          >
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Load Federal Tax Rates
          </Button>
        </CardContent>
      </Card>
    );
  }

  const beerRates = rates.filter(r => r.beverageType === 'beer');
  const wineBaseRates = rates.filter(r => r.beverageType === 'wine' && r.producerType === 'base_rate');
  const wineCreditRates = rates.filter(r => r.beverageType === 'wine' && r.producerType?.startsWith('credit_tier'));
  const spiritsRates = rates.filter(r => r.beverageType === 'spirits');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>Tax rates effective from Calendar Year 2018 to present. Source: TTB (Alcohol and Tobacco Tax and Trade Bureau)</span>
      </div>

      <BeerRatesSection rates={beerRates} />
      <WineRatesSection baseRates={wineBaseRates} creditRates={wineCreditRates} />
      <SpiritsRatesSection rates={spiritsRates} />
    </div>
  );
}

function BeerRatesSection({ rates }: { rates: FederalTaxRate[] }) {
  const config = BEVERAGE_CONFIG.beer;
  const Icon = config.icon;
  const smallRates = rates.filter(r => r.producerType === 'small');
  const largeRates = rates.filter(r => r.producerType === 'large');
  const generalRates = rates.filter(r => r.producerType === 'general');

  return (
    <Card data-testid="card-beer-rates">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base" data-testid="text-beer-rates-title">{config.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Rate per Barrel (31 gallons)</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" defaultValue={["beer-reduced-small", "beer-general"]}>
          <AccordionItem value="beer-reduced-small">
            <AccordionTrigger className="text-sm font-medium" data-testid="accordion-beer-small">
              Reduced Rates - Small Brewer (2,000,000 barrels or less/year)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Domestic brewer who produces 2,000,000 barrels or less per calendar year
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volume Tier</TableHead>
                      <TableHead className="text-right">Rate per Barrel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smallRates.map(rate => (
                      <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{rate.displayName}</p>
                          {rate.description && <p className="text-xs text-muted-foreground mt-0.5">{rate.description}</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                            {formatCurrency(rate.ratePerUnit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {largeRates.length > 0 && (
            <AccordionItem value="beer-reduced-large">
              <AccordionTrigger className="text-sm font-medium" data-testid="accordion-beer-large">
                Reduced Rates - Large Brewer (over 2,000,000 barrels/year)
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Domestic brewer who produces over 2,000,000 barrels per calendar year and who produced the beer; or electing U.S. importer with assigned reduced rate
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Volume Tier</TableHead>
                        <TableHead className="text-right">Rate per Barrel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {largeRates.map(rate => (
                        <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                          <TableCell>
                            <p className="font-medium text-sm">{rate.displayName}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                              {formatCurrency(rate.ratePerUnit)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="beer-general">
            <AccordionTrigger className="text-sm font-medium" data-testid="accordion-beer-general">
              General Rate
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Applies to domestic brewers who did not produce the beer, U.S. importers not assigned a reduced rate, or brewers/importers who exhausted their reduced rate entitlement
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volume</TableHead>
                      <TableHead className="text-right">Rate per Barrel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generalRates.map(rate => (
                      <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{rate.displayName}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                            {formatCurrency(rate.ratePerUnit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function WineRatesSection({ baseRates, creditRates }: { baseRates: FederalTaxRate[]; creditRates: FederalTaxRate[] }) {
  const config = BEVERAGE_CONFIG.wine;
  const Icon = config.icon;

  const creditsByParent = creditRates.reduce<Record<string, FederalTaxRate[]>>((acc, rate) => {
    const key = rate.parentRateKey || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(rate);
    return acc;
  }, {});

  return (
    <Card data-testid="card-wine-rates">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base" data-testid="text-wine-rates-title">{config.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Rate per Wine Gallon</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Tax Class</TableHead>
                <TableHead className="text-right">Base Rate</TableHead>
                <TableHead className="text-right">
                  <div>
                    <span>First 30,000</span>
                    <span className="block text-xs font-normal text-muted-foreground">Wine Gallons</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div>
                    <span>30k - 130k</span>
                    <span className="block text-xs font-normal text-muted-foreground">Wine Gallons</span>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div>
                    <span>130k - 750k</span>
                    <span className="block text-xs font-normal text-muted-foreground">Wine Gallons</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baseRates.map(rate => {
                const credits = creditsByParent[rate.rateKey] || [];
                const t1 = credits.find(c => c.producerType === 'credit_tier_1');
                const t2 = credits.find(c => c.producerType === 'credit_tier_2');
                const t3 = credits.find(c => c.producerType === 'credit_tier_3');

                return (
                  <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                    <TableCell>
                      <p className="font-medium text-sm">{rate.displayName}</p>
                      {rate.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">{rate.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                        {formatCurrency(rate.ratePerUnit)}/gal
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t1 ? (
                        <div>
                          <span className="text-xs text-muted-foreground">{formatCurrency(t1.creditAmount)} credit</span>
                          <div>
                            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-effective-${t1.rateKey}`}>
                              {formatCurrency(t1.effectiveRateAfterCredit)}/gal
                            </Badge>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {t2 ? (
                        <div>
                          <span className="text-xs text-muted-foreground">{formatCurrency(t2.creditAmount)} credit</span>
                          <div>
                            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-effective-${t2.rateKey}`}>
                              {formatCurrency(t2.effectiveRateAfterCredit)}/gal
                            </Badge>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {t3 ? (
                        <div>
                          <span className="text-xs text-muted-foreground">{formatCurrency(t3.creditAmount)} credit</span>
                          <div>
                            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-effective-${t3.rateKey}`}>
                              {formatCurrency(t3.effectiveRateAfterCredit)}/gal
                            </Badge>
                          </div>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Tax Credits</p>
          <p>Domestic wine producers are entitled to tax credits on wine they produce and may transfer their tax credits to other wineries or to bonded wine cellars that receive their wine in bond.</p>
          <p>Electing U.S. importers may take advantage of tax credits appropriately assigned to them by a foreign winery.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SpiritsRatesSection({ rates }: { rates: FederalTaxRate[] }) {
  const config = BEVERAGE_CONFIG.spirits;
  const Icon = config.icon;
  const reducedRates = rates.filter(r => r.producerType === 'small');
  const generalRates = rates.filter(r => r.producerType === 'general');

  return (
    <Card data-testid="card-spirits-rates">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base" data-testid="text-spirits-rates-title">{config.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Rate per Proof Gallon</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" defaultValue={["spirits-reduced", "spirits-general"]}>
          <AccordionItem value="spirits-reduced">
            <AccordionTrigger className="text-sm font-medium" data-testid="accordion-spirits-reduced">
              Reduced Rates (DSP Proprietors / Electing Importers)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Proprietors of domestic distilled spirits plants (DSPs) may take advantage of reduced rates when they remove limited quantities of distilled spirits that they distilled or processed. Electing U.S. importers may take advantage of reduced rates appropriately assigned to them by a foreign distilled spirits operation.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volume Tier</TableHead>
                      <TableHead className="text-right">Rate per Proof Gallon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reducedRates.map(rate => (
                      <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{rate.displayName}</p>
                          {rate.description && <p className="text-xs text-muted-foreground mt-0.5">{rate.description}</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                            {formatCurrency(rate.ratePerUnit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="spirits-general">
            <AccordionTrigger className="text-sm font-medium" data-testid="accordion-spirits-general">
              General Rate
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground mb-3">
                Applies to DSP proprietors who remove distilled spirits that they did not distill or process, U.S. importers not assigned a reduced rate, or those who exhausted their reduced rate entitlement.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volume</TableHead>
                      <TableHead className="text-right">Rate per Proof Gallon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generalRates.map(rate => (
                      <TableRow key={rate.id} data-testid={`row-rate-${rate.rateKey}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{rate.displayName}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" data-testid={`badge-rate-${rate.rateKey}`}>
                            {formatCurrency(rate.ratePerUnit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
