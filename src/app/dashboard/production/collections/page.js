import { redirect } from 'next/navigation';

// Item 4 (#225): Collections → Drops rename. The list now lives at /dashboard/production/drops.
// This legacy path permanently redirects so existing bookmarks/links keep working.
export default function LegacyCollectionsRedirect() {
  redirect('/dashboard/production/drops');
}
