import { Profile, Filters } from '@/types';

/**
 * Filter profiles against structured Filters using deterministic predicate logic.
 *
 * Filtering rules:
 * - skills:           ANY overlap — profile must have at least 1 skill matching the filter list (case-insensitive)
 * - years_experience: inclusive range [minYearsExperience, maxYearsExperience]
 * - location:         case-insensitive substring match (e.g. "Bangalore" matches "Bangalore")
 * - companyTypes:     profile's current_company_type must be in the list
 *
 * All filter fields are optional; omitted fields match all profiles.
 */
export function filterProfiles(profiles: Profile[], filters: Filters): Profile[] {
  return profiles.filter((profile) => {
    // ── Skills: ANY overlap (case-insensitive) ─────────────────────────────
    if (filters.skills && filters.skills.length > 0) {
      const filterSkillsLower = filters.skills.map((s) => s.toLowerCase());
      const profileSkillsLower = profile.skills.map((s) => s.toLowerCase());
      const hasOverlap = filterSkillsLower.some((fs) =>
        profileSkillsLower.some((ps) => ps.includes(fs) || fs.includes(ps))
      );
      if (!hasOverlap) return false;
    }

    // ── Years experience: inclusive range ─────────────────────────────────
    if (filters.minYearsExperience !== undefined) {
      if (profile.years_experience < filters.minYearsExperience) return false;
    }
    if (filters.maxYearsExperience !== undefined) {
      if (profile.years_experience > filters.maxYearsExperience) return false;
    }

    // ── Location: case-insensitive substring match ─────────────────────────
    if (filters.location && filters.location.trim()) {
      const filterLoc = filters.location.toLowerCase().trim();
      const profileLoc = profile.location.toLowerCase();
      if (!profileLoc.includes(filterLoc) && !filterLoc.includes(profileLoc.split(',')[0].trim())) {
        return false;
      }
    }

    // ── Company type: value in list ───────────────────────────────────────
    if (filters.companyTypes && filters.companyTypes.length > 0) {
      if (!filters.companyTypes.includes(profile.current_company_type)) return false;
    }

    return true;
  });
}
