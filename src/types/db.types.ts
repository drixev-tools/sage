export interface CommitRecord {
  repo: string;
  message: string;
  filesChanged: number;
}

export interface CommitStats {
  totalCommits: number;
  topTypes: {
    type: string;
    count: number;
  }[];
  recentCommits: {
    message: string;
    repo: string;
    created_at: string;
  }[];
}
