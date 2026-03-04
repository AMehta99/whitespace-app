"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Check,
  Upload,
  Settings2,
  ArrowRight,
  Building2,
  DollarSign,
  Globe,
  Users,
  Layers,
} from "lucide-react";
import { ModelConfig, CompanyType, MonetizationModel, GeographicScope, CustomerType, ModuleType } from "@/types";

const companyTypes: { value: CompanyType; label: string; description: string }[] = [
  { value: "software", label: "Software", description: "Pure software/SaaS company" },
  { value: "services", label: "Services", description: "Professional or managed services" },
  { value: "software_plus_services", label: "Software + Services", description: "Hybrid software and services model" },
];

const monetizationModels: { value: MonetizationModel; label: string; description: string }[] = [
  { value: "per_seat", label: "Per Seat", description: "Pricing based on user count" },
  { value: "per_module", label: "Per Module", description: "Pricing based on feature modules" },
  { value: "per_company_size_band", label: "Company Size Band", description: "Pricing tiers by company size" },
  { value: "per_volume", label: "Per Volume", description: "Usage-based pricing" },
  { value: "margin_based", label: "Margin Based", description: "Percentage of transaction value" },
  { value: "commission_based", label: "Commission Based", description: "Revenue share model" },
  { value: "hybrid", label: "Hybrid", description: "Multiple pricing components" },
];

const geographicScopes: { value: GeographicScope; label: string }[] = [
  { value: "us_only", label: "US Only" },
  { value: "global", label: "Global" },
  { value: "specific_regions", label: "Specific Regions" },
];

const customerTypes: { value: CustomerType; label: string }[] = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
  { value: "government", label: "Government" },
  { value: "mixed", label: "Mixed" },
];

const analysisModules: { value: ModuleType; label: string; description: string }[] = [
  { value: "top_down", label: "Top-Down TAM", description: "Build TAM from market data" },
  { value: "pricing", label: "Pricing Analysis", description: "Analyze pricing model" },
  { value: "addressability", label: "Addressability", description: "Filter addressable market" },
  { value: "bottom_up", label: "Bottom-Up", description: "Triangulate from competitors" },
  { value: "white_space", label: "White Space", description: "Identify market opportunities" },
  { value: "sensitivity", label: "Sensitivity", description: "Scenario analysis" },
];

export default function ProjectSetupPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Model config state
  const [companyType, setCompanyType] = useState<CompanyType | null>(null);
  const [monetizationModel, setMonetizationModel] = useState<MonetizationModel | null>(null);
  const [geographicScope, setGeographicScope] = useState<GeographicScope | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType | null>(null);
  const [modulesEnabled, setModulesEnabled] = useState<ModuleType[]>([
    "top_down",
    "pricing",
    "addressability",
    "bottom_up",
    "white_space",
    "sensitivity",
  ]);
  const [existingConfig, setExistingConfig] = useState<ModelConfig | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const supabase = createClient();

      // Check for existing model config
      const { data: config } = await supabase
        .from("model_configs")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (config) {
        setExistingConfig(config);
        setCompanyType(config.company_type);
        setMonetizationModel(config.monetization_model);
        setGeographicScope(config.geographic_scope);
        setCustomerType(config.customer_type);
        setModulesEnabled(config.modules_enabled || []);
        if (config.user_confirmed) {
          setStep(5); // Show summary if already configured
        }
      }

      setLoading(false);
    };

    loadConfig();
  }, [projectId]);

  const toggleModule = (module: ModuleType) => {
    setModulesEnabled((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const configData = {
      project_id: projectId,
      company_type: companyType,
      monetization_model: monetizationModel,
      geographic_scope: geographicScope,
      customer_type: customerType,
      modules_enabled: modulesEnabled,
      user_confirmed: true,
      confirmed_by: user?.id,
      confirmed_at: new Date().toISOString(),
    };

    let result;
    if (existingConfig) {
      result = await supabase
        .from("model_configs")
        .update(configData)
        .eq("id", existingConfig.id);
    } else {
      result = await supabase.from("model_configs").insert(configData);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    // Update project status to active
    await supabase
      .from("projects")
      .update({ status: "active" })
      .eq("id", projectId);

    setSaving(false);
    router.push(`/projects/${projectId}/data`);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading configuration...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 5 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Company Type */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Company Type</CardTitle>
            </div>
            <CardDescription>
              What type of company is being analyzed?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setCompanyType(type.value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  companyType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-muted-foreground">
                  {type.description}
                </div>
              </button>
            ))}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!companyType}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Monetization Model */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Monetization Model</CardTitle>
            </div>
            <CardDescription>
              How does the company generate revenue?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {monetizationModels.map((model) => (
              <button
                key={model.value}
                onClick={() => setMonetizationModel(model.value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  monetizationModel === model.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-medium">{model.label}</div>
                <div className="text-sm text-muted-foreground">
                  {model.description}
                </div>
              </button>
            ))}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!monetizationModel}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Geographic Scope & Customer Type */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Market Scope</CardTitle>
            </div>
            <CardDescription>
              Define the geographic and customer scope
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Geographic Scope</Label>
              <div className="grid grid-cols-3 gap-3">
                {geographicScopes.map((scope) => (
                  <button
                    key={scope.value}
                    onClick={() => setGeographicScope(scope.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      geographicScope === scope.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{scope.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Customer Type</Label>
              <div className="grid grid-cols-4 gap-3">
                {customerTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setCustomerType(type.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      customerType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!geographicScope || !customerType}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Analysis Modules */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle>Analysis Modules</CardTitle>
            </div>
            <CardDescription>
              Select the analysis modules to include in this project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisModules.map((module) => (
              <button
                key={module.value}
                onClick={() => toggleModule(module.value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  modulesEnabled.includes(module.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{module.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {module.description}
                    </div>
                  </div>
                  {modulesEnabled.includes(module.value) && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                disabled={modulesEnabled.length === 0}
              >
                Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review & Confirm */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>Review Configuration</CardTitle>
            </div>
            <CardDescription>
              Confirm your project configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Company Type</span>
                <span className="font-medium">
                  {companyTypes.find((t) => t.value === companyType)?.label}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Monetization Model</span>
                <span className="font-medium">
                  {monetizationModels.find((m) => m.value === monetizationModel)?.label}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Geographic Scope</span>
                <span className="font-medium">
                  {geographicScopes.find((s) => s.value === geographicScope)?.label}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Customer Type</span>
                <span className="font-medium">
                  {customerTypes.find((c) => c.value === customerType)?.label}
                </span>
              </div>
              <div className="py-2">
                <span className="text-muted-foreground">Analysis Modules</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {modulesEnabled.map((module) => (
                    <span
                      key={module}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                    >
                      {analysisModules.find((m) => m.value === module)?.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Confirm & Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
