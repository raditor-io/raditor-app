/**
 * Organization role model: admins make configuration changes (websites,
 * sources, agents, policies, members, keys); users perform operational tasks
 * (reviewing suggestions, feedback). Mirrors the member_role check constraint
 * on organization_memberships.
 */
export type MemberRole = "admin" | "user";
