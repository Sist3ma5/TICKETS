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

interface AssignedTicketEmailProps {
  recipientName: string
  ticketTitle: string
  ticketCode: string
  categoryLabel: string
  /** Color de la categoría (hex), el mismo que usa la app. */
  categoryColor: string
  priorityLabel: string
  /** Color de la prioridad (hex), el mismo que usa la app. */
  priorityColor: string
  createdByName: string
  assignedByName: string
  ticketUrl: string
}

/**
 * Aviso de "se te asignó un ticket".
 *
 * Sigue la misma lectura que la tarjeta de la aplicación: folio arriba, título
 * grande, y las etiquetas de categoría y prioridad con su color. Así el
 * técnico reconoce de un vistazo qué le llegó, igual que en la pantalla.
 *
 * Todo va con estilos en línea y tablas simples porque los clientes de correo
 * ignoran hojas de estilo y no soportan flexbox de forma confiable.
 */
export function AssignedTicketEmail({
  recipientName,
  ticketTitle,
  ticketCode,
  categoryLabel,
  categoryColor,
  priorityLabel,
  priorityColor,
  createdByName,
  assignedByName,
  ticketUrl,
}: AssignedTicketEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        Te asignaron {ticketCode} — {ticketTitle}
      </Preview>
      <Body style={styles.body}>
        <Container style={{ ...styles.container, padding: '0', overflow: 'hidden' }}>
          {/* Franja superior con el color de la categoría. */}
          <div style={{ backgroundColor: categoryColor, height: '4px' }} />

          <Section style={{ padding: '28px 32px 32px' }}>
            <Heading style={styles.brand}>Bailmex IT Tickets</Heading>
            <Hr style={styles.hr} />

            <Text style={styles.text}>Hola {recipientName},</Text>
            <Text style={styles.text}>
              <strong>{assignedByName}</strong> te asignó este ticket:
            </Text>

            {/* Tarjeta del ticket, igual que en la lista de la app. */}
            <Section
              style={{
                border: '1px solid #e4e4e7',
                borderLeft: `3px solid ${categoryColor}`,
                borderRadius: '6px',
                padding: '16px 18px',
                margin: '0 0 20px',
              }}
            >
              <Text
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold' as const,
                  letterSpacing: '0.08em',
                  color: categoryColor,
                  margin: '0 0 6px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                {ticketCode}
              </Text>

              <Text
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold' as const,
                  color: '#09090b',
                  lineHeight: '1.4',
                  margin: '0 0 14px',
                }}
              >
                {ticketTitle}
              </Text>

              {/* Etiquetas: se usan spans en línea porque flexbox no es fiable
                  en clientes de correo. */}
              <Text style={{ margin: '0 0 14px', lineHeight: '1.9' }}>
                <span
                  style={{
                    backgroundColor: `${categoryColor}22`,
                    color: '#3f3f46',
                    border: `1px solid ${categoryColor}`,
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: '600' as const,
                    marginRight: '6px',
                  }}
                >
                  {categoryLabel}
                </span>
                <span
                  style={{
                    backgroundColor: `${priorityColor}22`,
                    color: '#3f3f46',
                    border: `1px solid ${priorityColor}`,
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: '600' as const,
                  }}
                >
                  Prioridad {priorityLabel}
                </span>
              </Text>

              <Text
                style={{
                  fontSize: '13px',
                  color: '#71717a',
                  margin: '0',
                  borderTop: '1px solid #f4f4f5',
                  paddingTop: '12px',
                }}
              >
                Reportado por <strong>{createdByName}</strong>
              </Text>
            </Section>

            <Section style={{ textAlign: 'center' as const, margin: '0 0 8px' }}>
              <Button
                style={{ ...styles.button, backgroundColor: categoryColor }}
                href={ticketUrl}
              >
                Atender ticket
              </Button>
            </Section>

            <Hr style={styles.hr} />
            <Text style={styles.footer}>
              Mensaje automático de Bailmex IT Tickets.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
