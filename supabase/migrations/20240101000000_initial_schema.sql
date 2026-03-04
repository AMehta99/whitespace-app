-- Whitespace Database Schema
-- Initial migration: All tables and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sso_enabled BOOLEAN DEFAULT FALSE,
  sso_config JSONB DEFAULT NULL,
  retention_policy JSONB DEFAULT '{"raw_files_years": 1, "parsed_content_years": 3, "analysis_data_years": 3, "audit_logs_years": 5}'::jsonb,
  benchmark_opt_in BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USERS TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  company_name TEXT,
  deal_stage TEXT,
  scope_summary TEXT,
  model_config JSONB,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'complete', 'archived')),
  archived_at TIMESTAMPTZ,
  scheduled_purge_at TIMESTAMPTZ,
  purge_status TEXT CHECK (purge_status IN ('pending', 'files_purged', 'fully_purged')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROJECT_MEMBERS TABLE
-- ============================================================================
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('owner', 'analyst', 'viewer')),
  invited_email TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ
);

-- ============================================================================
-- PROJECT_FILES TABLE
-- ============================================================================
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('cim', 'financials', 'scope', 'market_research', 'customer_data', 'other')),
  storage_path TEXT,
  parsed_content JSONB,
  parsing_status TEXT NOT NULL DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'complete', 'failed')),
  file_purged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MODEL_CONFIGS TABLE
-- ============================================================================
CREATE TABLE model_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  company_type TEXT CHECK (company_type IN ('software', 'services', 'software_plus_services')),
  monetization_model TEXT CHECK (monetization_model IN ('per_seat', 'per_module', 'per_company_size_band', 'per_volume', 'margin_based', 'commission_based', 'hybrid')),
  geographic_scope TEXT CHECK (geographic_scope IN ('us_only', 'global', 'specific_regions')),
  regions JSONB,
  customer_type TEXT CHECK (customer_type IN ('b2b', 'b2c', 'government', 'mixed')),
  industry_focus TEXT,
  naics_codes JSONB,
  modules_enabled JSONB,
  auto_detected BOOLEAN DEFAULT FALSE,
  user_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ
);

-- ============================================================================
-- ANALYSIS_MODULES TABLE
-- ============================================================================
CREATE TABLE analysis_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL CHECK (module_type IN ('top_down', 'pricing', 'addressability', 'bottom_up', 'white_space', 'sensitivity')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'needs_review')),
  inputs JSONB,
  outputs JSONB,
  assumptions JSONB,
  claude_reasoning TEXT,
  last_run_at TIMESTAMPTZ,
  run_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, module_type)
);

-- ============================================================================
-- SENSITIVITY_SCENARIOS TABLE
-- ============================================================================
CREATE TABLE sensitivity_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES analysis_modules(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  low_value NUMERIC,
  base_value NUMERIC,
  high_value NUMERIC,
  output_low NUMERIC,
  output_base NUMERIC,
  output_high NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RESEARCH_SOURCES TABLE
-- ============================================================================
CREATE TABLE research_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL CHECK (source_name IN ('BLS', 'Census', 'NAICS', 'SEC EDGAR', 'uploaded')),
  source_url TEXT,
  data_retrieved JSONB NOT NULL,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  module_id UUID REFERENCES analysis_modules(id) ON DELETE SET NULL
);

-- ============================================================================
-- INSIGHTS TABLE
-- ============================================================================
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  exec_summary TEXT,
  key_insights JSONB,
  tam_headline NUMERIC,
  vended_market_headline NUMERIC,
  white_space_headline NUMERIC,
  confidence_rating TEXT CHECK (confidence_rating IN ('high', 'medium', 'low')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by_model TEXT
);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BENCHMARK_CONTRIBUTIONS TABLE
-- ============================================================================
CREATE TABLE benchmark_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contributed_at TIMESTAMPTZ DEFAULT NOW(),
  company_type TEXT CHECK (company_type IN ('software', 'services', 'software_plus_services')),
  monetization_model TEXT CHECK (monetization_model IN ('per_seat', 'per_module', 'per_company_size_band', 'per_volume', 'margin_based', 'commission_based', 'hybrid')),
  geographic_scope TEXT CHECK (geographic_scope IN ('us_only', 'global', 'specific_regions')),
  customer_type TEXT CHECK (customer_type IN ('b2b', 'b2c', 'government', 'mixed')),
  naics_sector TEXT,
  employee_size_band TEXT,
  tam_value NUMERIC,
  vended_market_value NUMERIC,
  white_space_value NUMERIC,
  penetration_rate NUMERIC,
  acv_value NUMERIC,
  arpu_value NUMERIC,
  confidence_rating TEXT CHECK (confidence_rating IN ('high', 'medium', 'low'))
);

-- ============================================================================
-- DATA_RETENTION_EVENTS TABLE
-- ============================================================================
CREATE TABLE data_retention_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('file_purge', 'parsed_content_purge', 'full_project_purge', 'benchmark_contribution')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'complete', 'failed')),
  details JSONB
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_analysis_modules_project_id ON analysis_modules(project_id);
CREATE INDEX idx_sensitivity_scenarios_project_id ON sensitivity_scenarios(project_id);
CREATE INDEX idx_research_sources_project_id ON research_sources(project_id);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_benchmark_contributions_organization_id ON benchmark_contributions(organization_id);
CREATE INDEX idx_data_retention_events_project_id ON data_retention_events(project_id);
CREATE INDEX idx_data_retention_events_scheduled_at ON data_retention_events(scheduled_at);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitivity_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_events ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Users: Users can only see users in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Projects: Users can see projects they're members of
CREATE POLICY "Users can view projects they're members of"
  ON projects FOR SELECT
  USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR (
      -- Org admins can see all org projects
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Users can create projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Project owners and org admins can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'owner'
    )
    OR (
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Project owners and org admins can delete projects"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'owner'
    )
    OR (
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Project Members: Users can see members of projects they're part of
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners can manage members"
  ON project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Project Files: Project members can view and upload
CREATE POLICY "Project members can view files"
  ON project_files FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project members can upload files"
  ON project_files FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'analyst')
    )
  );

-- Model Configs: Project members can view, owners/analysts can modify
CREATE POLICY "Project members can view model configs"
  ON model_configs FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners and analysts can modify model configs"
  ON model_configs FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'analyst')
    )
  );

-- Analysis Modules: Project members can view, owners/analysts can modify
CREATE POLICY "Project members can view analysis modules"
  ON analysis_modules FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners and analysts can modify analysis modules"
  ON analysis_modules FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'analyst')
    )
  );

-- Sensitivity Scenarios: Same as analysis modules
CREATE POLICY "Project members can view sensitivity scenarios"
  ON sensitivity_scenarios FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners and analysts can modify sensitivity scenarios"
  ON sensitivity_scenarios FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'analyst')
    )
  );

-- Research Sources: Same as analysis modules
CREATE POLICY "Project members can view research sources"
  ON research_sources FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners and analysts can modify research sources"
  ON research_sources FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'analyst')
    )
  );

-- Insights: Same as analysis modules
CREATE POLICY "Project members can view insights"
  ON insights FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Project owners and analysts can modify insights"
  ON insights FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'analyst')
    )
  );

-- Audit Logs: Users can view audit logs for projects they're part of
CREATE POLICY "Users can view audit logs for their projects"
  ON audit_logs FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR (
      -- Org admins can see all org audit logs
      project_id IN (
        SELECT id FROM projects
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      )
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Users can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Benchmark Contributions: Org members can read (aggregated at API layer), service role can write
CREATE POLICY "Org members can view their benchmark contributions"
  ON benchmark_contributions FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Data Retention Events: Project members can view, service role manages
CREATE POLICY "Project members can view retention events"
  ON data_retention_events FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create project member when project is created
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.created_by, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_project_owner_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner();

-- Auto-create analysis modules when project moves to active
CREATE OR REPLACE FUNCTION create_analysis_modules()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status = 'setup' THEN
    INSERT INTO analysis_modules (project_id, module_type)
    VALUES
      (NEW.id, 'top_down'),
      (NEW.id, 'pricing'),
      (NEW.id, 'addressability'),
      (NEW.id, 'bottom_up'),
      (NEW.id, 'white_space'),
      (NEW.id, 'sensitivity')
    ON CONFLICT (project_id, module_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_analysis_modules_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_analysis_modules();

-- Schedule purge when project is archived
CREATE OR REPLACE FUNCTION schedule_project_purge()
RETURNS TRIGGER AS $$
DECLARE
  org_retention JSONB;
  raw_files_years INT;
BEGIN
  IF NEW.status = 'archived' AND (OLD.status IS NULL OR OLD.status != 'archived') THEN
    -- Get org retention policy
    SELECT retention_policy INTO org_retention
    FROM organizations
    WHERE id = NEW.organization_id;

    raw_files_years := COALESCE((org_retention->>'raw_files_years')::INT, 1);

    NEW.archived_at := NOW();
    NEW.scheduled_purge_at := NOW() + (raw_files_years || ' years')::INTERVAL;
    NEW.purge_status := 'pending';

    -- Create retention event
    INSERT INTO data_retention_events (project_id, event_type, scheduled_at)
    VALUES (NEW.id, 'file_purge', NEW.scheduled_purge_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_project_purge_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION schedule_project_purge();
