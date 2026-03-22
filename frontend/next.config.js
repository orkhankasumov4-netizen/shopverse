/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'res.cloudinary.com',
      'images.unsplash.com',
      'fakestoreapi.com',
      'via.placeholder.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: { serverActions: true },
  compress: true,
};

module.exports = nextConfig;
