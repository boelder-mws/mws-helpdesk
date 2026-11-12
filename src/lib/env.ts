import "server-only";

function str(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}
function list(name: string) {
  return str(name)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Read at request time (getters), so the image can be built without secrets. */
export const env = {
  get appUrl() {
    return str("APP_URL", "http://localhost:3000").replace(/\/+$/, "");
  },
  get orgName() {
    return str("ORG_NAME", "IT Helpdesk");
  },
  get timezone() {
    return str("APP_TIMEZONE", "UTC");
  },
  get uploadDir() {
    return str("UPLOAD_DIR", "./data/uploads");
  },
  get oidcIssuer() {
    return str("OIDC_ISSUER");
  },
  get oidcClientId() {
    return str("OIDC_CLIENT_ID");
  },
  get oidcClientSecret() {
    return str("OIDC_CLIENT_SECRET");
  },
  get oidcScopes() {
    return str("OIDC_SCOPES", "openid profile email");
  },
  get oidcProviderName() {
    return str("OIDC_PROVIDER_NAME", "single sign-on");
  },
  get oidcAllowInsecure() {
    return str("OIDC_ALLOW_INSECURE") === "true";
  },
  get oidcAllowedDomains() {
    return list("OIDC_ALLOWED_DOMAINS");
  },
  get oidcGroupsClaim() {
    return str("OIDC_GROUPS_CLAIM");
  },
  get oidcAdminGroups() {
    return list("OIDC_ADMIN_GROUPS");
  },
  get oidcAgentGroups() {
    return list("OIDC_AGENT_GROUPS");
  },
  get adminEmails() {
    return list("ADMIN_EMAILS");
  },
  get smtpHost() {
    return str("SMTP_HOST");
  },
  get smtpPort() {
    return Number(str("SMTP_PORT", "587"));
  },
  get smtpSecure() {
    return str("SMTP_SECURE") === "true";
  },
  get smtpUser() {
    return str("SMTP_USER");
  },
  get smtpPassword() {
    return str("SMTP_PASSWORD");
  },
  get mailFrom() {
    return str("MAIL_FROM", "IT Helpdesk <helpdesk@localhost>");
  },
};
