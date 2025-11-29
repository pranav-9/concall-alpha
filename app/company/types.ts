export type QuarterData = {
  id: number;
  company_code: string;
  fy: number;
  qtr: number;
  quarter_start_date: string;
  quarter_label: string;
  score: number;
  summary: {
    topic: string;
    text: string;
    detail: string;
  }[];
};

export type ChartDataPoint = {
  qtr: string;
  score: number;
};

export type BusinessSegment = {
  id: number;
  company: string;
  canonical_name: string;
  variations: string[] | null;
  sub_segments: string[] | null;
  description: string | null;
  has_revenue_breakdown: boolean | null;
  segment_type: string | null;
  documents_analyzed: number | null;
  extracted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SegmentRevenue = {
  id: number;
  company: string;
  financial_year: string;
  source_document: string | null;
  segment_name: string;
  revenue_contribution_percent: string | null;
  revenue_absolute_reported: string | null;
  revenue_absolute_calculated: number | null;
  revenue_unit: string;
  calculation_basis: string | null;
  page_number: number | null;
  company_total_revenue: number | null;
  company_total_revenue_unit: string;
  data_source_type: string | null;
  document_type: string | null;
  extracted_at: string | null;
  updated_at: string | null;
};
