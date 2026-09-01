import type { FastifyInstance } from "fastify";

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

// Static for now — the `News` Prisma model already exists (see schema.prisma) for
// when the database is wired up in a later phase (bundled with the auth session
// work, since both need Postgres running); this keeps the news panel functional
// in the meantime rather than blocking on that infrastructure.
const STATIC_NEWS: NewsItem[] = [
  {
    id: "welcome",
    title: "Willkommen bei Galaxy Launcher",
    body: "Instanzen erstellen, Fabric-Mods installieren und deine Tastenbelegung zwischen Instanzen übernehmen — der Kern-Launcher nimmt Form an.",
    publishedAt: new Date().toISOString()
  }
];

export async function newsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/news", async () => {
    return { items: STATIC_NEWS };
  });
}
