import type { MetadataRoute } from 'next';

// Konten komunitas privat (wajib login). Hanya landing yang boleh diindeks.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/$', disallow: '/' }],
  };
}
