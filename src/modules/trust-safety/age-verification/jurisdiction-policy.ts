/**
 * ============================================================================
 * JURISDICTION POLICY SERVICE (REGULATORY COMPLIANCE ENGINE)
 * ============================================================================
 * 
 * Determines statutory age-assurance requirements based on applicable legal counsel
 * and statutory laws across jurisdictions (US States, UK, EU, Germany, etc.).
 * 
 * CORE PRINCIPLE:
 * Age verification flow must adapt dynamically to legal requirements of the
 * jurisdiction the user originates from, ensuring statutory compliance while
 * preserving user privacy and data minimization.
 */

import { AgeAssuranceLevel, AgeVerificationMethod, JurisdictionRule } from "./types";

export class JurisdictionPolicyService {
  /**
   * Statutory Jurisdiction Rules Matrix.
   * Maintained in coordination with platform legal counsel and compliance officers.
   */
  private static readonly RULES: Record<string, JurisdictionRule> = {
    // ------------------------------------------------------------------------
    // UNITED STATES - STRICT STATUTORY ID CHECK JURISDICTIONS
    // ------------------------------------------------------------------------
    "US-TX": {
      jurisdictionCode: "US-TX",
      jurisdictionName: "Texas (United States)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      allowedMethods: ["ID_DOCUMENT_KYC", "GOVERNMENT_EID"],
      sessionValidityDays: 365,
      strictLiabilityEnforced: true,
      statutoryReference: "Tex. Bus. & Com. Code § 129A (HB 1181)",
      disclaimerText:
        "Texas law requires commercial age verification using government-issued identification before accessing this platform.",
    },
    "US-UT": {
      jurisdictionCode: "US-UT",
      jurisdictionName: "Utah (United States)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      allowedMethods: ["ID_DOCUMENT_KYC", "GOVERNMENT_EID"],
      sessionValidityDays: 365,
      strictLiabilityEnforced: true,
      statutoryReference: "Utah Code Ann. § 78B-6-2601 (SB 287)",
      disclaimerText:
        "Utah law requires verified digital identity or government ID verification prior to access.",
    },
    "US-VA": {
      jurisdictionCode: "US-VA",
      jurisdictionName: "Virginia (United States)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      allowedMethods: ["ID_DOCUMENT_KYC", "GOVERNMENT_EID"],
      sessionValidityDays: 365,
      strictLiabilityEnforced: true,
      statutoryReference: "Va. Code Ann. § 18.2-391.2 (SB 1515)",
      disclaimerText:
        "Virginia law requires commercial age verification through government-issued ID.",
    },
    "US-LA": {
      jurisdictionCode: "US-LA",
      jurisdictionName: "Louisiana (United States)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      allowedMethods: ["ID_DOCUMENT_KYC", "GOVERNMENT_EID"],
      sessionValidityDays: 365,
      strictLiabilityEnforced: true,
      statutoryReference: "La. R.S. § 9:2800.28 (Act 440)",
      disclaimerText: "Louisiana law requires LA Wallet digital ID or photo ID verification.",
    },
    "US-NC": {
      jurisdictionCode: "US-NC",
      jurisdictionName: "North Carolina (United States)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      allowedMethods: ["ID_DOCUMENT_KYC", "GOVERNMENT_EID"],
      sessionValidityDays: 365,
      strictLiabilityEnforced: true,
      statutoryReference: "N.C. Gen. Stat. § 14-190.17B (HB 8)",
      disclaimerText:
        "North Carolina requires government photo ID age verification before entry.",
    },

    // ------------------------------------------------------------------------
    // UNITED KINGDOM - ONLINE SAFETY ACT 2023
    // ------------------------------------------------------------------------
    GB: {
      jurisdictionCode: "GB",
      jurisdictionName: "United Kingdom",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_2_CARD_AVS,
      allowedMethods: [
        "OPEN_BANKING_AGE_CHECK",
        "CREDIT_CARD_ASSURANCE",
        "ID_DOCUMENT_KYC",
        "FACIAL_AGE_ESTIMATION",
      ],
      sessionValidityDays: 365,
      strictLiabilityEnforced: true,
      statutoryReference: "UK Online Safety Act 2023 (Part 3, Section 12) & OFCOM Guidance",
      disclaimerText:
        "UK law requires highly effective age assurance (Open Banking, Credit Card, or certified Age Estimation) prior to accessing adult services.",
    },

    // ------------------------------------------------------------------------
    // GERMANY - JMStV / KJM CLOSED USER GROUP RULES
    // ------------------------------------------------------------------------
    DE: {
      jurisdictionCode: "DE",
      jurisdictionName: "Germany (Federal Republic)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_2_CARD_AVS,
      allowedMethods: ["GOVERNMENT_EID", "ID_DOCUMENT_KYC", "CREDIT_CARD_ASSURANCE"],
      sessionValidityDays: 180,
      strictLiabilityEnforced: true,
      statutoryReference: "Jugendmedienschutz-Staatsvertrag (JMStV § 4 Abs. 2)",
      disclaimerText:
        "German regulations require verification for a closed adult user group (Geschlossene Benutzergruppe).",
    },

    // ------------------------------------------------------------------------
    // EUROPEAN UNION - AVMSD STANDARD
    // ------------------------------------------------------------------------
    EU: {
      jurisdictionCode: "EU",
      jurisdictionName: "European Union (Standard)",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_2_CARD_AVS,
      allowedMethods: [
        "CREDIT_CARD_ASSURANCE",
        "ID_DOCUMENT_KYC",
        "FACIAL_AGE_ESTIMATION",
        "GOVERNMENT_EID",
      ],
      sessionValidityDays: 365,
      strictLiabilityEnforced: false,
      statutoryReference: "EU Audiovisual Media Services Directive (AVMSD Art. 28b)",
      disclaimerText: "Age verification required in compliance with EU digital media protections.",
    },

    // ------------------------------------------------------------------------
    // GLOBAL DEFAULT / STANDARD JURISDICTIONS
    // ------------------------------------------------------------------------
    DEFAULT: {
      jurisdictionCode: "DEFAULT",
      jurisdictionName: "Standard Global Jurisdiction",
      minimumAssuranceLevel: AgeAssuranceLevel.LEVEL_2_CARD_AVS,
      allowedMethods: [
        "CREDIT_CARD_ASSURANCE",
        "ID_DOCUMENT_KYC",
        "FACIAL_AGE_ESTIMATION",
        "GOVERNMENT_EID",
      ],
      sessionValidityDays: 365,
      strictLiabilityEnforced: false,
      statutoryReference: "Platform Safety Standards & Terms of Service",
      disclaimerText:
        "Age assurance verification is required to access 18+ adult streaming and interactive services.",
    },
  };

  /**
   * Resolve statutory rule for a jurisdiction code (country or region).
   */
  static getRuleForJurisdiction(jurisdictionCode?: string): JurisdictionRule {
    if (!jurisdictionCode) return this.RULES["DEFAULT"];

    const upper = jurisdictionCode.toUpperCase().trim();

    // Check specific state code (e.g. US-TX)
    if (this.RULES[upper]) {
      return this.RULES[upper];
    }

    // Check country code prefix (e.g. GB, DE)
    const countryPrefix = upper.split("-")[0];
    if (this.RULES[countryPrefix]) {
      return this.RULES[countryPrefix];
    }

    return this.RULES["DEFAULT"];
  }

  /**
   * Check if a proposed assurance level meets or exceeds the statutory requirement.
   */
  static isAssuranceLevelSufficient(
    currentLevel: AgeAssuranceLevel | null | undefined,
    requiredLevel: AgeAssuranceLevel
  ): boolean {
    if (!currentLevel) return false;

    const rank: Record<AgeAssuranceLevel, number> = {
      [AgeAssuranceLevel.LEVEL_1_ESTIMATION]: 1,
      [AgeAssuranceLevel.LEVEL_2_CARD_AVS]: 2,
      [AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS]: 3,
      [AgeAssuranceLevel.LEVEL_4_GOVERNMENT_EID]: 4,
    };

    return rank[currentLevel] >= rank[requiredLevel];
  }

  /**
   * Check if a specific verification method is permitted in the jurisdiction.
   */
  static isMethodAllowedInJurisdiction(
    method: AgeVerificationMethod,
    jurisdictionCode: string
  ): boolean {
    const rule = this.getRuleForJurisdiction(jurisdictionCode);
    return rule.allowedMethods.includes(method);
  }
}
