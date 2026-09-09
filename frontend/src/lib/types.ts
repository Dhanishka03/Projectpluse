export interface ProblemStatement {
  id: string;
  title: string;
  description: string;
}

export interface Evidence {
  file: string;
  line?: number;
  type: "code" | "dependency";
  description: string;
  found: boolean;
}

export interface Claim {
  id: string;
  text: string;
  status: "verified" | "partially_verified" | "not_found";
  evidence: Evidence[];
  finding: string;
}

export interface Issue {
  id: string;
  claimId: string;
  type: "overstated" | "not_verified";
  title: string;
  description: string;
}

export interface Submission {
  id: string;
  teamName: string;
  projectName: string;
  githubUrl: string;
  problemStatementId: string;
  relevanceScore: number;
  claimsVerifiedCount: number;
  claimsTotalCount: number;
  issuesCount: number;
  status: "verified" | "review" | "failed";
  failureReason?: string;
  claims: Claim[];
  issues: Issue[];
}

export interface Hackathon {
  id: string;
  name: string;
  submissionStart: string;
  submissionEnd: string;
  problemStatements: ProblemStatement[];
  status: "draft" | "analyzing" | "complete";
  stats: {
    totalSubmissions: number;
    analyzed: number;
    needsReview: number;
    failed: number;
  };
}
