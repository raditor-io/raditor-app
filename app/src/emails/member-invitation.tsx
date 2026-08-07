/** Invitation email sent from the members settings page. */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface MemberInvitationEmailProps {
  organizationName: string;
  inviteUrl: string;
  memberRole: "admin" | "user";
}

const ROLE_DESCRIPTION: Record<MemberInvitationEmailProps["memberRole"], string> =
  {
    admin: "an admin (full configuration access)",
    user: "a member (review and approve content)",
  };

export function MemberInvitationEmail({
  organizationName,
  inviteUrl,
  memberRole,
}: MemberInvitationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Join {organizationName} on Raditor</Preview>
      <Body style={{ backgroundColor: "#f2f2f0", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#fdfdfc",
            borderRadius: "8px",
            margin: "24px auto",
            maxWidth: "480px",
            padding: "32px",
          }}
        >
          <Heading style={{ color: "#26201a", fontSize: "20px" }}>
            You are invited to {organizationName}
          </Heading>
          <Text style={{ color: "#55503f", fontSize: "14px" }}>
            You have been invited to join {organizationName} on Raditor as{" "}
            {ROLE_DESCRIPTION[memberRole]}. Raditor is an agentic CMS: editor
            agents watch your sources and propose content updates you review
            and ship.
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Button
              href={inviteUrl}
              style={{
                backgroundColor: "#e8703c",
                borderRadius: "6px",
                color: "#fdfdfc",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "12px 20px",
              }}
            >
              Accept invitation
            </Button>
          </Section>
          <Text style={{ color: "#877a66", fontSize: "12px" }}>
            This link expires in 14 days. If you were not expecting this
            invitation, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
