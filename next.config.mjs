/** @type {import('next').NextConfig} */
const nextConfig = {
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
