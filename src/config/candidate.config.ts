/**
 * CivicSphere AI — Presentation Candidate Configuration
 * 
 * Reusable, configuration-driven profile for candidate presentation splash screen.
 * Edit these values and/or update the designated photo asset to customize the presentation.
 */

export interface CandidateConfig {
  /** Candidate's full official display name */
  name: string;
  /** Position sought or current political office */
  office: string;
  /** Constituency, Senatorial District, State, or Jurisdiction */
  jurisdiction: string;
  /** Political party abbreviation and/or full name */
  party: string;
  /** Optional campaign slogan or civic mission motto */
  motto?: string;
  /** Path to candidate photograph or public image URL */
  photoUrl: string | null;
  /** Display duration in milliseconds (default: 3800ms) */
  displayDurationMs: number;
}

export const candidateConfig: CandidateConfig = {
  name: 'Senator Barau I. Jibrin',
  office: 'Deputy President of the Senate',
  jurisdiction: 'Kano North Senatorial District, Federal Republic of Nigeria',
  party: 'All Progressives Congress (APC)',
  motto: 'Empowering Citizens, Fostering Leadership & Driving Grassroots Innovation',
  // Specify image URL or relative asset path; null triggers a dignified civic heraldic monogram
  photoUrl: null,
  displayDurationMs: 3800,
};
