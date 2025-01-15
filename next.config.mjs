/** @type {import('next').NextConfig} */
const nextConfig = {
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
            path: false
        };
        return config;
    }
};

export default nextConfig;
