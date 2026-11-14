import 'dotenv/config';
import express from 'express';
import path from 'path';
import ImageKit from 'imagekit';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import { listings, stores, visitors, users } from './src/db/schema.ts';
import { desc, sql, eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 0. ImageKit Authentication Endpoint for secure client-side uploads
  const handleImageKitAuth = (_req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || process.env.VITE_IMAGEKIT_PUBLIC_KEY || '').trim();
    const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
    const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || process.env.VITE_IMAGEKIT_URL_ENDPOINT || '').trim();

    const missing: string[] = [];
    if (!publicKey) missing.push('IMAGEKIT_PUBLIC_KEY');
    if (!privateKey) missing.push('IMAGEKIT_PRIVATE_KEY');
    if (!urlEndpoint) missing.push('IMAGEKIT_URL_ENDPOINT');

    if (missing.length > 0) {
      return res.status(500).json({
        configured: false,
        missing,
        error: `Missing ImageKit environment variable(s) on server: ${missing.join(', ')}`,
      });
    }

    try {
      const imagekit = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });

      const authParams = imagekit.getAuthenticationParameters();
      return res.status(200).json({
        configured: true,
        token: authParams.token,
        expire: authParams.expire,
        signature: authParams.signature,
        publicKey,
        urlEndpoint,
      });
    } catch (err: any) {
      console.error('ImageKit SDK auth error:', err);
      return res.status(500).json({
        configured: false,
        error: `ImageKit initialization failed: ${err?.message || 'Unknown error'}`,
      });
    }
  };

  app.get('/api/imagekit-auth', handleImageKitAuth);
  app.get('/api/imagekit/auth', handleImageKitAuth);

  // 1. Visitor Counter & Logs API (عداد وسجل الزوار)
  app.get('/api/visitors', async (req, res) => {
    try {
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(visitors);
      const totalVisitors = Number(countResult[0]?.count || 0);

      const recentVisitors = await db
        .select()
        .from(visitors)
        .orderBy(desc(visitors.visitedAt))
        .limit(10);

      res.json({
        totalVisitors,
        recentVisitors,
      });
    } catch (err: any) {
      console.error('Error fetching visitors:', err);
      res.status(500).json({ error: 'Failed to fetch visitors', totalVisitors: 0, recentVisitors: [] });
    }
  });

  app.post('/api/visitors/log', async (req, res) => {
    try {
      const { visitorId = `visitor-${Date.now()}`, page = 'home', city = 'الموصل', device = 'mobile' } = req.body || {};

      await db.insert(visitors).values({
        visitorId,
        page,
        city,
        device,
      });

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(visitors);
      const totalVisitors = Number(countResult[0]?.count || 1);

      res.json({ success: true, totalVisitors });
    } catch (err: any) {
      console.error('Error logging visitor:', err);
      res.status(500).json({ error: 'Failed to log visitor' });
    }
  });

  // 2. Listings API (عرض جميع الإعلانات المضافة وحفظها في قاعدة البيانات)
  app.get('/api/listings', async (req, res) => {
    try {
      const allListings = await db
        .select()
        .from(listings)
        .orderBy(desc(listings.createdTimestamp));

      res.json(allListings);
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });

  app.post('/api/listings', async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id || !item.title) {
        return res.status(400).json({ error: 'Invalid listing data' });
      }

      await db
        .insert(listings)
        .values({
          id: item.id,
          title: item.title,
          description: item.description || '',
          price: Number(item.price || 0),
          currency: item.currency || 'د.ع',
          hidePrice: Boolean(item.hidePrice),
          category: item.category,
          condition: item.condition || 'new',
          sellerType: item.sellerType || 'personal',
          sellerName: item.sellerName || '',
          sellerPhone: item.sellerPhone || '',
          city: item.city || 'الموصل',
          district: item.district || 'حي الزهور',
          deliveryAvailable: Boolean(item.deliveryAvailable),
          deliveryNotes: item.deliveryNotes || null,
          storeName: item.storeName || null,
          storeLocation: item.storeLocation || null,
          mediaUrls: item.mediaUrls || [],
          contactOptions: item.contactOptions || {},
          createdAt: item.createdAt || 'الآن · الموصل',
          createdTimestamp: Number(item.createdTimestamp || Date.now()),
          viewsCount: Number(item.viewsCount || 1),
          isVerified: Boolean(item.isVerified),
        })
        .onConflictDoUpdate({
          target: listings.id,
          set: {
            title: item.title,
            description: item.description || '',
            price: Number(item.price || 0),
            viewsCount: Number(item.viewsCount || 1),
          },
        });

      res.json({ success: true, listing: item });
    } catch (err: any) {
      console.error('Error saving listing:', err);
      res.status(500).json({ error: 'Failed to save listing' });
    }
  });

  // 3. Stores Directory API (متاجر الموصل)
  app.get('/api/stores', async (req, res) => {
    try {
      const allStores = await db.select().from(stores);
      res.json(allStores);
    } catch (err: any) {
      console.error('Error fetching stores:', err);
      res.status(500).json({ error: 'Failed to fetch stores' });
    }
  });

  app.post('/api/stores', async (req, res) => {
    try {
      const st = req.body;
      if (!st || !st.id || !st.name) {
        return res.status(400).json({ error: 'Invalid store data' });
      }

      await db
        .insert(stores)
        .values({
          id: st.id,
          name: st.name,
          ownerPhone: st.ownerPhone || '',
          description: st.description || '',
          district: st.district || 'حي الزهور',
          city: st.city || 'الموصل',
          address: st.address || '',
          category: st.category || 'electronics',
          whatsappNumber: st.whatsappNumber || '',
          phoneNumber: st.phoneNumber || '',
          deliveryAvailable: Boolean(st.deliveryAvailable),
          deliveryNotes: st.deliveryNotes || null,
          isVerified: Boolean(st.isVerified),
          totalListingsCount: Number(st.totalListingsCount || 1),
          rating: String(st.rating || '5.0'),
          coverUrl: st.coverUrl || null,
          lat: st.lat ? String(st.lat) : null,
          lng: st.lng ? String(st.lng) : null,
          createdAt: Number(st.createdAt || Date.now()),
        })
        .onConflictDoUpdate({
          target: stores.id,
          set: {
            name: st.name,
            description: st.description || '',
            address: st.address || '',
            totalListingsCount: Number(st.totalListingsCount || 1),
          },
        });

      res.json({ success: true, store: st });
    } catch (err: any) {
      console.error('Error saving store:', err);
      res.status(500).json({ error: 'Failed to save store' });
    }
  });

  // Ensure unmatched /api/* routes always return JSON (never Vite/SPA HTML)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // 4. Vite Middlewares in Dev / Static files in Prod
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(path.join(__dirname, 'dist'), {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('sw.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
          } else if (filePath.endsWith('manifest.json')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Souq Belahdha server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
