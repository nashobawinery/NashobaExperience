import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CellarTraksClassifications } from "./CellarTraksClassifications";
import { StateTaxClassifications } from "./StateTaxClassifications";
import { FederalTaxRates } from "./FederalTaxRates";
import { FileText, DollarSign, Landmark } from "lucide-react";

export function FederalStateTaxPage() {
  const [activeTab, setActiveTab] = useState("federal-rates");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-federal-state-tax-heading">
          Federal & State Tax
        </h2>
        <p className="text-muted-foreground text-sm">
          Manage federal (TTB) and state excise tax rates, and assign classifications to products for regulatory reporting.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-federal-state-tax">
          <TabsTrigger value="federal-rates" className="gap-1.5" data-testid="tab-federal-rates">
            <Landmark className="h-3.5 w-3.5" />
            Federal Tax Rates
          </TabsTrigger>
          <TabsTrigger value="state-rates" className="gap-1.5" data-testid="tab-state-rates">
            <DollarSign className="h-3.5 w-3.5" />
            State Tax Rates
          </TabsTrigger>
          <TabsTrigger value="classifications" className="gap-1.5" data-testid="tab-classifications">
            <FileText className="h-3.5 w-3.5" />
            Product Classifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="federal-rates" className="mt-6">
          <FederalTaxRates />
        </TabsContent>

        <TabsContent value="state-rates" className="mt-6">
          <StateTaxClassifications />
        </TabsContent>

        <TabsContent value="classifications" className="mt-6">
          <CellarTraksClassifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}
