import { redirect } from 'next/navigation';

// Item 4 (#225): Collections → Drops rename. The detail page now lives at
// /dashboard/production/drops/[collectionID]. Legacy path redirects (params is async in Next 15).
export default async function LegacyCollectionDetailRedirect({ params }) {
  const { collectionID } = await params;
  redirect(`/dashboard/production/drops/${collectionID}`);
}
