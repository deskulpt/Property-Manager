//! Small pure string helpers (slug / labels / id format checks).

/// Sanitize a plan element label (matches `sanitizePlanLabel` in `lib/plan-draft.ts`).
pub fn sanitize_plan_label(input: &str) -> String {
    let cleaned: String = input
        .chars()
        .filter(|c| {
            c.is_ascii_alphanumeric()
                || *c == '_'
                || *c == ' '
                || *c == '.'
                || *c == '\''
                || *c == '#'
                || *c == '/'
                || *c == '-'
        })
        .collect();
    let trimmed = cleaned.trim();
    let sliced: String = trimmed.chars().take(40).collect();
    if sliced.is_empty() {
        "Untitled".to_string()
    } else {
        sliced
    }
}

/// Organisation slug: lowercase kebab, max 48 chars (mirrors `slugifyOrg` / sibling PR).
pub fn slugify_org(name: &str) -> String {
    let mut out = String::with_capacity(name.len().min(48));
    let mut last_dash = true; // trim leading dashes
    for ch in name.chars() {
        let c = ch.to_ascii_lowercase();
        if c.is_ascii_alphanumeric() {
            out.push(c);
            last_dash = false;
        } else if !last_dash {
            out.push('-');
            last_dash = true;
        }
        if out.len() >= 48 {
            break;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    if out.is_empty() {
        "org".into()
    } else {
        out
    }
}

/// Alias used by older call sites — same as `slugify_org`.
pub fn normalize_slug(input: &str) -> String {
    slugify_org(input)
}

/// Tenant ids in this app look like `t_bbm`, `t_harbour`, `t_deskulpt`.
pub fn is_valid_tenant_id(id: &str) -> bool {
    let bytes = id.as_bytes();
    if bytes.len() < 3 || bytes.len() > 64 {
        return false;
    }
    if !bytes.starts_with(b"t_") {
        return false;
    }
    bytes[2..]
        .iter()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || *b == b'_')
}

/// Property / org slug: lowercase kebab, 1–64 chars.
pub fn is_valid_slug(slug: &str) -> bool {
    let bytes = slug.as_bytes();
    if bytes.is_empty() || bytes.len() > 64 {
        return false;
    }
    if bytes[0] == b'-' || bytes[bytes.len() - 1] == b'-' {
        return false;
    }
    bytes
        .iter()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || *b == b'-')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_strips_tags() {
        assert_eq!(sanitize_plan_label("<script>x</script>"), "scriptx/script");
        assert_eq!(sanitize_plan_label("Unit 1A"), "Unit 1A");
    }

    #[test]
    fn slug_normalizes() {
        assert_eq!(slugify_org("BBM Logistics Parks"), "bbm-logistics-parks");
        assert_eq!(slugify_org("  ---  "), "org");
        assert_eq!(slugify_org(&"A".repeat(80)).len(), 48);
        assert_eq!(normalize_slug("  Hello__World!! "), "hello-world");
    }

    #[test]
    fn tenant_id_format() {
        assert!(is_valid_tenant_id("t_bbm"));
        assert!(is_valid_tenant_id("t_deskulpt"));
        assert!(!is_valid_tenant_id("bbm"));
        assert!(!is_valid_tenant_id("t_BBM"));
        assert!(!is_valid_tenant_id("t_"));
    }

    #[test]
    fn slug_format() {
        assert!(is_valid_slug("waterman"));
        assert!(is_valid_slug("bbm-parks"));
        assert!(!is_valid_slug("-x"));
        assert!(!is_valid_slug("Upper"));
    }
}
