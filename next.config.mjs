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
};

export default nextConfig;
