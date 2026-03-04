import Anthropic from "@anthropic-ai/sdk";

// Tool definitions for Claude
export const tools: Anthropic.Tool[] = [
  {
    name: "parse_uploaded_file",
    description: "Parse and extract structured data from an uploaded project file (CIM, financials, scope doc, etc.)",
    input_schema: {
      type: "object" as const,
      properties: {
        file_id: {
          type: "string",
          description: "The ID of the file to parse",
        },
        extraction_focus: {
          type: "string",
          description: "What to focus on extracting: 'company_info', 'financials', 'market_data', 'pricing', 'customers', 'all'",
        },
      },
      required: ["file_id", "extraction_focus"],
    },
  },
  {
    name: "query_bls",
    description: "Query the Bureau of Labor Statistics API for employment, wage, or establishment data by industry",
    input_schema: {
      type: "object" as const,
      properties: {
        series_id: {
          type: "string",
          description: "The BLS series ID to query (e.g., 'CEU5000000001' for employment)",
        },
        start_year: {
          type: "number",
          description: "Start year for data range",
        },
        end_year: {
          type: "number",
          description: "End year for data range",
        },
      },
      required: ["series_id", "start_year", "end_year"],
    },
  },
  {
    name: "query_census",
    description: "Query Census Bureau for business counts, revenue, or employment by NAICS code, geography, and company size",
    input_schema: {
      type: "object" as const,
      properties: {
        dataset: {
          type: "string",
          description: "Census dataset: 'cbp' (County Business Patterns), 'susb' (Statistics of US Businesses), 'abs' (Annual Business Survey)",
        },
        naics_code: {
          type: "string",
          description: "NAICS industry code (2-6 digits)",
        },
        geography: {
          type: "string",
          description: "Geographic level: 'us', 'state', 'county'",
        },
        year: {
          type: "number",
          description: "Year for the data",
        },
      },
      required: ["dataset", "naics_code", "geography", "year"],
    },
  },
  {
    name: "query_sec_edgar",
    description: "Pull revenue, segment data, or financial metrics from SEC EDGAR filings for a public company",
    input_schema: {
      type: "object" as const,
      properties: {
        company_name: {
          type: "string",
          description: "Name of the company",
        },
        ticker: {
          type: "string",
          description: "Stock ticker symbol",
        },
        filing_type: {
          type: "string",
          description: "Type of filing: '10-K', '10-Q', '8-K'",
        },
        data_points: {
          type: "array",
          items: { type: "string" },
          description: "Specific data points to extract: 'revenue', 'segments', 'customers', 'growth_rate'",
        },
      },
      required: ["ticker", "filing_type"],
    },
  },
  {
    name: "calculate_tam",
    description: "Calculate Total Addressable Market using provided inputs and methodology",
    input_schema: {
      type: "object" as const,
      properties: {
        methodology: {
          type: "string",
          description: "Calculation methodology: 'top_down', 'bottom_up', 'value_theory'",
        },
        universe_count: {
          type: "number",
          description: "Total number of potential customers/companies in the universe",
        },
        average_deal_value: {
          type: "number",
          description: "Average contract value or revenue per customer",
        },
        addressability_filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filter_name: { type: "string" },
              filter_percentage: { type: "number" },
            },
          },
          description: "Filters to apply to narrow the universe (e.g., size, industry, geography)",
        },
      },
      required: ["methodology", "universe_count", "average_deal_value"],
    },
  },
  {
    name: "save_assumption",
    description: "Save a tracked assumption with its source citation to the project",
    input_schema: {
      type: "object" as const,
      properties: {
        module_id: {
          type: "string",
          description: "The analysis module this assumption belongs to",
        },
        variable: {
          type: "string",
          description: "Name of the variable or metric",
        },
        value: {
          type: "number",
          description: "The assumed value",
        },
        unit: {
          type: "string",
          description: "Unit of measurement (e.g., '$', '%', 'count')",
        },
        source: {
          type: "string",
          description: "Source of this assumption: 'BLS', 'Census', 'SEC EDGAR', 'uploaded_file', 'user_input', 'claude_estimate'",
        },
        source_url: {
          type: "string",
          description: "URL or file reference for the source",
        },
        confidence: {
          type: "string",
          description: "Confidence level: 'high', 'medium', 'low'",
        },
        rationale: {
          type: "string",
          description: "Brief explanation of why this value was chosen",
        },
      },
      required: ["module_id", "variable", "value", "source"],
    },
  },
  {
    name: "flag_for_review",
    description: "Flag an assumption or result for team review and discussion",
    input_schema: {
      type: "object" as const,
      properties: {
        module_id: {
          type: "string",
          description: "The analysis module ID",
        },
        assumption_id: {
          type: "string",
          description: "ID of the assumption to flag",
        },
        reason: {
          type: "string",
          description: "Why this needs review (e.g., 'high uncertainty', 'conflicting sources', 'outdated data')",
        },
      },
      required: ["module_id", "reason"],
    },
  },
  {
    name: "generate_insights",
    description: "Generate executive summary and key insight bullets from completed analysis modules",
    input_schema: {
      type: "object" as const,
      properties: {
        project_id: {
          type: "string",
          description: "The project ID",
        },
        modules_to_include: {
          type: "array",
          items: { type: "string" },
          description: "Which modules to include in the insights: 'top_down', 'pricing', 'addressability', 'bottom_up', 'white_space', 'sensitivity'",
        },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description: "Specific areas to emphasize in insights",
        },
      },
      required: ["project_id", "modules_to_include"],
    },
  },
  {
    name: "query_org_benchmarks",
    description: "Query anonymized organization benchmark data to contextualize current model assumptions",
    input_schema: {
      type: "object" as const,
      properties: {
        company_type: {
          type: "string",
          description: "Filter by company type: 'software', 'services', 'software_plus_services'",
        },
        naics_sector: {
          type: "string",
          description: "2-digit NAICS sector code",
        },
        customer_type: {
          type: "string",
          description: "Filter by customer type: 'b2b', 'b2c', 'government', 'mixed'",
        },
        metric: {
          type: "string",
          description: "Metric to benchmark: 'tam', 'acv', 'arpu', 'penetration_rate', 'white_space_pct'",
        },
      },
      required: ["metric"],
    },
  },
];

// Tool handler types
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Tool execution function type
export type ToolExecutor = (input: Record<string, unknown>) => Promise<ToolResult>;
