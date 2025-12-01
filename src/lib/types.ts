export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  job_type?: string;
  estimated_price?: number;
  lead_source_id: string | null;
  pipeline_stage?: string;
  created_at?: string;
  lead_sources?: {
    name: string;
    color: string;
  };
}
