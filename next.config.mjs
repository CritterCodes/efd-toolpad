import withPWA from 'next-pwa';

// PWA is enabled only when ENABLE_PWA=true environment variable is set
const isPWAEnabled = process.env.ENABLE_PWA === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
    dest: 'public',
    register: isPWAEnabled,
    skipWaiting: isPWAEnabled,
    disable: !isPWAEnabled, // Only enable if ENABLE_PWA=true
    fallbacks: isPWAEnabled ? {
        document: '/offline'
    } : undefined,
    runtimeCaching: isPWAEnabled ? [
        {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheKeyWillBeUsed: async ({ request }) => {
                    return `${request.url}?${Date.now()}`;
                }
            }
        },
        {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365
                }
            }
        },
        {
            urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-font-assets',
                expiration: {
                    maxEntries: 4,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
            }
        },
        {
            urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-image-assets',
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
            }
        },
        {
            urlPattern: /\/_next\/image\?url=.+$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'nextjs-image-cache',
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                }
            }
        },
        {
            urlPattern: /\.(?:js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-js-assets',
                expiration: {
                    maxEntries: 48,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                }
            }
        },
        {
            urlPattern: /\.(?:css|less)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-style-assets',
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                }
            }
        },
        {
            urlPattern: /^\/api\/.*$/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
                cacheName: 'apis',
                expiration: {
                    maxEntries: 16,
                    maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                networkTimeoutSeconds: 10 // fall back to cache if api does not response within 10 seconds
            }
        }
    ] : []
})({
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'efd-repair-images.s3.us-east-2.amazonaws.com',
                pathname: '/**',
            },
        ],
    },
    webpack: (config) => {
        config.resolve.fallback = {
            fs: false,
            net: false,
            tls: false,
            dns: false,
            path: false,
            child_process: false,
            // MongoDB optional dependencies
            kerberos: false,
            '@mongodb-js/zstd': false,
            '@aws-sdk/credential-providers': false,
            'gcp-metadata': false,
            snappy: false,
            socks: false,
            aws4: false,
            'mongodb-client-encryption': false,
            // Node.js built-ins
            'timers/promises': false
        };
        
        // Ignore optional MongoDB modules that cause build issues
        config.externals = config.externals || [];
        config.externals.push({
            'child_process': 'commonjs child_process',
            'kerberos': 'commonjs kerberos',
            '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
            '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
            'gcp-metadata': 'commonjs gcp-metadata',
            'snappy': 'commonjs snappy',
            'socks': 'commonjs socks',
            'aws4': 'commonjs aws4',
            'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
            // Exclude microservice dependencies from main build
            'winston': 'commonjs winston'
        });
        
        return config;
    }
});

export default nextConfig;
