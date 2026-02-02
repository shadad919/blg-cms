const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled: Leaflet "Map container is already initialized" when react-leaflet MapContainer double-mounts
  reactStrictMode: false,
}

module.exports = withNextIntl(nextConfig)
