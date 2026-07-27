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

interface NewTicketEmailProps {
  recipientName: string
  ticketTitle: string
  ticketCode: string
  category: string
  priority: string
  createdByName: string
  ticketUrl: string
}

export function NewTicketEmail({
  recipientName,
  ticketTitle,
  ticketCode,
  category,
  priority,
  createdByName,
  ticketUrl,
}: NewTicketEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        Nuevo ticket para ti: {ticketCode} — {ticketTitle}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.brand}>Bailmex IT Tickets</Heading>
          <Hr style={styles.hr} />
          <Text style={styles.text}>Hola {recipientName},</Text>
          <Text style={styles.text}>
            Se te asignó un nuevo ticket de la categoría{' '}
            <strong>{category}</strong>:
          </Text>
          <Text style={styles.text}>
            <strong>
              {ticketCode} — {ticketTitle}
            </strong>
            <br />
            Prioridad: {priority}
            <br />
            Reportado por: {createdByName}
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
