import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import { styles } from './styles'

interface StatusChangeEmailProps {
  recipientName: string
  ticketTitle: string
  fromStatus: string
  toStatus: string
  ticketUrl: string
}

export function StatusChangeEmail({
  recipientName,
  ticketTitle,
  fromStatus,
  toStatus,
  ticketUrl,
}: StatusChangeEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu ticket: {ticketTitle} cambió a {toStatus}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.brand}>Bailmex IT Tickets</Heading>
          <Hr style={styles.hr} />
          <Text style={styles.text}>Hola {recipientName},</Text>
          <Text style={styles.text}>
            El estado de tu ticket <strong>{ticketTitle}</strong> cambió de{' '}
            <strong>{fromStatus}</strong> a <strong>{toStatus}</strong>.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={styles.button} href={ticketUrl}>
              Ver ticket
            </Button>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Mensaje automático de Bailmex IT Tickets.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}