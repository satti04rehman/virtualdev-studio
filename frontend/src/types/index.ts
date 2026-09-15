export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  target_users: string;
  platform: string;
  tech_stack: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  status: 'created' | 'analyzing' | 'researching' | 'architecting' | 'developing' | 'testing' | 'documenting' | 'completed' | 'failed';
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  stage_name: string;
  stage_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
}

export interface Requirement {
  id: string;
  project_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'draft' | 'approved' | 'implemented' | 'testing';
  acceptance_criteria: string[];
  created_at: string;
}

export interface ResearchItem {
  id: string;
  project_id: string;
  topic: string;
  source_type: 'web' | 'documentation' | 'analysis' | 'benchmark' | 'comparison';
  source_url: string | null;
  summary: string;
  findings: string;
  recommendations: string[];
  confidence_score: number;
  created_at: string;
}

export interface ArchitectureComponent {
  id: string;
  project_id: string;
  name: string;
  component_type: 'frontend' | 'backend' | 'database' | 'service' | 'infrastructure' | 'external';
  description: string;
  technologies: string[];
  responsibilities: string[];
  dependencies: string[];
  api_endpoints: ApiEndpoint[];
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  request_body: string | null;
  response_body: string | null;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: 'idle' | 'working' | 'paused' | 'error' | 'offline';
  capabilities: string[];
  current_task_id: string | null;
  tasks_completed: number;
  success_rate: number;
  avatar_url: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  agent_id: string | null;
  title: string;
  description: string;
  task_type: 'requirements' | 'research' | 'architecture' | 'development' | 'testing' | 'documentation';
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  agent_name?: string;
}

export interface TaskRun {
  id: string;
  task_id: string;
  run_number: number;
  status: 'running' | 'completed' | 'failed';
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown> | null;
  logs: string[];
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

export interface Approval {
  id: string;
  project_id: string;
  task_id: string;
  approval_type: string;
  title: string;
  description: string;
  proposed_changes: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  title: string;
  doc_type: 'prd' | 'architecture' | 'api' | 'user_guide' | 'technical' | 'deployment';
  content: string;
  format: 'markdown' | 'html' | 'pdf';
  version: string;
  created_at: string;
  updated_at: string;
}

export interface Diagram {
  id: string;
  project_id: string;
  title: string;
  diagram_type: 'architecture' | 'erd' | 'sequence' | 'flowchart' | 'component' | 'deployment';
  source: string;
  format: 'mermaid' | 'plantuml' | 'svg';
  rendered_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_tasks: number;
  pending_approvals: number;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  project_name: string;
  timestamp: string;
}
