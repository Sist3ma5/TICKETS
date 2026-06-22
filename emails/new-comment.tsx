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

interface NewCommentEmailProps {
  ticketTitle: string
  authorName: string
  commentBody: string
  ticketUrl: string
}

export function NewCommentEmail({
  ticketTitle,
  authorName,
  commentBody,
  ticketUrl,
}: NewCommentEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        {authorName} comentó en {ticketTitle}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.brand}>Bailmex IT Tickets</Heading>
          <Hr style={styles.hr} />
          <Text style={styles.text}>
            <strong>{authorName}</strong> agregó un comentario en el ticket{' '}
            <strong>{ticketTitle}</strong>:
          </Text>
          <Text style={styles.comment}>{commentBody}</Text>
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