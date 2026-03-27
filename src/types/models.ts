export interface ModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
}

export interface Model {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
}

export interface PullProgressPayload {
  model: string;
  status: string;
  completed?: number;
  total?: number;
  percent: number;
}
