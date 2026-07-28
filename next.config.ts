import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@better-auth/kysely-adapter', 'kysely'],
  experimental: {
    // Adjuntos: permitir enviar archivos (base64) a las server actions.
    serverActions: { bodySizeLimit: '15mb' },
  },
}

export default nextConfig
