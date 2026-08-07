/** OTP code email for all Supabase auth flows (signup, sign-in, recovery...). */
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AuthCodeEmailProps {
  headline: string;
  description: string;
  code: string;
}

export function AuthCodeEmail({
  headline,
  description,
  code,
}: AuthCodeEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {code} is your Raditor code
      </Preview>
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
            {headline}
          </Heading>
          <Text style={{ color: "#55503f", fontSize: "14px" }}>
            {description}
          </Text>
          <Section
            style={{
              backgroundColor: "#f3e8d5",
              borderRadius: "8px",
              margin: "24px 0",
              padding: "16px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                color: "#26201a",
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "8px",
                margin: 0,
              }}
            >
              {code}
            </Text>
          </Section>
          <Text style={{ color: "#877a66", fontSize: "12px" }}>
            This code expires in 60 minutes. If you did not request it, you can
            ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
