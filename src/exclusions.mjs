// Exclude entire service blocks, never a result just because its text says 광고/플레이스.
export const exclusionRules = {
  // Naver Mate is a creator/profile recommendation service, not article results.
  // Match its observed template, not arbitrary results mentioning 네이버 메이트.
  containers: '#place-app-root, .place-app-root, #power_link_body, .ad_section, .sc_new.cs_powerlink, [data-block-id="aipick/prs_template_v2_aipick_basic_desk.ts"], [data-block-id="ai-briefing/prs_template_aib_answer_desk.ts"], [data-block-id="clip/prs_template_v2_clip_overlaytext_desk.ts"], [data-block-id="video/prs_template_v2_video_desk.ts"]',
  collections: ['pwl', 'nmb', 'shop', 'shp', 'kwX'],
  headings: /^(?:파워링크|플레이스|쇼핑|함께 많이 찾는)$|관련 광고$/,
  adHosts: ['ader.naver.com', 'adcr.naver.com', 'searchad.naver.com'],
};
export const browserRules = {...exclusionRules, headings: exclusionRules.headings.source};


