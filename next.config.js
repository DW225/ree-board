/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Packages with dynamic requires that need to be external for server builds
  serverExternalPackages: ["ably", "got", "keyv", "cacheable-request"],
  // Bundle optimization settings
  experimental: {
    // Enable CSS chunking for better caching
    cssChunking: true,
    // Note: PPR requires Next.js canary version - uncomment when ready to upgrade
    // ppr: 'incremental',
    // Optimize package imports for packages not in the default list
    // Note: lucide-react is already optimized by default in Next.js 16
    optimizePackageImports: [
      "@atlaskit/pragmatic-drag-and-drop",
      "@kinde-oss/kinde-auth-nextjs",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gravatar.com",
        port: "",
        pathname: "/avatar/**",
      },
      {
        protocol: "https",
        hostname: "www.gravatar.com",
        port: "",
        pathname: "/avatar/**",
      },
    ],
    minimumCacheTTL: 60,
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        __SENTRY_DEBUG__: false,
        __SENTRY_TRACING__: false,
        __RRWEB_EXCLUDE_IFRAME__: true,
        __RRWEB_EXCLUDE_SHADOW_DOM__: true,
        __SENTRY_EXCLUDE_REPLAY_WORKER__: true,
      })
    );

    // return the modified config
    return config;
  },
  env: {
    KINDE_SITE_URL:
      process.env.KINDE_SITE_URL ?? `https://${process.env.VERCEL_URL}`,
    KINDE_POST_LOGOUT_REDIRECT_URL:
      process.env.KINDE_POST_LOGOUT_REDIRECT_URL ??
      `https://${process.env.VERCEL_URL}`,
    KINDE_POST_LOGIN_REDIRECT_URL:
      process.env.KINDE_POST_LOGIN_REDIRECT_URL ??
      `https://${process.env.VERCEL_URL}/board`,
  },
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const withVercelToolbar = require("@vercel/toolbar/plugins/next")();

module.exports = withVercelToolbar(withBundleAnalyzer(nextConfig));

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "tekdw225",
  project: "ree-board",
  authToken: process.env.SENTRY_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  // Note: disableLogger is deprecated, use bundleSizeOptimizations.excludeDebugStatements instead
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
