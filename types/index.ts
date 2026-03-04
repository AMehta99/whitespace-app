// Database Types for Whitespace

export type OrganizationRole = 'admin' | 'member';
export type ProjectRole = 'owner' | 'analyst' | 'viewer';
export type ProjectStatus = 'setup' | 'active' | 'complete' | 'archived';
export type PurgeStatus = 'pending' | 'files_purged' | 'fully_purged';
export type FileType = 'cim' | 'financials' | 'scope' | 'market_research' | 'customer_data' | 'other';
export type ParsingStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type CompanyType = 'software' | 'services' | 'software_plus_services';
export type MonetizationModel = 'per_seat' | 'per_module' | 'per_company_size_band' | 'per_volume' | 'margin_based' | 'commission_based' | 'hybrid';
export type GeographicScope = 'us_only' | 'global' | 'specific_regions';
export type CustomerType = 'b2b' | 'b2c' | 'government' | 'mixed';
export type ModuleType = 'top_down' | 'pricing' | 'addressability' | 'bottom_up' | 'white_space' | 'sensitivity';
export type ModuleStatus = 'not_started' | 'in_progress' | 'complete' | 'needs_review';
export type ConfidenceRating = 'high' | 'medium' | 'low';
export type RetentionEventType = 'file_purge' | 'parsed_content_purge' | 'full_project_purge' | 'benchmark_contribution';
export type RetentionEventStatus = 'scheduled' | 'complete' | 'failed';

// Organization
export interface Organization {
  id: string;
  name: string;
  sso_enabled: boolean;
  sso_config: Record<string, unknown> | null;
  retention_policy: RetentionPolicy | null;
  benchmark_opt_in: boolean;
  created_at: string;
}

export interface RetentionPolicy {
  raw_files_years: number;
  parsed_content_years: number;
  analysis_data_years: number;
  audit_logs_years: number;
}

// User
export interface User {
  id: string;
  organization_id: string;
  full_name: string;
  role: OrganizationRole;
  created_at: string;
}

// Project
export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  company_name: string | null;
  deal_stage: string | null;
  scope_summary: string | null;
  model_config: Record<string, unknown> | null;
  status: ProjectStatus;
  archived_at: string | null;
  scheduled_purge_at: string | null;
  purge_status: PurgeStatus | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Project Member
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  role: ProjectRole;
  invited_email: string | null;
  invited_at: string | null;
  joined_at: string | null;
}

// Project File
export interface ProjectFile {
  id: string;
  project_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: FileType;
  storage_path: string | null;
  parsed_content: Record<string, unknown> | null;
  parsing_status: ParsingStatus;
  file_purged_at: string | null;
  created_at: string;
}

// Model Config
export interface ModelConfig {
  id: string;
  project_id: string;
  company_type: CompanyType | null;
  monetization_model: MonetizationModel | null;
  geographic_scope: GeographicScope | null;
  regions: string[] | null;
  customer_type: CustomerType | null;
  industry_focus: string | null;
  naics_codes: string[] | null;
  modules_enabled: ModuleType[] | null;
  auto_detected: boolean;
  user_confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

// Analysis Module
export interface AnalysisModule {
  id: string;
  project_id: string;
  module_type: ModuleType;
  status: ModuleStatus;
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
  assumptions: Assumption[] | null;
  claude_reasoning: string | null;
  last_run_at: string | null;
  run_by: string | null;
  created_at: string;
}

export interface Assumption {
  id: string;
  variable: string;
  value: unknown;
  source: string;
  source_url?: string;
  flagged_for_review?: boolean;
  flag_reason?: string;
}

// Sensitivity Scenario
export interface SensitivityScenario {
  id: string;
  project_id: string;
  module_id: string;
  scenario_name: string;
  variable_name: string;
  low_value: number;
  base_value: number;
  high_value: number;
  output_low: number;
  output_base: number;
  output_high: number;
  created_at: string;
}

// Research Source
export interface ResearchSource {
  id: string;
  project_id: string;
  source_name: 'BLS' | 'Census' | 'NAICS' | 'SEC EDGAR' | 'uploaded';
  source_url: string | null;
  data_retrieved: Record<string, unknown>;
  retrieved_at: string;
  module_id: string | null;
}

// Insights
export interface Insights {
  id: string;
  project_id: string;
  exec_summary: string;
  key_insights: KeyInsight[];
  tam_headline: number | null;
  vended_market_headline: number | null;
  white_space_headline: number | null;
  confidence_rating: ConfidenceRating;
  generated_at: string;
  generated_by_model: string;
}

export interface KeyInsight {
  bullet: string;
  supporting_figure?: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  project_id: string | null;
  user_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Benchmark Contribution
export interface BenchmarkContribution {
  id: string;
  organization_id: string;
  contributed_at: string;
  company_type: CompanyType;
  monetization_model: MonetizationModel | null;
  geographic_scope: GeographicScope | null;
  customer_type: CustomerType | null;
  naics_sector: string | null;
  employee_size_band: string | null;
  tam_value: number | null;
  vended_market_value: number | null;
  white_space_value: number | null;
  penetration_rate: number | null;
  acv_value: number | null;
  arpu_value: number | null;
  confidence_rating: ConfidenceRating | null;
}

// Data Retention Event
export interface DataRetentionEvent {
  id: string;
  project_id: string;
  event_type: RetentionEventType;
  scheduled_at: string;
  executed_at: string | null;
  status: RetentionEventStatus;
  details: Record<string, unknown> | null;
}

// API Request/Response Types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  company_name?: string;
  deal_stage?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  company_name?: string;
  deal_stage?: string;
  status?: ProjectStatus;
}

export interface InviteProjectMemberRequest {
  email: string;
  role: ProjectRole;
}

export interface AnalysisRequest {
  module_type: ModuleType;
  inputs: Record<string, unknown>;
}

export interface ResearchRequest {
  source: 'BLS' | 'Census' | 'NAICS' | 'SEC EDGAR';
  query: Record<string, unknown>;
}

export interface BenchmarkQueryRequest {
  company_type?: CompanyType;
  naics_sector?: string;
  customer_type?: CustomerType;
  metric: 'tam' | 'pricing' | 'penetration' | 'white_space';
}

export interface BenchmarkQueryResponse {
  distribution: {
    percentile_25: number;
    percentile_50: number;
    percentile_75: number;
    min: number;
    max: number;
  };
  cohort_size: number;
  filters_applied: Record<string, string>;
}
