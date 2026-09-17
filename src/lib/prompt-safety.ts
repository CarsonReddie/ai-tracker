export type PromptSafetyCategory =
  | "injection"
  | "secrets"
  | "harmful"
  | "exfiltration";

export interface PromptFinding {
  category: PromptSafetyCategory;
  pattern: string;
  matchedText: string;
}

interface Rule {
  category: PromptSafetyCategory;
  pattern: string;
  regex: RegExp;
}

const RULES: Rule[] = [
  // --- Prompt injection attempts ---
  {
    category: "injection",
    pattern: "ignore previous instructions",
    regex: /ignore\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|earlier)\s*(instructions|prompts?|system\s+prompts?|guidelines)\b/i,
  },
  {
    category: "injection",
    pattern: "disregard instructions",
    regex: /disregard\s+(all\s+)?(previous|prior|earlier|your)?\s*(instructions|prompts?|system\s+prompts?|guidelines|configured\s+role)\b/i,
  },
  {
    category: "injection",
    pattern: "reveal system prompt",
    regex: /(reveal|show|print|output|expose|leak)\s+(me\s+)?(your|the|its)\s+(full\s+)?(system\s+)?prompts?\b/i,
  },
  {
    category: "injection",
    pattern: "you are now / developer mode",
    regex: /you\s+are\s+now\s+(an?\s+|a\s+)?(unaligned\s+ai|free\s+ai|independent\s+ai|DAN\b|developer\s+mode|jailbroken|unfiltered|everything\s+allowed)/i,
  },
  {
    category: "injection",
    pattern: "ignore constraints",
    regex: /(override|bypass|ignore|forget|drop)\s+(all\s+)?(your\s+)?(rules|constraints|guardrails|safety\s+(rules|limits)|restrictions|filters|policy)\b/i,
  },
  {
    category: "injection",
    pattern: "pretend / act as",
    regex: /pretend\s+you\s+(are|have\s+no\s+rules|don'?t\s+have\s+rules)|act\s+as\s+if\s+you\s+(have\s+no\s+rules|are\s+unconstrained)/i,
  },
  {
    category: "injection",
    pattern: "jailbreak",
    regex: /jail\s*break|do\s+anything\s+now\s+\(DAN\)|better\s+than\s+your\s+(rules|guidelines|instructions)/i,
  },
  {
    category: "injection",
    pattern: "prompt injection",
    regex: /prompt\s+injection|inject\s+(a\s+)?hidden\s+(instruction|prompt|command)/i,
  },
  // --- Credentials / secrets ---
  {
    category: "secrets",
    pattern: "OpenAI API key",
    regex: /\bsk-[A-Za-z0-9_\-]{16,}\b/i,
  },
  {
    category: "secrets",
    pattern: "Anthropic API key",
    regex: /\bsk-ant-[A-Za-z0-9_\-]{16,}\b/i,
  },
  {
    category: "secrets",
    pattern: "AWS access key",
    regex: /\bAKIA[0-9A-Z]{16}\b/i,
  },
  {
    category: "secrets",
    pattern: "GitHub token",
    regex: /\b(ghp|gho|ghu)_[A-Za-z0-9_\-]{20,}\b/i,
  },
  {
    category: "secrets",
    pattern: "Google API key",
    regex: /\bAIza[0-9A-Za-z_\-]{20,}\b/i,
  },
  {
    category: "secrets",
    pattern: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9\-]{10,}\b/i,
  },
  {
    category: "secrets",
    pattern: "private key block",
    regex: /-----BEGIN[a-z ]*PRIVATE\s+KEY-----/i,
  },
  {
    category: "secrets",
    pattern: "JWT",
    regex: /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/i,
  },
  {
    category: "secrets",
    pattern: "key/password/secret assignment",
    regex: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?key|auth(?:entication)?[_-]?token|bearer)\s*[:=]\s*(?:`|")?[^\s,;"`]{4,}\b/i,
  },
  {
    category: "secrets",
    pattern: "recovery/seed phrase",
    regex: /\b(recovery\s+(?:phrase|seed)|24[- ]?word\s+(?:seed|phrase)|mnemonic\s+phrase)\b/i,
  },
  // --- Harmful content ---
  {
    category: "harmful",
    pattern: "weapons/explosives",
    regex: /\b(?:how\s+to\s+)?(?:make|build|create|manufacture|synthesize)\s+(?:an?\s+)?(?:bomb|explosive|explosives|improvised\s+explosive|firearm|biological\s+(?:weapon|agent)|chemical\s+weapon)\b/i,
  },
  {
    category: "harmful",
    pattern: "malware crafting",
    regex: /\b(?:create|craft|write|build|develop)\s+(?:a\s+)?(?:malware|ransomware|keylogger|virus|trojan|rootkit|botnet|cryptominer|remote\s+access\s+trojan)\b/i,
  },
  {
    category: "harmful",
    pattern: "exploit development",
    regex: /\b(?:exploit\s+code|0-?day\s+exploit|zero-?day\s+(?:exploit|vulnerability)|(?:write|develop|create)\s+an?\s+exploit)\b/i,
  },
  {
    category: "harmful",
    pattern: "self-harm instructions",
    regex: /\b(?:instructions?\s+for\s+self[- ]harm|how\s+to\s+self[- ]harm|guide\s+to\s+suicide)\b/i,
  },
  {
    category: "harmful",
    pattern: "phishing/social engineering",
    regex: /\b(?:phishing\s+(?:email|kit|template|page)|social[- ]engineering\s+(?:script|template|email|attack))\b/i,
  },
  {
    category: "harmful",
    pattern: "stolen cards / card fraud",
    regex: /\b(?:stolen\s+(?:credit|debit)?\s*cards?|credit\s+card\s+(?:numbers?|details?|fraud)|card\s+cvv\s+numbers?|generate\s+valid\s+credit\s+card)\b/i,
  },
  {
    category: "harmful",
    pattern: "child safety",
    regex: /\bchild\s+(?:sexual\s+(?:abuse\s+)?material|pornography)|csam\b/i,
  },
  {
    category: "harmful",
    pattern: "forged documents",
    regex: /\b(?:make|create|forge|produce)\s+(?:fake|forged|fraudulent)\s+(?:documents?|ids?|identification|passports?|credentials?|currency|official\s+records)\b/i,
  },
  // --- Data exfiltration / privacy ---
  {
    category: "exfiltration",
    pattern: "exfiltration attempt",
    regex: /\bexfiltrat(e|es|ing|ion)?\b/i,
  },
  {
    category: "exfiltration",
    pattern: "send data outbound",
    regex: /\b(?:send|push|post|upload|forward|email|transmit)\b[^\n]{0,50}\b(?:data|conversations?|conversation\s+data|chats?|prompts?|messages?|files?|documents?|emails?|logs?)\b[^\n]{0,30}\b(?:to\s+(?:an?\s+|the\s+|your\s+|a\s+|any\s+)?(?:https?:\/\/|url\b|external\s+server|outside\b|remote\s+server|server|endpoint|third[- ]party)|out\b|elsewhere\b)/i,
  },
  {
    category: "exfiltration",
    pattern: "send data to URL",
    regex: /\b(?:send|post|upload|forward|transmit)\b[^\n]{0,90}\bhttps?:\/\/\S+/i,
  },
  {
    category: "exfiltration",
    pattern: "leak credentials",
    regex: /\bleak\s+(?:the\s+)?(?:data|database|credentials?|tokens?|keys?|passwords?)\b/i,
  },
  {
    category: "exfiltration",
    pattern: "harvest personal data",
    regex: /\b(?:harvest|collect|scrape|gather)\s+(?:users?\b|personal\b|private\b)?\s*(?:personal\s+)?data\b/i,
  },
  {
    category: "exfiltration",
    pattern: "PII request",
    regex: /\b(?:pii\b|personally\s+identifiable\s+(?:information|data)|dox{1,2}\w*)\b/i,
  },
  {
    category: "exfiltration",
    pattern: "card/PII numbers",
    regex: /\b(?:credit\s+card\s+numbers?|social\s+security\s+(?:numbers?|ssn)|bank\s+account\s+numbers?|full\s+names?\s+(?:and\s+addresses?))\b/i,
  },
  {
    category: "exfiltration",
    pattern: "restricted access",
    regex: /\b(?:access\s+to\s+(?:restricted|classified|confidential)\s*(?:data|systems?|records|files?)|bypass\s+(?:auth(?:entication)?|2fa|mfa))\b/i,
  },
];

const CATEGORY_ORDER: PromptSafetyCategory[] = [
  "injection",
  "secrets",
  "harmful",
  "exfiltration",
];

export function screenPrompt(text: string | null | undefined): PromptFinding[] {
  if (!text) return [];
  const normalized = String(text).toLowerCase();
  const found = new Map<PromptSafetyCategory, PromptFinding>();

  for (const rule of RULES) {
    if (found.has(rule.category)) continue;
    const match = normalized.match(rule.regex);
    if (match) {
      found.set(rule.category, {
        category: rule.category,
        pattern: rule.pattern,
        matchedText: match[0].slice(0, 80),
      });
    }
  }

  return CATEGORY_ORDER.filter((category) => found.has(category)).map(
    (category) => found.get(category) as PromptFinding
  );
}

export const PROMPT_CATEGORY_LABELS: Record<PromptSafetyCategory, string> = {
  injection: "Prompt injection",
  secrets: "Credentials / secrets",
  harmful: "Harmful content",
  exfiltration: "Data exfiltration",
};