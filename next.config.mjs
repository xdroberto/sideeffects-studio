/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.sanity.io',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            }
        ],
    },
    transpilePackages: ['sanity', '@sanity/vision', 'next-sanity'],
    compiler: {
        styledComponents: false,
    },
};

export default nextConfig;
