// Every reading topic pulls straight from its dedicated source JSON below —
// nothing in this app edits or rewrites these files. Swap any of them out
// with your real/updated file (same filename, same {"Card Name": "text"}
// shape) and the app picks it up automatically.
import partnerFeelings from "@/data/Partner_Current_Feelings_Edited_Version__Final_Draft__-_31-12-2025.json";
import partnerAction from "@/data/your_partner_action_done.json";
import yesNo from "@/data/78_CARDS_YES_NO_NEW_WITH_GUIDIANCE.json";
import thirdParty from "@/data/APKI_LIFE_SE_THIRD_PARTY_SITUATION_KAB_END_HOGI.json";
import universeGuidance from "@/data/universe_guidance.json";
import spiritualJourney from "@/data/spiritual_journey_of_all_cards_done.json";
import monthly from "@/data/This_month_for_you_all_language_done.json";
import babyKabHoga from "@/data/APKO_BABY_KAB_HOGA.json";
import soulmateKabMilega from "@/data/APKO_SOULMATE_KAB_MILEGA.json";
import relationshipPPF from "@/data/your_relationship_past_present_future.json";
import unionKabHoga from "@/data/Apka_union_kab_hoga.json";
import shaadiKabHogi from "@/data/Apki_shaadi_kab_hogi.json";
import lifepartnerKabMilega from "@/data/APKO_APKA_LIFEPARTNER_KABMILEGA.json";

export const READINGS = {
  partnerFeelings,
  partnerAction,
  yesNo,
  thirdParty,
  universeGuidance,
  spiritualJourney,
  monthly,
  babyKabHoga,
  soulmateKabMilega,
  relationshipPPF,
  unionKabHoga,
  shaadiKabHogi,
  lifepartnerKabMilega,
};
